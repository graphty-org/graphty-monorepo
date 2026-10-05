/**
 * Turns the daemon's facts into job records (design 5.1): one pure function, `syncJobs`, called
 * once per reconcile after the polls, the incident procedure and the merge gate. It creates jobs
 * with deterministic ids, so a fact seen again names the same job, and cancels a queued job whose
 * target closed, merged or no longer needs work, whoever holds it: its holder gets a news line,
 * and the daemon messages an owner session (asks.mjs tellCancelled). A verifying job is left to
 * the done check, and so is a held pull request job whose holder pushed a fix.
 *
 * - `verdict-<key>`: every key of the open master incident that matched no unambiguous pattern and
 *   has no verdict yet: its session records code or environment with `githerd_verdict` (design 4.4).
 * - `incident-<key>`: every key of the open master incident that Claude judged code and whose
 *   procedure did not end intermittent, and every open release escalation (a failed or stalled
 *   release).
 * - `incident-local-<step>`: the pre-push gate failing on the green commit (the reference worktree).
 * - `pr-<n>`: the owner's non-draft, non-stacked pull requests with an own failing required check,
 *   a conflict seen twice, or the owner's visual reject; never one that changes githerd's own
 *   config, hooks or worker instructions (those are listed for the owner's sessions).
 * - `title-<n>`: such a pull request whose only failing check is `Lint PR Title`.
 * - `review-<n>`: a pull request a githerd job made, at a patch id no review has seen.
 * - `triage-<scope>-<seq>`: one triage job at a time: issues missing a type, priority or effort label
 *   first (`new`, 20 at most, each with the kinds it lacks),
 *   then a refresh after 20 merges, and a full pass over every open issue after 100 merges (20 per
 *   job). A refresh job is given the merged pull requests with their changed files and the open
 *   issues; its session judges which issues the merges affect. The issues a merge mentions without
 *   closing are in its batch. No clock: merges count.
 * - `issue-<n>`: one queued issue job at a time, for the issue at the front of the ranked list;
 *   the next is made once that one leaves the queue, never one per backlog issue. An issue a session
 *   deferred (`state.deferred`, done.mjs) is left out until its revision changes.
 * - `issue-reland-<n>`: a pull request a revert took out, once the revert left the queue of open
 *   pull requests.
 *
 * A job an owner session claimed goes back to the queue once that session ended (`sessionGone`:
 * it is no live entry in Claude Code's registry): its claim, and the pull request it kept in use,
 * lapse with the session. A session that does not answer githerd's status question loses it too
 * (`statusStep` in asks.mjs).
 */

import { byOwner, move, newJob, TERMINAL } from "./board.mjs";
import { orderPosition } from "./owner.mjs";
import { missingLabelKinds, NEXT, ownerLabel, prWork, readyIssues, SKIP } from "./queue.mjs";
import { touches } from "./prs.mjs";
import { slug } from "./worktrees.mjs";

/** Issues in one triage job (design 8.1). */
const TRIAGE_BATCH = 20;
/** Merges between two refresh passes, and between two full passes (design 5.1). */
const REFRESH_MERGES = 20;
const FULL_MERGES = 100;
/** The required check that runs commitlint on a pull request's title. */
const TITLE_CHECK = "Lint PR Title";
/** Escalation kinds of a release that did not publish (`checkRelease` in the daemon). */
const RELEASE_KINDS = new Set(["release-failed", "release-stalled"]);
/**
 * What a pull request changes that makes it the owner's sessions' and never a worker's job: githerd
 * itself, its config, and what instructs a worker (design 5.1).
 */
const OWNER_ONLY = ["githerd/", "githerd.config.json", ".claude/", ".mcp.json", "CLAUDE.md"];

/**
 * @typedef {{created: string[],
 *   cancelled: {job: string, reason: string, session?: string | null, startedBy?: string | null}[],
 *   lapsed: {job: string, session: string}[]}} SyncResult what changed, for the ledger
 */

/**
 * Brings the job records in step with the facts. Mutates `state.jobs`; the caller persists it and
 * writes the ledger lines.
 * @param {any} state the daemon state
 * @param {{config: any, now: Date, sessionGone?: (session: string) => boolean}} ctx the normalized
 *   config, the clock, and whether an owner session ended
 * @returns {SyncResult} the jobs made, cancelled and given back by an ended owner session
 */
