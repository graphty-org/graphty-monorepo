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
 * it is neither offered nor asked about. Nor is a pull request with an inferred owner
 * (`state.prInferred`, owners.mjs): the session that last pushed it, or works in its worktree.
 *
 * The same messaging asks each owner session holding a job for its status (`statusStep`), asks the
 * owner of a broken pull request whether it is fixing it (`brokenOwned`), and invites idle sessions
 * to pull work (`inviteStep`).
 */

import { askProblems, failingRequired, headIsGitherds, jobInUse, jobOnPr, prOf, prWork } from "./queue.mjs";
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
    if (
        !rec ||
        asked ||
        state.prOwners?.[n] ||
        state.prInferred?.[n] ||
        headIsGitherds(state, rec) ||
        jobOnPr(state, n)
    )
        return null;
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
 * queued while every session is busy is announced when one goes idle. A session is invited only to
 * a job it could claim (`jobInUse` with that session, the rule githerd_next and githerd_claim
 * apply), so a review is never announced to the pull request's author. The last invitation is kept
 * in `state.invited` for the board.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, offered: {job: string, reason: string}[],
 *   config?: any}} opts the clock, whether the `workers` write group acts (else each send is a
 *   would-do line), the live sessions in this repository, the transport, the queued jobs githerd
 *   would offer, in order, and the config
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function inviteStep(state, { now, acting, sessions, transport, offered, config }) {
    const lines = [];
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when an invitation is due */
    let idle = null;
    for (const { job: id, reason } of offered) {
        const job = state.jobs?.[id];
        if (job?.state !== "queued" || job.invitedAt) continue;
        idle ??= sessions().filter((s) => s.status === "idle");
        if (!idle.length) break;
        const able = idle.filter((s) => !jobInUse(state, job, { config, now, session: s.sessionId }));
        if (!able.length) continue;
        const names = able.map((s) => s.name);
        job.invitedAt = now.toISOString();
        if (!acting) {
            const op = `invite ${names.length} idle session(s) to take ${id}`;
            lines.push({ kind: "would-do", group: "workers", op, job: id });
        }
        const out = acting ? await tellSessions(able, inviteText(id, reason), transport) : { sent: [], failed: [] };
        state.invited = { at: job.invitedAt, count: acting ? out.sent.length : names.length, acting };
        lines.push({ kind: "sessions-invited", job: id, sessions: names, ...out });
    }
    return lines;
}

/**
 * The status question for the jobs one session holds: one line per job.
 * @param {any[]} jobs the jobs, each due an answer
 * @param {number} minutes how often githerd asks
 * @returns {string} the message
 */
function statusText(jobs, minutes) {
    return (
        "githerd: status check on the jobs this session holds:\n" +
        jobs.map((j) => `- ${j.id} (${j.target})\n`).join("") +
        "Answer by calling githerd_expect once per listed job, with job set to its id, reason set to one line on " +
        "where it stands, and minutes set to how long until your current step ends. " +
        `A listed job still unanswered when githerd asks again in ${minutes} minutes goes back to the queue. ` +
        "Do the jobs' work in background subagents or workflows, so this conversation stays free to answer githerd."
    );
}

/**
 * Why an owned pull request is broken and nobody works on it, or null: a failing required check
 * other than the owner's visual review, or a conflict with its base seen twice, on a pull request
 * that would be a `pr` job (`prWork`) with no job in flight on it.
 * @param {any} state the daemon state
 * @param {string} n the pull request
 * @param {any} rec its record
 * @returns {string | null} why
 */
function broken(state, n, rec) {
    if (!prWork(n, rec, state) || jobOnPr(state, n) || headIsGitherds(state, rec)) return null;
    const failing = rec.ownerGate ? [] : failingRequired(rec);
    if (failing.length) return `required check failing: ${failing.join(", ")}`;
    return (rec.conflictSightings ?? 0) >= 2 ? `conflicting with ${rec.baseRef ?? "its base"}` : null;
}

