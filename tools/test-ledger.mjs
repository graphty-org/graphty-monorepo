#!/usr/bin/env node
// The test ledger (design/ci/test-ledger.md): every gate, verification and bisect run records each test
// shard it ran, and a few decisions read that history. The truth is one gzipped JSON file per shard run in
// <main checkout>/tmp/test-ledger/records/<day>/; ledger-<time>.db (node:sqlite, named by CURRENT) is only an
// index, which every reader first brings up to date and `rebuild` remakes from the files with nothing lost.
//
// Nothing here may block or fail a push: callers import this module and call it inside try/catch, and a
// ledger that is missing, locked or broken prints `ledger: unavailable (<why>); deciding as before`.
//
//   node tools/test-ledger.mjs status                  golden failures, flaky / broken tests, quarantine, health
//   node tools/test-ledger.mjs why <file>[ > <test>]   the rows behind a decision about a test or a file
//   node tools/test-ledger.mjs sql "<select>"          a read-only query
//   node tools/test-ledger.mjs rebuild | prune
//
// TEST_LEDGER_DIR replaces the directory (the tests set it). Off switches: PREPUSH_EXONERATE=0.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";

// node:sqlite prints "ExperimentalWarning: SQLite is an experimental feature" on import; only that one is dropped.
const emitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
    const type = typeof rest[0] === "string" ? rest[0] : (rest[0]?.type ?? warning?.name);
    const text = typeof warning === "string" ? warning : warning?.message;
    if (type === "ExperimentalWarning" && String(text).startsWith("SQLite")) return;
    return emitWarning.call(process, warning, ...rest);
};
let sqlite = null;
try {
    sqlite = await import("node:sqlite");
} catch {
    // open() says so
}

const READER = 1; // the schema version this code reads; a non-additive change raises min_reader_version
const DAY = 86_400_000;
export const EVIDENCE = ["land-check", "verify", "bisect"];
// The kinds whose worktrees the tools own (clean, reset), counted in flaky proofs; imports keep their source's kind.
export const OWNED = [...EVIDENCE, "cut", ...[...EVIDENCE, "cut", "detached"].map((k) => `import-${k}`)];
const GPU_FAMILY = /^webgpu-graph-algorithms/;

const h16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const git = (cwd, args) => {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            maxBuffer: 1 << 28,
        }).trim();
    } catch {
        return "";
    }
};
const list = (d) => (existsSync(d) ? readdirSync(d) : []);
const inList = (n) => `(${Array.from({ length: n }, () => "?").join(",")})`;
export const familyOf = (shard) => shard.replace(/-\d+$/, "");
const dayOf = (id) => new Date(Number(id.split("-")[0])).toISOString().slice(0, 10);

/**
 * The ledger's directory: TEST_LEDGER_DIR, else tmp/test-ledger in the main checkout of `cwd`'s repository.
 * @param [env] the environment
 * @param [cwd] any directory of the repository
 * @returns the directory
 */
export function ledgerDir(env = process.env, cwd = process.cwd()) {
    if (env.TEST_LEDGER_DIR) return env.TEST_LEDGER_DIR;
    return join(dirname(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])), "tmp/test-ledger");
}

// ---------------------------------------------------------------- parsing and hashing

