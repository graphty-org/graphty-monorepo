/**
 * Landing slots: a big pull request lands before the pull requests that change the same files.
 *
 * A pull request that changes many files (or many baseline images) conflicts with master again by
 * the time it reaches the merge queue, is dequeued, and the cycle repeats. A landing slot breaks
 * the cycle. Each reconcile, `landingSlots` gives a slot to every pull request into the default
 * branch that is big (`config.landing`: `minFiles` changed files, or `minBaselines` files under
 * `visual-baselines/`) or carries the owner's `githerd:landing` label, AND is ready (`notReady`):
 * the owner's, not a draft, not held, its images approved (no reject, no visual review waiting) and
 * no required check failing; a conflict and pending checks are allowed, since a conflicting head
 * runs no CI. Slots go one per disjoint set of files: a candidate that shares a file with a holder
 * waits for it. A holder keeps its slot while the visual review waits again after master was merged
 * in (its approved images went stale), and loses it on a reject, a failing check, a draft, a hold,
 * or when it merges or closes. Nothing ends on a clock.
 *
 * While a pull request holds a slot:
 * - `prWork` (queue.mjs) gives it a `pr` job at once when it conflicts or is behind, ordered just
 *   after the master incidents (`tier`), whose text says how to merge master in (job-text.mjs);
 * - `labelSlots` gives it `queue:next` (write group `upkeep`), and takes the label off again when
 *   the slot ends, only when githerd put it there;
 * - every other open pull request that shares a file with it gets `githerd/merge` failure
 *   (decision line 2, `noHold` in prs.mjs) until the slot ends. A red master's fix is never held.
 *
 * The result is kept in `state.landing` for the board.
 */

import { byOwner } from "./board.mjs";
import { GitHubError } from "./github.mjs";
import { CRITICAL } from "./master-fix.mjs";
import { mergeHeld, ownerLabel } from "./queue.mjs";

/** The owner's label that grants a slot at any size (honored only when the owner applied it). */
export const LANDING = "githerd:landing";
/** The label Mergify's priority rules put ahead of ordinary pull requests (.mergify.yml). */
export const QUEUE_NEXT = "queue:next";
const BASELINES = "visual-baselines/";
/** The write group of the label writes. */
const GROUP = "upkeep";

/**
 * @typedef {{files: string[] | null, filesTruncated?: boolean}} Head a head's changed files
 * @typedef {{since: string, why: string}} Holder a slot holder: since when, and why it got one
 * @typedef {{holder: number, shared: number | null}} Held a pull request held behind a slot: the
 *   holder, and how many files they share (null when a listing was truncated, so any may)
 * @typedef {{holders: Record<string, Holder>, held: Record<string, Held>,
 *   labelled?: Record<string, "sent" | "would-do" | "present">, holds?: string}} Landing
 */

/**
 * Why a head counts as big, or null: enough changed files, enough baseline images, or a listing
 * too long to read.
 * @param {Head | undefined} head the head's files
 * @param {{minFiles: number, minBaselines: number}} cfg the thresholds
 * @returns {string | null} the words
 */
export function bigness(head, cfg) {
    if (!head?.files) return null;
    if (head.filesTruncated) return "big: its file list is too long to read";
    const baselines = head.files.filter((f) => f.startsWith(BASELINES)).length;
    if (head.files.length < cfg.minFiles && baselines < cfg.minBaselines) return null;
    return `big: ${head.files.length} files, ${baselines} baseline images`;
}

/**
 * Why a pull request cannot hold a slot, or null when it can.
 * @param {any} rec its record (prs.mjs PrRecord)
 * @param {{state: any, branch: string, holding: boolean}} ctx the daemon state, the default branch,
 *   and whether it holds a slot now (a holder keeps it through a visual review gone stale)
 * @returns {string | null} the reason
 */
export function notReady(rec, { state, branch, holding }) {
    if (!byOwner(state, rec.author)) return "not the owner's";
    if (rec.draft) return "draft";
    if (rec.baseRef !== branch) return "stacked";
    if (mergeHeld(rec)) return "held from merging";
    if (rec.ownerRejected) return "owner rejected images";
    if (rec.captureFailed?.length) return "visual capture failed";
    if (rec.ownerGate && !holding) return "waiting on the owner's visual review";
    // Under the owner gate the one failing required check is the visual review itself.
    const failing = rec.ownerGate
        ? (rec.queueFailing ?? [])
        : Object.keys(rec.required ?? {}).filter((k) => rec.required[k] === "FAILURE");
    return failing.length ? `failing: ${failing.join(", ")}` : null;
}

/**
 * How many files two heads share: null when either listing was truncated (any may be shared).
 * @param {Head} a one head
 * @param {Head} b the other
 * @returns {number | null} the count
 */
function shared(a, b) {
    if (a.filesTruncated || b.filesTruncated) return null;
    const mine = new Set(a.files);
    return (b.files ?? []).filter((f) => mine.has(f)).length;
}

/**
 * The slots and the holds, from this reconcile's facts. Current holders keep their place first
 * (oldest slot first), then the owner's grants, then the oldest pull request; each takes a slot
 * unless it shares a file with one already given.
 * @param {any} state the daemon state: `prs`, `mergeGate.heads`, the last `landing`, `master.fixPrs`
 * @param {{config: any, branch: string, now: string}} ctx the normalized config, the default
 *   branch, the reconcile's time
 * @returns {Landing} the slots and the holds
 */
