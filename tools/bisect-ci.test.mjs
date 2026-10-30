// Tests of tools/bisect-ci.mjs, the driver of bisect.yml: a real scratch range of merges with one broken merge is
// bisected round by round, as bisect.yml's rounds would, to its culprit; and the lane rules (flaky before the range,
// a newly intermittent test's parent, the LLM path filter, the T4 cap).
//
//   node tools/bisect-ci.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { parse as parseYaml } from "yaml";

import {
    judge,
    laneFiles,
    LANES,
    offMaster,
    realGit,
    runArgs,
    runPoint,
    setupFailed,
    start,
    T4_CAP_MINUTES,
    unsafeTargets,
} from "./bisect-ci.mjs";
import { budgetFor, hangMinutes, loadBudgets } from "./ci-budgets.mjs";
import { isolateGit } from "./isolated-git-env.mjs";

isolateGit();

const TEST = { shard: "layout", file: "layout/test/a.test.ts", name: "works" };
const ID = "layout: layout/test/a.test.ts > works";

// A repository whose first-parent history is `count` merges of feature branches; merge `broken` (1-based) adds
// the file that makes the test fail, and every merge after it keeps it.
function scratchRange(count, broken) {
    const dir = mkdtempSync(join(tmpdir(), "bisect-ci-"));
    const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "main");
    writeFileSync(join(dir, "base"), "0");
    git("add", ".");
    git("commit", "-q", "-m", "base");
    const good = git("rev-parse", "HEAD");
    const merges = [];
    for (let i = 1; i <= count; i++) {
        git("checkout", "-q", "-b", `f${i}`);
        writeFileSync(join(dir, i === broken ? "broken" : `f${i}`), String(i));
        git("add", ".");
        git("commit", "-q", "-m", `f${i}`);
        git("checkout", "-q", "main");
        git("merge", "-q", "--no-ff", "-m", `merge f${i}`, `f${i}`);
        merges.push(git("rev-parse", "HEAD"));
    }
    const broke = (sha) => git("ls-tree", "--name-only", sha).split("\n").includes("broken");
    return { dir, good, merges, broke };
}

// Runs rounds until an answer, each point's runs judged by `fails(sha, run)`, as bisect.yml's point jobs would.
function bisect(s, fails, maxRounds = 20) {
    const rounds = [];
    while (!s.answer) {
        assert.ok(rounds.length < maxRounds, "the bisect ends");
        assert.ok(s.next.points.length <= LANES[s.lane].width, "no round runs more points than the lane's width");
        rounds.push(s.next.points);
        const results = s.next.points.map((sha) => {
            const failed = { [ID]: 0 };
            for (let i = 0; i < s.next.runs; i++) if (fails(sha, i)) failed[ID]++;
            return { sha, runs: s.next.runs, failed };
        });
        s = judge(s, results);
    }
    return { answer: s.answer, rounds };
}

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("a broken scratch range", () => {
    for (const [count, broken] of [
        [12, 7],
        [20, 1],
        [5, 5],
        [30, 22],
    ])
        it(`names merge ${broken} of ${count} as the culprit`, () => {
            const r = scratchRange(count, broken);
            dirs.push(r.dir);
            const s = start({ lane: "ci", good: r.good, bad: r.merges.at(-1), targets: [TEST] }, realGit(r.dir));
            assert.equal(s.candidates.length, count, "every first-parent merge, and no feature commit, is a candidate");
            const { answer } = bisect(s, (sha) => r.broke(sha));
            assert.deepEqual(answer, { status: "failed", culprit: r.merges[broken - 1], flaky: [] });
        });
});

// The bisect over fake history: n merges m1..mn after g, each the first parent of the next.
const fakeGit = (n, touchesAi = () => false) => ({
    firstParents: () => Array.from({ length: n }, (_, i) => `m${i + 1}`),
    parent: (sha) => (sha === "m1" ? "g" : `m${Number(sha.slice(1)) - 1}`),
    touches: (sha) => touchesAi(sha),
});

