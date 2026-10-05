import { describe, expect, it } from "vitest";

import { askStep, inviteStep, nudgeStep } from "../lib/asks.mjs";
import { move, newJob } from "../lib/board.mjs";
import { prInUse } from "../lib/queue.mjs";

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

describe("asking the live sessions whose a failed pull request is", () => {
    it("asks every live session once per failed head, and records the question", async () => {
        const state = failed();
        const f = fake();
        const lines = await askStep(state, f.opts());
        const text =
            "githerd: CI failed on #710 (feat/cytoscape-adapter) at aaaaaaa: All Checks Pass. If you are working on " +
            "it, call the githerd_mine tool with pr 710 (or claim job pr-710 with githerd_claim). Otherwise ignore this.";
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
                "the githerd_mine tool with pr 710 (or claim job pr-710 with githerd_claim). Otherwise ignore this.",
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

    it("waits for an idle session, and skips a job that left the queue", async () => {
        const state = queued("issue-5", "triage-new-1");
        move(state.jobs["triage-new-1"], "starting", NOW, { holder: { session: "w1", nonce: "n" } });
        const f = fake();
        const busy = () => SESSIONS.map((s) => ({ ...s, status: "busy" }));
        expect(await inviteStep(state, { ...f.opts({ sessions: busy }), offered })).toEqual([]);
        expect(state.jobs["issue-5"].invitedAt).toBeUndefined();
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
});

describe("nudging an owner session past its expect window", () => {
    /**
     * A state with job issue-186 claimed by owner session s1, expecting to finish at `until`.
     * @param {string} until the end of the expect window
     * @returns {any} the state
     */
    const claimed = (until) => {
        const job = newJob({ kind: "issue", target: "#186", id: "issue-186" }, NOW);
        job.state = "working";
        job.holder = { session: "s1", window: null, startedBy: "owner" };
        job.expect = { until, reason: "the shell tests" };
        return { jobs: { "issue-186": job } };
    };

    it("tells that session only, once per window, 15 minutes after the window ends", async () => {
        const { sent, opts } = fake();
        const state = claimed("2026-10-05T11:50:00Z");
        expect(await nudgeStep(state, opts())).toEqual([]);
        const later = new Date("2026-10-05T12:06:00Z");
        const lines = await nudgeStep(state, opts({ now: later }));
        expect(sent.map(([socket]) => socket)).toEqual(["/s1.sock"]);
        expect(sent[0][1]).toContain("issue-186 (the shell tests) ended at 2026-10-05T11:50:00Z");
        expect(lines).toEqual([
            expect.objectContaining({ kind: "session-nudged", job: "issue-186", session: "graphty-13" }),
        ]);
        await nudgeStep(state, opts({ now: later }));
        expect(sent).toHaveLength(1);
        // A new expect is a new window.
        state.jobs["issue-186"].expect = { until: "2026-10-05T12:00:00Z", reason: "the full shard" };
        await nudgeStep(state, opts({ now: new Date("2026-10-05T12:16:00Z") }));
        expect(sent).toHaveLength(2);
    });

    it("leaves a finished job, a worker's job and a session no longer listed alone; dry-run sends nothing", async () => {
        const { sent, opts } = fake();
        const later = new Date("2026-10-05T13:00:00Z");
        const gone = claimed("2026-10-05T11:50:00Z");
        gone.jobs["issue-186"].holder.session = "s9";
        const worker = claimed("2026-10-05T11:50:00Z");
        worker.jobs["issue-186"].holder.startedBy = "githerd";
        for (const state of [gone, worker]) expect(await nudgeStep(state, opts({ now: later }))).toEqual([]);
        const dry = claimed("2026-10-05T11:50:00Z");
        expect(await nudgeStep(dry, opts({ now: later, acting: false }))).toEqual([
            expect.objectContaining({ kind: "would-do", group: "workers", op: "nudge graphty-13 about issue-186" }),
            expect.objectContaining({ kind: "session-nudged", sent: [] }),
        ]);
        expect(sent).toEqual([]);
    });
});