export function landingSlots(state, { config, branch, now }) {
    const heads = state.mergeGate?.heads ?? {};
    const before = state.landing?.holders ?? {};
    const prs = Object.entries(state.prs ?? {});
    const candidates = [];
    for (const [n, rec] of prs) {
        const holding = n in before;
        const granted = ownerLabel(rec, LANDING);
        const why = granted ? `the owner's ${LANDING} label` : bigness(heads[n], config.landing);
        if (!why || !heads[n]?.files || notReady(rec, { state, branch, holding })) continue;
        candidates.push({ n, why, granted, since: holding ? before[n].since : now, createdAt: rec.createdAt ?? "~" });
    }
    candidates.sort(
        (a, b) =>
            Number(!(a.n in before)) - Number(!(b.n in before)) ||
            a.since.localeCompare(b.since) ||
            Number(b.granted) - Number(a.granted) ||
            a.createdAt.localeCompare(b.createdAt) ||
            Number(a.n) - Number(b.n),
    );
    /** @type {Record<string, Holder>} */
    const holders = {};
    for (const c of candidates) {
        if (Object.keys(holders).some((h) => shared(heads[h], heads[c.n]) !== 0)) continue;
        holders[c.n] = { since: c.since, why: c.why };
    }
    const fixes = new Set((state.master?.fixPrs ?? []).map((/** @type {any} */ f) => String(f.pr)));
    /** @type {Record<string, Held>} */
    const held = {};
    for (const [n, rec] of prs) {
        if (n in holders || !heads[n]?.files || rec.baseRef !== branch) continue;
        if (fixes.has(n) || (rec.labels ?? []).includes(CRITICAL)) continue;
        for (const h of Object.keys(holders)) {
            const count = shared(heads[h], heads[n]);
            if (count === 0) continue;
            held[n] = { holder: Number(h), shared: count };
            break;
        }
    }
    return { holders, held };
}

/**
 * The `githerd/merge` hold of each held pull request, by number (prs.mjs MergeContext).
 * @param {Landing | undefined} landing the slots
 * @returns {Record<string, string>} the hold's words
 */
export function landingHolds(landing) {
    return Object.fromEntries(
        Object.entries(landing?.held ?? {}).map(([n, h]) => {
            const files = h.shared === null ? "may change the same files" : `shares ${h.shared} files with it`;
            return [n, `held: landing slot #${h.holder} lands first; this pull request ${files}`];
        }),
    );
}

/**
 * Puts `queue:next` on each slot holder, and takes it off a pull request whose slot ended when
 * githerd put it there. A label someone else put there is left alone. Every write is in the
 * `upkeep` group, so in dry-run each is a would-do line, once.
 * @param {{write: Function, acting: (group: string) => boolean}} github the client
 * @param {string} repo `owner/name`
 * @param {any} state the daemon state; `state.landing.labelled` is updated in place
 * @returns {Promise<string[]>} the refusals
 */
export async function labelSlots(github, repo, state) {
    const landing = state.landing;
    const labelled = (landing.labelled ??= {});
    const acting = github.acting(GROUP);
    const errors = [];
    for (const n of Object.keys(landing.holders)) {
        const has = (state.prs?.[n]?.labels ?? []).includes(QUEUE_NEXT);
        const was = labelled[n];
        if (!was && has) labelled[n] = "present";
        if (labelled[n] === "present" || was === "sent" || (was === "would-do" && !acting)) continue;
        const at = `repos/${repo}/issues/${n}/labels`;
        try {
            const res = await github.write(
                "POST",
                at,
                { labels: [QUEUE_NEXT] },
                {
                    group: GROUP,
                    check: { path: at, expect: [{ name: QUEUE_NEXT }] },
                    retry: true,
                    fields: { situation: "landing-slot", pr: Number(n) },
                },
            );
            labelled[n] = res.performed ? "sent" : "would-do";
        } catch (err) {
            if (!(err instanceof GitHubError)) throw err;
            errors.push(err.message);
        }
    }
    for (const [n, how] of Object.entries(labelled)) {
        if (n in landing.holders) continue;
        const rec = state.prs?.[n];
        if (how === "sent" && rec?.labels?.includes(QUEUE_NEXT)) {
            const at = `repos/${repo}/issues/${n}/labels`;
            try {
                await github.write("DELETE", `${at}/${encodeURIComponent(QUEUE_NEXT)}`, undefined, {
                    group: GROUP,
                    check: { path: at, lacks: [{ name: QUEUE_NEXT }] },
                    retry: true,
                    fields: { situation: "landing-slot-ended", pr: Number(n) },
                });
            } catch (err) {
                if (!(err instanceof GitHubError)) throw err;
                errors.push(err.message);
                continue;
            }
        }
        delete labelled[n];
    }
    return errors;
}

/**
 * The board's lines: each slot holder and the pull requests waiting behind it, with why.
 * @param {any} state the daemon state
 * @returns {string[]} the lines, empty when no pull request holds a slot
 */
export function landingLines(state) {
    const landing = state?.landing;
    const holders = Object.entries(landing?.holders ?? {});
    if (!holders.length) return [];
    const lines = [`LANDING SLOTS (${holders.length}):${landing.holds ? ` ${landing.holds}` : ""}`];
    for (const [n, h] of holders) {
        lines.push(`  #${n} holds a slot since ${h.since.slice(0, 16).replace("T", " ")} UTC -- ${h.why}`);
        for (const [m, w] of Object.entries(landing.held ?? {})) {
            if (w.holder !== Number(n)) continue;
            const files = w.shared === null ? "may share files (a file list is truncated)" : `shares ${w.shared} files`;
            lines.push(`    #${m} waits behind it -- ${files}`);
        }
    }
    return lines;
}
