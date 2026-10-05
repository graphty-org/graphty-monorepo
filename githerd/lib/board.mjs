/**
 * Sessions, escalations and job records (design sections 5.1 to 5.3, 8.2 and 9.5): pure functions
 * over the daemon's state object. Each one changes `state` in place and returns what the tool
 * answers; the caller persists the state and writes the ledger line before replying, which is what
 * makes a claim atomic.
 *
 * A caller is `{session}` for an interactive session (its id from the launcher) or `{daemon: true}`
 * for the daemon itself.
 */

/**
 * A session whose heartbeat is older than this leaves the session list. A job an owner session
 * holds never lapses on it: that claim ends when the session leaves Claude Code's registry or does
 * not answer githerd's status question (design 8.2).
 */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

const MINUTE = 60 * 1000;

/**
 * @typedef {{session?: string, daemon?: boolean}} Caller
 * @typedef {{target: string, holder: string, holderName: string | null, purpose: string,
 *   claimedAt: string, expiresAt: string, renewedAt: string | null, fixPr: number | null}} Claim
 */

/**
 * The holder id a caller acts as.
 * @param {Caller} caller who is calling
 * @returns {string} the session id, or "daemon"
 */
function holderOf(caller) {
    if (caller.session) return caller.session;
    if (caller.daemon) return "daemon";
    throw new Error("caller names no session or daemon");
}

/**
 * Makes sure the maps this module writes exist.
 * @param {any} state the daemon state
 */
function ensure(state) {
    state.sessions ??= {};
    state.claims ??= {};
    state.escalations ??= {};
}

/**
 * Whether a session is still alive: while its heartbeat is younger than 15 minutes, measured from
 * `max(lastSeen, startedAt)` so that after a daemon restart every session gets a full interval to
 * reappear.
 * @param {any} state the daemon state
 * @param {string} holder a session id
 * @param {Date} now the current time
 * @param {Date} startedAt when this daemon started
 * @returns {boolean} alive
 */
export function holderAlive(state, holder, now, startedAt) {
    const lastSeen = Date.parse(state.sessions?.[holder]?.lastSeen ?? "") || 0;
    return now.getTime() - Math.max(lastSeen, startedAt.getTime()) < SESSION_TIMEOUT_MS;
}

/**
 * Why a claim has ended, or null while it is live.
 * @param {any} state the daemon state
 * @param {Claim} claim the claim
 * @param {Date} now the current time
 * @param {Date} startedAt when this daemon started
 * @returns {"expired" | "holder-gone" | null} the reason
 */
function endReason(state, claim, now, startedAt) {
    if (Date.parse(claim.expiresAt) <= now.getTime()) return "expired";
    if (!holderAlive(state, claim.holder, now, startedAt)) return "holder-gone";
    return null;
}

/**
 * Records that a session is alive. Called for every heartbeat and every tool call it makes.
 * @param {any} state the daemon state
 * @param {{session: string, cwd?: string, branch?: string}} beat the session and where it works
 * @param {Date} now the current time
 * @returns {any} the session record
 */
export function heartbeat(state, { session, cwd, branch }, now) {
    ensure(state);
    const record = (state.sessions[session] ??= { cwd: null, branch: null, doing: null, targets: [] });
    if (cwd !== undefined) record.cwd = cwd;
    if (branch !== undefined) record.branch = branch;
    record.lastSeen = now.toISOString();
    return record;
}

/**
 * Ends every claim whose time ran out or whose holder is gone, and forgets sessions that are gone.
 * @param {any} state the daemon state
 * @param {Date} now the current time
 * @param {Date} startedAt when this daemon started
 * @returns {{target: string, holder: string, reason: string}[]} the claims that ended
 */
export function expire(state, now, startedAt) {
    ensure(state);
    const ended = [];
    for (const [target, claim] of Object.entries(state.claims)) {
        const reason = endReason(state, claim, now, startedAt);
        if (reason) {
            delete state.claims[target];
            ended.push({ target, holder: claim.holder, reason });
        }
    }
    for (const session of Object.keys(state.sessions)) {
        if (!holderAlive(state, session, now, startedAt)) delete state.sessions[session];
    }
    return ended;
}

/**
 * Puts an item on the owner's list. Raising a key that is already open changes nothing.
 * @param {any} state the daemon state
 * @param {{key: string, kind: string, summary: string, detail?: string, target?: string,
 *   clearWhen?: string}} args the escalation; `clearWhen` only from the daemon, for derived ones
 * @param {Caller} caller who is raising it
 * @param {Date} now the current time
 * @returns {{ok: true, escalation: any, existing: boolean}} the answer
 */