const ENTITIES = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };
const unxml = (s) =>
    s.replace(/&(?:(lt|gt|quot|apos|amp)|#(\d+)|#x([\da-f]+));/gi, (_m, n, d, x) =>
        n ? ENTITIES[n] : String.fromCodePoint(d ? Number(d) : Number.parseInt(x, 16)),
    );
const attr = (tag, name) => {
    const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
    return m ? unxml(m[1]) : "";
};

/**
 * Adds one Vitest JUnit file to `into`. Vitest retries are off (design/ci/ci-cd-plan.md 9.1), so a testcase
 * is one verdict; if retries are ever turned on, this must become a Vitest reporter.
 * @param xml the file's text
 * @param pkg the package directory the run's paths are relative to
 * @param into `{ files: Map, failures: [] }`
 * @returns `into`
 */
export function parseJunit(xml, pkg, into = { files: new Map(), failures: [] }) {
    if (!xml.includes("<testsuites")) throw new Error("not a JUnit report");
    for (const [, tag, , body = ""] of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
        const file = `${pkg}/${attr(tag, "classname")}`;
        const name = attr(tag, "name");
        const f = into.files.get(file) ?? { passed: 0, failed: 0, skipped: 0, ms: 0, dup: 0, names: new Set() };
        into.files.set(file, f);
        if (f.names.has(name)) f.dup++;
        f.names.add(name);
        f.ms += Math.round(Number(attr(tag, "time") || 0) * 1000);
        const fail = /<(failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/.exec(body);
        if (fail) {
            f.failed++;
            into.failures.push({ file, name, text: unxml(fail[3] ?? "").trim() || attr(fail[2], "message") });
        } else if (/<skipped\b/.test(body)) f.skipped++;
        else f.passed++;
    }
    return into;
}

/**
 * A failure's masked first line, its key (the cleaned line, numbers kept) and its signature (numbers masked,
 * plus two stack frames outside node_modules; a timeout is `timeout` plus its file).
 * @param text the failure message and stack
 * @param file the test file
 * @param main the main checkout, whose path and worktree paths are removed
 * @returns `{ line, key, signature, status }`
 */
export function failureHashes(text, file, main = "/nonexistent") {
    const esc = main.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const clean = (s) =>
        s
            .replace(new RegExp(`${esc}(?:/\\.worktrees/[^/\\s]+)?/`, "g"), "")
            .replace(/\/tmp\/\S*/g, "<tmp>")
            .replace(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi, "<uuid>")
            .replace(/\b[\da-f]{7,}\b/gi, "<hex>");
    const mask = (s) => s.replace(/:\d+(?::\d+)?/g, "").replace(/\d+/g, "<n>");
    const lines = stripVTControlCharacters(text)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.includes("Click to debug"));
    const first = clean(lines[0] ?? "");
    // a timeout carries no cause (Vitest's, Playwright's locator timeouts): never excused, grouped by file
    const timeout = /timed out|TimeoutError|Timeout -?\d+ms exceeded/i.test(first);
    const frames = lines
        .slice(1)
        .filter((l) => /^(❯|at )/.test(l) && !l.includes("node_modules"))
        .slice(0, 2)
        .map((l) => mask(clean(l)));
    const signature = timeout ? h16(`timeout\0${file}`) : h16([mask(first), ...frames].join("\n"));
    return { line: first.slice(0, 300), key: h16(first), signature, status: timeout ? "timeout" : "fail" };
}

/**
 * An invocation's outcome (design 3.3). Only `passed` and `failed` count as evidence or in rates.
 * @param run `{ code, log, runs, junit, cancelled }`; junit is null when no JUnit carries the run id
 * @returns passed, failed, error, infra, unattributed or cancelled
 */
export function outcomeOf(run) {
    const { code, log, runs = 1, junit, cancelled } = run;
    if (cancelled) return "cancelled";
    const text = stripVTControlCharacters(log ?? "");
    const summaries = [...text.matchAll(/^\s*Test Files\s.*\(\d+\)\s*$/gm)].length;
    if (code === null || [124, 137, 143].includes(code) || summaries < runs) return "infra";
    if (!junit) return "unattributed";
    if (junit.bad) return "infra";
    if (code === 0) return "passed";
    const failed = [...text.matchAll(/^\s*Tests\s+(\d+) failed/gm)].reduce((n, m) => n + Number(m[1]), 0);
    const errors = /^\s*Errors\s+\d+ error/m.test(text) || /ERROR: Coverage for|Unhandled Error/.test(text);
    return code === 1 && !errors && failed > 0 && failed === junit.failures.length ? "failed" : "error";
}

// ---------------------------------------------------------------- recording

/**
 * A run id for TEST_LEDGER_RUN: `<ms>-<pid>-<shard>`; vitest.ci-junit.mjs puts it in the JUnit file name.
 * @param shard the shard
 * @returns the id
 */
export const newRunId = (shard) => `${Date.now()}-${process.pid}-${shard}`;

/**
 * Records one shard run: reads the JUnit files that carry its run id, writes the record file, deletes them.
 * @param o `shard`, `code`, `log`, `root` (the checkout), `kind`, `runId`, `startedAt` (ms), `runs` (vitest
 *   runs the command makes), `selected` (file list or null), `cancelled`, `reusedFrom` (a pass's record id),
 *   `exonerate` (try exonerate() on a failure), `env`, `main` (for path cleaning)
 * @returns the record
 */
export function record(o) {
    const env = o.env ?? process.env;
    const dir = ledgerDir(env, o.root);
    const id = o.runId ?? newRunId(o.shard);
    let junit = null;
    let files = [];
    if (o.reusedFrom) {
        files = readRecord(dir, o.reusedFrom)?.files ?? [];
    } else {
        const results = join(o.root, "test-results");
        const mine = list(results).filter((n) => n.startsWith("junit-") && n.includes(`-${id}-`));
        if (mine.length) junit = { files: new Map(), failures: [], bad: false };
        for (const n of mine) {
            try {
                parseJunit(readFileSync(join(results, n), "utf8"), n.slice(6, n.indexOf(`-${id}-`)), junit);
            } catch {
                junit.bad = true;
            }
        }
        files = [...(junit?.files ?? [])].map(([f, c]) => [f, c.passed, c.failed, c.skipped, c.ms, c.dup]);
        mine.forEach((n) => rmSync(join(results, n), { force: true }));
    }
    const outcome = o.reusedFrom ? "passed" : outcomeOf({ ...o, junit });
    const failures = (junit?.failures ?? []).map((f) => ({
        ...f,
        ...failureHashes(f.text, f.file, o.main),
        text: undefined,
        message: f.text.slice(0, 2000),
    }));
    const rec = {
        v: 1,
        id,
        kind: env.TEST_LEDGER_KIND || o.kind || "push",
        branch: env.TEST_LEDGER_BRANCH || git(o.root, ["symbolic-ref", "--short", "-q", "HEAD"]) || null,
        commit: git(o.root, ["rev-parse", "HEAD"]),
        tree: git(o.root, ["rev-parse", "HEAD^{tree}"]),
        base: git(o.root, ["rev-parse", "-q", "--verify", "HEAD^1"]) || null,
        dirty: Boolean(o.dirty) || git(o.root, ["status", "--porcelain"]) !== "",
        shard: o.shard,
        family: familyOf(o.shard),
        variant: familyOf(o.shard) + (o.selected ? "+files" : ""),
        selected: o.selected ?? null,
        outcome,
        reused_from: o.reusedFrom ?? null,
        started_at: new Date(o.startedAt ?? Number(id.split("-")[0])).toISOString(),
        secs: o.startedAt ? Math.round((Date.now() - o.startedAt) / 1000) : 0,
        log: o.logFile ?? null,
        files,
        failures,
        exonerations: [],
    };
    if (o.exonerate && outcome === "failed") rec.exonerations = exonerate(rec, o.root, env);
    writeRecord(dir, rec);
    return rec;
}

/**
 * Writes a record file atomically (a temporary name, then a rename).
 * @param dir the ledger directory
 * @param rec the record
 */
export function writeRecord(dir, rec) {
    const day = join(dir, "records", dayOf(rec.id));
    mkdirSync(day, { recursive: true });
    const tmp = join(day, `.${rec.id}.${process.pid}`);
    writeFileSync(tmp, gzipSync(JSON.stringify(rec)));
    renameSync(tmp, join(day, `${rec.id}.json.gz`));
}

/**
 * One record file, or null.
 * @param dir the ledger directory
 * @param id the record's id
 * @returns the record
 */
export function readRecord(dir, id) {
    try {
        return JSON.parse(gunzipSync(readFileSync(join(dir, "records", dayOf(id), `${id}.json.gz`))));
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------- the index

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS invocation (id TEXT PRIMARY KEY, kind TEXT, branch TEXT, commit_sha TEXT, tree TEXT,
  base TEXT, dirty INTEGER, shard TEXT, family TEXT, variant TEXT, selected INTEGER, outcome TEXT, reused_from TEXT,
  started_at TEXT, secs INTEGER, log TEXT);
CREATE INDEX IF NOT EXISTS invocation_family ON invocation (family, started_at);
CREATE INDEX IF NOT EXISTS invocation_commit ON invocation (commit_sha);
CREATE INDEX IF NOT EXISTS invocation_tree ON invocation (tree);
CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, file TEXT, name TEXT, UNIQUE (file, name));
CREATE TABLE IF NOT EXISTS file_run (inv TEXT REFERENCES invocation (id) ON DELETE CASCADE, test INTEGER,
  passed INTEGER, failed INTEGER, skipped INTEGER, ms INTEGER, dup_names INTEGER, PRIMARY KEY (inv, test));
CREATE INDEX IF NOT EXISTS file_run_test ON file_run (test);
CREATE TABLE IF NOT EXISTS failure (inv TEXT REFERENCES invocation (id) ON DELETE CASCADE, test INTEGER, status TEXT,
  signature TEXT, key TEXT, line TEXT, message TEXT, PRIMARY KEY (inv, test));
CREATE INDEX IF NOT EXISTS failure_test ON failure (test);
CREATE TABLE IF NOT EXISTS exoneration (inv TEXT REFERENCES invocation (id) ON DELETE CASCADE, test INTEGER,
  reason TEXT, evidence TEXT, issue INTEGER, PRIMARY KEY (inv, test));
CREATE TABLE IF NOT EXISTS golden_issue (signature TEXT PRIMARY KEY, issue INTEGER, culprit TEXT, opened_at TEXT);`;

function prepare(db) {
    if (db.q) return db.q;
    db.q = {
        inv: db.prepare(`INSERT OR IGNORE INTO invocation VALUES (${inList(16).slice(1, -1)})`),
        test: db.prepare("INSERT OR IGNORE INTO test (file, name) VALUES (?, ?)"),
        testId: db.prepare("SELECT id FROM test WHERE file = ? AND name = ?"),
        fileRun: db.prepare("INSERT OR IGNORE INTO file_run VALUES (?, ?, ?, ?, ?, ?, ?)"),
        failure: db.prepare("INSERT OR IGNORE INTO failure VALUES (?, ?, ?, ?, ?, ?, ?)"),
        exon: db.prepare("INSERT OR IGNORE INTO exoneration VALUES (?, ?, ?, ?, ?)"),
        issue: db.prepare("INSERT OR REPLACE INTO golden_issue VALUES (?, ?, ?, ?)"),
    };
    return db.q;
}

/**
 * The id of a test (a file when `name` is ""), made on first use.
 * @param db the database
 * @param file the test file
 * @param [name] the test
 * @returns the id
 */
export function testId(db, file, name = "") {
    const q = prepare(db);
    q.test.run(file, name);
    return q.testId.get(file, name).id;
}

function insertRecord(db, r) {
    const q = prepare(db);
    // node:sqlite cannot bind undefined: a field a record lacks is stored as NULL.
    const run = (stmt, ...values) => stmt.run(...values.map((v) => v ?? null));
    const row = [r.id, r.kind, r.branch, r.commit, r.tree, r.base, r.dirty ? 1 : 0, r.shard, r.family, r.variant];
    const more = [r.selected ? 1 : 0, r.outcome, r.reused_from, r.started_at, r.secs, r.log];
    if (run(q.inv, ...row, ...more).changes === 0) return;
    for (const [file, ...counts] of r.files) run(q.fileRun, r.id, testId(db, file), ...counts);
    for (const f of r.failures) {
        run(q.failure, r.id, testId(db, f.file, f.name), f.status, f.signature, f.key, f.line, f.message);
    }
    for (const e of r.exonerations) run(q.exon, r.id, testId(db, e.file, e.name), e.reason, e.evidence, e.issue);
}

function ingest(db, dir, from) {
    const meta = (k) => db.prepare("SELECT v FROM meta WHERE k = ?").get(k)?.v;
    const since = from ?? meta("ingested_through") ?? "";
    const days = list(join(dir, "records"))
        .filter((d) => d >= since)
        .sort();
    db.exec("BEGIN IMMEDIATE");
    try {
        const have = db.prepare("SELECT 1 FROM invocation WHERE id = ?");
        for (const d of days) {
            for (const f of list(join(dir, "records", d)).filter((n) => n.endsWith(".json.gz"))) {
                if (have.get(f.slice(0, -8))) continue;
                const r = readRecord(dir, f.slice(0, -8));
                // One bad file must not stop every later reader: it is skipped whole, and stays on disk.
                db.exec("SAVEPOINT one");
                try {
                    if (r) insertRecord(db, r);
                    db.exec("RELEASE one");
                } catch (e) {
                    db.exec("ROLLBACK TO one; RELEASE one");
                    console.error(`ledger: skipped record ${f}: ${e.message}`);
                }
            }
        }
        for (const f of list(join(dir, "issues")).filter((n) => n.endsWith(".json"))) {
            const i = readJson(join(dir, "issues", f));
            if (i) prepare(db).issue.run(i.signature, i.issue ?? 0, i.culprit ?? null, i.opened_at ?? null);
        }
        // A writer that began a record before midnight may rename it into yesterday's directory after this.
        const through = days.length ? new Date(Date.parse(days.at(-1)) - DAY).toISOString().slice(0, 10) : since;
        db.prepare("INSERT OR REPLACE INTO meta VALUES ('ingested_through', ?)").run(through);
        db.exec("COMMIT");
    } catch (e) {
        db.exec("ROLLBACK");
        throw e;
    }
}

const readJson = (p) => {
    try {
        return JSON.parse(readFileSync(p, "utf8"));
    } catch {
        return null;
    }
};

function connect(path) {
    const db = new sqlite.DatabaseSync(path);
    db.exec("PRAGMA busy_timeout = 10000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    return db;
}

/**
 * Opens the database CURRENT names and ingests every record it lacks.
 * @param [env] the environment
 * @param [cwd] a directory of the repository
 * @returns `{ db, dir }`, or `{ why }` when the ledger cannot decide anything
 */
export function openLedger(env = process.env, cwd = process.cwd()) {
    try {
        if (!sqlite) return { why: "node:sqlite is missing" };
        const dir = ledgerDir(env, cwd);
        const name = existsSync(join(dir, "CURRENT")) && readFileSync(join(dir, "CURRENT"), "utf8").trim();
        if (!name) return { why: "no database yet; node tools/test-ledger.mjs rebuild" };
        const db = connect(join(dir, name));
        const meta = (k) => db.prepare("SELECT v FROM meta WHERE k = ?").get(k)?.v;
        if (meta("complete") !== "1") return { why: "the database is not complete" };
        if (Number(meta("min_reader_version") ?? 0) > READER) return { why: "the database needs newer code" };
        ingest(db, dir);
        return { db, dir };
    } catch (e) {
        return { why: e.message.split("\n")[0] };
    }
}

/**
 * Writes a new database from every file, marks it complete and points CURRENT at it. Never touches a database
 * another process may hold open.
 * @param [env] the environment
 * @param [cwd] a directory of the repository
 * @returns the new database's name
 */
export function rebuild(env = process.env, cwd = process.cwd()) {
    const dir = ledgerDir(env, cwd);
    mkdirSync(dir, { recursive: true });
    const name = `ledger-${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}.db`;
    const db = connect(join(dir, name));
    db.exec(SCHEMA);
    db.exec(`INSERT OR REPLACE INTO meta VALUES ('schema_version', '${READER}'), ('min_reader_version', '1')`);
    ingest(db, dir, "");
    db.exec("INSERT OR REPLACE INTO meta VALUES ('complete', '1')");
    db.close();
    writeFileSync(join(dir, `CURRENT.${process.pid}`), `${name}\n`);
    renameSync(join(dir, `CURRENT.${process.pid}`), join(dir, "CURRENT"));
    return name;
}

/**
 * Rebuilds the database when it is missing, incomplete or unreadable (verification calls this at its start).
 * @param [env] the environment
 * @param [cwd] a directory of the repository
 * @returns the new database's name, or null when the current one is fine
 */
export function ensure(env = process.env, cwd = process.cwd()) {
    const l = openLedger(env, cwd);
    l.db?.close();
    return l.db ? null : rebuild(env, cwd);
}

/**
 * At most daily: records and rows older than 120 days, databases CURRENT does not name older than a day,
 * and JUnit files older than 2 days in every worktree.
 * @param [env] the environment
 * @param [cwd] a directory of the repository
 * @returns one line
 */
export function prune(env = process.env, cwd = process.cwd()) {
    const l = openLedger(env, cwd);
    if (!l.db) return `ledger: unavailable (${l.why}); nothing pruned`;
    const { db, dir } = l;
    const last = db.prepare("SELECT v FROM meta WHERE k = 'last_prune'").get()?.v;
    if (last && Date.now() - Date.parse(last) < DAY) return "ledger: pruned less than a day ago";
    const cutoff = new Date(Date.now() - 120 * DAY).toISOString();
    let rows = 0;
    for (let n = 1; n > 0; rows += n) {
        n = Number(
            db
                .prepare(
                    "DELETE FROM invocation WHERE id IN (SELECT id FROM invocation WHERE started_at < ? LIMIT 5000)",
                )
                .run(cutoff).changes,
        );
    }
    list(join(dir, "records"))
        .filter((d) => d < cutoff.slice(0, 10))
        .forEach((d) => rmSync(join(dir, "records", d), { recursive: true }));
    const current = readFileSync(join(dir, "CURRENT"), "utf8").trim();
    const old = (p) => Date.now() - statSync(p).mtimeMs > DAY;
    for (const f of list(dir).filter((n) => /^ledger-.*\.db(-wal|-shm)?$/.test(n) && !n.startsWith(current))) {
        if (old(join(dir, f))) rmSync(join(dir, f), { force: true });
    }
    let junit = 0;
    for (const [, wt] of git(cwd, ["worktree", "list", "--porcelain"]).matchAll(/^worktree (.+)$/gm)) {
        const results = join(wt, "test-results");
        for (const f of list(results).filter(
            (n) => n.startsWith("junit-") && Date.now() - statSync(join(results, n)).mtimeMs > 2 * DAY,
        )) {
            unlinkSync(join(results, f));
            junit++;
        }
    }
    db.prepare("INSERT OR REPLACE INTO meta VALUES ('last_prune', ?)").run(new Date().toISOString());
    db.close();
    return `ledger: pruned ${rows} invocation rows and ${junit} old JUnit files`;
}

// ---------------------------------------------------------------- decisions

const chainOf = (cwd, tip, n = 200) =>
    git(cwd, ["rev-list", "--first-parent", "-n", String(n), tip])
        .split("\n")
        .filter(Boolean);

/**
 * Golden's newest word on a test file: the newest evidence-kind invocation of the variant on the chain that ran it.
 * @param db the database
 * @param file the test file
 * @param variant the variant
 * @param chain golden chain commits, newest first
 * @param [kinds] the kinds that count
 * @returns `{ id, c, s, d }` or undefined
 */
export function newestWord(db, file, variant, chain, kinds = EVIDENCE) {
    const at = new Map(chain.map((c, i) => [c, i]));
    const rows = db
        .prepare(
            `SELECT i.id, i.commit_sha c, i.started_at s, fr.dup_names d FROM file_run fr JOIN test t ON t.id = fr.test
             JOIN invocation i ON i.id = fr.inv WHERE t.file = ? AND t.name = '' AND i.variant = ? AND i.dirty = 0
             AND i.outcome IN ('passed', 'failed') AND i.kind IN ${inList(kinds.length)}
             AND i.commit_sha IN (SELECT value FROM json_each(?))`,
        )
        .all(file, variant, ...kinds, JSON.stringify(chain));
    return rows.sort((a, b) => at.get(a.c) - at.get(b.c) || (a.s < b.s ? 1 : -1))[0];
}

const failureIn = (db, inv, file, name) =>
    db
        .prepare("SELECT f.* FROM failure f JOIN test t ON t.id = f.test WHERE f.inv = ? AND t.file = ? AND t.name = ?")
        .get(inv, file, name);

/**
 * The quarantine list as golden's tip holds it, never as the tree under test does, without expired entries.
 * @param root the checkout
 * @param base the commit to read it from
 * @param [today] ISO date
 * @returns the entries
 */
export function quarantineAt(root, base, today = new Date().toISOString().slice(0, 10)) {
    try {
        const all = JSON.parse(git(root, ["show", `${base}:tools/test-quarantine.json`]) || "{}").quarantine ?? [];
        return all.filter((q) => checkQuarantine([q]).length === 0 && q.expires >= today);
    } catch {
        return [];
    }
}

/**
 * What is wrong with quarantine entries (design 4.4, ci-cd-plan.md 9.3).
 * @param entries the entries
 * @returns problems, empty when valid
 */
export function checkQuarantine(entries) {
    const problems = [];
    for (const q of entries) {
        const at = `${q.file} > ${q.name}`;
        if (!q.file || !q.name || !q.family || !(q.issue > 0) || !q.reason || !q.since || !q.expires)
            problems.push(`${at}: needs file, name, family, issue, reason, since, expires`);
        if (Date.parse(q.expires) - Date.parse(q.since) > 14 * DAY) problems.push(`${at}: 14 days at most`);
        if (GPU_FAMILY.test(q.family ?? "")) problems.push(`${at}: GPU tests are never quarantined`);
    }
    return problems;
}

/**
 * The failures a land check may excuse (design 5.1 and 4.4): the same test failing with the same key in golden's
 * newest run of its file, with an issue, unchanged by this landing, unique in its file, not a timeout, and no
 * fix or revert since; or a quarantined test that is not broken.
 * @param rec the land check's record
 * @param root its checkout (HEAD is the land commit, HEAD^1 golden's tip)
 * @param [env] the environment
 * @returns exonerations `{ file, name, reason, evidence, issue, line }`; empty when the ledger is unavailable
 */
export function exonerate(rec, root, env = process.env) {
    const l = openLedger(env, root);
    if (!l.db) {
        console.log(`ledger: unavailable (${l.why}); deciding as before`);
        return [];
    }
    const base = rec.base;
    const chain = base ? chainOf(root, base) : [];
    // Everything this landing brings golden: from GitHub's golden (a group's earlier branches too), else HEAD^1.
    const from = git(root, ["rev-parse", "-q", "--verify", "origin/golden"]) || base || "HEAD";
    const changed = new Set(git(root, ["diff", "--name-only", from, "HEAD"]).split("\n"));
    const dups = new Map(rec.files.map(([f, , , , , d]) => [f, d]));
    const quarantine = base ? quarantineAt(root, base) : [];
    const out = [];
    for (const f of rec.failures) {
        const q = quarantine.find((e) => e.file === f.file && e.name === f.name && e.family === rec.family);
        if (q && !classify(l.db, f.file, f.name, rec.variant, chain).broken) {
            out.push({
                file: f.file,
                name: f.name,
                reason: "quarantined",
                evidence: "tools/test-quarantine.json",
                issue: q.issue,
                line: f.line,
            });
            continue;
        }
        if (f.status === "timeout" || changed.has(f.file) || dups.get(f.file) > 0) continue;
        const ev = newestWord(l.db, f.file, rec.variant, chain);
        const was = ev && ev.d === 0 && failureIn(l.db, ev.id, f.file, f.name);
        const issue =
            was &&
            was.key === f.key &&
            l.db.prepare("SELECT * FROM golden_issue WHERE signature = ? AND issue > 0").get(was.signature);
        if (!issue) continue;
        const since = git(root, ["log", "--format=%B", `${ev.c}..${base}`]);
        const fixed = new RegExp(`#${issue.issue}\\b`).test(since) || (issue.culprit && since.includes(issue.culprit));
        if (!fixed)
            out.push({
                file: f.file,
                name: f.name,
                reason: "fails-on-golden",
                evidence: ev.id,
                commit: ev.c,
                issue: issue.issue,
                line: f.line,
            });
    }
    l.db.close();
    return out.length === rec.failures.length ? out : [];
}

