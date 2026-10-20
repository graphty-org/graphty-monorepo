import { describe, expect, it } from "vitest";

import {
    emptyFacts,
    failureKey,
    failureKeys,
    foldJobs,
    foldRuns,
    notePickups,
    PICKUP_SEED,
    queueAges,
} from "../lib/lanes.mjs";
import { BACKWARDS, createReplay } from "./replay/replay.mjs";

const CONFIG = { gating: /** @type {const} */ ({ CI: "required", GPU: "required", Hosts: "if-run" }), ci: "CI" };
const SUMMARIES = ["All Checks Pass"];
const T0 = Date.parse("2026-10-01T12:00:00Z");

/**
 * A completed or running master run.
 * @param {string} name workflow
 * @param {number} id run id
 * @param {string} sha head commit
 * @param {string | null} conclusion null while running
 * @param {{attempt?: number, minute?: number}} [o] attempt, and the minute after T0 it was last updated
 * @returns {any} the run
 */
function run(name, id, sha, conclusion, { attempt = 1, minute = id } = {}) {
    return {
        id,
        run_attempt: attempt,
        name,
        head_sha: sha,
        status: conclusion === null ? "in_progress" : "completed",
        conclusion,
        created_at: new Date(T0 + id * 60_000).toISOString(),
        updated_at: new Date(T0 + minute * 60_000).toISOString(),
    };
}

/**
 * Folds polls in order, each at the minute after T0 given by its index.
 * @param {any[][]} polls each poll's runs
 * @returns {import("../lib/lanes.mjs").LaneFacts} the facts after the last poll
 */
function fold(polls) {
    let facts = emptyFacts();
    polls.forEach((runs, i) => {
        facts = foldRuns(facts, runs, CONFIG, T0 + (100 + i) * 60_000).facts;
    });
    return facts;
}

describe("lane verdict and red-since", () => {
    it("takes the newest completed run of each workflow, and the first red run starts the stretch", () => {
        const facts = fold([
            [run("CI", 1, "a", "success"), run("Coverage", 2, "a", "success")],
            [run("CI", 3, "b", "failure"), run("CI", 1, "a", "success")],
            [run("CI", 4, "c", "failure"), run("CI", 3, "b", "failure")],
        ]);
        expect(facts.lanes.CI.verdict).toBe("red");
        expect(facts.lanes.CI.redSince?.runId).toBe(3);
        expect(facts.lanes.CI.newest?.runId).toBe(4);
        expect(facts.lanes.Coverage.verdict).toBe("green");
    });

    it("ignores a backwards answer and an answer seen before", () => {
        let facts = fold([[run("CI", 5, "e", "success")]]);
        const out = foldRuns(facts, [run("CI", 2, "b", "failure")], CONFIG, T0 + 200 * 60_000);
        expect(out.sighted).toEqual([]);
        expect(out.facts.lanes.CI.verdict).toBe("green");
        facts = out.facts;
        expect(foldRuns(facts, [run("CI", 5, "e", "success")], CONFIG, T0 + 201 * 60_000).sighted).toEqual([]);
    });

    it("sees a re-run attempt of the same run", () => {
        const facts = fold([
            [run("CI", 5, "e", "failure")],
            [run("CI", 5, "e", null, { attempt: 2, minute: 6 })],
            [run("CI", 5, "e", "success", { attempt: 2, minute: 9 })],
        ]);
        expect(facts.lanes.CI.verdict).toBe("green");
        expect(facts.lanes.CI.newest?.attempt).toBe(2);
        expect(facts.lanes.CI.redSince).toBeNull();
    });

    it("keeps the verdict and the stretch through a cancelled run", () => {
        const facts = fold([[run("GPU", 1, "a", "failure")], [run("GPU", 2, "b", "cancelled")]]);
        expect(facts.lanes.GPU.verdict).toBe("red");
        expect(facts.lanes.GPU.newest?.conclusion).toBe("cancelled");
        expect(facts.lanes.GPU.redSince?.runId).toBe(1);
    });
});

