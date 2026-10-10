import { describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import { verifyClaim } from "../lib/done.mjs";
import { jobText } from "../lib/job-text.mjs";
import { syncJobs } from "../lib/jobs.mjs";
import { draftOf, queueJobId, REQUEUE, requeueReleases } from "../lib/release-queue.mjs";

const NOW = new Date("2026-10-10T01:00:00Z");
const PATTERN = String.raw`^chore\(release\): publish`;
const HEAD = "5".repeat(40);
const TIP = "e".repeat(40);
const FIX = "f".repeat(40);
/** The Mergify Merge Queue summary of release #1840's dequeue (trimmed). */
const SUMMARY =
    "- **Entered queue** -- `2026-10-10 00:05 UTC`\n- **Checks failed** · on draft #1841\n- **Left the queue**";
const TEST_ID = "graphty-element/test/browser/glow-strength-per-style.test.ts > draws a faint glow";

/**
 * A daemon state with release #1840 dequeued, the flake tracker holding the queue draft's failure.
 * @param {any} [over] fields to change
 * @returns {any} the state
 */
function state(over = {}) {
    return {
        trust: { login: "owner" },
        master: { verdict: "green", lanes: {}, headSha: TIP },
        incidents: {},
        escalations: {},
        mergeGate: { heads: {} },
        merged: { count: 0, pending: [], closed: [] },
        triagePasses: { refreshAt: 0, fullAt: 0, queue: [], seq: 0, typesQueued: true },
        jobs: {},
        prs: {
            1840: {
                author: "github-actions[bot]",
                title: "chore(release): publish",
                headRef: "release/train-38002738423",
                headSha: HEAD,
                labels: ["dequeued"],
                required: { "All Checks Pass": "SUCCESS" },
            },
        },
        flakes: {
            tests: {
                [TEST_ID]: {
                    id: TEST_ID,
                    issue: null,
                    occurrences: [
                        { where: "queue", pr: 1841, runId: 38007549136, job: "Test (graphty-element-browser-2)" },
                    ],
                },
            },
        },
        issues: { byNumber: {} },
        ...over,
    };
}

/**
 * A fake context: the queue check names `draft`; every write and ledger line is kept.
 * @param {{draft?: number, mode?: string}} [opts] the draft the check names, and the write mode
 * @returns {any} the context, with `writes`, `reads` and `lines`
 */
function context({ draft = 1841, mode = "acting" } = {}) {
    const ctx = {
        repo: "o/r",
        writes: /** @type {any[]} */ ([]),
        reads: /** @type {string[]} */ ([]),
        lines: /** @type {any[]} */ ([]),
        gh: {
            get: async (/** @type {string} */ path) => {
                ctx.reads.push(path);
                const summary = SUMMARY.replace("#1841", `#${draft}`);
                return { body: { check_runs: [{ name: "Mergify Merge Queue", output: { summary } }] } };
            },
            write: async (/** @type {string} */ method, /** @type {string} */ path, /** @type {any} */ body) => {
                ctx.writes.push({ method, path, body });
                return { performed: mode === "acting" };
            },
        },
        ledger: (/** @type {any} */ l) => ctx.lines.push(l),
    };
    return ctx;
}

/**
 * Ends a job as the done check would after the fix reached master.
 * @param {any} job the job
 */
function finish(job) {
    move(job, "starting", NOW, { holder: { session: "w1", nonce: "n1" } });
    move(job, "working", NOW);
    move(job, "verifying", NOW);
    move(job, "done", NOW);
}

describe("draftOf", () => {
    it("reads the draft the Mergify Merge Queue summary names", () => {
        expect(draftOf(SUMMARY)).toBe(1841);
        expect(draftOf("no draft here")).toBeNull();
        expect(draftOf(null)).toBeNull();
    });
});

describe("a dequeued release pull request", () => {
    it("is raised as an incident job naming the queue draft, run, job and test", async () => {
        const s = state();
        const ctx = context();
        expect(await requeueReleases(ctx, s, PATTERN)).toEqual([]);
        expect(ctx.reads).toEqual([
            `repos/o/r/commits/${HEAD}/check-runs?check_name=${encodeURIComponent("Mergify Merge Queue")}`,
        ]);
        syncJobs(s, { config: {}, now: NOW });
        const job = s.jobs[queueJobId(1840, { draft: 1841 })];
        expect(job).toMatchObject({ kind: "incident", state: "queued", target: TEST_ID, priority: "urgent" });
        expect(job.facts).toMatchObject({ scope: "queue", release: 1840, draft: 1841 });
        expect(job.reason).toContain("queue draft #1841");
        expect(job.reason).toContain("Test (graphty-element-browser-2), run 38007549136");
        const text = jobText(job);
        expect(text).toContain("Never push to, edit or close the release pull request");
        expect(text).toContain("githerd then requeues the release pull request");
        // The same dequeue again: no second read, no second job.
        await requeueReleases(ctx, s, PATTERN);
        expect(ctx.reads).toHaveLength(1);
        expect(ctx.writes).toEqual([]);
    });

    it("links an open issue of the owner's that names the draft instead of making a job", async () => {
        const text = "release #1840 dequeued\nFailing run: .../runs/38007549136 (queue draft #1841)";
        const s = state({ issues: { byNumber: { 1847: { state: "open", author: "owner", text } } } });
        await requeueReleases(context(), s, PATTERN);
        expect(s.releaseQueue[1840].issue).toBe(1847);
        syncJobs(s, { config: {}, now: NOW });
        expect(Object.keys(s.jobs)).toEqual([]);
        // Someone else's issue naming it is not the owner's work item.
        const other = state({ issues: { byNumber: { 1848: { state: "open", author: "bot", text } } } });
        await requeueReleases(context(), other, PATTERN);
        expect(other.releaseQueue[1840].issue).toBeNull();
    });

    it("cancels a job made before the issue that tracks the failure was filed", async () => {
        const s = state();
        await requeueReleases(context(), s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        s.issues.byNumber[1847] = { state: "open", author: "owner", text: "queue draft #1841" };
        await requeueReleases(context(), s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        expect(s.jobs[queueJobId(1840, { draft: 1841 })].state).toBe("cancelled");
    });

    it("is requeued once with @mergifyio queue after its issue closes", async () => {
        const s = state({ issues: { byNumber: { 1847: { state: "open", author: "owner", text: "draft #1841" } } } });
        const ctx = context();
        await requeueReleases(ctx, s, PATTERN);
        expect(ctx.writes).toEqual([]);
        s.issues.byNumber[1847].state = "closed";
        expect(await requeueReleases(ctx, s, PATTERN)).toEqual([
            { pr: 1840, performed: true, reason: "its failure's issue #1847 closed" },
        ]);
        expect(ctx.writes).toEqual([
            { method: "POST", path: "repos/o/r/issues/1840/comments", body: { body: REQUEUE } },
        ]);
        expect(ctx.lines).toMatchObject([{ kind: "release-requeue", target: "pr:1840", draft: 1841, performed: true }]);
        // Still labelled while Mergify takes it back: the same draft, so no second comment.
        await requeueReleases(ctx, s, PATTERN);
        expect(ctx.writes).toHaveLength(1);
    });

    it("is requeued once its job is done, and the done job is not made again", async () => {
        const s = state();
        const ctx = context();
        await requeueReleases(ctx, s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        finish(s.jobs[queueJobId(1840, { draft: 1841 })]);
        // A reconcile between the job's end and the requeue must not replace the done job.
        syncJobs(s, { config: {}, now: NOW });
        expect(s.jobs[queueJobId(1840, { draft: 1841 })].state).toBe("done");
        expect(await requeueReleases(ctx, s, PATTERN)).toMatchObject([{ pr: 1840, performed: true }]);
        await requeueReleases(ctx, s, PATTERN);
        expect(ctx.writes).toHaveLength(1);
    });

    it("dequeued again on a new draft is a new failure: a new job, and a new requeue once it is fixed", async () => {
        const s = state();
        await requeueReleases(context(), s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        finish(s.jobs[queueJobId(1840, { draft: 1841 })]);
        await requeueReleases(context(), s, PATTERN);
        const again = context({ draft: 1850 });
        await requeueReleases(again, s, PATTERN);
        expect(s.releaseQueue[1840]).toMatchObject({ draft: 1850, requeued: null });
        syncJobs(s, { config: {}, now: NOW });
        expect(s.jobs[queueJobId(1840, { draft: 1850 })].state).toBe("queued");
    });

    it("is not requeued while labelled hold, and is once the label is removed", async () => {
        const s = state();
        s.prs[1840].labels = ["dequeued", "hold"];
        const ctx = context();
        await requeueReleases(ctx, s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        finish(s.jobs[queueJobId(1840, { draft: 1841 })]);
        expect(await requeueReleases(ctx, s, PATTERN)).toEqual([]);
        expect(ctx.writes).toEqual([]);
        s.prs[1840].labels = ["dequeued"];
        expect(await requeueReleases(ctx, s, PATTERN)).toHaveLength(1);
    });

    it("closed (the train re-cut it): its record is dropped and nothing is posted", async () => {
        const s = state();
        const ctx = context();
        await requeueReleases(ctx, s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        const job = s.jobs[queueJobId(1840, { draft: 1841 })];
        finish(job);
        delete s.prs[1840];
        expect(await requeueReleases(ctx, s, PATTERN)).toEqual([]);
        expect(s.releaseQueue).toEqual({});
        expect(ctx.writes).toEqual([]);
    });

    it("cancels its queued job once the pull request closes", async () => {
        const s = state();
        await requeueReleases(context(), s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        delete s.prs[1840];
        await requeueReleases(context(), s, PATTERN);
        syncJobs(s, { config: {}, now: NOW });
        expect(s.jobs[queueJobId(1840, { draft: 1841 })].state).toBe("cancelled");
    });

    it("in dry-run records a would-do once and writes nothing", async () => {
        const s = state({ issues: { byNumber: { 1847: { state: "closed", author: "owner", text: "#1841" } } } });
        const ctx = context({ mode: "dry-run" });
        // A closed issue is never linked: the failure gets a job, and nothing is requeued.
        expect(await requeueReleases(ctx, s, PATTERN)).toEqual([]);
        syncJobs(s, { config: {}, now: NOW });
        finish(s.jobs[queueJobId(1840, { draft: 1841 })]);
        expect(await requeueReleases(ctx, s, PATTERN)).toEqual([
            { pr: 1840, performed: false, reason: expect.any(String) },
        ]);
        await requeueReleases(ctx, s, PATTERN);
        expect(ctx.lines).toMatchObject([{ kind: "release-requeue", performed: false }]);
    });

    it("leaves a pull request that is not the release train's to the update path", async () => {
        const s = state();
        s.prs[1840].author = "owner";
        const ctx = context();
        await requeueReleases(ctx, s, PATTERN);
        expect(ctx.reads).toEqual([]);
        expect(s.releaseQueue).toEqual({});
    });
});

describe("the queue incident's done check", () => {
    const job = () => {
        const j = newJob(
            { kind: "incident", target: TEST_ID, facts: { scope: "queue", release: 1840, draft: 1841 } },
            NOW,
        );
        return j;
    };
    const view = (/** @type {any} */ io) => ({ state: state(), config: {}, io: { ...io } });
    const report = { outcome: "done", findings: "f", defects: [], pushedHead: FIX };

    it("holds once the fix is on master", async () => {
        const io = { contains: async (/** @type {string} */ a, /** @type {string} */ b) => a === FIX && b === TIP };
        expect(await verifyClaim(job(), report, view(io))).toEqual({ holds: true });
    });

    it("names what is missing while the fix is not on master", async () => {
        const answer = await verifyClaim(job(), report, view({ contains: async () => false }));
        expect(answer).toMatchObject({ missing: [expect.stringContaining("is not on master yet")] });
    });
});