export function escalate(state, args, caller, now) {
    ensure(state);
    const open = state.escalations[args.key];
    if (open && !open.resolvedAt) return { ok: true, escalation: open, existing: true };
    const escalation = {
        key: args.key,
        kind: args.kind,
        summary: args.summary,
        detail: args.detail ?? null,
        target: args.target ?? null,
        raisedBy: holderOf(caller),
        raisedAt: now.toISOString(),
        paged: null,
        resolvedAt: null,
        clearWhen: caller.daemon ? (args.clearWhen ?? null) : null,
    };
    state.escalations[args.key] = escalation;
    return { ok: true, escalation, existing: false };
}

/**
 * Clears an escalation by key.
 * @param {any} state the daemon state
 * @param {{key: string}} args the tool arguments
 * @param {Date} now the current time
 * @returns {{ok: true, escalation: any} | {ok: false, error: string}} the answer
 */
export function resolve(state, { key }, now) {
    ensure(state);
    const escalation = state.escalations[key];
    if (!escalation) return { ok: false, error: `no escalation ${key}` };
    if (escalation.resolvedAt) return { ok: false, error: `${key} was already resolved at ${escalation.resolvedAt}` };
    escalation.resolvedAt = now.toISOString();
    return { ok: true, escalation };
}

/**
 * Clears every open derived escalation (one with `clearWhen`) whose condition no longer holds.
 * @param {any} state the daemon state
 * @param {(escalation: any) => boolean} stillHolds whether the condition behind it is still true
 * @param {Date} now the current time
 * @returns {string[]} the keys cleared
 */
export function resolveDerived(state, stillHolds, now) {
    ensure(state);
    const cleared = [];
    for (const escalation of Object.values(state.escalations)) {
        if (escalation.clearWhen && !escalation.resolvedAt && !stillHolds(escalation)) {
            escalation.resolvedAt = now.toISOString();
            cleared.push(escalation.key);
        }
    }
    return cleared;
}

/**
 * Whether `who` is the account gh is logged in as (`state.trust.login`), the only author whose
 * issues, pull requests and comments githerd acts on or shows a run. Always false while the login
 * is unresolved, so a missing author can never match a missing login.
 * @param {any} state the daemon state
 * @param {string | null | undefined} who a GitHub login
 * @returns {boolean} true for the owner
 */
export function byOwner(state, who) {
    const login = state.trust?.login;
    return typeof login === "string" && login !== "" && who === login;
}

// ---------------------------------------------------------------------------------------------
// Job records (design sections 5.1 to 5.3, 8.2 and 9.5): kinds, states and their exits,
// deadlines that pause, budgets, claims against a versioned snapshot, and the invariant check.
// Pure functions over `state.jobs`; the caller persists the state and writes the ledger line.
// ---------------------------------------------------------------------------------------------

const HOUR = 60 * MINUTE;

/** The job kinds of design 5.1. A kind exists only if GitHub or the machine can check it done. */
const KINDS = new Set(["incident", "pr", "issue", "triage", "review", "title", "major"]);

/**
 * Every state and the states it may move to (design 5.3). `cancelled` is an exit of every
 * state that is not terminal, so it is added below rather than listed nine times.
 * @type {Record<string, string[]>}
 */
const EXITS = {
    queued: ["starting"],
    blocked: ["queued", "faulted"],
    starting: ["working", "blocked", "queued", "faulted"],
    working: ["waiting", "parked", "verifying", "queued", "failed", "faulted"],
    waiting: ["working", "done", "faulted"],
    parked: ["working", "parked", "faulted"],
    verifying: ["done", "working", "waiting", "queued", "failed", "faulted"],
    faulted: ["queued", "failed"],
    done: [],
    failed: [],
    cancelled: [],
};
export const STATES = Object.keys(EXITS);
export const TERMINAL = ["done", "failed", "cancelled"];

/** Attempts per job, counted per job and never reset by a head change (5.3). */
const ATTEMPTS = 3;
/**
 * Working time with no GitHub change before a githerd worker's attempt ends: 4 hours, 2 for
 * incidents. A job an owner session holds has no such clock: its status question settles it.
 */
const WORKING_MS = { incident: 2 * HOUR, other: 4 * HOUR };
/** The start deadlines: the worktree, the registry entry, the first githerd call. */
// The registry deadline outlasts tmux.mjs's own 30 s poll (REGISTRY_MS), so it fires only for a
// start the daemon lost, never while startWorker is still waiting.
const START_MS = { worktree: 20 * MINUTE, registry: 60 * 1000, "first-call": 3 * MINUTE };
/** Default wait bounds when the caller has no measured one: checks not started, a quiet local task. */
const WAIT_MS = { checks: 10 * MINUTE, local: 20 * MINUTE, other: 20 * MINUTE };
/** A second session death within this time starts the next session fresh instead of resuming. */
const DEATH_FRESH_MS = 30 * MINUTE;
/** Deaths and counted faults that end a job's chances. */
const DEATHS_TO_FAULT = 3;
const FAULTS_TO_FAIL = 3;
export const VERIFY_FAILS_TO_END = 3;
const VERIFY_POLLS = 2;

