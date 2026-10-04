/**
 * Proposals to close an issue or a pull request (design sections 3.3, 3.4 and 3.7), carried out
 * through the `proposals` write group.
 *
 * Kinds, and what each needs:
 * - `duplicate` (an issue duplicating issue `of`), `obsolete` and `fixed` (evidence from current
 *   master), `not-needed` (an `issue` job's outcome, with evidence) and `not-needed-pr` (the same
 *   for a `pr` job's pull request): Claude's judgment, so one
 *   verdict only makes an `unconfirmed` proposal. A second verdict from a different session that
 *   agrees (same kind, same `of`) confirms it; one that disagrees, or a `keep`, drops it.
 * - `already-merged` (a pull request whose every commit is on master, merged through `of`) and
 *   `duplicate-pr` (a newer pull request for the same issue as the older `of`): mechanical signals,
 *   confirmed at once.
 *
 * A confirmed proposal gets one comment on its target, then waits a grace period counted in days on
 * which the owner was present (section 11.3), not counting the day of the comment: 7 for an issue,
 * 3 for a pull request. Then, if the target is still open and the owner has not objected, it is
 * closed. An owner comment after the proposal comment that is not a worker's write is an objection,
 * and an objection is a veto: the target is never proposed or closed again. So is `githerd veto`,
 * and the owner reopening a target an agent closed (the caller passes those to `veto`).
 *
 * The state lives in `state.proposals` (by target, `issue:<n>` or `pr:<n>`, one proposal each) and
 * `state.vetoes` (by target). In dry-run the gate records the comment and the close as `would-do`
 * lines and the proposal moves on as if they were sent, marked `dryRun`, so the grace timeline can
 * be compared with what happened. A proposal whose comment was only a would-do goes back to
 * `confirmed` once the group acts, so the real comment is posted and its grace starts then: nothing
 * is closed that the owner was never told about.
 *
 * The comment is posted from status `commenting`, which the write gate saves before it sends, and
 * a `commenting` proposal first looks for its own marked comment, so a crash between the send and
 * the save never posts it twice. A target githerd closed is watched for 30 days: the owner
 * reopening it (an owner-account `reopened` event that no worker wrote) is a veto.
 *
 * Entries of `state.proposals` in an older shape (keyed `prop-...`, kind `revert`) are not this
 * module's and are skipped.
 */

import { notSent } from "./github.mjs";

/** Grace in owner-present days, by target type. */
export const GRACE_DAYS = { issue: 7, pr: 3 };

/** The target type of each kind. */
const KINDS = {
    duplicate: "issue",
    obsolete: "issue",
    fixed: "issue",
    "not-needed": "issue",
    "not-needed-pr": "pr",
    "already-merged": "pr",
    "duplicate-pr": "pr",
};
const MECHANICAL = new Set(["already-merged", "duplicate-pr"]);
const NEEDS_OF = new Set(["duplicate", "already-merged", "duplicate-pr"]);
const TERMINAL = new Set(["closed", "vetoed", "dropped", "ended", "voided"]);
const GROUP = "proposals";
/** How long a target githerd closed is watched for the owner reopening it. */
const WATCH_MS = 30 * 86_400_000;
/** Characters of a worker's evidence the comment quotes. */
const EVIDENCE_CHARS = 1000;
/** Every comment githerd posts carries this; it is never read as the owner's objection. */
const OWN_MARK = "<!-- githerd";

