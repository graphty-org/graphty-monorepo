import { describe, expect, it } from "vitest";

import {
    checkInvariants,
    claimJob,
    claimSnapshot,
    closesCycle,
    death,
    endAttempt,
    fault,
    githubChanged,
    move,
    newJob,
    pausesFor,
    resumeClocks,
    startPhase,
    STATES,
    TERMINAL,
    tick,
    verifyResult,
} from "../lib/board.mjs";

const T0 = new Date("2026-10-03T12:00:00Z");
const MIN = 60 * 1000;
const at = (minutes) => new Date(T0.getTime() + minutes * MIN);
const HEAD = "a".repeat(40);

/**
 * A job moved through `path` from queued, every step at T0.
 * @param {string[]} path the states to pass through
 * @param {object} [args] newJob arguments
 * @returns {any} the job
 */
function jobIn(path, args = {}) {
    const job = newJob({ kind: "issue", target: "737", ...args }, T0);
    const opts = {
        starting: { holder: { session: "w1", window: "issue-737" } },
        waiting: { waitingFor: { checks: HEAD } },
        parked: { waitingFor: { owner: "item-1" } },
        blocked: { waitingFor: { job: "pr-412" } },
    };
    for (const state of path) move(job, state, T0, opts[state]);
    return job;
}

describe("newJob", () => {
    it("starts queued with the budgets of design 5.3", () => {
        const job = newJob({ kind: "issue", target: "737" }, T0);
        expect(job).toMatchObject({
            id: "issue-737",
            state: "queued",
            stateSince: T0.toISOString(),
            deadline: null,
            holder: null,
            budget: { workingMinutes: 240, attempts: 3 },
        });
        expect(newJob({ kind: "incident", target: "k" }, T0).budget.workingMinutes).toBe(120);
    });

    it("refuses an unknown kind", () => {
        expect(() => newJob({ kind: "chore", target: "x" }, T0)).toThrow("unknown job kind chore");
    });
});

describe("move: every state has a tested exit", () => {
    // Every exit of design 5.3, as [from path, to].
    const EXITS = [
        [[], "starting"],
        [[], "cancelled"],
        [["starting", "blocked"], "queued"],
        [["starting", "blocked"], "cancelled"],
        [["starting", "blocked"], "faulted"],
        [["starting"], "working"],
        [["starting"], "blocked"],
        [["starting"], "queued"],
        [["starting"], "faulted"],
        [["starting"], "cancelled"],
        [["starting", "working"], "waiting"],
        [["starting", "working"], "parked"],
        [["starting", "working"], "verifying"],
        [["starting", "working"], "queued"],
        [["starting", "working"], "failed"],
        [["starting", "working"], "faulted"],
        [["starting", "working"], "cancelled"],
        [["starting", "working", "waiting"], "working"],
        [["starting", "working", "waiting"], "done"],
        [["starting", "working", "waiting"], "faulted"],
        [["starting", "working", "waiting"], "cancelled"],
        [["starting", "working", "parked"], "working"],
        [["starting", "working", "parked"], "parked"],
        [["starting", "working", "parked"], "faulted"],
        [["starting", "working", "parked"], "cancelled"],
        [["starting", "working", "verifying"], "done"],
        [["starting", "working", "verifying"], "working"],
        [["starting", "working", "verifying"], "waiting"],
        [["starting", "working", "verifying"], "queued"],
        [["starting", "working", "verifying"], "failed"],
        [["starting", "working", "verifying"], "faulted"],
        [["starting", "working", "verifying"], "cancelled"],
        [["starting", "faulted"], "queued"],
        [["starting", "faulted"], "failed"],
        [["starting", "faulted"], "cancelled"],
    ];

    it.each(EXITS)("from %j to %s", (path, to) => {
        const job = jobIn(path);
        move(job, to, at(1), to === "waiting" ? { waitingFor: { checks: HEAD } } : {});
        expect(job.state).toBe(to);
        expect(job.stateSince).toBe(at(1).toISOString());
    });

    it("covers every state that is not terminal", () => {
        const from = new Set(EXITS.map(([path]) => path.at(-1) ?? "queued"));
        expect(STATES.filter((s) => !TERMINAL.includes(s) && !from.has(s))).toEqual([]);
    });

    it("refuses an exit the state does not have, and every exit from a terminal state", () => {
        expect(() => move(jobIn([]), "working", T0)).toThrow("no exit from queued to working");
        expect(() => move(jobIn(["starting", "working", "waiting"]), "parked", T0)).toThrow("waiting to parked");
        for (const terminal of TERMINAL) {
            const path = { cancelled: ["cancelled"], done: ["starting", "working", "waiting", "done"] };
            const job = jobIn(path[terminal] ?? ["starting", "working", terminal]);
            expect(() => move(job, "queued", T0)).toThrow(`no exit from ${terminal}`);
        }
    });

    it("drops the holder in the queue and in terminal states, keeps the owner item through a re-park", () => {
        const job = jobIn(["starting", "working", "parked"]);
        move(job, "parked", at(1));
        expect(job.waitingFor).toEqual({ owner: "item-1" });
        expect(job.holder).toMatchObject({ session: "w1" });
        move(job, "cancelled", at(2), { cancelledBy: "pr-412" });
        expect(job).toMatchObject({ holder: null, cancelledBy: "pr-412" });
    });
});

