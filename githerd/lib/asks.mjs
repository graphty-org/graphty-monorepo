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
 *
 * A session's answer, or the owner's `githerd mine <pr> <session>`, also writes a durable owner
 * record, `state.prOwners[<pr>]`: `{session, name, at, by: "tool" | "cli"}`. A new push keeps it;
 * it drops when that session leaves Claude Code's session registry or the pull request closes
 * (`settleOwners`). While it holds, `prInUse` reports the pull request in use by that session, so
 * it is neither offered nor asked about.
 *
 * The same messaging asks each owner session holding a job for its status (`statusStep`), and
 * invites idle sessions to pull work (`inviteStep`).
 */

import { askProblems, failingRequired, headIsGitherds, jobOnPr, prOf } from "./queue.mjs";
import { ownerHeld } from "./board.mjs";
import { releaseOwnerJob } from "./jobs.mjs";
import { tellSessions } from "./peers.mjs";

const MINUTE = 60 * 1000;

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
 * Drops each owner record whose session ended or whose pull request closed (it is no longer among
 * the open pull requests githerd polled; nothing drops while none were polled yet).
 * @param {any} state the daemon state, changed in place
 * @param {(session: string) => boolean} sessionGone whether a session ended
 * @returns {({kind: string} & Record<string, unknown>)[]} the ledger lines
 */
export function settleOwners(state, sessionGone) {
    const lines = [];
    for (const [n, rec] of Object.entries(state.prOwners ?? {})) {
        const reason = state.prs && !state.prs[n] ? "closed" : sessionGone(rec.session) ? "session ended" : null;
        if (!reason) continue;
        delete state.prOwners[n];
        lines.push({ kind: "pr-owner-dropped", pr: Number(n), session: rec.session, name: rec.name, reason });
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
    if (!rec || asked || state.prOwners?.[n] || headIsGitherds(state, rec) || jobOnPr(state, n)) return null;
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
    const lines = [...settleOwners(state, sessionGone), ...settleAsks(state, sessionGone)];
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

/**
 * The status question for one job.
 * @param {any} job the job
 * @param {number} minutes how often githerd asks
 * @returns {string} the message
 */
function statusText(job, minutes) {
    return (
        `githerd: status check on ${job.id} (${job.target}), which this session holds. ` +
        `Answer by calling githerd_expect with job ${job.id}, reason set to one line on where the job stands, ` +
        "and minutes set to how long until your current step ends. " +
        `If this is still unanswered when githerd asks again in ${minutes} minutes, the job goes back to the queue. ` +
        "Do the job's work in a background subagent or workflow, so this conversation stays free to answer githerd."
    );
}

/** The states in which a holder works on its job; a `verifying` job is githerd's to settle. */
const ASKED = new Set(["starting", "working", "waiting", "blocked", "parked"]);

/**
 * Asks each owner session holding a job where that job stands (the owner's rule of 2026-10-05):
 * every `minutes` from the claim, one message through Claude Code's session messaging to that
 * session only. The session answers with `githerd_expect`, which records `job.status`. A question
 * the session heard and left unanswered until the next one is due releases the job to the queue;
 * nothing else here ends a claim, and elapsed time alone never does. A session githerd may not
 * message (`workers.sessions`) is not asked, so its silence is never held against it; nor is a
 * question nobody heard (dry-run, or a send that failed). githerd's own workers have the watchdog
 * instead.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, minutes: number}} opts the clock, whether the
 *   `workers` write group acts (else each send is a would-do line), the sessions githerd may
 *   message, the transport, and how often to ask (`workers.statusMinutes`)
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function statusStep(state, { now, acting, sessions, transport, minutes }) {
    const lines = [];
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a question is due */
    let live = null;
    for (const job of Object.values(state.jobs ?? {})) {
        const session = job.holder?.session;
        if (!ownerHeld(job) || job.kept || !session || !ASKED.has(job.state)) continue;
        const ask = job.statusAsk;
        // A cadence, how often to ask: never a deadline on the work.
        const since = Date.parse(ask?.at ?? job.claim?.at ?? job.stateSince);
        if (now.getTime() - since < minutes * MINUTE) continue;
        if (ask?.heard && !(job.status?.at >= ask.at)) {
            const reason = `no answer to the status question of ${ask.at}`;
            releaseOwnerJob(job, reason, now);
            lines.push({ kind: "claim-released", job: job.id, session, reason });
            continue;
        }
        live ??= sessions();
        const target = live.filter((s) => s.sessionId === session);
        if (!target.length) continue;
        if (!acting) {
            const op = `ask ${target[0].name} for the status of ${job.id}`;
            lines.push({ kind: "would-do", group: "workers", op, job: job.id });
        }
        const out = acting ? await tellSessions(target, statusText(job, minutes), transport) : { sent: [], failed: [] };
        job.statusAsk = { at: now.toISOString(), heard: out.sent.length > 0 };
        lines.push({ kind: "status-asked", job: job.id, session: target[0].name, ...out });
    }
    return lines;
}

/**
 * Tells each owner session that held a job the reconcile cancelled (its cause ended: the incident
 * ended, the pull request closed or needs no work, the issue closed) that the job is gone, through
 * the same messaging as the status question: one message to that session only, none to a session
 * githerd may not message (`workers.sessions`), and a would-do line in dry-run. A githerd worker
 * reads the job's news instead.
 * @param {{job: string, reason: string, session?: string | null, startedBy?: string | null}[]} cancelled
 *   the jobs syncJobs cancelled
 * @param {{acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport}} opts whether the `workers` write group acts, the
 *   sessions githerd may message, and the transport
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function tellCancelled(cancelled, { acting, sessions, transport }) {
    const lines = [];
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a holder is told */
    let live = null;
    for (const c of cancelled) {
        if (c.startedBy !== "owner" || !c.session) continue;
        live ??= sessions();
        const target = live.filter((s) => s.sessionId === c.session);
        if (!target.length) continue;
        if (!acting) {
            const op = `tell ${target[0].name} that ${c.job} was cancelled`;
            lines.push({ kind: "would-do", group: "workers", op, job: c.job });
            continue;
        }
        const text =
            `githerd: job ${c.job}, which this session holds, was cancelled: ${c.reason}. ` +
            "Nothing is left to do on it; stop its work and do not call githerd_done or githerd_expect for it.";
        const out = await tellSessions(target, text, transport);
        lines.push({ kind: "cancel-told", job: c.job, session: target[0].name, ...out });
    }
    return lines;
}