/**
 * @typedef {"duplicate" | "obsolete" | "fixed" | "not-needed" | "not-needed-pr" | "already-merged"
 *   | "duplicate-pr"} Kind
 * @typedef {{verdict: Kind | "keep", number: number, of?: number, evidence?: string, session: string,
 *   at: string}} Verdict one verdict on an issue or pull request; `session` is who judged it
 * @typedef {{id: string, target: string, kind: Kind, of: number | null, evidence: string | null,
 *   status: "unconfirmed" | "confirmed" | "commenting" | "commented" | "closed" | "vetoed" | "dropped"
 *     | "ended" | "voided",
 *   proposedBy: string, proposedAt: string, confirmedBy: string | null, commentedAt?: string,
 *   commentId?: number | null, presentDays?: number, closedAt?: string, dryRun?: boolean,
 *   watched?: boolean, reason?: string, lastError?: string}} Proposal
 * @typedef {{gitHub: any, repo: string, login: string, now: Date,
 *   presentDays: (from: string) => number, isWorkerWrite?: (target: string, at: string) => boolean,
 *   ledger: (entry: object) => unknown}} Context `presentDays`: how many days on or after the day
 *   `from` (`YYYY-MM-DD`) the owner was present (section 11.3; `presentDays` of notify.mjs);
 *   `isWorkerWrite`: true when an owner-account event at that time on that target matches a
 *   worker's logged write (section 10.1)
 */

/**
 * The UTC calendar day after the one a time falls on, the way presence records days.
 * @param {string} at an ISO time
 * @returns {string} `YYYY-MM-DD`
 */
const dayAfter = (at) => new Date(Date.parse(at.slice(0, 10)) + 86_400_000).toISOString().slice(0, 10);

/**
 * Why a verdict cannot become a proposal, or null.
 * @param {Verdict} v the verdict
 * @returns {string | null} the reason
 */
function invalid(v) {
    if (!(v.verdict in KINDS)) return `unknown verdict ${v.verdict}`;
    if (!Number.isInteger(v.number) || v.number <= 0) return "number must be a positive integer";
    if (
        NEEDS_OF.has(v.verdict) &&
        (!Number.isInteger(v.of) || v.of === v.number || /** @type {number} */ (v.of) <= 0)
    ) {
        return `${v.verdict} needs the other item's number in of`;
    }
    if (!NEEDS_OF.has(v.verdict) && !v.evidence?.trim()) return `${v.verdict} needs evidence`;
    return null;
}

/**
 * The open proposal on a target, or undefined.
 * @param {any} state the daemon state
 * @param {string} target `issue:<n>` or `pr:<n>`
 * @returns {Proposal | undefined} the proposal
 */
function openOn(state, target) {
    const p = state.proposals?.[target];
    return p && !TERMINAL.has(p.status) ? p : undefined;
}

/**
 * Records one verdict. A `keep` (or a disagreeing verdict from another session) drops an
 * unconfirmed proposal; an agreeing one from another session confirms it; a first verdict makes an
 * unconfirmed proposal, or a confirmed one for a mechanical kind. A vetoed target is refused.
 * @param {any} state the daemon state
 * @param {Verdict} v the verdict
 * @returns {{proposal?: Proposal, refused?: string}} the proposal it made or changed, or why not
 */
export function recordVerdict(state, v) {
    state.proposals ??= {};
    if (v.verdict === "keep") {
        const p = openOn(state, `issue:${v.number}`);
        if (p?.status !== "unconfirmed" || p.proposedBy === v.session) return {};
        Object.assign(p, { status: "dropped", reason: `${v.session} judged keep` });
        return { proposal: p };
    }
    const why = invalid(v);
    if (why) return { refused: why };
    const target = `${KINDS[/** @type {Kind} */ (v.verdict)]}:${v.number}`;
    if (state.vetoes?.[target]) return { refused: `${target} is vetoed` };
    const kind = /** @type {Kind} */ (v.verdict);
    const p = openOn(state, target);
    if (p?.status === "unconfirmed") return secondVerdict(p, v);
    if (p) return { proposal: p };
    /** @type {Proposal} */
    const made = {
        id: target,
        target,
        kind,
        of: v.of ?? null,
        evidence: v.evidence?.trim().slice(0, EVIDENCE_CHARS) ?? null,
        status: MECHANICAL.has(kind) ? "confirmed" : "unconfirmed",
        proposedBy: v.session,
        proposedAt: v.at,
        confirmedBy: MECHANICAL.has(kind) ? v.session : null,
    };
    state.proposals[target] = made;
    return { proposal: made };
}

