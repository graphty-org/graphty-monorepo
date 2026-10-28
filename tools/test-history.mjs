#!/usr/bin/env node
// History ranking of selected test files (design/ci/history-selection.md). It never adds a test the import
// selector (tools/test-select.mjs) did not pick and never drops one: it orders the picked files by how likely the
// test ledger says they are to fail, for `pnpm run test:changed --dry-run` and `--budget <s>`. No gate runs it.
// A ledger that is missing, locked or broken ranks by the cold-start order and says why; nothing waits on it.
//
//   node tools/test-history.mjs replay [--since <date>] [--misses <file.json>]
//       replays the ledger offline: what history would have added, what a drop rule would have saved and missed

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ledgerDir, openLedger } from "./test-ledger.mjs";

const DAY = 86_400_000;
/** Seconds counted for a file with no recorded run. */
export const UNMEASURED_MS = 30_000;
// Golden-side evidence: verification (local or CI), its bisect points, cuts, a land check's re-run on golden's tip.
const GOLDEN_KINDS = ["verify", "bisect", "cut", "base", "import-verify", "import-bisect", "import-cut"];
const GATE_KINDS = ["land-check", "push", "import-land-check", "import-push"];
const inList = (n) => `(${Array.from({ length: n }, () => "?").join(",")})`;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];

// ---------------------------------------------------------------- misses

/**
 * Writes a miss file after a bisect names a culprit (design 4.2): the culprit, the files it changed, and each test
 * file that failed with whether the culprit's own land check ran it (`ran` false is a miss of the selection).
 * @param dir the ledger directory
 * @param miss `{ culprit, branch, changed, tests: [{ file, ran }] }`
 * @returns the path written
 */
