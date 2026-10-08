/**
 * Which held jobs are only waiting on something githerd watches: a push in the machine's push
 * queue, CI on the job's pull request, the owner's visual review of it, or its merge (every
 * required check green, so Mergify takes it). Such a job is not counted toward `workers.maxActive`
 * (asks.mjs `atActiveCap`), and the board shows it as waiting rather than working.
 *
 * Every poll the daemon records the push queue's live tickets in `state.pushTickets` as
 * `{branch, cwd, session}`: the branch the ticket's `git push` names, its worktree, and the Claude
 * Code session the ticket's process runs under (its first ancestor with a registry entry).
 *
 * A job's branch is its pull request's head: a `pr` job's own, or for an issue job the open pull
 * request that closes the issue. A job waits to push when a ticket names its branch or its
 * worktree. A job with no branch yet (an issue whose pull request is not open) waits to push when a
 * ticket of its holding session matches no other job and the session's last status for the job
 * says it is pushing; neither fact alone is enough. A job waits for CI when its pull request's
 * required checks are not all reported yet and none failed: a check pending, or missing because it
 * has not started (a summary check such as All Checks Pass appears only when the jobs it needs end).
 * It waits for the owner when the only failing check is the owner's visual gate (`ownerGate`,
 * prs.mjs) and the owner has not rejected the images, and to merge when every required check passed.
 */

import { pushedBranches } from "./owners.mjs";
import { prOf } from "./queue.mjs";

/** @typedef {{branch: string | null, cwd: string, session: string | null}} PushTicket */

/**
 * The push queue's tickets with their branch and session.
 * @param {{pid: number, cwd: string, command: string}[]} tickets the live tickets (proc.mjs `liveTickets`)
 * @param {{sessions: {pid: number, sessionId: string}[], procs: {pid: number, ppid: number}[]}} facts
 *   the live registered sessions and the process table
 * @returns {PushTicket[]} the tickets
 */
export function attributeTickets(tickets, { sessions, procs }) {
    const parent = new Map(procs.map((p) => [p.pid, p.ppid]));
    const byPid = new Map(sessions.map((s) => [s.pid, s.sessionId]));
    return tickets.map((t) => {
        let session = null;
        for (let pid = t.pid, hops = 0; pid > 1 && hops < 64 && !session; hops++) {
            session = byPid.get(pid) ?? null;
            pid = parent.get(pid) ?? 0;
        }
        return { branch: pushedBranches(t.command)[0] ?? null, cwd: t.cwd, session };
    });
}

/**
 * The pull request a job's work is on, or null.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @returns {any} the pull request's record
 */
function prRecord(state, job) {
    const n = prOf(job);
    if (n) return state.prs?.[n] ?? null;
    if (job.kind !== "issue") return null;
    const issue = Number(String(job.target).replace("#", ""));
    return Object.values(state.prs ?? {}).find((p) => (p.references ?? []).includes(issue)) ?? null;
}

/**
 * What a pull request's required checks leave its job waiting on, or null when the holder has work.
 * @param {any} rec the pull request's record
 * @returns {"ci" | "owner" | "merge" | null} what it waits on
 */
function prWait(rec) {
    const checks = Object.values(rec.required ?? {});
    const unsettled = checks.some((c) => c === "PENDING" || c === "MISSING");
    if (unsettled && !checks.includes("FAILURE")) return "ci";
    if (rec.ownerGate && !rec.ownerRejected) return "owner";
    return checks.length && checks.every((c) => c === "SUCCESS") ? "merge" : null;
}

/**
 * What each held job in `working` or `starting` is only waiting on, if anything.
 * @param {any} state the daemon state
 * @returns {Map<string, "push" | "ci" | "owner" | "merge">} the waiting jobs, by id
 */
export function jobWaits(state) {
    /** @type {Map<string, "push" | "ci" | "owner" | "merge">} */
    const out = new Map();
    const tickets = [...(state.pushTickets ?? [])];
    const take = (/** @type {(t: PushTicket) => boolean} */ match) => {
        const i = tickets.findIndex(match);
        return i !== -1 && tickets.splice(i, 1).length > 0;
    };
    const held = Object.values(state.jobs ?? {}).filter(
        (j) => j.holder?.session && (j.state === "working" || j.state === "starting"),
    );
    const branchless = [];
    for (const job of held) {
        const rec = prRecord(state, job);
        const branch = rec?.headRef;
        if (take((t) => (branch && t.branch === branch) || (job.worktree && t.cwd === job.worktree))) {
            out.set(job.id, "push");
        } else if (rec) {
            const wait = prWait(rec);
            if (wait) out.set(job.id, wait);
        } else if (!job.worktree) {
            branchless.push(job);
        }
    }
    for (const job of branchless) {
        if (/push/i.test(job.status?.text ?? "") && take((t) => t.session === job.holder.session)) {
            out.set(job.id, "push");
        }
    }
    return out;
}
