#!/usr/bin/env node
// The test ledger (design/ci/test-ledger.md): every gate, verification and bisect run records each test
// shard it ran, and a few decisions read that history. The truth is one gzipped JSON file per shard run in
// <main checkout>/tmp/test-ledger/records/<day>/; ledger-<time>.db (node:sqlite, named by CURRENT) is only an
// index, which every reader first brings up to date and `rebuild` remakes from the files with nothing lost.
//
// Nothing here may block or fail a push: callers import this module and call it inside try/catch, and a
// ledger that is missing, locked or broken prints `ledger: unavailable (<why>); deciding as before`.
//
//   node tools/test-ledger.mjs status                  golden failures, flaky / broken tests, health
//   node tools/test-ledger.mjs why <file>[ > <test>]   the rows behind a decision about a test or a file
//   node tools/test-ledger.mjs sql "<select>"          a read-only query
//   node tools/test-ledger.mjs rebuild | prune
//
// TEST_LEDGER_DIR replaces the directory (the tests set it). Off switch for excusing: PREPUSH_EXONERATE=0.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
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
// Runs of a golden commit in a worktree the tools own; `base` is a land check's re-run on golden's tip (5.1).
export const EVIDENCE = ["land-check", "verify", "bisect", "cut", "base"];
// Counted in flaky proofs and `status`; imports keep their source's kind and never count in rates.
export const OWNED = [...EVIDENCE, ...["land-check", "verify", "bisect", "cut", "detached"].map((k) => `import-${k}`)];
const LAND_SUBJECT = /^land: (\S+)$/;

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
const readJson = (p) => {
    try {
        return JSON.parse(readFileSync(p, "utf8"));
    } catch {
        return null;
    }
};

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
    s.replaceAll(/&(?:(lt|gt|quot|apos|amp)|#(\d+)|#x([\da-f]+));/gi, (_m, n, d, x) => {
        if (n) return ENTITIES[n];
        return String.fromCodePoint(d ? Number(d) : Number.parseInt(x, 16));
    });
const attr = (tag, name) => {
    const m = new RegExp(String.raw`\s${name}="([^"]*)"`).exec(tag);
    return m ? unxml(m[1]) : "";
};

/**
 * A test file's ledger name with any absolute path made relative to its package (a classnameTemplate of
 * `{filepath}` writes `<pkg>/no-subgroups//home/.../<pkg>/test/x.test.ts`), so a test has one history.
 * @param file `<pkg>/<path>`
 * @returns `<pkg>/[<prefix>/]<path in the package>`
 */
export function relFile(file) {
    const at = file.indexOf("//");
    if (at === -1) return file;
    const pkg = file.slice(0, file.indexOf("/"));
    const abs = file.slice(at + 1);
    const inPkg = abs.lastIndexOf(`/${pkg}/`);
    return inPkg === -1 ? file : file.slice(0, at + 1) + abs.slice(inPkg + pkg.length + 2);
}

/**
 * Adds one Vitest JUnit file to `into`. Vitest retries are off (design/ci/ci-cd-plan.md 9.1), so a testcase
 * is one verdict; if retries are ever turned on, this must become a Vitest reporter.
 * @param xml the file's text
 * @param pkg the package directory the run's paths are relative to
 * @param into `{ files: Map, failures: [] }`
 * @returns `into`
 */