export function writeMiss(dir, miss) {
    const d = join(dir, "misses");
    mkdirSync(d, { recursive: true });
    const path = join(d, `${miss.culprit.slice(0, 12)}-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify({ ...miss, at: new Date().toISOString() }));
    return path;
}

/**
 * The miss a bisect's culprit leaves: each failing test file, with whether the culprit's own land check ran it.
 * @param env the environment
 * @param cwd a directory of the repository
 * @param o the miss
 * @param o.culprit the culprit's sha
 * @param o.branch its landed branch
 * @param o.changed the files it changed
 * @param o.files the test files that failed
 * @returns the path written, or null when the ledger is unavailable
 */
export function recordMiss(env, cwd, { culprit, branch, changed, files }) {
    const ledger = openLedger(env, cwd);
    if (!ledger.db) return null;
    try {
        const ran = ledger.db.prepare(`SELECT 1 FROM file_run r JOIN test t ON t.id = r.test JOIN invocation i
            ON i.id = r.inv WHERE t.file = ? AND i.branch = ? AND i.kind = 'land-check' LIMIT 1`);
        const tests = [...new Set(files)].map((file) => ({ file, ran: Boolean(ran.get(file, branch)) }));
        return writeMiss(ledger.dir, { culprit, branch, changed, tests });
    } finally {
        ledger.db.close();
    }
}

/**
 * Every miss file, oldest first.
 * @param dir the ledger directory
 * @returns misses
 */
export function readMisses(dir) {
    const d = join(dir, "misses");
    if (!existsSync(d)) return [];
    const all = readdirSync(d).flatMap((n) => {
        try {
            return [JSON.parse(readFileSync(join(d, n), "utf8"))];
        } catch {
            return [];
        }
    });
    return all.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// ---------------------------------------------------------------- scoring

function goldenFailures(db, files, from, before) {
    const sql = `SELECT t.file, COUNT(DISTINCT i.commit_sha) n FROM failure f JOIN test t ON t.id = f.test
        JOIN invocation i ON i.id = f.inv WHERE i.kind IN ${inList(GOLDEN_KINDS.length)} AND i.dirty = 0
        AND i.started_at >= ? AND i.started_at < ? AND t.file IN ${inList(files.length)} GROUP BY t.file`;
    const rows = db.prepare(sql).all(...GOLDEN_KINDS, from, before, ...files);
    return new Map(rows.map((r) => [r.file, r.n]));
}

function durations(db, files, before) {
    const sql = `SELECT t.file, r.ms FROM file_run r JOIN test t ON t.id = r.test JOIN invocation i ON i.id = r.inv
        WHERE r.ms > 0 AND i.started_at < ? AND t.file IN ${inList(files.length)} ORDER BY i.started_at DESC`;
    const last = new Map();
    for (const r of db.prepare(sql).all(before, ...files)) {
        const xs = last.get(r.file) ?? [];
        if (xs.length < 5) last.set(r.file, [...xs, r.ms]);
    }
    return new Map([...last].map(([f, xs]) => [f, median(xs)]));
}

/**
 * The score of each candidate test file for a change (design 4.1), with the reasons behind it:
 * 3 per culprit whose miss names the file and shares a changed file, 2 when the change edits the file, 1 when it
 * failed on golden in the last 7 days. Only rows before `at` count, so a replay sees what a run would have seen.
 * @param ledger openLedger() (`{ db, dir }`), or `{ why }` when it is unavailable
 * @param files candidate test files (repository paths)
 * @param changed the change's files
 * @param [at] ISO time the ranking is for (default now)
 * @returns `{ scores: Map<file, { score, ms, why: [] }>, why }`; `why` is set when history was unavailable
 */
export function score(ledger, files, changed, at = new Date().toISOString()) {
    const edits = new Set(changed);
    const scores = new Map(files.map((f) => [f, { score: 0, ms: UNMEASURED_MS, why: [] }]));
    const add = (f, n, why) => {
        const s = scores.get(f);
        s.score += n;
        s.why.push(why);
    };
    for (const f of files.filter((x) => edits.has(x))) add(f, 2, "edited by this change");
    if (!ledger.db || files.length === 0) return { scores, why: ledger.why ?? null };
    const t = Date.parse(at);
    for (const m of readMisses(ledger.dir).filter((x) => x.at <= at && t - Date.parse(x.at) < 90 * DAY)) {
        const shared = (m.changed ?? []).find((f) => edits.has(f));
        if (!shared) continue;
        for (const test of (m.tests ?? []).filter((x) => scores.has(x.file))) {
            add(
                test.file,
                3,
                `failed after landing ${m.branch ?? m.culprit.slice(0, 10)}, which also changed ${shared}`,
            );
        }
    }
    const since = new Date(t - 7 * DAY).toISOString();
    for (const [f, n] of goldenFailures(ledger.db, files, since, at)) add(f, 1, `failed on golden ${n}x in 7 days`);
    for (const [f, ms] of durations(ledger.db, files, at)) scores.get(f).ms = ms;
    return { scores, why: null };
}

/**
 * score() from the results store's plan instead of the ledger (results-service.md 5.3): 2 when the change edits
 * the file, 1 when it failed in a full run, bisect or base check in the last 7 days (`order`), its median
 * duration from `fileMs`.
 * @param plan the plan: `{ order: [file], fileMs: { file: ms } }`
 * @param files candidate test files
 * @param changed the change's files
 * @returns `{ scores, why: null }`
 */
export function scoreFromPlan(plan, files, changed) {
    const edits = new Set(changed);
    const recent = new Set(plan.order ?? []);
    const scores = new Map();
    for (const f of files) {
        const why = [];
        if (edits.has(f)) why.push("edited by this change");
        if (recent.has(f)) why.push("failed on master in 7 days");
        const score = (edits.has(f) ? 2 : 0) + (recent.has(f) ? 1 : 0);
        scores.set(f, { score, ms: plan.fileMs?.[f] ?? UNMEASURED_MS, why });
    }
    return { scores, why: null };
}

/**
 * Files in rank order: score, then the shorter file (more fit in a budget), then the name.
 * @param scores score().scores
 * @returns `[{ file, score, ms, why }]`
 */
export const rank = (scores) =>
    [...scores]
        .map(([file, s]) => ({ file, ...s }))
        .sort((a, b) => b.score - a.score || a.ms - b.ms || a.file.localeCompare(b.file));

/**
 * The ranked files that fit in `secs` of recorded time; the first one always.
 * @param ranked rank()
 * @param secs the budget
 * @returns `{ taken, left }`
 */
export function budget(ranked, secs) {
    let used = 0;
    const taken = [];
    for (const r of ranked) {
        if (taken.length > 0 && used + r.ms > secs * 1000) break;
        taken.push(r);
        used += r.ms;
    }
    return { taken, left: ranked.slice(taken.length) };
}

/**
 * Ranks candidate files with the ledger of `cwd`'s repository, closing it after.
 * @param files candidate test files
 * @param changed the change's files
 * @param [env] the environment
 * @param [cwd] a directory of the repository
 * @param [plan] the results store's plan (readPlan()); when given it ranks instead of the ledger
 * @returns `{ ranked, why }`
 */
export function rankFiles(files, changed, env = process.env, cwd = process.cwd(), plan = null) {
    if (plan && env.TEST_HISTORY !== "0") {
        const { scores, why } = scoreFromPlan(plan, files, changed);
        return { ranked: rank(scores), why };
    }
    const ledger = env.TEST_HISTORY === "0" ? { why: "TEST_HISTORY=0" } : openLedger(env, cwd);
    try {
        const { scores, why } = score(ledger, files, changed);
        return { ranked: rank(scores), why };
    } finally {
        ledger.db?.close();
    }
}

/**
 * One line per ranked file: `<file> score 3 (why; why)`.
 * @param r a rank() entry
 * @returns the line
 */
export const explain = (r) => {
    const why = r.why.length ? " (" + r.why.join("; ") + ")" : "";
    return `${r.file}  score ${r.score}, ${Math.round(r.ms / 1000)} s${why}`;
};

// ---------------------------------------------------------------- replay

const NOISE =
    /^(pnpm-lock\.yaml|package\.json|\.github\/|nx\.json|CLAUDE\.md|design\/|reports\/|tmp\/|visual-baselines\/)/;

function changeOf(root, sha, cache) {
    if (cache.has(sha)) return cache.get(sha);
    const git = (...a) => {
        try {
            return execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        } catch {
            return null;
        }
    };
    const mb = git("merge-base", "origin/golden", sha);
    const from = mb && mb !== sha ? mb : `${sha}^1`;
    const d = git("diff", "--name-only", from, sha);
    const out = d === null ? null : d.split("\n").filter((f) => f && !NOISE.test(f));
    cache.set(sha, out);
    return out;
}

// Per file, every recorded run `{ t, golden, failed, ms, inv }`, oldest first.
function fileRuns(db, since) {
    const sql = `SELECT t.file, i.id inv, i.kind, i.started_at at, r.ms, r.failed FROM file_run r
        JOIN test t ON t.id = r.test JOIN invocation i ON i.id = r.inv WHERE i.started_at >= ? ORDER BY i.started_at`;
    const runs = new Map();
    for (const r of db.prepare(sql).all(since)) {
        const xs = runs.get(r.file) ?? [];
        xs.push({
            t: Date.parse(r.at),
            golden: GOLDEN_KINDS.includes(r.kind),
            failed: r.failed > 0,
            ms: r.ms,
            inv: r.inv,
        });
        runs.set(r.file, xs);
    }
    return runs;
}

// The drop rule simulated (design 5): 20 or more passing golden runs in 30 days, no failure anywhere in 90 days,
// and not edited by the change.
function wouldDrop(prior, t, edited) {
    if (edited) return false;
    const passes = prior.filter((p) => p.golden && !p.failed && t - p.t < 30 * DAY).length;
    return passes >= 20 && !prior.some((p) => p.failed && t - p.t < 90 * DAY);
}

// One gate run's file runs under the drop rule, counted into `out`; returns the files it ran.
function replayDrops(runs, gate, out) {
    const ran = new Set();
    for (const [file, xs] of runs) {
        const mine = xs.find((x) => x.inv === gate.id);
        if (!mine) continue;
        ran.add(file);
        out.ranMs += mine.ms;
        if (
            !wouldDrop(
                xs.filter((x) => x.t < gate.t),
                gate.t,
                gate.changed.has(file),
            )
        )
            continue;
        out.dropRuns++;
        out.dropMs += mine.ms;
        if (mine.failed) out.wouldMiss.push({ file, at: gate.at });
    }
    return ran;
}

// The files history adds would have added to one gate run (a golden failure in 7 days, in a touched package).
function replayAdds(runs, goldenFailed, gate, ran, out) {
    const pkgs = new Set([...gate.changed].map((f) => f.split("/")[0]));
    for (const [file, ts] of goldenFailed) {
        if (ran.has(file) || !pkgs.has(file.split("/")[0])) continue;
        if (!ts.some((x) => x < gate.t && gate.t - x < 7 * DAY)) continue;
        out.addFiles++;
        out.addMs +=
            median(
                runs
                    .get(file)
                    .map((x) => x.ms)
                    .filter(Boolean),
            ) || UNMEASURED_MS;
    }
}

/**
 * The offline replay (design 5): over every gate run in the ledger with files, the history adds (files with a
 * golden failure in 7 days that the run did not run) and their minutes, and the drop rule's would-drops, minutes
 * saved and would-misses; and of the import selector's recorded misses, how many history scores above 0.
 * @param ledger openLedger()
 * @param root a checkout, for the changes
 * @param o options
 * @param [o.since] ISO date the replay starts at
 * @param [o.misses] the import selector's misses, `[{ file, at }]`
 * @returns the numbers
 */
export function replay(ledger, root, { since = "", misses = [] } = {}) {
    const { db } = ledger;
    const runs = fileRuns(db, since);
    const gates = db
        .prepare(
            `SELECT DISTINCT i.id, i.commit_sha sha, i.started_at at FROM invocation i JOIN file_run r ON r.inv = i.id
             WHERE i.kind IN ${inList(GATE_KINDS.length)} AND i.started_at >= ? AND i.commit_sha IS NOT NULL`,
        )
        .all(...GATE_KINDS, since);
    const cache = new Map();
    const out = { gateRuns: gates.length, addFiles: 0, addMs: 0, dropRuns: 0, dropMs: 0, wouldMiss: [], ranMs: 0 };
    const goldenFailed = new Map(
        [...runs].map(([f, xs]) => [f, xs.filter((x) => x.golden && x.failed).map((x) => x.t)]),
    );
    for (const g of gates) {
        const gate = { ...g, t: Date.parse(g.at), changed: new Set(changeOf(root, g.sha, cache) ?? []) };
        const ran = replayDrops(runs, gate, out);
        replayAdds(runs, goldenFailed, gate, ran, out);
    }
    out.missesCaught = misses.filter((m) => score(ledger, [m.file], [], m.at).scores.get(m.file).score > 0);
    out.misses = misses.length;
    return out;
}

async function cli(argv) {
    const [cmd, ...rest] = argv;
    const arg = (name) => {
        const at = rest.indexOf(name);
        return at === -1 ? undefined : rest[at + 1];
    };
    if (cmd !== "replay") {
        console.error("usage: node tools/test-history.mjs replay [--since <date>] [--misses <file.json>]");
        return 2;
    }
    const ledger = openLedger();
    if (!ledger.db) {
        console.error(`history: unavailable (${ledger.why})`);
        return 1;
    }
    const misses = arg("--misses") ? JSON.parse(readFileSync(arg("--misses"), "utf8")) : [];
    const root = dirname(ledgerDir()).replace(/\/tmp$/, "");
    const r = replay(ledger, root, { since: arg("--since") ?? "", misses });
    const min = (ms) => Math.round(ms / 60_000);
    console.log(`gate runs with recorded files: ${r.gateRuns}, ${min(r.ranMs)} min of test files run`);
    console.log(
        `history adds (golden failure in 7 days, same package, not run): ${r.addFiles} file runs, ${min(r.addMs)} min`,
    );
    console.log(
        `drop rule: ${r.dropRuns} file runs dropped, ${min(r.dropMs)} min saved, ${r.wouldMiss.length} would-miss`,
    );
    for (const m of r.wouldMiss) console.log(`  would-miss ${m.file} at ${m.at}`);
    console.log(`import selector misses history scores above 0: ${r.missesCaught.length} of ${r.misses}`);
    for (const m of r.missesCaught) console.log(`  caught ${m.file} at ${m.at}`);
    ledger.db.close();
    return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await cli(process.argv.slice(2));
}