describe("the lane rules", () => {
    it("never bisects a test that was flaky before the range", () => {
        const s = start({ lane: "ci", good: "g", bad: "m6", targets: [TEST], failedBefore: [ID] }, fakeGit(6));
        const { answer, rounds } = bisect(s, (sha, run) => run % 2 === 0);
        assert.deepEqual(rounds, [["m6"]], "only the confirming run");
        assert.deepEqual(answer, { status: "flaky", culprit: null, flaky: [ID] });
    });

    it("runs a newly intermittent test's culprit parent 20 times before it names the merge", () => {
        const s = start({ lane: "ci", good: "g", bad: "m6", targets: [TEST] }, fakeGit(6));
        let parentRuns = 0;
        const { answer } = bisect(s, (sha, run) => {
            if (sha === "m3") parentRuns++;
            return Number(sha.slice(1)) >= 4 && run === 0;
        });
        assert.equal(answer.culprit, "m4");
        assert.ok(parentRuns >= 20, `the parent ran ${parentRuns} times`);
    });

    it("names no merge when the first bad merge's parent fails too", () => {
        const s = start({ lane: "ci", good: "g", bad: "m3", targets: [TEST] }, fakeGit(3));
        const { answer } = bisect(s, (sha, run) => sha !== "m1" || run === 0);
        assert.equal(answer.culprit, null);
        assert.match(answer.noLanding, /its parent m1, not a landing, fails it too \(in 1 of 5 runs\)/);
    });

    it("bisects an LLM failure only over merges that touched the AI code, one paid run a point", () => {
        const ai = (sha) => ["m2", "m5"].includes(sha);
        const s = start({ lane: "llm", good: "g", bad: "m8", targets: [TEST] }, fakeGit(8, ai));
        assert.deepEqual(s.candidates, ["m2", "m5", "m8"]);
        assert.deepEqual(s.next, { points: ["m8"], runs: 2, confirm: true }, "at most 2 confirming runs");
        const { answer } = bisect(s, (sha) => sha !== "m2" && sha !== "m4");
        assert.equal(answer.culprit, "m5");
    });

    it("never bisects an LLM answer that differs between its two confirming runs", () => {
        const s = start(
            { lane: "llm", good: "g", bad: "m4", targets: [TEST] },
            fakeGit(4, () => true),
        );
        const { answer } = bisect(s, (sha, run) => run === 0);
        assert.equal(answer.status, "flaky");
    });

    it("gives up after its round cap when a point never reports", () => {
        let s = start({ lane: "ci", good: "g", bad: "m8", targets: [TEST] }, fakeGit(8));
        s = judge(s, [{ sha: "m8", runs: 5, failed: { [ID]: 5 } }]);
        while (!s.answer) s = judge(s, []);
        assert.match(s.answer.noLanding, /no answer after 12 rounds/);
    });

    it("confirms again when the confirming job was lost before it reported", () => {
        const s = start({ lane: "ci", good: "g", bad: "m8", targets: [TEST] }, fakeGit(8));
        const again = judge(s, []);
        assert.equal(again.answer, undefined);
        assert.deepEqual(again.next, { points: ["m8"], runs: 5, confirm: true });
    });

    it("names no merge for a ci red that names no test or shard, and runs an LLM red's whole suite", () => {
        const ci = start({ lane: "ci", good: "g", bad: "m4", targets: [] }, fakeGit(4));
        assert.match(ci.answer.noLanding, /names no failing test or shard/);
        const llm = start(
            { lane: "llm", good: "g", bad: "m4", targets: [] },
            fakeGit(4, () => true),
        );
        assert.equal(llm.targets[0].shard, "llm-regression");
        assert.equal(llm.next.confirm, true);
    });

    it("filters a lane point to its files only when the lane's filter reaches every one", () => {
        const gpu = (files) => ({ lane: "gpu", targets: files.map((file) => ({ file })) });
        const own = "webgpu-graph-algorithms/test/a.test.ts";
        assert.equal(laneFiles(gpu([own])), own);
        assert.equal(laneFiles(gpu([own, "graphty-element/test/browser/webgpu-layout.test.ts"])), "", "the whole lane");
        assert.equal(laneFiles(gpu([null])), "", "a red with no named test runs the whole lane");
        assert.equal(
            laneFiles(gpu(["webgpu-graph-algorithms/test/browser/smoke.test.ts"])),
            "",
            "the filter runs node projects",
        );
        assert.equal(
            laneFiles({ lane: "macos", targets: [{ file: "graphty-element/test/lifecycle/safari.test.ts" }] }),
            "graphty-element/test/lifecycle/safari.test.ts",
        );
    });

    it("takes a lane's red as its confirming run and tests one point a round", () => {
        const s = start({ lane: "hosts", good: "g", bad: "m8", targets: [] }, fakeGit(8));
        assert.equal(s.next.points.length, 1);
        const point = s.next.points[0];
        const lost = judge(s, [{ sha: point, status: "cancelled" }]);
        assert.deepEqual(lost.next.points, [point], "a lost run is no result: the point runs again");
        const r = judge(s, [{ sha: point, status: "failure" }]);
        assert.equal(r.results[point].failed["the whole gate"], 1);
    });

    it("sends a T4 failure to the local NVIDIA card before any paid point", () => {
        const s = start({ lane: "gpu", good: "g", bad: "m4", targets: [] }, fakeGit(4));
        assert.equal(s.answer.status, "local");
        assert.equal(s.next, undefined);
    });

    it("stops a T4 bisect at the cap of paid minutes", () => {
        let s = start({ lane: "gpu", good: "g", bad: "m40", targets: [], afterLocalCard: true }, fakeGit(40));
        let rounds = 0;
        while (!s.answer) {
            s = judge(s, [{ sha: s.next.points[0], status: "success", minutes: 70 }]);
            rounds++;
        }
        assert.ok(s.t4Minutes <= T4_CAP_MINUTES, `${s.t4Minutes} paid minutes`);
        assert.equal(rounds, 3);
        assert.match(s.answer.noLanding, /T4 cap/);
    });

    it("keeps to the T4 cap when the first bad landing's parent needs a point of its own", () => {
        // m2's first parent p2 is not a landing of the range, so blaming m2 needs a run of p2
        const git = { ...fakeGit(3), parent: (sha) => ({ m1: "g", m2: "p2", m3: "m2" })[sha] };
        let s = start({ lane: "gpu", good: "g", bad: "m3", targets: [], afterLocalCard: true }, git);
        const seen = [];
        while (!s.answer && seen.length < 10) {
            const sha = s.next.points[0];
            seen.push(sha);
            s = judge(s, [{ sha, status: sha === "m1" ? "success" : "failure", minutes: 120 }]);
        }
        assert.ok(!seen.includes("p2"), `ran ${seen.join(", ")}`);
        assert.ok(s.t4Minutes <= T4_CAP_MINUTES, `${s.t4Minutes} paid minutes`);
        assert.match(s.answer.noLanding, /T4 cap/);
    });

    it("counts the paid minutes of a lost T4 point toward the cap", () => {
        let s = start({ lane: "gpu", good: "g", bad: "m40", targets: [], afterLocalCard: true }, fakeGit(40));
        let rounds = 0;
        while (!s.answer && rounds < 20) {
            s = judge(s, [{ sha: s.next.points[0], status: "cancelled", minutes: 70 }]);
            rounds++;
        }
        assert.ok(s.answer, "lost spot runners still end the bisect at the cap");
        assert.ok(rounds <= 4, `${rounds} rounds`);
        assert.match(s.answer.noLanding, /T4 cap/);
    });
});

