// History ranking of selected test files (design/ci/history-selection.md). It never adds a test the import
// selector (tools/test-select.mjs) did not pick and never drops one: it orders the picked files by how likely the
// results store's plan, or else the test ledger, says they are to fail, for `pnpm run test:changed --dry-run` and
// `--budget <s>`. A ledger that is missing, locked or broken ranks by the cold-start order and says why; nothing
// waits on it.

import { openLedger } from "./test-ledger.mjs";

const DAY = 86_400_000;
/** Seconds counted for a file with no recorded run. */
export const UNMEASURED_MS = 30_000;
// The ledger's record kinds that ran the base branch's own commits (a branch's own runs never count).
const BASE_KINDS = ["verify", "bisect", "cut", "base", "import-verify", "import-bisect", "import-cut"];
const inList = (n) => `(${Array.from({ length: n }, () => "?").join(",")})`;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];

// ---------------------------------------------------------------- scoring

function baseFailures(db, files, from, before) {
    const sql = `SELECT t.file, COUNT(DISTINCT i.commit_sha) n FROM failure f JOIN test t ON t.id = f.test
        JOIN invocation i ON i.id = f.inv WHERE i.kind IN ${inList(BASE_KINDS.length)} AND i.dirty = 0
        AND i.started_at >= ? AND i.started_at < ? AND t.file IN ${inList(files.length)} GROUP BY t.file`;
    const rows = db.prepare(sql).all(...BASE_KINDS, from, before, ...files);
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
 * The score of each candidate test file for a change (design 4.1), with the reasons behind it: 2 when the change
 * edits the file, 1 when it failed on the base branch in the last 7 days. Only rows before `at` count.
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
    const since = new Date(Date.parse(at) - 7 * DAY).toISOString();
    for (const [f, n] of baseFailures(ledger.db, files, since, at))
        add(f, 1, `failed on the base branch ${n}x in 7 days`);
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
