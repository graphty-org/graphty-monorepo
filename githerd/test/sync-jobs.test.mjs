import { describe, expect, it } from "vitest";

import { move } from "../lib/board.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { jobText } from "../lib/job-text.mjs";
import { syncJobs } from "../lib/jobs.mjs";
import { jobInUse, jobOrder } from "../lib/queue.mjs";
import { accumulateMerged, commitRefs } from "../lib/merged.mjs";

const NOW = new Date("2026-10-04T12:00:00Z");
const CONFIG = normalizeConfig({
    repo: "o/r",
    lanes: { ci: { workflow: "ci.yml", gating: "required" } },
    labels: {
        types: ["bug", "enhancement", "infrastructure"],
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
        // The one-time type-refresh pass is done; its own test removes this.
        triagePasses: { refreshAt: 0, fullAt: 0, queue: [], seq: 0, typesQueued: true },
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
    it("tells a verdict job when the red commit is a merge batch, and which pull requests it merged", () => {
        const state = base();
        state.master.lanes.ci = { sha: "c".repeat(40), redJobs: [{ id: 55, runId: 5, key: "CI / Build / Lint all" }] };
        state.incidents.i1 = {
            id: "i1",
            status: "open",
            openedAt: "2026-10-04T11:05:00Z",
            lastGreenSha: "a".repeat(40),
            redBatch: [42, 43],
            keys: { "CI / Build / Lint all": { lane: "ci", outcome: "waiting" } },
        };
        sync(state);
        const job = state.jobs["verdict-ci-build-lint-all"];
        expect(job.facts.batch).toEqual([42, 43]);
        expect(jobText(job)).toContain(
            'BATCH COMMIT: the red commit merged #42, #43 as one Mergify batch. Its tree is exactly what "Queue Checks Pass" passed',
        );
        // A red commit that is no batch says nothing of one.
        delete state.incidents.i1.redBatch;
        delete state.jobs["verdict-ci-build-lint-all"];
        sync(state);
        expect(jobText(state.jobs["verdict-ci-build-lint-all"])).not.toContain("BATCH COMMIT");
    });

    it("makes one urgent verdict job per key Claude has not judged, then a fix job once it is judged code", () => {
        const state = base();
        state.master.lanes.ci = {
            redSince: "2026-10-04T11:00:00Z",
            sha: "c".repeat(40),
            redJobs: [{ id: 55, runId: 5, key: "CI / Build / Run build", textClass: "unclassified" }],
        };
        state.incidents.i1 = {
            id: "i1",
            status: "open",
            openedAt: "2026-10-04T11:05:00Z",
            lastGreenSha: "a".repeat(40),
            keys: { "CI / Build / Run build": { lane: "ci", outcome: "waiting" } },
        };
        expect(sync(state).created).toEqual(["verdict-ci-build-run-build"]);
        expect(state.jobs["verdict-ci-build-run-build"]).toMatchObject({
            kind: "incident",
            target: "CI / Build / Run build",
            priority: "urgent",
            facts: {
                scope: "verdict",
                lane: "ci",
                runId: 5,
                jobId: 55,
                redSha: "c".repeat(40),
                greenSha: "a".repeat(40),
            },
        });
        state.master.lanes.ci.verdicts = { "CI / Build / Run build": { verdict: "code" } };
        const after = sync(state);
        expect(after.created).toEqual(["incident-ci-build-run-build"]);
        expect(after.cancelled).toEqual([
            { job: "verdict-ci-build-run-build", reason: "a verdict was recorded, or master's incident ended" },
        ]);
        // An environment verdict makes no fix job.
        const env = base();
        env.master.lanes.ci = { verdicts: { "CI / Build / Run build": { verdict: "environment" } } };
        env.incidents.i1 = { ...state.incidents.i1 };
        expect(sync(env).created).toEqual([]);
    });

    it("makes ids from failure keys that match the tools' job id pattern, and keeps a live job saved under an old id", () => {
        const KEY = "CI / Build / Security audit";
        const state = base();
        state.master.lanes.ci = { redJobs: [{ id: 1, runId: 2, key: KEY, textClass: "unclassified" }] };
        state.incidents.i1 = {
            id: "i1",
            status: "open",
            openedAt: "x",
            keys: { [KEY]: { lane: "ci", outcome: "waiting" } },
        };
        const [id] = sync(state).created;
        expect(id).toBe("verdict-ci-build-security-audit");
        expect(id).toMatch(/^[a-z][a-z0-9-]{1,119}$/);
        expect(state.jobs[id].facts.key).toBe(KEY);
        // A job saved before ids were normalized stays the job for its key, neither cancelled nor doubled.
        const old = base();
        old.master.lanes.ci = state.master.lanes.ci;
        old.incidents.i1 = state.incidents.i1;
        const legacy = { ...state.jobs[id], id: "verdict-CI-Build-Security-audit" };
        old.jobs = { [legacy.id]: legacy };
        expect(sync(old)).toEqual({ created: [], cancelled: [], lapsed: [] });
        expect(Object.keys(old.jobs)).toEqual(["verdict-CI-Build-Security-audit"]);
    });

    it("makes one urgent job per key judged code that did not go intermittent, and cancels it when the incident ends", () => {
        const state = base();
        const code = { verdict: "code" };
        state.master.lanes.ci = {
            redSince: "2026-10-04T11:00:00Z",
            verdicts: { "CI / Build / Run build": code, "CI / Test / Run tests": code },
        };
        state.incidents.i1 = {
            id: "i1",
            status: "open",
            openedAt: "2026-10-04T11:05:00Z",
            keys: {
                "CI / Build / Run build": { lane: "ci", outcome: "fix-forward" },
                "CI / Test / Run tests": { lane: "ci", outcome: "intermittent", issue: 9 },
            },
        };
        expect(sync(state).created).toEqual(["incident-ci-build-run-build"]);
        expect(state.jobs["incident-ci-build-run-build"]).toMatchObject({
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
            { job: "incident-ci-build-run-build", reason: "master's incident ended or went intermittent" },
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

    it("cancels a release incident an owner session holds once the release recovers, and tells it why", () => {
        const state = base();
        const key = "release-stalled:114ae7f8";
        state.escalations[key] = { key, kind: "release-stalled", summary: "stalled", raisedAt: "2026-10-04T10:00:00Z" };
        sync(state);
        const job = state.jobs["incident-release-stalled-114ae7f8"];
        move(job, "starting", NOW, { holder: { session: "s1", window: null, startedBy: "owner" } });
        move(job, "working", NOW);
        move(job, "waiting", NOW, { waitingFor: { lane: "release" } });
        state.escalations[key].resolvedAt = NOW.toISOString();
        expect(sync(state).cancelled).toEqual([
            { job: job.id, reason: "the release recovered", session: "s1", startedBy: "owner" },
        ]);
        expect(job).toMatchObject({ state: "cancelled", holder: null, reason: "the release recovered" });
        expect(job.news.at(-1).text).toBe("job cancelled: the release recovered; stop work on it");
    });
});

describe("syncJobs: pull requests", () => {
    it("makes a pr job for the owner's failing pull request only, githerd's own files for the owner's sessions", () => {
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
        expect(sync(state).created).toEqual(["pr-4", "pr-8", "pr-9", "pr-10"]);
        expect([4, 8, 9].map((n) => state.jobs[`pr-${n}`].facts.ownerOnly)).toEqual([false, true, true]);
        expect(state.jobs["pr-4"]).toMatchObject({
            target: "#4",
            pr: 4,
            branch: "fix/4",
            reason: "required check failing: All Checks Pass",
        });
        expect(state.jobs["pr-10"].reason).toBe("conflicting with its base (GitHub: CONFLICTING)");
    });

    it("makes a pr job, never an owner item, for a stacked pull request that conflicts with its base", () => {
        const state = base();
        failingPr(state, 617, { stackedOn: 490, required: {}, conflictSightings: 2, mergeable: "CONFLICTING" });
        failingPr(state, 618, { stackedOn: 490 }); // failing, not conflicting: waits on its base
        expect(sync(state).created).toEqual(["pr-617"]);
        expect(state.jobs["pr-617"]).toMatchObject({
            kind: "pr",
            pr: 617,
            branch: "fix/617",
            reason: "conflicting with its base #490 (GitHub: CONFLICTING)",
        });
        expect(state.ownerItems).toBeUndefined();
    });

    it("makes a pr job for a held pull request that is broken, and its text says it stays held", () => {
        const state = base();
        const conflict = { required: {}, conflictSightings: 2, mergeable: "CONFLICTING" };
        failingPr(state, 676, { ...conflict, breaking: true }); // held for a grouped major
        failingPr(state, 702, { breaking: true }); // failing
        failingPr(state, 703, { ...conflict, labels: ["hold"] });
        failingPr(state, 704, { ...conflict, labels: ["breaking-hold"] });
        failingPr(state, 705, { required: {}, breaking: true }); // held and healthy: nothing to fix
        failingPr(state, 706);
        expect(sync(state).created).toEqual(["pr-676", "pr-702", "pr-703", "pr-704", "pr-706"]);
        expect([676, 702, 703, 704, 706].map((n) => state.jobs[`pr-${n}`].facts.held)).toEqual([
            true,
            true,
            true,
            true,
            false,
        ]);
        expect(jobText(state.jobs["pr-676"])).toContain(
            "HELD: this pull request is held from merging (breaking, held for a grouped major, or a hold label) and stays held. " +
                "Fix only: make its required checks green, bringing master in only as the rules below allow. Never merge it, and never change its title or labels.",
        );
        expect(jobText(state.jobs["pr-706"])).not.toContain("HELD:");
    });

    it("acts on github-actions' critical revert and red-master issue: a stale revert gets a job to verify and close it", () => {
        const state = base();
        state.trust.bots = ["github-actions[bot]"];
        const revert = {
            author: "github-actions[bot]",
            title: "revert: pull request #1118, master CI red at e339bf6",
            labels: ["priority:critical"],
            required: { "All Checks Pass": "SUCCESS" },
        };
        failingPr(state, 1203, revert);
        issue(state, 1124, ["bug", "priority:critical", "effort:low"], {
            author: "github-actions[bot]",
            text: "Red master: CI failed on 7edecd1\n",
        });
        expect(sync(state).created).toEqual(expect.arrayContaining(["pr-1203", "issue-1124"]));
        expect(state.jobs["pr-1203"].reason).toMatch(/^stale revert: master is green again/);
        // While master is still red the revert is live: no stale job.
        const live = base();
        live.trust.bots = ["github-actions[bot]"];
        live.master.verdict = "red";
        failingPr(live, 1203, revert);
        sync(live);
        expect(live.jobs["pr-1203"]).toBeUndefined();
    });

    it("never makes a job from the release train's pull request, failing or conflicting", () => {
        const state = base();
        const train = { author: "github-actions", headRef: "release/train-1", title: "chore(release): publish" };
        failingPr(state, 1092, { ...train, conflictSightings: 2, labels: ["priority:critical"] });
        expect(sync(state).created).toEqual([]);
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

    it("cancels a held pr job whose pull request stopped needing work, with news for its holder", () => {
        const state = base();
        failingPr(state, 4);
        failingPr(state, 5);
        sync(state);
        const owner = { session: "s1", window: null, startedBy: "owner" };
        move(state.jobs["pr-4"], "starting", NOW, { holder: owner });
        move(state.jobs["pr-4"], "working", NOW);
        const worker = { session: "w1", pane: "%3", startedBy: "githerd" };
        move(state.jobs["pr-5"], "starting", NOW, { holder: worker });
        state.prs[4].required = { "All Checks Pass": "SUCCESS" };
        delete state.prs[5];
        expect(sync(state).cancelled).toEqual([
            { job: "pr-4", reason: "#4 no longer needs a worker", session: "s1", startedBy: "owner" },
            { job: "pr-5", reason: "#5 closed or merged", session: "w1", startedBy: "githerd" },
        ]);
        expect(state.jobs["pr-4"]).toMatchObject({ state: "cancelled", holder: null });
        expect(state.jobs["pr-4"].news).toEqual([
            {
                at: NOW.toISOString(),
                text: "job cancelled: #4 no longer needs a worker; stop work on it",
                acked: false,
            },
        ]);
        // A githerd worker's session is ended, as any job that lets its worker go.
        expect(state.retiring).toEqual([expect.objectContaining({ job: "pr-5", holder: worker })]);
    });

    it("leaves a held pr job whose holder pushed, and a verifying job, to the done check", () => {
        const state = base();
        failingPr(state, 4);
        failingPr(state, 5);
        sync(state);
        const holder = { session: "s1", window: null, startedBy: "owner" };
        move(state.jobs["pr-4"], "starting", NOW, { holder });
        move(state.jobs["pr-4"], "working", NOW);
        state.jobs["pr-4"].pushedHead = "b".repeat(40);
        move(state.jobs["pr-5"], "starting", NOW, { holder });
        move(state.jobs["pr-5"], "working", NOW);
        move(state.jobs["pr-5"], "verifying", NOW);
        state.prs[4].required = { "All Checks Pass": "PENDING" };
        delete state.prs[5];
        expect(sync(state).cancelled).toEqual([]);
        expect(state.jobs["pr-4"].state).toBe("working");
        expect(state.jobs["pr-5"].state).toBe("verifying");
    });
});

describe("syncJobs: titles and the local gate", () => {
    it("makes a title job when only Lint PR Title fails, and a local incident when the gate fails on green", () => {
        const state = base();
        failingPr(state, 4, { required: { "Lint PR Title": "FAILURE", "All Checks Pass": "SUCCESS" } });
        state.master.greenSha = "g".repeat(40);
        state.reference = { gate: { verdict: "fail", sha: "g".repeat(40), steps: ["Knip"] }, at: "x" };
        expect(sync(state).created).toEqual(["incident-local-knip", "title-4"]);
        expect(state.jobs["title-4"]).toMatchObject({ kind: "title", pr: 4 });
        expect(state.jobs["incident-local-knip"]).toMatchObject({ target: "gate: Knip", facts: { scope: "local" } });
        state.reference.gate = { verdict: "pass", sha: "g".repeat(40) };
        state.prs[4].required["Lint PR Title"] = "SUCCESS";
        expect(sync(state).cancelled.map((c) => c.job)).toEqual(["incident-local-knip", "title-4"]);
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
    it("names the label kinds each issue lacks, never calling a partly labeled issue unlabeled", () => {
        const state = base();
        // Issue #441 had bug and priority:medium since 2026-09-26; only its effort was missing.
        issue(state, 441, ["bug", "priority:medium"]);
        issue(state, 442, []);
        expect(sync(state).created).toEqual(["triage-new-1"]);
        const job = state.jobs["triage-new-1"];
        expect(job.reason).toBe("missing labels: #441 effort, #442 type+priority+effort");
        expect(job.facts.missing).toEqual({ 441: ["effort"], 442: ["type", "priority", "effort"] });
        expect(jobText(job)).toContain(
            "MISSING LABELS (add only these kinds; keep the labels each issue already has):\n  #441: effort\n  #442: type, priority, effort\n",
        );
    });

    it("batches issues missing labels 20 at a time, one triage job at a time", () => {
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

describe("syncJobs: the one-time type refresh (owner decision 2026-10-06)", () => {
    it("re-judges every open issue's type once, 20 per job, after the new issues' triage", () => {
        const state = base();
        delete state.triagePasses;
        for (let n = 1; n <= 22; n++) issue(state, n, LABELED);
        issue(state, 30, []);
        expect(sync(state).created).toEqual(["triage-new-1", "issue-9"]);
        move(state.jobs["triage-new-1"], "cancelled", NOW);
        state.issues.byNumber[30].labels = LABELED;
        expect(sync(state).created).toEqual(["triage-types-2"]);
        const job = state.jobs["triage-types-2"];
        expect(job.reason).toBe("re-judge each issue's type label now that infrastructure exists");
        expect(job.facts.batch).toHaveLength(20);
        expect(jobText(job)).toContain("TYPE REFRESH");
        move(job, "cancelled", NOW);
        expect(sync(state).created).toEqual(["triage-types-3"]);
        expect(state.jobs["triage-types-3"].facts.batch).toEqual([21, 22, 30]);
        move(state.jobs["triage-types-3"], "cancelled", NOW);
        // Once only.
        expect(sync(state).created).toEqual([]);
        expect(state.triagePasses.typesQueued).toBe(true);
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

    it("offers bugs, then infrastructure, each by priority and effort, and never an enhancement", () => {
        const state = base();
        issue(state, 40, ["enhancement", "priority:critical", "effort:low"]);
        issue(state, 50, ["infrastructure", "priority:critical", "effort:low"]);
        issue(state, 125, ["bug", "priority:high", "effort:high"]);
        issue(state, 123, ["bug", "priority:high", "effort:low"]);
        issue(state, 126, ["bug", "priority:low", "effort:low"]);
        const order = [];
        for (let i = 0; i < 6; i++) {
            const made = sync(state).created;
            order.push(...made);
            for (const id of made) move(state.jobs[id], "starting", NOW);
        }
        expect(order).toEqual(["issue-123", "issue-125", "issue-126", "issue-50"]);
        expect(state.jobs["issue-123"].reason).toBe("front of the issue queue: high bug, effort low");
        expect(state.jobs["issue-50"].reason).toBe("front of the issue queue: critical infrastructure, effort low");
        expect(state.jobs["issue-40"]).toBeUndefined();
    });

    it("offers an enhancement only when backlog.issueTypes names it or the owner picks it", () => {
        const withEnhancements = normalizeConfig({
            repo: "o/r",
            lanes: { ci: { workflow: "ci.yml", gating: "required" } },
            labels: CONFIG.labels,
            backlog: { issueTypes: ["bug", "infrastructure", "enhancement"] },
        });
        const state = base();
        issue(state, 40, ["enhancement", "priority:high", "effort:low"]);
        expect(sync(state).created).toEqual([]);
        expect(syncJobs(state, { config: withEnhancements, now: NOW }).created).toEqual(["issue-40"]);

        const picked = base();
        issue(picked, 41, ["enhancement", "priority:low", "effort:low"]);
        picked.orders = [{ id: "order-1", issues: [41] }];
        expect(sync(picked).created).toEqual(["issue-41"]);
    });

    it("offers no verify job for an enhancement master names, nor for a needs-decision issue", () => {
        const state = base();
        issue(state, 42, ["enhancement", "priority:critical", "effort:low"]);
        issue(state, 43, ["bug", "priority:critical", "effort:low", "needs-decision"]);
        state.merged.commitRefs = commitRefs(
            "958d8e9c6\tfeat: a thing\n\nRefs #42\x1e1234567ab\tfix: Refs #43",
            [42, 43],
        );
        expect(sync(state).created).toEqual([]);
        // The owner's pick still brings it in, as the verify it is.
        state.orders = [{ id: "order-1", issues: [42] }];
        expect(sync(state).created).toEqual(["issue-42"]);
        expect(state.jobs["issue-42"].facts.references).toEqual(["958d8e9c6"]);
    });

    it("never cancels a queued verify job or bundle the rule now refuses", () => {
        const state = base();
        for (const n of [42, 43]) issue(state, n, ["enhancement", "priority:high", "effort:low"]);
        issue(state, 44, ["bug", "priority:high", "effort:low"]);
        issue(state, 45, ["bug", "priority:high", "effort:low"]);
        const job = (/** @type {number} */ n, /** @type {any} */ facts) => ({
            id: `issue-${n}`,
            kind: "issue",
            target: `#${n}`,
            state: "queued",
            holder: null,
            facts,
        });
        state.jobs = {
            "issue-42": job(42, { references: ["#347"] }),
            "issue-43": { ...job(43, { references: ["#347"] }), state: "working", holder: { session: "s1" } },
            "issue-44": job(44, { batch: [44, 45] }),
        };
        state.issues.byNumber[45].labels.push("needs-decision");
        const out = sync(state);
        expect(out.cancelled).toEqual([]);
        expect(state.jobs["issue-42"].state).toBe("queued");
        expect(state.jobs["issue-44"].state).toBe("queued");
        expect(state.jobs["issue-43"].state).toBe("working");
    });

    it("keeps a queued enhancement job when enhancements stop being offered", () => {
        const withEnhancements = normalizeConfig({
            repo: "o/r",
            lanes: { ci: { workflow: "ci.yml", gating: "required" } },
            labels: CONFIG.labels,
            backlog: { issueTypes: ["bug", "infrastructure", "enhancement"] },
        });
        const state = base();
        issue(state, 40, ["enhancement", "priority:high", "effort:low"]);
        issue(state, 41, ["enhancement", "priority:high", "effort:medium"]);
        syncJobs(state, { config: withEnhancements, now: NOW });
        move(state.jobs["issue-40"], "starting", NOW, { holder: { session: "s1", startedBy: "owner" } });
        syncJobs(state, { config: withEnhancements, now: NOW });
        expect(state.jobs["issue-41"].state).toBe("queued");
        const out = sync(state);
        expect(out.cancelled).toEqual([]);
        expect(state.jobs["issue-41"].state).toBe("queued");
        expect(state.jobs["issue-40"].state).toBe("starting");
    });

    it("never offers an issue labeled needs-decision, whatever its priority", () => {
        const state = base();
        issue(state, 1, ["bug", "priority:critical", "effort:low", "needs-decision"]);
        issue(state, 2, ["infrastructure", "priority:low", "effort:high"]);
        expect(sync(state).created).toEqual(["issue-2"]);
        move(state.jobs["issue-2"], "starting", NOW);
        expect(sync(state).created).toEqual([]);
        expect(state.jobs["issue-1"]).toBeUndefined();
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

    it("holds a deferred issue while its revision is unchanged, and offers it again once it changes", () => {
        const state = base();
        issue(state, 1, LABELED);
        expect(sync(state).created).toEqual(["issue-1"]);
        move(state.jobs["issue-1"], "cancelled", NOW, { reason: "deferred: declined" });
        state.deferred = { 1: { reason: "declined", revision: "2026-10-03T00:00:00Z" } };
        expect(sync(state).created).toEqual([]);
        expect(state.deferred[1]).toBeDefined();
        // The owner commented: a new revision ends the deferral.
        state.issues.byNumber[1].updatedAt = "2026-10-04T09:00:00Z";
        expect(sync(state).created).toEqual(["issue-1"]);
        expect(state.deferred).toEqual({});
        expect(state.jobs["issue-1"].state).toBe("queued");
    });

    it("counts the Decision comment posted just before a deferral as part of it, and ends it on a later change", () => {
        const state = base();
        issue(state, 1205, LABELED);
        expect(sync(state).created).toEqual(["issue-1205"]);
        move(state.jobs["issue-1205"], "cancelled", NOW, { reason: "deferred: declined" });
        // githerd last polled the issue at 10:00; the session commented at 10:05, then deferred at 10:06.
        state.deferred = {
            1205: { reason: "declined", revision: "2026-10-07T10:00:00Z", at: "2026-10-07T10:06:00.000Z" },
        };
        state.issues.byNumber[1205].updatedAt = "2026-10-07T10:05:00Z";
        expect(sync(state).created).toEqual([]);
        expect(state.deferred[1205]).toBeDefined();
        // Someone comments after the deferral: it ends.
        state.issues.byNumber[1205].updatedAt = "2026-10-07T10:30:00Z";
        expect(sync(state).created).toEqual(["issue-1205"]);
        expect(state.deferred).toEqual({});
    });

    it("offers an issue a master commit or a merged pull request already names as a verify job", () => {
        const state = base();
        issue(state, 906, LABELED);
        state.merged.commitRefs = commitRefs(
            "958d8e9c6\tfix: a legend swatch\n\nRefs #906\x1eabc123456\tfix: other\n\nRefs #9060\x1edef123456\tfix: names #906 in prose",
            [906],
        );
        state.merged = accumulateMerged(state.merged, [
            /** @type {any} */ ({ number: 550, mergedAt: "2026-09-30T00:00:00Z", closes: [906], mentions: [] }),
        ]);
        expect(sync(state).created).toEqual(["issue-906"]);
        const job = state.jobs["issue-906"];
        expect(job.reason).toBe("referenced by 958d8e9c6, #550 on master");
        expect(job.facts.references).toEqual(["958d8e9c6", "#550"]);
        expect(jobText(job)).toContain(
            "WHAT FOR: Already referenced on master by 958d8e9c6, #550: first check whether it is fixed;",
        );
    });

    it("does not offer a verify job for a fix merged into another pull request's branch", () => {
        const state = base();
        issue(state, 619, LABELED);
        state.merged = accumulateMerged(state.merged, [
            /** @type {any} */ ({
                number: 696,
                base: "feat/x",
                mergedAt: "2026-10-03T00:00:00Z",
                closes: [],
                mentions: [619],
            }),
        ]);
        expect(sync(state).created).toEqual(["issue-619"]);
        expect(state.jobs["issue-619"].facts.references).toBeUndefined();
    });

    it("offers no verify job for references a triage keep already weighed, and does for a later one", () => {
        // #966: a commit on master named it, and the session that read it left the issue open.
        const state = base();
        issue(state, 966, LABELED, { judgedRefs: ["b702301a5"] });
        state.merged.commitRefs = commitRefs("b702301a5\ttest(graphty): space out the fixture\n\nRefs #966", [966]);
        expect(sync(state).created).toEqual(["issue-966"]);
        expect(state.jobs["issue-966"].reason).toBe("front of the issue queue: high bug, effort low");
        expect(state.jobs["issue-966"].facts.references).toBeUndefined();
        delete state.jobs["issue-966"];
        state.merged.commitRefs = commitRefs(
            "1234567ab\tfix: the rest, refs #966\x1eb702301a5\ttest: refs #966",
            [966],
        );
        expect(sync(state).created).toEqual(["issue-966"]);
        expect(state.jobs["issue-966"].facts.references).toEqual(["1234567ab"]);
    });

    it("has the next refresh judge an issue only a commit on master names", () => {
        const state = base();
        issue(state, 966, LABELED);
        issue(state, 967, LABELED, { judgedRefs: ["aaaaaaaaa"] });
        state.merged.commitRefs = commitRefs("b702301a5\tfix: Refs #966\x1eaaaaaaaaa\tfix: Refs #967", [966, 967]);
        sync(state);
        const prs = Array.from({ length: 20 }, (_, i) => ({
            number: 100 + i,
            mergedAt: `2026-10-04T11:${String(i).padStart(2, "0")}:00Z`,
            closes: [],
            mentions: [],
            paths: [],
        }));
        state.merged = accumulateMerged(state.merged, /** @type {any} */ (prs));
        expect(sync(state).created).toEqual(["triage-refresh-1"]);
        // No merge mentions #966, yet a commit names it and no verdict weighed that yet.
        expect(state.jobs["triage-refresh-1"].facts.batch).toEqual([966]);
    });

    it("leaves an issue nothing on master names unchanged", () => {
        const state = base();
        issue(state, 906, LABELED);
        state.merged.commitRefs = commitRefs(
            "abc123456\tfix: other, refs #9060\x1edef123456\tfix: as #906 asked",
            [906],
        );
        expect(sync(state).created).toEqual(["issue-906"]);
        expect(state.jobs["issue-906"].reason).toBe("front of the issue queue: high bug, effort low");
        expect(state.jobs["issue-906"].facts.references).toBeUndefined();
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
        const inUse = (/** @type {any} */ j) => jobInUse(state, j, { config: CONFIG, now: NOW });
        // Like a failed head, a conflicting head someone else pushed is asked about first.
        expect(jobOrder(state.jobs, { inUse }).inUse[0].reason).toMatch(
            /conflicts with its base; githerd is asking the sessions/,
        );
        const head = state.prs[943].headSha;
        state.asks = { 943: { head, askedAt: NOW.toISOString(), sessions: [], sent: [], failed: [], owner: null } };
        expect(jobOrder(state.jobs, { inUse }).items.map((i) => i.job)).toEqual(["pr-943"]);
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

describe("syncJobs: advisory check promotions", () => {
    const advisory = (enforce) => ({
        entries: [{ id: "links", job: "links", step: null, enforce, issue: 1120 }],
        names: { links: "^Links$" },
    });
    const syncOn = (state, day) => syncJobs(state, { config: CONFIG, now: new Date(`${day}T12:00:00Z`) });

    it("makes one owner-session job from three days before the enforce date, in the keep-things-running tier", () => {
        const state = base();
        state.advisory = advisory("2026-10-08");
        expect(syncOn(state, "2026-10-04").created).toEqual([]);
        expect(syncOn(state, "2026-10-05").created).toEqual(["issue-promote-links"]);
        const job = state.jobs["issue-promote-links"];
        expect(job).toMatchObject({
            kind: "issue",
            target: "#1120",
            priority: "high",
            facts: { scope: "promote", check: "links", enforce: "2026-10-08", ownerOnly: true },
        });
        expect(jobText(job)).toContain(
            'moves its entry from "advisory" into "required" and removes its warning wiring from .github/workflows/ci.yml',
        );
        expect(jobText(job)).toContain("Refs #1120");
        // Ahead of a fresh bug: it finishes what CI's plan started.
        issue(state, 7, LABELED);
        syncOn(state, "2026-10-05");
        const order = jobOrder(state.jobs).items;
        expect(order.map((i) => i.job)).toEqual(["issue-promote-links", "issue-7"]);
        expect(order[0].reason).toContain("finishes #1120: promote advisory check links, enforced from 2026-10-08");
        // Never a second one, even once it is done and the entry is still listed.
        expect(syncOn(state, "2026-10-09").created).toEqual([]);
        move(job, "starting", NOW);
        move(job, "working", NOW);
        move(job, "verifying", NOW);
        move(job, "done", NOW);
        expect(syncOn(state, "2026-10-10").created).toEqual([]);
    });

    it("is cancelled once master no longer lists the check as advisory", () => {
        const state = base();
        state.advisory = advisory("2026-10-08");
        syncOn(state, "2026-10-06");
        state.advisory = { entries: [], names: {} };
        expect(syncOn(state, "2026-10-06").cancelled).toEqual([
            { job: "issue-promote-links", reason: "links is no longer an advisory check on master" },
        ]);
        // Before the registry was ever read, nothing is made or cancelled.
        const fresh = base();
        expect(syncOn(fresh, "2026-10-06").created).toEqual([]);
    });
});

describe("syncJobs: issue bundles (owner decision 2026-10-06)", () => {
    const BUG = (/** @type {string} */ priority, /** @type {string} */ effort = "low") => [
        "bug",
        `priority:${priority}`,
        `effort:${effort}`,
    ];
    /**
     * An issue whose title names its package.
     * @param {any} state the state
     * @param {number} n its number
     * @param {string} pkg the package
     * @param {string[]} labels its labels
     */
    const titled = (state, n, pkg, labels) => {
        issue(state, n, labels, { text: `${pkg}: issue ${n}\nbody` });
    };

    it("offers up to three more small issues of the anchor's type and package, in queue order", () => {
        const state = base();
        titled(state, 964, "graph-io", BUG("high"));
        titled(state, 962, "graph-io", BUG("medium"));
        titled(state, 965, "graph-io", BUG("low"));
        titled(state, 969, "graph-io", BUG("low"));
        titled(state, 971, "graph-io", BUG("low"));
        titled(state, 961, "algorithms", BUG("medium"));
        titled(state, 963, "graph-io", BUG("medium", "medium"));
        titled(state, 966, "graph-io", [...BUG("medium"), "needs-decision"]);
        titled(state, 967, "graph-io", [...BUG("low"), "hold"]);
        titled(state, 973, "graph-io", [...BUG("medium"), "visual"]);
        titled(state, 968, "graph-io", ["infrastructure", "priority:high", "effort:low"]);
        expect(sync(state).created).toEqual(["issue-964"]);
        const job = state.jobs["issue-964"];
        expect(job.facts).toMatchObject({ batch: [964, 962, 965, 969], package: "graph-io" });
        expect(job.reason).toBe("front of the issue queue: high bug, effort low; bundled with #962, #965, #969");
        expect(jobText(job)).toContain("(Fixes #964, Fixes #962, Fixes #965, Fixes #969)");

        // Held: each bundled issue is in use and gets no job of its own.
        move(job, "starting", NOW, { holder: { session: "s1", startedBy: "owner" } });
        const probe = { id: "issue-962", kind: "issue", target: "#962" };
        expect(jobInUse(state, probe, { config: CONFIG, now: NOW })).toBe(
            "#962 is in issue-964, claimed by session s1",
        );
        const next = sync(state).created;
        expect(next).toHaveLength(1);
        expect([962, 965, 969].map((n) => `issue-${n}`)).not.toContain(next[0]);

        // Ended: free again.
        move(job, "cancelled", NOW);
        expect(jobInUse(state, probe, { config: CONFIG, now: NOW })).toBeNull();
    });

    it("bundles only an effort:low anchor that is not critical, and skips one already in use", () => {
        const medium = base();
        titled(medium, 1, "layout", BUG("high", "medium"));
        titled(medium, 2, "layout", BUG("high"));
        sync(medium);
        expect(medium.jobs["issue-2"].facts.batch).toBeUndefined();

        const critical = base();
        titled(critical, 1, "layout", BUG("critical"));
        titled(critical, 2, "layout", BUG("high"));
        sync(critical);
        expect(critical.jobs["issue-1"].facts.batch).toBeUndefined();

        const used = base();
        titled(used, 1, "layout", BUG("high"));
        titled(used, 2, "layout", BUG("high"));
        titled(used, 3, "layout", BUG("high"));
        used.jobs["triage-full-1"] = { id: "triage-full-1", kind: "triage", state: "working", facts: { batch: [2] } };
        sync(used);
        expect(used.jobs["issue-1"].facts.batch).toEqual([1, 3]);
    });

    it("reads the package from a package: label, and follows backlog.bundle and backlog.bundleMax", () => {
        const labeled = base();
        for (const n of [1, 2, 3]) issue(labeled, n, [...BUG("high"), "package:layout"]);
        sync(labeled);
        expect(labeled.jobs["issue-1"].facts).toMatchObject({ batch: [1, 2, 3], package: "layout" });

        const config = (/** @type {any} */ backlog) =>
            normalizeConfig({
                repo: "o/r",
                lanes: { ci: { workflow: "ci.yml", gating: "required" } },
                labels: CONFIG.labels,
                backlog,
            });
        const off = base();
        for (const n of [1, 2, 3]) titled(off, n, "layout", BUG("high"));
        syncJobs(off, { config: config({ bundle: false }), now: NOW });
        expect(off.jobs["issue-1"].facts.batch).toBeUndefined();

        const two = base();
        for (const n of [1, 2, 3]) titled(two, n, "layout", BUG("high"));
        syncJobs(two, { config: config({ bundleMax: 2 }), now: NOW });
        expect(two.jobs["issue-1"].facts.batch).toEqual([1, 2]);
    });

    it("offers an issue a bundle left out alone until it changes", () => {
        const state = base();
        for (const n of [1, 2, 3]) titled(state, n, "layout", BUG("high"));
        state.unbundled = { 1: "2026-10-03T00:00:00Z", 2: "2026-10-03T00:00:00Z" };
        sync(state);
        expect(state.jobs["issue-1"].facts.batch).toBeUndefined();
        delete state.jobs["issue-1"];
        state.issues.byNumber[1].updatedAt = "2026-10-04T09:00:00Z";
        sync(state);
        expect(state.jobs["issue-1"].facts.batch).toEqual([1, 3]);
        expect(state.unbundled).toEqual({ 2: "2026-10-03T00:00:00Z" });
    });
});
