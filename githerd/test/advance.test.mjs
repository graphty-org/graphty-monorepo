import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkFaults, confirmClosedWaits, settleWaits, tickJobs } from "../lib/advance.mjs";
import { move, newJob, startPhase } from "../lib/board.mjs";

const T0 = new Date("2026-10-04T12:00:00Z");
const MIN = 60_000;
const at = (/** @type {number} */ minutes) => new Date(T0.getTime() + minutes * MIN);
const HEAD = "a".repeat(40);

/**
 * A working job with a live session.
 * @param {string} id the job id
 * @param {any} [over] fields to set
 * @returns {any} the job
 */
function working(id, over = {}) {
    const job = newJob({ kind: "issue", target: "#1", id }, T0);
    move(job, "starting", T0);
    move(job, "working", T0);
    return Object.assign(job, { holder: { session: `s-${id}`, pane: "%1", nonce: "n" } }, over);
}

/**
 * A state holding the jobs.
 * @param {...any} jobs the jobs
 * @returns {any} the state
 */
const stateOf = (...jobs) => ({ jobs: Object.fromEntries(jobs.map((j) => [j.id, j])), prs: {}, master: { lanes: {} } });

/**
 * A starting job whose window is open: its registry deadline runs.
 * @param {string} id the job id
 * @returns {any} the job
 */
function starting(id) {
    const job = newJob({ kind: "issue", target: "#1", id }, T0);
    move(job, "starting", T0, { holder: { session: null, pane: "%2" } });
    startPhase(job, "registry", T0);
    return job;
}

describe("tickJobs", () => {
    it("never wakes a wait or ends a worker's attempt on elapsed time; a start deadline still fires", () => {
        const wait = working("w");
        move(wait, "waiting", T0, { waitingFor: { checks: HEAD } });
        const busy = working("x");
        const start = starting("s");
        const state = stateOf(wait, busy, start);
        expect(tickJobs(state, at(0.5), {})).toEqual([]);
        expect(tickJobs(state, at(1), {}).map((f) => [f.job, f.action])).toEqual([["s", "start-failure"]]);
        expect(state.retiring.map((r) => r.job)).toEqual(["s"]);
        // A year later the wait still waits and the attempt still runs: no clock ends either.
        expect(tickJobs(state, at(365 * 24 * 60), {})).toEqual([]);
        expect(wait).toMatchObject({ state: "waiting", attempts: [] });
        expect(busy).toMatchObject({ state: "working", attempts: [], holder: { session: "s-x" } });
    });

    it("counts no time while GitHub is unknown, a usage stop holds or githerd is paused", () => {
        const job = starting("x");
        const state = stateOf(job);
        tickJobs(state, at(60), { unknown: true });
        tickJobs(state, at(120), { usage: true });
        tickJobs(state, at(3 * 60), { paused: true });
        expect(job.clock.usedMs).toBe(0);
        expect(job.pausedBy).toEqual(["githerd pause"]);
    });
});