/**
 * The [KNOWN] / [QUARANTINED] lines for an excused shard, one per test.
 * @param rec the record with its exonerations
 * @returns lines
 */
export function knownLines(rec) {
    return rec.exonerations.map((e) => {
        const why =
            e.reason === "quarantined"
                ? "is quarantined"
                : `fails as on golden at ${e.commit?.slice(0, 10)} (${e.evidence})`;
        const tag = e.reason === "quarantined" ? "QUARANTINED" : "KNOWN";
        return `  [${tag}] ${rec.shard}: ${e.file} > ${e.name} ${why}, issue #${e.issue}; coverage not checked`;
    });
}

/**
 * A test's history in its variant (design 5.2): the last 100 verdicts of tool-owned kinds, flaky proofs (two
 * runs of one tree that disagree), flaky, broken (4+ golden verdicts, 80% failing) and rate rose (3x more
 * failures over its last 30 golden verdicts than in the 30 days before them).
 * @param db the database
 * @param file the test file
 * @param name the test
 * @param variant the variant
 * @param [chain] golden chain commits
 * @param [before] only verdicts before this ISO time
 * @returns `{ verdicts, fails, proofs, flaky, broken, rose, rate }`
 */
export function classify(db, file, name, variant, chain = [], before = "9999") {
    const rows = db
        .prepare(
            `SELECT i.tree, i.commit_sha c, i.started_at s, (f.inv IS NOT NULL) failed FROM file_run fr
             JOIN test tf ON tf.id = fr.test AND tf.file = ? AND tf.name = '' JOIN invocation i ON i.id = fr.inv
             LEFT JOIN failure f ON f.inv = i.id AND f.test = (SELECT id FROM test WHERE file = ? AND name = ?)
             WHERE i.variant = ? AND i.kind IN ${inList(OWNED.length)} AND i.dirty = 0 AND i.outcome IN ('passed', 'failed')
             AND (f.inv IS NOT NULL OR fr.skipped = 0) AND i.started_at < ? ORDER BY i.started_at DESC LIMIT 100`,
        )
        .all(file, file, name, variant, ...OWNED, before);
    const byTree = new Map();
    rows.forEach((r) => byTree.set(r.tree, (byTree.get(r.tree) ?? 0) | (r.failed ? 1 : 2)));
    const proofs = [...byTree.values()].filter((v) => v === 3).length;
    const fails = rows.filter((r) => r.failed).length;
    const flaky = proofs >= 2 && proofs >= rows.length / 100;
    const onGolden = new Set(chain);
    const golden = rows.filter((r) => onGolden.has(r.c));
    const broken = golden.length >= 4 && golden.filter((r) => r.failed).length >= 0.8 * golden.length;
    const rate = (rs) => (rs.length ? rs.filter((r) => r.failed).length / rs.length : 0);
    const recent = golden.slice(0, 30);
    const from = recent.at(-1)?.s ?? before;
    const older = rows.filter((r) => r.s < from && Date.parse(r.s) >= Date.parse(from) - 30 * DAY);
    const rose =
        flaky && recent.length > 0 && older.length >= 10 && rate(recent) > 0 && rate(recent) >= 3 * rate(older);
    return { verdicts: rows.length, fails, proofs, flaky, broken, rose, rate: rate(rows) };
}