export function parseJunit(xml, pkg, into = undefined) {
    into ??= { files: new Map(), failures: [] };
    if (!xml.includes("<testsuites")) throw new Error("not a JUnit report");
    for (const [, tag, , body = ""] of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
        const file = relFile(`${pkg}/${attr(tag, "classname")}`);
        const name = attr(tag, "name");
        const f = into.files.get(file) ?? { passed: 0, failed: 0, skipped: 0, ms: 0, dup: 0, names: new Set() };
        into.files.set(file, f);
        if (f.names.has(name)) f.dup++;
        f.names.add(name);
        const ms = Math.round(Number(attr(tag, "time") || 0) * 1000);
        f.ms += ms;
        const fail = /<(failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/.exec(body);
        if (fail) {
            f.failed++;
            into.failures.push({ file, name, ms, text: unxml(fail[3] ?? "").trim() || attr(fail[2], "message") });
        } else if (/<skipped\b/.test(body)) f.skipped++;
        else f.passed++;
    }
    return into;
}

// Lines that say nothing about the failure: a bare error name ("AssertionError:"), Storybook's debug link, a DOM dump.
const UNINFORMATIVE = /^\w*Error:?$|Click to debug|^Ignored nodes:|^</;
// A wait that expired: Vitest's and Playwright's timeouts, Testing Library's findBy / waitFor, expect.poll.
const WAIT_EXPIRED = /timed out|TimeoutError|Timeout -?\d+ms exceeded|Unable to find|expect\.poll/i;
// A story whose two renders drew different pictures (visual-review's story tests): flaky by definition.
const UNSTABLE_STORY = /visual-review: \S+ is unstable \(two renders drew different pictures\)/;
const statusOf = (timeout, first) => {
    if (timeout) return "timeout";
    return UNSTABLE_STORY.test(first) ? "unstable" : "fail";
};

/**
 * A failure's first informative line, its key (the first two informative lines, cleaned, numbers kept) and its
 * signature (numbers masked, plus two stack frames outside node_modules; an expired wait is `timeout` plus its file).
 * @param text the failure message and stack
 * @param file the test file
 * @param main the main checkout, whose path and worktree paths are removed
 * @returns `{ line, key, signature, status }`; status is `timeout` for an expired wait, `unstable` for an unstable story, else `fail`
 */
export function failureHashes(text, file, main = "/nonexistent") {
    const esc = main.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const clean = (s) =>
        s
            .replaceAll(new RegExp(String.raw`${esc}(?:/\.worktrees/[^/\s]+)?/`, "g"), "")
            .replaceAll(/\/tmp\/\S*/g, "<tmp>")
            .replaceAll(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi, "<uuid>")
            .replaceAll(/\b[\da-f]{7,}\b/gi, "<hex>");
    const mask = (s) => s.replaceAll(/:\d+(?::\d+)?/g, "").replaceAll(/\d+/g, "<n>");
    const lines = stripVTControlCharacters(text)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const frame = (l) => /^(❯|at )/.test(l);
    const said = lines
        .filter((l) => !frame(l) && !UNINFORMATIVE.test(l))
        .slice(0, 2)
        .map(clean);
    const first = said[0] ?? clean(lines[0] ?? "");
    const timeout = said.some((l) => WAIT_EXPIRED.test(l));
    const frames = lines
        .filter((l) => frame(l) && !l.includes("node_modules"))
        .slice(0, 2)
        .map((l) => mask(clean(l)));
    const status = statusOf(timeout, first);
    // a timeout's or an unstable story's text changes from run to run (the wait, the modes that differed): signed by its file
    const signature = status === "fail" ? h16([mask(first), ...frames].join("\n")) : h16(`${status}\0${file}`);
    return { line: first.slice(0, 300), key: h16(said.join("\n")), signature, status };
}

/**
 * An invocation's outcome (design 3.3). Only `passed` and `failed` count as evidence or in rates.
 * @param run `{ code, log, runs, junit, cancelled }`; junit is null when no JUnit carries the run id
 * @returns passed, failed, error, infra, unattributed or cancelled
 */
export function outcomeOf(run) {
    const { code, log, runs = 1, junit, cancelled } = run;
    if (cancelled) return "cancelled";
    // line by line, with no regular expression that could backtrack over a huge log
    const lines = stripVTControlCharacters(log ?? "")
        .split("\n")
        .map((l) => l.trim());
    const summaries = lines.filter((l) => l.startsWith("Test Files ") && /\(\d+\)$/.test(l)).length;
    if (code === null || [124, 137, 143].includes(code) || summaries < runs) return "infra";
    if (!junit) return "unattributed";
    if (junit.bad) return "infra";
    if (code === 0) return "passed";
    // A file that fails as a whole (a hook timed out, an import threw) is a "Failed Suites" entry, not a failed test.
    const count = (re) => lines.reduce((n, l) => n + Number(re.exec(l)?.[1] ?? 0), 0);
    const failed = count(/^Tests +(\d+) failed/) + count(/^\W*Failed Suites (\d+)\W*$/);
    const errors = lines.some(
        (l) =>
            (l.startsWith("Errors ") && l.includes(" error")) ||
            l.includes("ERROR: Coverage for") ||
            l.includes("Unhandled Error"),
    );
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
 * What every record of one checkout shares; a gate computes it once, not per shard. A land commit's branch is
 * the landed one (`land: <branch>`), so the ledger can tell failures of unrelated landings apart.
 * @param root the checkout
 * @param [env] the environment
 * @returns `{ commit, tree, base, branch, dirty }`
 */
export function headFacts(root, env = process.env) {
    const subject = git(root, ["log", "-1", "--format=%s"]);
    return {
        commit: git(root, ["rev-parse", "HEAD"]),
        tree: git(root, ["rev-parse", "HEAD^{tree}"]),
        base: git(root, ["rev-parse", "-q", "--verify", "HEAD^1"]) || null,
        branch:
            LAND_SUBJECT.exec(subject)?.[1] ||
            env.TEST_LEDGER_BRANCH ||
            git(root, ["symbolic-ref", "--short", "-q", "HEAD"]) ||
            null,
        dirty: git(root, ["status", "--porcelain"]) !== "",
    };
}

/**
 * Records one shard run: reads the JUnit files that carry its run id, writes the record file, deletes them.
 * @param o `shard`, `code`, `log`, `root` (the checkout), `kind`, `runId`, `startedAt` (ms), `runs` (vitest
 *   runs the command makes), `selected` (file list or null), `cancelled`, `reusedFrom` (a pass's record id),
 *   `head` (headFacts(), else computed), `logFile`, `env`, `main` (for path cleaning), `write` (false: the caller
 *   writes it, with its exonerations)
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
    const head = o.head ?? headFacts(o.root, env);
    const rec = {
        v: 1,
        id,
        kind: env.TEST_LEDGER_KIND || o.kind || "push",
        ...head,
        dirty: Boolean(o.dirty) || head.dirty,
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
    if (o.write !== false) writeRecord(dir, rec);
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
    db.q ??= {
        inv: db.prepare(`INSERT OR IGNORE INTO invocation VALUES ${inList(16)}`),
        test: db.prepare("INSERT OR IGNORE INTO test (file, name) VALUES (?, ?)"),
        testId: db.prepare("SELECT id FROM test WHERE file = ? AND name = ?"),
        fileRun: db.prepare("INSERT OR IGNORE INTO file_run VALUES (?, ?, ?, ?, ?, ?, ?)"),
        failure: db.prepare("INSERT OR IGNORE INTO failure VALUES (?, ?, ?, ?, ?, ?, ?)"),
        exon: db.prepare("INSERT OR IGNORE INTO exoneration VALUES (?, ?, ?, ?, ?)"),
        issue: db.prepare("INSERT OR REPLACE INTO golden_issue VALUES (?, ?, ?, ?)"),
    };
    return db.q;
}

function testId(db, file, name = "") {
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
    for (const [file, ...counts] of r.files) run(q.fileRun, r.id, testId(db, relFile(file)), ...counts);
    for (const f of r.failures) {
        run(q.failure, r.id, testId(db, relFile(f.file), f.name), f.status, f.signature, f.key, f.line, f.message);
    }
    for (const e of r.exonerations)
        run(q.exon, r.id, testId(db, relFile(e.file), e.name), e.reason, e.evidence, e.issue);
}

// Takes the write lock only when there is something to write, so a reader of an up-to-date index never waits.
function ingest(db, dir, from) {
    const meta = (k) => db.prepare("SELECT v FROM meta WHERE k = ?").get(k)?.v;
    const since = from ?? meta("ingested_through") ?? "";
    const days = list(join(dir, "records"))
        .filter((d) => d >= since)
        .sort();
    const have = db.prepare("SELECT 1 FROM invocation WHERE id = ?");
    const fresh = days.flatMap((d) =>
        list(join(dir, "records", d))
            .filter((n) => n.endsWith(".json.gz") && !have.get(n.slice(0, -8)))
            .map((n) => n.slice(0, -8)),
    );
    const known = db.prepare("SELECT issue, culprit FROM golden_issue WHERE signature = ?");
    const issues = list(join(dir, "issues"))
        .filter((n) => n.endsWith(".json"))
        .map((f) => readJson(join(dir, "issues", f)))
        .filter((i) => {
            const k = i && known.get(i.signature);
            return i && (!k || k.issue !== (i.issue ?? 0) || k.culprit !== (i.culprit ?? null));
        });
    // A writer that began a record before midnight may rename it into yesterday's directory after this.
    const through = days.length ? new Date(Date.parse(days.at(-1)) - DAY).toISOString().slice(0, 10) : since;
    if (!fresh.length && !issues.length && through === meta("ingested_through")) return;
    db.exec("BEGIN IMMEDIATE");
    try {
        fresh.forEach((id) => ingestOne(db, dir, id));
        issues.forEach((i) => prepare(db).issue.run(i.signature, i.issue ?? 0, i.culprit ?? null, i.opened_at ?? null));
        db.prepare("INSERT OR REPLACE INTO meta VALUES ('ingested_through', ?)").run(through);
        db.exec("COMMIT");
    } catch (e) {
        db.exec("ROLLBACK");
        throw e;
    }
}

// One bad record file must not stop every later reader: it is skipped whole, and stays on disk.
function ingestOne(db, dir, id) {
    const r = readRecord(dir, id);
    db.exec("SAVEPOINT one");
    try {
        if (r) insertRecord(db, r);
        db.exec("RELEASE one");
    } catch (e) {
        db.exec("ROLLBACK TO one; RELEASE one");
        console.error(`ledger: skipped record ${id}: ${e.message}`);
    }
}

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
 * Rebuilds the database when it is missing, incomplete or corrupt (verification calls this at its start); a
 * locked or busy one is left alone.
 * @param [env] the environment
 * @param [cwd] a directory of the repository
 * @returns the new database's name, or null when the current one is fine or only busy
 */
export function ensure(env = process.env, cwd = process.cwd()) {
    const l = openLedger(env, cwd);
    l.db?.close();
    return l.db || !/no database|not complete|malformed|not a database|corrupt/i.test(l.why) ? null : rebuild(env, cwd);
}

/**
 * At most daily: records and rows older than 120 days, databases CURRENT does not name older than a day,
 * temporary record files a killed writer left, and JUnit files older than 2 days in every worktree.
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
    let n;
    do {
        const del = "DELETE FROM invocation WHERE id IN (SELECT id FROM invocation WHERE started_at < ? LIMIT 5000)";
        n = Number(db.prepare(del).run(cutoff).changes);
        rows += n;
    } while (n > 0);
    const junit = pruneFiles(dir, cwd, cutoff.slice(0, 10));
    db.prepare("INSERT OR REPLACE INTO meta VALUES ('last_prune', ?)").run(new Date().toISOString());
    db.close();
    return `ledger: pruned ${rows} invocation rows and ${junit} old JUnit files`;
}

const olderThan = (p, days) => Date.now() - statSync(p).mtimeMs > days * DAY;

// prune()'s files: record days before the cutoff, temporary files and databases older than a day, JUnit older than 2.
function pruneFiles(dir, cwd, cutoffDay) {
    const records = join(dir, "records");
    const days = list(records);
    days.filter((d) => d < cutoffDay).forEach((d) => rmSync(join(records, d), { recursive: true }));
    const temps = days
        .filter((d) => d >= cutoffDay)
        .flatMap((d) =>
            list(join(records, d))
                .filter((f) => f.startsWith("."))
                .map((f) => join(records, d, f)),
        );
    const current = readFileSync(join(dir, "CURRENT"), "utf8").trim();
    const dbs = list(dir).filter((n) => /^ledger-.*\.db(-wal|-shm)?$/.test(n) && !n.startsWith(current));
    [...temps, ...dbs.map((n) => join(dir, n))]
        .filter((p) => olderThan(p, 1))
        .forEach((p) => rmSync(p, { force: true }));
    const junit = [...git(cwd, ["worktree", "list", "--porcelain"]).matchAll(/^worktree (.+)$/gm)]
        .flatMap(([, wt]) =>
            list(join(wt, "test-results"))
                .filter((n) => n.startsWith("junit-"))
                .map((n) => join(wt, "test-results", n)),
        )
        .filter((p) => olderThan(p, 2));
    junit.forEach((p) => rmSync(p, { force: true }));
    return junit.length;
}

const GPU_FAMILY = /^webgpu-graph-algorithms/;

/**
 * What is wrong with quarantine entries (design 4.4, ci-cd-plan.md 9.3); tools/test-quarantine.mjs checks its list.
 * @param entries the entries
 * @returns problems, empty when valid
 */
export function checkQuarantine(entries) {
    const problems = [];
    for (const q of entries) {
        const at = `${q.file} > ${q.name}`;
        const filed = Number(q.issue) > 0;
        if (!q.file || !q.name || !q.family || !filed || !q.reason || !q.since || !q.expires)
            problems.push(`${at}: needs file, name, family, issue, reason, since, expires`);
        if (Date.parse(q.expires) - Date.parse(q.since) > 14 * DAY) problems.push(`${at}: 14 days at most`);
        if (GPU_FAMILY.test(q.family ?? "")) problems.push(`${at}: GPU tests are never quarantined`);
    }
    return problems;
}

// ---------------------------------------------------------------- decisions

const chainOf = (cwd, tip, n = 200) =>
    git(cwd, ["rev-list", "--first-parent", "-n", String(n), tip])
        .split("\n")
        .filter(Boolean);

/**
 * Golden's tip under a land check: the first commit below HEAD, on the first-parent line, that GitHub's golden
 * already has or that is not a landing (a group lands as several `land: <branch>` commits in a row).
 * @param root the land check's checkout
 * @returns the commit, or null
 */
export function goldenTip(root) {
    const golden = git(root, ["rev-parse", "-q", "--verify", "origin/golden"]);
    const has = (sha) => spawnSync("git", ["merge-base", "--is-ancestor", sha, golden], { cwd: root }).status === 0;
    for (const line of git(root, ["log", "--first-parent", "-n", "100", "--format=%H %s", "HEAD^1"]).split("\n")) {
        const [sha, subject] = [line.slice(0, 40), line.slice(41)];
        if (sha && (!LAND_SUBJECT.test(subject) || (golden && has(sha)))) return sha;
    }
    return null;
}

// Whether failure `x` (on golden) is failure `f` (in the land check): the same test failing the same way, or
// `f` an expired wait, which carries no cause, and golden failing that test at all.
const sameFailure = (x, f) =>
    x.file === f.file && x.name === f.name && (x.key === f.key || f.status === "timeout" || f.status === "unstable");

/**
 * The failures a land check may excuse (design 5.1): every failing test fails on golden's tip too, and the landing
 * changes none of their files. Golden's tip is asked directly: first the ledger's runs of exactly that commit,
 * then `rerun(base, files)`, which runs the failing files there (up to twice, so a wait that expires under load
 * gets a second chance) and returns its record. Each excused failure gets its `Failing on golden` issue now.
 * @param rec the land check's record (outcome `failed`)
 * @param root its checkout (HEAD is the land commit)
 * @param [opts] `env`, `rerun` (async, returns a record or null), `gh` (`(args) => stdout`)
 * @returns exonerations `{ file, name, reason, evidence, commit, issue, line }`; empty unless every failure is excused
 */
export async function exonerate(rec, root, opts = {}) {
    const { env = process.env, rerun = null, gh = defaultGh } = opts;
    const base = goldenTip(root);
    if (!base || rec.outcome !== "failed" || !rec.failures.length) return [];
    const changed = new Set(git(root, ["diff", "--name-only", base, "HEAD"]).split("\n"));
    const dups = new Map(rec.files.map(([f, , , , , d]) => [f, d]));
    if (rec.failures.some((f) => changed.has(f.file) || dups.get(f.file) > 0)) return [];
    const found = new Map();
    const take = (r, x) =>
        rec.failures.forEach((f, i) => !found.has(i) && sameFailure(x, f) && found.set(i, { ...x, inv: r }));
    const l = openLedger(env, root);
    if (l.db) {
        const sql = `SELECT f.*, t.file, t.name FROM failure f JOIN test t ON t.id = f.test JOIN invocation i ON i.id = f.inv
            WHERE i.commit_sha = ? AND i.dirty = 0 AND i.outcome = 'failed' AND i.kind IN ${inList(EVIDENCE.length)}`;
        l.db
            .prepare(sql)
            .all(base, ...EVIDENCE)
            .forEach((x) => take(x.inv, x));
        l.db.close();
    }
    for (let tries = 0; rerun && found.size < rec.failures.length && tries < 2; tries++) {
        const files = [...new Set(rec.failures.filter((_f, i) => !found.has(i)).map((f) => f.file))];
        const r = await rerun(base, files);
        if (r?.outcome !== "failed" && r?.outcome !== "passed") break; // the machine's failure: no answer
        r.failures.forEach((x) => take(r.id, x));
    }
    if (found.size < rec.failures.length) return [];
    const dir = ledgerDir(env, root);
    const issues = fileIssues(dir, [...found.values()], { commit: base, log: rec.log }, gh);
    return rec.failures.map((f, i) => {
        const ev = found.get(i);
        const issue = issues[ev.signature] ?? null;
        return {
            file: f.file,
            name: f.name,
            reason: "fails-on-golden",
            evidence: ev.inv,
            commit: base,
            issue,
            line: f.line,
        };
    });
}

function defaultGh(args) {
    const r = spawnSync("gh", args, { encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr || `gh exited ${r.status}`);
    return r.stdout.trim();
}

/**
 * The [KNOWN] lines for an excused shard, one per test.
 * @param rec the record with its exonerations
 * @returns lines
 */
export function knownLines(rec) {
    return rec.exonerations.map((e) => {
        const issue = e.issue ? `issue #${e.issue}` : "issue not filed yet (verification files it)";
        const at = `${e.commit?.slice(0, 10)} (${e.evidence})`;
        return `  [KNOWN] ${rec.shard}: ${e.file} > ${e.name} fails the same way on golden's tip ${at}, ${issue}; coverage not checked`;
    });
}

/**
 * A test's history in its family (design 5.2): the last 100 verdicts of tool-owned kinds that really ran (a reused
 * pass is not a run), flaky proofs (two runs of one tree in one run shape that disagree), flaky (2+ proofs), broken
 * (4+ golden verdicts, 80% failing) and the failure rate over golden's own verdicts, imports left out. A pass counts
 * only when its file skipped as many tests as the file usually does, so a file with a permanent skip still counts.
 * @param db the database
 * @param file the test file
 * @param name the test
 * @param family the family
 * @param [chain] golden chain commits
 * @param [before] only verdicts before this ISO time
 * @returns `{ verdicts, fails, proofs, flaky, broken, rate }`
 */
export function classify(db, file, name, family, chain = [], before = "9999") {
    const all = db
        .prepare(
            `SELECT i.tree, i.variant v, i.kind, i.commit_sha c, fr.skipped k, (f.inv IS NOT NULL) failed FROM file_run fr
             JOIN test tf ON tf.id = fr.test AND tf.file = ? AND tf.name = '' JOIN invocation i ON i.id = fr.inv
             LEFT JOIN failure f ON f.inv = i.id AND f.test = (SELECT id FROM test WHERE file = ? AND name = ?)
             WHERE i.family = ? AND i.kind IN ${inList(OWNED.length)} AND i.dirty = 0 AND i.reused_from IS NULL
             AND i.outcome IN ('passed', 'failed') AND i.started_at < ? ORDER BY i.started_at DESC LIMIT 100`,
        )
        .all(file, file, name, family, ...OWNED, before);
    const counts = new Map();
    all.forEach((r) => counts.set(r.k, (counts.get(r.k) ?? 0) + 1));
    const usual = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    const rows = all.filter((r) => r.failed || r.k === usual);
    const byTree = new Map();
    rows.forEach((r) => byTree.set(`${r.tree}\0${r.v}`, (byTree.get(`${r.tree}\0${r.v}`) ?? 0) | (r.failed ? 1 : 2)));
    const proofs = [...byTree.values()].filter((v) => v === 3).length;
    const onGolden = new Set(chain);
    const golden = rows.filter((r) => onGolden.has(r.c) && !r.kind.startsWith("import-"));
    const fails = (rs) => rs.filter((r) => r.failed).length;
    return {
        verdicts: rows.length,
        fails: fails(rows),
        proofs,
        flaky: proofs >= 2,
        broken: golden.length >= 4 && fails(golden) >= 0.8 * golden.length,
        rate: golden.length ? fails(golden) / golden.length : 0,
    };
}

/**
 * How often a test failed before a range of landings: in any tool-owned run at the last verified commit (whenever it
 * ran), or in any run before the range's first landing on a commit outside the range. Zero means verification
 * treats a test that turns intermittent in the range as a regression to bisect, not as a known flake to quarantine.
 * ponytail: all retained history (the ledger's prune bounds it); a window if old, fixed flakes keep counting.
 * @param db the database
 * @param t the test `{ file, name, family }`
 * @param range `{ from, before, commits }`: the verified commit, the first landing's ISO time, the range's commits
 * @returns the number of failed runs
 */
export function failuresBefore(db, t, range) {
    return db
        .prepare(
            `SELECT COUNT(*) n FROM failure f JOIN test x ON x.id = f.test AND x.file = ? AND x.name = ?
             JOIN invocation i ON i.id = f.inv WHERE i.family = ? AND i.kind IN ${inList(OWNED.length)} AND i.dirty = 0
             AND (i.commit_sha = ? OR (i.started_at < ? AND i.commit_sha NOT IN (SELECT value FROM json_each(?))))`,
        )
        .get(t.file, t.name, t.family, ...OWNED, range.from ?? "", range.before, JSON.stringify(range.commits)).n;
}

/**
 * The bad threshold for a flaky test re-run `n` times at a bisect point: the smallest failure count whose
 * probability under Binomial(n, rate) is 2% or less (design 5.3: at a 2% rate, 2 or more of 10), at most n.
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
    let tail = 1;
    for (let k = 0; k < n; k++) {
        if (tail <= 0.02) return k;
        tail -= choose(k) * rate ** k * (1 - rate) ** (n - k);
    }
    return n;
}

// Golden's newest word on a file in a family (by chain position, then time): the run `status` reads.
function newestWord(db, file, family, chain) {
    const at = new Map(chain.map((c, i) => [c, i]));
    const rows = db
        .prepare(
            `SELECT i.id, i.commit_sha c, i.started_at s FROM file_run fr JOIN test t ON t.id = fr.test
             JOIN invocation i ON i.id = fr.inv WHERE t.file = ? AND t.name = '' AND i.family = ? AND i.dirty = 0
             AND i.outcome IN ('passed', 'failed') AND i.kind IN ${inList(OWNED.length)}
             AND i.commit_sha IN (SELECT value FROM json_each(?))`,
        )
        .all(file, family, ...OWNED, JSON.stringify(chain));
    return rows.sort((a, b) => at.get(a.c) - at.get(b.c) || (a.s < b.s ? 1 : -1))[0];
}

/**
 * The tests whose newest word on golden (origin/golden's chain, any tool-owned kind) is a failure.
 * @param db the database
 * @param chain the chain
 * @returns `[{ file, name, family, signature, line, issue, commit }]`
 */
export function goldenFailures(db, chain) {
    const cands = db
        .prepare(
            `SELECT DISTINCT t.file, t.name, i.family FROM failure f JOIN test t ON t.id = f.test JOIN invocation i ON i.id = f.inv
             WHERE i.commit_sha IN (SELECT value FROM json_each(?)) AND i.kind IN ${inList(OWNED.length)}`,
        )
        .all(JSON.stringify(chain), ...OWNED);
    const out = [];
    for (const c of cands) {
        const ev = newestWord(db, c.file, c.family, chain);
        const sql =
            "SELECT f.* FROM failure f JOIN test t ON t.id = f.test WHERE f.inv = ? AND t.file = ? AND t.name = ?";
        const f = ev && db.prepare(sql).get(ev.id, c.file, c.name);
        const issue = f && db.prepare("SELECT issue FROM golden_issue WHERE signature = ?").get(f.signature)?.issue;
        if (f) out.push({ ...c, signature: f.signature, key: f.key, line: f.line, issue: issue || null, commit: ev.c });
    }
    return out;
}

// ---------------------------------------------------------------- issues for failures on golden

const pidAlive = (pid) => {
    try {
        return Boolean(pid) && process.kill(pid, 0);
    } catch {
        return false;
    }
};

/**
 * Makes sure each signature has an issue: claims issues/<signature>.json with the exclusive flag, so two
 * processes file one, and files `Failing on golden: <line>`. A claim another live process made in the last 10
 * minutes is left to it; an older one, or one whose filing failed, is taken over.
 * @param dir the ledger directory
 * @param failures `[{ signature, line, file, name, key }]`
 * @param info `{ commit, log }`
 * @param gh `(args) => stdout`
 * @returns `{ signature: issue }` for the signatures that have one
 */
export function fileIssues(dir, failures, info, gh) {
    mkdirSync(join(dir, "issues"), { recursive: true });
    const out = {};
    for (const sig of new Set(failures.map((f) => f.signature))) {
        const path = join(dir, "issues", `${sig}.json`);
        const had = claimIssue(path, sig);
        const issue = had === MINE ? fileIssue(path, sig, failures, info, gh) : had;
        if (issue > 0) out[sig] = issue;
    }
    return out;
}

const MINE = "mine";

// The signature's issue number; 0 when another live process claimed it in the last 10 minutes (it files it); MINE
// when this process now holds the claim and files it.
function claimIssue(path, sig) {
    const claim = { signature: sig, issue: 0, opened_at: new Date().toISOString(), pid: process.pid };
    try {
        writeFileSync(path, JSON.stringify(claim), { flag: "wx" });
        return MINE;
    } catch {
        const had = readJson(path);
        if (had?.issue > 0) return had.issue;
        if (Date.now() - Date.parse(had?.opened_at) < 600_000 && pidAlive(had.pid)) return 0;
        writeFileSync(path, JSON.stringify({ ...had, ...claim }));
        return MINE;
    }
}

function fileIssue(path, sig, failures, info, gh) {
    const tests = failures.filter((f) => f.signature === sig);
    try {
        const body = [
            `Golden at ${info.commit} fails this way (\`node tools/test-ledger.mjs why '${tests[0].file}'\`):`,
            "",
            ...tests.map((t) => `- \`${t.file} > ${t.name}\` (key ${t.key}): ${t.line}`),
            "",
            `Log: ${info.log ?? "-"}`,
            "",
            `<!-- test-ledger signature=${sig} -->`,
        ].join("\n");
        const title = `Failing on golden: ${tests[0].line}`.slice(0, 200);
        const labels = ["--label", "bug", "--label", "priority:high", "--label", "effort:medium"];
        const url = gh(["issue", "create", "--title", title, ...labels, "--body", body]);
        const issue = Math.max(Number(/\/issues\/(\d+)/.exec(url)?.[1] ?? 0), 0);
        writeFileSync(path, JSON.stringify({ ...readJson(path), issue, pid: null }));
        return issue;
    } catch (e) {
        writeFileSync(path, JSON.stringify({ ...readJson(path), pid: null }));
        console.error(`ledger: could not file the issue for ${sig}: ${e.message.split("\n")[0]}; the next run retries`);
        return 0;
    }
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
            const body = `Verification's bisect names the culprit: ${culprit.sha} ${culprit.subject}`;
            gh(["issue", "comment", String(i.issue), "--body", body]);
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
    const excused = count(
        "SELECT COUNT(*) n FROM exoneration e JOIN invocation i ON i.id = e.inv WHERE i.started_at > ?",
        week,
    );
    const unattributed = count(
        "SELECT COUNT(*) n FROM invocation WHERE outcome = 'unattributed' AND started_at > ?",
        week,
    );
    const totals = `${count("SELECT COUNT(*) n FROM invocation")} invocations, ${count("SELECT COUNT(*) n FROM failure")} failures`;
    console.log(`ledger: ${totals}; this week ${excused} excused, ${unattributed} unattributed`);
    const failing = goldenFailures(db, chain);
    console.log(`failing on golden (${failing.length}):`);
    for (const f of failing) {
        const issue = f.issue ? "#" + f.issue : "none";
        console.log(`  ${f.family}  ${f.file} > ${f.name}  issue ${issue}  at ${f.commit.slice(0, 10)}: ${f.line}`);
    }
    const recent = new Date(Date.now() - 30 * DAY).toISOString();
    const tests = db
        .prepare(
            "SELECT DISTINCT t.file, t.name, i.family FROM failure f JOIN test t ON t.id = f.test JOIN invocation i ON i.id = f.inv WHERE i.started_at > ?",
        )
        .all(recent);
    for (const t of tests) {
        const c = classify(db, t.file, t.name, t.family, chain);
        const label = (c.broken && "BROKEN") || (c.flaky && "flaky");
        if (label)
            console.log(
                `${label}: ${t.family}  ${t.file} > ${t.name}  (${c.fails} of ${c.verdicts} failed, ${c.proofs} proofs)`,
            );
    }
    return 0;
}

function why(l, cwd, target) {
    const [file, name = ""] = target.split(" > ");
    const rows = l.db
        .prepare(
            `SELECT i.started_at, i.kind, i.branch, i.variant, i.commit_sha, i.outcome, fr.passed, fr.failed, fr.skipped, f.line, f.key, e.reason, e.evidence
             FROM file_run fr JOIN test tf ON tf.id = fr.test AND tf.file = ? AND tf.name = '' JOIN invocation i ON i.id = fr.inv
             LEFT JOIN test tt ON tt.file = tf.file AND tt.name = ? LEFT JOIN failure f ON f.inv = i.id AND (f.test = tt.id OR ? = '')
             LEFT JOIN exoneration e ON e.inv = i.id AND e.test = f.test ORDER BY i.started_at DESC LIMIT 50`,
        )
        .all(file, name, name);
    for (const r of rows) {
        console.log(
            Object.values(r)
                .map((v) => (v === null ? "-" : String(v).slice(0, 80)))
                .join("  "),
        );
    }
    if (name)
        for (const v of new Set(rows.map((r) => familyOf(r.variant.replace("+files", "")))))
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
