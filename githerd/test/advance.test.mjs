import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkFaults, noteGitHubChanges, settleWaits, tickJobs } from "../lib/advance.mjs";
import { move, newJob } from "../lib/board.mjs";

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

describe("tickJobs", () => {
    it("rings a wait past its bound and ends an attempt with no GitHub change, retiring its session", () => {
        const wait = working("w");
        move(wait, "waiting", T0, { waitingFor: { checks: HEAD } });
        const stuck = working("x");
        const state = stateOf(wait, stuck);
        expect(tickJobs(state, at(9), {})).toEqual([]);
        const fired = tickJobs(state, at(10), {});
        expect(fired.map((f) => [f.job, f.action, f.ring])).toEqual([["w", "doorbell", true]]);
        expect(wait.state).toBe("working");
        // The rung job works again on a fresh 4-hour clock; the other one's ran out.
        const later = tickJobs(state, at(4 * 60), {});
        expect(later.map((f) => [f.job, f.action])).toEqual([["x", "requeue"]]);
        expect(stuck).toMatchObject({ state: "queued", fresh: true, holder: null });
        expect(state.retiring.map((r) => r.job)).toEqual(["x"]);
    });

    it("counts no time while GitHub is unknown, a usage stop holds or githerd is paused", () => {
        const job = working("x");
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
});

describe("noteGitHubChanges", () => {
    it("restarts a working job's no-change clock when its pull request's head or checks move", () => {
        const job = working("x", { pr: 7 });
        const state = stateOf(job);
        state.prs[7] = { headSha: HEAD, required: { "All Checks Pass": "PENDING" } };
        noteGitHubChanges(state, T0);
        tickJobs(state, at(60), {});
        expect(job.clock.usedMs).toBe(60 * MIN);
        state.prs[7].required = { "All Checks Pass": "SUCCESS" };
        noteGitHubChanges(state, at(60));
        expect(job.clock.usedMs).toBe(0);
    });
});

describe("checkFaults", () => {
    it("keeps the faults for every surface, pages one that lasted a day, and ends it when it clears", () => {
        const job = working("x");
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
            { record: "job x", problem: "working with no deadline" },
            { record: "pr 7", problem: "no status" },
        ]);
        expect(state.invariants.faults).toEqual([{ record: "job x", problem: "working with no deadline" }]);
        expect(state.ownerItems).toBeUndefined();
        checkFaults(state, reads, at(24 * 60));
        expect(Object.keys(state.ownerItems)).toEqual(["fault:job x", "fault:pr 7"]);
        job.clock = { budgetMs: 1, usedMs: 0, at: T0.toISOString() };
        checkFaults(state, reads, at(24 * 60 + 1));
        expect(state.ownerItems["fault:job x"].endedBy).toBe("cleared");
        expect(state.ownerItems["fault:pr 7"].endedAt).toBeUndefined();
    });
});
