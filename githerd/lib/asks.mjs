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
 * A session without githerd's tools answers from its shell instead: `githerd mine <pr>` and
 * `githerd disown <pr>` act for the session the command runs under (owners.mjs callingSession), as
 * `markMine` and `disown` here. A disown is kept in `state.prDisowned[<pr>]` = `{session, name, at}`
 * until the pull request closes or that session says it is its own again (`mine`, or claiming its
 * job); inference skips that session for every push before it.
 *
 * The same messaging asks each owner session holding a job for its status and whether it can take
 * another job (`statusStep`), asks the owner of a broken pull request whether it is fixing it
 * (`brokenOwned`), and invites sessions with room to pull work (`inviteStep`).
 */

import { askFor, askProblems, failingRequired, headIsGitherds, jobInUse, jobOnPr, prOf, prWork } from "./queue.mjs";
import { ownerHeld } from "./board.mjs";
import { releaseOwnerJob } from "./jobs.mjs";
import { tellSessions } from "./peers.mjs";
import { jobWaits } from "./waits.mjs";

const MINUTE = 60 * 1000;

/** The command line a session without githerd's tools answers with, when the daemon names none. */
const DEFAULT_CLI = "githerd";

/**
 * Records that a session is working on pull request `n` (`githerd_mine`, or `githerd mine <pr>` run
 * from inside that session): the answer to githerd's question, and the durable owner record. It
 * ends a disown by the same session.
 * @param {any} state the daemon state, changed in place
 * @param {string | number} n the pull request, open
 * @param {{session: string, name: string, at: string, by: string}} who the session, its name, the
 *   time and how it said so
 * @returns {string | null} why it was refused (another session said so first), or null when recorded
 */
export function markMine(state, n, { session, name, at, by }) {
    const pr = String(n);
    const rec = state.prs[pr];
    state.asks ??= {};
    const ask = askFor(state, pr) ?? (state.asks[pr] = { head: rec.headSha, sessions: [] });
    if (ask.owner && ask.owner.session !== session) {
        return `session ${ask.owner.name} already said #${pr} is its`;
    }
    const held = state.prOwners?.[pr];
    if (held && held.session !== session) return `session ${held.name} owns #${pr}`;
    ask.owner = { session, name, at };
    // The durable record: a new push keeps it, the session's end or the close drops it.
    state.prOwners ??= {};
    state.prOwners[pr] = { session, name, at, by };
    if (state.prDisowned?.[pr]?.session === session) delete state.prDisowned[pr];
    return null;
}

/**
 * A session gives up pull request `n` now (`githerd disown <pr>` run from inside it): its owner
 * record, its answer to githerd's question and its inferred ownership end, and inference does not
 * give it back from a push made before now. Only what is that session's changes.
 * @param {any} state the daemon state, changed in place
 * @param {string | number} n the pull request, open
 * @param {{session: string, name: string, at: string}} who the session, its name and the time
 * @returns {string[]} what it gave up, empty when it held nothing
 */
export function disown(state, n, { session, name, at }) {
    const pr = String(n);
    const gave = [];
    if (state.prOwners?.[pr]?.session === session) {
        delete state.prOwners[pr];
        gave.push("its owner record");
    }
    if (state.asks?.[pr]?.owner?.session === session) state.asks[pr].owner = null;
    if (state.prInferred?.[pr]?.session === session) {
        gave.push(`its inferred ownership (${state.prInferred[pr].evidence})`);
        delete state.prInferred[pr];
    }
    if (state.brokenAsks?.[pr]?.session === session) delete state.brokenAsks[pr];
    state.prDisowned ??= {};
    state.prDisowned[pr] = { session, name, at };
    return gave;
}

/**
 * Carries what a session said about a pull request's head over a head githerd itself made: its
 * update merged master into the branch (upkeep.mjs, recorded as `state.githerdMoves[<pr>]` = the
 * head before), which is githerd's merge, not new work. Once the new head is polled and githerd or
 * GitHub made it (`headIsGitherds`), the answer to githerd's question (`githerd_mine`), the answer
 * about a broken pull request and a release move to it. A head someone else pushed meanwhile
 * carries nothing. Claims and owner records do not hang on the head and need no carrying.
 * @param {any} state the daemon state, changed in place
 * @returns {({kind: string} & Record<string, unknown>)[]} the ledger lines
 */