/**
 * The bad threshold for a flaky test re-run `n` times at a bisect point: the smallest failure count whose
 * probability under Binomial(n, rate) is 2% or less (design 5.3: at a 2% rate, 2 or more of 10).
 * @param rate the test's failure rate before the range
 * @param [n] runs per point
 * @returns the count at or above which the point is bad
 */
export function badThreshold(rate, n = 10) {
    const choose = (k) => {
        let c = 1;
        for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
        return c;
    };
    const pmf = (k) => choose(k) * rate ** k * (1 - rate) ** (n - k);
    let tail = 1;
    for (let k = 0; k <= n; k++) {
        if (tail <= 0.02) return k;
        tail -= pmf(k);
    }
    return n + 1;
}

/**
 * Sorts shards in place so families that failed on golden most recently start first, then the slower ones
 * (design 5.4); startRule() still decides what may start.
 * @param shards SHARDS entries
 * @param root the checkout (its golden chain is origin/golden's)
 * @param [env] the environment
 * @returns the shards
 */
export function orderShards(shards, root, env = process.env) {
    const l = openLedger(env, root);
    if (!l.db) return shards;
    const chain = chainOf(root, "origin/golden");
    const last = new Map(
        l.db
            .prepare(
                `SELECT i.family f, MAX(i.started_at) s FROM failure fl JOIN invocation i ON i.id = fl.inv LEFT JOIN exoneration e
                 ON e.inv = fl.inv AND e.test = fl.test WHERE e.inv IS NULL AND i.commit_sha IN (SELECT value FROM json_each(?)) GROUP BY i.family`,
            )
            .all(JSON.stringify(chain))
            .map((r) => [r.f, r.s]),
    );
    const secs = new Map();
    for (const r of l.db
        .prepare(
            "SELECT family f, secs FROM invocation WHERE outcome = 'passed' AND reused_from IS NULL AND secs > 0 ORDER BY started_at DESC LIMIT 2000",
        )
        .all()) {
        secs.set(r.f, [...(secs.get(r.f) ?? []), r.secs]);
    }
    const median = (f) => (secs.get(f) ?? [0]).sort((a, b) => a - b)[Math.floor((secs.get(f) ?? [0]).length / 2)];
    l.db.close();
    return shards.sort((a, b) => {
        const [fa, fb] = [familyOf(a.shard), familyOf(b.shard)];
        return (last.get(fb) ?? "").localeCompare(last.get(fa) ?? "") || median(fb) - median(fa);
    });
}

