import { describe, expect, it } from "vitest";

import { move } from "../lib/board.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { syncJobs } from "../lib/jobs.mjs";
import { jobInUse, jobOrder } from "../lib/queue.mjs";
import { accumulateMerged } from "../lib/merged.mjs";

const NOW = new Date("2026-10-04T12:00:00Z");
const CONFIG = normalizeConfig({
    repo: "o/r",
    lanes: { ci: { workflow: "ci.yml", gating: "required" } },
    labels: {
        types: ["bug", "enhancement"],
        priorities: ["priority:critical", "priority:high", "priority:medium", "priority:low"],
        efforts: ["effort:high", "effort:medium", "effort:low"],
    },
});
const LABELED = ["bug", "priority:high", "effort:low"];

/**
 * A quiet state with the owner's login resolved.
 * @returns {any} the state
 */
function base() {
    return {
        trust: { login: "owner" },
        master: { verdict: "green", lanes: {} },
        incidents: {},
        escalations: {},
        prs: {},
        issues: { byNumber: {} },
        mergeGate: { heads: {} },
        merged: { count: 0, pending: [], closed: [] },
        jobs: {},
    };
}

/**
 * The owner's pull request with a failing required check, its files read.
 * @param {any} state the state
 * @param {number} n its number
 * @param {any} [over] fields to override
 * @param {string[]} [files] the files it changes
 */
function failingPr(state, n, over = {}, files = ["layout/src/a.ts"]) {
    state.prs[n] = {
        author: "owner",
        draft: false,
        headRef: `fix/${n}`,
        headSha: `${n}`.padEnd(40, "0"),
        createdAt: "2026-10-01T00:00:00Z",
        labels: [],
        required: { "All Checks Pass": "FAILURE" },
        conflictSightings: 0,
        stackedOn: null,
        ...over,
    };
    state.mergeGate.heads[n] = { files, filesTruncated: false };
}

/**
 * The owner's open issue.
 * @param {any} state the state
 * @param {number} n its number
 * @param {string[]} labels its labels
 * @param {any} [over] fields to override
 */
function issue(state, n, labels, over = {}) {
    state.issues.byNumber[n] = {
        state: "open",
        author: "owner",
        createdAt: `2026-0${(n % 9) + 1}-01T00:00:00Z`,
        updatedAt: "2026-10-03T00:00:00Z",
        labels,
        ...over,
    };
}

const sync = (/** @type {any} */ state) => syncJobs(state, { config: CONFIG, now: NOW });

describe("syncJobs: incidents", () => {
    it("makes one urgent job per code-red key that did not go intermittent, and cancels it when the incident ends", () => {
        const state = base();
        state.master.lanes.ci = { redSince: "2026-10-04T11:00:00Z" };
        state.incidents.i1 = {
            id: "i1",
            status: "open",
            openedAt: "2026-10-04T11:05:00Z",
            keys: {
                "CI / Build / Run build": { lane: "ci", outcome: "fix-forward" },
                "CI / Test / Run tests": { lane: "ci", outcome: "intermittent", issue: 9 },
            },
        };
        expect(sync(state).created).toEqual(["incident-CI-Build-Run-build"]);
        expect(state.jobs["incident-CI-Build-Run-build"]).toMatchObject({
            kind: "incident",
            target: "CI / Build / Run build",
            priority: "urgent",
            state: "queued",
            facts: { scope: "master", since: "2026-10-04T11:00:00Z", lane: "ci", incident: "i1" },
        });
        // A second sync makes nothing new.
        expect(sync(state)).toEqual({ created: [], cancelled: [], lapsed: [] });
        state.incidents.i1.status = "resolved";
        expect(sync(state).cancelled).toEqual([
            { job: "incident-CI-Build-Run-build", reason: "master's incident ended or went intermittent" },
        ]);
    });

    it("makes a release incident from a failed or stalled release, and cancels it when the release recovers", () => {
        const state = base();
        state.escalations["release-failed:77"] = {
            key: "release-failed:77",
            kind: "release-failed",
            summary: "release run 77 failed",
            raisedAt: "2026-10-04T10:00:00Z",
            resolvedAt: null,
        };
        expect(sync(state).created).toEqual(["incident-release-failed-77"]);
        expect(state.jobs["incident-release-failed-77"].facts).toMatchObject({ scope: "release" });
        state.escalations["release-failed:77"].resolvedAt = NOW.toISOString();
        expect(sync(state).cancelled.map((c) => c.job)).toEqual(["incident-release-failed-77"]);
    });
});

