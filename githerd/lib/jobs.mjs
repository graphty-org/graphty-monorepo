/**
 * Turns the daemon's facts into job records (design 5.1): one pure function, `syncJobs`, called
 * once per reconcile after the polls, the incident procedure and the merge gate. It creates jobs
 * with deterministic ids, so a fact seen again names the same job, and cancels a queued job whose
 * target closed, merged or no longer needs work. Jobs in flight are left to their holders and to
 * the done check.
 *
 * - `incident-<key>`: every code-red key of the open master incident whose procedure did not end
 *   intermittent, and every open release escalation (a failed or stalled release).
 * - `pr-<n>`: the owner's non-draft, non-stacked pull requests with an own failing required check,
 *   a conflict seen twice, or the owner's visual reject; never one that changes githerd's own
 *   config, hooks or worker instructions (those are listed for the owner's sessions).
 * - `review-<n>`: a pull request a githerd job made, at a patch id no review has seen.
 * - `triage-<scope>-<seq>`: one triage job at a time, 20 issues at most: unlabeled issues first
 *   (`new`), then a refresh of the issues the last 20 merges touched, and a full pass over every
 *   open issue after 100 merges. No clock: merges count.
 * - `issue-<n>`: one queued issue job at a time, for the issue at the front of the ranked list;
 *   the next is made once that one leaves the queue, never one per backlog issue.
 * - `issue-reland-<n>`: a pull request a revert took out, once the revert left the queue of open
 *   pull requests.
 */

import { byOwner, move, newJob, TERMINAL } from "./board.mjs";
import { rankForRefresh } from "./merged.mjs";
import { orderPosition } from "./owner.mjs";
import { NEXT, ownerLabel, prWork, readyIssues, SKIP } from "./queue.mjs";
import { touches } from "./prs.mjs";
import { slug } from "./worktrees.mjs";

/** Issues in one triage job (design 8.1). */
const TRIAGE_BATCH = 20;
/** Merges between two refresh passes, and between two full passes (design 5.1). */
const REFRESH_MERGES = 20;
const FULL_MERGES = 100;
/** Escalation kinds of a release that did not publish (`checkRelease` in the daemon). */
const RELEASE_KINDS = new Set(["release-failed", "release-stalled"]);
/**
 * What a pull request changes that makes it the owner's sessions' and never a worker's job: githerd
 * itself, its config, and what instructs a worker (design 5.1).
 */
const OWNER_ONLY = ["githerd/", "githerd.config.json", ".claude/", ".mcp.json", "CLAUDE.md"];

/**
 * @typedef {{created: string[], cancelled: {job: string, reason: string}[]}} SyncResult what
 *   changed, for the ledger
 */

/**
 * Brings the job records in step with the facts. Mutates `state.jobs`; the caller persists it and
 * writes the ledger lines.
 * @param {any} state the daemon state
 * @param {{config: any, now: Date}} ctx the normalized config and the clock
 * @returns {SyncResult} the jobs made and cancelled
 */
export function syncJobs(state, { config, now }) {
    state.jobs ??= {};
    /** @type {SyncResult} */
    const out = { created: [], cancelled: [] };
    const add = (/** @type {any} */ spec, /** @type {any} */ extra = {}) => {
        const id = spec.id;
        const old = state.jobs[id];
        // A finished job's fact can come back (a pull request fails again); a failed one stays, its
        // owner item already raised.
        if (old && !(old.state === "done" || old.state === "cancelled")) return old;
        state.jobs[id] = Object.assign(newJob(spec, now), extra);
        out.created.push(id);
        return state.jobs[id];
    };
    const cancel = (/** @type {any} */ job, /** @type {string} */ reason) => {
        if (job.state !== "queued") return;
        move(job, "cancelled", now, { reason });
        out.cancelled.push({ job: job.id, reason });
    };

    incidentJobs(state, add, cancel);
    prJobs(state, add, cancel);
    reviewJobs(state, add, cancel);
    triageJobs(state, config, now, add);
    issueJobs(state, config, now, add, cancel);
    return out;
}

/**
 * The incident jobs: one per code-red key of the open master incident that did not end
 * intermittent, and one per open release escalation.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a queued job
 */