/**
 * A verdict on an unconfirmed proposal: it confirms when it comes from another session and agrees
 * (same kind, same `of`), and drops the proposal when it comes from another session and does not.
 * @param {Proposal} p the unconfirmed proposal
 * @param {Verdict} v the verdict
 * @returns {{proposal?: Proposal, refused?: string}} the proposal, or why the verdict was refused
 */
function secondVerdict(p, v) {
    if (p.proposedBy === v.session) return { refused: "a confirmation needs a verdict from a fresh session" };
    if (p.kind === v.verdict && p.of === (v.of ?? null)) {
        Object.assign(p, { status: "confirmed", confirmedBy: v.session });
    } else {
        const of = v.of ? " of #" + v.of : "";
        Object.assign(p, { status: "dropped", reason: `${v.session} judged ${v.verdict}${of}` });
    }
    return { proposal: p };
}

/**
 * Vetoes a target: never proposed or closed again, and its open proposal ends.
 * @param {any} state the daemon state
 * @param {string} target `issue:<n>` or `pr:<n>`
 * @param {{by: string, reason: string, at: string}} why who vetoed, why and when
 * @returns {Proposal | undefined} the proposal it ended, if one was open
 */
export function veto(state, target, why) {
    state.vetoes ??= {};
    state.vetoes[target] = why;
    const p = openOn(state, target);
    if (p) Object.assign(p, { status: "vetoed", reason: why.reason });
    return p;
}

/**
 * The comment that announces a proposal.
 * @param {Proposal} p the proposal
 * @returns {string} the comment body
 */
export function proposalComment(p) {
    const what = {
        duplicate: `This issue looks like a duplicate of #${p.of}; two separate triage sessions agreed.`,
        obsolete: `This issue looks obsolete on current master; two separate sessions agreed. Evidence: ${p.evidence}`,
        fixed: `This issue looks fixed on current master; two separate sessions agreed. Evidence: ${p.evidence}`,
        "not-needed": `The work this issue asks for looks not needed; two separate sessions agreed. Evidence: ${p.evidence}`,
        "not-needed-pr": `The change this pull request makes looks not needed; two separate sessions agreed. Evidence: ${p.evidence}`,
        "already-merged": `Every commit of this pull request is already on master, merged through #${p.of}.`,
        "duplicate-pr": `This pull request duplicates #${p.of}, which is older and is kept.`,
    }[p.kind];
    const days = GRACE_DAYS[/** @type {"issue" | "pr"} */ (p.target.split(":")[0])];
    return [
        what,
        "",
        `githerd will close it after ${days} more days on which the owner is active, unless the owner comments here or runs \`githerd veto ${p.target}\`.`,
        "",
        `${OWN_MARK} proposal=${p.target} -->`,
    ].join("\n");
}

/**
 * Moves every open proposal one step: a confirmed one gets its comment, a commented one counts its
 * present days, reads the owner's comments for an objection, and is closed once its grace is over.
 * A target found closed meanwhile ends its proposal. A failure on one proposal is kept on it and
 * the others still move.
 * @param {any} state the daemon state
 * @param {Context} ctx the client, the owner's login, the clock and presence
 * @returns {Promise<Proposal[]>} the proposals whose status changed
 */
export async function advanceProposals(state, ctx) {
    const changed = [];
    for (const p of Object.values(state.proposals ?? {})) {
        if (!(p.kind in KINDS)) continue;
        if (p.status === "closed") await watchReopen(state, p, ctx);
        if (TERMINAL.has(p.status) || p.status === "unconfirmed") continue;
        const before = p.status;
        try {
            await step(state, p, ctx);
            delete p.lastError;
        } catch (err) {
            p.lastError = /** @type {Error} */ (err).message;
        }
        if (p.status !== before) {
            changed.push(p);
            await ctx.ledger({
                kind: "proposal",
                id: p.id,
                target: p.target,
                from: before,
                to: p.status,
                reason: p.reason,
            });
        }
    }
    return changed;
}