describe("deadlines and what follows them", () => {
    it("blocked: no deadline; it stays blocked however long its blocker runs", () => {
        const job = jobIn(["starting", "blocked"]);
        expect(job).toMatchObject({ clock: null, deadline: null, deadlineAction: null });
        expect(tick(job, at(240))).toBeNull();
        expect(tick(job, at(365 * 24 * 60))).toBeNull();
        expect(job).toMatchObject({ state: "blocked", news: [] });
    });

    it("blocked: a daemon restart drops a clock saved by an older version", () => {
        const job = jobIn(["starting", "blocked"]);
        Object.assign(job, {
            clock: { budgetMs: 240 * MIN, usedMs: 0, at: T0.toISOString() },
            deadline: at(240).toISOString(),
            deadlineAction: "requeue",
        });
        resumeClocks({ jobs: { [job.id]: job } }, at(1));
        expect(job).toMatchObject({ clock: null, deadline: null, deadlineAction: null });
        expect(tick(job, at(10000))).toBeNull();
        expect(job.state).toBe("blocked");
    });

    it("starting: a worktree not ready in 20 minutes faults the job", () => {
        const job = jobIn(["starting"]);
        expect(tick(job, at(20))).toEqual({ action: "faulted", job: "issue-737" });
        expect(job).toMatchObject({ state: "faulted", faults: 1, reason: "worktree not ready within 20 minutes" });
    });

    it("starting: no registry entry in 60 s, or no first call in 3 minutes, is a start failure", () => {
        // 60 s outlasts startWorker's own 30 s poll, so the deadline never fires while it waits.
        const job = jobIn(["starting"]);
        startPhase(job, "registry", T0);
        expect(tick(job, new Date(T0.getTime() + 59 * 1000))).toBeNull();
        expect(tick(job, new Date(T0.getTime() + 60 * 1000))).toEqual({ action: "start-failure", job: job.id });
        expect(job).toMatchObject({ state: "queued", reason: "session start failed" });

        const late = jobIn(["starting"]);
        startPhase(late, "first-call", T0);
        expect(tick(late, at(2))).toBeNull();
        expect(tick(late, at(3))).toMatchObject({ action: "start-failure" });
        expect(() => startPhase(late, "registry", T0)).toThrow("not starting");
    });

    it("working: the clock restarts on a GitHub change, and runs out after 4 hours without one", () => {
        const job = jobIn(["starting", "working"]);
        tick(job, at(200));
        githubChanged(job, at(200));
        expect(tick(job, at(439))).toBeNull();
        expect(tick(job, at(440))).toEqual({ action: "requeue", job: job.id, evidenceFirst: false, theories: [] });
        expect(job.attempts[0].outcome).toBe("no GitHub change within the working budget");
        githubChanged(job, at(441)); // not working: nothing to restart
        expect(job.clock).toBeNull();
    });

    it("working for an owner session: no clock, so nothing ends it on elapsed time", () => {
        const job = newJob({ kind: "issue", target: "737" }, T0);
        move(job, "starting", T0, { holder: { session: "o1", window: null, startedBy: "owner" } });
        move(job, "working", T0);
        expect(job).toMatchObject({ clock: null, deadline: null });
        githubChanged(job, at(10));
        expect(job.clock).toBeNull();
        expect(tick(job, at(24 * 60))).toBeNull();
        expect(job.state).toBe("working");
        // A clock saved before this rule is dropped at the next start.
        job.clock = { budgetMs: 240 * MIN, usedMs: 0, at: T0.toISOString() };
        resumeClocks({ jobs: { [job.id]: job } }, at(1));
        expect(job.clock).toBeNull();
        const facts = {
            sessionAlive: () => true,
            recovering: () => false,
            waitPending: () => true,
            itemOpen: () => true,
        };
        expect(checkInvariants({ jobs: { [job.id]: job } }, facts)).toEqual([]);
    });

    it("working: an incident's budget is 2 hours", () => {
        const job = jobIn(["starting", "working"], { kind: "incident", target: "ci/build" });
        expect(tick(job, at(120))).toMatchObject({ action: "requeue" });
    });

    it("waiting: the bound rings the doorbell, from the condition or a measured bound", () => {
        const checks = jobIn(["starting", "working", "waiting"]);
        expect(tick(checks, at(10))).toEqual({ action: "doorbell", job: checks.id });
        expect(checks.state).toBe("working");

        const local = jobIn(["starting", "working"]);
        move(local, "waiting", T0, { waitingFor: { local: "task-1" } });
        expect(tick(local, at(19))).toBeNull();
        expect(tick(local, at(20))).toMatchObject({ action: "doorbell" });

        const push = jobIn(["starting", "working"]);
        move(push, "waiting", T0, { waitingFor: { push: 7 }, boundMs: 50 * MIN });
        expect(tick(push, at(49))).toBeNull();
        expect(tick(push, at(50))).toMatchObject({ action: "doorbell" });

        const lane = jobIn(["starting", "working"]);
        move(lane, "waiting", T0, { waitingFor: { lane: "GPU" } });
        expect(tick(lane, at(20))).toMatchObject({ action: "doorbell" });
    });

    it("queued, parked and faulted have no deadline", () => {
        for (const job of [jobIn([]), jobIn(["starting", "working", "parked"]), jobIn(["starting", "faulted"])]) {
            expect(job.deadline).toBeNull();
            expect(tick(job, at(10000))).toBeNull();
        }
    });
});