function incidentJobs(state, add, cancel) {
    const open = Object.values(state.incidents ?? {}).find((i) => i.status === "open");
    const live = new Set();
    for (const [key, rec] of Object.entries(open?.keys ?? {})) {
        const r = /** @type {any} */ (rec);
        if (r.outcome === "intermittent") continue;
        const since = state.master?.lanes?.[r.lane]?.redSince ?? open.openedAt;
        const job = add({
            id: `incident-${slug(key)}`,
            kind: "incident",
            target: key,
            priority: "urgent",
            reason: `master red since ${since}`,
            facts: { scope: "master", since, lane: r.lane ?? null, incident: open.id },
        });
        live.add(job.id);
    }
    for (const esc of Object.values(state.escalations ?? {})) {
        const e = /** @type {any} */ (esc);
        if (!RELEASE_KINDS.has(e.kind) || e.resolvedAt) continue;
        const job = add({
            id: `incident-${slug(e.key)}`,
            kind: "incident",
            target: e.key,
            priority: "urgent",
            reason: e.summary,
            facts: { scope: "release", since: e.raisedAt },
        });
        live.add(job.id);
    }
    for (const job of Object.values(state.jobs)) {
        const scope = job.facts?.scope;
        if (job.kind === "incident" && (scope === "master" || scope === "release") && !live.has(job.id)) {
            cancel(job, scope === "master" ? "master's incident ended or went intermittent" : "the release recovered");
        }
    }
}

/**
 * The `pr` jobs: the owner's pull requests that need a worker, and none that changes githerd
 * itself. A queued one whose pull request closed or no longer needs work is cancelled.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a queued job
 */
function prJobs(state, add, cancel) {
    const heads = state.mergeGate?.heads ?? {};
    for (const [n, rec] of Object.entries(state.prs ?? {})) {
        const need = prWork(n, rec, state);
        const files = heads[n]?.files;
        // Its files not read yet: wait a reconcile rather than hand githerd's own code to a worker.
        if (!need || !files || heads[n]?.filesTruncated || touches(files, OWNER_ONLY)) continue;
        add(
            {
                id: `pr-${n}`,
                kind: "pr",
                target: `#${n}`,
                reason: need,
                facts: {
                    since: rec.createdAt ?? null,
                    next: ownerLabel(rec, NEXT),
                    skip: ownerLabel(rec, SKIP),
                    labels: rec.labels ?? [],
                },
            },
            { pr: Number(n), branch: rec.headRef ?? null },
        );
    }
    for (const job of Object.values(state.jobs)) {
        if (job.kind !== "pr") continue;
        const rec = state.prs?.[String(job.pr)];
        if (!rec) cancel(job, `#${job.pr} closed or merged`);
        else if (!prWork(String(job.pr), rec, state)) cancel(job, `#${job.pr} no longer needs a worker`);
    }
}

/**
 * The `review` jobs: a pull request a githerd job made, at a patch id no review job has. A queued
 * review of an older patch takes the new one; a review whose pull request closed is cancelled.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a queued job
 */
function reviewJobs(state, add, cancel) {
    const makers = new Map();
    for (const job of Object.values(state.jobs)) {
        if (job.pr && job.kind !== "review" && job.kind !== "pr") makers.set(String(job.pr), job);
    }
    for (const [n, maker] of makers) {
        const patchId = state.prs?.[n]?.patchId;
        if (!patchId) continue;
        const id = `review-${n}`;
        const old = state.jobs[id];
        if (old?.facts?.patchId === patchId) continue;
        const spec = {
            id,
            kind: "review",
            target: `#${n} at patch ${patchId.slice(0, 12)}`,
            reason: `${maker.id} pushed a new patch`,
            facts: { patchId, pr: Number(n), since: state.prs[n].createdAt ?? null, urgent: maker.kind === "incident" },
        };
        if (old?.state === "queued") Object.assign(old, { target: spec.target, facts: spec.facts });
        else if (!old || TERMINAL.includes(old.state)) {
            if (old) delete state.jobs[id];
            add(spec);
        }
    }
    for (const job of Object.values(state.jobs)) {
        if (job.kind === "review" && !state.prs?.[String(job.facts?.pr)])
            cancel(job, `#${job.facts?.pr} closed or merged`);
    }
}

/**
 * The triage jobs, one in flight at a time: unlabeled issues first, then the refresh and full
 * passes that merges call for, 20 issues per job.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 */