/**
 * The tests whose newest word on golden (origin/golden's chain, any tool-owned kind) is a failure.
 * @param db the database
 * @param chain the chain
 * @returns `[{ file, name, variant, signature, line, issue, commit }]`
 */
export function goldenFailures(db, chain) {
    const cands = db
        .prepare(
            `SELECT DISTINCT t.file, t.name, i.variant FROM failure f JOIN test t ON t.id = f.test JOIN invocation i ON i.id = f.inv
             WHERE i.commit_sha IN (SELECT value FROM json_each(?)) AND i.kind IN ${inList(OWNED.length)}`,
        )
        .all(JSON.stringify(chain), ...OWNED);
    const out = [];
    for (const c of cands) {
        const ev = newestWord(db, c.file, c.variant, chain, OWNED);
        const f = ev && failureIn(db, ev.id, c.file, c.name);
        const issue = f && db.prepare("SELECT issue FROM golden_issue WHERE signature = ?").get(f.signature)?.issue;
        if (f) out.push({ ...c, signature: f.signature, key: f.key, line: f.line, issue: issue || null, commit: ev.c });
    }
    return out;
}

// ---------------------------------------------------------------- issues for failures on golden

/**
 * Makes sure each signature has an issue: claims issues/<signature>.json with the exclusive flag, so two
 * verifications file one, and files `Failing on golden: <line>`. A claim left at issue 0 (filing failed) is
 * retried by the next verification.
 * @param dir the ledger directory
 * @param failures `[{ signature, line, file, name, key }]`
 * @param info `{ commit, log }`
 * @param gh `(args) => stdout`
 * @returns `{ signature: issue }`
 */
