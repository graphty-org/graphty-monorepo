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
 * - `incident-shared-<key>`: a failure key shared by several open pull requests while master is
 *   green (shared.mjs), unless an open pull request is already its fix.
 * - `incident-queue-<pr>-<draft>`: a release pull request the merge queue dequeued, whose failure
 *   no open issue tracks (release-queue.mjs); done once the fix is on master, which requeues it.
 * - `pr-<n>`: the owner's non-draft pull requests with an own failing required check, a conflict
 *   seen twice (the only work of a stacked one), or the owner's visual reject. One that changes
 *   githerd's own config, hooks or worker instructions is `facts.ownerOnly`: offered to the owner's
 *   sessions, never started as a githerd worker (start.mjs).
 * - `title-<n>`: such a pull request whose only failing check is `Lint PR Title`.
 * - `review-<n>`: a pull request a githerd job made, at a patch id no review has seen.
 * - `triage-<scope>-<seq>`: one triage job at a time: issues missing a type, priority or effort label
 *   first (`new`, 20 at most, each with the kinds it lacks),
 *   then a refresh after 20 merges, and a full pass after 100 merges over every open issue not
 *   judged since its last change (`lastTriagedAt`, 20 per job). A refresh job is given the merged pull requests with their changed files and the open
 *   issues; its session judges which issues the merges affect. The issues a merge mentions without
 *   closing are in its batch. No clock: merges count. Once, a `types` pass over every open issue
 *   (20 per job) re-judges each type label now that `infrastructure` exists (owner decision
 *   2026-10-06; `state.triagePasses.typesQueued`).
 * - `issue-<n>`: as many queued issue jobs as the sessions githerd may invite reported room for
 *   (`issueDemand`: at least one, at most twice `workers.maxActive`, per session), for the issues at
 *   the front of the ranked list; the next is made once one
 *   leaves the queue, never one per backlog issue. An issue a session
 *   deferred (`state.deferred`, done.mjs) is left out until its revision changes. Only the types of
 *   `backlog.issueTypes` get a new job (bug and infrastructure by default) unless the owner picked the
 *   issue, even one master already references (`issueRefusal` in queue.mjs, the one rule). A job
 *   already made is never cancelled because the rule changed (the owner, 2026-10-06): the rule
 *   decides only which new jobs are made. An effort:low issue job
 *   may bundle up to `backlog.bundleMax - 1` more small issues of its type and package
 *   (`facts.batch`, the anchor first; `bundleOf`), fixed in one pull request: each is in use while
 *   the job is held, and none gets a job of its own until the bundle ends.
 * - `issue-reland-<n>`: a pull request a revert took out, once the revert left the queue of open
 *   pull requests.
 * - `issue-promote-<check>`: an advisory CI check (advisory.mjs) whose enforce date is three days
 *   off or past, still listed as advisory on the default branch: open the pull request that makes
 *   it required. One per entry, ever: a done one is not made again. Its work edits
 *   `.github/workflows/`, which a worker may not, so it is `ownerOnly`. Cancelled once the entry
 *   left the advisory list.
 *
 * A job an owner session claimed goes back to the queue once that session ended (`sessionGone`:
 * it is no live entry in Claude Code's registry): its claim, and the pull request it kept in use,
 * lapse with the session. A session that does not answer githerd's status question loses it too
 * (`statusStep` in asks.mjs).
 */

import { byOwner, move, newJob, sessionName, TERMINAL } from "./board.mjs";
import { orderPosition } from "./owner.mjs";
import {
    issueRule,
    jobInUse,
    masterRefs,
    mergeHeld,
    missingLabelKinds,
    NEXT,
    notWorkLabel,
    ownerLabel,
    prOf,
    prWork,
    readyIssues,
    SKIP,
    workedOn,
} from "./queue.mjs";
import { promotionsDue, utcDay } from "./advisory.mjs";
import { touches } from "./prs.mjs";
import { CRITICAL, guardIssue } from "./master-fix.mjs";
import { queueJobId } from "./release-queue.mjs";
import { sharedJobSpecs } from "./shared.mjs";

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
        const id = jobId(spec.id);
        // A live job saved under an id made before ids were normalized keeps its id.
        const old =
            state.jobs[id] ?? Object.values(state.jobs).find((j) => jobId(j.id) === id && !TERMINAL.includes(j.state));
        // A finished job's fact can come back (a pull request fails again); a failed one stays, its
        // owner item already raised.
        if (old && !(old.state === "done" || old.state === "cancelled")) return old;
        state.jobs[id] = Object.assign(newJob({ ...spec, id }, now), extra);
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
    promoteJobs(state, now, add, cancel);
    return out;
}