function triageJobs(state, config, now, add) {
    const merges = state.merged?.count ?? 0;
    const passes = (state.triagePasses ??= { refreshAt: merges, fullAt: merges, queue: [], seq: 0 });
    const open = Object.entries(state.issues?.byNumber ?? {})
        .filter(([, i]) => i.state === "open" && byOwner(state, i.author))
        .map(([n, i]) => ({ number: Number(n), text: i.text ?? "" }));
    if (merges - passes.fullAt >= FULL_MERGES) {
        passes.queue = [{ scope: "full", issues: open.map((i) => i.number).sort((a, b) => a - b) }];
        passes.fullAt = merges;
        passes.refreshAt = merges;
    } else if (merges - passes.refreshAt >= REFRESH_MERGES) {
        const paths = Object.keys(state.merged?.pendingPaths ?? {});
        const issues = open.map((i) => ({ number: i.number, title: "", body: i.text }));
        const ranked = rankForRefresh(issues, paths, state.merged?.closed ?? []).slice(0, TRIAGE_BATCH);
        if (ranked.length) passes.queue.push({ scope: "refresh", issues: ranked.map((r) => r.number) });
        state.merged.pendingPaths = {};
        passes.refreshAt = merges;
    }
    const inFlight = Object.values(state.jobs).some((j) => j.kind === "triage" && !TERMINAL.includes(j.state));
    if (inFlight) return;
    const unlabeled = readyIssues(state, config, now).triage;
    let scope = "new";
    let batch = unlabeled.slice(0, TRIAGE_BATCH);
    if (!batch.length) {
        const next = passes.queue[0];
        if (!next) return;
        scope = next.scope;
        const still = new Set(open.map((i) => i.number));
        batch = next.issues.filter((/** @type {number} */ n) => still.has(n)).slice(0, TRIAGE_BATCH);
        next.issues = next.issues.filter((/** @type {number} */ n) => !batch.includes(n));
        if (!next.issues.length) passes.queue.shift();
        if (!batch.length) return;
    }
    passes.seq += 1;
    add({
        id: `triage-${scope}-${passes.seq}`,
        kind: "triage",
        target: `${batch.length} issues: ${batch.map((n) => `#${n}`).join(" ")}`,
        reason: scope === "new" ? "unlabeled issues" : `${scope} pass after merges`,
        facts: { scope, batch, since: now.toISOString() },
    });
}

/**
 * The issue jobs: one queued at a time, for the issue at the front (an open order first, then the
 * ranked list); the re-land of every pull request a revert took out; and a queued issue job whose
 * issue closed is cancelled.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a queued job
 */
function issueJobs(state, config, now, add, cancel) {
    for (const [reverted, revertPr] of Object.entries(state.incidentActions?.reverts ?? {})) {
        // Re-landed once the revert left the open pull requests (merged, or closed by the owner).
        if (state.prs?.[String(revertPr)] || state.jobs[`issue-reland-${reverted}`]) continue;
        add({
            id: `issue-reland-${reverted}`,
            kind: "issue",
            target: `#${reverted}`,
            priority: "high",
            reason: `re-land #${reverted}, which #${revertPr} reverted`,
            facts: { scope: "reland", since: now.toISOString(), revert: Number(revertPr) },
        });
    }
    for (const job of Object.values(state.jobs)) {
        if (job.kind !== "issue" || job.facts?.scope === "reland") continue;
        if (state.issues?.byNumber?.[String(job.target).slice(1)]?.state === "closed") cancel(job, "the issue closed");
    }
    const queued = Object.values(state.jobs).some((j) => j.kind === "issue" && j.state === "queued");
    if (queued) return;
    const priorities = config.labels?.priorities ?? [];
    const candidates = readyIssues(state, config, now)
        .ranked.filter((r) => !state.jobs[`issue-${r.number}`])
        .map((r) => ({ ...r, order: orderPosition(state, r.number) }));
    // An open order comes before the ranked list (design 5.4); the sort is stable otherwise.
    candidates.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    const top = candidates[0];
    if (!top) return;
    const issue = state.issues.byNumber[top.number];
    const label = priorities[top.priority];
    add({
        id: `issue-${top.number}`,
        kind: "issue",
        target: `#${top.number}`,
        priority: label ? label.replace(/^[^:]*:/, "") : null,
        reason: "front of the issue queue",
        facts: {
            since: issue.createdAt ?? null,
            bug: top.bug,
            labels: issue.labels ?? [],
            next: top.next,
            skip: false,
            storybook: false,
            ...(top.order === null ? {} : { order: top.order }),
        },
    });
}