/**
 * @typedef {object} Job a job record (design 5.2)
 * @property {string} id the job id, such as `issue-737`
 * @property {string} kind one of KINDS
 * @property {string} target what the job is about: a failure key, `#412`, a batch name
 * @property {string | null} priority the issue priority, or `urgent` / `low` for incidents
 * @property {string} reason one line: why it is where it is
 * @property {string} state one of STATES
 * @property {string} stateSince when it entered the state
 * @property {string | null} deadline when the running clock runs out, null while paused or none
 * @property {string | null} deadlineAction what happens when it does
 * @property {{budgetMs: number, usedMs: number, at: string} | null} clock the deadline clock;
 *   it counts only time that no pause covered
 * @property {string[]} pausedBy the pauses holding the clock, shown on the board
 * @property {any} holder the session holding it, or null
 * @property {any[]} attempts ended attempts
 * @property {{at: string, capture: string | null}[]} deaths session deaths
 * @property {number} faults counted faults
 * @property {number} verifyFailures claimed dones that failed to verify in a row
 * @property {number} verifyPolls polls in `verifying` with no answer
 * @property {any} claim the claim of 8.2, or null
 * @property {{at: string, text: string, acked: boolean}[]} news what the holder has not seen yet
 * @property {string[]} sessions every session that held it
 * @property {string[]} joined targets other jobs joined into this one
 * @property {any} waitingFor the declared condition, or null
 * @property {string | null} steeredAt when the owner took over the session, or null
 * @property {boolean} fresh the next session starts fresh, not by resume
 * @property {boolean} evidenceFirst the next attempt is evidence-first, given the old theories
 * @property {{workingMinutes: number, attempts: number}} budget the job's budgets
 * @property {any} facts what the queue order reads (`queue.mjs`): since, scope, bug, order, labels,
 *   next, skip, storybook
 * @property {string | null} [cancelledBy] the job or event that superseded it
 * @property {"worktree" | "registry" | "first-call"} [phase] the start phase while `starting`
 * @property {{until: string, reason: string} | null} [expect] the open githerd_expect window
 * @property {{at: string, heard: boolean} | null} [statusAsk] githerd's last status question to the
 *   owner session holding the job (asks.mjs statusStep)
 * @property {{at: string, text: string} | null} [status] the holder's last one-line status
 */

/**
 * Whether an owner session (not a githerd worker) holds a job.
 * @param {Job} job the job
 * @returns {boolean} owner-held
 */
export function ownerHeld(job) {
    return job.holder?.startedBy === "owner";
}

/**
 * A new job record, `queued`.
 * @param {{kind: string, target: string, id?: string, priority?: string | null, reason?: string,
 *   facts?: any}} args what the job is
 * @param {Date} now the current time
 * @returns {Job} the record
 */
export function newJob({ kind, target, id, priority = null, reason = "", facts = {} }, now) {
    if (!KINDS.has(kind)) throw new Error(`unknown job kind ${kind}`);
    const working = kind === "incident" ? WORKING_MS.incident : WORKING_MS.other;
    return {
        id: id ?? `${kind}-${target}`,
        kind,
        target,
        priority,
        reason,
        state: "queued",
        stateSince: now.toISOString(),
        deadline: null,
        deadlineAction: null,
        clock: null,
        pausedBy: [],
        holder: null,
        attempts: [],
        deaths: [],
        faults: 0,
        verifyFailures: 0,
        verifyPolls: 0,
        claim: null,
        news: [],
        sessions: [],
        joined: [],
        waitingFor: null,
        steeredAt: null,
        fresh: false,
        evidenceFirst: false,
        budget: { workingMinutes: working / MINUTE, attempts: ATTEMPTS },
        facts,
    };
}

/**
 * Starts a deadline clock on a job.
 * @param {Job} job the job
 * @param {number} budgetMs how long the clock runs, pauses excluded
 * @param {string} action what happens when it runs out
 * @param {Date} now the current time
 */
function startClock(job, budgetMs, action, now) {
    job.clock = { budgetMs, usedMs: 0, at: now.toISOString() };
    job.deadlineAction = action;
    job.deadline = new Date(now.getTime() + budgetMs).toISOString();
}

/**
 * The wait bound for a declared condition.
 * @param {any} waitingFor the condition
 * @returns {number} milliseconds
 */
function waitBound(waitingFor) {
    if (waitingFor?.checks) return WAIT_MS.checks;
    if (waitingFor?.local) return WAIT_MS.local;
    return WAIT_MS.other;
}

/**
 * Moves a job to another state, refusing an exit the state does not have, and sets the new
 * state's deadline (design 5.3). An invalid move is a defect in githerd, so it throws.
 * @param {Job} job the job
 * @param {string} to the new state
 * @param {Date} now the current time
 * @param {{reason?: string, waitingFor?: any, boundMs?: number, phase?: string, holder?: any,
 *   cancelledBy?: string}} [opts] `waitingFor` for blocked, waiting and parked; `boundMs` a
 *   measured wait bound (twice a median, twice the gate's duration); `phase` the start phase
 * @returns {Job} the job
 */