describe("bisect.yml", () => {
    const read = (f) => readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), "utf8");
    const yml = read("bisect.yml");

    it("runs one bisect per red commit, at most 8 points at once, and dispatches its own next round", () => {
        assert.match(yml, /concurrency:\n {4}group: bisect-\$\{\{ inputs\.bad \}\}\n {4}cancel-in-progress: false/);
        assert.match(yml, /max-parallel: 8\b/);
        assert.equal(LANES.ci.width, 8);
        assert.match(yml, /gh workflow run bisect\.yml/);
        assert.doesNotMatch(yml, /^ {4}(pull_request|push|schedule|workflow_run)\b/m, "only release.yml dispatches it");
    });

    it("gives every lane point its own concurrency group in the lane's workflow", () => {
        for (const f of ["gpu.yml", "hosts.yml", "work-protection-macos.yml"]) {
            assert.match(read(f), /bisect_point:\n/, f);
            assert.match(
                read(f),
                /group: \$\{\{ inputs\.bisect_point && format\('bisect-\{0\}', inputs\.bisect_point\) \|\|/,
                f,
            );
            assert.match(yml, new RegExp(`uses: ./.github/workflows/${f.replace(".", "\\.")}\\n`), f);
        }
        for (const f of ["gpu.yml", "hosts.yml", "work-protection-macos.yml"])
            assert.match(read(f), /files:\n {16}description:/, f);
        assert.equal(
            (yml.match(/files: \$\{\{ needs\.plan\.outputs\.files \}\}/g) ?? []).length,
            3,
            "every lane call passes it",
        );
    });
});