/**
 * One proposal's step.
 * @param {any} state the daemon state
 * @param {Proposal} p a confirmed or commented proposal
 * @param {Context} ctx the context
 */
async function step(state, p, ctx) {
    if (state.vetoes?.[p.target]) {
        Object.assign(p, { status: "vetoed", reason: state.vetoes[p.target].reason });
        return;
    }
    if (p.status === "commenting" && (await ownComment(p, ctx))) return;
    if (p.status === "confirmed" || p.status === "commenting") {
        await comment(p, ctx);
        return;
    }
    if (p.dryRun && ctx.gitHub.acting(GROUP)) {
        // The owner never saw a would-do comment: post it for real and count grace from then.
        delete p.commentedAt;
        delete p.commentId;
        delete p.presentDays;
        delete p.dryRun;
        p.status = "confirmed";
        return;
    }
    await closeAfterGrace(state, p, ctx);
}

/**
 * Posts a proposal's comment from status `commenting`, which the write gate saves before it sends.
 * @param {Proposal} p a confirmed proposal, or a `commenting` one whose comment is not there
 * @param {Context} ctx the context
 */
async function comment(p, ctx) {
    if (!(await stillOpen(p, ctx, false))) return;
    const n = p.target.split(":")[1];
    p.status = "commenting";
    let res;
    try {
        res = await ctx.gitHub.write(
            "POST",
            `repos/${ctx.repo}/issues/${n}/comments`,
            { body: proposalComment(p) },
            { group: GROUP, check: "created", fields: { situation: `propose ${p.kind}`, target: p.target } },
        );
    } catch (err) {
        // Surely not posted: back to confirmed. Maybe posted: the next step looks for it first.
        if (notSent(err)) p.status = "confirmed";
        throw err;
    }
    const at = ctx.now.toISOString();
    Object.assign(p, { status: "commented", commentedAt: at, commentId: res.body?.id ?? null, presentDays: 0 });
    p.dryRun = !res.performed;
}

/**
 * Counts a commented proposal's present days, reads the owner's objection, and closes the target
 * once its grace is over and it is still open.
 * @param {any} state the daemon state
 * @param {Proposal} p a commented proposal
 * @param {Context} ctx the context
 */
async function closeAfterGrace(state, p, ctx) {
    const [type, n] = p.target.split(":");
    p.presentDays = ctx.presentDays(dayAfter(/** @type {string} */ (p.commentedAt)));
    const due = p.presentDays >= GRACE_DAYS[/** @type {"issue" | "pr"} */ (type)];
    if (await objected(state, p, ctx, due)) return;
    if (!due || !(await stillOpen(p, ctx, true))) return;
    const close =
        type === "pr"
            ? { state: "closed" }
            : { state: "closed", state_reason: p.kind === "fixed" ? "completed" : "not_planned" };
    const repo = ctx.repo;
    const res = await ctx.gitHub.write("PATCH", `repos/${repo}/${type === "pr" ? "pulls" : "issues"}/${n}`, close, {
        group: GROUP,
        check: { path: `repos/${repo}/issues/${n}`, expect: { state: "closed" } },
        retry: true,
        fields: { situation: `close ${p.kind}`, target: p.target },
    });
    const closedAt = ctx.now.toISOString();
    Object.assign(p, { status: "closed", closedAt, dryRun: Boolean(p.dryRun) || !res.performed });
}

/**
 * Finds the comment a `commenting` proposal posted before a crash, by its marker: when found, the
 * proposal is `commented` as of that comment.
 * @param {Proposal} p a `commenting` proposal
 * @param {Context} ctx the context
 * @returns {Promise<boolean>} true when the comment was there
 */