/**
 * Whether the owner answered the question about pull request `n`: `githerd_mine` for it, or
 * `githerd_expect` on a job on it, by the asked session since the question.
 * @param {any} state the daemon state
 * @param {string} n the pull request
 * @param {{session: string, at: string}} ask the question
 * @returns {boolean} it answered
 */
function brokenAnswered(state, n, ask) {
    const mine = state.prOwners?.[n];
    if (mine?.session === ask.session && mine.at >= ask.at) return true;
    return Object.values(state.jobs ?? {}).some(
        (j) => String(prOf(j)) === n && j.holder?.session === ask.session && j.status?.at >= ask.at,
    );
}

/**
 * The broken pull requests whose owner (`state.prOwners`, else `state.prInferred`) is due the
 * question "are you fixing it?" (the owner's rule of 2026-10-05: owning is not working). Every
 * `minutes` per pull request, `state.brokenAsks[<pr>]` = `{head, session, at, heard}`. A question
 * the owner heard and left unanswered until the next is due, or an owner githerd cannot reach,
 * releases the pull request from its ownership until a new push (`state.prReleased[<pr>]` = the
 * head, read by `prInUse`), and its `pr` job is offered as usual.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, minutes: number, owners: () => import("./peers.mjs").PeerSession[]}} opts the
 *   clock, the cadence and every live session in this repository
 * @param {({kind: string} & Record<string, unknown>)[]} lines the ledger lines, appended to
 * @returns {Map<string, {n: string, why: string}[]>} the pull requests to ask about, by session
 */
function brokenOwned(state, { now, minutes, owners }, lines) {
    state.brokenAsks ??= {};
    state.prReleased ??= {};
    for (const [n, head] of Object.entries(state.prReleased)) {
        if (state.prs?.[n]?.headSha !== head) delete state.prReleased[n];
    }
    /** @type {Map<string, {n: string, why: string}[]>} */
    const due = new Map();
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a question is due */
    let live = null;
    for (const [n, rec] of Object.entries(state.prs ?? {})) {
        // A session that says it is its own after the release owns it again.
        if (state.prOwners?.[n]) delete state.prReleased[n];
        const owner = state.prOwners?.[n] ?? state.prInferred?.[n];
        const why = owner && state.prReleased[n] !== rec.headSha ? broken(state, n, rec) : null;
        if (!why) {
            delete state.brokenAsks[n];
            continue;
        }
        const ask = state.brokenAsks[n];
        const same = ask?.head === rec.headSha && ask.session === owner.session;
        // A cadence, how often to ask: never a deadline on the work.
        if (same && now.getTime() - Date.parse(ask.at) < minutes * MINUTE) continue;
        live ??= owners();
        const gone = !live.some((s) => s.sessionId === owner.session);
        if (gone || (same && ask.heard && !brokenAnswered(state, n, ask))) {
            const reason = gone ? "githerd cannot ask its owner" : `no answer to the question of ${ask.at}`;
            state.prReleased[n] = rec.headSha;
            delete state.brokenAsks[n];
            if (state.prOwners?.[n]?.session === owner.session) delete state.prOwners[n];
            lines.push({ kind: "pr-released", pr: Number(n), head: rec.headSha, session: owner.session, reason });
            continue;
        }
        due.set(owner.session, [...(due.get(owner.session) ?? []), { n, why }]);
    }
    return due;
}

/**
 * The question to the owner of a broken pull request.
 * @param {{n: string, why: string}} pr the pull request and why it is broken
 * @returns {string} the message line
 */
const brokenText = ({ n, why }) =>
    `githerd: #${n} is broken: ${why}. Are you fixing it? ` +
    `Answer with githerd_mine pr ${n} to keep it, or ignore to release it to other sessions.`;

/** The states in which a holder works on its job; a `verifying` job is githerd's to settle. */
const ASKED = new Set(["starting", "working", "waiting"]);