describe("pauses: each holds the clock only where design 5.3 says", () => {
    it.each([
        ["unknown", "github unknown"],
        ["usage", "usage stop"],
        ["paused", "githerd pause"],
    ])("%s holds every clock", (pause, words) => {
        const job = jobIn(["starting", "working"]);
        expect(tick(job, at(300), { [pause]: true })).toBeNull();
        expect(job).toMatchObject({ pausedBy: [words], deadline: null, state: "working" });
        // The paused 300 minutes did not count; the unpaused minute since did.
        expect(tick(job, at(301))).toBeNull();
        expect(job.deadline).toBe(at(300 + 240).toISOString());
    });

    it("a steered job holds its own clock", () => {
        const job = jobIn(["starting", "working"]);
        job.steeredAt = T0.toISOString();
        expect(tick(job, at(500))).toBeNull();
        expect(job.pausedBy).toEqual(["steered"]);
    });

    it("Actions degraded holds only waits on CI", () => {
        const ci = jobIn(["starting", "working", "waiting"]);
        expect(tick(ci, at(30), { actionsDegraded: true })).toBeNull();
        expect(ci.pausedBy).toEqual(["actions degraded"]);
        for (const waitingFor of [{ lane: "GPU" }, { release: HEAD }]) {
            const job = jobIn(["starting", "working"]);
            move(job, "waiting", T0, { waitingFor });
            expect(pausesFor(job, { actionsDegraded: true })).toEqual(["actions degraded"]);
        }
        const local = jobIn(["starting", "working"]);
        move(local, "waiting", T0, { waitingFor: { local: "t" } });
        expect(tick(local, at(30), { actionsDegraded: true })).toMatchObject({ action: "doorbell" });
        const working = jobIn(["starting", "working"]);
        expect(pausesFor(working, { actionsDegraded: true })).toEqual([]);
    });

    it("machine load holds only the start deadlines", () => {
        const starting = jobIn(["starting"]);
        expect(tick(starting, at(60), { load: true })).toBeNull();
        expect(starting.pausedBy).toEqual(["machine load"]);
        const working = jobIn(["starting", "working"]);
        expect(pausesFor(working, { load: true })).toEqual([]);
    });

    it("time before a pause still counts", () => {
        const job = jobIn(["starting", "working"]);
        tick(job, at(100));
        tick(job, at(200), { usage: true });
        expect(tick(job, at(339))).toBeNull();
        expect(tick(job, at(340))).toMatchObject({ action: "requeue" });
    });
});

