import { describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import { jobInUse, jobOrder } from "../lib/queue.mjs";

const NOW = new Date("2026-10-02T12:00:00Z");

describe("jobOrder: the order of design 5.4", () => {
    /**
     * Queued jobs keyed by id.
     * @param {...any} specs newJob arguments
     * @returns {Record<string, any>} the jobs
     */
    const jobsOf = (...specs) => Object.fromEntries(specs.map((s) => newJob(s, NOW)).map((j) => [j.id, j]));

    it("finishes before starting: incidents, review, pull requests, title, new triage, major, issues, then the rest", () => {
        const jobs = jobsOf(
            { kind: "triage", target: "full", facts: { scope: "full" } },
            { kind: "incident", target: "docs", facts: { scope: "low" } },
            { kind: "issue", target: "1", priority: "high" },
            { kind: "major", target: "graphty-element" },
            { kind: "triage", target: "new", facts: { scope: "new" } },
            { kind: "title", target: "9" },
            { kind: "pr", target: "412", facts: { since: "2026-09-30" } },
            { kind: "review", target: "abc" },
            { kind: "incident", target: "shared", facts: { scope: "shared", since: "2026-10-01" } },
            { kind: "incident", target: "release", facts: { scope: "release", since: "2026-10-02" } },
            { kind: "incident", target: "build", facts: { scope: "master", since: "2026-10-01" } },
        );
        expect(jobOrder(jobs).items).toEqual([
            { job: "incident-build", reason: "master incident, red since 2026-10-01" },
            { job: "incident-release", reason: "release incident, red since 2026-10-02" },
            { job: "incident-shared", reason: "shared incident, red since 2026-10-01" },
            { job: "review-abc", reason: "review" },
            { job: "pr-412", reason: "pull request, open since 2026-09-30" },
            { job: "title-9", reason: "pull request title" },
            { job: "triage-new", reason: "triage of new issues" },
            { job: "major-graphty-element", reason: "major the owner approved" },
            { job: "issue-1", reason: "high issue" },
            { job: "triage-full", reason: "triage full" },
            { job: "incident-docs", reason: "low-priority incident on a non-gating workflow" },
        ]);
    });

    it("issues: open order, then priority, bug first, oldest; githerd:next first of all", () => {
        const jobs = jobsOf(
            { kind: "issue", target: "1", priority: "low", facts: { since: "2026-01-01" } },
            { kind: "issue", target: "2", priority: "high", facts: { since: "2026-09-01" } },
            { kind: "issue", target: "3", priority: "high", facts: { since: "2026-08-01" } },
            { kind: "issue", target: "4", priority: "high", facts: { bug: true, since: "2026-09-15" } },
            { kind: "issue", target: "5", priority: "critical" },
            { kind: "issue", target: "6", priority: "low", facts: { order: 0 } },
            { kind: "issue", target: "7", facts: { next: true } },
            { kind: "issue", target: "8" },
        );
        const order = jobOrder(jobs).items;
        expect(order.map((i) => i.job)).toEqual([
            "issue-7",
            "issue-6",
            "issue-5",
            "issue-4",
            "issue-3",
            "issue-2",
            "issue-1",
            "issue-8",
        ]);
        expect(order[0].reason).toBe("githerd:next (owner), unprioritized issue");
        expect(order[1].reason).toBe("in open order, position 1, low issue");
        expect(order[3].reason).toBe("high bug, open since 2026-09-15");
    });

    it("lists only queued jobs, and skips with a reason", () => {
        const jobs = jobsOf(
            { kind: "issue", target: "1", facts: { labels: ["needs-decision"] } },
            { kind: "issue", target: "2", facts: { skip: true } },
            { kind: "issue", target: "3", facts: { storybook: true } },
            { kind: "pr", target: "4", facts: { skip: true } },
            { kind: "pr", target: "5" },
            { kind: "issue", target: "6" },
        );
        move(jobs["issue-6"], "starting", NOW);
        expect(jobOrder(jobs, { reviewQueueFull: true })).toEqual({
            items: [{ job: "pr-5", reason: "pull request" }],
            skipped: [
                { job: "issue-1", reason: "labelled needs-decision" },
                { job: "issue-2", reason: "githerd:skip (owner)" },
                { job: "issue-3", reason: "the owner's review queue is full and it touches a Storybook" },
                { job: "pr-4", reason: "githerd:skip (owner)" },
            ],
            inUse: [],
        });
        expect(jobOrder(jobs).items.map((i) => i.job)).toEqual(["pr-5", "issue-3"]);
    });
});

describe("pull requests in use (owner decisions 2026-10-04 and 2026-10-05)", () => {
    const MINUTE = 60 * 1000;
    const HEAD = "c".repeat(40);
    /**
     * A state with one queued pr job on #9, whose required check is `check`, its head committed by
     * `committer`.
     * @param {string} check the state of the required check
     * @param {string} [committer] the committer's email
     * @returns {any} the state
     */
    function pushed(check, committer = "owner@example.com") {
        const job = Object.assign(newJob({ kind: "pr", target: "#9", id: "pr-9" }, NOW), { pr: 9 });
        return {
            jobs: { "pr-9": job },
            prs: { 9: { headSha: HEAD, headRef: "feat/x", headCommitter: committer, required: { CI: check } } },
        };
    }
    /**
     * Records githerd's question about #9's head, asked `minutesAgo`.
     * @param {any} state the state
     * @param {number} minutesAgo when it was asked
     * @param {string[]} sessions the sessions asked
     * @returns {any} the state
     */
    function asked(state, minutesAgo, sessions = ["a", "b", "c"]) {
        const askedAt = new Date(NOW.getTime() - minutesAgo * MINUTE).toISOString();
        state.asks = { 9: { head: HEAD, askedAt, sessions, owner: null } };
        return state;
    }
    const order = (/** @type {any} */ state, config = {}) =>
        jobOrder(state.jobs, { inUse: (j) => jobInUse(state, j, { config, now: NOW }) });

    it("does not offer a pull request while CI runs on a head someone else pushed", () => {
        expect(order(pushed("PENDING"))).toEqual({
            items: [],
            skipped: [],
            inUse: [{ job: "pr-9", reason: "CI running on ccccccc, pushed by someone else" }],
        });
    });

    it("holds a failed head until githerd has asked, then until an answer or the wait runs out", () => {
        expect(order(pushed("FAILURE")).inUse[0].reason).toMatch(/githerd is asking the sessions/);
        expect(order(asked(pushed("FAILURE"), 3)).inUse).toEqual([
            { job: "pr-9", reason: "CI failed on ccccccc; asked 3 sessions at 11:57 UTC; no owner yet" },
        ]);
        // Nobody answered within the wait (10 minutes by default, the config's otherwise).
        expect(order(asked(pushed("FAILURE"), 10)).items.map((i) => i.job)).toEqual(["pr-9"]);
        expect(order(asked(pushed("FAILURE"), 10), { workers: { askMinutes: 20 } }).inUse).toHaveLength(1);
        // Nobody to ask: offered at once.
        expect(order(asked(pushed("FAILURE"), 0, [])).items).toHaveLength(1);
    });

    it("keeps a pull request a session answered for, and a new push starts over", () => {
        const state = asked(pushed("FAILURE"), 30);
        state.asks[9].owner = { session: "s1", name: "graphty-13", at: NOW.toISOString() };
        expect(order(state).inUse).toEqual([{ job: "pr-9", reason: "session graphty-13 said it is working on it" }]);
        state.prs[9].headSha = "d".repeat(40);
        expect(order(state).inUse[0].reason).toMatch(/^CI failed on ddddddd; githerd is asking/);
    });

    it("offers a green or conflicting pull request, and never holds githerd's or GitHub's own heads", () => {
        expect(order(pushed("SUCCESS")).items).toHaveLength(1);
        const own = pushed("PENDING");
        own.pushedByGitherd = { [HEAD]: "#9" };
        expect(order(own).items.map((i) => i.job)).toEqual(["pr-9"]);
        expect(order(pushed("FAILURE", "noreply@github.com")).items.map((i) => i.job)).toEqual(["pr-9"]);
    });

    it("lets a review run beside the worker whose patch it reviews, but not beside an owner session", () => {
        const maker = Object.assign(newJob({ kind: "issue", target: "#3", id: "issue-3" }, NOW), { pr: 9 });
        move(maker, "starting", NOW, { holder: { session: "w1", startedBy: "githerd" } });
        const review = newJob({ kind: "review", target: "#9", id: "review-9", facts: { pr: 9 } }, NOW);
        const state = { jobs: { "issue-3": maker, "review-9": review }, prs: {} };
        expect(order(state).items.map((i) => i.job)).toEqual(["review-9"]);
        maker.holder.startedBy = "owner";
        expect(order(state).inUse).toEqual([{ job: "review-9", reason: "claimed by session w1" }]);
    });
});
