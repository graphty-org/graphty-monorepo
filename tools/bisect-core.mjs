// The bisect's rules, moved out of tools/verify.mjs so a CI bisect (bisect.yml, design/ci/channels-pipeline/channels.md
// section 6) and verification judge a failure the same way. No git, no files, no processes: every function takes
// the facts and returns the answer.
//
// A failure is first confirmed on the failing commit: its targets run up to CONFIRM_RUNS times. A target that fails
// every run is consistent and is bisected. One that passed in any run is intermittent: with no failure before the
// range it is newly intermittent (a merge made it so) and is bisected by the rate rule, a point being bad when it
// fails at least once; with one before the range it was flaky already and is never bisected. The bisect runs over
// the range's first-parent merges, `width` points at once; the culprit is the first bad merge whose parent passes
// every run (or is the last good commit). Otherwise no merge is named, and the answer says why.
//
//   node tools/bisect-core.mjs replay <recording.json>   prints the answer for each recording in the file

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** How many times a confirming run or a bisect point runs a failure's test files: failing every time is consistent. */
export const CONFIRM_RUNS = 5;

export const short = (sha) => (sha ? sha.slice(0, 10) : "-");

/**
 * A failure's targets, as each check names them: one per failing test (the ledger's), else one per failing shard
 * (run whole), else the whole gate (another step failed).
 * @param last the failure
 * @returns `[{ id, shard, file, name, ... }]`
 */
export function targetsOf(last) {
    if (last.tests?.length) return last.tests.map((t) => ({ ...t, id: `${t.shard}: ${t.file} > ${t.name}` }));
    if (last.failing) return last.failing.map((shard) => ({ id: `${shard}: the whole shard`, shard, file: null }));
    return [{ id: "the whole gate", shard: null, file: null }];
}

/**
 * The targets that failed in every run of a check.
 * @param r a check's result `{ runs, failed: { id: count } }`
 * @returns their ids
 */
export const failedEvery = (r) => Object.keys(r.failed).filter((id) => r.runs > 0 && r.failed[id] >= r.runs);

/**
 * The targets a check found bad: a consistent one that failed every run, a newly intermittent one (`rate`) that
 * failed at least once.
 * @param r a check's result
 * @param targets the targets checked
 * @returns their ids
 */
export const badTargets = (r, targets) =>
    targets.filter((t) => r.runs > 0 && (r.failed[t.id] ?? 0) >= (t.rate ? 1 : r.runs)).map((t) => t.id);

/**
 * Whether a check can stop before CONFIRM_RUNS: a newly intermittent target failed (the point is bad), or there is
 * none and no target still fails every run (none can be bad any more).
 * @param r the result so far
 * @param targets the targets
 * @returns boolean
 */
export function decided(r, targets) {
    const rate = targets.filter((t) => t.rate);
    return rate.length ? badTargets(r, rate).length > 0 : !failedEvery(r).length;
}

/**
 * Sorts a confirming run's targets.
 * @param targets targetsOf() the failure
 * @param r the confirming result
 * @param newOf `(intermittent targets) => those with no failure before the range` (the test ledger's history)
 * @param [ciOnly] targets that failed in CI and in no run here (they are neither consistent nor intermittent)
 * @returns `{ consistent, intermittent, regressed, flaky }`: ids, except `intermittent` and `flaky`, which are targets
 */
export function classify(targets, r, newOf, ciOnly = []) {
    const consistent = failedEvery(r);
    const intermittent = targets.filter((t) => !consistent.includes(t.id) && !ciOnly.includes(t));
    const regressed = newOf(intermittent).map((t) => t.id);
    return { consistent, intermittent, regressed, flaky: intermittent.filter((t) => !regressed.includes(t.id)) };
}

/**
 * The bisect's bounds from the points tested: `bad`, the first candidate that failed (null until one
 * did), and `good`, the last candidate before it that passed (-1: the last verified commit).
 * @param b the bisect record (`candidates`, `points`: sha -> "good" | "bad")
 * @returns `{ good, bad }`, indices into the candidates
 */
export function bounds(b) {
    const bad = b.candidates.findIndex((c) => b.points[c] === "bad");
    const upTo = bad === -1 ? b.candidates.length : bad;
    let good = -1;
    for (let i = 0; i < upTo; i++) if (b.points[b.candidates[i]] === "good") good = i;
    return { good, bad: bad === -1 ? null : bad };
}

/**
 * The next points to test, at most `width`: the target first, until it has been re-run, then points
 * spread evenly between the bounds.
 * @param b the bisect record
 * @param width how many at once
 * @returns candidate indices
 */