describe("settleWaits", () => {
    it("settles checks that finished, a moved head, a lane, a job, and GitHub coming back", () => {
        const checks = working("checks");
        move(checks, "waiting", T0, { waitingFor: { checks: HEAD } });
        const moved = working("moved", { pr: 8 });
        move(moved, "waiting", T0, { waitingFor: { checks: "b".repeat(40) } });
        const lane = working("lane");
        move(lane, "waiting", T0, { waitingFor: { lane: "GPU" } });
        const other = working("other");
        const onJob = working("on-job");
        move(onJob, "waiting", T0, { waitingFor: { job: "other" } });
        const gh = working("gh");
        move(gh, "waiting", T0, { waitingFor: { github: T0.toISOString() } });
        const state = stateOf(checks, moved, lane, other, onJob, gh);
        state.prs = {
            7: { headSha: HEAD, required: { "All Checks Pass": "PENDING" } },
            8: { headSha: "c".repeat(40), required: {} },
        };
        state.master.lanes.gpu = {
            workflowName: "GPU",
            inFlight: { 1: {} },
            verdict: "red",
            updatedAt: at(5).toISOString(),
        };
        state.github = { downSince: T0.toISOString() };
        expect(settleWaits(state, at(1)).map((s) => s.job)).toEqual(["moved"]);
        expect(moved.news.at(-1).text).toBe(`#8's head moved to ccccccccc`);
        state.prs[7].required = { "All Checks Pass": "FAILURE" };
        state.master.lanes.gpu.inFlight = {};
        move(other, "cancelled", at(2));
        state.github.downSince = null;
        const settled = settleWaits(state, at(3));
        expect(settled.map((s) => [s.job, s.ring])).toEqual([
            ["checks", true],
            ["lane", true],
            ["on-job", true],
            ["gh", true],
        ]);
        expect(checks.news.at(-1).text).toBe("checks on aaaaaaaaa finished: All Checks Pass FAILURE");
        expect(lane.news.at(-1).text).toBe("lane GPU is red");
        expect([checks, lane, onJob, gh].every((j) => j.state === "working")).toBe(true);
    });

    it("holds a checks wait named by its pull request's number until that pull request's checks finish", async () => {
        // Sessions name the pull request (#1451), not a head sha: the wait must hold while CI runs.
        const byNumber = working("by-number");
        move(byNumber, "waiting", T0, { waitingFor: { checks: "1451" } });
        const bySha = working("by-sha");
        move(bySha, "waiting", T0, { waitingFor: { checks: HEAD } });
        const state = stateOf(byNumber, bySha);
        // A summary check such as All Checks Pass is MISSING until the jobs it needs end.
        state.prs = {
            1451: { headSha: "d".repeat(40), required: { "All Checks Pass": "MISSING", "Lint PR Title": "SUCCESS" } },
            7: { headSha: HEAD, required: { "All Checks Pass": "MISSING" } },
        };
        expect(settleWaits(state, at(1))).toEqual([]);
        expect([byNumber, bySha].every((j) => j.state === "waiting")).toBe(true);
        // A new push to the pull request does not end a wait on the pull request itself.
        state.prs[1451].headSha = "e".repeat(40);
        expect(settleWaits(state, at(2))).toEqual([]);
        state.prs[1451].required["All Checks Pass"] = "FAILURE";
        expect(settleWaits(state, at(3)).map((s) => s.job)).toEqual(["by-number"]);
        expect(byNumber.news.at(-1).text).toBe(
            "checks on #1451 finished: All Checks Pass FAILURE, Lint PR Title SUCCESS",
        );
        const gone = working("gone");
        move(gone, "waiting", T0, { waitingFor: { checks: "#1500" } });
        state.jobs.gone = gone;
        // Not in the poll is not closed (#1371): only GitHub's answer ends the wait.
        expect(settleWaits(state, at(4))).toEqual([]);
        const gitHub = { graphql: async () => ({ repository: { j0: { state: "CLOSED" } } }) };
        await confirmClosedWaits(state, { gitHub, repo: "o/r" });
        expect(settleWaits(state, at(5)).map((s) => s.job)).toEqual(["gone"]);
        expect(gone.news.at(-1).text).toBe("#1500 is no longer open");
    });

    it("settles a merge wait when its pull request, or a pull request from its branch, merges or closes", async () => {
        const byNumber = working("by-number");
        move(byNumber, "waiting", T0, { waitingFor: { merge: "1520" } });
        const byBranch = working("by-branch");
        move(byBranch, "waiting", T0, { waitingFor: { merge: "ci/playwright-one-version" } });
        const closed = working("closed");
        move(closed, "waiting", T0, { waitingFor: { merge: "1521" } });
        const state = stateOf(byNumber, byBranch, closed);
        state.master.branch = "master";
        state.prs = { 1520: { headRef: "fix/a", required: {} } };
        /** @type {string[]} */
        const asked = [];
        let answer = {};
        const gitHub = {
            graphql: async (/** @type {string} */ q) => {
                asked.push(q);
                return { repository: answer };
            },
        };
        // #1520 is open; the branch has no pull request yet: nothing settles.
        answer = { j0: { nodes: [] }, j1: { state: "OPEN" } };
        await confirmClosedWaits(state, { gitHub, repo: "o/r" });
        expect(asked[0]).toContain('j0: pullRequests(headRefName: "ci/playwright-one-version", baseRefName: "master"');
        expect(asked[0]).toContain("j1: pullRequest(number: 1521) { state }");
        expect(asked[0]).not.toContain("1520");
        expect(settleWaits(state, at(1))).toEqual([]);
        // The branch's pull request opened and merged, #1520 merged, #1521 closed unmerged.
        state.prs = {};
        answer = {
            j0: { state: "MERGED" },
            j1: { nodes: [{ state: "CLOSED" }, { state: "MERGED" }] },
            j2: { state: "CLOSED" },
        };
        await confirmClosedWaits(state, { gitHub, repo: "o/r" });
        expect(settleWaits(state, at(2)).map((s) => s.job)).toEqual(["by-number", "by-branch", "closed"]);
        expect([byNumber, byBranch, closed].map((j) => [j.state, j.news.at(-1).text])).toEqual([
            ["working", "#1520 merged"],
            ["working", "ci/playwright-one-version merged"],
            ["working", "#1521 closed without merging"],
        ]);
    });

    it("leaves push and verification waits to their own owners, and requeues a job whose blocker ended", () => {
        const push = working("push");
        move(push, "waiting", T0, { waitingFor: { push: "q1" } });
        const verify = working("verify");
        move(verify, "waiting", T0, { waitingFor: { checks: HEAD, verify: true } });
        const blocked = newJob({ kind: "issue", target: "#2", id: "blocked" }, T0);
        move(blocked, "starting", T0);
        move(blocked, "blocked", T0, { waitingFor: { job: "push" } });
        const state = stateOf(push, verify, blocked);
        expect(settleWaits(state, at(1))).toEqual([]);
        // No time span releases it: a year of ticks leaves it blocked and raises no fault.
        const year = at(365 * 24 * 60);
        expect(tickJobs(stateOf(blocked), year, {})).toEqual([]);
        expect(settleWaits(state, year)).toEqual([]);
        const reads = {
            sessionAlive: () => true,
            recovering: () => false,
            waitPending: () => true,
            itemOpen: () => true,
        };
        expect(checkFaults(state, reads, year).filter((f) => f.record === "job blocked")).toEqual([]);
        expect(blocked.state).toBe("blocked");
        move(push, "done", at(2));
        expect(settleWaits(state, at(3)).map((s) => s.job)).toEqual(["blocked"]);
        expect(blocked).toMatchObject({ state: "queued", reason: "blocker push ended" });
    });

    it("re-queues a blocked issue job whose blocker ended even when githerd no longer offers its issue", () => {
        const other = working("other");
        const blocked = newJob({ kind: "issue", target: "#2", id: "issue-2" }, T0);
        move(blocked, "starting", T0);
        move(blocked, "blocked", T0, { waitingFor: { job: "other" } });
        const issue = { state: "open", author: "me", labels: ["enhancement"] };
        const state = { ...stateOf(other, blocked), trust: { login: "me" }, issues: { byNumber: { 2: issue } } };
        move(other, "cancelled", at(1));
        expect(settleWaits(state, at(2)).map((s) => s.line)).toEqual([{ kind: "job-unblocked", job: "issue-2" }]);
        expect(blocked).toMatchObject({ state: "queued" });
    });
});