describe("a lane point runs with its own workflow files", () => {
    const read = (f) => readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), "utf8");
    const bisect = parseYaml(read("bisect.yml")).jobs;
    const LANE_FILES = { gpu: "gpu.yml", hosts: "hosts.yml", macos: "work-protection-macos.yml" };

    it("every lane workflow can be dispatched as a bisect point, as own_lane's check reads it", () => {
        for (const f of Object.values(LANE_FILES)) {
            const inputs = parseYaml(read(f)).on.workflow_dispatch?.inputs ?? {};
            assert.ok(inputs.bisect_point && inputs.files, f);
        }
    });

    it("calls the lane in place only when the point could not be handed off, and judges by the handed-off run", () => {
        for (const lane of Object.keys(LANE_FILES)) {
            assert.deepEqual(bisect[lane].needs, ["plan", "own_lane"], lane);
            assert.match(bisect[lane].if, /!cancelled\(\) .*needs\.own_lane\.outputs\.own != 'true'/, lane);
        }
        assert.ok(bisect.judge.needs.includes("own_lane"));
        const status = bisect.judge.steps.find((s) => s.env?.STATUS).env.STATUS;
        assert.match(status, /needs\.own_lane\.outputs\.own == 'true' && needs\.own_lane\.outputs\.result \|\|/);
        assert.equal(bisect.own_lane.environment, "release");
    });

    // the dispatch step's script, with git, gh and yq stubbed: each logs its arguments
    const dispatch = (pointKnows) => {
        const dir = mkdtempSync(join(tmpdir(), "bisect-own-lane-"));
        const stub = (name, body) =>
            writeFileSync(join(dir, name), `#!/bin/bash\necho "${name} $*" >> "${dir}/calls"\n${body}\n`, {
                mode: 0o755,
            });
        stub("git", pointKnows ? 'if [ "$1" = show ]; then echo "    workflow_dispatch:"; fi' : "");
        stub("gh", "");
        stub("yq", pointKnows ? "cat > /dev/null; echo true" : "cat > /dev/null; echo false");
        writeFileSync(join(dir, "out"), "");
        const step = bisect.own_lane.steps.find((s) => s.id === "dispatch");
        execFileSync("bash", ["-c", step.run], {
            env: {
                PATH: `${dir}:${process.env.PATH}`,
                SHA: "a".repeat(40),
                BAD: "b".repeat(40),
                FILES: "x.test.ts y.test.ts",
                WF: "gpu.yml",
                GITHUB_SHA: "c".repeat(40),
                GITHUB_OUTPUT: join(dir, "out"),
            },
            stdio: "pipe",
        });
        const res = { calls: readFileSync(join(dir, "calls"), "utf8"), out: readFileSync(join(dir, "out"), "utf8") };
        rmSync(dir, { recursive: true, force: true });
        return res;
    };

    it("moves bisect/<red>-<point> to the point and dispatches its lane workflow there with the point's files", () => {
        const { calls, out } = dispatch(true);
        assert.match(calls, /git push --no-verify --force origin a{40}:refs\/heads\/bisect\/b{12}-a{12}\n/);
        assert.match(
            calls,
            /gh workflow run gpu\.yml --ref bisect\/b{12}-a{12} -f files=x\.test\.ts y\.test\.ts -f bisect_point=b{40}-a{40}\n/,
        );
        assert.match(out, /^own=true\nbranch=bisect\/b{12}-a{12}\nsince=/);
    });

    it("leaves a point from before the hand-off to be called in place, pushing and dispatching nothing", () => {
        const { calls, out } = dispatch(false);
        assert.doesNotMatch(calls, /git push|gh workflow/);
        assert.equal(out, "");
    });
});

describe("offMaster", () => {
    it("names every good, bad or point commit that is not on master's first-parent history", () => {
        const master = new Set(["g", "m1", "m2", "b"]);
        assert.deepEqual(offMaster({ good: "g", bad: "b", next: { points: ["m1", "m2"] } }, master), []);
        assert.deepEqual(offMaster({ good: "g", bad: "b", next: { points: ["branch1"] } }, master), ["branch1"]);
        assert.deepEqual(offMaster({ good: "x", bad: "b" }, master), ["x"]);
    });
});