export function nextPoints(b, width) {
    const last = b.candidates.length - 1;
    const { good, bad } = bounds(b);
    const hi = bad ?? last;
    const picks = b.points[b.candidates[last]] ? [] : [last];
    const room = width - picks.length;
    for (let k = 1; k <= room; k++) {
        const i = good + Math.round((k * (hi - good)) / (room + 1));
        if (i > good && i < hi && !b.points[b.candidates[i]] && !picks.includes(i)) picks.push(i);
    }
    return picks;
}

/**
 * What the bisect does next.
 * @param b the bisect record
 * @param width how many points at once
 * @returns `{ noLanding: why }` (no merge can be named), `{ blame: sha }` (judge its parent), or `{ points }`
 */
export function bisectStep(b, width) {
    if (!b.candidates.length) return { noLanding: "no landing since the last verified commit" };
    const newest = b.candidates.at(-1);
    if (b.points[newest] === "good")
        return {
            noLanding: `the newest landing ${short(newest)} passes: a later commit that is not a landing brought it`,
        };
    const { good, bad } = bounds(b);
    if (bad !== null && bad - good === 1) return { blame: b.candidates[bad] };
    return { points: nextPoints(b, width) };
}

/**
 * Why the first bad merge is not the culprit: its parent, which is not a merge of the range, fails too.
 * @param sha the first bad merge
 * @param parent its first parent
 * @param r the parent's result, all CONFIRM_RUNS
 * @returns the reason, or null when the parent passed every run (the merge is the culprit)
 */
export function parentFails(sha, parent, r) {
    const worst = Math.max(0, ...Object.values(r.failed));
    if (!worst) return null;
    return `the first bad landing is ${short(sha)}, but its parent ${short(parent)}, not a landing, fails it too (in ${worst} of ${r.runs} runs)`;
}

// ---------------------------------------------------------------- replay

/**
 * Replays a recorded verification: every check reads its runs from the recording, one counted run each, in the
 * order they ran, and stops as the real check does (once decided, unless it must run them all).
 * @param rec `{ from, target, ci (a CI failure: the confirming run runs all CONFIRM_RUNS), width, candidates, parents: { sha: first parent }, tests, failedBefore: [ids],
 *   runs: { sha: [[failed ids] per run] } }`
 * @returns `{ answer: { status, culprit, noLanding?, flaky }, left: { sha: runs not read } }`
 */
export function replay(rec) {
    const queues = Object.fromEntries(Object.entries(rec.runs).map(([sha, list]) => [sha, [...list]]));
    const check = (sha, targets, full) => {
        const r = { runs: 0, failed: {} };
        while (r.runs < CONFIRM_RUNS) {
            const run = queues[sha]?.shift();
            if (!run) throw new Error(`the recording has no run ${r.runs + 1} of ${short(sha)}`);
            for (const id of run) if (targets.some((t) => t.id === id)) r.failed[id] = (r.failed[id] ?? 0) + 1;
            r.runs++;
            if (!full && decided(r, targets)) break;
        }
        return r;
    };
    const left = () =>
        Object.fromEntries(
            Object.entries(queues)
                .filter(([, q]) => q.length)
                .map(([s, q]) => [s, q.length]),
        );
    const targets = targetsOf({ tests: rec.tests });
    const newOf = (tests) => tests.filter((t) => !rec.failedBefore.includes(t.id));
    const c = classify(targets, check(rec.target, targets, Boolean(rec.ci)), newOf);
    const flaky = c.flaky.map((t) => t.id);
    const followed = targets
        .filter((t) => c.consistent.includes(t.id) || c.regressed.includes(t.id))
        .map((t) => (c.regressed.includes(t.id) ? { ...t, rate: true } : t));
    if (!followed.length) {
        const status = flaky.length === targets.length ? "flaky" : "failed";
        return { answer: { status, culprit: null, flaky }, left: left() };
    }
    const b = { candidates: rec.candidates, points: {} };
    for (;;) {
        const step = bisectStep(b, rec.width);
        if (step.noLanding)
            return { answer: { status: "failed", culprit: null, noLanding: step.noLanding, flaky }, left: left() };
        if (step.blame) {
            const parent = rec.parents[step.blame];
            const why = parent === rec.from ? null : parentFails(step.blame, parent, check(parent, followed, true));
            const answer = why
                ? { status: "failed", culprit: null, noLanding: why, flaky }
                : { status: "failed", culprit: step.blame, flaky };
            return { answer, left: left() };
        }
        for (const i of step.points)
            b.points[b.candidates[i]] = badTargets(check(b.candidates[i], followed, false), followed).length
                ? "bad"
                : "good";
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const [cmd, file] = process.argv.slice(2);
    if (cmd !== "replay" || !file) {
        console.error("usage: node tools/bisect-core.mjs replay <recording.json>");
        process.exit(2);
    }
    for (const rec of JSON.parse(readFileSync(file, "utf8")).recordings) console.log(JSON.stringify(replay(rec)));
}