export function move(job, to, now, opts = {}) {
    const exits = TERMINAL.includes(job.state) ? [] : [...EXITS[job.state], "cancelled"];
    if (!exits.includes(to)) throw new Error(`job ${job.id}: no exit from ${job.state} to ${to}`);
    job.state = to;
    job.stateSince = now.toISOString();
    job.clock = null;
    job.deadline = null;
    job.deadlineAction = null;
    job.pausedBy = [];
    if (opts.reason) job.reason = opts.reason;
    if (opts.holder !== undefined) job.holder = opts.holder;
    job.waitingFor = opts.waitingFor ?? (to === "parked" ? job.waitingFor : null);
    // A blocked job has no clock: it waits until its blocker ends (settleWaits in advance.mjs).
    if (to === "starting") startClock(job, START_MS[opts.phase ?? "worktree"], startAction(opts.phase), now);
    else if (to === "working" && !ownerHeld(job)) {
        startClock(job, job.budget.workingMinutes * MINUTE, "end-attempt", now);
    } else if (to === "waiting") startClock(job, opts.boundMs ?? waitBound(job.waitingFor), "doorbell", now);
    else if (to === "verifying") job.verifyPolls = 0;
    if (to === "cancelled") job.cancelledBy = opts.cancelledBy ?? null;
    if (["queued", "faulted", ...TERMINAL].includes(to)) {
        job.holder = null;
        // The status question and its answer belong to the holder that let go.
        job.statusAsk = null;
        job.status = null;
    }
    // A githerd_expect window belongs to one stretch of work: any move out of working and
    // waiting (a lapse, a requeue, a done, a new claim's start) ends it.
    if (to !== "working" && to !== "waiting") job.expect = null;
    return job;
}

/**
 * What a start phase's deadline does: a worktree not ready is a fault; a session that never
 * registered or never called githerd is a start failure.
 * @param {string | undefined} phase the start phase
 * @returns {string} the deadline action
 */
function startAction(phase) {
    return (phase ?? "worktree") === "worktree" ? "fault" : "start-failure";
}

/**
 * Moves a `starting` job to its next start phase: `registry` once the window is open,
 * `first-call` once the session is registered.
 * @param {Job} job the job
 * @param {"registry" | "first-call"} phase the phase
 * @param {Date} now the current time
 */
export function startPhase(job, phase, now) {
    if (job.state !== "starting") throw new Error(`job ${job.id} is ${job.state}, not starting`);
    startClock(job, START_MS[phase], "start-failure", now);
}

/**
 * The GitHub state of a working job changed: its no-change clock starts again.
 * @param {Job} job the job
 * @param {Date} now the current time
 */
export function githubChanged(job, now) {
    if (job.state === "working" && !ownerHeld(job)) {
        startClock(job, job.budget.workingMinutes * MINUTE, "end-attempt", now);
    }
}

/**
 * The pauses that hold this job's clock (design 5.3): githerd's view unknown, a usage stop and
 * `githerd pause` hold every clock; a steered job holds its own; Actions degraded holds only
 * waits on CI; machine load holds only the start deadlines.
 * @param {Job} job the job
 * @param {{unknown?: boolean, usage?: boolean, paused?: boolean, actionsDegraded?: boolean,
 *   load?: boolean}} pauses what holds right now
 * @returns {string[]} the pauses that apply
 */
export function pausesFor(job, pauses) {
    const ci =
        job.state === "waiting" && Boolean(job.waitingFor?.checks || job.waitingFor?.lane || job.waitingFor?.release);
    return [
        pauses.unknown && "github unknown",
        pauses.usage && "usage stop",
        pauses.paused && "githerd pause",
        job.steeredAt && "steered",
        pauses.actionsDegraded && ci && "actions degraded",
        pauses.load && job.state === "starting" && "machine load",
    ].filter((p) => typeof p === "string");
}

/**
 * Advances a job's deadline clock to `now` and fires its deadline when it ran out. Called once per
 * reconcile; time since the last call counts only when no pause holds now.
 * @param {Job} job the job
 * @param {Date} now the current time
 * @param {object} [pauses] what holds right now (see pausesFor)
 * @returns {{action: string, job: string} | null} what fired, for the caller to carry out
 */
export function tick(job, now, pauses = {}) {
    // ponytail: a pause is sampled once per reconcile (60 s), so a pause that began or ended
    // between two calls is off by at most one interval; keep pause start times if that matters.
    const clock = job.clock;
    if (!clock) return null;
    job.pausedBy = pausesFor(job, pauses);
    if (!job.pausedBy.length) clock.usedMs += Math.max(0, now.getTime() - Date.parse(clock.at));
    clock.at = now.toISOString();
    job.deadline = job.pausedBy.length ? null : new Date(now.getTime() + clock.budgetMs - clock.usedMs).toISOString();
    if (clock.usedMs < clock.budgetMs) return null;
    return fire(job, now);
}