describe("budgets", () => {
    it("three attempts, the third evidence-first and given the old theories, then failed", () => {
        const job = jobIn(["starting", "working"], {
            kind: "incident",
            target: "ci/build",
            facts: { scope: "master" },
        });
        expect(endAttempt(job, { outcome: "failed", theory: "cache" }, at(1))).toEqual({
            action: "requeue",
            job: job.id,
            evidenceFirst: false,
            theories: ["cache"],
        });
        expect(job).toMatchObject({ state: "queued", fresh: true });
        move(job, "starting", at(2), { holder: { session: "w2" } });
        move(job, "working", at(2));
        expect(endAttempt(job, { outcome: "failed", theory: "lockfile" }, at(3))).toMatchObject({
            evidenceFirst: true,
            theories: ["cache", "lockfile"],
        });
        move(job, "starting", at(4), { holder: { session: "w3" } });
        move(job, "working", at(4));
        expect(endAttempt(job, { outcome: "failed" }, at(5))).toEqual({
            action: "failed",
            job: job.id,
            ownerItem: true,
        });
        expect(job.state).toBe("failed");
        expect(job.attempts.map((a) => a.session)).toEqual(["w1", "w2", "w3"]);
    });

    it("a failed job that is not urgent raises no owner item", () => {
        const job = jobIn(["starting", "working"], { kind: "incident", target: "docs", facts: { scope: "low" } });
        job.budget.attempts = 1;
        expect(endAttempt(job, { outcome: "failed" }, at(1))).toMatchObject({ action: "failed", ownerItem: false });
    });

    it("three counted faults fail the job; faults not counted do not", () => {
        const job = jobIn(["starting"]);
        expect(fault(job, "build failed", at(1))).toEqual({ action: "faulted", job: job.id });
        move(job, "queued", at(2));
        move(job, "starting", at(2), { holder: { session: "w2" } });
        expect(fault(job, "platform down", at(3), { counted: false })).toMatchObject({ action: "faulted" });
        expect(job.faults).toBe(1);
        move(job, "queued", at(4));
        move(job, "starting", at(4), { holder: { session: "w3" } });
        fault(job, "build failed", at(5));
        move(job, "queued", at(6));
        move(job, "starting", at(6), { holder: { session: "w4" } });
        expect(fault(job, "build failed", at(7))).toEqual({ action: "failed", job: job.id, ownerItem: false });
        expect(job).toMatchObject({ state: "failed", faults: 3 });
    });

    it("deaths: resume, then fresh within 30 minutes, then faulted on the third; not attempts", () => {
        const job = jobIn(["starting", "working", "waiting"]);
        expect(death(job, {}, at(1))).toEqual({ action: "resume", job: job.id });
        expect(job).toMatchObject({ state: "waiting", holder: null, fresh: false });
        expect(death(job, { capture: "pane" }, at(20))).toEqual({ action: "fresh", job: job.id });
        expect(death(job, {}, at(200))).toEqual({ action: "faulted", job: job.id });
        expect(job).toMatchObject({ state: "faulted", attempts: [] });
        expect(job.deaths[1].capture).toBe("pane");
    });

    it("deaths while blocked: the third faults it, as in every state that keeps a session", () => {
        const job = jobIn(["starting", "blocked"]);
        job.holder = { session: "w1" };
        death(job, {}, at(1));
        death(job, {}, at(2));
        expect(death(job, {}, at(3))).toEqual({ action: "faulted", job: job.id });
        expect(job).toMatchObject({ state: "faulted", deaths: [{}, {}, {}] });
    });

    it("a daemon restart does not count the time it was down against a deadline", () => {
        const job = jobIn(["starting", "working"]);
        expect(job.deadline).toBe(at(240).toISOString());
        expect(tick(job, at(200))).toBeNull();
        // The daemon was down from minute 200 to minute 500: its view was unknown.
        const state = { jobs: { [job.id]: job, other: { id: "other", clock: null } } };
        resumeClocks(state, at(500));
        expect(tick(job, at(500))).toBeNull();
        expect(job).toMatchObject({ state: "working", attempts: [] });
        expect(job.deadline).toBe(at(540).toISOString());
        expect(tick(job, at(540))).toMatchObject({ action: "requeue" });
    });

    it("a second death after an attempt ended resumes, and within one attempt starts fresh, whatever the time", () => {
        const job = jobIn(["starting", "working"]);
        death(job, {}, at(1));
        job.attempts.push({ outcome: "failed" });
        expect(death(job, {}, at(2))).toMatchObject({ action: "resume" });
        const other = jobIn(["starting", "working"]);
        death(other, {}, at(1));
        expect(death(other, {}, at(10_000))).toMatchObject({ action: "fresh" });
    });
});