export function syncJobs(state, { config, now, sessionGone = () => false }) {
    state.jobs ??= {};
    /** @type {SyncResult} */
    const out = { created: [], cancelled: [], lapsed: [] };
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
        // A verifying job is the done check's to settle; a finished one has nothing to cancel.
        if (TERMINAL.includes(job.state) || job.state === "verifying") return;
        const holder = job.holder;
        move(job, "cancelled", now, { reason });
        if (!holder) {
            out.cancelled.push({ job: job.id, reason });
            return;
        }
        // Whoever holds it is told, and a githerd worker's session is ended (as afterMove does).
        job.news.push({ at: now.toISOString(), text: `job cancelled: ${reason}; stop work on it`, acked: false });
        if (holder.pane) {
            state.retiring = [
                ...(state.retiring ?? []),
                { job: job.id, holder, reason: "job cancelled", at: now.toISOString() },
            ];
        }
        out.cancelled.push({
            job: job.id,
            reason,
            session: holder.session ?? null,
            startedBy: holder.startedBy ?? null,
        });
    };

    lapseOwnerClaims(state, sessionGone, now, out);
    incidentJobs(state, add, cancel);
    prJobs(state, add, cancel);
    reviewJobs(state, add, cancel);
    triageJobs(state, config, now, add);
    issueJobs(state, config, now, add, cancel);
    return out;
}

/**
 * Puts back in the queue every job an owner session claimed whose session ended. A job the owner
 * kept with its window (`githerd keep --with-job`) stays his.
 * @param {any} state the daemon state
 * @param {(session: string) => boolean} gone whether a session ended
 * @param {Date} now the clock
 * @param {SyncResult} out what changed
 */
function lapseOwnerClaims(state, gone, now, out) {
    for (const job of Object.values(state.jobs)) {
        const session = job.holder?.session;
        if (job.holder?.startedBy !== "owner" || job.kept || !session || TERMINAL.includes(job.state)) continue;
        if (!gone(session)) continue;
        releaseOwnerJob(job, `claim lapsed: session ${session} ended`, now);
        out.lapsed.push({ job: job.id, session });
    }
}

/**
 * Puts a job an owner session held back in the queue.
 * @param {any} job the job
 * @param {string} reason why, the job's new reason
 * @param {Date} now the clock
 */
export function releaseOwnerJob(job, reason, now) {
    // Waiting and parked have no way back to the queue but through working.
    if (job.state === "waiting" || job.state === "parked") move(job, "working", now);
    move(job, "queued", now, { reason });
}

/**
 * The incident jobs: per key of the open master incident that did not end intermittent, a verdict
 * job while it has no verdict and a fix job once it is judged code; and one per open release
 * escalation.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function incidentJobs(state, add, cancel) {
    const open = Object.values(state.incidents ?? {}).find((i) => i.status === "open");
    const live = new Set();
    for (const [key, rec] of Object.entries(open?.keys ?? {})) {
        const spec = masterKeyJob(state, open, key, /** @type {any} */ (rec));
        if (spec) live.add(add(spec).id);
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
    // The pre-push gate fails on the green commit itself: a shared local failure (design 4.9).
    const gate = state.reference?.gate;
    if (gate?.verdict === "fail" && gate.sha === state.master?.greenSha && gate.steps?.length) {
        const job = add({
            id: `incident-local-${slug(gate.steps[0])}`,
            kind: "incident",
            target: `gate: ${gate.steps.join(", ")}`,
            priority: "urgent",
            reason: `the pre-push gate fails on the green commit ${gate.sha.slice(0, 9)}`,
            facts: { scope: "local", since: state.reference.at ?? null },
        });
        live.add(job.id);
    }
    const ended = {
        master: "master's incident ended or went intermittent",
        verdict: "a verdict was recorded, or master's incident ended",
        release: "the release recovered",
        local: "the gate passes on the green commit",
    };
    for (const job of Object.values(state.jobs)) {
        const scope = job.facts?.scope;
        if (job.kind === "incident" && scope in ended && !live.has(job.id)) cancel(job, ended[scope]);
    }
}

/**
 * The job one key of the open master incident calls for: a verdict job while Claude has not judged
 * it, a fix job once it is judged code, and none once it went intermittent or was judged the
 * environment.
 * @param {any} state the daemon state
 * @param {any} open the open incident
 * @param {string} key the failure key
 * @param {any} r the key's incident record
 * @returns {any} the job spec, or null
 */
