import { describe, expect, it } from "vitest";

import {
    askStep,
    atActiveCap,
    carryGitherdMoves,
    disown,
    inviteStep,
    markMine,
    statusStep,
    tellAccepted,
    tellCancelled,
} from "../lib/asks.mjs";
import { move, newJob } from "../lib/board.mjs";
import { askFor, jobInUse, prInUse } from "../lib/queue.mjs";

const NOW = new Date("2026-10-05T12:04:00Z");
const HEAD = "a".repeat(40);
const SESSIONS = [
    { pid: 1, sessionId: "s1", name: "graphty-13", cwd: "/r", socket: "/s1.sock", status: "idle" },
    { pid: 2, sessionId: "s2", name: "graphty-14", cwd: "/r/.worktrees/x", socket: "/s2.sock", status: "busy" },
];

/**
 * A state with a queued pr job on #710, whose required check failed on a head someone else pushed.
 * @returns {any} the state
 */
function failed() {
    const job = Object.assign(newJob({ kind: "pr", target: "#710", id: "pr-710" }, NOW), { pr: 710 });
    return {
        jobs: { "pr-710": job },
        prs: {
            710: {
                headSha: HEAD,
                headRef: "feat/cytoscape-adapter",
                headCommitter: "owner@example.com",
                required: { "All Checks Pass": "FAILURE", "Lint PR Title": "SUCCESS" },
            },
        },
    };
}

/**
 * A fake messaging layer: the sessions it lists and every message it delivers.
 * @param {string[]} [refuse] sockets that refuse
 * @returns {{sent: [string, string][], opts: (over?: any) => any}} the fake
 */
function fake(refuse = []) {
    /** @type {[string, string][]} */
    const sent = [];
    const transport = {
        send: async (/** @type {string} */ socket, /** @type {string} */ text) => {
            if (refuse.includes(socket)) throw new Error("connect ECONNREFUSED");
            sent.push([socket, text]);
        },
    };
    return {
        sent,
        opts: (over = {}) => ({
            now: NOW,
            acting: true,
            sessions: () => SESSIONS,
            transport,
            sessionGone: () => false,
            ...over,
        }),
    };
}

describe("a durable owner record", () => {
    it("keeps a pull request in use and unasked across a new push, until its session ends", async () => {
        const state = failed();
        state.prOwners = { 710: { session: "s1", name: "graphty-13", at: NOW.toISOString(), by: "cli" } };
        const f = fake();
        expect(await askStep(state, f.opts())).toEqual([]);
        state.prs[710].headSha = "b".repeat(40);
        expect(await askStep(state, f.opts())).toEqual([]);
        expect(f.sent).toEqual([]);
        const later = new Date(NOW.getTime() + 24 * 3_600_000);
        expect(prInUse(state, 710, { now: later })).toBe("session graphty-13 owns it (the owner said so)");
        const gone = await askStep(state, f.opts({ sessionGone: (/** @type {string} */ s) => s === "s1" }));
        expect(gone[0]).toEqual({
            kind: "pr-owner-dropped",
            pr: 710,
            session: "s1",
            name: "graphty-13",
            reason: "session ended",
        });
        expect(state.prOwners).toEqual({});
        // Unowned again, the failed head is asked about.
        expect(gone.map((l) => l.kind)).toContain("pr-asked");
    });

    it("drops when the pull request closes", async () => {
        const state = failed();
        state.prOwners = { 710: { session: "s1", name: "graphty-13", at: NOW.toISOString(), by: "tool" } };
        delete state.prs[710];
        const lines = await askStep(state, fake().opts());
        expect(lines).toEqual([
            { kind: "pr-owner-dropped", pr: 710, session: "s1", name: "graphty-13", reason: "closed" },
        ]);
        expect(state.prOwners).toEqual({});
    });
});