describe("green and CI-green commits", () => {
    it("needs every gating lane green, and an if-run lane only when it ran", () => {
        const facts = fold([
            [
                run("CI", 1, "a", "success"),
                run("GPU", 2, "a", "success"),
                run("CI", 3, "b", "success"),
                run("GPU", 4, "b", "success"),
                run("Hosts", 5, "b", "failure"),
                run("CI", 6, "c", "success"),
                run("GPU", 7, "c", "cancelled"),
                run("CI", 8, "d", "success"),
                run("GPU", 9, "d", "failure"),
                run("CI", 10, "e", null),
            ],
        ]);
        expect(facts.greenSha).toBe("a");
        expect(facts.ciGreenSha).toBe("c");
    });

    it("keeps the last known commits when no remembered commit qualifies", () => {
        let facts = fold([[run("CI", 1, "a", "success"), run("GPU", 2, "a", "success")]]);
        facts = foldRuns(facts, [run("CI", 3, "b", "failure")], CONFIG, T0 + 300 * 60_000).facts;
        expect(facts.greenSha).toBe("a");
        expect(facts.ciGreenSha).toBe("a");
    });

    it("judges a commit by the newest attempt of each workflow on it", () => {
        const facts = fold([
            [run("CI", 1, "a", "failure"), run("GPU", 2, "a", "success")],
            [run("CI", 1, "a", "success", { attempt: 2, minute: 50 })],
            [run("CI", 1, "a", "failure")],
        ]);
        expect(facts.greenSha).toBe("a");
    });

    it("remembers only the newest 50 commits", () => {
        const runs = Array.from({ length: 60 }, (_, i) => run("CI", i + 1, `s${i + 1}`, "failure"));
        const facts = fold([runs]);
        expect(Object.keys(facts.shas)).toHaveLength(50);
        expect(facts.shas.s1).toBeUndefined();
        expect(facts.shas.s60).toBeDefined();
    });
});

describe("failure keys", () => {
    it("replaces shard numbers and commit hashes, but not a runner image's year", () => {
        expect(failureKey("CI", "Test (graphty-element-browser-4)", "Run tests")).toBe(
            "CI / Test (graphty-element-browser-*) / Run tests",
        );
        expect(failureKey("Hosts", "Test (d3d12 on windows-2025)", "Node suite")).toBe(
            "Hosts / Test (d3d12 on windows-2025) / Node suite",
        );
        expect(failureKey("CI", "shard-12", "x")).toBe("CI / shard-* / x");
        expect(
            failureKey(
                "Release",
                "Wait",
                "Require GPU and Hosts to succeed on cde458a20b71169690d47ed15390f88c02bdb66a",
            ),
        ).toBe("Release / Wait / Require GPU and Hosts to succeed on *");
        // Not shards and not hashes: a GPU model, a graphics API, a word of hex letters.
        expect(failureKey("GPU", "Test (NVIDIA T4)", "deadbeef d3d12")).toBe("GPU / Test (NVIDIA T4) / deadbeef d3d12");
        expect(failureKey("GPU", "Test (NVIDIA T4)")).toBe("GPU / Test (NVIDIA T4) / ");
    });

    /**
     * A finished job.
     * @param {string} name job name
     * @param {string} conclusion its conclusion
     * @param {[string, string][]} [steps] step names and conclusions
     * @returns {any} the job
     */
    const job = (name, conclusion, steps = []) => ({
        name,
        status: "completed",
        conclusion,
        steps: steps.map(([n, c]) => ({ name: n, conclusion: c })),
    });

    it("names the first failed step, drops a summary job beside a real failure, and keeps it alone", () => {
        const jobs = [
            job("Build", "success", [["Build", "success"]]),
            job("Test (a-1)", "failure", [
                ["Set up", "success"],
                ["Run tests", "failure"],
                ["Upload", "failure"],
            ]),
            job("Test (a-2)", "failure", [["Run tests", "failure"]]),
            job("Lost runner", "failure"),
            job("All Checks Pass", "failure", [["Check all jobs passed", "failure"]]),
        ];
        expect(failureKeys("CI", jobs, SUMMARIES)).toEqual(["CI / Test (a-*) / Run tests", "CI / Lost runner / "]);
        expect(failureKeys("CI", [jobs[0], jobs[4]], SUMMARIES)).toEqual([
            "CI / All Checks Pass / Check all jobs passed",
        ]);
        expect(failureKeys("CI", jobs.slice(3))).toHaveLength(2);
    });

    it("adds keys only to a red lane, and only from runs of the current stretch", () => {
        const jobs = [job("Build", "failure", [["Security audit", "failure"]])];
        const green = fold([[run("CI", 1, "a", "success")]]);
        expect(foldJobs(green, "CI", 1, jobs, T0)).toBe(green);
        const red = fold([[run("CI", 1, "a", "success")], [run("CI", 3, "b", "failure")]]);
        expect(foldJobs(red, "CI", 2, jobs, T0)).toBe(red);
        let facts = foldJobs(red, "CI", 3, jobs, T0);
        facts = foldJobs(facts, "CI", 4, jobs, T0 + 60_000);
        expect(facts.lanes.CI.keys).toEqual({
            "CI / Build / Security audit": { firstRunId: 3, firstSeenAt: new Date(T0).toISOString(), lastRunId: 4 },
        });
    });
});