export function carryGitherdMoves(state) {
    const lines = [];
    for (const [n, from] of Object.entries(state.githerdMoves ?? {})) {
        const rec = state.prs?.[n];
        if (rec?.headSha === from) continue;
        delete state.githerdMoves[n];
        if (!rec || !headIsGitherds(state, rec)) continue;
        if (state.asks?.[n]?.head === from) state.asks[n].head = rec.headSha;
        if (state.brokenAsks?.[n]?.head === from) state.brokenAsks[n].head = rec.headSha;
        if (state.prReleased?.[n] === from) state.prReleased[n] = rec.headSha;
        lines.push({ kind: "pr-owner-carried", pr: Number(n), from, head: rec.headSha });
    }
    return lines;
}

/**
 * Drops each disown whose pull request closed, or whose session claimed a job on it since.
 * @param {any} state the daemon state, changed in place
 */
function settleDisowned(state) {
    for (const [n, d] of Object.entries(state.prDisowned ?? {})) {
        const claimed = Object.values(state.jobs ?? {}).some(
            (j) => String(prOf(j)) === n && j.claim?.session === d.session && j.claim.at > d.at,
        );
        if ((state.prs && !state.prs[n]) || claimed) delete state.prDisowned[n];
    }
}

/**
 * The question for one pull request.
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {string[]} failing its failing required checks
 * @param {string} job the job githerd would offer
 * @param {string} cli the githerd command line a session without githerd's tools runs
 * @returns {string} the message
 */