export function fileIssues(dir, failures, info, gh) {
    mkdirSync(join(dir, "issues"), { recursive: true });
    const out = {};
    for (const sig of new Set(failures.map((f) => f.signature))) {
        const path = join(dir, "issues", `${sig}.json`);
        const tests = failures.filter((f) => f.signature === sig);
        try {
            writeFileSync(path, JSON.stringify({ signature: sig, issue: 0, opened_at: new Date().toISOString() }), {
                flag: "wx",
            });
        } catch {
            const had = readJson(path);
            if (had?.issue > 0) {
                out[sig] = had.issue;
                continue;
            }
        }
        try {
            const body = [
                `Verification of golden at ${info.commit} failed with this failure (\`node tools/test-ledger.mjs why '${tests[0].file}'\`):`,
                "",
                ...tests.map((t) => `- \`${t.file} > ${t.name}\` (key ${t.key}): ${t.line}`),
                "",
                `Log: ${info.log}`,
                "",
                `<!-- test-ledger signature=${sig} -->`,
            ].join("\n");
            const url = gh([
                "issue",
                "create",
                "--title",
                `Failing on golden: ${tests[0].line}`.slice(0, 200),
                "--label",
                "bug",
                "--label",
                "priority:high",
                "--label",
                "effort:medium",
                "--body",
                body,
            ]);
            const issue = Number(/\/issues\/(\d+)/.exec(url)?.[1]);
            if (issue > 0) {
                writeFileSync(path, JSON.stringify({ ...readJson(path), issue }));
                out[sig] = issue;
            }
        } catch (e) {
            console.error(
                `ledger: could not file the issue for ${sig}: ${e.message.split("\n")[0]}; the next verification retries`,
            );
        }
    }
    return out;
}