describe("queue age", () => {
    const label = Object.keys(PICKUP_SEED)[0];
    /**
     * A job of a gating run.
     * @param {number} id job id
     * @param {string} status job status
     * @param {number} createdMin minute after T0 it was created
     * @param {{runner?: string, startedMin?: number, labels?: string[]}} [o] runner and start
     * @returns {any} the job
     */
    const qjob = (id, status, createdMin, { runner, startedMin = createdMin, labels = [label] } = {}) => ({
        id,
        name: `job ${id}`,
        status,
        created_at: new Date(T0 + createdMin * 60_000).toISOString(),
        started_at: new Date(T0 + startedMin * 60_000).toISOString(),
        runner_name: runner ?? null,
        labels,
    });

    it("measures queued jobs against the worst pickup on their label", () => {
        const ages = queueAges(
            [qjob(1, "queued", 0), qjob(2, "queued", 10), qjob(3, "in_progress", 0, { runner: "r", startedMin: 1 })],
            PICKUP_SEED,
            T0 + 20 * 60_000,
        );
        expect(ages).toEqual([
            { jobId: 1, name: "job 1", label, ageMs: 1_200_000, boundMs: 926_000, over: true },
            { jobId: 2, name: "job 2", label, ageMs: 600_000, boundMs: 926_000, over: false },
        ]);
    });

    it("holds an unseen label to the worst bound of any label, and none at all to zero", () => {
        const job = qjob(1, "queued", 0, { labels: ["ubuntu-latest"] });
        expect(queueAges([job], PICKUP_SEED, T0 + 60_000)[0].boundMs).toBe(926_000);
        expect(queueAges([{ ...job, labels: undefined }], {}, T0 + 60_000)[0]).toMatchObject({ label: "", over: true });
    });

    it("records a worse pickup, ignores a queued job and keeps a better one out", () => {
        const worst = notePickups(PICKUP_SEED, [
            qjob(1, "in_progress", 0, { runner: "r1", startedMin: 20 }),
            qjob(2, "queued", 0),
            qjob(3, "completed", 0, { runner: "r2", startedMin: 1, labels: ["ubuntu-latest"] }),
            qjob(4, "completed", 0, { runner: "r3", startedMin: 0, labels: ["ubuntu-latest"] }),
        ]);
        expect(worst).toEqual({ [label]: 1_200_000, "ubuntu-latest": 60_000 });
    });
});