async function ownComment(p, ctx) {
    const n = p.target.split(":")[1];
    const { body } = await ctx.gitHub.get(`repos/${ctx.repo}/issues/${n}/comments?per_page=100`, { fresh: true });
    const mark = `${OWN_MARK} proposal=${p.target} -->`;
    const found = (Array.isArray(body) ? body : []).find(
        (c) => c.user?.login === ctx.login && String(c.body ?? "").includes(mark),
    );
    if (!found) return false;
    Object.assign(p, { status: "commented", commentedAt: found.created_at, commentId: found.id, presentDays: 0 });
    p.dryRun = false;
    return true;
}

/**
 * Watches a target githerd closed for real, for 30 days: if it is open again and the owner's
 * account reopened it in an event no worker wrote, the target is vetoed (design section 3: "Agent
 * closed an issue the owner reopens"), so it is never proposed or closed again. A reopen by anyone
 * else ends the watch without a veto.
 * @param {any} state the daemon state
 * @param {Proposal} p a closed proposal
 * @param {Context} ctx the context
 */
async function watchReopen(state, p, ctx) {
    if (p.dryRun || p.watched === false || !p.closedAt) return;
    if (ctx.now.getTime() - Date.parse(p.closedAt) > WATCH_MS) {
        p.watched = false;
        return;
    }
    const n = p.target.split(":")[1];
    try {
        const { body } = await ctx.gitHub.get(`repos/${ctx.repo}/issues/${n}`);
        if (body?.state !== "open") return;
        const events = (await ctx.gitHub.get(`repos/${ctx.repo}/issues/${n}/events?per_page=100`)).body;
        const reopen = (Array.isArray(events) ? events : []).findLast((e) => e.event === "reopened");
        p.watched = false;
        const isWorker = ctx.isWorkerWrite ?? (() => false);
        if (!reopen || reopen.actor?.login !== ctx.login || isWorker(p.target, reopen.created_at)) return;
        veto(state, p.target, { by: "owner", reason: "the owner reopened it", at: reopen.created_at });
        await ctx.ledger({ kind: "veto", target: p.target, by: "owner", reason: "the owner reopened it" });
    } catch (err) {
        p.lastError = /** @type {Error} */ (err).message;
    }
}

/**
 * Reads the target; one that is no longer open ends the proposal.
 * @param {Proposal} p the proposal
 * @param {Context} ctx the context
 * @param {boolean} fresh skip the ETag (right before the close)
 * @returns {Promise<boolean>} true when it is still open
 */
async function stillOpen(p, ctx, fresh) {
    const n = p.target.split(":")[1];
    const { body } = await ctx.gitHub.get(`repos/${ctx.repo}/issues/${n}`, { fresh });
    if (body?.state === "open") return true;
    Object.assign(p, { status: "ended", reason: `${p.target} was closed by someone else` });
    return false;
}

/**
 * Looks for the owner's objection: a comment by the owner's login after the proposal comment that
 * githerd did not post and no worker wrote. An objection vetoes the target.
 * @param {any} state the daemon state
 * @param {Proposal} p a commented proposal
 * @param {Context} ctx the context
 * @param {boolean} fresh skip the ETag (right before the close)
 * @returns {Promise<boolean>} true when the owner objected
 */
async function objected(state, p, ctx, fresh) {
    const n = p.target.split(":")[1];
    const since = /** @type {string} */ (p.commentedAt);
    const { body } = await ctx.gitHub.get(`repos/${ctx.repo}/issues/${n}/comments?since=${since}&per_page=100`, {
        fresh,
    });
    const isWorker = ctx.isWorkerWrite ?? (() => false);
    const objection = (Array.isArray(body) ? body : []).find(
        (c) =>
            c.user?.login === ctx.login &&
            c.id !== p.commentId &&
            c.created_at > since &&
            !String(c.body ?? "").includes(OWN_MARK) &&
            !isWorker(p.target, c.created_at),
    );
    if (!objection) return false;
    veto(state, p.target, { by: "owner", reason: `the owner commented on ${p.target}`, at: objection.created_at });
    return true;
}