/**
 * Restarts every deadline clock at `now`, so the time the daemon was down is not counted: githerd's
 * view was unknown then, and every deadline pauses while it is (design 5.3). Called once at start,
 * after the state is loaded. A blocked job saved with the old 4-hour clock loses it: a blocked
 * job waits until its blocker ends, however long that takes. So does a job an owner session holds
 * in `working`: its status question settles it, not elapsed time.
 * @param {any} state the daemon state
 * @param {Date} now the current time
 */
export function resumeClocks(state, now) {
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.state === "blocked" || (job.state === "working" && ownerHeld(job))) {
            Object.assign(job, { clock: null, deadline: null, deadlineAction: null });
        } else if (job.clock) job.clock.at = now.toISOString();
    }
}

/**
 * Carries out a job's deadline action.
 * @param {Job} job the job
 * @param {Date} now the current time
 * @returns {{action: string, job: string}} what fired
 */
function fire(job, now) {
    const action = /** @type {string} */ (job.deadlineAction);
    if (action === "fault") {
        return fault(job, "worktree not ready within 20 minutes", now);
    } else if (action === "start-failure") {
        move(job, "queued", now, { reason: "session start failed" });
    } else if (action === "end-attempt") {
        return endAttempt(job, { outcome: "no GitHub change within the working budget" }, now);
    } else {
        move(job, "working", now);
    }
    return { action, job: job.id };
}

/**
 * Words for a declared condition.
 * @param {any} waitingFor the condition
 * @returns {string} the words
 */
function describeWait(waitingFor) {
    const [kind, value] = Object.entries(waitingFor ?? { nothing: "" })[0];
    return `${kind} ${typeof value === "object" ? JSON.stringify(value) : value}`.trim();
}

/**
 * Adds a line to a job's news.
 * @param {Job} job the job
 * @param {string} text the line
 * @param {Date} now the current time
 */
function addNews(job, text, now) {
    job.news.push({ at: now.toISOString(), text, acked: false });
}

/**
 * Ends the current attempt (design 5.3): recorded with its findings; the job goes back to the
 * queue with a fresh session, or fails when its attempts are spent. After two attempts the next one
 * is evidence-first, given the old theories. A failed urgent job raises one owner item.
 * @param {Job} job the job
 * @param {{outcome: string, findings?: string, theory?: string}} result how it ended
 * @param {Date} now the current time
 * @returns {{action: "requeue" | "failed", job: string, evidenceFirst?: boolean, theories?: string[],
 *   ownerItem?: boolean}} what follows
 */
export function endAttempt(job, { outcome, findings = "", theory = "" }, now) {
    job.attempts.push({
        session: job.holder?.session ?? null,
        startedAt: job.claim?.at ?? null,
        endedAt: now.toISOString(),
        outcome,
        findings,
        theory,
    });
    job.verifyFailures = 0;
    if (job.attempts.length >= job.budget.attempts) {
        move(job, "failed", now, { reason: `${job.attempts.length} attempts spent` });
        return { action: "failed", job: job.id, ownerItem: urgent(job) };
    }
    move(job, "queued", now, { reason: `attempt ${job.attempts.length} ended: ${outcome}` });
    job.fresh = true;
    job.evidenceFirst = job.attempts.length >= 2;
    const theories = job.attempts.map((a) => a.theory).filter(Boolean);
    return { action: "requeue", job: job.id, evidenceFirst: job.evidenceFirst, theories };
}

/**
 * Whether a job is urgent: an incident on master, the release, or a shared key.
 * @param {Job} job the job
 * @returns {boolean} urgent
 */
function urgent(job) {
    return job.kind === "incident" && job.facts?.scope !== "low";
}

/**
 * Records that githerd could not start or keep a job (design 5.3): `faulted` until the fault
 * clears; the third counted fault fails it. Faults during a platform fault or above the load limit
 * are not counted.
 * @param {Job} job the job
 * @param {string} reason what failed
 * @param {Date} now the current time
 * @param {{counted?: boolean}} [opts] false while a platform fault or the load limit holds
 * @returns {{action: "faulted" | "failed", job: string, ownerItem?: boolean}} what follows
 */
export function fault(job, reason, now, { counted = true } = {}) {
    move(job, "faulted", now, { reason });
    if (counted) job.faults += 1;
    if (job.faults < FAULTS_TO_FAIL) return { action: "faulted", job: job.id };
    move(job, "failed", now, { reason: `${job.faults} faults, the last: ${reason}` });
    return { action: "failed", job: job.id, ownerItem: urgent(job) };
}

