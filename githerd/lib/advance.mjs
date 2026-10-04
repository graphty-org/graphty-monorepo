/**
 * Advancing job records each reconcile (design 5.3, 7.4 and 9.5): every deadline clock ticks, a
 * declared wait whose condition changed is settled and its worker rung, a working job whose pull
 * request moved gets its no-change clock back, and the invariant check runs. Pure functions over
 * the state; the daemon persists it, writes the ledger lines and rings the workers named.
 */

import * as board from "./board.mjs";
import { endItem, raiseItem } from "./notify.mjs";

/** A fault on every surface for this long is paged once (design 9.5). */
const FAULT_PAGE_MS = 24 * 3_600_000;
/** Real start failures after a passed self-test that stop every start until the owner looks. */
const START_FAILURES = 2;

/**
 * A worker start that failed (no registry entry, a session on a disallowed model): the job goes
 * back to the queue, and the second failure in a row stops every start until a self-test passes
 * again, with one owner item (design 7.1). The caller ends the window, if one opened.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {Date} now the clock
 * @param {string} why one line
 */
export function startFailed(state, job, now, why) {
    job.holder = null;
    if (["starting", "working"].includes(job.state)) board.move(job, "queued", now, { reason: why });
    state.startFailures = (state.startFailures ?? 0) + 1;
    if (state.startFailures < START_FAILURES) return;
    const reason = `${state.startFailures} worker starts failed in a row after a passed self-test`;
    state.startsStopped = { at: now.toISOString(), reason };
    raiseItem(
        state,
        {
            id: "worker-start-failed",
            kind: "system change",
            question: `${reason}; githerd starts no worker until a self-test passes again (githerd selftest). The last one: ${why}. The last screen is in the ledger (session-start-failed).`,
        },
        now,
    );
}

/**
 * @typedef {{job: string, action: string, ring?: boolean, line: Record<string, unknown>}} Step one
 *   thing that happened to a job: the ledger line, and whether its worker is rung
 */

/**
 * Puts the session a job left on `state.retiring` and raises the owner item of a failed urgent job
 * (as `githerd_done` does, done.mjs).
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {any} holder its holder before the change
 * @param {any} result what the board returned
 * @param {Date} now the clock
 */
function afterMove(state, job, holder, result, now) {
    if (holder?.pane && !job.holder) {
        state.retiring = [
            ...(state.retiring ?? []),
            { job: job.id, holder, reason: `job ${job.state}`, at: now.toISOString() },
        ];
    }
    if (result?.action === "failed" && result.ownerItem) {
        const findings = job.attempts
            .map((/** @type {any} */ a, /** @type {number} */ i) => `${i + 1}. ${a.outcome}`)
            .join(" ");
        raiseItem(
            state,
            {
                id: `failed-urgent:${job.id}`,
                kind: "failed-urgent",
                question: `${job.id} failed: ${job.reason}. Attempts: ${findings || "none"}`,
                target: job.pr ? `pr:${job.pr}` : null,
            },
            now,
        );
    }
}

/**
 * Ticks every job's deadline clock (board.tick) and carries out what fired: a doorbell rings the
 * worker, a requeue, start failure, fault or ended attempt ends the session the job left.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @param {{unknown?: boolean, usage?: boolean, paused?: boolean, actionsDegraded?: boolean,
 *   load?: boolean}} pauses what holds every clock right now
 * @returns {Step[]} what fired
 */
export function tickJobs(state, now, pauses) {
    const steps = [];
    for (const job of Object.values(state.jobs ?? {})) {
        if (board.TERMINAL.includes(job.state)) continue;
        const holder = job.holder;
        const result = board.tick(job, now, pauses);
        if (!result) continue;
        afterMove(state, job, holder, result, now);
        // A wait's doorbell moves it back to working; its session is told to look again.
        const ring = result.action === "doorbell" && Boolean(job.holder);
        steps.push({
            job: job.id,
            action: result.action,
            ring,
            line: { kind: "deadline", ...result, state: job.state },
        });
    }
    return steps;
}

/**
 * Whether a declared wait's condition changed, and how, or null while it is pending.
 * @param {any} state the daemon state
 * @param {any} job the waiting job
 * @returns {string | null} the news line, or null
 */
export function waitNews(state, job) {
    const w = job.waitingFor ?? {};
    if (w.checks && !w.verify) return checksNews(state, job, w.checks);
    if (w.lane) return laneNews(state, job, w.lane);
    if (w.release) {
        const rel = state.master?.lastRelease;
        return rel && Date.parse(rel.at) > Date.parse(job.stateSince)
            ? `a release ran at ${String(rel.sha).slice(0, 9)}`
            : null;
    }
    if (w.job) {
        const other = state.jobs?.[w.job];
        return !other || board.TERMINAL.includes(other.state) ? `job ${w.job} is ${other?.state ?? "gone"}` : null;
    }
    if (w.github) return state.github?.downSince ? null : "GitHub answers again";
    return null;
}

/**
 * The news of a wait on a pull request head's required checks, or null while they run.
 * @param {any} state the daemon state
 * @param {any} job the waiting job
 * @param {string} sha the head the job waits on
 * @returns {string | null} the news line, or null
 */