describe("verifyResult", () => {
    it("holds: done", () => {
        const job = jobIn(["starting", "working", "verifying"]);
        expect(verifyResult(job, { holds: true }, at(1))).toEqual({ action: "done", job: job.id });
        expect(job.state).toBe("done");
    });

    it("only CI pending: waiting on that head's checks", () => {
        const job = jobIn(["starting", "working", "verifying"]);
        expect(verifyResult(job, { ciPending: HEAD }, at(1))).toMatchObject({ action: "waiting" });
        expect(job).toMatchObject({ state: "waiting", waitingFor: { checks: HEAD } });
    });

    it("missing: back to work with what is missing; the third in a row ends the attempt", () => {
        const job = jobIn(["starting", "working", "verifying"]);
        expect(verifyResult(job, { missing: ["checks red"] }, at(1))).toEqual({
            action: "working",
            job: job.id,
            missing: ["checks red"],
        });
        expect(job.news.at(-1).text).toBe("not done yet: checks red");
        move(job, "verifying", at(2));
        verifyResult(job, { missing: ["x"] }, at(3));
        move(job, "verifying", at(4));
        expect(verifyResult(job, { missing: ["x"] }, at(5))).toMatchObject({ action: "requeue" });
        expect(job.attempts[0].outcome).toBe("done failed to verify 3 times");
    });

    it("no answer for two polls: back to work", () => {
        const job = jobIn(["starting", "working", "verifying"]);
        expect(verifyResult(job, null, at(1))).toBeNull();
        expect(verifyResult(job, null, at(2))).toMatchObject({
            action: "working",
            missing: ["not decided within 2 polls"],
        });
        expect(() => verifyResult(job, null, at(3))).toThrow("not verifying");
    });
});

/**
 * A state with jobs.
 * @param {...any} jobs the jobs
 * @returns {any} the state
 */
const stateOf = (...jobs) => ({ jobs: Object.fromEntries(jobs.map((j) => [j.id, j])) });

