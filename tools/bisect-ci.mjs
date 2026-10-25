// The driver of bisect.yml, the CI bisect of a red full run (design/ci/channels-pipeline/channels.md section 6).
// The rules are tools/bisect-core.mjs's; this file keeps the bisect's state between rounds and runs a round's
// tests. A round is one bisect.yml run: it tests the points `state.next` names (a matrix job per point, or one
// call of a lane workflow), `judge` folds their results into the state, and when the answer is still open the
// workflow dispatches itself with the new state.
//
//   node tools/bisect-ci.mjs plan  --out <state.json>           the first round's state from LANE, GOOD, BAD,
//                                                                TARGETS, FAILED_BEFORE; or STATE (a later round)
//   node tools/bisect-ci.mjs run   --state <f> --sha <s> --out <f>   runs the targets `next.runs` times here
//   node tools/bisect-ci.mjs judge --state <f> --results <dir> --out <f>   folds the results in, says what is next
//
// Each writes `points`, `runs`, `files` and `done` to GITHUB_OUTPUT when it is set. BISECT_ROOT names the checkout
// under test when it is not this file's (a point runs master's copy of this tool against the point's own tree).

import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { badTargets, bisectStep, classify, CONFIRM_RUNS, parentFails, short, targetsOf } from "./bisect-core.mjs";

const ROOT = process.env.BISECT_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");

/** Rounds one bisect may take: a point that never reports (its job lost before it wrote a result) is not retried forever. */
export const MAX_ROUNDS = 12;

/** What graphty-element's AI code is: an LLM bisect tests only merges that touched it (section 5). */
export const AI_PATHS = ["graphty-element/src/ai", "graphty-element/test/ai", "pnpm-lock.yaml"];

/** The paid T4 hours one bisect may spend, and the most one gpu.yml call can take (its job timeout). */
export const T4_CAP_MINUTES = 240;
export const T4_POINT_MINUTES = 80;

/**
 * Per lane: points per round (the matrix's max-parallel, or 1 for a lane workflow, whose points run one after
 * another), confirming runs on the red commit (0: the lane's red is taken as one consistent run), runs per point,
 * runs of a culprit's parent for a newly intermittent test, and whether an intermittent failure is bisected.
 */
export const LANES = {
    ci: { width: 8, confirm: CONFIRM_RUNS, runs: CONFIRM_RUNS, rateParent: 20, intermittent: true },
    llm: { width: 8, confirm: 2, runs: 1, rateParent: 1, intermittent: false, paths: AI_PATHS },
    gpu: { width: 1, confirm: 0, runs: 1, rateParent: 1, intermittent: false },
    hosts: { width: 1, confirm: 0, runs: 1, rateParent: 1, intermittent: false },
    macos: { width: 1, confirm: 0, runs: 1, rateParent: 1, intermittent: false },
};

/**
 * The git facts a first round needs, from a checkout.
 * @param [cwd] the checkout
 * @returns `{ firstParents(good, bad), parent(sha), touches(sha, paths) }`
 */