/**
 * Whether the holder has nothing to do but wait on something githerd itself watches, so it is not
 * asked: a `blocked` job (its blocker's end is settleWaits'), a `parked` one (the owner's answer),
 * and a `waiting` one on checks, a lane, a release, a job or GitHub. A wait on the session's own
 * local task is still asked about.
 * @param {any} job the job
 * @returns {boolean} githerd is the one watching
 */
function githerdWatches(job) {
    return job.state === "blocked" || job.state === "parked" || (job.state === "waiting" && !job.waitingFor?.local);
}

/**
 * Asks each owner session holding jobs where they stand (the owner's rule of 2026-10-05): every
 * `minutes` from a job's claim, one message per session through Claude Code's session messaging,
 * listing every job of that session that is due. The session answers with `githerd_expect` once
 * per job, which records `job.status`. A job whose listed question the session heard and left
 * unanswered until the next one is due goes back to the queue; jobs it answered are kept. Nothing
 * else here ends a claim, and elapsed time alone never does. A job githerd itself is watching for
 * (blocked, parked, or waiting on something but a local task) is not asked about, and any question
 * it had pending is dropped, so it is never released for silence. A session githerd may not
 * message (`workers.sessions`) is not asked, so its silence is never held against it; nor is a
 * question nobody heard (dry-run, or a send that failed). githerd's own workers have the watchdog
 * instead. The same message asks the owner of each broken pull request whether it is fixing it
 * (`brokenOwned`), whoever that owner is: it asks about the session's own pull request, so
 * `workers.sessions` does not apply.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, minutes: number,
 *   owners?: () => import("./peers.mjs").PeerSession[]}} opts the clock, whether the `workers`
 *   write group acts (else each send is a would-do line), the sessions githerd may message, the
 *   transport, how often to ask (`workers.statusMinutes`), and every live session in this
 *   repository (`sessions` when absent)
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function statusStep(state, { now, acting, sessions, transport, minutes, owners = sessions }) {
    const lines = [];
    /** @type {Map<string, any[]>} the due jobs of each holding session */
    const due = new Map();
    for (const job of Object.values(state.jobs ?? {})) {
        const session = job.holder?.session;
        if (!ownerHeld(job) || job.kept || !session) continue;
        if (githerdWatches(job)) {
            job.statusAsk = null;
            continue;
        }
        if (!ASKED.has(job.state)) continue;
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
        due.set(session, [...(due.get(session) ?? []), job]);
    }
    const prsDue = brokenOwned(state, { now, minutes, owners }, lines);
    if (!due.size && !prsDue.size) return lines;
    const live = due.size ? sessions() : [];
    const everyone = prsDue.size ? owners() : [];
    for (const session of new Set([...due.keys(), ...prsDue.keys()])) {
        const jobTarget = live.filter((s) => s.sessionId === session);
        const jobs = jobTarget.length ? (due.get(session) ?? []) : [];
        const prs = prsDue.get(session) ?? [];
        const target = jobTarget.length ? jobTarget : everyone.filter((s) => s.sessionId === session);
        if (!target.length || (!jobs.length && !prs.length)) continue;
        const ids = jobs.map((j) => j.id);
        const nums = prs.map((p) => Number(p.n));
        if (!acting) {
            const what = [...(ids.length ? [`the status of ${ids.join(", ")}`] : []), ...nums.map((p) => `#${p}`)];
            const op = `ask ${target[0].name} for ${what.join(", ")}`;
            lines.push({ kind: "would-do", group: "workers", op, jobs: ids });
        }
        const text = [...(jobs.length ? [statusText(jobs, minutes)] : []), ...prs.map(brokenText)].join("\n");
        const out = acting ? await tellSessions(target, text, transport) : { sent: [], failed: [] };
        const ask = { at: now.toISOString(), heard: out.sent.length > 0 };
        for (const job of jobs) job.statusAsk = { ...ask };
        for (const p of prs) state.brokenAsks[p.n] = { head: state.prs[p.n].headSha, session, ...ask };
        lines.push({
            kind: "status-asked",
            jobs: ids,
            ...(nums.length ? { prs: nums } : {}),
            session: target[0].name,
            ...out,
        });
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