describe("syncJobs: pull requests", () => {
    it("makes a pr job for the owner's failing pull request only, never for githerd's own files", () => {
        const state = base();
        failingPr(state, 4);
        failingPr(state, 5, { author: "stranger" });
        failingPr(state, 6, { draft: true });
        failingPr(state, 7, { stackedOn: 4 });
        failingPr(state, 8, {}, ["githerd/lib/daemon.mjs"]);
        failingPr(state, 9, {}, [".claude/settings.json"]);
        failingPr(state, 10, { required: {}, conflictSightings: 2 });
        failingPr(state, 11, { ownerGate: true });
        failingPr(state, 12);
        state.mergeGate.heads[12].files = null; // not read yet: wait
        expect(sync(state).created).toEqual(["pr-4", "pr-10"]);
        expect(state.jobs["pr-4"]).toMatchObject({
            target: "#4",
            pr: 4,
            branch: "fix/4",
            reason: "required check failing: All Checks Pass",
        });
        expect(state.jobs["pr-10"].reason).toBe("conflicting with its base (GitHub: CONFLICTING)");
    });

    it("cancels a queued pr job whose pull request closed or stopped needing work, and makes it again later", () => {
        const state = base();
        failingPr(state, 4);
        failingPr(state, 5);
        sync(state);
        delete state.prs[4];
        state.prs[5].required = { "All Checks Pass": "SUCCESS" };
        expect(sync(state).cancelled).toEqual([
            { job: "pr-4", reason: "#4 closed or merged" },
            { job: "pr-5", reason: "#5 no longer needs a worker" },
        ]);
        state.prs[5].required = { "All Checks Pass": "FAILURE" };
        expect(sync(state).created).toEqual(["pr-5"]);
        expect(state.jobs["pr-5"].state).toBe("queued");
    });

    it("keeps a queued pr job's reason on GitHub's current answer and drops it once the conflict clears (#942)", () => {
        const state = base();
        failingPr(state, 942, { baseRef: "master" });
        sync(state);
        expect(state.jobs["pr-942"].reason).toBe("required check failing: All Checks Pass");
        // Its checks pass, and GitHub reports a conflict with master, seen twice.
        Object.assign(state.prs[942], {
            required: { "All Checks Pass": "SUCCESS" },
            mergeable: "CONFLICTING",
            mergeState: "DIRTY",
            conflictSightings: 2,
        });
        expect(sync(state)).toEqual({ created: [], cancelled: [], lapsed: [] });
        expect(state.jobs["pr-942"].reason).toBe("conflicting with master (GitHub: DIRTY)");
        // Master merged in: GitHub says MERGEABLE, the sightings reset, the job goes.
        Object.assign(state.prs[942], { mergeable: "MERGEABLE", mergeState: "BLOCKED", conflictSightings: 0 });
        expect(sync(state).cancelled).toEqual([{ job: "pr-942", reason: "#942 no longer needs a worker" }]);
    });

    it("leaves a pr job in flight alone", () => {
        const state = base();
        failingPr(state, 4);
        sync(state);
        move(state.jobs["pr-4"], "starting", NOW);
        delete state.prs[4];
        expect(sync(state).cancelled).toEqual([]);
        expect(state.jobs["pr-4"].state).toBe("starting");
    });
});

describe("syncJobs: titles and the local gate", () => {
    it("makes a title job when only Lint PR Title fails, and a local incident when the gate fails on green", () => {
        const state = base();
        failingPr(state, 4, { required: { "Lint PR Title": "FAILURE", "All Checks Pass": "SUCCESS" } });
        state.master.greenSha = "g".repeat(40);
        state.reference = { gate: { verdict: "fail", sha: "g".repeat(40), steps: ["Knip"] }, at: "x" };
        expect(sync(state).created).toEqual(["incident-local-Knip", "title-4"]);
        expect(state.jobs["title-4"]).toMatchObject({ kind: "title", pr: 4 });
        expect(state.jobs["incident-local-Knip"]).toMatchObject({ target: "gate: Knip", facts: { scope: "local" } });
        state.reference.gate = { verdict: "pass", sha: "g".repeat(40) };
        state.prs[4].required["Lint PR Title"] = "SUCCESS";
        expect(sync(state).cancelled.map((c) => c.job)).toEqual(["incident-local-Knip", "title-4"]);
    });
});