function checksNews(state, job, sha) {
    const pr = Object.entries(state.prs ?? {}).find(([n, p]) => p.headSha === sha || Number(n) === job.pr);
    if (!pr) return `the pull request of ${String(sha).slice(0, 9)} is no longer open`;
    const [n, rec] = pr;
    if (rec.headSha !== sha) return `#${n}'s head moved to ${String(rec.headSha).slice(0, 9)}`;
    const states = Object.entries(rec.required ?? {});
    if (!states.length || states.some(([, s]) => s === "PENDING" || s === "EXPECTED")) return null;
    const results = states.map(([k, s]) => `${k} ${s}`).join(", ");
    return `checks on ${String(sha).slice(0, 9)} finished: ${results}`;
}

/**
 * The news of a wait on a master lane, or null while it runs or has not moved.
 * @param {any} state the daemon state
 * @param {any} job the waiting job
 * @param {string} name the lane, or its workflow's name
 * @returns {string | null} the news line, or null
 */
function laneNews(state, job, name) {
    const lanes = state.master?.lanes ?? {};
    const lane = lanes[name] ?? Object.values(lanes).find((l) => /** @type {any} */ (l).workflowName === name);
    if (!lane) return `githerd has no lane ${name}`;
    if (Object.keys(lane.inFlight ?? {}).length) return null;
    return Date.parse(lane.updatedAt ?? "") > Date.parse(job.stateSince) ? `lane ${name} is ${lane.verdict}` : null;
}

/**
 * Settles every declared wait whose condition changed (design 7.4): the job goes back to work with
 * a news line, and its worker is rung. A push wait is the push queue's, a done check's wait on CI
 * is the verification poll's, and a local task's wait ends by its bound. A blocked job whose
 * blocker ended goes back to the queue.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @returns {Step[]} what settled
 */
export function settleWaits(state, now) {
    const steps = [];
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.state === "blocked" && job.waitingFor?.job) {
            const other = state.jobs?.[job.waitingFor.job];
            if (other && !board.TERMINAL.includes(other.state)) continue;
            const holder = job.holder;
            job.news.push({
                at: now.toISOString(),
                text: `job ${job.waitingFor.job} ended; judge again`,
                acked: false,
            });
            board.move(job, "queued", now, { reason: `blocker ${job.waitingFor.job} ended` });
            afterMove(state, job, holder, null, now);
            steps.push({ job: job.id, action: "unblocked", line: { kind: "job-unblocked", job: job.id } });
            continue;
        }
        if (job.state !== "waiting") continue;
        const news = waitNews(state, job);
        if (!news) continue;
        job.news.push({ at: now.toISOString(), text: news, acked: false });
        board.move(job, "working", now, { reason: news });
        steps.push({ job: job.id, action: "settled", ring: true, line: { kind: "wait-settled", job: job.id, news } });
    }
    return steps;
}

/**
 * Restarts the no-change clock of every working job whose pull request's head or required checks
 * changed since the last reconcile (design 5.3: 4 hours of working time with no GitHub change).
 * @param {any} state the daemon state
 * @param {Date} now the clock
 */
export function noteGitHubChanges(state, now) {
    for (const job of Object.values(state.jobs ?? {})) {
        const rec = job.pr ? state.prs?.[String(job.pr)] : null;
        if (!rec) continue;
        const seen = `${rec.headSha}:${JSON.stringify(rec.required ?? {})}`;
        if (job.githubSeen !== undefined && job.githubSeen !== seen) board.githubChanged(job, now);
        job.githubSeen = seen;
    }
}

/**
 * The invariant check of design 9.5 for the job records, with the merge gate's faults: every
 * violation is kept in `state.invariants` for every surface, and one that lasted 24 hours raises
 * one owner item.
 * @param {any} state the daemon state
 * @param {import("./board.mjs").Reads} reads what the reconcile read
 * @param {Date} now the clock
 * @returns {{record: string, problem: string}[]} the faults now
 */
export function checkFaults(state, reads, now) {
    const jobFaults = board.checkInvariants(state, reads);
    const faults = [...jobFaults, ...(state.mergeGate?.checks?.faults ?? [])];
    const prev = state.invariants?.since ?? {};
    /** @type {Record<string, string>} */
    const since = {};
    for (const f of faults) {
        const key = `${f.record}: ${f.problem}`;
        since[key] = prev[key] ?? now.toISOString();
        if (now.getTime() - Date.parse(since[key]) >= FAULT_PAGE_MS) {
            raiseItem(
                state,
                { id: `fault:${f.record}`, kind: "fault", question: `githerd fault for a day: ${key} (githerd why)` },
                now,
            );
        }
    }
    const live = new Set(faults.map((f) => f.record));
    for (const key of Object.keys(prev)) {
        const record = key.slice(0, key.indexOf(": "));
        if (!live.has(record)) endItem(state, `fault:${record}`, "cleared", now);
    }
    state.invariants = { faults: jobFaults, since };
    return faults;
}