/**
 * Normalizes a job id to the pattern githerd's tools accept (`^[a-z][a-z0-9-]{1,119}$`): lowercase,
 * every run of other characters one dash, no dash at either end. A failure key such as
 * `CI / Build / Security audit` gives `ci-build-security-audit`.
 * @param {string} raw the id as made from its fact
 * @returns {string} the id
 */
function jobId(raw) {
    return raw
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .join("-")
        .slice(0, 120);
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
        releaseOwnerJob(job, `claim lapsed: session ${sessionName(state, session)} ended`, now);
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
    releaseJobs(state, add, live);
    // The pre-push gate fails on the green commit itself: a shared local failure (design 4.9).
    const gate = state.reference?.gate;
    if (gate?.verdict === "fail" && gate.sha === state.master?.greenSha && gate.steps?.length) {
        const job = add({
            id: `incident-local-${gate.steps[0]}`,
            kind: "incident",
            target: `gate: ${gate.steps.join(", ")}`,
            priority: "urgent",
            reason: `the pre-push gate fails on the green commit ${gate.sha.slice(0, 9)}`,
            facts: { scope: "local", since: state.reference.at ?? null },
        });
        live.add(job.id);
    }
    for (const spec of sharedJobSpecs(state).values()) live.add(add(spec).id);
    for (const spec of releaseQueueSpecs(state)) live.add(add(spec).id);
    const ended = {
        master: "master's incident ended or went intermittent",
        shared: "the shared failure ended, or an open pull request fixes it",
        verdict: "a verdict was recorded, or master's incident ended",
        release: "the release recovered",
        local: "the gate passes on the green commit",
        queue: "the release pull request closed, was requeued, or an issue tracks its failure",
    };
    for (const job of Object.values(state.jobs)) {
        const scope = job.facts?.scope;
        if (job.kind === "incident" && scope in ended && !live.has(job.id)) cancel(job, ended[scope]);
    }
}

/**
 * The `incident` job of each dequeued release pull request (release-queue.mjs) whose failure no
 * issue tracks and that githerd has not requeued. A done job is not made again: its being done is
 * what requeues the pull request.
 * @param {any} state the daemon state
 * @returns {any[]} the job specs
 */
function releaseQueueSpecs(state) {
    const out = [];
    for (const [n, r] of Object.entries(state.releaseQueue ?? {})) {
        const id = queueJobId(n, r);
        if (r.issue || r.requeued || state.jobs[id]?.state === "done") continue;
        const where = r.draft ? `queue draft #${r.draft}` : "its queue draft";
        const failed = r.tests.length
            ? r.tests.map((/** @type {any} */ t) => `${t.test} (${t.job}, run ${t.runId})`).join("; ")
            : `see the failed jobs of ${where}`;
        out.push({
            id,
            kind: "incident",
            target: r.tests[0]?.test ?? `release #${n} merge-queue run`,
            priority: "urgent",
            reason: `release #${n} was dequeued: ${where} failed: ${failed}`,
            facts: { scope: "queue", release: Number(n), draft: r.draft, tests: r.tests },
        });
    }
    return out;
}

/**
 * One job per open release escalation, except one whose fix a pull request carries (done.mjs):
 * githerd watches that release itself and offers the job again only once a later run fails too.
 * A link whose escalation ended is dropped.
 * @param {any} state the daemon state
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {Set<string>} live the incident jobs still called for, added to
 */
function releaseJobs(state, add, live) {
    for (const esc of Object.values(state.escalations ?? {})) {
        const e = /** @type {any} */ (esc);
        if (!RELEASE_KINDS.has(e.kind) || e.resolvedAt) continue;
        if (state.releaseFixes?.[e.key] && state.releaseFixes[e.key].runId === (e.runId ?? null)) continue;
        const job = add({
            id: `incident-${e.key}`,
            kind: "incident",
            target: e.key,
            priority: "urgent",
            reason: e.summary,
            facts: { scope: "release", since: e.raisedAt },
        });
        // The run it is about changes while the escalation stays open (a restart fails again).
        job.facts.failure = e.summary;
        live.add(job.id);
    }
    for (const key of Object.keys(state.releaseFixes ?? {})) {
        if (!state.escalations?.[key] || state.escalations[key].resolvedAt) delete state.releaseFixes[key];
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
        return { ...base, id: `incident-${key}`, reason: `master red since ${since}`, facts };
    }
    const ref = (lane?.redJobs ?? []).find((/** @type {any} */ j) => j.key === key);
    return {
        ...base,
        id: `verdict-${key}`,
        reason: "master failed on no known pattern: is it the code or the environment?",
        facts: {
            scope: "verdict",
            key,
            since,
            lane: r.lane ?? null,
            incident: open.id,
            runId: ref?.runId ?? null,
            jobId: ref?.id ?? null,
            redSha: lane?.sha ?? null,
            greenSha: open.lastGreenSha ?? null,
            batch: open.redBatch ?? null,
        },
    };
}