describe("claims", () => {
    const plan = "fix the parser";
    const independent = { decision: "independent", reason: "no overlap" };

    it("the snapshot lists jobs in flight and owner sessions with their changed files; its version moves with its content", () => {
        const job = jobIn(["starting"]);
        job.worktree = "/w/issue-737";
        const state = stateOf(job, jobIn([], { target: "800" }));
        const facts = {
            worktrees: [
                { path: "/w/issue-737", branch: null, changedFiles: ["a.mjs"] },
                { path: "/w/owner", branch: "feat/x", changedFiles: ["b.mjs"] },
                { path: "/w/stray", branch: "fix/y", changedFiles: ["c.mjs"] },
                { path: "/w/clean", branch: "z", changedFiles: [] },
            ],
            ownerSessions: [{ name: "owner", cwd: "/w/owner", branch: "feat/x" }],
        };
        const one = claimSnapshot(state, facts);
        expect(one).toEqual({
            version: 1,
            inFlight: [
                {
                    job: "issue-737",
                    target: "737",
                    plan: null,
                    holderWindow: "issue-737",
                    pr: null,
                    changedFiles: ["a.mjs"],
                },
            ],
            ownerSessions: [
                { name: "owner", cwd: "/w/owner", branch: "feat/x", changedFiles: ["b.mjs"] },
                { name: null, cwd: "/w/stray", branch: "fix/y", changedFiles: ["c.mjs"] },
            ],
        });
        expect(claimSnapshot(state, facts).version).toBe(1);
        facts.worktrees[0].changedFiles.push("d.mjs");
        expect(claimSnapshot(state, facts).version).toBe(2);
        expect(claimSnapshot({}, {}).inFlight).toEqual([]);
    });

    it("independent: the worker's job is working, with the claim recorded", () => {
        const job = jobIn(["starting"]);
        const state = stateOf(job);
        const snap = claimSnapshot(state, {});
        const args = { job: job.id, snapshotVersion: snap.version, overlap: independent, plan };
        expect(claimJob(state, args, { session: "w1" }, snap, at(1))).toMatchObject({ ok: true });
        expect(job).toMatchObject({
            state: "working",
            holder: { session: "w1" },
            sessions: ["w1"],
            claim: { session: "w1", plan, overlap: { decision: "independent", with: null }, related: [] },
        });
    });

    it("an owner session takes a queued job", () => {
        const job = jobIn([]);
        const state = stateOf(job);
        const snap = claimSnapshot(state, {});
        const args = { job: job.id, snapshotVersion: snap.version, overlap: independent, plan, related: ["pr-1"] };
        expect(claimJob(state, args, { session: "owner-1" }, snap, at(1)).ok).toBe(true);
        expect(job).toMatchObject({ state: "working", holder: { session: "owner-1", startedBy: "owner" } });
        expect(job.claim.related).toEqual(["pr-1"]);
    });

    it("join: the target moves to the other job, its holder gets news, this job is cancelled", () => {
        const mine = jobIn(["starting"]);
        const other = jobIn(["starting", "working"], { kind: "pr", target: "412" });
        const state = stateOf(mine, other);
        const snap = claimSnapshot(state, {});
        const args = {
            job: mine.id,
            snapshotVersion: snap.version,
            overlap: { decision: "join", with: "pr-412", reason: "same parser" },
            plan,
        };
        expect(claimJob(state, args, { session: "w1" }, snap, at(1)).ok).toBe(true);
        expect(mine).toMatchObject({ state: "cancelled", cancelledBy: "pr-412", holder: null });
        expect(other.joined).toEqual(["737"]);
        expect(other.news[0].text).toContain("job issue-737 joined yours");
    });

    it("wait: blocked on the other job with no time limit", () => {
        const mine = jobIn(["starting"]);
        const other = jobIn(["starting", "working"], { kind: "pr", target: "412" });
        const state = stateOf(mine, other);
        const snap = claimSnapshot(state, {});
        const overlap = { decision: "wait", with: "pr-412", reason: "base first" };
        claimJob(state, { job: mine.id, snapshotVersion: snap.version, overlap, plan }, { session: "w1" }, snap, at(1));
        expect(mine).toMatchObject({
            state: "blocked",
            waitingFor: { job: "pr-412" },
            deadline: null,
        });
    });

    it("refuses a stale snapshot, with the current one, and changes nothing", () => {
        const job = jobIn(["starting"]);
        const state = stateOf(job);
        const snap = claimSnapshot(state, {});
        const answer = claimJob(
            state,
            { job: job.id, snapshotVersion: 0, overlap: independent, plan },
            { session: "w1" },
            snap,
            at(1),
        );
        expect(answer).toEqual({ ok: false, reason: "snapshot 0 is stale; judge again on 1", snapshot: snap });
        expect(job.state).toBe("starting");
        expect(job.claim).toBeNull();
    });

    it("refuses a wait that would close a cycle", () => {
        const a = jobIn(["starting"], { target: "1" });
        const b = jobIn(["starting", "blocked"], { target: "2" });
        b.waitingFor = { job: "issue-3" };
        const c = jobIn(["starting", "working", "waiting"], { target: "3" });
        c.waitingFor = { job: "issue-1" };
        const state = stateOf(a, b, c);
        expect(closesCycle(state, "issue-1", "issue-2")).toBe(true);
        expect(closesCycle(state, "issue-3", "issue-1")).toBe(false);
        const snap = claimSnapshot(state, {});
        const overlap = { decision: "wait", with: "issue-2", reason: "r" };
        const answer = claimJob(
            state,
            { job: "issue-1", snapshotVersion: snap.version, overlap, plan },
            { session: "w1" },
            snap,
            at(1),
        );
        expect(answer).toMatchObject({
            ok: false,
            reason: "waiting on issue-2 closes a cycle: it already waits on issue-1",
        });
        expect(a.state).toBe("starting");
    });

    it("a cycle already in the graph does not loop the check", () => {
        const a = jobIn(["starting", "blocked"], { target: "1" });
        a.waitingFor = { job: "issue-2" };
        const b = jobIn(["starting", "blocked"], { target: "2" });
        b.waitingFor = { job: "issue-1" };
        expect(closesCycle(stateOf(a, b), "issue-9", "issue-1")).toBe(false);
    });

    it("refuses an unknown job, another session's start, a state that cannot be claimed, and a bad other job", () => {
        const job = jobIn(["starting"]);
        const done = jobIn(["starting", "working", "waiting", "done"], { target: "9" });
        const state = stateOf(job, done);
        const snap = claimSnapshot(state, {});
        const base = { snapshotVersion: snap.version, overlap: independent, plan };
        const ask = (args, session = "w1") =>
            claimJob(state, { job: job.id, ...base, ...args }, { session }, snap, at(1));
        expect(ask({ job: "nope" })).toEqual({ ok: false, reason: "no job nope" });
        expect(ask({}, "w2").reason).toBe("issue-737 was started for session w1");
        expect(ask({ job: done.id }).reason).toBe("issue-9 is done, not claimable");
        expect(ask({ overlap: { decision: "join", reason: "r" } }).reason).toBe(
            'join needs another open job in "with", not nothing',
        );
        expect(ask({ overlap: { decision: "wait", with: "issue-9", reason: "r" } }).reason).toContain("not issue-9");
        expect(ask({ overlap: { decision: "join", with: job.id, reason: "r" } }).ok).toBe(false);
        expect(job.state).toBe("starting");
    });
});