describe("asking the live sessions whose a failed pull request is", () => {
    it("asks every live session once per failed head, and records the question", async () => {
        const state = failed();
        const f = fake();
        const lines = await askStep(state, f.opts());
        const text =
            "githerd: CI failed on #710 (feat/cytoscape-adapter) at aaaaaaa: All Checks Pass. If you are working on " +
            "it, call the githerd_mine tool with pr 710 (or claim job pr-710 with githerd_claim); a session without " +
            "githerd's tools runs `githerd mine 710` instead. Otherwise ignore this.";
        expect(f.sent).toEqual([
            ["/s1.sock", text],
            ["/s2.sock", text],
        ]);
        expect(state.asks[710]).toEqual({
            head: HEAD,
            failing: ["All Checks Pass"],
            askedAt: NOW.toISOString(),
            sessions: ["graphty-13", "graphty-14"],
            sent: ["graphty-13", "graphty-14"],
            failed: [],
            owner: null,
        });
        expect(lines).toEqual([
            {
                kind: "pr-asked",
                pr: 710,
                head: HEAD,
                sessions: ["graphty-13", "graphty-14"],
                sent: ["graphty-13", "graphty-14"],
                failed: [],
            },
        ]);
        expect(prInUse(state, 710, { now: NOW })).toBe(
            "CI failed on aaaaaaa; asked 2 sessions at 12:04 UTC; no owner yet",
        );
        // Asked once per head.
        expect(await askStep(state, f.opts())).toEqual([]);
        expect(f.sent).toHaveLength(2);
        // After the wait with no answer, the pull request is offered.
        expect(prInUse(state, 710, { now: new Date(NOW.getTime() + 10 * 60_000) })).toBeNull();
    });

    it("in dry-run sends nothing and records a would-do line", async () => {
        const state = failed();
        const f = fake();
        const lines = await askStep(state, f.opts({ acting: false }));
        expect(f.sent).toEqual([]);
        expect(lines[0]).toEqual({
            kind: "would-do",
            group: "workers",
            op: "ask 2 session(s) whose #710 is",
            pr: 710,
        });
        expect(state.asks[710].sessions).toEqual(["graphty-13", "graphty-14"]);
        // Nobody heard it: silence never frees the pull request, however long it lasts.
        const later = new Date(NOW.getTime() + 24 * 3_600_000);
        expect(prInUse(state, 710, { now: later })).toBe(
            "CI failed on aaaaaaa; would ask the sessions in this repository whose it is; asks are dry-run",
        );
        // Once asks act, the question goes out for real.
        await askStep(state, f.opts());
        expect(f.sent).toHaveLength(2);
        expect(state.asks[710].dryRun).toBeUndefined();
    });

    it("asks about a conflicting head someone else pushed, as about a failed one", async () => {
        const state = failed();
        Object.assign(state.prs[710], { required: {}, conflictSightings: 2, baseRef: "master" });
        const f = fake();
        await askStep(state, f.opts());
        expect(f.sent[0][1]).toBe(
            "githerd: #710 (feat/cytoscape-adapter) at aaaaaaa conflicts with master. If you are working on it, call " +
                "the githerd_mine tool with pr 710 (or claim job pr-710 with githerd_claim); a session without " +
                "githerd's tools runs `githerd mine 710` instead. Otherwise ignore this.",
        );
        expect(prInUse(state, 710, { now: NOW })).toBe(
            "aaaaaaa conflicts with master; asked 2 sessions at 12:04 UTC; no owner yet",
        );
    });

    it("counts only the sessions it reached, and offers at once when it reached none", async () => {
        const state = failed();
        const f = fake(["/s1.sock", "/s2.sock"]);
        await askStep(state, f.opts());
        expect(state.asks[710].failed.map((/** @type {any} */ x) => x.name)).toEqual(["graphty-13", "graphty-14"]);
        expect(prInUse(state, 710, { now: NOW })).toBeNull();
    });

    it("never asks about a claimed pull request, githerd's own head, or a green one", async () => {
        const f = fake();
        const claimed = failed();
        const other = Object.assign(newJob({ kind: "issue", target: "#5", id: "issue-5" }, NOW), { pr: 710 });
        move(other, "starting", NOW, { holder: { session: "w1", startedBy: "githerd" } });
        claimed.jobs["issue-5"] = other;
        const own = failed();
        own.pushedByGitherd = { [HEAD]: "#710" };
        const green = failed();
        green.prs[710].required["All Checks Pass"] = "SUCCESS";
        for (const state of [claimed, own, green]) expect(await askStep(state, f.opts())).toEqual([]);
        expect(f.sent).toEqual([]);
    });

    it("an answer lapses when its session ends, and a new push forgets the question", async () => {
        const state = failed();
        const f = fake();
        await askStep(state, f.opts());
        state.asks[710].owner = { session: "s1", name: "graphty-13", at: NOW.toISOString() };
        expect(await askStep(state, f.opts())).toEqual([]);
        expect(prInUse(state, 710, { now: new Date(NOW.getTime() + 60 * 60_000) })).toBe(
            "session graphty-13 said it is working on it",
        );
        const lapsed = await askStep(state, f.opts({ sessionGone: (/** @type {string} */ s) => s === "s1" }));
        expect(lapsed).toEqual([{ kind: "pr-owner-lapsed", pr: 710, head: HEAD, session: "s1" }]);
        expect(prInUse(state, 710, { now: new Date(NOW.getTime() + 60 * 60_000) })).toBeNull();
        // A new push: the question goes, and the new head is asked about anew.
        state.prs[710].headSha = "b".repeat(40);
        const again = await askStep(state, f.opts());
        expect(again.map((l) => l.kind)).toEqual(["pr-asked"]);
        expect(state.asks[710].head).toBe("b".repeat(40));
        expect(f.sent).toHaveLength(4);
    });
});