function askText(n, rec, failing, job, cli) {
    const at = `#${n} (${rec.headRef}) at ${String(rec.headSha).slice(0, 7)}`;
    const checks = failingRequired(rec);
    const what = checks.length ? `CI failed on ${at}: ${checks.join(", ")}.` : `${at} ${failing.join(", ")}.`;
    return (
        `githerd: ${what} ` +
        `If you are working on it, call the githerd_mine tool with pr ${n} (or claim job ${job} with githerd_claim); ` +
        `a session without githerd's tools runs \`${cli} mine ${n}\` instead. Otherwise ignore this.`
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
function settleOwners(state, sessionGone) {
    const lines = [];
    for (const [n, rec] of Object.entries(state.prOwners ?? {})) {
        let reason = null;
        if (state.prs && !state.prs[n]) reason = "closed";
        else if (sessionGone(rec.session)) reason = "session ended";
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
 *   transport: import("./peers.mjs").Transport, sessionGone: (session: string) => boolean,
 *   cli?: string}} opts the clock, whether the `workers` write group acts (else each send is a
 *   would-do line), the live sessions in this repository, the transport, whether a session ended,
 *   and the githerd command line a session without githerd's tools answers with
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function askStep(state, { now, acting, sessions, transport, sessionGone, cli = DEFAULT_CLI }) {
    state.asks ??= {};
    const lines = [...settleOwners(state, sessionGone), ...settleAsks(state, sessionGone)];
    settleDisowned(state);
    for (const session of Object.keys(state.capacity ?? {})) if (sessionGone(session)) delete state.capacity[session];
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a question is due */
    let live = null;
    for (const job of Object.values(state.jobs ?? {})) {
        const q = questionFor(state, job, acting);
        if (!q) continue;
        live ??= sessions();
        const names = live.map((s) => s.name);
        const out = acting
            ? await tellSessions(live, askText(q.n, q.rec, q.failing, job.id, cli), transport)
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
 * @param {any} job the job record
 * @param {string} reason its one-line reason from the queue order
 * @returns {string} the message
 */
function inviteText(job, reason) {
    // A verdict job names the exact failure key githerd_verdict takes.
    const key = job.facts?.scope === "verdict" ? ` githerd_verdict takes its key exactly: ${job.target}.` : "";
    return (
        `githerd has work queued (${job.id}, ${reason}). If you're free, call githerd_next and claim a job; ` +
        `otherwise ignore this.${key}`
    );
}

/**
 * When a capacity answer went stale, or null while it holds: the latest end (done, released,
 * cancelled) of a job the session held when it answered (`said.held`, recorded by githerd_expect;
 * for an older answer without it, the jobs it had claimed by then), when that end came after the
 * answer. The answer counted those jobs, so it no longer says what the session can take.
 * @param {any} state the daemon state
 * @param {string} session the session id
 * @param {{at: string, held?: string[]}} said its last capacity answer
 * @returns {string | null} when it went stale
 */
function staleSince(state, session, said) {
    const jobs = state.jobs ?? {};
    const held =
        said.held ??
        Object.values(jobs)
            .filter((j) => j.claim?.session === session && j.claim.at <= said.at)
            .map((j) => j.id);
    let since = null;
    for (const id of held) {
        const j = jobs[id];
        if (j?.holder?.session === session) continue;
        const end = j?.stateSince ?? said.at;
        if (end >= said.at && (!since || end > since)) since = end;
    }
    return since;
}

/**
 * How many more jobs a session can take now: its last `capacity` answer to the status question
 * (`state.capacity[session]`, recorded by githerd_expect), less the jobs it claimed since. An
 * answer gone stale (`staleSince`) counts as room for one from when it went stale, so the
 * session is invited once and its claim or its next answer governs. Null when it never answered.
 * @param {any} state the daemon state
 * @param {string} session the session id
 * @returns {number | null} the room left
 */
function room(state, session) {
    const said = state.capacity?.[session];
    if (!said) return null;
    const stale = staleSince(state, session, said);
    const from = stale ?? said.at;
    const claimed = Object.values(state.jobs ?? {}).filter(
        (j) => j.claim?.session === session && j.claim.at >= from,
    ).length;
    return (stale ? 1 : said.n) - claimed;
}

/** Job states a session is actively working in; a `waiting` job counts only while it waits on the session's own task. */
const ACTIVE = new Set(["working", "starting"]);
const DEFAULT_MAX_ACTIVE = 3;
/** The capacity rule as sessions read it, in the status question and in the claim refusal alike. */
const NOT_COUNTED = "Jobs that are only waiting to push or for CI do not count toward your capacity";

/**
 * Why a session may take no more jobs now, or null: it holds `workers.maxActive` jobs it is
 * actively working (working, starting, or waiting on its own local task). Blocked, parked,
 * verifying and other waiting jobs do not count, nor does a job only waiting to push or for CI
 * (`jobWaits` in waits.mjs). Applies whatever capacity the session reported.
 * @param {any} state the daemon state
 * @param {string} session the session id
 * @param {any} [config] the normalized config
 * @returns {string | null} the reason
 */
export function atActiveCap(state, session, config) {
    const max = config?.workers?.maxActive ?? DEFAULT_MAX_ACTIVE;
    const waits = jobWaits(state);
    const active = Object.values(state.jobs ?? {}).filter(
        (j) =>
            j.holder?.session === session &&
            !waits.has(j.id) &&
            (ACTIVE.has(j.state) || (j.state === "waiting" && j.waitingFor?.local)),
    ).length;
    return active >= max ? `you hold ${active} active jobs; finish or report one first. ${NOT_COUNTED}.` : null;
}

/**
 * A session's room as invitations see it, recorded in `state.inviteRooms[session]` =
 * `{room, at, said}`: the room it reported (its capacity answer less claims, `room`, at least 1
 * while it is idle in the registry), when that room last rose from 0 or from fewer than the jobs
 * queued for it to more (`at`, empty while it never did), and the capacity answer last read
 * (`said`). A new capacity answer replaces the room; the session going busy without one does not
 * lower it, so a session's turns ending and starting never read as fresh room.
 * @param {any} state the daemon state, changed in place
 * @param {import("./peers.mjs").PeerSession} s the session
 * @param {number} able how many queued jobs it could claim
 * @param {Date} now the clock
 * @returns {{free: boolean, at: string}} whether it has room now, and since when its room rose
 */
function inviteRoom(state, s, able, now) {
    const cur = Math.max(room(state, s.sessionId) ?? 0, 0);
    const idle = s.status === "idle";
    const eff = idle ? Math.max(cur, 1) : cur;
    const said = state.capacity?.[s.sessionId]?.at ?? null;
    const rec = state.inviteRooms[s.sessionId] ?? { room: 0, at: "", said: null };
    let next = rec;
    if (eff > rec.room) next = { room: eff, at: rec.room < able ? now.toISOString() : rec.at, said };
    else if (said !== rec.said) next = { ...rec, room: idle ? rec.room : eff, said };
    state.inviteRooms[s.sessionId] = next;
    return { free: eff > 0, at: next.at };
}

/**
 * The sessions due an invitation to each queued job: those with room (`inviteRoom`) that could
 * claim it and have not heard it since their room last rose.
 * @param {any} state the daemon state, changed in place
 * @param {{job: string}[]} queue the queued jobs githerd would offer
 * @param {import("./peers.mjs").PeerSession[]} live the sessions githerd may invite
 * @param {{config?: any, now: Date}} opts the config and the clock
 * @returns {Map<string, import("./peers.mjs").PeerSession[]>} the sessions due, by job
 */
function dueInvites(state, queue, live, { config, now }) {
    /** @type {Map<string, import("./peers.mjs").PeerSession[]>} */
    const due = new Map();
    for (const s of live) {
        const able = queue.filter(
            ({ job }) => !jobInUse(state, state.jobs[job], { config, now, session: s.sessionId }),
        );
        const { free, at } = inviteRoom(state, s, able.length, now);
        if (!free || atActiveCap(state, s.sessionId, config)) continue;
        for (const { job: id } of able) {
            const job = state.jobs[id];
            const heard = job.invited?.[s.sessionId] ?? job.invitedAt;
            if (heard === undefined || heard < at) due.set(id, [...(due.get(id) ?? []), s]);
        }
    }
    return due;
}

/**
 * Invites the Claude sessions in this repository that have room to pull work (the owner's
 * decisions of 2026-10-05): every pass, each queued job no worker slot took is announced to every
 * session whose registry status is `idle` or whose last capacity answer leaves room (`room`) and
 * that has not heard it since its room last rose (`inviteRoom`); never one at `workers.maxActive`
 * (`atActiveCap`). So a session that heard a job and
 * did not take it hears it again only after reporting more room: a capacity answer above its last,
 * or going idle after reporting none. Who heard which job is kept on the job, `job.invited` =
 * `{[session]: at}` (a job's older `invitedAt` counts as heard by every session). githerd's own
 * workers are never among them (`liveSessions` leaves them out). A session is invited only to a job
 * it could claim (`jobInUse` with that session, the rule githerd_next and githerd_claim apply), so a
 * review is never announced to the pull request's author. The last invitation is kept in
 * `state.invited` for the board.
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
    const queue = offered.filter(({ job }) => state.jobs?.[job]?.state === "queued");
    if (!queue.length) return lines;
    const live = sessions();
    state.inviteRooms ??= {};
    for (const id of Object.keys(state.inviteRooms)) {
        if (!live.some((s) => s.sessionId === id)) delete state.inviteRooms[id];
    }
    const due = dueInvites(state, queue, live, { config, now });
    for (const { job: id, reason } of queue) {
        const to = due.get(id);
        if (!to) continue;
        const job = state.jobs[id];
        const names = to.map((s) => s.name);
        const at = now.toISOString();
        job.invited ??= {};
        for (const s of to) job.invited[s.sessionId] = at;
        if (!acting) {
            const op = `invite ${names.length} idle session(s) to take ${id}`;
            lines.push({ kind: "would-do", group: "workers", op, job: id });
        }
        const out = acting ? await tellSessions(to, inviteText(job, reason), transport) : { sent: [], failed: [] };
        state.invited = { at, count: acting ? out.sent.length : names.length, acting };
        lines.push({ kind: "sessions-invited", job: id, sessions: names, ...out });
    }
    return lines;
}

/**
 * The jobs blocked on job `id`, directly or through a chain of waits (`waitingFor.job`).
 * @param {any} state the daemon state
 * @param {string} id the job
 * @returns {any[]} the waiting jobs
 */
function waitersOf(state, id) {
    return Object.values(state.jobs ?? {}).filter((j) => {
        if (j.state !== "blocked") return false;
        const seen = new Set();
        for (let on = j.waitingFor?.job; on && !seen.has(on); on = state.jobs?.[on]?.waitingFor?.job) {
            if (on === id) return true;
            seen.add(on);
        }
        return false;
    });
}

/**
 * The line that tells a holder which jobs wait on its job, and how to let them start when what is
 * left waits on something held (a hold label, a breaking pull request held for a grouped major, a
 * needs-decision issue): Claude judges whether it does; githerd never splits a job itself.
 * @param {any} state the daemon state
 * @param {any} job the held job
 * @returns {string} the line, empty when nothing waits on it
 */
function waitersLine(state, job) {
    const names = waitersOf(state, job.id).map((w) => String(w.target ?? w.id));
    if (!names.length) return "";
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
    return (
        `  ${list} wait${names.length > 1 ? "" : "s"} on this job. If what remains waits on something held, ` +
        "report it split (file the remainder as its own issue) so they can start.\n"
    );
}

/**
 * The status question for the jobs one session holds: one line per job, and for a job others wait
 * on, the line naming them (`waitersLine`).
 * @param {any} state the daemon state
 * @param {any[]} jobs the jobs, each due an answer
 * @param {number} minutes how often githerd asks
 * @returns {string} the message
 */
function statusText(state, jobs, minutes) {
    return (
        "githerd: status check on the jobs this session holds:\n" +
        jobs.map((j) => `- ${j.id} (${j.target})\n${waitersLine(state, j)}`).join("") +
        "Answer by calling githerd_expect once per listed job, with job set to its id, reason set to one line on " +
        "where it stands. " +
        "Can you take another job? Answer that with capacity set, in those githerd_expect calls, to how many further " +
        "jobs this session can take now (0 if none); githerd invites a session with room to queued work even while it is busy. " +
        `${NOT_COUNTED}: count only jobs you are actively ` +
        "working when you answer capacity. " +
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
    // A head githerd or GitHub made (an update-branch merge) breaks a pull request as much as any:
    // skipping it left a stale push holding a broken pull request with nobody asked.
    if (!prWork(n, rec, state) || jobOnPr(state, n)) return null;
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
 * The broken (stuck) pull requests whose owner (`state.prOwners`, else `state.prInferred`) is due
 * the question "are you fixing it?" (the owner's rules of 2026-10-05 and 2026-10-07: owning is not
 * working, and every stuck pull request keeps moving). Every `minutes` per pull request,
 * `state.brokenAsks[<pr>]` = `{head, session, why, at, heard}`. Only an explicit claim
 * (`githerd_mine`, or `githerd_expect` on a job on it) since the question, or a push of the branch
 * since it, keeps it; an old push or a shell sitting in its worktree does not. A question the owner
 * heard and then answered githerd about something else without claiming it, or left unanswered until
 * the next is due, or an owner githerd cannot reach, releases the pull request from its ownership
 * until a new push (`state.prReleased[<pr>]` = the head, read by `prInUse`; a head githerd or GitHub
 * made keeps it), and its `pr` job is offered as usual. The question goes out once per head and
 * reason; once claimed, the pull request is asked the status question each `minutes` instead, like
 * a held job, and only no answer to that, a gone owner or a disown releases it. While a push of its
 * branch waits or runs in the push queue (`state.pushTickets`) it is not asked about at all.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, minutes: number, owners: () => import("./peers.mjs").PeerSession[]}} opts the
 *   clock, the cadence and every live session in this repository
 * @param {({kind: string} & Record<string, unknown>)[]} lines the ledger lines, appended to
 * @returns {Map<string, {n: string, why: string, noTools?: boolean, claimed?: boolean}[]>} the pull requests to ask
 *   about, by session
 */
function brokenOwned(state, { now, minutes, owners }, lines) {
    state.brokenAsks ??= {};
    state.prReleased ??= {};
    for (const [n, head] of Object.entries(state.prReleased)) {
        const rec = state.prs?.[n];
        if (rec?.headSha === head) continue;
        // githerd's or GitHub's merge of the base is nobody's new work: the release stands.
        if (rec?.headSha && headIsGitherds(state, rec)) state.prReleased[n] = rec.headSha;
        else delete state.prReleased[n];
    }
    /** @type {Map<string, {n: string, why: string, noTools?: boolean, claimed?: boolean}[]>} */
    const due = new Map();
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a question is due */
    let live = null;
    const liveOwners = () => {
        live ??= owners();
        return live;
    };
    for (const [n, rec] of Object.entries(state.prs ?? {})) {
        const ask = brokenAskDue(state, n, rec, { now, minutes, live: liveOwners }, lines);
        if (ask)
            due.set(ask.session, [
                ...(due.get(ask.session) ?? []),
                { n, why: ask.why, noTools: ask.noTools, claimed: ask.claimed },
            ]);
    }
    return due;
}

/**
 * The owner of broken pull request `n` and why it is broken, or null when it has no owner, is
 * released at this head or is not broken (its pending question is then dropped).
 * @param {any} state the daemon state, changed in place
 * @param {string} n the pull request
 * @param {any} rec its record
 * @returns {{owner: any, why: string} | null} its owner and why
 */
function brokenOwner(state, n, rec) {
    // A session that says it is its own after the release owns it again.
    if (state.prOwners?.[n]) delete state.prReleased[n];
    // An owner without githerd's tools is asked like any other: it answers from its shell.
    const owner = state.prOwners?.[n] ?? state.prInferred?.[n];
    const why = owner && state.prReleased[n] !== rec.headSha ? broken(state, n, rec) : null;
    if (!why) {
        delete state.brokenAsks[n];
        return null;
    }
    return { owner, why };
}

/**
 * Whether the owner of pull request `n` is due the question "are you fixing it?": null when it is
 * not broken, was asked within `minutes`, or is released here (its owner is gone, or heard the
 * last question and left it unanswered).
 * @param {any} state the daemon state, changed in place
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {{now: Date, minutes: number, live: () => import("./peers.mjs").PeerSession[]}} opts the
 *   clock, the cadence and every live session in this repository
 * @param {({kind: string} & Record<string, unknown>)[]} lines the ledger lines, appended to
 * @returns {{session: string, why: string, noTools?: boolean, claimed?: boolean} | null} the session
 *   to ask, why, whether it has no githerd tools, and whether it claimed it (the status question)
 */
function brokenAskDue(state, n, rec, { now, minutes, live }, lines) {
    const found = brokenOwner(state, n, rec);
    if (!found) return null;
    const { owner, why } = found;
    const ask = state.brokenAsks[n];
    // Only waiting to push: githerd watches the push queue, so nothing is asked and silence is not held against it.
    if (pushWaiting(state, n, rec)) {
        if (ask) ask.heard = false;
        return null;
    }
    const { same, claimed, declined } = episode(state, n, rec, owner, why);
    // A cadence, how often to ask: never a deadline on the work.
    if (!declined && same && now.getTime() - Date.parse(ask.at) < minutes * MINUTE) return null;
    const gone = !live().some((s) => s.sessionId === owner.session);
    // A push since the question counts as the answer for this cycle: a session without githerd's tools cannot say so.
    const active = !gone && activity(state, n, rec, owner, ask);
    if (active) {
        state.brokenAsks[n] = {
            head: rec.headSha,
            session: owner.session,
            why,
            at: now.toISOString(),
            heard: false,
            active,
            claimed,
        };
        return null;
    }
    if (gone || (same && ask.heard && !brokenAnswered(state, n, ask))) {
        lines.push(releaseBroken(state, n, rec, owner.session, gone ? "githerd cannot ask its owner" : silence(ask)));
        return null;
    }
    return {
        session: owner.session,
        why,
        ...(owner.noTools ? { noTools: true } : {}),
        claimed,
    };
}

/**
 * Where the stuck episode of pull request `n` stands against its last question: the same head,
 * owner and reason (`same`; anything else is a new question, asked at once), claimed since the
 * stuck question (then it is asked the status question like a held job), or declined: its owner
 * answered githerd about something else without claiming it, which releases it at once.
 * @param {any} state the daemon state
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {{session: string}} owner its owner
 * @param {string} why why it is stuck
 * @returns {{same: boolean, claimed: boolean, declined: boolean}} the episode
 */
function episode(state, n, rec, owner, why) {
    const ask = state.brokenAsks[n];
    const same = ask?.head === rec.headSha && ask.session === owner.session && ask.why === why;
    if (!same) return { same, claimed: false, declined: false };
    const answered = brokenAnswered(state, n, ask);
    const claimed = Boolean(ask.claimed) || answered;
    const declined = !claimed && ask.heard && answeredSince(state, owner.session, ask.at);
    return { same, claimed, declined };
}

/**
 * Why a heard question about a stuck pull request released it: no claim in answer to the stuck
 * question, or no answer to the status question once claimed.
 * @param {{at: string, claimed?: boolean}} ask the question
 * @returns {string} the reason
 */
const silence = (ask) =>
    `${ask.claimed ? "no answer to the status question" : "no claim in answer to the question"} of ${ask.at}`;

/**
 * Releases stuck pull request `n` from its owner at this head: its question and the owner's
 * record are dropped, and its `pr` job is offered.
 * @param {any} state the daemon state, changed in place
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {string} session the owner's session
 * @param {string} reason why
 * @returns {{kind: string} & Record<string, unknown>} the ledger line
 */
function releaseBroken(state, n, rec, session, reason) {
    state.prReleased[n] = rec.headSha;
    delete state.brokenAsks[n];
    if (state.prOwners?.[n]?.session === session) delete state.prOwners[n];
    return { kind: "pr-released", pr: Number(n), head: rec.headSha, session, reason };
}

/**
 * Whether a push of pull request `n`'s branch waits or runs in the machine's push queue
 * (`state.pushTickets`, waits.mjs): a ticket naming its branch, or pushing from its worktree.
 * @param {any} state the daemon state
 * @param {string} n the pull request
 * @param {any} rec its record
 * @returns {boolean} a push of it is queued
 */
function pushWaiting(state, n, rec) {
    const dirs = Object.values(state.prActivity?.[n]?.present ?? {});
    return (state.pushTickets ?? []).some(
        (/** @type {{branch: string | null, cwd: string}} */ t) =>
            (rec.headRef && t.branch === rec.headRef) || dirs.some((d) => `${t.cwd}/`.includes(`/${d}/`)),
    );
}

/**
 * Whether a session answered githerd's status question since a time: a `githerd_expect` on any job
 * it holds.
 * @param {any} state the daemon state
 * @param {string} session the session
 * @param {string} at the time
 * @returns {boolean} it answered
 */
const answeredSince = (state, session, at) =>
    Object.values(state.jobs ?? {}).some((j) => j.holder?.session === session && j.status?.at > at);

/**
 * What shows the owner of pull request `n` working on it since the question `ask`, or null: a push
 * of the branch by it (`state.prActivity`, owners.mjs), or a head someone other than githerd or
 * GitHub made. Sitting in the branch's worktree is not: a shell left there holds nothing.
 * @param {any} state the daemon state
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {{session: string, name?: string}} owner its owner
 * @param {{head: string, at: string, session: string} | undefined} ask the last question
 * @returns {string | null} the evidence
 */
function activity(state, n, rec, owner, ask) {
    const who = owner.name ?? owner.session;
    if (ask?.session !== owner.session) return null;
    const pushed = state.prActivity?.[n]?.pushed?.[owner.session];
    if (pushed && pushed >= ask.at)
        return `${who} pushed ${rec.headRef ?? "its branch"} at ${pushed.slice(11, 16)} UTC`;
    return ask.head === rec.headSha || headIsGitherds(state, rec)
        ? null
        : `new head ${String(rec.headSha).slice(0, 7)}`;
}

/**
 * The question to the owner of a broken pull request: the status question once it claimed it. An
 * owner without githerd's tools is told the command lines that answer it from its shell.
 * @param {{n: string, why: string, noTools?: boolean, claimed?: boolean}} pr the pull request, why it
 *   is broken, whether its owner has no githerd tools, and whether it claimed it
 * @param {string} cli the githerd command line
 * @param {number} minutes how often githerd asks
 * @returns {string} the message line
 */
function brokenText({ n, why, noTools, claimed }, cli, minutes) {
    if (!claimed) return brokenQuestion({ n, why, noTools }, cli);
    const answer = noTools ? `by running \`${cli} mine ${n}\` from your shell` : `with githerd_mine pr ${n}`;
    return (
        `githerd: status check on #${n} (stuck: ${why}), which this session claimed. Still working on it? ` +
        `Answer ${answer}; \`${cli} disown ${n}\` releases it. Still unanswered when githerd asks again in ` +
        `${minutes} minutes, it goes to other sessions.`
    );
}

/**
 * The first question about a stuck pull request, once per head and reason.
 * @param {{n: string, why: string, noTools?: boolean}} pr the pull request, why it is stuck, and
 *   whether its owner has no githerd tools
 * @param {string} cli the githerd command line
 * @returns {string} the message line
 */
const brokenQuestion = ({ n, why, noTools }, cli) =>
    `githerd: #${n} is stuck: ${why}. Are you fixing it? ` +
    (noTools
        ? `This session has no githerd tools, so answer from your shell: run \`${cli} mine ${n}\` to keep it, ` +
          `or \`${cli} disown ${n}\` to release it to other sessions now. No answer releases it too.`
        : `Claim it with githerd_mine pr ${n} (or githerd_claim pr-${n}) to keep it; any other answer, or none, ` +
          `releases it to other sessions (\`${cli} disown ${n}\` releases it now).`);

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
 *   owners?: () => import("./peers.mjs").PeerSession[], cli?: string}} opts the clock, whether the
 *   `workers` write group acts (else each send is a would-do line), the sessions githerd may
 *   message, the transport, how often to ask (`workers.statusMinutes`), every live session in this
 *   repository (`sessions` when absent), and the githerd command line a session without githerd's
 *   tools answers with
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function statusStep(
    state,
    { now, acting, sessions, transport, minutes, owners = sessions, cli = DEFAULT_CLI },
) {
    const lines = [];
    const due = dueJobs(state, now, minutes, lines);
    const prsDue = brokenOwned(state, { now, minutes, owners }, lines);
    const live = due.size ? sessions() : [];
    const everyone = prsDue.size ? owners() : [];
    for (const session of new Set([...due.keys(), ...prsDue.keys()])) {
        const jobTarget = live.filter((s) => s.sessionId === session);
        const asked = {
            session,
            jobs: jobTarget.length ? (due.get(session) ?? []) : [],
            prs: prsDue.get(session) ?? [],
            target: jobTarget.length ? jobTarget : everyone.filter((s) => s.sessionId === session),
        };
        await askSession(state, asked, { now, acting, transport, minutes, cli }, lines);
    }
    return lines;
}

/**
 * The owner-held jobs due the status question, by holding session. A job whose last question was
 * heard and left unanswered goes back to the queue instead (a `claim-released` line); a job
 * githerd itself watches has its pending question dropped.
 * @param {any} state the daemon state, changed in place
 * @param {Date} now the clock
 * @param {number} minutes how often to ask
 * @param {({kind: string} & Record<string, unknown>)[]} lines the ledger lines, appended to
 * @returns {Map<string, any[]>} the due jobs of each holding session
 */
function dueJobs(state, now, minutes, lines) {
    /** @type {Map<string, any[]>} */
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
        if (now.getTime() - askedSince(job) < minutes * MINUTE) continue;
        const answered = job.status?.at >= ask?.at;
        if (ask?.heard && !answered) {
            const reason = `no answer to the status question of ${ask.at}`;
            releaseOwnerJob(job, reason, now);
            lines.push({ kind: "claim-released", job: job.id, session, reason });
            continue;
        }
        due.set(session, [...(due.get(session) ?? []), job]);
    }
    return due;
}

/**
 * When the status question's cadence for a job started: its last question, else its claim, else
 * its current state.
 * @param {any} job the job
 * @returns {number} the time, in ms
 */
const askedSince = (job) => Date.parse(job.statusAsk?.at ?? job.claim?.at ?? job.stateSince);

/**
 * Sends one session the status question for its due jobs and the broken pull requests it owns (a
 * would-do line in dry-run), and records the question on each.
 * @param {any} state the daemon state, changed in place
 * @param {{session: string, jobs: any[], prs: {n: string, why: string, noTools?: boolean, claimed?: boolean}[],
 *   target: import("./peers.mjs").PeerSession[]}} asked the session, what to ask it about, and its
 *   live entries
 * @param {{now: Date, acting: boolean, transport: import("./peers.mjs").Transport, minutes: number,
 *   cli: string}} opts the clock, whether the `workers` write group acts, the transport, how often
 *   to ask and the githerd command line
 * @param {({kind: string} & Record<string, unknown>)[]} lines the ledger lines, appended to
 */
async function askSession(state, { session, jobs, prs, target }, { now, acting, transport, minutes, cli }, lines) {
    if (!target.length || (!jobs.length && !prs.length)) return;
    const ids = jobs.map((j) => j.id);
    const nums = prs.map((p) => Number(p.n));
    if (!acting) {
        const what = [...(ids.length ? [`the status of ${ids.join(", ")}`] : []), ...nums.map((p) => `#${p}`)];
        const op = `ask ${target[0].name} for ${what.join(", ")}`;
        lines.push({ kind: "would-do", group: "workers", op, jobs: ids });
    }
    const text = [
        ...(jobs.length ? [statusText(state, jobs, minutes)] : []),
        ...prs.map((p) => brokenText(p, cli, minutes)),
    ].join("\n");
    const out = acting ? await tellSessions(target, text, transport) : { sent: [], failed: [] };
    const ask = { at: now.toISOString(), heard: out.sent.length > 0 };
    for (const job of jobs) job.statusAsk = { ...ask };
    for (const p of prs) {
        const claimed = p.claimed ? { claimed: true } : {};
        state.brokenAsks[p.n] = { head: state.prs[p.n].headSha, session, why: p.why, ...claimed, ...ask };
    }
    lines.push({
        kind: "status-asked",
        jobs: ids,
        ...(nums.length ? { prs: nums } : {}),
        session: target[0].name,
        ...out,
    });
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
export function tellCancelled(cancelled, opts) {
    const told = cancelled.map((c) => ({
        ...c,
        what: "was cancelled",
        text:
            `githerd: job ${c.job}, which this session holds, was cancelled: ${c.reason}. ` +
            "Nothing is left to do on it; stop its work and do not call githerd_done or githerd_expect for it.",
    }));
    return tellHolders(told, "cancel-told", opts);
}

/**
 * Tells each owner session whose refused githerd_done report githerd checked again and accepted
 * (done.mjs recheckRefused) that its job is done, as `tellCancelled` does.
 * @param {{job: string, reportedAt: string, session?: string | null, startedBy?: string | null}[]} accepted
 *   the reports accepted
 * @param {{acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport}} opts as for `tellCancelled`
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export function tellAccepted(accepted, opts) {
    const told = accepted.map((a) => ({
        ...a,
        what: "is done",
        text:
            `githerd: your githerd_done report of ${a.reportedAt} for job ${a.job}, which githerd refused, was checked ` +
            "again and now holds: the job is done. Nothing is left to report for it.",
    }));
    return tellHolders(told, "done-told", opts);
}

/**
 * Sends each owner session holding one of `told`'s jobs its message.
 * @param {{job: string, session?: string | null, startedBy?: string | null, what: string, text: string}[]} told
 *   the messages
 * @param {string} kind the ledger kind of a sent message
 * @param {{acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport}} opts as for `tellCancelled`
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
async function tellHolders(told, kind, { acting, sessions, transport }) {
    const lines = [];
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a holder is told */
    let live = null;
    for (const c of told) {
        if (c.startedBy !== "owner" || !c.session) continue;
        live ??= sessions();
        const target = live.filter((s) => s.sessionId === c.session);
        if (!target.length) continue;
        if (!acting) {
            const op = `tell ${target[0].name} that ${c.job} ${c.what}`;
            lines.push({ kind: "would-do", group: "workers", op, job: c.job });
            continue;
        }
        const out = await tellSessions(target, c.text, transport);
        lines.push({ kind, job: c.job, session: target[0].name, ...out });
    }
    return lines;
}