describe("syncJobs: reviews", () => {
    it("makes a review for each new patch of a pull request a job made, and moves a queued one to the new patch", () => {
        const state = base();
        issue(state, 3, LABELED);
        sync(state);
        const job = state.jobs["issue-3"];
        job.pr = 20;
        failingPr(state, 20, { required: {}, patchId: "p1".padEnd(40, "a") });
        expect(sync(state).created).toEqual(["review-20"]);
        expect(state.jobs["review-20"].facts).toMatchObject({ patchId: "p1".padEnd(40, "a"), pr: 20, urgent: false });
        state.prs[20].patchId = "p2".padEnd(40, "b");
        expect(sync(state).created).toEqual([]);
        expect(state.jobs["review-20"].facts.patchId).toBe("p2".padEnd(40, "b"));
        move(state.jobs["review-20"], "starting", NOW);
        move(state.jobs["review-20"], "working", NOW);
        move(state.jobs["review-20"], "verifying", NOW);
        move(state.jobs["review-20"], "done", NOW);
        state.prs[20].patchId = "p3".padEnd(40, "c");
        expect(sync(state).created).toEqual(["review-20"]);
        expect(state.jobs["review-20"]).toMatchObject({ state: "queued", facts: { patchId: "p3".padEnd(40, "c") } });
    });
});

describe("syncJobs: triage", () => {
    it("batches unlabeled issues 20 at a time, one triage job at a time", () => {
        const state = base();
        for (let n = 1; n <= 25; n++) issue(state, n, []);
        issue(state, 30, [], { author: "stranger" });
        expect(sync(state).created).toEqual(["triage-new-1"]);
        const batch = state.jobs["triage-new-1"].facts.batch;
        expect(batch).toHaveLength(20);
        expect(batch).not.toContain(30);
        expect(sync(state).created).toEqual([]);
        move(state.jobs["triage-new-1"], "cancelled", NOW);
        for (const n of batch) state.issues.byNumber[n].labels = LABELED;
        // The labeled ones are ranked now, so the front one gets its issue job as well.
        expect(sync(state).created).toEqual(["triage-new-2", "issue-9"]);
        expect(state.jobs["triage-new-2"].facts.batch).toHaveLength(5);
    });

    it("hands the last 20 merges and the open issues to one refresh job, and passes over every issue after 100", () => {
        const state = base();
        issue(state, 1, LABELED, { text: "layout breaks\nin layout/src/force.ts" });
        issue(state, 2, LABELED, { text: "unrelated" });
        issue(state, 3, LABELED, { text: "closed by a merge" });
        issue(state, 4, LABELED, { text: "named by a merge" });
        sync(state);
        let merged = state.merged;
        const prs = Array.from({ length: 20 }, (_, i) => ({
            number: 100 + i,
            title: `pr ${i}`,
            mergedAt: `2026-10-04T11:${String(i).padStart(2, "0")}:00Z`,
            mergeSha: null,
            closes: i === 0 ? [3] : [],
            mentions: i === 1 ? [4, 999] : [],
            paths: ["layout/src/force.ts"],
            truncated: false,
        }));
        merged = accumulateMerged({ ...merged, lastScanAt: "2026-10-04T10:00:00Z" }, /** @type {any} */ (prs));
        expect(merged.count).toBe(20);
        state.merged = merged;
        expect(sync(state).created).toEqual(["triage-refresh-1"]);
        // No issue is picked by matching text: every open issue the merges do not close is listed,
        // and the session judges which ones they affect. A mentioned open issue must be judged.
        const facts = state.jobs["triage-refresh-1"].facts;
        expect(facts).toMatchObject({ scope: "refresh", batch: [4] });
        expect(facts.open).toEqual([
            { number: 1, title: "layout breaks" },
            { number: 2, title: "unrelated" },
            { number: 4, title: "named by a merge" },
        ]);
        expect(facts.merged.map((/** @type {any} */ p) => p.number)).toHaveLength(20);
        expect(state.merged.pending).toEqual([]);
        move(state.jobs["triage-refresh-1"], "cancelled", NOW);
        state.merged.count = 120;
        expect(sync(state).created).toEqual(["triage-full-2"]);
        expect(state.jobs["triage-full-2"].facts.batch).toEqual([1, 2, 3, 4]);
    });
});