describe("a checks wait on a pull request the poll has not seen", () => {
    it("is not seen yet until a poll shows it open, and ends only once GitHub says it closed", async () => {
        const byNumber = working("by-number");
        move(byNumber, "waiting", T0, { waitingFor: { checks: "1368" } });
        const bySha = working("by-sha");
        const SHA = "d".repeat(40);
        move(bySha, "waiting", T0, { waitingFor: { checks: SHA } });
        const state = stateOf(byNumber, bySha);
        state.prs = { 7: { headSha: HEAD, required: { "All Checks Pass": "PENDING" } } };
        /** @type {Record<string, string>} what GitHub answers: a pull request's state, a commit's */
        const github = { 1368: "OPEN", [SHA]: "OPEN" };
        /** @type {string[]} */
        const queries = [];
        const gitHub = {
            graphql: async (/** @type {string} */ q) => {
                queries.push(q);
                return {
                    repository: {
                        ...(q.includes("pullRequest(number: 1368)") ? { j0: { state: github[1368] } } : {}),
                        ...(q.includes(SHA)
                            ? {
                                  [q.includes("j1:") ? "j1" : "j0"]: {
                                      associatedPullRequests: { nodes: [{ state: github[SHA] }] },
                                  },
                              }
                            : {}),
                    },
                };
            },
        };
        const poll = async () => {
            await confirmClosedWaits(state, { gitHub, repo: "o/r" });
            return settleWaits(state, at(queries.length + 1));
        };
        // Opened since the last poll: not in the open list, open on GitHub. No news, no requeue.
        expect(await poll()).toEqual([]);
        expect(queries).toHaveLength(1);
        expect([byNumber.state, bySha.state]).toEqual(["waiting", "waiting"]);
        // The poll sees both open with checks running: still waiting, and no fetch of its own.
        state.prs[1368] = { headSha: "e".repeat(40), required: { "All Checks Pass": "PENDING" } };
        state.prs[1370] = { headSha: SHA, required: { "All Checks Pass": "PENDING" } };
        expect(await poll()).toEqual([]);
        expect(queries).toHaveLength(1);
        // Both close: gone from the open list, and GitHub confirms it. Now the news fires.
        state.prs = {};
        Object.assign(github, { 1368: "CLOSED", [SHA]: "MERGED" });
        expect((await poll()).map((s) => s.line.news)).toEqual([
            "#1368 is no longer open",
            "the pull request of ddddddddd is no longer open",
        ]);
        expect([byNumber.state, bySha.state]).toEqual(["working", "working"]);
    });

    it("a failed query confirms nothing", async () => {
        const job = working("job");
        move(job, "waiting", T0, { waitingFor: { checks: "1368" } });
        const state = stateOf(job);
        const gitHub = {
            graphql: async () => {
                throw new Error("502");
            },
        };
        await confirmClosedWaits(state, { gitHub, repo: "o/r" });
        expect(settleWaits(state, at(1))).toEqual([]);
        expect(job.state).toBe("waiting");
    });
});