/**
 * Records a session death (design 3.5). A death is not an attempt: the job keeps its state (a
 * waiting job stays waiting with no session) and continues by resume, or fresh after a second
 * death within 30 minutes; the third death faults it.
 * @param {Job} job the job
 * @param {{capture?: string | null}} death the pane capture, if any
 * @param {Date} now the current time
 * @returns {{action: "resume" | "fresh" | "faulted" | "failed", job: string}} what follows
 */
export function death(job, { capture = null }, now) {
    const previous = job.deaths.at(-1);
    job.deaths.push({ at: now.toISOString(), capture });
    job.holder = null;
    if (job.deaths.length >= DEATHS_TO_FAULT) return fault(job, `${job.deaths.length} session deaths`, now);
    job.fresh = Boolean(previous && now.getTime() - Date.parse(previous.at) < DEATH_FRESH_MS);
    return { action: job.fresh ? "fresh" : "resume", job: job.id };
}

/**
 * Applies one poll's verification answer to a `verifying` job (design 5.3): it holds, only CI is
 * pending, or something is missing. No answer for two polls sends it back to work. Three failed
 * verifications in a row end the attempt.
 * @param {Job} job the job
 * @param {{holds: true} | {ciPending: string} | {missing: string[]} | null} answer the answer;
 *   `ciPending` names the head sha whose checks are running; null when this poll could not decide
 * @param {Date} now the current time
 * @returns {{action: string, job: string, missing?: string[]} | null} what follows, null while
 *   undecided
 */
export function verifyResult(job, answer, now) {
    if (job.state !== "verifying") throw new Error(`job ${job.id} is ${job.state}, not verifying`);
    if (!answer) {
        job.verifyPolls += 1;
        if (job.verifyPolls < VERIFY_POLLS) return null;
        const missing = [`not decided within ${VERIFY_POLLS} polls`];
        addNews(job, missing[0], now);
        move(job, "working", now);
        return { action: "working", job: job.id, missing };
    }
    if ("holds" in answer) {
        job.verifyFailures = 0;
        move(job, "done", now);
        return { action: "done", job: job.id };
    }
    if ("ciPending" in answer) {
        move(job, "waiting", now, { waitingFor: { checks: answer.ciPending } });
        return { action: "waiting", job: job.id };
    }
    job.verifyFailures += 1;
    if (job.verifyFailures >= VERIFY_FAILS_TO_END) {
        return endAttempt(job, { outcome: `done failed to verify ${job.verifyFailures} times` }, now);
    }
    addNews(job, `not done yet: ${answer.missing.join("; ")}`, now);
    move(job, "working", now);
    return { action: "working", job: job.id, missing: answer.missing };
}

/**
 * Whether job `from` waiting on job `on` would close a cycle in the wait graph: `on`, or a job it
 * waits on, transitively, already waits on `from`.
 * @param {any} state the daemon state
 * @param {string} from the job that would wait
 * @param {string} on the job it would wait on
 * @returns {boolean} true for a cycle
 */
export function closesCycle(state, from, on) {
    const seen = new Set();
    for (let id = on; id && !seen.has(id); id = state.jobs?.[id]?.waitingFor?.job) {
        if (id === from) return true;
        seen.add(id);
    }
    return false;
}

/** States whose job is in flight: in the claim snapshot. */
const IN_FLIGHT = new Set(["blocked", "starting", "working", "waiting", "parked", "verifying"]);

/**
 * The claim snapshot of design 8.2: every job in flight and every owner session, each with the
 * files it is actually changing. Its version moves whenever its content does, so a claim made on
 * an older picture is refused.
 * @param {any} state the daemon state
 * @param {{worktrees?: {path: string, branch: string | null, changedFiles: string[]}[],
 *   ownerSessions?: {name: string, cwd: string, branch: string | null}[]}} facts every worktree
 *   with its branch's diff from the merge base plus uncommitted paths, and the live owner sessions
 * @returns {{version: number, inFlight: any[], ownerSessions: any[]}} the snapshot
 */
export function claimSnapshot(state, { worktrees = [], ownerSessions = [] }) {
    const files = new Map(worktrees.map((w) => [w.path, w.changedFiles]));
    const jobs = Object.values(state.jobs ?? {}).filter((j) => IN_FLIGHT.has(j.state));
    const inFlight = jobs
        .map((j) => ({
            job: j.id,
            target: j.target,
            plan: j.claim?.plan ?? null,
            holderWindow: j.holder?.window ?? null,
            pr: j.pr ?? null,
            changedFiles: files.get(j.worktree) ?? [],
        }))
        .sort((a, b) => a.job.localeCompare(b.job));
    const jobTrees = new Set(jobs.map((j) => j.worktree));
    const sessionTrees = new Set(ownerSessions.map((s) => s.cwd));
    const sessions = [
        ...ownerSessions.map((s) => ({ ...s, changedFiles: files.get(s.cwd) ?? [] })),
        // A worktree with changes and no live session still counts: its changes are real.
        ...worktrees
            .filter((w) => w.changedFiles.length && !jobTrees.has(w.path) && !sessionTrees.has(w.path))
            .map((w) => ({ name: null, cwd: w.path, branch: w.branch, changedFiles: w.changedFiles })),
    ].sort((a, b) => a.cwd.localeCompare(b.cwd));
    const content = JSON.stringify({ inFlight, sessions });
    const snap = (state.snapshot ??= { version: 0, content: null });
    if (snap.content !== content) {
        snap.version += 1;
        snap.content = content;
    }
    return { version: snap.version, inFlight, ownerSessions: sessions };
}

