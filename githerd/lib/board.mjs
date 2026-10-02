/**
 * Claims, sessions and escalations (design sections 5.3, 5.5 and 7.1): pure functions over the
 * daemon's state object. Each one changes `state` in place and returns what the tool answers; the
 * caller persists the state and writes the ledger line before replying, which is what makes a
 * claim atomic.
 *
 * A caller is `{session}` for an interactive session (its id from the launcher), `{run}` for a
 * judgment run (its run id, from a valid run token) or `{daemon: true}` for the daemon itself.
 */

/** Default claim lifetime. */
const DEFAULT_TTL_MINUTES = 120;
/** Longest claim lifetime a caller may ask for. */
const MAX_TTL_MINUTES = 480;
/** A session whose heartbeat is older than this is gone, and its claims lapse. */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

const MINUTE = 60 * 1000;

/**
 * @typedef {{session?: string, run?: string, daemon?: boolean}} Caller
 * @typedef {{target: string, holder: string, holderName: string | null, purpose: string,
 *   claimedAt: string, expiresAt: string, renewedAt: string | null, fixPr: number | null}} Claim
 */

/**
 * The holder id a caller acts as.
 * @param {Caller} caller who is calling
 * @returns {string} the session id, the run id, or "daemon"
 */
function holderOf(caller) {
    if (caller.run) return caller.run;
    if (caller.session) return caller.session;
    if (caller.daemon) return "daemon";
    throw new Error("caller names no session, run or daemon");
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
 * Whether a holder is still alive. A run lives while its record says `running`. A session lives
 * while its heartbeat is younger than 15 minutes, measured from `max(lastSeen, startedAt)` so that
 * after a daemon restart every session gets a full interval to reappear.
 * @param {any} state the daemon state
 * @param {string} holder a session id or run id
 * @param {Date} now the current time
 * @param {Date} startedAt when this daemon started
 * @returns {boolean} alive
 */
export function holderAlive(state, holder, now, startedAt) {
    if (holder.startsWith("run-")) return state.runs?.[holder]?.status === "running";
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
 * Whether two claim targets overlap: the same target, or two `path:` targets where one is a path
 * prefix of the other on a segment boundary.
 * @param {string} a a target
 * @param {string} b a target
 * @returns {boolean} they conflict
 */
export function targetsConflict(a, b) {
    if (a === b) return true;
    if (!a.startsWith("path:") || !b.startsWith("path:")) return false;
    const pa = a.slice(5).replace(/\/+$/, "");
    const pb = b.slice(5).replace(/\/+$/, "");
    return pa === pb || pa.startsWith(`${pb}/`) || pb.startsWith(`${pa}/`);
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
 * Claims a target, or renews the caller's own claim on it.
 * @param {any} state the daemon state
 * @param {{target: string, purpose: string, ttlMinutes?: number, holderName?: string,
 *   fixPr?: number}} args the tool arguments, already schema-checked
 * @param {Caller} caller who is claiming
 * @param {Date} now the current time
 * @param {Date} startedAt when this daemon started
 * @returns {{ok: true, claim: Claim, renewed: boolean} | {ok: false, error: string} |
 *   {ok: false, target: string, heldBy: string, holderName: string | null, purpose: string,
 *   expiresAt: string}} the answer
 */
export function claim(state, args, caller, now, startedAt) {
    ensure(state);
    const holder = holderOf(caller);
    if (args.fixPr !== undefined) {
        if (!caller.session) return { ok: false, error: "fixPr is accepted from interactive sessions only" };
        if (args.target !== "master") return { ok: false, error: "fixPr is accepted only with target master" };
    }
    if (caller.session) heartbeat(state, { session: caller.session }, now);
    expire(state, now, startedAt);

    for (const other of Object.values(state.claims)) {
        if (other.holder !== holder && targetsConflict(other.target, args.target)) {
            return {
                ok: false,
                target: other.target,
                heldBy: other.holder,
                holderName: other.holderName,
                purpose: other.purpose,
                expiresAt: other.expiresAt,
            };
        }
    }

    const ttl = Math.min(args.ttlMinutes ?? DEFAULT_TTL_MINUTES, MAX_TTL_MINUTES);
    const expiresAt = new Date(now.getTime() + ttl * MINUTE).toISOString();
    const existing = state.claims[args.target];
    if (existing) {
        existing.purpose = args.purpose;
        existing.expiresAt = expiresAt;
        existing.renewedAt = now.toISOString();
        if (args.holderName !== undefined) existing.holderName = args.holderName;
        if (args.fixPr !== undefined) existing.fixPr = args.fixPr;
        return { ok: true, claim: existing, renewed: true };
    }
    /** @type {Claim} */
    const created = {
        target: args.target,
        holder,
        holderName: args.holderName ?? null,
        purpose: args.purpose,
        claimedAt: now.toISOString(),
        expiresAt,
        renewedAt: null,
        fixPr: args.fixPr ?? null,
    };
    state.claims[args.target] = created;
    return { ok: true, claim: created, renewed: false };
}

/**
 * Ends a claim. Only its holder may, except that anyone may end a claim whose holder is gone.
 * @param {any} state the daemon state
 * @param {{target: string, outcome?: string, note?: string}} args the tool arguments
 * @param {Caller} caller who is releasing
 * @param {Date} now the current time
 * @param {Date} startedAt when this daemon started
 * @returns {{ok: true, claim: Claim, outcome: string} | {ok: false, error: string}} the answer
 */
export function release(state, args, caller, now, startedAt) {
    ensure(state);
    const holder = holderOf(caller);
    if (caller.session) heartbeat(state, { session: caller.session }, now);
    const existing = state.claims[args.target];
    if (!existing) return { ok: false, error: `no claim on ${args.target}` };
    if (existing.holder !== holder && holderAlive(state, existing.holder, now, startedAt)) {
        return {
            ok: false,
            error: `${args.target} is held by ${existing.holderName ?? existing.holder}, which is still alive`,
        };
    }
    delete state.claims[args.target];
    return { ok: true, claim: existing, outcome: args.outcome ?? "done" };
}

/**
 * Releases every claim a run holds; called when the run ends.
 * @param {any} state the daemon state
 * @param {string} run the run id
 * @returns {string[]} the released targets
 */
export function releaseRun(state, run) {
    ensure(state);
    const targets = Object.values(state.claims)
        .filter((c) => c.holder === run)
        .map((c) => c.target);
    for (const target of targets) delete state.claims[target];
    return targets;
}

/**
 * Records what a session is doing, shown under SESSIONS in status.
 * @param {any} state the daemon state
 * @param {{doing: string, targets?: string[], pr?: number}} args the tool arguments
 * @param {Caller} caller who is reporting
 * @param {Date} now the current time
 * @returns {{ok: true, session: any} | {ok: false, error: string}} the answer
 */
export function report(state, args, caller, now) {
    if (!caller.session) return { ok: false, error: "only interactive sessions report" };
    const record = heartbeat(state, { session: caller.session }, now);
    record.doing = args.doing;
    record.targets = args.targets ?? [];
    record.pr = args.pr ?? null;
    return { ok: true, session: record };
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
