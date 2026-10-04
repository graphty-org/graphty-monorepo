import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../lib/config.mjs";
import { move, newJob } from "../lib/board.mjs";
import { jobOrder, workQueue } from "../lib/queue.mjs";

const NOW = new Date("2026-10-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const ago = (days) => new Date(NOW.getTime() - days * DAY).toISOString();

const RAW = {
    repo: "o/r",
    lanes: { ci: { workflow: "ci.yml", gating: "required" } },
    labels: {
        types: ["bug", "enhancement"],
        priorities: ["priority:critical", "priority:high", "priority:medium", "priority:low"],
        efforts: ["effort:high", "effort:medium", "effort:low"],
    },
};
const CONFIG = normalizeConfig(RAW);

/**
 * A green, quiet state with the owner's login resolved.
 * @returns {any} the state
 */
function baseState() {
    return {
        trust: { login: "owner" },
        master: { verdict: "green" },
        incidents: {},
        prs: {},
        issues: { byNumber: {} },
        escalations: {},
        claims: {},
        sessions: {},
        runs: {},
    };
}

/**
 * The owner's PR with a failing required check.
 * @param {number} days its age
 * @param {object} [over] fields to override
 * @returns {any} the record
 */
function pr(days, over = {}) {
    return {
        author: "owner",
        draft: false,
        headRef: "fix/x",
        baseRef: "master",
        createdAt: ago(days),
        labels: [],
        required: { "All Checks Pass": "FAILURE" },
        failingChecks: ["All Checks Pass"],
        conflictSightings: 0,
        ownerGate: false,
        ownerRejected: false,
        breaking: false,
        stackedOn: null,
        ...over,
    };
}

/**
 * The owner's open, fully labeled issue, touched yesterday.
 * @param {number} days its age
 * @param {string[]} labels type, priority and effort
 * @param {object} [over] fields to override
 * @returns {any} the record
 */
function issue(days, labels, over = {}) {
    return { state: "open", author: "owner", createdAt: ago(days), updatedAt: ago(1), labels, ...over };
}

const LOW_BUG = ["bug", "priority:low", "effort:low"];

/**
 * The queue's targets, in order.
 * @param {any} state the state
 * @param {any} [config] the config
 * @returns {string[]} the targets
 */
const targets = (state, config = CONFIG) => workQueue({ state, config, now: NOW }).items.map((i) => i.target);

/**
 * One queue item.
 * @param {any} state the state
 * @param {string} target its target
 * @returns {any} the item
 */
const itemOf = (state, target) => workQueue({ state, config: CONFIG, now: NOW }).items.find((i) => i.target === target);

describe("the work queue across kinds", () => {
    it("finishes before starting: red master, stuck release, PRs, unlabeled issues, ranked issues", () => {
        const state = baseState();
        state.issues.byNumber[1] = issue(90, ["bug", "priority:critical", "effort:low"]);
        state.issues.byNumber[2] = issue(10, []);
        state.prs[3] = pr(1);
        state.escalations["release-stalled:x"] = {
            key: "release-stalled:x",
            kind: "release-stalled",
            summary: "no release",
        };
        state.master = { verdict: "red", since: "2026-10-02T11:00:00Z" };
        state.incidents["inc-1"] = { id: "inc-1", status: "open" };
        const q = workQueue({ state, config: CONFIG, now: NOW });
        expect(q.items.map((i) => [i.kind, i.target])).toEqual([
            ["master", "master"],
            ["release", "task:release"],
            ["pr", "pr:3"],
            ["triage", "issue:2"],
            ["issue", "issue:1"],
        ]);
        expect(q.items[0].reason).toBe("master is red since 11:00 UTC (inc-1)");
        expect(q.items[1].reason).toBe("stuck release: no release");
        // While master is red, PRs and issues are listed but held.
        expect(q.items.slice(2).map((i) => i.waiting)).toEqual([
            "held: master is red",
            undefined,
            "held: master is red",
        ]);
    });
});

describe("the work queue: PRs", () => {
    it("goes oldest first by creation time, whatever the number", () => {
        const state = baseState();
        state.prs[9] = pr(30);
        state.prs[4] = pr(2);
        state.prs[7] = pr(10, { required: {}, failingChecks: [], conflictSightings: 2 });
        expect(targets(state)).toEqual(["pr:9", "pr:7", "pr:4"]);
        expect(itemOf(state, "pr:9").reason).toBe("required check failing: All Checks Pass, open PR, 30 days old");
        expect(itemOf(state, "pr:7").reason).toBe("conflicting, open PR, 10 days old");
    });

    it("leaves out a PR that needs nothing, a draft and another author's PR", () => {
        const state = baseState();
        state.prs[1] = pr(5, { required: { "All Checks Pass": "PENDING" } });
        state.prs[2] = pr(5, { draft: true });
        state.prs[3] = pr(5, { author: "stranger" });
        expect(targets(state)).toEqual([]);
    });

    it("makes a stacked PR wait for its base, however old it is", () => {
        const state = baseState();
        state.prs[5] = pr(40, { baseRef: "feat/base", stackedOn: 6 });
        state.prs[6] = pr(3);
        const q = workQueue({ state, config: CONFIG, now: NOW });
        expect(q.items.map((i) => [i.target, i.waiting])).toEqual([
            ["pr:5", "stacked: waits for #6"],
            ["pr:6", undefined],
        ]);
    });

    it("lists PRs waiting on the owner, oldest first, and never queues them", () => {
        const state = baseState();
        state.prs[10] = pr(3, { ownerGate: true });
        state.prs[11] = pr(20, { breaking: true });
        state.prs[12] = pr(8);
        state.escalations.d = { key: "d", kind: "decision", target: "pr:12", summary: "pick a name" };
        state.prs[13] = pr(1, { ownerGate: true, ownerRejected: true });
        const q = workQueue({ state, config: CONFIG, now: NOW });
        expect(q.items.map((i) => i.target)).toEqual(["pr:13"]);
        expect(q.ownerWaiting.map((i) => [i.target, i.reason])).toEqual([
            ["pr:11", "waiting on owner: held for a major, 20 days old"],
            ["pr:12", "waiting on owner: a decision, 8 days old"],
            ["pr:10", "waiting on owner: visual review, 3 days old"],
        ]);
    });

    it("puts quick unblockers ahead of older, slower work", () => {
        const state = baseState();
        state.master = { verdict: "green", fixedAt: ago(1) };
        state.prs[1] = pr(30);
        state.prs[2] = pr(2, { failingStartedAt: ago(3) });
        state.prs[3] = pr(1, { failingChecks: ["All Checks Pass", "Browser 3"] });
        state.flakes = { "Browser 3": { at: ago(5) } };
        expect(targets(state)).toEqual(["pr:2", "pr:3", "pr:1"]);
        expect(itemOf(state, "pr:2").reason).toMatch(/^quick: update the branch from green master, /);
        expect(itemOf(state, "pr:3").reason).toMatch(/^quick: rerun Browser 3, a known flake, /);
    });
});

describe("the work queue: issues", () => {
    it("orders by priority, then bugs first, then oldest, then lower effort", () => {
        const state = baseState();
        state.issues.byNumber[1] = issue(50, ["enhancement", "priority:high", "effort:low"]);
        state.issues.byNumber[2] = issue(10, ["bug", "priority:high", "effort:high"]);
        state.issues.byNumber[3] = issue(90, ["bug", "priority:medium", "effort:low"]);
        state.issues.byNumber[4] = issue(20, ["bug", "priority:high", "effort:low"]);
        state.issues.byNumber[5] = issue(20, ["bug", "priority:high", "effort:medium"]);
        state.issues.byNumber[6] = issue(1, ["enhancement", "priority:critical", "effort:high"]);
        expect(targets(state)).toEqual(["issue:6", "issue:4", "issue:5", "issue:2", "issue:1", "issue:3"]);
        expect(itemOf(state, "issue:2").reason).toBe("high-priority bug, 10 days old, effort:high");
        expect(itemOf(state, "issue:2").effort).toBe("high");
    });

    it("ages an issue up one level per 60 untouched days, never above high", () => {
        const state = baseState();
        state.issues.byNumber[1] = issue(400, LOW_BUG, { updatedAt: ago(130) });
        state.issues.byNumber[2] = issue(400, LOW_BUG, { updatedAt: ago(1000) });
        state.issues.byNumber[3] = issue(5, ["bug", "priority:high", "effort:low"]);
        state.issues.byNumber[4] = issue(1, ["bug", "priority:critical", "effort:low"]);
        expect(itemOf(state, "issue:1").reason).toBe(
            "high-priority bug (aged up from low, 130 days untouched), 400 days old, effort:low",
        );
        expect(itemOf(state, "issue:2").reason).toMatch(/^high-priority bug \(aged up from low, 1000 days untouched\)/);
        // Aged issues tie with high ones and win on age; nothing ages past the critical one.
        expect(targets(state)).toEqual(["issue:4", "issue:1", "issue:2", "issue:3"]);
        const slow = normalizeConfig({ ...RAW, backlog: { agingDays: 200 } });
        const kept = workQueue({ state, config: slow, now: NOW }).items.find((i) => i.target === "issue:1");
        expect(kept.reason).toBe("low-priority bug, 400 days old, effort:low");
    });

    it("triages unlabeled issues first, oldest first, since they cannot be ranked", () => {
        const state = baseState();
        state.issues.byNumber[1] = issue(5, ["bug", "priority:critical", "effort:low"]);
        state.issues.byNumber[2] = issue(3, ["bug"]);
        state.issues.byNumber[3] = issue(9, []);
        const q = workQueue({ state, config: CONFIG, now: NOW });
        expect(q.items.map((i) => [i.kind, i.target])).toEqual([
            ["triage", "issue:3"],
            ["triage", "issue:2"],
            ["issue", "issue:1"],
        ]);
        expect(q.items[0].reason).toBe("unlabeled: triage it so it can be ranked, 9 days old");
    });

    it("skips blocked, needs-decision, needs-info, other authors, breaking changes and closed issues", () => {
        const state = baseState();
        for (const [n, extra] of [
            [1, "blocked"],
            [2, "needs-decision"],
            [3, "needs-info"],
            [4, "breaking-change"],
        ]) {
            state.issues.byNumber[n] = issue(5, [...LOW_BUG, extra]);
        }
        state.issues.byNumber[5] = issue(5, LOW_BUG, { author: "stranger" });
        state.issues.byNumber[6] = issue(5, LOW_BUG, { state: "closed" });
        state.issues.byNumber[7] = issue(5, LOW_BUG);
        expect(targets(state)).toEqual(["issue:7"]);
    });

    it("holds new issue work at the open-PR cap, and while a PR is open for the issue", () => {
        const state = baseState();
        state.issues.byNumber[1] = issue(5, LOW_BUG);
        state.issues.byNumber[2] = issue(4, LOW_BUG);
        state.prs[20] = pr(1, { headRef: "githerd/issue-2", required: {} });
        state.prs[21] = pr(1, { headRef: "githerd/issue-30", required: {} });
        expect(itemOf(state, "issue:1").waiting).toBeUndefined();
        expect(itemOf(state, "issue:2").waiting).toBe("PR #20 is open for it");
        state.prs[22] = pr(1, { headRef: "githerd/issue-31", required: {} });
        expect(itemOf(state, "issue:1").waiting).toBe("githerd has 3 PRs or runs open, cap 3: landing PRs first");
        const roomy = normalizeConfig({ ...RAW, backlog: { wipCap: 4 } });
        expect(workQueue({ state, config: roomy, now: NOW }).items.find((i) => i.target === "issue:1").waiting).toBe(
            undefined,
        );
    });
});

describe("the work queue: the owner's override labels", () => {
    it("honors githerd:next and githerd:skip only when the owner applied them", () => {
        const state = baseState();
        state.issues.byNumber[1] = issue(90, ["bug", "priority:high", "effort:low"]);
        state.issues.byNumber[2] = issue(1, [...LOW_BUG, "githerd:next"], { ownerLabels: ["githerd:next"] });
        state.issues.byNumber[3] = issue(1, [...LOW_BUG, "githerd:next"], { ownerLabels: [] });
        state.issues.byNumber[4] = issue(100, ["bug", "priority:critical", "effort:low", "githerd:skip"], {
            ownerLabels: ["githerd:skip"],
        });
        state.issues.byNumber[5] = issue(100, ["bug", "priority:critical", "effort:low", "githerd:skip"]);
        state.prs[8] = pr(30);
        state.prs[9] = pr(1, { labels: ["githerd:next"], ownerLabels: ["githerd:next"] });
        expect(targets(state)).toEqual(["pr:9", "pr:8", "issue:2", "issue:5", "issue:1", "issue:3"]);
        expect(itemOf(state, "issue:2").reason).toBe("githerd:next (owner), low-priority bug, 1 day old, effort:low");
    });
});

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
        });
        expect(jobOrder(jobs).items.map((i) => i.job)).toEqual(["pr-5", "issue-3"]);
    });
});
