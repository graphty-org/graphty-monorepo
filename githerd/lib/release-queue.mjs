/**
 * A release pull request the merge queue dequeued. githerd never pushes to, updates or closes a
 * release branch and never dispatches a release, so the only way it brings one back is Mergify's
 * own requeue command, a `@mergifyio queue` comment: the queue tests the pull request again on top
 * of master, so a fix that merged in between is included.
 *
 * - **What failed.** The "Mergify Merge Queue" check run on the release pull request's head names
 *   the queue's draft ("Checks failed · on draft #N"); the dequeue reason is no longer a comment.
 *   The draft's failing tests are those the flaky-test tracker recorded from it (flakes.mjs,
 *   `where: "queue"`, `pr` the draft).
 * - **The work.** An issue that names the draft, the queue run or one of its failing tests' flake
 *   records is the failure's work item: githerd links it and makes no job. Otherwise an `incident`
 *   job of scope `queue` (jobs.mjs) finds and fixes the failure; it is done once the fix is on
 *   master (done.mjs).
 * - **The requeue.** Once the linked issue closed, or the job is done, githerd comments
 *   `@mergifyio queue` once per dequeue (per draft), while the pull request is open, still
 *   dequeued and not labelled `hold`. A release pull request that closed was re-cut by the release
 *   train: its record is dropped and nothing is done.
 *
 * `state.releaseQueue` is `{[pr]: {draft, runIds, tests, issue, requeued}}`: `requeued` the draft
 * githerd requeued after, so the same dequeue is never requeued twice. A record is dropped when the
 * pull request closes or loses the `dequeued` label.
 */

import { byOwner } from "./board.mjs";
import { DEQUEUED, isReleaseTrain } from "./prs.mjs";

/** The write group of the requeue comment: githerd's own pull request upkeep. */
const GROUP = "upkeep";
/** The check run Mergify reports a queued pull request's state in. */
const QUEUE_CHECK = "Mergify Merge Queue";
/** Mergify's documented command that puts a dequeued pull request back in the queue. */
export const REQUEUE = "@mergifyio queue";

/**
 * The queue draft a "Mergify Merge Queue" summary names, or null.
 * @param {string | null | undefined} summary the check run's output summary
 * @returns {number | null} the draft pull request
 */
export function draftOf(summary) {
    const m = /on draft #(\d+)/.exec(String(summary ?? ""));
    return m ? Number(m[1]) : null;
}

/**
 * The id of the incident job that fixes a dequeued release pull request's failure.
 * @param {string | number} pr the release pull request
 * @param {{draft: number | null}} r its record
 * @returns {string} the job id
 */
export const queueJobId = (pr, r) => `incident-queue-${pr}-${r.draft ?? "unknown"}`;

/**
 * The failing tests the flaky-test tracker recorded on a queue draft.
 * @param {any} flakes `state.flakes`
 * @param {number | null} draft the draft
 * @returns {{test: string, job: string, runId: number | null, issue: number | null}[]} one per test
 */
function draftTests(flakes, draft) {
    if (!draft) return [];
    const out = [];
    for (const t of Object.values(flakes?.tests ?? {})) {
        const o = /** @type {any} */ (t).occurrences.find((x) => x.where === "queue" && x.pr === draft);
        if (o) out.push({ test: t.id, job: o.job, runId: o.runId ?? null, issue: t.issue ?? null });
    }
    return out;
}

/**
 * The open issue that is the failure's work item: a flake record's issue for one of the failing
 * tests, else an issue of the owner's whose text names the draft or a queue run.
 * @param {any} state the daemon state: its issues and trust
 * @param {{draft: number | null, tests: {issue: number | null, runId: number | null}[]}} r the record
 * @returns {number | null} the issue
 */
function linkedIssue(state, r) {
    const open = (/** @type {number | null} */ n) => n !== null && state.issues?.byNumber?.[n]?.state === "open";
    const flaky = r.tests.find((t) => open(t.issue))?.issue;
    if (flaky) return flaky;
    const names = [
        ...(r.draft ? [new RegExp(String.raw`#${r.draft}\b`)] : []),
        ...r.tests.filter((t) => t.runId).map((t) => new RegExp(String.raw`\b${t.runId}\b`)),
    ];
    if (!names.length) return null;
    const hit = Object.entries(state.issues?.byNumber ?? {}).find(
        ([, /** @type {any} */ i]) =>
            i.state === "open" && byOwner(state, i.author) && names.some((re) => re.test(i.text ?? "")),
    );
    return hit ? Number(hit[0]) : null;
}

