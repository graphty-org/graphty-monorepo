/**
 * Advancing job records each reconcile (design 5.3, 7.4 and 9.5): every start deadline ticks, a
 * declared wait whose condition changed is settled and its worker rung, and the invariant check
 * runs. No wait and no stretch of work ends on elapsed time. Pure functions over
 * the state; the daemon persists it, writes the ledger lines and rings the workers named.
 */

import { readFileSync } from "node:fs";

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
 * Ticks every job's deadline clock (board.tick; only a start has one) and carries out what fired:
 * a start failure or fault ends the session the job left.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @param {{unknown?: boolean, usage?: boolean, paused?: boolean, load?: boolean}} pauses what
 *   holds every clock right now
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
        steps.push({
            job: job.id,
            action: result.action,
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
    if (w.checks && !w.verify) return checksNews(state, job, w);
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
    if (w.local) return localNews(job, w.local, w.output);
    return null;
}

/**
 * The news of a wait on a session's background task: Claude Code ends a finished task's output
 * file with `[exited with code N]`. The task runs in its session, so once the job has no holder it
 * ended with that session. Null while it runs, or while its file cannot be read.
 * @param {any} job the waiting job
 * @param {string} task the task
 * @param {string | undefined} output its output file
 * @returns {string | null} the news line, or null
 */
function localNews(job, task, output) {
    if (!job.holder) return `task ${task} ended with its session`;
    let tail;
    try {
        tail = readFileSync(output ?? "", "utf8").slice(-200);
    } catch {
        return null;
    }
    const exited = /\[exited with code (-?\d+)\]\s*$/.exec(tail);
    return exited ? `task ${task} finished with exit code ${exited[1]}` : null;
}

/** Required-check states that are not a result yet: a summary check is MISSING until its jobs end. */
const UNSETTLED = new Set(["PENDING", "MISSING", "CANCELLED", "EXPECTED"]);

/**
/**
 * The pull request number a checks wait names (`1451` or `#1451`, which sessions pass), or null
 * when it names a head sha.
 * @param {string} target the wait's target
 * @returns {string | null} the number
 */
const waitNumber = (target) => (/^#?\d+$/.test(target) ? target.replace("#", "") : null);

/**
 * The polled open pull request a checks wait names: by number, or by head sha, which also matches
 * the job's own pull request.
 * @param {any} state the daemon state
 * @param {any} job the waiting job
 * @param {string} target the wait's target
 * @returns {[string, any] | undefined} the number and the record, or undefined when not polled
 */
function polledPr(state, job, target) {
    const number = waitNumber(target);
    return Object.entries(state.prs ?? {}).find(([n, p]) =>
        number ? n === number : p.headSha === target || Number(n) === job.pr,
    );
}

/**
 * The news of a wait on a pull request's required checks, or null while they run. A wait on the
 * number follows the pull request across pushes. A pull request the poll's open list does not hold
 * is "not seen yet" (opened since, or past the list's end), not closed: only GitHub's own answer
 * (`confirmClosedWaits`) ends the wait for that.
 * @param {any} state the daemon state
 * @param {any} job the waiting job
 * @param {any} w its wait: `checks` the pull request's number or head, `closed` GitHub's answer
 * @returns {string | null} the news line, or null
 */
function checksNews(state, job, w) {
    const t = String(w.checks);
    const number = waitNumber(t);
    const pr = polledPr(state, job, t);
    if (!pr) {
        if (!w.closed) return null;
        return number ? `#${number} is no longer open` : `the pull request of ${t.slice(0, 9)} is no longer open`;
    }
    const [n, rec] = pr;
    if (!number && rec.headSha !== t) return `#${n}'s head moved to ${String(rec.headSha).slice(0, 9)}`;
    const states = Object.entries(rec.required ?? {});
    if (!states.length || states.some(([, s]) => UNSETTLED.has(s))) return null;
    const results = states.map(([k, s]) => `${k} ${s}`).join(", ");
    const where = number ? "#" + n : t.slice(0, 9);
    return `checks on ${where} finished: ${results}`;
}

/**
 * Asks GitHub, in one GraphQL query per poll, about the checks waits whose pull request the poll's
 * open list does not hold, and marks `waitingFor.closed` on each GitHub says is closed or merged.
 * A head commit counts as closed when every pull request it heads is. A failed query, an open
 * answer or a target that is neither a number nor a full commit confirms nothing; the next poll
 * asks again.
 * @param {any} state the daemon state
 * @param {{gitHub: any, repo: string}} facts the client and `owner/name`
 * @returns {Promise<void>}
 */
export async function confirmClosedWaits(state, { gitHub, repo }) {
    /** @type {any[]} */
    const asks = [];
    /** @type {string[]} */
    const fields = [];
    for (const job of Object.values(state.jobs ?? {})) {
        const w = job.waitingFor;
        if (job.state !== "waiting" || !w?.checks || w.verify || w.closed) continue;
        const target = String(w.checks);
        if (polledPr(state, job, target)) continue;
        const key = `j${asks.length}`;
        const number = waitNumber(target);
        if (number) fields.push(`${key}: pullRequest(number: ${number}) { state }`);
        else if (/^[0-9a-f]{40}$/.test(target)) {
            fields.push(
                `${key}: object(oid: "${target}") { ... on Commit { associatedPullRequests(first: 5) { nodes { state } } } }`,
            );
        } else continue;
        asks.push(w);
    }
    if (!asks.length) return;
    const [owner, name] = repo.split("/");
    let data;
    try {
        data = await gitHub.graphql(
            `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields.join(" ")} } }`,
            { owner, name },
        );
    } catch {
        return;
    }
    asks.forEach((w, i) => {
        const got = data?.repository?.[`j${i}`];
        const states = got?.associatedPullRequests
            ? got.associatedPullRequests.nodes.map((/** @type {any} */ p) => p.state)
            : [got?.state];
        if (states.length && states.every((s) => s === "CLOSED" || s === "MERGED")) w.closed = true;
    });
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
 * Ends a blocked job's wait once its blocker ended: back to the queue. A job already made is never
 * cancelled because the offer rule changed (the owner, 2026-10-06).
 * @param {any} state the daemon state
 * @param {any} job the blocked job
 * @param {Date} now the clock
 * @returns {Step | null} what happened, null while the blocker lasts
 */
function unblock(state, job, now) {
    const other = state.jobs?.[job.waitingFor.job];
    if (other && !board.TERMINAL.includes(other.state)) return null;
    const holder = job.holder;
    job.news.push({ at: now.toISOString(), text: `job ${job.waitingFor.job} ended; judge again`, acked: false });
    board.move(job, "queued", now, { reason: `blocker ${job.waitingFor.job} ended` });
    afterMove(state, job, holder, null, now);
    return { job: job.id, action: "unblocked", line: { kind: "job-unblocked", job: job.id } };
}

/**
 * Settles every declared wait whose condition changed (design 7.4): the job goes back to work with
 * a news line, and its worker is rung. A push wait is the push queue's, a done check's wait on CI
 * is the verification poll's, and a local task's wait ends when its output file records the exit
 * or its session ends. A blocked job whose blocker ended goes back to the queue; that is the only
 * way out of `blocked` short of a session's death or a cancel. No time limit applies to either.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @returns {Step[]} what settled
 */
export function settleWaits(state, now) {
    const steps = [];
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.state === "blocked" && job.waitingFor?.job) {
            const step = unblock(state, job, now);
            if (step) steps.push(step);
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