describe("what a dispatch may name", () => {
    it("refuses a target whose file is not a plain path", () => {
        const ok = { targets: [{ shard: "llm-regression", file: "test/ai/x.test.ts" }] };
        assert.deepEqual(unsafeTargets(ok), []);
        for (const file of ["x; curl evil", "$(id)", "../etc/passwd", "a b.test.ts", "'q'"]) {
            assert.equal(unsafeTargets({ targets: [{ shard: "s", file }] }).length, 1, file);
        }
        assert.equal(unsafeTargets({ targets: [{ shard: "s;x", file: "a.test.ts" }] }).length, 1);
        assert.equal(unsafeTargets({ targets: [{ shard: "s", file: "--reporter=x" }] }).length, 1, "an option");
        assert.equal(unsafeTargets({ followed: [{ shard: "s", file: "x;y" }] }).length, 1, "a later round's list");
    });

    it("quotes each LLM file on the command line", async () => {
        const [, , command] = await runArgs("llm-regression", ["test/ai/a.test.ts", "test/ai/b.test.ts"]);
        assert.match(command, /--project llm-regression 'test\/ai\/a\.test\.ts' 'test\/ai\/b\.test\.ts'$/);
    });
});

describe("setupFailed", () => {
    it("fails every followed target on every run the round asked for", () => {
        const s = { targets: [{ id: "a" }, { id: "b" }], followed: [{ id: "a" }], next: { runs: 5 } };
        assert.deepEqual(setupFailed(s, "p"), { sha: "p", runs: 5, failed: { a: 5 } });
    });
});

describe("runPoint", () => {
    it("passes a target whose file does not exist at the point, and runs the rest", async () => {
        const s = {
            next: { confirm: false },
            followed: [
                { id: "a", shard: "graphty-element-default", file: "graphty-element/test/old.test.ts" },
                { id: "b", shard: "graphty-element-default", file: "graphty-element/test/added-later.test.ts" },
            ],
        };
        const calls = [];
        const spawn = (cmd, args) => (calls.push(args.join(" ")), { status: 1 });
        const r = await runPoint(s, "p", 1, spawn, (f) => f.endsWith("old.test.ts"));
        assert.deepEqual(r.failed, { a: 1 });
        assert.equal(calls.length, 1);
        assert.doesNotMatch(calls[0], /added-later/);
    });

    it("passes a target whose shard does not exist at the point, instead of throwing and writing no result", async () => {
        const s = {
            next: { confirm: false },
            followed: [
                { id: "a", shard: "graphty-element-default", file: "graphty-element/test/x.test.ts" },
                { id: "b", shard: "no-such-shard-at-this-point", file: "graphty/src/y.test.ts" },
            ],
        };
        const calls = [];
        const spawn = (cmd, args) => (calls.push(args.join(" ")), { status: 1 });
        const r = await runPoint(s, "p", 2, spawn, () => true);
        assert.deepEqual(r, { sha: "p", runs: 2, failed: { a: 2 } });
        assert.equal(calls.length, 2);
        assert.equal(await runArgs("no-such-shard-at-this-point", []), null);
    });
});

describe("a point's time limit", () => {
    it("stops a run at its lane's limit and fails its targets, so the point writes a result", async () => {
        const s = {
            lane: "llm",
            next: { confirm: true },
            targets: [{ id: "a", shard: "llm-regression", file: "graphty-element/test/ai/x.test.ts" }],
        };
        const calls = [];
        const spawn = (cmd, args) => (calls.push([cmd, ...args]), { status: 124 }); // timeout's "timed out"
        const r = await runPoint(s, "p", 2, spawn, () => true);
        assert.deepEqual(r, { sha: "p", runs: 2, failed: { a: 2 } });
        assert.deepEqual(calls[0].slice(0, 3), ["timeout", "--kill-after=1m", "20m"]);
        assert.match(calls[0][3], /tools\/run-tests\.sh$/);
    });

    it("is the lane's own job timeout in the full run", () => {
        const release = parseYaml(readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8"));
        assert.equal(LANES.llm.minutes, release.jobs.llm["timeout-minutes"]);
        const file = loadBudgets();
        assert.equal(LANES.ci.minutes, hangMinutes(file, budgetFor(file, "job:ci.yml:Test (layout)").minutes));
    });
});

describe("the macOS lane's files", () => {
    it("names only the files its jobs run, else the whole lane", () => {
        const lane = (file) => laneFiles({ lane: "macos", targets: [{ file }] });
        assert.equal(
            lane("graphty-element/test/lifecycle/safari.test.ts"),
            "graphty-element/test/lifecycle/safari.test.ts",
        );
        assert.equal(lane("graphty-element/test/lifecycle/other.test.ts"), "", "no job names it: run every job");
    });
});