describe("inviting idle sessions to pull work", () => {
    /**
     * A state with queued jobs.
     * @param {...string} ids the jobs
     * @returns {any} the state
     */
    const queued = (...ids) => ({
        jobs: Object.fromEntries(ids.map((id) => [id, newJob({ kind: "issue", target: "#1", id }, NOW)])),
    });
    const offered = [
        { job: "issue-5", reason: "high bug" },
        { job: "triage-new-1", reason: "triage of new issues" },
    ];

    it("tells only the idle sessions, once per job, and keeps the last invitation for the board", async () => {
        const state = queued("issue-5", "triage-new-1");
        const f = fake();
        const lines = await inviteStep(state, { ...f.opts(), offered });
        expect(f.sent).toEqual([
            [
                "/s1.sock",
                "githerd has work queued (issue-5, high bug). If you're free, call githerd_next and claim a job; otherwise ignore this.",
            ],
            [
                "/s1.sock",
                "githerd has work queued (triage-new-1, triage of new issues). If you're free, call githerd_next and claim a job; otherwise ignore this.",
            ],
        ]);
        expect(lines.map((l) => [l.kind, l.job, l.sent])).toEqual([
            ["sessions-invited", "issue-5", ["graphty-13"]],
            ["sessions-invited", "triage-new-1", ["graphty-13"]],
        ]);
        expect(state.invited).toEqual({ at: NOW.toISOString(), count: 1, acting: true });
        // Never twice for the same job.
        expect(await inviteStep(state, { ...f.opts(), offered })).toEqual([]);
        expect(f.sent).toHaveLength(2);
    });

    it("names a verdict job's exact failure key in its invitation", async () => {
        const KEY = "CI / Build / Security audit";
        const id = "verdict-ci-build-security-audit";
        const state = {
            jobs: { [id]: newJob({ kind: "incident", target: KEY, id, facts: { scope: "verdict" } }, NOW) },
        };
        const f = fake();
        await inviteStep(state, { ...f.opts(), offered: [{ job: id, reason: "master red" }] });
        expect(f.sent[0][1]).toContain(`githerd_verdict takes its key exactly: ${KEY}.`);
    });

    it("waits for an idle session, and skips a job that left the queue", async () => {
        const state = queued("issue-5", "triage-new-1");
        move(state.jobs["triage-new-1"], "starting", NOW, { holder: { session: "w1", nonce: "n" } });
        const f = fake();
        const busy = () => SESSIONS.map((s) => ({ ...s, status: "busy" }));
        expect(await inviteStep(state, { ...f.opts({ sessions: busy }), offered })).toEqual([]);
        expect(state.jobs["issue-5"].invited).toBeUndefined();
        await inviteStep(state, { ...f.opts(), offered });
        expect(f.sent.map(([, t]) => t.split(",")[0])).toEqual(["githerd has work queued (issue-5"]);
    });

    it("in dry-run sends nothing and writes one would-do per job", async () => {
        const state = queued("issue-5");
        const f = fake();
        const lines = await inviteStep(state, { ...f.opts({ acting: false }), offered });
        expect(f.sent).toEqual([]);
        expect(lines[0]).toMatchObject({
            kind: "would-do",
            group: "workers",
            op: "invite 1 idle session(s) to take issue-5",
        });
        expect(state.invited).toMatchObject({ count: 1, acting: false });
    });

    /**
     * A queued review of #1082, a pull request session s1 wrote (it held the pr job that made it).
     * @returns {any} the state
     */
    function ownReview() {
        const review = Object.assign(newJob({ kind: "review", target: "#1082", id: "review-1082" }, NOW), { pr: 1082 });
        const made = Object.assign(newJob({ kind: "pr", target: "#1082", id: "pr-1082" }, NOW), {
            pr: 1082,
            state: "done",
            sessions: ["s1"],
        });
        return { jobs: { "review-1082": review, "pr-1082": made } };
    }
    const review = [{ job: "review-1082", reason: "review" }];
    const allIdle = () => SESSIONS.map((s) => ({ ...s, status: "idle" }));

    it("never invites a review's author, only the other idle sessions", async () => {
        const state = ownReview();
        const f = fake();
        const lines = await inviteStep(state, { ...f.opts({ sessions: allIdle }), offered: review });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);
        expect(lines).toMatchObject([{ kind: "sessions-invited", job: "review-1082", sessions: ["graphty-14"] }]);
    });

    it("invites a busy session while its last capacity answer leaves room, less the jobs it claimed since", async () => {
        const state = queued("issue-5", "triage-new-1", "issue-6");
        const f = fake();
        // s2 is busy; it answered the status question with room for one more job.
        state.capacity = { s2: { n: 1, at: NOW.toISOString() } };
        await inviteStep(state, { ...f.opts(), offered: offered.slice(0, 1) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock", "/s2.sock"]);

        // It claims a job: no room left, so the next job reaches the idle session only.
        state.jobs["triage-new-1"].claim = { session: "s2", at: NOW.toISOString() };
        await inviteStep(state, { ...f.opts(), offered: [{ job: "issue-6", reason: "bug" }] });
        expect(f.sent.slice(2).map(([socket]) => socket)).toEqual(["/s1.sock"]);

        // It answers again with room: invited again.
        state.capacity.s2 = { n: 1, at: new Date(NOW.getTime() + 60_000).toISOString() };
        await inviteStep(state, { ...f.opts(), offered: [{ job: "triage-new-1", reason: "triage" }] });
        expect(f.sent.slice(3).map(([socket]) => socket)).toEqual(["/s1.sock", "/s2.sock"]);
    });

    it("does not invite a busy session that answered capacity 0, nor one that never answered", async () => {
        const state = queued("issue-5");
        const f = fake();
        const busy = () => SESSIONS.map((s) => ({ ...s, status: "busy" }));
        state.capacity = { s1: { n: 0, at: NOW.toISOString() } };
        expect(await inviteStep(state, { ...f.opts({ sessions: busy }), offered })).toEqual([]);
        expect(f.sent).toEqual([]);
        expect(state.jobs["issue-5"].invited).toBeUndefined();
        // An idle session is invited whatever it answered.
        await inviteStep(state, { ...f.opts(), offered });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock"]);
    });

    it("forgets the capacity answer of a session that ended", async () => {
        const state = {
            jobs: {},
            capacity: { s1: { n: 2, at: NOW.toISOString() }, s2: { n: 1, at: NOW.toISOString() } },
        };
        await askStep(state, fake().opts({ sessionGone: (/** @type {string} */ s) => s === "s1" }));
        expect(Object.keys(state.capacity)).toEqual(["s2"]);
    });

    const later = (/** @type {number} */ min) => new Date(NOW.getTime() + min * 60_000);
    const busy = () => SESSIONS.map((s) => ({ ...s, status: "busy" }));

    it("invites a session again after it declined, once a capacity answer reports more room", async () => {
        const state = queued("issue-5");
        const f = fake();
        await inviteStep(state, { ...f.opts(), offered });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock"]);
        // s1 got busy without claiming, and answered that it has no room: nothing.
        state.capacity = { s1: { n: 0, at: later(10).toISOString() } };
        await inviteStep(state, { ...f.opts({ sessions: busy }), offered, now: later(11) });
        expect(f.sent).toHaveLength(1);
        // Then it answers with room for one more job: invited again to the job it heard before.
        state.capacity.s1 = { n: 1, at: later(20).toISOString() };
        const lines = await inviteStep(state, { ...f.opts({ sessions: busy }), offered, now: later(21) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock", "/s1.sock"]);
        expect(lines).toMatchObject([{ kind: "sessions-invited", job: "issue-5", sessions: ["graphty-13"] }]);
        expect(state.jobs["issue-5"].invited).toEqual({ s1: later(21).toISOString() });
    });

    it("does not invite again for the same capacity answer given twice", async () => {
        const state = queued("issue-5");
        const f = fake();
        state.capacity = { s2: { n: 1, at: NOW.toISOString() } };
        await inviteStep(state, { ...f.opts({ sessions: busy }), offered });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);
        state.capacity.s2 = { n: 1, at: later(15).toISOString() };
        expect(await inviteStep(state, { ...f.opts({ sessions: busy }), offered, now: later(16) })).toEqual([]);
        expect(f.sent).toHaveLength(1);
    });

    it("re-invites an idle session with room only after its room changes, and invites one going idle at once", async () => {
        const state = queued("issue-5");
        const f = fake();
        // s1 is idle with room for one; it heard issue-5 and did not take it.
        state.capacity = { s1: { n: 1, at: NOW.toISOString() } };
        const idle = () => SESSIONS.map((s) => ({ ...s, status: s.sessionId === "s1" ? "idle" : "busy" }));
        await inviteStep(state, { ...f.opts({ sessions: idle }), offered });
        for (const min of [1, 2, 3])
            await inviteStep(state, { ...f.opts({ sessions: idle }), offered, now: later(min) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock"]);
        // A busy turn and back to idle is not new room.
        await inviteStep(state, { ...f.opts({ sessions: busy }), offered, now: later(4) });
        await inviteStep(state, { ...f.opts({ sessions: idle }), offered, now: later(5) });
        expect(f.sent).toHaveLength(1);
        // s2, busy with no room, goes idle while issue-5 is queued: invited on that poll.
        const both = () => SESSIONS.map((s) => ({ ...s, status: "idle" }));
        await inviteStep(state, { ...f.opts({ sessions: both }), offered, now: later(6) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock", "/s2.sock"]);
    });

    /**
     * s2 (registry status `shell`, running a watcher) answered capacity 0 at NOW while holding
     * issue-1, and issue-5 is queued.
     * @param {any} [said] its capacity answer
     * @returns {any} the state
     */
    function heldAtAnswer(said) {
        const state = queued("issue-5", "issue-1");
        move(state.jobs["issue-1"], "starting", NOW, { holder: { session: "s2", nonce: "n" } });
        move(state.jobs["issue-1"], "working", NOW);
        state.jobs["issue-1"].claim = { session: "s2", at: NOW.toISOString() };
        state.capacity = { s2: said ?? { n: 0, at: later(1).toISOString(), held: ["issue-1"] } };
        return state;
    }
    const shell = () => SESSIONS.map((s) => ({ ...s, status: s.sessionId === "s2" ? "shell" : "busy" }));

    it("does not invite a session running a shell command as idle", async () => {
        const state = queued("issue-5");
        const f = fake();
        expect(await inviteStep(state, { ...f.opts({ sessions: shell }), offered })).toEqual([]);
        expect(f.sent).toEqual([]);
    });

    it("asks a session again once the jobs its capacity answer counted have ended, and only once", async () => {
        const state = heldAtAnswer();
        const f = fake();
        // While it still holds issue-1, its answer of 0 holds.
        expect(await inviteStep(state, { ...f.opts({ sessions: shell }), offered, now: later(2) })).toEqual([]);
        // issue-1 ends: the answer is stale, so s2 hears the queued job once.
        move(state.jobs["issue-1"], "verifying", later(3));
        move(state.jobs["issue-1"], "done", later(3));
        await inviteStep(state, { ...f.opts({ sessions: shell }), offered, now: later(4) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);
        expect(await inviteStep(state, { ...f.opts({ sessions: shell }), offered, now: later(5) })).toEqual([]);
        // A new answer governs: 0 again stays quiet.
        state.capacity.s2 = { n: 0, at: later(6).toISOString(), held: [] };
        expect(await inviteStep(state, { ...f.opts({ sessions: shell }), offered, now: later(7) })).toEqual([]);
        expect(f.sent).toHaveLength(1);
    });

    it("reads an answer without its held jobs as counting the jobs the session had claimed by then", async () => {
        const state = heldAtAnswer({ n: 0, at: later(1).toISOString() });
        const f = fake();
        expect(await inviteStep(state, { ...f.opts({ sessions: shell }), offered, now: later(2) })).toEqual([]);
        move(state.jobs["issue-1"], "queued", later(3), { reason: "released" });
        await inviteStep(state, { ...f.opts({ sessions: shell }), offered: offered.slice(0, 1), now: later(4) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);
    });

    it("counts a job's older invitedAt as heard by every session", async () => {
        const state = queued("issue-5");
        state.jobs["issue-5"].invitedAt = NOW.toISOString();
        const f = fake();
        // s1, idle, is first seen at the moment the job was announced: it heard it.
        expect(await inviteStep(state, { ...f.opts(), offered })).toEqual([]);
        expect(await inviteStep(state, { ...f.opts(), offered, now: later(1) })).toEqual([]);
        // A capacity answer with room is new room: invited after all.
        state.capacity = { s2: { n: 1, at: later(2).toISOString() } };
        await inviteStep(state, { ...f.opts(), offered, now: later(3) });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);
    });

    it("never invites a session holding workers.maxActive active jobs; blocked and parked jobs do not count", async () => {
        const state = queued("issue-5");
        const f = fake();
        const config = { workers: { maxActive: 2 } };
        // s2 has room by its capacity answer, but works two jobs: not invited, whatever it said.
        state.capacity = { s2: { n: 5, at: NOW.toISOString() } };
        const hold = (/** @type {string} */ id, /** @type {string} */ st) => {
            state.jobs[id] = {
                ...newJob({ kind: "issue", target: "#9", id }, NOW),
                state: st,
                holder: { session: "s2" },
            };
        };
        hold("issue-a", "working");
        hold("issue-b", "starting");
        await inviteStep(state, { ...f.opts(), offered: offered.slice(0, 1), config });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock"]);

        // One of them is blocked, another parked: they do not count, so s2 is invited again.
        state.jobs["issue-b"].state = "blocked";
        hold("issue-c", "parked");
        state.jobs["issue-6"] = newJob({ kind: "issue", target: "#6", id: "issue-6" }, NOW);
        await inviteStep(state, { ...f.opts(), offered: [{ job: "issue-6", reason: "bug" }], config });
        expect(f.sent.slice(1).map(([socket]) => socket)).toEqual(["/s1.sock", "/s2.sock"]);
    });

    it("does not count jobs waiting in the push queue or for CI toward workers.maxActive", async () => {
        const state = queued("issue-5");
        const f = fake();
        const config = { workers: { maxActive: 2 } };
        const busy = () => SESSIONS.map((s) => ({ ...s, status: "busy" }));
        state.capacity = { s2: { n: 1, at: NOW.toISOString() } };
        const hold = (/** @type {string} */ id, /** @type {any} */ more = {}) => {
            state.jobs[id] = {
                ...newJob({ kind: "pr", target: "#9", id }, NOW),
                state: "working",
                holder: { session: "s2" },
                ...more,
            };
        };
        hold("pr-21", { pr: 21 });
        hold("pr-22", { pr: 22 });
        state.prs = { 21: { headRef: "feat/a", required: {} }, 22: { headRef: "feat/b", required: {} } };
        expect(atActiveCap(state, "s2", config)).toMatch(/you hold 2 active jobs/);

        // Both branches have tickets in the push queue: under the cap, and invited on its capacity.
        state.pushTickets = [
            { branch: "feat/a", cwd: "/r/.worktrees/feat-a", session: "s2" },
            { branch: "feat/b", cwd: "/r/.worktrees/feat-b", session: "s2" },
        ];
        expect(atActiveCap(state, "s2", config)).toBeNull();
        await inviteStep(state, { ...f.opts({ sessions: busy }), offered: offered.slice(0, 1), config });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);

        // A job with no ticket still counts.
        state.pushTickets = [{ branch: "feat/a", cwd: "/r/.worktrees/feat-a", session: "s2" }];
        hold("pr-23", { pr: 23 });
        state.prs[23] = { headRef: "feat/c", required: { "All Checks Pass": "FAILURE" } };
        expect(atActiveCap(state, "s2", config)).toMatch(/you hold 2 active jobs/);
        // Its CI running instead: it waits for CI and does not count.
        state.prs[23].required = { "All Checks Pass": "PENDING" };
        expect(atActiveCap(state, "s2", config)).toBeNull();
    });

    it("counts an issue job with no pull request as waiting only on its session's ticket and a status that says push", () => {
        const state = queued();
        const config = { workers: { maxActive: 1 } };
        state.jobs["issue-314"] = {
            ...newJob({ kind: "issue", target: "#314", id: "issue-314" }, NOW),
            state: "working",
            holder: { session: "s1" },
            status: { at: NOW.toISOString(), text: "coded; agent waiting in the push queue" },
        };
        expect(atActiveCap(state, "s1", config)).toMatch(/you hold 1 active jobs/);
        state.pushTickets = [{ branch: "feat/ego", cwd: "/r/.worktrees/feat-ego", session: "s2" }];
        expect(atActiveCap(state, "s1", config)).toMatch(/you hold 1 active jobs/);
        state.pushTickets.push({ branch: "feat/other", cwd: "/r/.worktrees/feat-other", session: "s1" });
        expect(atActiveCap(state, "s1", config)).toBeNull();
        state.jobs["issue-314"].status.text = "writing the tests";
        expect(atActiveCap(state, "s1", config)).toMatch(/you hold 1 active jobs/);
    });

    it("does not mark a job invited while only a session that cannot claim it is idle", async () => {
        const state = ownReview();
        const f = fake();
        expect(await inviteStep(state, { ...f.opts(), offered: review })).toEqual([]);
        expect(f.sent).toEqual([]);
        expect(state.jobs["review-1082"].invited).toBeUndefined();
        await inviteStep(state, { ...f.opts({ sessions: allIdle }), offered: review });
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s2.sock"]);
    });
});

describe("asking an owner session for the status of the job it holds", () => {
    const CLAIMED_AT = "2026-10-05T12:00:00.000Z";
    /**
     * A state with job issue-186 claimed by owner session s1 at noon.
     * @returns {any} the state
     */
    const claimed = () => {
        const job = newJob({ kind: "issue", target: "#186", id: "issue-186" }, new Date(CLAIMED_AT));
        move(job, "starting", new Date(CLAIMED_AT), { holder: { session: "s1", window: null, startedBy: "owner" } });
        move(job, "working", new Date(CLAIMED_AT));
        job.claim = { session: "s1", at: CLAIMED_AT };
        return { jobs: { "issue-186": job } };
    };
    const at = (/** @type {string} */ hm) => new Date(`2026-10-05T${hm}:00Z`);
    const opts = (/** @type {any} */ f, /** @type {any} */ over = {}) => f.opts({ minutes: 15, ...over });

    it("asks only the holding session, once per interval, naming the tool and the subagent rule", async () => {
        const f = fake();
        const state = claimed();
        expect(await statusStep(state, opts(f, { now: at("12:14") }))).toEqual([]);
        const lines = await statusStep(state, opts(f, { now: at("12:15") }));
        expect(f.sent.map(([socket]) => socket)).toEqual(["/s1.sock"]);
        expect(f.sent[0][1]).toContain("status check on the jobs this session holds:\n- issue-186 (#186)\n");
        expect(f.sent[0][1]).toContain("calling githerd_expect once per listed job");
        expect(f.sent[0][1]).toContain("Can you take another job? Answer that with capacity set");
        expect(f.sent[0][1]).toMatch(
            /jobs that are only waiting to push or for CI do not count toward your capacity: count only jobs you are actively working when you answer capacity\./i,
        );
        expect(f.sent[0][1]).not.toMatch(/minutes set|how long until/);
        expect(f.sent[0][1]).toContain("background subagents or workflows");
        expect(lines).toEqual([
            expect.objectContaining({
                kind: "status-asked",
                jobs: ["issue-186"],
                session: "graphty-13",
                sent: ["graphty-13"],
            }),
        ]);
        expect(state.jobs["issue-186"].statusAsk).toEqual({ at: "2026-10-05T12:15:00.000Z", heard: true });
        await statusStep(state, opts(f, { now: at("12:29") }));
        expect(f.sent).toHaveLength(1);
    });

    it("names the jobs that wait on the held job, chained waits included, and asks whether to report it split", async () => {
        const f = fake();
        const state = claimed();
        const t = new Date(CLAIMED_AT);
        const blocked = (/** @type {string} */ id, /** @type {string} */ on) => {
            const j = newJob({ kind: "issue", target: `#${id.slice(6)}`, id }, t);
            Object.assign(j, { state: "blocked", waitingFor: { job: on } });
            state.jobs[id] = j;
        };
        blocked("issue-713", "issue-186");
        blocked("issue-714", "issue-713");
        await statusStep(state, opts(f, { now: at("12:15") }));
        expect(f.sent[0][1]).toContain(
            "- issue-186 (#186)\n  #713 and #714 wait on this job. If what remains waits on something held, " +
                "report it split (file the remainder as its own issue) so they can start.\n",
        );
        // Nothing waits: no such line. githerd only asks; it never splits the job itself.
        const g = fake();
        const alone = claimed();
        await statusStep(alone, opts(g, { now: at("12:15") }));
        expect(g.sent[0][1]).not.toContain("wait on this job");
        expect(state.jobs["issue-186"].state).toBe("working");
    });

    it("keeps an answered claim and asks again; releases one whose question is unanswered when the next is due", async () => {
        const f = fake();
        const answered = claimed();
        await statusStep(answered, opts(f, { now: at("12:15") }));
        answered.jobs["issue-186"].status = { at: "2026-10-05T12:20:00.000Z", text: "tests running" };
        expect(await statusStep(answered, opts(f, { now: at("12:30") }))).toEqual([
            expect.objectContaining({ kind: "status-asked", jobs: ["issue-186"] }),
        ]);
        expect(answered.jobs["issue-186"].state).toBe("working");
        expect(f.sent).toHaveLength(2);

        const silent = claimed();
        await statusStep(silent, opts(f, { now: at("12:15") }));
        const lines = await statusStep(silent, opts(f, { now: at("12:30") }));
        const reason = "no answer to the status question of 2026-10-05T12:15:00.000Z";
        expect(lines).toEqual([{ kind: "claim-released", job: "issue-186", session: "s1", reason }]);
        expect(silent.jobs["issue-186"]).toMatchObject({ state: "queued", holder: null, reason, statusAsk: null });
        expect(f.sent).toHaveLength(3);
    });

    it("releases nothing on elapsed time alone: never asked, a question nobody heard, or a status from before", async () => {
        const f = fake(["/s1.sock"]);
        const unheard = claimed();
        // The send fails: nobody heard the question, so its silence is not held against the session.
        await statusStep(unheard, opts(f, { now: at("12:15") }));
        expect(unheard.jobs["issue-186"].statusAsk.heard).toBe(false);
        await statusStep(unheard, opts(f, { now: at("18:00") }));
        expect(unheard.jobs["issue-186"].state).toBe("working");

        // A session githerd may not message (outside workers.sessions) is never asked, so never released.
        const outside = claimed();
        const g = fake();
        const none = { sessions: () => [] };
        expect(await statusStep(outside, opts(g, { now: at("12:15"), ...none }))).toEqual([]);
        expect(await statusStep(outside, opts(g, { now: at("23:00"), ...none }))).toEqual([]);
        expect(outside.jobs["issue-186"].state).toBe("working");
        expect(g.sent).toEqual([]);

        // A status line written before the question is no answer to it.
        const early = claimed();
        early.jobs["issue-186"].status = { at: "2026-10-05T12:05:00.000Z", text: "starting" };
        await statusStep(early, opts(g, { now: at("12:15") }));
        await statusStep(early, opts(g, { now: at("12:30") }));
        expect(early.jobs["issue-186"].state).toBe("queued");
    });

    it("never asks a blocked job, a parked one or one waiting on what githerd watches, and never releases it for silence", async () => {
        const f = fake();
        // Blocked from its claim (githerd_claim's "wait"), until its blocker ends.
        const blocked = claimed();
        const b = blocked.jobs["issue-186"];
        Object.assign(b, { state: "starting" });
        move(b, "blocked", new Date(CLAIMED_AT), { waitingFor: { job: "pr-5" } });
        const parked = claimed();
        move(parked.jobs["issue-186"], "parked", at("12:01"), { waitingFor: { owner: "item-1" } });
        // Waiting on CI after a question it never answered: the pending question is dropped, not held against it.
        const onChecks = claimed();
        await statusStep(onChecks, opts(f, { now: at("12:15") }));
        expect(f.sent).toHaveLength(1);
        move(onChecks.jobs["issue-186"], "waiting", at("12:20"), { waitingFor: { checks: "abc" } });
        for (const state of [blocked, parked, onChecks]) {
            for (const hm of ["12:30", "12:45", "23:00"]) {
                expect(await statusStep(state, opts(f, { now: at(hm) }))).toEqual([]);
            }
            expect(state.jobs["issue-186"].state).not.toBe("queued");
            expect(state.jobs["issue-186"].statusAsk).toBeNull();
        }
        expect(f.sent).toHaveLength(1);

        // A wait on the session's own local task is still asked about.
        const local = claimed();
        move(local.jobs["issue-186"], "waiting", at("12:01"), { waitingFor: { local: "b1" } });
        await statusStep(local, opts(f, { now: at("12:15") }));
        expect(f.sent).toHaveLength(2);
    });

    it("asks a session about all its due jobs in one message and releases only the one it left unanswered", async () => {
        const f = fake();
        const state = claimed();
        const other = newJob({ kind: "pr", target: "#5", id: "pr-5" }, new Date(CLAIMED_AT));
        move(other, "starting", new Date(CLAIMED_AT), { holder: { session: "s1", window: null, startedBy: "owner" } });
        move(other, "working", new Date(CLAIMED_AT));
        other.claim = { session: "s1", at: CLAIMED_AT };
        state.jobs["pr-5"] = other;
        const lines = await statusStep(state, opts(f, { now: at("12:15") }));
        expect(f.sent).toHaveLength(1);
        expect(f.sent[0][1]).toContain("- issue-186 (#186)\n- pr-5 (#5)\n");
        expect(lines).toEqual([expect.objectContaining({ kind: "status-asked", jobs: ["issue-186", "pr-5"] })]);

        state.jobs["pr-5"].status = { at: "2026-10-05T12:20:00.000Z", text: "rebasing" };
        const next = await statusStep(state, opts(f, { now: at("12:30") }));
        expect(next).toEqual([
            expect.objectContaining({ kind: "claim-released", job: "issue-186" }),
            expect.objectContaining({ kind: "status-asked", jobs: ["pr-5"] }),
        ]);
        expect(state.jobs["issue-186"].state).toBe("queued");
        expect(state.jobs["pr-5"].state).toBe("working");
        expect(f.sent).toHaveLength(2);
        expect(f.sent[1][1]).not.toContain("issue-186");
    });

    it("leaves a worker's job, a verifying job and a kept job alone", async () => {
        const f = fake();
        const worker = claimed();
        worker.jobs["issue-186"].holder.startedBy = "githerd";
        const verifying = claimed();
        move(verifying.jobs["issue-186"], "verifying", at("12:01"));
        const kept = claimed();
        kept.jobs["issue-186"].kept = true;
        for (const state of [worker, verifying, kept]) {
            expect(await statusStep(state, opts(f, { now: at("13:00") }))).toEqual([]);
        }
        expect(f.sent).toEqual([]);
    });

    it("sends nothing in dry-run, ledgers a would-do line, and never releases on a question nobody heard", async () => {
        const f = fake();
        const state = claimed();
        expect(await statusStep(state, opts(f, { now: at("12:15"), acting: false }))).toEqual([
            {
                kind: "would-do",
                group: "workers",
                op: "ask graphty-13 for the status of issue-186",
                jobs: ["issue-186"],
            },
            { kind: "status-asked", jobs: ["issue-186"], session: "graphty-13", sent: [], failed: [] },
        ]);
        await statusStep(state, opts(f, { now: at("12:30"), acting: false }));
        expect(state.jobs["issue-186"].state).toBe("working");
        expect(f.sent).toEqual([]);
    });
});

describe("telling an owner session that the job it held was cancelled", () => {
    const cancelled = [
        { job: "incident-x", reason: "the release recovered", session: "s1", startedBy: "owner" },
        { job: "pr-5", reason: "#5 closed or merged", session: "w1", startedBy: "githerd" },
        { job: "pr-6", reason: "#6 closed or merged" },
    ];

    it("messages only the owner session that held it, with the reason", async () => {
        const f = fake();
        const lines = await tellCancelled(cancelled, f.opts());
        expect(f.sent).toEqual([
            [
                "/s1.sock",
                expect.stringContaining("incident-x, which this session holds, was cancelled: the release recovered"),
            ],
        ]);
        expect(lines).toEqual([
            expect.objectContaining({ kind: "cancel-told", job: "incident-x", sent: ["graphty-13"] }),
        ]);
    });

    it("dry-run sends nothing and writes a would-do line; a session githerd may not message is not told", async () => {
        const f = fake();
        expect(await tellCancelled(cancelled, f.opts({ acting: false }))).toEqual([
            {
                kind: "would-do",
                group: "workers",
                op: "tell graphty-13 that incident-x was cancelled",
                job: "incident-x",
            },
        ]);
        expect(await tellCancelled(cancelled, f.opts({ sessions: () => [] }))).toEqual([]);
        expect(f.sent).toEqual([]);
    });

    it("tells the owner session whose refused report githerd accepted on a re-check, and only it", async () => {
        const accepted = [
            { job: "issue-736", session: "s1", startedBy: "owner", reportedAt: "2026-10-05T11:00:00.000Z" },
            { job: "pr-7", session: "w9", startedBy: null, reportedAt: "2026-10-05T11:00:00.000Z" },
        ];
        const f = fake();
        expect(await tellAccepted(accepted, f.opts())).toEqual([
            expect.objectContaining({ kind: "done-told", job: "issue-736", sent: ["graphty-13"] }),
        ]);
        expect(f.sent).toEqual([["/s1.sock", expect.stringContaining("was checked again and now holds")]]);
        const g = fake();
        expect(await tellAccepted(accepted, g.opts({ acting: false }))).toEqual([
            { kind: "would-do", group: "workers", op: "tell graphty-13 that issue-736 is done", job: "issue-736" },
        ]);
        expect(g.sent).toEqual([]);
    });
});

describe("asking the owner of a broken pull request whether it is fixing it", () => {
    const at = (/** @type {string} */ hm) => new Date(`2026-10-05T${hm}:00Z`);
    const QUESTION =
        "githerd: #710 is broken: required check failing: All Checks Pass. Are you fixing it? " +
        "Answer with githerd_mine pr 710 to keep it, or ignore to release it to other sessions " +
        "(`githerd disown 710` releases it now).";
    /**
     * #710 failing, inferred to be graphty-14's (it last pushed), with its pr job queued.
     * @returns {any} the state
     */
    const owned = () => {
        const state = failed();
        state.trust = { login: "owner" };
        state.prs[710].author = "owner";
        state.prInferred = { 710: { session: "s2", name: "graphty-14", evidence: "pushed" } };
        return state;
    };
    // The owner is outside workers.sessions: the question is about its own pull request.
    const opts = (/** @type {any} */ f, /** @type {any} */ over = {}) =>
        f.opts({ minutes: 15, sessions: () => [], owners: () => SESSIONS, ...over });

    it("puts an owned broken pull request in its owner's question, once per interval", async () => {
        const f = fake();
        const state = owned();
        const lines = await statusStep(state, opts(f, { now: at("12:00") }));
        expect(f.sent).toEqual([["/s2.sock", QUESTION]]);
        expect(lines).toEqual([expect.objectContaining({ kind: "status-asked", prs: [710], session: "graphty-14" })]);
        expect(prInUse(state, 710, { now: at("12:00") })).toBe("session graphty-14 owns it (pushed)");
        await statusStep(state, opts(f, { now: at("12:14") }));
        expect(f.sent).toHaveLength(1);
    });

    it("releases it when the question goes unanswered, and offers the pr job until a new push", async () => {
        const f = fake();
        const state = owned();
        await statusStep(state, opts(f, { now: at("12:00") }));
        const lines = await statusStep(state, opts(f, { now: at("12:15") }));
        expect(lines).toEqual([
            {
                kind: "pr-released",
                pr: 710,
                head: HEAD,
                session: "s2",
                reason: "no answer to the question of 2026-10-05T12:00:00.000Z",
            },
        ]);
        expect(f.sent).toHaveLength(1);
        expect(jobInUse(state, state.jobs["pr-710"], { now: at("12:15") })).toBeNull();
        // A new push: owned again, and asked again.
        state.prs[710].headSha = "b".repeat(40);
        await statusStep(state, opts(f, { now: at("12:16") }));
        expect(prInUse(state, 710, { now: at("12:16") })).toBe("session graphty-14 owns it (pushed)");
        expect(f.sent).toHaveLength(2);
    });

    it("keeps it, unasked, when the owner answers with githerd_mine", async () => {
        const f = fake();
        const state = owned();
        await statusStep(state, opts(f, { now: at("12:00") }));
        state.prOwners = { 710: { session: "s2", name: "graphty-14", at: "2026-10-05T12:05:00.000Z", by: "tool" } };
        const lines = await statusStep(state, opts(f, { now: at("12:15") }));
        expect(lines).toEqual([]);
        expect(prInUse(state, 710, { now: at("12:15") })).toBe("session graphty-14 owns it (it said so)");
    });

    it("keeps it, unasked, while its owner works in the branch's worktree, and asks once that stops", async () => {
        const f = fake();
        const state = owned();
        await statusStep(state, opts(f, { now: at("12:00") }));
        // A session started before githerd's MCP server cannot answer, but its process is there.
        state.prActivity = { 710: { present: { s2: ".worktrees/feat-x" }, pushed: {} } };
        expect(await statusStep(state, opts(f, { now: at("12:15") }))).toEqual([]);
        expect(f.sent).toHaveLength(1);
        expect(state.brokenAsks[710].active).toBe("graphty-14 active in .worktrees/feat-x");
        expect(prInUse(state, 710, { now: at("12:15") })).toBe("session graphty-14 owns it (pushed)");
        // The activity stops: asked again, not released; released only when that goes unanswered.
        state.prActivity = { 710: { present: {}, pushed: {} } };
        await statusStep(state, opts(f, { now: at("12:30") }));
        expect(f.sent).toHaveLength(2);
        const lines = await statusStep(state, opts(f, { now: at("12:45") }));
        expect(lines).toMatchObject([{ kind: "pr-released", pr: 710 }]);
    });

    it("gives a released pull request back the moment its owner is active in its worktree again", async () => {
        const f = fake();
        const state = owned();
        await statusStep(state, opts(f, { now: at("12:00") }));
        await statusStep(state, opts(f, { now: at("12:15") }));
        expect(jobInUse(state, state.jobs["pr-710"], { now: at("12:15") })).toBeNull();
        state.prActivity = { 710: { present: { s2: ".worktrees/feat-x" }, pushed: {} } };
        expect(await statusStep(state, opts(f, { now: at("12:16") }))).toEqual([]);
        expect(prInUse(state, 710, { now: at("12:16") })).toBe("session graphty-14 owns it (pushed)");
        expect(state.brokenAsks[710].active).toBe("graphty-14 active in .worktrees/feat-x");
        expect(f.sent).toHaveLength(1);
    });

    it("keeps it when its owner pushed the branch since the question, or the head moved", async () => {
        const f = fake();
        const pushed = owned();
        await statusStep(pushed, opts(f, { now: at("12:00") }));
        pushed.prActivity = { 710: { present: {}, pushed: { s2: "2026-10-05T12:07:00Z" } } };
        expect(await statusStep(pushed, opts(f, { now: at("12:15") }))).toEqual([]);
        expect(pushed.brokenAsks[710].active).toBe("graphty-14 pushed feat/cytoscape-adapter at 12:07 UTC");

        const moved = owned();
        await statusStep(moved, opts(f, { now: at("12:00") }));
        moved.prs[710].headSha = "b".repeat(40);
        expect(await statusStep(moved, opts(f, { now: at("12:15") }))).toEqual([]);
        expect(moved.brokenAsks[710].active).toBe("new head bbbbbbb");
        expect(f.sent).toHaveLength(2);
    });

    it("asks an owner without githerd's tools with the command lines, and releases it on silence", async () => {
        const f = fake();
        const state = owned();
        state.prInferred[710].noTools = true;
        const cli = "GITHERD_STATE_DIR=/d node /g/bin/githerd.mjs";
        expect(await statusStep(state, opts(f, { now: at("12:00"), cli }))).toMatchObject([{ prs: [710] }]);
        expect(f.sent).toEqual([
            [
                "/s2.sock",
                "githerd: #710 is broken: required check failing: All Checks Pass. Are you fixing it? This session " +
                    `has no githerd tools, so answer from your shell: run \`${cli} mine 710\` to keep it, or ` +
                    `\`${cli} disown 710\` to release it to other sessions now. No answer releases it too.`,
            ],
        ]);
        expect(prInUse(state, 710, { now: at("12:00") })).toBe("session graphty-14 owns it (pushed)");
        // No answer and no activity: released like any other owner, and its job is offered.
        expect(await statusStep(state, opts(f, { now: at("12:15"), cli }))).toMatchObject([
            { kind: "pr-released", pr: 710, session: "s2" },
        ]);
        expect(jobInUse(state, state.jobs["pr-710"], { now: at("12:15") })).toBeNull();
    });

    it("keeps it for an owner without githerd's tools that answers with githerd mine from its shell", async () => {
        const f = fake();
        const state = owned();
        state.prInferred[710].noTools = true;
        await statusStep(state, opts(f, { now: at("12:00") }));
        const by = { session: "s2", name: "graphty-14", at: "2026-10-05T12:05:00.000Z", by: "session" };
        expect(markMine(state, 710, by)).toBeNull();
        expect(await statusStep(state, opts(f, { now: at("12:15") }))).toEqual([]);
        expect(prInUse(state, 710, { now: at("12:15") })).toBe("session graphty-14 owns it (it said so)");
        // Another session cannot take it over by saying so too.
        const other = { ...by, session: "s1", name: "graphty-13" };
        expect(markMine(state, 710, other)).toBe("session graphty-14 already said #710 is its");
    });

    it("releases a disowned pull request at once, and only for the session that disowned it", async () => {
        const f = fake();
        const state = owned();
        state.prOwners = { 710: { session: "s2", name: "graphty-14", at: "2026-10-05T11:00:00.000Z", by: "tool" } };
        // Another session disowning it changes nothing that is graphty-14's.
        expect(disown(state, 710, { session: "s1", name: "graphty-13", at: "2026-10-05T11:59:00.000Z" })).toEqual([]);
        expect(prInUse(state, 710, { now: at("12:00") })).toBe("session graphty-14 owns it (it said so)");
        expect(state.prInferred[710].session).toBe("s2");
        // graphty-14 disowns it: no owner record, no inferred owner, and the job is offered.
        expect(disown(state, 710, { session: "s2", name: "graphty-14", at: "2026-10-05T12:00:00.000Z" })).toEqual([
            "its owner record",
            "its inferred ownership (pushed)",
        ]);
        expect(state.prDisowned[710]).toMatchObject({ session: "s2", name: "graphty-14" });
        expect(state.prOwners).toEqual({});
        expect(state.prInferred).toEqual({});
        expect(await statusStep(state, opts(f, { now: at("12:00") }))).toEqual([]);
        expect(f.sent).toEqual([]);
        // Nobody owns it now: githerd asks the sessions whose it is, as for any broken pull request.
        expect(prInUse(state, 710, { now: at("12:00") })).toMatch(/githerd is asking the sessions/);
        // Saying it is its own again ends the disown.
        markMine(state, 710, { session: "s2", name: "graphty-14", at: "2026-10-05T12:10:00.000Z", by: "session" });
        expect(state.prDisowned).toEqual({});
    });

    it("holds an answer while the same failure stands, and asks again when another check fails", async () => {
        const f = fake();
        const state = owned();
        await statusStep(state, opts(f, { now: at("12:00") }));
        state.prOwners = { 710: { session: "s2", name: "graphty-14", at: "2026-10-05T12:05:00.000Z", by: "tool" } };
        for (const hm of ["12:15", "12:30", "12:45", "13:00"]) {
            expect(await statusStep(state, opts(f, { now: at(hm) }))).toEqual([]);
        }
        expect(f.sent).toHaveLength(1);
        state.prs[710].required["Lint PR Title"] = "FAILURE";
        await statusStep(state, opts(f, { now: at("13:15") }));
        expect(f.sent).toHaveLength(2);
        expect(f.sent[1][1]).toContain("required check failing: All Checks Pass, Lint PR Title");
    });

    it("releases it at once when its owner cannot be asked, and never for a question nobody heard", async () => {
        const gone = owned();
        const f = fake();
        const lines = await statusStep(gone, opts(f, { now: at("12:00"), owners: () => [] }));
        expect(lines).toMatchObject([{ kind: "pr-released", pr: 710, reason: "githerd cannot ask its owner" }]);
        expect(prInUse(gone, 710, { now: at("12:00") })).toBeNull();

        const unheard = owned();
        const g = fake(["/s2.sock"]);
        await statusStep(unheard, opts(g, { now: at("12:00") }));
        await statusStep(unheard, opts(g, { now: at("12:15") }));
        expect(prInUse(unheard, 710, { now: at("12:15") })).toBe("session graphty-14 owns it (pushed)");
    });
});

describe("a head githerd's own update made", () => {
    const NEW = "b".repeat(40);
    const by = { session: "s2", name: "graphty-14", at: "2026-10-05T12:05:00.000Z", by: "tool" };

    it("keeps the githerd_mine answer, which a head someone else pushed drops", () => {
        const state = /** @type {any} */ (failed());
        expect(markMine(state, 710, by)).toBeNull();
        // githerd's update-branch moved the head: GitHub committed the merge.
        state.githerdMoves = { 710: HEAD };
        expect(carryGitherdMoves(state)).toEqual([]);
        state.prs[710] = { ...state.prs[710], headSha: NEW, headCommitter: "noreply@github.com" };
        expect(carryGitherdMoves(state)).toEqual([{ kind: "pr-owner-carried", pr: 710, from: HEAD, head: NEW }]);
        expect(askFor(state, 710)?.owner).toMatchObject({ session: "s2", name: "graphty-14" });
        expect(state.githerdMoves).toEqual({});
        // The durable owner record never hung on the head.
        expect(prInUse(state, 710, { now: NOW, session: "s2" })).toBe("yours: you said it is yours");

        // A head another session pushed after githerd's update carries nothing.
        const other = /** @type {any} */ (failed());
        markMine(other, 710, by);
        other.githerdMoves = { 710: HEAD };
        other.prs[710] = { ...other.prs[710], headSha: NEW, headCommitter: "owner@example.com" };
        expect(carryGitherdMoves(other)).toEqual([]);
        expect(askFor(other, 710)).toBeNull();
    });
});