/**
 * Claims a job with the overlap judgment (design 8.2, the `githerd_claim` tool). A worker claims
 * the job it was started for; an owner session may take a queued one. Refused on a stale snapshot,
 * for a wait that would close a cycle, or for a job the caller cannot hold; a refusal changes
 * nothing.
 * - `independent`: the job is `working`.
 * - `join`: this job's target is added to the job named by `with`, whose holder gets the news, and
 *   this job is `cancelled` with a pointer to it.
 * - `wait`: the job is `blocked` on the job named by `with` until that job ends. `with` may name an
 *   issue as "#736": its issue job, made `queued` when none is live, for an open issue by the owner.
 * @param {any} state the daemon state
 * @param {{job: string, snapshotVersion: number, overlap: {decision: "independent" | "join" | "wait",
 *   with?: string, reason: string}, related?: string[], plan: string}} args the tool arguments,
 *   already schema-checked
 * @param {{session: string, window?: string | null}} caller the calling session
 * @param {{version: number}} snapshot the current snapshot (claimSnapshot)
 * @param {Date} now the current time
 * @returns {{ok: true, job: Job, created?: string} | {ok: false, reason: string, snapshot?: any}}
 *   the answer; `created` names an issue job a wait on "#N" made
 */
export function claimJob(state, args, caller, snapshot, now) {
    const job = state.jobs?.[args.job];
    if (!job) return { ok: false, reason: `no job ${args.job}` };
    if (args.snapshotVersion !== snapshot.version) {
        return {
            ok: false,
            reason: `snapshot ${args.snapshotVersion} is stale; judge again on ${snapshot.version}`,
            snapshot,
        };
    }
    const issue = /^#(\d+)$/.exec(args.overlap.with ?? "")?.[1];
    /** @type {Job | null} */
    let made = null;
    if (issue) {
        const id = `issue-${issue}`;
        const old = state.jobs[id];
        // As syncJobs does: a done or cancelled job is made again, any other stays.
        if (args.overlap.decision === "wait" && (!old || old.state === "done" || old.state === "cancelled")) {
            const rec = state.issues?.byNumber?.[issue];
            if (rec?.state !== "open" || !byOwner(state, rec.author)) {
                return {
                    ok: false,
                    reason: `#${issue} is not an open issue by the owner; it cannot be waited on`,
                    snapshot,
                };
            }
            made = newJob(
                {
                    id,
                    kind: "issue",
                    target: `#${issue}`,
                    reason: `${job.id} waits on it`,
                    facts: {
                        since: rec.createdAt ?? null,
                        bug: (rec.labels ?? []).includes("bug"),
                        labels: rec.labels ?? [],
                        next: false,
                        skip: false,
                        storybook: false,
                    },
                },
                now,
            );
        }
        args = { ...args, overlap: { ...args.overlap, with: id } };
    }
    const refused = claimRefusal(
        made ? { ...state, jobs: { ...state.jobs, [made.id]: made } } : state,
        job,
        args,
        caller,
    );
    if (refused) return { ok: false, reason: refused, snapshot };
    if (made) state.jobs[made.id] = made;

    // An owner session takes a queued job by starting it itself.
    if (job.state === "queued") {
        move(job, "starting", now, {
            holder: { session: caller.session, window: caller.window ?? null, startedBy: "owner" },
        });
    }
    job.claim = {
        session: caller.session,
        plan: args.plan,
        overlap: { decision: args.overlap.decision, with: args.overlap.with ?? null, reason: args.overlap.reason },
        related: args.related ?? [],
        at: now.toISOString(),
    };
    if (!job.sessions.includes(caller.session)) job.sessions.push(caller.session);
    const other = state.jobs[args.overlap.with ?? ""];
    if (args.overlap.decision === "join") {
        other.joined.push(job.target);
        addNews(other, `job ${job.id} joined yours: ${job.target} is now part of it (${args.overlap.reason})`, now);
        const holder = job.holder;
        move(job, "cancelled", now, { cancelledBy: other.id, reason: `joined ${other.id}` });
        // Design 8.2: the joining session ends; a window githerd opened is ended by the daemon.
        if (holder?.pane) {
            state.retiring = [
                ...(state.retiring ?? []),
                { job: job.id, holder, reason: `joined ${other.id}`, at: now.toISOString() },
            ];
        }
    } else if (args.overlap.decision === "wait") {
        move(job, "blocked", now, {
            waitingFor: { job: other.id },
        });
    } else {
        move(job, "working", now);
    }
    return made ? { ok: true, job, created: made.id } : { ok: true, job };
}