/**
 * The `pr` jobs: the owner's pull requests that need a worker; one that changes githerd itself is
 * marked `ownerOnly`, for the owner's sessions alone. One whose pull request closed or no longer
 * needs work is cancelled.
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
        if (!need || !files || heads[n]?.filesTruncated) continue;
        const ownerOnly = touches(files, OWNER_ONLY);
        const failing = Object.keys(rec.required ?? {}).filter((k) => rec.required[k] === "FAILURE");
        if (failing.length === 1 && failing[0] === TITLE_CHECK) {
            // Only the title fails commitlint: a title job, which needs no worktree (design 5.1).
            add(
                {
                    id: `title-${n}`,
                    kind: "title",
                    target: `#${n}`,
                    reason: `${TITLE_CHECK} fails`,
                    facts: { since: rec.createdAt ?? null, ownerOnly },
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
                    ownerOnly,
                    held: mergeHeld(rec),
                },
            },
            { pr: Number(n), branch: rec.headRef ?? null },
        );
        // A queued job says what the pull request needs now, not what it needed when it was made.
        if (job.state === "queued") job.reason = need;
    }
    cancelEndedPrJobs(state, cancel);
}

/**
 * Cancels each `pr` and `title` job whose pull request closed or no longer needs a worker.
 * @param {any} state the daemon state
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function cancelEndedPrJobs(state, cancel) {
    for (const job of Object.values(state.jobs)) {
        if (job.kind !== "pr" && job.kind !== "title") continue;
        const rec = state.prs?.[String(job.pr)];
        if (!rec) cancel(job, `#${job.pr} closed or merged`);
        // A holder that pushed made it green, or is waiting on its CI: the done check settles that.
        // A holder that made it a draft is reworking it (REWORK_RULE in job-text.mjs, issue 2727).
        else if (!prWork(String(job.pr), rec, state) && !(job.holder && (job.pushedHead || rec.draft))) {
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
        // A standing issue that is no work (a tracking list, the release status) gets no verdict.
        .filter(([, i]) => i.state === "open" && byOwner(state, i.author) && !notWorkLabel(i.labels ?? [], config))
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
        // A full pass judges each issue once per change: one judged since its last change is done.
        const due = (/** @type {number} */ n) =>
            still.has(n) && !(scope === "full" && judgedSinceChange(state.issues?.byNumber?.[n]));
        next.issues = next.issues.filter(due);
        batch = next.issues.slice(0, TRIAGE_BATCH);
        next.issues = next.issues.slice(TRIAGE_BATCH);
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
    const reason = missing
        ? `missing labels: ${lacks.join(", ")}`
        : (PASS_REASONS[scope] ?? `${scope} pass after merges`);
    add({
        id: `triage-${scope}-${passes.seq}`,
        kind: "triage",
        target: `${batch.length} issues: ${refs}`,
        reason,
        facts: { scope, batch, since: now.toISOString(), ...(missing ? { missing } : {}) },
    });
}

/**
 * Whether an accepted triage verdict covers the issue as it stands: it came after the issue's last
 * change on GitHub (a comment, an edit, a label). Any later change makes it due again.
 * @param {any} issue the issue's record
 * @returns {boolean} whether it was judged since it last changed
 */
function judgedSinceChange(issue) {
    const at = issue?.lastTriagedAt;
    return Boolean(at && issue.updatedAt && Date.parse(issue.updatedAt) <= Date.parse(at));
}

/**
 * Stamps `lastTriagedAt` from the ledger on each issue that has none: every triage job recorded
 * done (its verdicts accepted at `stateSince`) judged the issues of its batch, and the latest
 * acceptance wins. Verdicts accepted before done.mjs stamped them would otherwise make the next
 * full pass judge every open issue again. Only empty stamps are filled, so it can run every start.
 * @param {any} state the daemon state, changed in place
 * @param {any[]} entries the ledger's entries
 * @returns {number} how many issues it stamped
 */