describe("replay", () => {
    it("the 11.5-hour red CI stretch of 10-01 gives four keys with the true red-since, and the green commits", () => {
        const replay = createReplay();
        const MASTER = "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&per_page=100";
        let facts = emptyFacts();
        /** @type {Map<string, {redSince: number | undefined, keys: string[], green: string | null, ciGreen: string | null}>} */
        const at = new Map();
        const from = Date.parse("2026-10-01T12:00:00Z");
        const to = Date.parse("2026-10-02T04:00:00Z");
        for (let now = from; now < to; now += 60_000) {
            const runs = replay.answer(MASTER, now).body.workflow_runs;
            const out = foldRuns(facts, runs, CONFIG, now);
            facts = out.facts;
            for (const s of out.sighted.filter((r) => r.conclusion === "failure")) {
                const name = runs.find((/** @type {any} */ r) => r.id === s.runId).name;
                const jobs = replay.answer(`repos/graphty-org/graphty-monorepo/actions/runs/${s.runId}/jobs`, now).body
                    .jobs;
                facts = foldJobs(facts, name, s.runId, jobs, now, SUMMARIES);
            }
            at.set(new Date(now).toISOString().slice(5, 16), {
                redSince: facts.lanes.CI?.redSince?.runId,
                keys: Object.keys(facts.lanes.CI?.keys ?? {}),
                green: facts.greenSha?.slice(0, 8) ?? null,
                ciGreen: facts.ciGreenSha?.slice(0, 8) ?? null,
            });
        }

        // The first red run of the stretch: the merge of #662 pushed at 14:58, red at 15:37. An
        // earlier red run (15:16) was followed by a newer green one (15:31), so it starts nothing.
        expect(at.get("10-01T15:20")?.redSince).toBe(36877782495);
        expect(at.get("10-01T15:32")?.redSince).toBeUndefined();
        const last = at.get("10-02T03:26");
        expect(last?.redSince).toBe(36880562193);
        expect(facts.lanes.CI.redSince).toBeNull();
        const stretch = replay.record.master.find((t) => t.run.id === 36880562193)?.run;
        expect(stretch?.created_at).toBe("2026-10-01T14:58:14Z");
        // The four causes of the stretch, in the order they appeared; the summary job is not one.
        expect(last?.keys).toEqual([
            "CI / Test (webgpu-graph-algorithms-node) / Run tests",
            "CI / Test (visual-review) / Run tests",
            "CI / Cost Estimate Accuracy / Time the estimates against real runs",
            "CI / Build / Security audit",
        ]);
        // Green on every gating lane: the merge of #513 (10-01 15:36) until the merge of #690 (03:27).
        expect(at.get("10-01T15:40")?.green).toBe("c768e903");
        expect(last?.green).toBe("c768e903");
        expect(at.get("10-02T03:27")?.green).toBe("b3595393");
        // CI-green through the stretch: the merge of #665, whose CI passed at 15:56.
        expect(at.get("10-01T16:00")?.ciGreen).toBe("9dd57bd5");
        expect(last?.ciGreen).toBe("9dd57bd5");
        // The stale run GitHub answered with on 10-02 is older than everything here.
        expect(BACKWARDS.runId).toBeLessThan(36880562193);
    });

    it("the two backwards answers of 10-02 are no sighting", () => {
        const replay = createReplay();
        const MASTER = "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&per_page=100";
        let facts = emptyFacts();
        /** @type {number[]} */
        const sighted = [];
        for (let now = Date.parse("2026-10-02T10:30:00Z"); now < Date.parse("2026-10-02T11:30:00Z"); now += 60_000) {
            const out = foldRuns(facts, replay.answer(MASTER, now).body.workflow_runs, CONFIG, now);
            facts = out.facts;
            sighted.push(...out.sighted.map((s) => s.runId));
        }
        expect(sighted).not.toContain(BACKWARDS.runId);
        expect(facts.lanes.CI.newest?.runId).not.toBe(BACKWARDS.runId);
    });
});