/**
 * Why a claim is refused, or null.
 * @param {any} state the daemon state
 * @param {Job} job the job
 * @param {{overlap: {decision: string, with?: string}}} args the claim
 * @param {{session: string}} caller the calling session
 * @returns {string | null} the reason
 */
function claimRefusal(state, job, args, caller) {
    if (job.state === "starting" && job.holder?.session !== caller.session) {
        return `${job.id} was started for session ${job.holder?.session}`;
    }
    if (job.state !== "starting" && job.state !== "queued") return `${job.id} is ${job.state}, not claimable`;
    const { decision, with: other } = args.overlap;
    if (decision === "independent") return null;
    const target = state.jobs[other ?? ""];
    if (!target || target.id === job.id || TERMINAL.includes(target.state)) {
        return `${decision} needs another open job in "with", not ${other ?? "nothing"}`;
    }
    if (decision === "wait" && closesCycle(state, job.id, target.id)) {
        return `waiting on ${target.id} closes a cycle: it already waits on ${job.id}`;
    }
    return null;
}

/**
 * The invariant check of design 9.5, for the records githerd keeps: every job has a known state,
 * a holder (a session, the queue, the owner or a named blocker) and a deadline unless its state has
 * none; a waiting job's condition is still pending; a parked job's owner item is open; a working
 * job's session is alive or being recovered; every order's issues each have a job or a reason.
 * Every violation is a fault for every surface, with the record it concerns.
 * @param {any} state the daemon state
 * @param {Reads} facts what the reconcile read this time
 * @returns {{record: string, problem: string}[]} the faults, empty when every invariant holds
 */
export function checkInvariants(state, facts) {
    const faults = [];
    for (const job of Object.values(state.jobs ?? {})) {
        const problem = jobProblem(job, facts);
        if (problem) faults.push({ record: `job ${job.id}`, problem });
    }
    const jobIds = new Set(Object.keys(state.jobs ?? {}));
    for (const order of state.orders ?? []) {
        for (const issue of order.issues ?? []) {
            if (!jobIds.has(`issue-${issue}`) && !order.reasons?.[issue]) {
                faults.push({ record: `order ${order.id}`, problem: `issue #${issue} has no job and no reason` });
            }
        }
    }
    return faults;
}

/** States that run a deadline clock. */
const CLOCKED = new Set(["starting", "working", "waiting"]);

/**
 * @typedef {{sessionAlive: (session: string) => boolean, recovering: (job: string) => boolean,
 *   waitPending: (job: Job) => boolean, itemOpen: (item: string) => boolean}} Reads what the
 *   reconcile read this time, for the invariant check
 */

/**
 * The holder each state needs, as a check that returns the problem or null. `queued` and
 * `faulted` are held by the queue and need nothing more.
 * @type {Record<string, (job: Job, facts: Reads) => string | null>}
 */
const HOLDER_CHECKS = {
    blocked: (job) => (job.waitingFor?.job ? null : "blocked on nothing named"),
    // The worktree and registry phases have no session yet; the first call's phase has one.
    starting: (job) => (job.holder?.session || job.phase !== "first-call" ? null : "starting with no session"),
    verifying: (job) => (job.holder?.session ? null : "verifying with no session"),
    working: (job, facts) =>
        (job.holder?.session && facts.sessionAlive(job.holder.session)) || facts.recovering(job.id)
            ? null
            : "working, but its session is gone and no recovery runs",
    waiting: (job, facts) => {
        if (!job.waitingFor) return "waiting on nothing declared";
        return facts.waitPending(job) ? null : `still waiting on ${describeWait(job.waitingFor)}, which has settled`;
    },
    parked: (job, facts) =>
        job.waitingFor?.owner && facts.itemOpen(job.waitingFor.owner) ? null : "parked, but its owner item is not open",
};

/**
 * The first invariant a job breaks, or null.
 * @param {Job} job the job
 * @param {Reads} facts the reconcile's reads
 * @returns {string | null} the problem
 */
function jobProblem(job, facts) {
    if (!STATES.includes(job.state)) return `unknown state ${job.state}`;
    // An owner session's working job has no clock: its status question settles it (design 8.2).
    const clocked = CLOCKED.has(job.state) && !(job.state === "working" && ownerHeld(job));
    if (clocked && !job.clock) return `${job.state} with no deadline`;
    return HOLDER_CHECKS[job.state]?.(job, facts) ?? null;
}