function masterKeyJob(state, open, key, r) {
    if (r.outcome === "intermittent") return null;
    const lane = state.master?.lanes?.[r.lane];
    const since = lane?.redSince ?? open.openedAt;
    const verdict = lane?.verdicts?.[key]?.verdict;
    if (verdict === "environment") return null;
    const base = { kind: "incident", target: key, priority: "urgent" };
    if (verdict) {
        const facts = { scope: "master", since, lane: r.lane ?? null, incident: open.id };
        return { ...base, id: `incident-${slug(key)}`, reason: `master red since ${since}`, facts };
    }
    const ref = (lane?.redJobs ?? []).find((/** @type {any} */ j) => j.key === key);
    return {
        ...base,
        id: `verdict-${slug(key)}`,
        reason: "master failed on no known pattern: is it the code or the environment?",
        facts: {
            scope: "verdict",
            since,
            lane: r.lane ?? null,
            incident: open.id,
            runId: ref?.runId ?? null,
            jobId: ref?.id ?? null,
            redSha: lane?.sha ?? null,
            greenSha: open.lastGreenSha ?? null,
        },
    };
}

/**
 * The `pr` jobs: the owner's pull requests that need a worker, and none that changes githerd
 * itself. One whose pull request closed or no longer needs work is cancelled.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function prJobs(state, add, cancel) {
    const heads = state.mergeGate?.heads ?? {};
    for (const [n, rec] of Object.entries(state.prs ?? {})) {
        const need = prWork(n, rec, state);
        const files = heads[n]?.files;
        // Its files not read yet: wait a reconcile rather than hand githerd's own code to a worker.
        if (!need || !files || heads[n]?.filesTruncated || touches(files, OWNER_ONLY)) continue;
        const failing = Object.keys(rec.required ?? {}).filter((k) => rec.required[k] === "FAILURE");
        if (failing.length === 1 && failing[0] === TITLE_CHECK) {
            // Only the title fails commitlint: a title job, which needs no worktree (design 5.1).
            add(
                {
                    id: `title-${n}`,
                    kind: "title",
                    target: `#${n}`,
                    reason: `${TITLE_CHECK} fails`,
                    facts: { since: rec.createdAt ?? null },
                },
                { pr: Number(n) },
            );
            continue;
        }
        const job = add(
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
        // A queued job says what the pull request needs now, not what it needed when it was made.
        if (job.state === "queued") job.reason = need;
    }
    for (const job of Object.values(state.jobs)) {
        if (job.kind !== "pr" && job.kind !== "title") continue;
        const rec = state.prs?.[String(job.pr)];
        if (!rec) cancel(job, `#${job.pr} closed or merged`);
        // A holder that pushed made it green, or is waiting on its CI: the done check settles that.
        else if (!prWork(String(job.pr), rec, state) && !(job.holder && job.pushedHead)) {
            cancel(job, `#${job.pr} no longer needs a worker`);
        }
    }
}

/**
 * The `review` jobs: a pull request a githerd job made, at a patch id no review job has. A queued
 * review of an older patch takes the new one; a review whose pull request closed is cancelled.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function reviewJobs(state, add, cancel) {
    const makers = new Map();
    for (const job of Object.values(state.jobs)) {
        if (job.pr && job.kind !== "review" && job.kind !== "pr") makers.set(String(job.pr), job);
    }
    for (const [n, maker] of makers) reviewJob(state, n, maker, add);
    for (const job of Object.values(state.jobs)) {
        if (job.kind === "review" && !state.prs?.[String(job.facts?.pr)])
            cancel(job, `#${job.facts?.pr} closed or merged`);
    }
}

/**
 * The `review` job of one pull request a githerd job made, at its current patch id.
 * @param {any} state the daemon state
 * @param {string} n the pull request
 * @param {any} maker the job that made it
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 */
function reviewJob(state, n, maker, add) {
    const patchId = state.prs?.[n]?.patchId;
    if (!patchId) return;
    const id = `review-${n}`;
    const old = state.jobs[id];
    if (old?.facts?.patchId === patchId) return;
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

/**
 * The triage jobs, one in flight at a time: issues missing a label kind first, then the refresh and full
 * passes that merges call for. A full pass takes 20 issues per job. A refresh is one job holding the
 * merges and the open issues they may affect: which ones they do is the session's judgment, and
 * the done check only validates its verdicts (done.mjs).
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
        .map(([n, i]) => ({ number: Number(n), title: String(i.text ?? "").split("\n")[0] }))
        .sort((a, b) => a.number - b.number);
    schedulePasses(state, passes, open, merges);
    const inFlight = Object.values(state.jobs).some((j) => j.kind === "triage" && !TERMINAL.includes(j.state));
    if (inFlight) return;
    let scope = "new";
    let batch = readyIssues(state, config, now).triage.slice(0, TRIAGE_BATCH);
    if (!batch.length && passes.queue[0]?.scope === "refresh") {
        refreshJob(state, passes, open, now, add);
        return;
    }
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
    const refs = batch.map((n) => `#${n}`).join(" ");
    // Which label kinds each new issue lacks: an issue with a type and a priority needs only its
    // effort, and must not be told it is unlabeled.
    const missing =
        scope === "new"
            ? Object.fromEntries(
                  batch.map((n) => [n, missingLabelKinds(state.issues?.byNumber?.[n]?.labels ?? [], config)]),
              )
            : null;
    const lacks = missing ? batch.map((n) => "#" + n + " " + missing[n].join("+")) : [];
    const reason = missing ? `missing labels: ${lacks.join(", ")}` : `${scope} pass after merges`;
    add({
        id: `triage-${scope}-${passes.seq}`,
        kind: "triage",
        target: `${batch.length} issues: ${refs}`,
        reason,
        facts: { scope, batch, since: now.toISOString(), ...(missing ? { missing } : {}) },
    });
}

/**
 * Queues a full triage pass once enough merges landed since the last one, or else a refresh pass.
 * @param {any} state the daemon state
 * @param {any} passes the triage passes' record
 * @param {{number: number}[]} open the open issues
 * @param {number} merges the merges counted so far
 */
function schedulePasses(state, passes, open, merges) {
    if (merges - passes.fullAt >= FULL_MERGES) {
        passes.queue = [{ scope: "full", issues: open.map((i) => i.number).sort((a, b) => a - b) }];
        passes.fullAt = merges;
        passes.refreshAt = merges;
    } else if (merges - passes.refreshAt >= REFRESH_MERGES) {
        const merged = state.merged?.pending ?? [];
        const closed = new Set(state.merged?.closed ?? []);
        if (merged.length && open.some((i) => !closed.has(i.number))) passes.queue.push({ scope: "refresh", merged });
        state.merged.pending = [];
        passes.refreshAt = merges;
    }
}

/**
 * The refresh job at the front of the triage queue (design 5.1): the merges since the last refresh,
 * with their changed files, and every open issue they do not close. The issues a merge mentions
 * without closing must each get a verdict; for the rest, the session decides which the merges
 * affect.
 * @param {any} state the daemon state
 * @param {any} passes `state.triagePasses`
 * @param {{number: number, title: string}[]} open the owner's open issues
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 */
function refreshJob(state, passes, open, now, add) {
    const { merged } = passes.queue.shift();
    const closed = new Set(state.merged?.closed ?? []);
    const issues = open.filter((i) => !closed.has(i.number));
    const listed = new Set(issues.map((i) => i.number));
    const batch = [...new Set(merged.flatMap((/** @type {any} */ pr) => pr.mentions ?? []))]
        .filter((n) => listed.has(Number(n)))
        .sort((a, b) => Number(a) - Number(b));
    if (!issues.length) return;
    passes.seq += 1;
    add({
        id: `triage-refresh-${passes.seq}`,
        kind: "triage",
        target: `${merged.length} merges against ${issues.length} open issues`,
        reason: "refresh pass after merges",
        facts: { scope: "refresh", batch, merged, open: issues, since: now.toISOString() },
    });
}

/**
 * The issue jobs: one queued at a time, for the issue at the front (an open order first, then the
 * ranked list); the re-land of every pull request a revert took out; and an issue job whose issue
 * closed is cancelled.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
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
    // A deferral holds while the issue's revision is the one it was made at; a new comment, edit or
    // label change ends it, and the issue's ended job no longer keeps it out.
    const deferred = state.deferred ?? {};
    for (const [n, d] of Object.entries(deferred)) {
        if (state.issues?.byNumber?.[n]?.updatedAt === d.revision) continue;
        delete deferred[n];
        if (TERMINAL.includes(state.jobs[`issue-${n}`]?.state)) delete state.jobs[`issue-${n}`];
    }
    const queued = Object.values(state.jobs).some((j) => j.kind === "issue" && j.state === "queued");
    if (queued) return;
    const priorities = config.labels?.priorities ?? [];
    const candidates = readyIssues(state, config, now)
        .ranked.filter((r) => !state.jobs[`issue-${r.number}`] && !deferred[r.number])
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