describe("a wait on a local task", () => {
    it("settles once the task's output file records its exit, and not before", () => {
        const output = join(mkdtempSync(join(tmpdir(), "githerd-task-")), "b1.output");
        const job = working("local");
        move(job, "waiting", T0, { waitingFor: { local: "b1", output } });
        const state = stateOf(job);
        expect(settleWaits(state, at(1))).toEqual([]);
        writeFileSync(output, "Successfully ran target test\n");
        expect(settleWaits(state, at(2))).toEqual([]);
        writeFileSync(output, "Successfully ran target test\n\n\n[exited with code 0]\n");
        expect(settleWaits(state, at(3)).map((s) => [s.job, s.ring])).toEqual([["local", true]]);
        expect(job).toMatchObject({ state: "working" });
        expect(job.news.at(-1).text).toBe("task b1 finished with exit code 0");
    });

    it("settles when the session that ran the task is gone, with no exit recorded", () => {
        const output = join(mkdtempSync(join(tmpdir(), "githerd-task-")), "b2.output");
        writeFileSync(output, "still running\n");
        const job = working("local");
        move(job, "waiting", T0, { waitingFor: { local: "b2", output } });
        const state = stateOf(job);
        expect(settleWaits(state, at(365 * 24 * 60))).toEqual([]);
        job.holder = null;
        expect(settleWaits(state, at(1)).map((s) => s.job)).toEqual(["local"]);
        expect(job.news.at(-1).text).toBe("task b2 ended with its session");
    });
});

describe("checkFaults", () => {
    it("keeps the faults for every surface, pages one that lasted a day, and ends it when it clears", () => {
        const job = starting("x");
        job.clock = null;
        const state = {
            ...stateOf(job),
            mergeGate: { checks: { faults: [{ record: "pr 7", problem: "no status" }] } },
        };
        const reads = {
            sessionAlive: () => true,
            recovering: () => false,
            waitPending: () => true,
            itemOpen: () => true,
        };
        expect(checkFaults(state, reads, T0)).toEqual([
            { record: "job x", problem: "starting with no deadline" },
            { record: "pr 7", problem: "no status" },
        ]);
        expect(state.invariants.faults).toEqual([{ record: "job x", problem: "starting with no deadline" }]);
        expect(state.ownerItems).toBeUndefined();
        checkFaults(state, reads, at(24 * 60));
        expect(Object.keys(state.ownerItems)).toEqual(["fault:job x", "fault:pr 7"]);
        job.clock = { budgetMs: 1, usedMs: 0, at: T0.toISOString() };
        checkFaults(state, reads, at(24 * 60 + 1));
        expect(state.ownerItems["fault:job x"].endedBy).toBe("cleared");
        expect(state.ownerItems["fault:pr 7"].endedAt).toBeUndefined();
    });
});