export function backfillTriaged(state, entries) {
    /** @type {Map<string, string>} */
    const latest = new Map();
    for (const e of entries) {
        const job = e?.collection === "jobs" ? e.record : null;
        if (job?.kind !== "triage" || job.state !== "done" || !job.stateSince) continue;
        for (const n of job.facts?.batch ?? []) {
            const had = latest.get(String(n));
            if (!had || had < job.stateSince) latest.set(String(n), job.stateSince);
        }
    }
    let stamped = 0;
    for (const [n, at] of latest) {
        const issue = state.issues?.byNumber?.[n];
        if (!issue || issue.lastTriagedAt) continue;
        issue.lastTriagedAt = at;
        stamped += 1;
    }
    return stamped;
}

/** The reason of a triage pass that merges did not call for. */
const PASS_REASONS = /** @type {Record<string, string>} */ ({
    types: "re-judge each issue's type label now that infrastructure exists",
});

/**
 * Queues a full triage pass once enough merges landed since the last one, or else a refresh pass;
 * and once, a `types` pass over every open issue to re-judge its type now that `infrastructure`
 * exists (owner decision 2026-10-06).
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
    if (!passes.typesQueued && open.length) {
        passes.queue.push({ scope: "types", issues: open.map((i) => i.number) });
        passes.typesQueued = true;
    }
}

/**
 * The refresh job at the front of the triage queue (design 5.1): the merges since the last refresh,
 * with their changed files, and every open issue they do not close. The issues a merge mentions
 * without closing, and those a reference on master no verdict weighed yet names, must each get a
 * verdict; for the rest, the session decides which the merges affect.
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
    // A commit on master that names an issue reaches it through no merge's mentions: judge it too.
    const named = issues.filter((i) => masterRefs(state, i.number).length).map((i) => i.number);
    const batch = [...new Set([...merged.flatMap((/** @type {any} */ pr) => pr.mentions ?? []), ...named])]
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
 * The re-land job of every pull request a revert took out, once the revert left the open pull
 * requests (merged, or closed by the owner).
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 */
function relandJobs(state, now, add) {
    for (const [reverted, revertPr] of Object.entries(state.incidentActions?.reverts ?? {})) {
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
}

/**
 * Ends the deferrals whose issue changed. A deferral holds while the issue's revision is the one it
 * was made at, or no later than the deferral itself; a new comment, edit or label change after it
 * ends it, and the issue's ended job no longer keeps it out.
 * @param {any} state the daemon state, changed in place
 * @returns {Record<string, any>} the deferrals that hold, by issue
 */
function endChangedDeferrals(state) {
    const deferred = state.deferred ?? {};
    for (const [n, d] of Object.entries(deferred)) {
        // Changes made up to the deferral are part of it: the Decision comment a session posts just
        // before deferring lands after githerd's last poll, so the polled revision alone is older.
        const at = state.issues?.byNumber?.[n]?.updatedAt;
        if (at === d.revision || (at && d.at && Date.parse(at) <= Date.parse(d.at))) continue;
        delete deferred[n];
        if (TERMINAL.includes(state.jobs[`issue-${n}`]?.state)) delete state.jobs[`issue-${n}`];
    }
    return deferred;
}

/**
 * Cancels each issue job whose issue closed, and each queued one nobody holds whose issue another
 * session already fixes (an open pull request or a queued push, `workedOn`): offering it would
 * have two sessions fix it at once. That one is withdrawn, so it is made again if the fix goes away.
 * A re-land or a promotion is not an issue's own job.
 * @param {any} state the daemon state
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function cancelClosedIssueJobs(state, cancel) {
    for (const job of Object.values(state.jobs)) {
        if (job.kind !== "issue" || job.facts?.scope === "reland" || job.facts?.scope === "promote") continue;
        const n = Number(String(job.target).slice(1));
        if (state.issues?.byNumber?.[n]?.state === "closed") cancel(job, "the issue closed");
        else if (job.state === "queued" && !job.holder) {
            const fix = workedOn(state, n);
            if (fix) {
                cancel(job, `${fix} already fixes #${n}`);
                job.facts = { ...job.facts, withdrawn: true };
            }
        }
    }
}

/**
 * The issue jobs: as many queued as the sessions githerd may invite have room for (`issueDemand`),
 * for the issues at the front (an open
 * order first, then the ranked list); the re-land of every pull request a revert took out; and an issue job whose issue
 * closed is cancelled.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function issueJobs(state, config, now, add, cancel) {
    relandJobs(state, now, add);
    cancelClosedIssueJobs(state, cancel);
    const deferred = endChangedDeferrals(state);
    for (const [n, revision] of Object.entries(state.unbundled ?? {}))
        if (state.issues?.byNumber?.[n]?.updatedAt !== revision) delete state.unbundled[n];
    // A promotion waits for an owner session and holds no place in the issue queue.
    let queued = Object.values(state.jobs).filter(
        (j) => j.kind === "issue" && j.state === "queued" && j.facts?.scope !== "promote",
    ).length;
    const priorities = config.labels?.priorities ?? [];
    // As many queued issue jobs as the sessions githerd may invite have room for (`issueDemand`),
    // all made in this pass, so an issue every session passes on does not leave the others
    // without work; a critical one, or one the owner ordered, never waits for room.
    const room = issueDemand(state, config);
    const tried = new Set();
    for (;;) {
        const candidates = issueCandidates(state, config, now, deferred);
        const top = candidates[0];
        const urgent = top && (priorities[top.priority] === CRITICAL || top.order !== null);
        if (!top || tried.has(top.number) || (queued >= room && !urgent)) return;
        tried.add(top.number);
        addIssueJob(state, config, now, add, top, candidates);
        queued += 1;
    }
}

/**
 * How many issue jobs to keep queued: the sum, over the sessions githerd may invite
 * (the deprecated `workers.sessions` allowlist; otherwise every session that reported room, at least one), of the
 * room each last reported in its capacity answer (`state.capacity`, less the jobs it claimed
 * since), at least one and at most twice `workers.maxActive` per session. A session that never
 * answered counts one. Queued jobs are never cancelled when the demand falls.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @returns {number} the demand
 */
function issueDemand(state, config) {
    const most = 2 * (config.workers?.maxActive ?? 3);
    const jobs = Object.values(state.jobs ?? {});
    const rooms = Object.entries(state.capacity ?? {}).map(([session, said]) => {
        const claimed = jobs.filter((j) => j.claim?.session === session && j.claim.at >= said.at).length;
        return Math.min(Math.max(said.n - claimed, 1), most);
    });
    // ponytail: capacity is keyed by session id and workers.sessions by name, so the largest
    // answers stand in for the named sessions; record the name with the answer if that misleads.
    const sessions = Math.max(config.workers?.sessions?.length ?? rooms.length, 1);
    rooms.sort((a, b) => b - a);
    let demand = 0;
    for (let i = 0; i < sessions; i++) demand += rooms[i] ?? 1;
    return demand;
}

/**
 * Makes the issue job for the issue at the front of the queue, with its bundle.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {any} top the front issue (`issueCandidates`)
 * @param {any[]} candidates every free issue, in queue order
 */
function addIssueJob(state, config, now, add, top, candidates) {
    const priorities = config.labels?.priorities ?? [];
    const issue = state.issues.byNumber[top.number];
    const guard = guardIssue(state, String(issue.text ?? "").split("\n")[0]);
    const label = priorities[top.priority];
    const priority = label ? label.replace(/^[^:]*:/, "") : null;
    const ranking = { bug: top.bug, type: top.type, effort: top.effort };
    // A commit or merged pull request on master already names the issue: the worker verifies first.
    const references = masterRefs(state, top.number);
    const batch = references.length ? [] : bundleOf(state, config, now, top, candidates);
    const bundledWith = batch.map((n) => `#${n}`).join(", ");
    const also = batch.length ? `; bundled with ${bundledWith}` : "";
    add({
        id: `issue-${top.number}`,
        kind: "issue",
        target: `#${top.number}`,
        priority,
        reason: issueReason(guard, references, `front of the issue queue: ${issueRule(priority, ranking)}${also}`),
        facts: {
            ...(references.length ? { references } : {}),
            ...(batch.length ? { batch: [top.number, ...batch], package: issuePackage(issue) } : {}),
            since: issue.createdAt ?? null,
            ...ranking,
            labels: issue.labels ?? [],
            next: top.next,
            skip: false,
            storybook: false,
            ...(top.order === null ? {} : { order: top.order }),
        },
    });
}

/**
 * Why an issue job is made: a stale master-guard issue to verify and close, references on master
 * to verify, or its place at the front of the queue.
 * @param {{lane: string} | null} guard the master-guard issue's lane, null for another issue
 * @param {string[]} references the commits and pull requests on master naming it
 * @param {string} front the front-of-the-queue reason
 * @returns {string} the reason
 */
function issueReason(guard, references, front) {
    if (guard)
        return `stale ${guard.lane} red-master issue: the lane is green again; verify its failure is gone and close it`;
    return references.length ? `referenced by ${references.join(", ")} on master` : front;
}

/**
 * The ready issues free for a new job, in queue order: those `issueRefusal` allows, with no
 * live job, not deferred and in no live job's bundle.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {Record<string, any>} deferred the deferrals still standing
 * @returns {any[]} the ranked entries, each with its open-order position
 */
function issueCandidates(state, config, now, deferred) {
    // An issue in a live job's bundle is that job's until it ends.
    const bundled = new Set(
        Object.values(state.jobs)
            .filter((j) => j.kind === "issue" && !TERMINAL.includes(j.state))
            .flatMap((j) => (j.facts?.batch ?? []).map(Number)),
    );
    const candidates = readyIssues(state, config, now)
        .ranked.map((r) => ({ ...r, order: orderPosition(state, r.number) }))
        .filter((r) => {
            const old = state.jobs[`issue-${r.number}`];
            const free =
                (!old || old.facts?.withdrawn || fixGone(state, old)) && !deferred[r.number] && !bundled.has(r.number);
            // A master-guard issue whose lane is red now is the open incident's, not an issue job.
            const title = String(state.issues.byNumber[r.number]?.text ?? "").split("\n")[0];
            return free && r.offered && !guardIssue(state, title)?.live;
        });
    // An open order comes before the ranked list (design 5.4); the sort is stable otherwise.
    candidates.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    return candidates;
}

/**
 * Whether a done issue job's fix is gone (issue #2644): the pull request it named is no longer open
 * while its issue still is. Closed unmerged, the issue needs a new job; merged without closing it,
 * the new job verifies the merge first (`masterRefs`). A job still holding a session, a kept window
 * or a worktree waits until tidyEndedJobs ends them. A done job with no pull request (a split's
 * parent, a not-needed proposal) keeps the issue.
 * @param {any} state the daemon state
 * @param {any} job the issue's finished job
 * @returns {boolean} whether the issue is free again
 */
function fixGone(state, job) {
    const pr = job.pr ?? job.report?.pr;
    if (job.state !== "done" || pr == null || job.holder || job.kept || job.worktree) return false;
    return !state.prs?.[String(pr)];
}

/** Labels that keep an issue out of a bundle: it must not merge, or needs a person's eyes. */
const UNBUNDLED = /^(hold|.*visual.*)$/i;

/**
 * An issue's package: a `package:<name>` label, or else its title's prefix ("graph-io: ..."), or
 * null when it names none.
 * @param {any} issue the issue record
 * @returns {string | null} the package
 */
function issuePackage(issue) {
    const label = (issue.labels ?? []).find((/** @type {string} */ l) => l.startsWith("package:"));
    if (label) return label.slice("package:".length);
    return /^([\w@./-]+):\s/.exec(String(issue.text ?? ""))?.[1].toLowerCase() ?? null;
}

/**
 * The issues offered with `top` in one job (owner decision 2026-10-06: fewer CI runs and merges for
 * small fixes): only for an effort:low anchor that is not critical, up to `backlog.bundleMax - 1`
 * more ready, free issues in queue order, each effort:low, of the anchor's type, not critical, of
 * its package, none master already names, held, visual, in use by another job (`jobInUse`), picked
 * by an open order, or left out of an earlier bundle at its current revision (`state.unbundled`,
 * done.mjs); such an issue, or a held or visual one, does not anchor a bundle either.
 * Whether they truly belong together is the session's judgment; this only proposes and limits.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @param {any} top the anchor's ranked entry
 * @param {any[]} candidates the free, offered ranked entries, in queue order
 * @returns {number[]} the other issues, empty for none
 */
function bundleOf(state, config, now, top, candidates) {
    const { bundle = true, bundleMax = 4 } = config.backlog ?? {};
    const anchor = state.issues.byNumber[top.number];
    const pkg = issuePackage(anchor);
    const critical = (/** @type {any} */ r) => (config.labels?.priorities?.[r.priority] ?? "").endsWith("critical");
    // An issue left out of a bundle is offered alone until it changes.
    const leftOut = (/** @type {number} */ n) => state.unbundled?.[n] === state.issues.byNumber[n].updatedAt;
    const held = (/** @type {any} */ issue) =>
        (issue.labels ?? []).some((/** @type {string} */ l) => UNBUNDLED.test(l));
    if (!bundle || top.effort !== "low" || critical(top) || !pkg || leftOut(top.number) || held(anchor)) return [];
    return candidates
        .filter((r) => {
            const issue = state.issues.byNumber[r.number];
            if (r.number === top.number || r.effort !== "low" || r.type !== top.type || critical(r)) return false;
            if (r.order !== null || issuePackage(issue) !== pkg || masterRefs(state, r.number).length) return false;
            if (held(issue) || leftOut(r.number)) return false;
            const probe = { id: `issue-${r.number}`, kind: "issue", target: `#${r.number}` };
            return !jobInUse(state, probe, { config, now });
        })
        .slice(0, bundleMax - 1)
        .map((r) => r.number);
}

/**
 * The promotion jobs (advisory.mjs): one per advisory check the CI workflow tests ask to promote
 * (on or after three days before its enforce date), made once and never again after it was done;
 * cancelled once the default branch no longer lists the check as advisory.
 * @param {any} state the daemon state; `state.advisory` is the default branch's registry as read
 * @param {Date} now the clock
 * @param {(spec: any, extra?: any) => any} add makes a job unless one is live
 * @param {(job: any, reason: string) => void} cancel cancels a job whose cause ended
 */
function promoteJobs(state, now, add, cancel) {
    if (!state.advisory) return;
    for (const e of promotionsDue(state.advisory, utcDay(now))) {
        const id = jobId(`issue-promote-${e.id}`);
        if (state.jobs[id]?.state === "done") continue;
        add({
            id,
            kind: "issue",
            target: e.issue ? `#${e.issue}` : e.id,
            priority: "high",
            reason: `advisory check ${e.id} is enforced from ${e.enforce}: promote it to required`,
            facts: {
                scope: "promote",
                check: e.id,
                job: e.job,
                step: e.step,
                enforce: e.enforce,
                issue: e.issue,
                since: now.toISOString(),
                ownerOnly: true,
            },
        });
    }
    const listed = new Set(state.advisory.entries.map((/** @type {any} */ e) => e.id));
    for (const job of Object.values(state.jobs)) {
        if (job.facts?.scope === "promote" && !listed.has(job.facts.check))
            cancel(job, `${job.facts.check} is no longer an advisory check on master`);
    }
}

/** The states of a finished job: one in either is never worked again (a failed job keeps its owner item). */
const FINISHED = new Set(["done", "cancelled"]);

/**
 * What becomes of each finished job (`done` or `cancelled`) at this pass (issue #2366). A finished
 * job stays whole while something still works with it: a holder, a kept window or a worktree not
 * yet removed (tidyEndedJobs), a session being ended for it, the usage stop's canary, a start task
 * (`busy`), or a job that has not finished waiting on it. Otherwise, while a rule that makes jobs or
 * counts claims reads it (`remakeReads`), it becomes a tombstone (`tombstoneOf`). Otherwise it is
 * dropped. Each rule ends on an event (a pull request or issue leaves the state, a capacity answer
 * is replaced, an entry leaves its list), never after a time.
 * @param {any} state the daemon state
 * @param {(id: string) => boolean} [busy] whether a start task runs for the job
 * @returns {{tombstone: string[], drop: string[]}} the jobs to make tombstones of, and to drop
 */
export function finishedJobsToPrune(state, busy = () => false) {
    const jobs = Object.values(state.jobs ?? {});
    const waitedOn = new Set(jobs.filter((j) => !FINISHED.has(j.state)).map((j) => j.waitingFor?.job));
    const retiring = new Set((state.retiring ?? []).map((/** @type {any} */ r) => r.job));
    const ctx = {
        held: new Set(Object.values(state.capacity ?? {}).flatMap((/** @type {any} */ c) => c.held ?? [])),
        ordered: new Set((state.orders ?? []).flatMap((/** @type {any} */ o) => o.issues ?? []).map(String)),
        advisory: new Set((state.advisory?.entries ?? []).map((/** @type {any} */ e) => e.id)),
        incidents: new Set(
            Object.values(state.incidents ?? {})
                .filter((/** @type {any} */ i) => i.status === "open")
                .map((/** @type {any} */ i) => i.id),
        ),
    };
    /** @type {{tombstone: string[], drop: string[]}} */
    const out = { tombstone: [], drop: [] };
    for (const j of jobs) {
        if (!FINISHED.has(j.state)) continue;
        const whole = j.holder || j.kept || j.worktree || waitedOn.has(j.id) || retiring.has(j.id) || busy(j.id);
        if (whole || state.apiStop?.canary === j.id) continue;
        if (!remakeReads(state, j, ctx)) out.drop.push(j.id);
        else if (!j.tombstone) out.tombstone.push(j.id);
    }
    return out;
}

/**
 * Whether a rule still reads finished job `j` (issue #2366), each until the event that ends it:
 * - its pull request is open (`state.prs`): the review jobs of a pull request a job made, a review
 *   of the same patch not made twice, self-review and disown checks (sessions, claim), the merge
 *   gate's facts (`madeBy`: kind, acknowledged revision, a passed review's verdict and patch id);
 * - its claim counts against its session's capacity answer (claimed or ended since the answer, or
 *   listed as held in it), until the session answers again or ends;
 * - `issue-<n>`: while issue n is in the state or an order lists it, a finished job keeps the issue
 *   from a new job (`issueCandidates`, unless withdrawn or its fix is gone: `fixGone`) and an order's issue counts as having one;
 * - `issue-reland-<n>`: while the revert of n is recorded, the re-land is not made again;
 * - a promotion, while its check is still advisory; a release queue job, while its release pull
 *   request is in `state.releaseQueue`; a shared failure's job, while the key is shared; a verdict
 *   job, while its incident is open (githerd_verdict reads its key from it).
 * @param {any} state the daemon state
 * @param {any} j the finished job
 * @param {{held: Set<string>, ordered: Set<string>, advisory: Set<string>, incidents: Set<string>}} ctx
 *   the capacity answers' held jobs, the ordered issues, the advisory checks and the open incidents
 * @returns {boolean} whether a rule reads it
 */
function remakeReads(state, j, ctx) {
    const pr = prOf(j) ?? j.report?.pr;
    if (pr != null && state.prs?.[String(pr)]) return true;
    const said = j.claim ? state.capacity?.[j.claim.session] : null;
    if (ctx.held.has(j.id) || (said && (j.claim.at >= said.at || j.stateSince >= said.at))) return true;
    const issue = /^issue-(\d+)$/.exec(j.id)?.[1];
    if (issue && (state.issues?.byNumber?.[issue] || ctx.ordered.has(issue))) return true;
    const reland = /^issue-reland-(\d+)$/.exec(j.id)?.[1];
    if (reland && state.incidentActions?.reverts?.[reland] !== undefined) return true;
    const f = j.facts ?? {};
    if (f.scope === "promote") return ctx.advisory.has(f.check);
    if (f.scope === "queue") return Boolean(state.releaseQueue?.[String(f.release)]);
    if (f.scope === "shared") return Boolean(state.sharedFailures?.[f.key]?.shared);
    if (f.scope === "verdict") return ctx.incidents.has(f.incident);
    return false;
}

/** The facts a tombstone keeps: those `remakeReads`'s rules and their readers look at. */
const TOMBSTONE_FACTS = ["scope", "key", "check", "release", "incident", "pr", "patchId", "withdrawn"];

/**
 * The tombstone of finished job `j` (issue #2366): what the rules of `remakeReads` read, with
 * `tombstone: true`. The whole record is in the ledger (a `job-dropped` line), where githerd why
 * reads it.
 * @param {any} j the finished job
 * @returns {any} the tombstone
 */
export function tombstoneOf(j) {
    const facts = Object.fromEntries(
        TOMBSTONE_FACTS.filter((k) => j.facts?.[k] !== undefined).map((k) => [k, j.facts[k]]),
    );
    const verdict = j.report?.result?.verdict;
    return {
        id: j.id,
        kind: j.kind,
        target: j.target,
        state: j.state,
        stateSince: j.stateSince,
        tombstone: true,
        ...(j.pr == null ? {} : { pr: j.pr }),
        ...(j.acknowledgedRevision ? { acknowledgedRevision: j.acknowledgedRevision } : {}),
        // A split's children: proposals.mjs proposeSplitParents closes the parent once they close.
        ...(j.children?.length ? { children: j.children } : {}),
        facts,
        sessions: j.sessions ?? [],
        claim: j.claim ? { session: j.claim.session, at: j.claim.at } : null,
        report: j.report ? { pr: j.report.pr ?? null, ...(verdict ? { result: { verdict } } : {}) } : null,
        news: [],
    };
}