export const realGit = (cwd = ROOT) => {
    const out = (args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    return {
        firstParents: (good, bad) => out(["rev-list", "--first-parent", "--reverse", `${good}..${bad}`]).split("\n"),
        parent: (sha) => out(["rev-parse", `${sha}^1`]),
        touches: (sha, paths) => out(["diff", "--name-only", `${sha}^1`, sha, "--", ...paths]) !== "",
    };
};

/**
 * The first round's state: the range's first-parent merges and the confirming run on the red commit.
 * @param a `{ lane, good, bad, targets: [{ shard, file, name }], failedBefore: [target ids] }`
 * @param git realGit() or a stand-in
 * @returns the state
 */
export function start(a, git) {
    const lane = LANES[a.lane];
    if (!lane) throw new Error(`unknown lane ${a.lane}`);
    let candidates = git.firstParents(a.good, a.bad);
    if (lane.paths) candidates = candidates.filter((c) => c === a.bad || git.touches(c, lane.paths));
    const parents = Object.fromEntries(candidates.map((c) => [c, git.parent(c)]));
    const targets = targetsOf({ tests: a.targets ?? [] });
    const s = { ...a, targets, failedBefore: a.failedBefore ?? [], candidates, parents, results: {}, t4Minutes: 0 };
    if (a.lane === "gpu" && !a.afterLocalCard)
        return finish(s, {
            status: "local",
            culprit: null,
            noLanding: "gpu: local -- bisect it on the local NVIDIA card first",
        });
    if (lane.confirm) return { ...s, next: { points: [a.bad], runs: lane.confirm, confirm: true } };
    s.followed = targets;
    s.results[a.bad] = { runs: 1, failed: Object.fromEntries(targets.map((t) => [t.id, 1])) };
    return decide(s);
}

// Adds a point's runs to what the state already holds for that commit (a parent can be run again, for more runs).
function addResult(s, r) {
    if ("status" in r && !["success", "failure"].includes(r.status)) return; // cancelled or lost: no run, test it again
    const ids = (s.followed ?? s.targets).map((t) => t.id);
    const got =
        "status" in r
            ? { runs: 1, failed: r.status === "success" ? {} : Object.fromEntries(ids.map((i) => [i, 1])) }
            : r;
    const old = s.results[r.sha] ?? { runs: 0, failed: {} };
    for (const [id, n] of Object.entries(got.failed)) old.failed[id] = (old.failed[id] ?? 0) + n;
    old.runs += got.runs;
    s.results[r.sha] = old;
    if (s.lane === "gpu") s.t4Minutes += r.minutes ?? T4_POINT_MINUTES;
}

const finish = (s, answer) => {
    const done = { ...s, answer: { status: "failed", ...answer, flaky: (s.flaky ?? []).map((t) => t.id) } };
    delete done.next;
    return done;
};

// The confirming run sorted the targets: the consistent ones and the newly intermittent ones are bisected.
function afterConfirm(s) {
    const lane = LANES[s.lane];
    const newOf = (ts) => (lane.intermittent ? ts.filter((t) => !s.failedBefore.includes(t.id)) : []);
    const c = classify(s.targets, s.results[s.bad], newOf);
    s.flaky = c.flaky;
    s.followed = s.targets
        .filter((t) => c.consistent.includes(t.id) || c.regressed.includes(t.id))
        .map((t) => (c.regressed.includes(t.id) ? { ...t, rate: true } : t));
    if (s.followed.length) return decide(s);
    return finish(s, { status: c.flaky.length === s.targets.length ? "flaky" : "failed", culprit: null });
}

// The first bad merge is the culprit when its parent is the last green commit or passes every run it needs.
function blame(s, sha) {
    const parent = s.parents[sha];
    if (parent === s.good) return finish(s, { culprit: sha });
    const lane = LANES[s.lane];
    const need = s.followed.some((t) => t.rate) ? lane.rateParent : lane.runs;
    const have = s.results[parent]?.runs ?? 0;
    if (have < need) return { ...s, next: { points: [parent], runs: need - have } };
    const why = parentFails(sha, parent, s.results[parent]);
    return finish(s, why ? { culprit: null, noLanding: why } : { culprit: sha });
}

/**
 * What the bisect does next from the results so far: an answer, or the next round's points.
 * @param s the state
 * @returns the state, with `answer` or `next`
 */
export function decide(s) {
    const lane = LANES[s.lane];
    const points = {};
    for (const c of s.candidates) {
        const r = s.results[c];
        if (r) points[c] = badTargets(r, s.followed).length ? "bad" : "good";
    }
    const step = bisectStep({ candidates: s.candidates, points }, lane.width);
    if (step.noLanding) return finish(s, { culprit: null, noLanding: step.noLanding });
    if (step.blame) return blame(s, step.blame);
    if (s.lane === "gpu" && s.t4Minutes + T4_POINT_MINUTES > T4_CAP_MINUTES)
        return finish(s, {
            culprit: null,
            noLanding: `stopped at the T4 cap: ${s.t4Minutes} of ${T4_CAP_MINUTES} paid minutes spent`,
        });
    return { ...s, next: { points: step.points.map((i) => s.candidates[i]), runs: lane.runs } };
}

/**
 * Folds a round's results into the state.
 * @param s the state
 * @param results `[{ sha, runs, failed }]` from `run`, or `[{ sha, status, minutes }]` from a lane workflow
 * @returns the state, with `answer` or `next`
 */
export function judge(s, results) {
    const confirm = s.next?.confirm;
    s = structuredClone(s);
    for (const r of results) addResult(s, r);
    s.round = (s.round ?? 1) + 1;
    if (s.round > MAX_ROUNDS) return finish(s, { culprit: null, noLanding: `no answer after ${MAX_ROUNDS} rounds` });
    return confirm ? afterConfirm(s) : decide(s);
}

/**
 * The command that runs some targets of one shard: its failing files, or the whole shard when none is named.
 * @param shard the shard's name
 * @param files its failing files
 * @returns arguments for tools/run-tests.sh
 */
export async function runArgs(shard, files) {
    if (shard === "llm-regression")
        return [
            "--command",
            "graphty-element-default",
            `cd graphty-element && pnpm exec vitest run --project llm-regression ${files.join(" ")}`.trimEnd(),
        ];
    const { SHARDS } = await import(pathToFileURL(join(ROOT, "tools/ci-test-matrix.mjs")).href);
    const { selectedCommand } = await import(pathToFileURL(join(ROOT, "tools/test-select.mjs")).href);
    const entry = SHARDS.find((x) => x.shard === shard);
    if (!entry) throw new Error(`no shard named ${shard}`);
    const command = files.length ? selectedCommand(ROOT, entry, files) : null;
    return command ? ["--command", shard, command] : [shard];
}

// Runs the round's targets `runs` times on this checkout; a failed run of a shard fails each of its targets.
// ponytail: judged by the exit code, not per test; read the shard's JUnit when two targets share a shard.
async function runPoint(s, sha, runs, spawn = spawnSync) {
    const targets = s.next.confirm ? s.targets : s.followed;
    const byShard = Map.groupBy(targets, (t) => t.shard ?? "");
    const r = { sha, runs, failed: {} };
    for (let i = 0; i < runs; i++)
        for (const [shard, ts] of byShard) {
            const args = await runArgs(shard, [...new Set(ts.map((t) => t.file).filter(Boolean))]);
            const code = spawn(join(ROOT, "tools/run-tests.sh"), args, { cwd: ROOT, stdio: "inherit" }).status;
            if (code !== 0) for (const t of ts) r.failed[t.id] = (r.failed[t.id] ?? 0) + 1;
        }
    return r;
}

/**
 * The job summary's line: the answer, or the next round's points.
 * @param s the state
 * @returns one line
 */
export function summary(s) {
    const a = s.answer;
    if (!a)
        return `bisect ${short(s.good)}..${short(s.bad)} (${s.lane}): next round tests ${s.next.points.map(short).join(", ")}`;
    const head = a.culprit
        ? `culprit merge ${a.culprit}`
        : a.noLanding
          ? `no merge named: ${a.noLanding}`
          : `no bisect: ${a.status}`;
    return `bisect ${short(s.good)}..${short(s.bad)} (${s.lane}): ${head}${a.flaky.length ? `; flaky: ${a.flaky.join("; ")}` : ""}`;
}

function output(s, out) {
    writeFileSync(out, JSON.stringify(s));
    const lines = [
        `done=${s.answer ? "true" : "false"}`,
        `points=${JSON.stringify(s.next?.points ?? [])}`,
        `runs=${s.next?.runs ?? 0}`,
    ];
    lines.push(`files=${[...new Set((s.followed ?? s.targets).map((t) => t.file).filter(Boolean))].join(" ")}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary(s)}\n`);
    console.log(summary(s));
}

async function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    const { values: v } = parseArgs({
        args: rest,
        options: {
            state: { type: "string" },
            sha: { type: "string" },
            out: { type: "string" },
            results: { type: "string" },
        },
    });
    const env = process.env;
    const read = (f) => JSON.parse(readFileSync(f, "utf8"));
    if (cmd === "plan") {
        const s = env.STATE
            ? JSON.parse(env.STATE)
            : start(
                  {
                      lane: env.LANE,
                      good: env.GOOD,
                      bad: env.BAD,
                      targets: JSON.parse(env.TARGETS || "[]"),
                      failedBefore: JSON.parse(env.FAILED_BEFORE || "[]"),
                      afterLocalCard: env.AFTER_LOCAL_CARD === "true",
                  },
                  realGit(),
              );
        return output(s, v.out);
    }
    if (cmd === "run") {
        const s = read(v.state);
        const r = await runPoint(s, v.sha, s.next.runs);
        return writeFileSync(v.out, JSON.stringify(r));
    }
    if (cmd === "judge") {
        const files = readdirSync(v.results, { recursive: true }).filter((f) => f.endsWith(".json"));
        return output(
            judge(
                read(v.state),
                files.map((f) => read(join(v.results, f))),
            ),
            v.out,
        );
    }
    console.error("usage: node tools/bisect-ci.mjs plan|run|judge (see the head of the file)");
    process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