describe("syncJobs: issues", () => {
    it("keeps one issue job queued: an open order first, then priority and bugs first", () => {
        const state = base();
        issue(state, 1, ["enhancement", "priority:critical", "effort:low"]);
        issue(state, 2, ["bug", "priority:critical", "effort:low"]);
        issue(state, 3, ["bug", "priority:low", "effort:low"]);
        issue(state, 4, ["bug", "priority:low", "effort:low", "blocked"]);
        expect(sync(state).created).toEqual(["issue-2"]);
        expect(state.jobs["issue-2"]).toMatchObject({ priority: "critical", facts: { bug: true } });
        expect(sync(state).created).toEqual([]);
        move(state.jobs["issue-2"], "starting", NOW);
        state.orders = [{ id: "order-1", issues: [3] }];
        expect(sync(state).created).toEqual(["issue-3"]);
        expect(state.jobs["issue-3"].facts.order).toBe(0);
    });

    it("leaves out an issue an open pull request works on, and cancels a queued one whose issue closed", () => {
        const state = base();
        issue(state, 1, LABELED);
        issue(state, 2, LABELED);
        failingPr(state, 50, { required: {}, references: [1] });
        expect(sync(state).created).toEqual(["issue-2"]);
        state.issues.byNumber[2].state = "closed";
        expect(sync(state).cancelled).toEqual([{ job: "issue-2", reason: "the issue closed" }]);
    });

    it("re-lands a pull request a revert took out, once the revert is no longer open", () => {
        const state = base();
        state.incidentActions = { reverts: { 718: 730 } };
        failingPr(state, 730, { required: {} });
        expect(sync(state).created).toEqual([]);
        delete state.prs[730];
        expect(sync(state).created).toEqual(["issue-reland-718"]);
        expect(state.jobs["issue-reland-718"]).toMatchObject({ kind: "issue", target: "#718" });
        expect(sync(state).created).toEqual([]);
    });
});

describe("syncJobs: pull requests in use (owner decision 2026-10-04)", () => {
    it("offers a held pull request that conflicts: hold stops its merge, not its fix", () => {
        const state = base();
        failingPr(state, 943, { labels: ["hold"], required: {}, mergeable: "CONFLICTING", conflictSightings: 2 });
        expect(sync(state).created).toEqual(["pr-943"]);
        const order = jobOrder(state.jobs, { inUse: (j) => jobInUse(state, j, { config: CONFIG, now: NOW }) });
        expect(order.items.map((i) => i.job)).toEqual(["pr-943"]);
    });

    it("gives a job back to the queue when the owner session that claimed it ends", () => {
        const state = base();
        failingPr(state, 7);
        sync(state);
        const job = state.jobs["pr-7"];
        move(job, "starting", NOW, { holder: { session: "o1", window: null, startedBy: "owner" } });
        move(job, "working", NOW);
        move(job, "waiting", NOW, { waitingFor: { checks: "abc" } });
        const ended = new Set();
        const gone = (/** @type {string} */ s) => ended.has(s);
        expect(syncJobs(state, { config: CONFIG, now: NOW, sessionGone: gone }).lapsed).toEqual([]);
        expect(job.state).toBe("waiting");
        ended.add("o1");
        expect(syncJobs(state, { config: CONFIG, now: NOW, sessionGone: gone }).lapsed).toEqual([
            { job: "pr-7", session: "o1" },
        ]);
        // Queued again, it says what the pull request needs now.
        expect(job).toMatchObject({ state: "queued", holder: null, reason: "required check failing: All Checks Pass" });
    });
});