/**
 * Records the culprit verification named on each issue file of these signatures, and says so on the issue.
 * @param dir the ledger directory
 * @param signatures the signatures
 * @param culprit `{ sha, subject }`
 * @param gh `(args) => stdout`
 */
export function noteCulprit(dir, signatures, culprit, gh) {
    for (const sig of new Set(signatures)) {
        const path = join(dir, "issues", `${sig}.json`);
        const i = readJson(path);
        if (!i?.issue || i.culprit === culprit.sha) continue;
        writeFileSync(path, JSON.stringify({ ...i, culprit: culprit.sha }));
        try {
            gh([
                "issue",
                "comment",
                String(i.issue),
                "--body",
                `Verification's bisect names the culprit: ${culprit.sha} ${culprit.subject}`,
            ]);
        } catch {
            // the issue file holds it; the comment is a courtesy
        }
    }
}

// ---------------------------------------------------------------- the command line

function status(l, cwd) {
    const { db } = l;
    const chain = chainOf(cwd, "origin/golden");
    const count = (sql, ...a) => db.prepare(sql).get(...a).n;
    const week = new Date(Date.now() - 7 * DAY).toISOString();
    console.log(
        `ledger: ${count("SELECT COUNT(*) n FROM invocation")} invocations, ${count("SELECT COUNT(*) n FROM failure")} failures; this week ${count("SELECT COUNT(*) n FROM exoneration e JOIN invocation i ON i.id = e.inv WHERE i.started_at > ?", week)} excused, ${count("SELECT COUNT(*) n FROM invocation WHERE outcome = 'unattributed' AND started_at > ?", week)} unattributed`,
    );
    const failing = goldenFailures(db, chain);
    console.log(`failing on golden (${failing.length}):`);
    failing.forEach((f) =>
        console.log(
            `  ${f.variant}  ${f.file} > ${f.name}  issue ${f.issue ? `#${f.issue}` : "none"}  at ${f.commit.slice(0, 10)}: ${f.line}`,
        ),
    );
    const recent = new Date(Date.now() - 30 * DAY).toISOString();
    const tests = db
        .prepare(
            "SELECT DISTINCT t.file, t.name, i.variant FROM failure f JOIN test t ON t.id = f.test JOIN invocation i ON i.id = f.inv WHERE i.started_at > ?",
        )
        .all(recent);
    const quarantine = quarantineAt(cwd, "origin/golden");
    for (const t of tests) {
        const c = classify(db, t.file, t.name, t.variant, chain);
        const label = [c.broken && "BROKEN", c.rose && "FLAKE RATE ROSE", c.flaky && !c.rose && "flaky"].filter(
            Boolean,
        )[0];
        const q = quarantine.some((e) => e.file === t.file && e.name === t.name) ? ", quarantined" : "";
        if (label)
            console.log(
                `${label}: ${t.variant}  ${t.file} > ${t.name}  (${c.fails} of ${c.verdicts} failed, ${c.proofs} proofs${q})`,
            );
    }
    console.log(`quarantine: ${quarantine.length} active`);
    return 0;
}