/**
 * Why a dequeued release pull request may be requeued now, or null.
 * @param {string} n the pull request
 * @param {any} r its record
 * @param {any} state the daemon state: its issues and jobs
 * @returns {string | null} the reason
 */
function requeueReason(n, r, { issues, jobs }) {
    if (r.issue) {
        return issues?.byNumber?.[r.issue]?.state === "closed" ? `its failure's issue #${r.issue} closed` : null;
    }
    const job = jobs?.[queueJobId(n, r)];
    return job?.state === "done" ? `job ${job.id} is done: the fix is on master` : null;
}

/**
 * Keeps `state.releaseQueue` for every dequeued release pull request and requeues each one whose
 * failure was fixed (see the module comment). One read of the queue check per new dequeue.
 * @param {{gh: {get: Function, write: Function}, repo: string, ledger: (e: any) => unknown}} ctx
 *   the GitHub client, `owner/name` and the ledger
 * @param {any} state the daemon state: its pull requests, flakes, issues, jobs and trust are
 *   read, `releaseQueue` is kept
 * @param {string | null} releasePattern the config's release commit pattern
 * @returns {Promise<{pr: number, performed: boolean, reason: string}[]>} the requeues sent (or
 *   recorded as would-do)
 */
export async function requeueReleases(ctx, state, releasePattern) {
    const prs = state.prs ?? {};
    const store = (state.releaseQueue ??= {});
    for (const n of Object.keys(store)) if (!prs[n]?.labels?.includes(DEQUEUED)) delete store[n];
    const out = [];
    for (const [n, rec] of Object.entries(prs)) {
        if (!rec.labels?.includes(DEQUEUED) || !isReleaseTrain(rec, releasePattern)) continue;
        const r = await dequeueRecord(ctx, store, n, rec.headSha);
        if (r.requeued) continue;
        r.tests = draftTests(state.flakes, r.draft);
        // Once linked the issue stays linked: its closing is what requeues.
        r.issue ??= linkedIssue(state, r);
        const reason = requeueReason(n, r, state);
        if (!reason || rec.labels.includes("hold")) continue;
        r.requeued = r.draft ?? true;
        out.push(await requeue(ctx, Number(n), r, reason));
    }
    return out;
}

/**
 * A dequeued release pull request's record: read from the queue check for a new dequeue, or for
 * one githerd requeued that may have failed again on a new draft.
 * @param {{gh: {get: Function}, repo: string}} ctx the client and `owner/name`
 * @param {Record<string, any>} store `state.releaseQueue`, changed in place
 * @param {string} n the pull request
 * @param {string} head its head
 * @returns {Promise<any>} the record
 */
async function dequeueRecord(ctx, store, n, head) {
    const r = store[n];
    if (r && !r.requeued) return r;
    const draft = await readDraft(ctx, head);
    if (r && (!draft || draft === r.draft)) return r;
    store[n] = { draft, tests: [], issue: null, requeued: null };
    return store[n];
}

/**
 * The draft the "Mergify Merge Queue" check run on a head names, or null when it names none.
 * @param {{gh: {get: Function}, repo: string}} ctx the client and `owner/name`
 * @param {string} head the release pull request's head
 * @returns {Promise<number | null>} the draft
 */
async function readDraft(ctx, head) {
    const path = `repos/${ctx.repo}/commits/${head}/check-runs?check_name=${encodeURIComponent(QUEUE_CHECK)}`;
    const { body } = await ctx.gh.get(path, { fresh: true });
    const runs = body?.check_runs ?? [];
    return draftOf(runs[0]?.output?.summary);
}

/**
 * Posts the requeue comment, with its ledger line.
 * @param {{gh: {write: Function}, repo: string, ledger: (e: any) => unknown}} ctx the context
 * @param {number} n the pull request
 * @param {any} r its record
 * @param {string} reason why now
 * @returns {Promise<{pr: number, performed: boolean, reason: string}>} the outcome
 */
async function requeue(ctx, n, r, reason) {
    const fields = { situation: `requeue release: ${reason}`, target: `pr:${n}` };
    const res = await ctx.gh.write(
        "POST",
        `repos/${ctx.repo}/issues/${n}/comments`,
        { body: REQUEUE },
        { group: GROUP, check: "created", fields },
    );
    await ctx.ledger({ kind: "release-requeue", target: `pr:${n}`, draft: r.draft, reason, performed: res.performed });
    return { pr: n, performed: Boolean(res.performed), reason };
}
