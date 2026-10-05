/**
 * Whose is a pull request whose CI failed (design section 8.2, the owner's decision of
 * 2026-10-05)? Before githerd offers such a pull request as a `pr` job, it asks the live Claude
 * sessions working in this repository, once per failed head, through Claude Code's session
 * messaging (`peers.mjs`). A session answers with `githerd_mine` (or claims the job with
 * `githerd_claim`); `prInUse` in `queue.mjs` reads the question and its answer.
 *
 * The question lives in `state.asks[<pr>]`: `{head, failing, askedAt, sessions, sent, failed,
 * owner}`. A new head drops it, so a new push starts over. An answer lapses when the answering
 * session ends.
 */

import { askProblems, failingRequired, headIsGitherds, jobOnPr, prOf } from "./queue.mjs";
import { tellSessions } from "./peers.mjs";

/**
 * The question for one pull request.
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {string[]} failing its failing required checks
 * @param {string} job the job githerd would offer
 * @returns {string} the message
 */
function askText(n, rec, failing, job) {
    const at = `#${n} (${rec.headRef}) at ${String(rec.headSha).slice(0, 7)}`;
    const checks = failingRequired(rec);
    const what = checks.length ? `CI failed on ${at}: ${checks.join(", ")}.` : `${at} ${failing.join(", ")}.`;
    return (
        `githerd: ${what} ` +
        `If you are working on it, call the githerd_mine tool with pr ${n} (or claim job ${job} with githerd_claim). ` +
        "Otherwise ignore this."
    );
}

/**
 * Forgets questions about a head that is gone and lapses answers whose session ended.
 * @param {any} state the daemon state, changed in place
 * @param {(session: string) => boolean} sessionGone whether a session ended
 * @returns {({kind: string} & Record<string, unknown>)[]} the ledger lines
 */
function settleAsks(state, sessionGone) {
    const lines = [];
    for (const [n, ask] of Object.entries(state.asks)) {
        if (state.prs?.[n]?.headSha !== ask.head) {
            delete state.asks[n];
        } else if (ask.owner && sessionGone(ask.owner.session)) {
            lines.push({ kind: "pr-owner-lapsed", pr: Number(n), head: ask.head, session: ask.owner.session });
            ask.owner = null;
        }
    }
    return lines;
}

/**
 * What to ask about a queued job, or null: its pull request's CI failed, or it conflicts with its
 * base, on a head someone other than githerd pushed, nothing claims it, and it was not asked about
 * at this head (an ask nobody heard, made while asks were dry-run, is asked again once they act).
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {boolean} acting whether asks are sent
 * @returns {{n: string, rec: any, failing: string[]} | null} the pull request and what is wrong with it
 */
function questionFor(state, job, acting) {
    if (job.kind !== "pr" || job.state !== "queued") return null;
    const n = String(prOf(job));
    const rec = state.prs?.[n];
    const asked = state.asks[n]?.head === rec?.headSha && !(acting && state.asks[n]?.dryRun);
    if (!rec || asked || headIsGitherds(state, rec) || jobOnPr(state, n)) return null;
    const failing = askProblems(rec);
    return failing.length ? { n, rec, failing } : null;
}

/**
 * One pass: settles the open questions, then asks about each queued `pr` job's pull request that
 * `questionFor` names.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, sessionGone: (session: string) => boolean}} opts
 *   the clock, whether the `workers` write group acts (else each send is a would-do line), the live
 *   sessions in this repository, the transport, and whether a session ended
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function askStep(state, { now, acting, sessions, transport, sessionGone }) {
    state.asks ??= {};
    const lines = settleAsks(state, sessionGone);
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a question is due */
    let live = null;
    for (const job of Object.values(state.jobs ?? {})) {
        const q = questionFor(state, job, acting);
        if (!q) continue;
        live ??= sessions();
        const names = live.map((s) => s.name);
        const out = acting
            ? await tellSessions(live, askText(q.n, q.rec, q.failing, job.id), transport)
            : { sent: [], failed: [] };
        state.asks[q.n] = {
            head: q.rec.headSha,
            failing: q.failing,
            askedAt: now.toISOString(),
            // In dry-run nobody hears the question, but the wait is the one acting mode would have.
            sessions: acting ? out.sent : names,
            sent: out.sent,
            failed: out.failed,
            owner: null,
            // Nobody heard it: the pull request stays in use rather than read silence as "nobody's".
            ...(acting ? {} : { dryRun: true }),
        };
        if (!acting && names.length) {
            const op = `ask ${names.length} session(s) whose #${q.n} is`;
            lines.push({ kind: "would-do", group: "workers", op, pr: Number(q.n) });
        }
        lines.push({ kind: "pr-asked", pr: Number(q.n), head: q.rec.headSha, sessions: names, ...out });
    }
    return lines;
}

/**
 * The invitation for one queued job.
 * @param {string} job the job
 * @param {string} reason its one-line reason from the queue order
 * @returns {string} the message
 */
function inviteText(job, reason) {
    return (
        `githerd has work queued (${job}, ${reason}). If you're free, call githerd_next and claim a job; ` +
        "otherwise ignore this."
    );
}

/**
 * Invites the idle Claude sessions in this repository to pull work (the owner's decision of
 * 2026-10-05): each queued job no worker slot took is announced once, to every session whose
 * registry status is `idle`. githerd's own workers are never among them (`liveSessions` leaves
 * them out). A job is marked (`invitedAt`) only once a session was there to hear it, so a job
 * queued while every session is busy is announced when one goes idle. The last invitation is kept
 * in `state.invited` for the board.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, offered: {job: string, reason: string}[]}} opts the
 *   clock, whether the `workers` write group acts (else each send is a would-do line), the live
 *   sessions in this repository, the transport, and the queued jobs githerd would offer, in order
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function inviteStep(state, { now, acting, sessions, transport, offered }) {
    const lines = [];
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when an invitation is due */
    let idle = null;
    for (const { job: id, reason } of offered) {
        const job = state.jobs?.[id];
        if (job?.state !== "queued" || job.invitedAt) continue;
        idle ??= sessions().filter((s) => s.status === "idle");
        if (!idle.length) break;
        const names = idle.map((s) => s.name);
        job.invitedAt = now.toISOString();
        if (!acting) {
            const op = `invite ${names.length} idle session(s) to take ${id}`;
            lines.push({ kind: "would-do", group: "workers", op, job: id });
        }
        const out = acting ? await tellSessions(idle, inviteText(id, reason), transport) : { sent: [], failed: [] };
        state.invited = { at: job.invitedAt, count: acting ? out.sent.length : names.length, acting };
        lines.push({ kind: "sessions-invited", job: id, sessions: names, ...out });
    }
    return lines;
}