function why(l, cwd, target) {
    const [file, name = ""] = target.split(" > ");
    const rows = l.db
        .prepare(
            `SELECT i.started_at, i.kind, i.variant, i.commit_sha, i.outcome, fr.passed, fr.failed, fr.skipped, f.line, f.key, e.reason, e.evidence
             FROM file_run fr JOIN test tf ON tf.id = fr.test AND tf.file = ? AND tf.name = '' JOIN invocation i ON i.id = fr.inv
             LEFT JOIN test tt ON tt.file = tf.file AND tt.name = ? LEFT JOIN failure f ON f.inv = i.id AND (f.test = tt.id OR ? = '')
             LEFT JOIN exoneration e ON e.inv = i.id AND e.test = f.test ORDER BY i.started_at DESC LIMIT 50`,
        )
        .all(file, name, name);
    rows.forEach((r) =>
        console.log(
            Object.values(r)
                .map((v) => (v === null ? "-" : String(v).slice(0, 80)))
                .join("  "),
        ),
    );
    if (name)
        for (const v of new Set(rows.map((r) => r.variant)))
            console.log(v, JSON.stringify(classify(l.db, file, name, v, chainOf(cwd, "origin/golden"))));
    return 0;
}

/**
 * Runs one command.
 * @param argv the arguments
 * @param [env] the environment
 * @returns the exit code
 */
export async function cli(argv, env = process.env) {
    const cwd = process.cwd();
    const [cmd, arg] = argv;
    if (cmd === "rebuild") return console.log(`ledger: rebuilt as ${rebuild(env, cwd)}`) ?? 0;
    if (cmd === "prune") return console.log(prune(env, cwd)) ?? 0;
    if (!["status", "why", "sql"].includes(cmd) || (cmd !== "status" && !arg)) {
        console.error(
            'usage: node tools/test-ledger.mjs status | why <file>[ > <test>] | sql "<select>" | rebuild | prune',
        );
        return 2;
    }
    const l = openLedger(env, cwd);
    if (!l.db) return console.error(`ledger: unavailable (${l.why})`) ?? 1;
    if (cmd === "status") return status(l, cwd);
    if (cmd === "why") return why(l, cwd, arg);
    if (!/^\s*(select|with)\b/i.test(arg)) return console.error("ledger: sql takes a SELECT") ?? 2;
    l.db.exec("PRAGMA query_only = ON");
    console.table(l.db.prepare(arg).all());
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await cli(process.argv.slice(2));
