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
            { job: "review-abc", reason: "finishes #abc: review" },
            { job: "pr-412", reason: "finishes #412: pull request, open since 2026-09-30" },
            { job: "title-9", reason: "finishes #9: pull request title" },
            { job: "triage-new", reason: "triage of new issues" },
            { job: "major-graphty-element", reason: "major the owner approved" },
            { job: "issue-1", reason: "starts #1: high issue" },
            { job: "triage-full", reason: "triage full" },
            { job: "incident-docs", reason: "low-priority incident on a non-gating workflow" },
        ]);
    });

    it("issues: a critical bug before a high enhancement, low effort before high, needs-decision never", () => {
        const jobs = jobsOf(
            { kind: "issue", target: "40", priority: "high", facts: { type: "enhancement", effort: "low" } },
            { kind: "issue", target: "125", priority: "critical", facts: { bug: true, effort: "high" } },
            { kind: "issue", target: "123", priority: "critical", facts: { bug: true, effort: "low" } },
            { kind: "issue", target: "124", priority: "critical", facts: { bug: true, effort: "medium" } },
            {
                kind: "issue",
                target: "7",
                priority: "critical",
                facts: { bug: true, effort: "low", labels: ["needs-decision"] },
            },
        );
        const order = jobOrder(jobs);
        expect(order.items).toEqual([
            { job: "issue-123", reason: "starts #123: critical bug, effort low" },
            { job: "issue-124", reason: "starts #124: critical bug, effort medium" },
            { job: "issue-125", reason: "starts #125: critical bug, effort high" },
            { job: "issue-40", reason: "starts #40: high enhancement, effort low" },
        ]);
        expect(order.skipped).toEqual([{ job: "issue-7", reason: "labelled needs-decision" }]);
    });

    it("issues: githerd:next and open order first, then bugs by priority, then other types, oldest first", () => {
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
            "issue-4",
            "issue-5",
            "issue-3",
            "issue-2",
            "issue-1",
            "issue-8",
        ]);
        expect(order[0].reason).toBe("githerd:next (owner), starts #7: unprioritized issue");
        expect(order[1].reason).toBe("in open order, position 1, starts #6: low issue");
        expect(order[2].reason).toBe("starts #4: high bug, open since 2026-09-15");
    });

    it("finishes before starting within a priority: a broken pull request before a new issue", () => {
        const jobs = jobsOf(
            { kind: "issue", target: "#322", priority: "high", facts: { type: "enhancement", effort: "low" } },
            { kind: "issue", target: "#1065", priority: "high", facts: { references: ["#1066"] } },
            { kind: "pr", target: "#710", reason: "conflicting with master (GitHub: DIRTY)", facts: { labels: [] } },
            {
                kind: "pr",
                target: "#1107",
                reason: "required check failing: Test",
                facts: { labels: ["priority:high"] },
            },
        );
        expect(jobOrder(jobs).items).toEqual([
            { job: "pr-#710", reason: "finishes #710: conflicting with master (GitHub: DIRTY)" },
            { job: "pr-#1107", reason: "finishes #1107: required check failing: Test, high priority" },
            { job: "issue-#1065", reason: "finishes #1065: verify the fix, high issue" },
            { job: "issue-#322", reason: "starts #322: high enhancement, effort low" },
        ]);
    });

    it("keeps things running first, then bugs, then infrastructure, each by priority then effort (owner 2026-10-06)", () => {
        const jobs = jobsOf(
            { kind: "issue", target: "#20", priority: "critical", facts: { type: "infrastructure", effort: "low" } },
            { kind: "issue", target: "#21", priority: "high", facts: { type: "infrastructure", effort: "low" } },
            { kind: "issue", target: "#11", priority: "low", facts: { bug: true, type: "bug", effort: "low" } },
            { kind: "issue", target: "#12", priority: "high", facts: { bug: true, type: "bug", effort: "high" } },
            { kind: "issue", target: "#13", priority: "high", facts: { bug: true, type: "bug", effort: "low" } },
            { kind: "issue", target: "#14", facts: { bug: true, type: "bug", effort: "low" } },
            { kind: "issue", target: "#5", priority: "low", facts: { type: "infrastructure", references: ["#6"] } },
            { kind: "triage", target: "types", facts: { scope: "types" } },
            { kind: "pr", target: "#9", facts: { labels: ["priority:low"] } },
            { kind: "incident", target: "release", facts: { scope: "release" } },
        );
        expect(jobOrder(jobs).items).toEqual([
            { job: "incident-release", reason: "release incident" },
            { job: "pr-#9", reason: "finishes #9: pull request, low priority" },
            { job: "issue-#5", reason: "finishes #5: verify the fix, low infrastructure" },
            { job: "triage-types", reason: "triage: re-judge issue types" },
            { job: "issue-#13", reason: "starts #13: high bug, effort low" },
            { job: "issue-#12", reason: "starts #12: high bug, effort high" },
            { job: "issue-#11", reason: "starts #11: low bug, effort low" },
            { job: "issue-#14", reason: "starts #14: unprioritized bug, effort low" },
            { job: "issue-#20", reason: "starts #20: critical infrastructure, effort low" },
            { job: "issue-#21", reason: "starts #21: high infrastructure, effort low" },
        ]);
    });

    it("orders issue types by the configured issueTypes: infrastructure first when the config says so", () => {
        const jobs = jobsOf(
            { kind: "issue", target: "#1", priority: "critical", facts: { bug: true, type: "bug" } },
            { kind: "issue", target: "#2", priority: "low", facts: { type: "infrastructure" } },
        );
        expect(jobOrder(jobs).items.map((i) => i.job)).toEqual(["issue-#1", "issue-#2"]);
        const flipped = jobOrder(jobs, { issueTypes: ["infrastructure", "bug"] });
        expect(flipped.items.map((i) => i.job)).toEqual(["issue-#2", "issue-#1"]);
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
            items: [{ job: "pr-5", reason: "finishes #5: pull request" }],
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

    it("never offers a review to a session that wrote its pull request, and offers it to another", () => {
        const maker = Object.assign(newJob({ kind: "issue", target: "#3", id: "issue-3" }, NOW), {
            pr: 9,
            sessions: ["w1"],
        });
        move(maker, "starting", NOW, { holder: { session: "w1", startedBy: "githerd" } });
        move(maker, "cancelled", NOW);
        const fixer = Object.assign(newJob({ kind: "pr", target: "#9", id: "pr-9" }, NOW), { pr: 9, sessions: ["w2"] });
        move(fixer, "starting", NOW, { holder: { session: "w2", startedBy: "githerd" } });
        move(fixer, "cancelled", NOW);
        const review = newJob({ kind: "review", target: "#9", id: "review-9", facts: { pr: 9 } }, NOW);
        const state = /** @type {any} */ ({
            jobs: { "issue-3": maker, "pr-9": fixer, "review-9": review },
            prs: {},
            prOwners: { 9: { session: "o3", name: "graphty-3", by: "tool" } },
        });
        const asking = (/** @type {string} */ session) =>
            jobOrder(state.jobs, { inUse: (j) => jobInUse(state, j, { now: NOW, session }) });
        // The maker, a session that pushed to it, and the session that said it is its own.
        for (const author of ["w1", "w2", "o3"]) {
            expect(asking(author).inUse).toEqual([{ job: "review-9", reason: "you wrote this pull request" }]);
        }
        delete state.prOwners;
        expect(asking("o2").items.map((i) => i.job)).toEqual(["review-9"]);
    });

    it("names the asking session's own claim and answer as yours, never as another session's", () => {
        const state = asked(pushed("FAILURE"), 30);
        state.asks[9].owner = { session: "s1", name: "graphty-13", at: NOW.toISOString() };
        const asking = (/** @type {string} */ session) =>
            jobOrder(state.jobs, { inUse: (j) => jobInUse(state, j, { now: NOW, session }) }).inUse;
        expect(asking("s1")).toEqual([{ job: "pr-9", reason: "yours: you said you are working on it" }]);
        expect(asking("s2")).toEqual([{ job: "pr-9", reason: "session graphty-13 said it is working on it" }]);
        const title = Object.assign(newJob({ kind: "title", target: "#9", id: "title-9" }, NOW), { pr: 9 });
        move(title, "starting", NOW, { holder: { session: "s1", startedBy: "owner" } });
        state.jobs["title-9"] = title;
        expect(asking("s1")).toEqual([{ job: "pr-9", reason: "yours: you claimed title-9" }]);
    });

    it("never offers an issue job while another session's triage batch holds that issue", () => {
        const triage = newJob(
            {
                kind: "triage",
                id: "triage-types-11",
                target: "3 issues: #282 #504 #510",
                facts: { scope: "types", batch: [282, 504, 510] },
            },
            NOW,
        );
        const issue = newJob({ kind: "issue", target: "#504", id: "issue-504" }, NOW);
        const other = newJob({ kind: "issue", target: "#600", id: "issue-600" }, NOW);
        const state = /** @type {any} */ ({ jobs: { "issue-504": issue, "issue-600": other }, prs: {} });
        state.jobs["triage-types-11"] = triage;
        const asking = (/** @type {string} */ session) =>
            jobOrder(state.jobs, { inUse: (j) => jobInUse(state, j, { now: NOW, session }) });
        // Queued, the triage job covers nothing.
        expect(asking("s2").inUse).toEqual([]);
        move(triage, "starting", NOW, { holder: { session: "s1", name: "graphty-7", startedBy: "githerd" } });
        expect(asking("s2").inUse).toEqual([
            { job: "issue-504", reason: "#504 is in triage-types-11, claimed by session graphty-7" },
        ]);
        expect(asking("s1").inUse).toEqual([
            { job: "issue-504", reason: "yours: you claimed triage-types-11, which covers #504" },
        ]);
        expect(asking("s2").items.map((i) => i.job)).toContain("issue-600");
    });
});