describe("checkInvariants", () => {
    const facts = {
        sessionAlive: (s) => s === "w1",
        recovering: (id) => id === "issue-5",
        waitPending: (job) => job.waitingFor?.checks === HEAD,
        itemOpen: (item) => item === "item-1",
    };

    it("finds nothing wrong with healthy records", () => {
        const jobs = [
            jobIn([]),
            jobIn(["starting"], { target: "1" }),
            jobIn(["starting", "blocked"], { target: "2" }),
            jobIn(["starting", "working"], { target: "3" }),
            jobIn(["starting", "working", "waiting"], { target: "4" }),
            jobIn(["starting", "working", "parked"], { target: "6" }),
            jobIn(["starting", "working", "verifying"], { target: "7" }),
            jobIn(["starting", "faulted"], { target: "8" }),
            jobIn(["cancelled"], { target: "9" }),
        ];
        const recovering = jobIn(["starting", "working"], { target: "5" });
        recovering.holder = null;
        const state = {
            ...stateOf(...jobs, recovering),
            orders: [{ id: "o1", issues: [737, 99], reasons: { 99: "closed" } }],
        };
        expect(checkInvariants(state, facts)).toEqual([]);
        expect(checkInvariants({}, facts)).toEqual([]);
    });

    it("every violation is a fault naming its record", () => {
        const unknown = jobIn([], { target: "1" });
        unknown.state = "lost";
        const noDeadline = jobIn(["starting", "working"], { target: "2" });
        noDeadline.clock = null;
        const blocked = jobIn(["starting", "blocked"], { target: "3" });
        blocked.waitingFor = null;
        const starting = jobIn(["starting"], { target: "4" });
        starting.holder = null;
        starting.phase = "first-call";
        // Before the session registered, a starting job has none yet.
        const preparing = jobIn(["starting"], { target: "5" });
        preparing.holder = null;
        preparing.phase = "worktree";
        const dead = jobIn(["starting", "working"], { target: "6" });
        dead.holder = { session: "gone" };
        const settled = jobIn(["starting", "working"], { target: "7" });
        move(settled, "waiting", T0, { waitingFor: { lane: "GPU" } });
        const undeclared = jobIn(["starting", "working", "waiting"], { target: "8" });
        undeclared.waitingFor = null;
        const parked = jobIn(["starting", "working"], { target: "10" });
        move(parked, "parked", T0, { waitingFor: { owner: "item-2" } });
        const state = {
            ...stateOf(unknown, noDeadline, blocked, starting, preparing, dead, settled, undeclared, parked),
            orders: [{ id: "o1", issues: [42] }],
        };
        expect(checkInvariants(state, facts)).toEqual([
            { record: "job issue-1", problem: "unknown state lost" },
            { record: "job issue-2", problem: "working with no deadline" },
            { record: "job issue-3", problem: "blocked on nothing named" },
            { record: "job issue-4", problem: "starting with no session" },
            { record: "job issue-6", problem: "working, but its session is gone and no recovery runs" },
            { record: "job issue-7", problem: "still waiting on lane GPU, which has settled" },
            { record: "job issue-8", problem: "waiting on nothing declared" },
            { record: "job issue-10", problem: "parked, but its owner item is not open" },
            { record: "order o1", problem: "issue #42 has no job and no reason" },
        ]);
    });
});
