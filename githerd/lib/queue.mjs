/**
 * What githerd could work on, and in what order (design section 5.4). `jobs.mjs` turns the facts
 * below into job records; `jobOrder` orders the queued ones, each with a one-line reason.
 *
 * The facts: which of the owner's open pull requests need work and which wait on the owner, and
 * which of the owner's open issues are ready, unlabeled ones (to triage) apart from ranked ones.
 * Issues rank by priority (aged up one level per `backlog.agingDays` untouched, never above the
 * second level), then bugs first, then oldest. `githerd:next` moves an item to the front of its
 * kind and `githerd:skip` removes it, but only when the owner applied the label (`ownerLabels`,
 * checked by the daemon against the issue's events).
 *
 * Only the owner's issues and pull requests are in it. Nothing here changes the state.
 */

import { byOwner } from "./board.mjs";

const DAY = 24 * 60 * 60 * 1000;
/** Labels that keep an issue out of the queue, besides every `needs-*` label. */
const NOT_READY = new Set(["blocked", "research", "in-progress"]);
/** Labels that mark a breaking change, held for the next major. */
const BREAKING = new Set(["breaking", "breaking-change", "breaking-hold"]);
/** The owner's override labels. */
export const NEXT = "githerd:next";
export const SKIP = "githerd:skip";
const DEFAULT_AGING_DAYS = 60;

/**
 * Whether the record carries `label` and the owner is the one who applied it.
 * @param {any} rec an issue or PR record
 * @param {string} label the label
 * @returns {boolean} true when the owner applied it
 */
export function ownerLabel(rec, label) {
    return (rec.labels ?? []).includes(label) && (rec.ownerLabels ?? []).includes(label);
}

/**
 * Whether an issue lacks a type, priority or effort label from a configured set.
 * @param {string[]} labels the issue's labels
 * @param {any} config the normalized config
 * @returns {boolean} true when one is missing
 */
function missingLabels(labels, config) {
    const { types = [], priorities = [], efforts = [] } = config.labels ?? {};
    return [types, priorities, efforts].some((set) => set.length > 0 && !labels.some((l) => set.includes(l)));
}

/**
 * The open PR that is already working on an issue: it closes it, names it in its title, or is its
 * githerd branch.
 * @param {any} state the daemon state
 * @param {number} number the issue
 * @returns {number | null} the PR number, or null
 */
function openPrFor(state, number) {
    const hit = Object.entries(state.prs ?? {}).find(
        ([, p]) =>
            (p.references ?? []).includes(number) ||
            new RegExp(String.raw`#${number}(?!\d)`).test(p.title ?? "") ||
            p.headRef === `githerd/issue-${number}`,
    );
    return hit ? Number(hit[0]) : null;
}

/**
 * "41 days old", from a creation time.
 * @param {Date} now the current time
 * @param {string | null | undefined} iso the creation time
 * @returns {string} the age
 */
function age(now, iso) {
    if (!iso) return "age unknown";
    const days = Math.floor((now.getTime() - Date.parse(iso)) / DAY);
    return `${days} day${days === 1 ? "" : "s"} old`;
}

/**
 * Orders by creation time, oldest first; a record without one goes last, then by number.
 * @param {{createdAt?: string | null, number: number}} a one item
 * @param {{createdAt?: string | null, number: number}} b another
 * @returns {number} the comparison
 */
const oldest = (a, b) => String(a.createdAt ?? "~").localeCompare(String(b.createdAt ?? "~")) || a.number - b.number;

/**
 * The failing required checks of a PR.
 * @param {any} rec the PR record
 * @returns {string[]} their names
 */
const failingRequired = (rec) =>
    Object.entries(rec.required ?? {})
        .filter(([, v]) => v === "FAILURE")
        .map(([k]) => k);

/**
 * Why a PR waits on the owner, or null.
 * @param {string} number the PR number
 * @param {any} rec the PR record
 * @param {any} state the daemon state
 * @returns {string | null} the reason
 */
function ownerWait(number, rec, state) {
    if (rec.ownerGate && !rec.ownerRejected) return "waiting on owner: visual review";
    if (rec.breaking || (rec.labels ?? []).includes("breaking-hold")) return "waiting on owner: held for a major";
    const decision = Object.values(state.escalations ?? {}).some(
        (e) => !e.resolvedAt && e.kind === "decision" && e.target === `pr:${number}`,
    );
    return decision ? "waiting on owner: a decision" : null;
}

/**
 * What one of the owner's open pull requests needs from a worker (design 5.1, `pr` jobs): an own
 * failing required check, a conflict seen twice, or an owner's visual reject. Null when it is
 * landing on its own, waits on the owner, is a draft, is stacked on another pull request, or is
 * not the owner's.
 * @param {string} number the PR number
 * @param {any} rec the PR record
 * @param {any} state the daemon state
 * @returns {string | null} the need
 */
export function prWork(number, rec, state) {
    if (!byOwner(state, rec.author) || rec.draft || rec.stackedOn) return null;
    if (ownerWait(number, rec, state)) return null;
    const failing = failingRequired(rec);
    if (rec.ownerRejected) return "owner rejected images";
    if (failing.length && !rec.ownerGate) return `required check failing: ${failing.join(", ")}`;
    // GitHub's answer of this poll, read again every poll: it clears as soon as GitHub says so.
    const github = rec.mergeState ?? rec.mergeable ?? "CONFLICTING";
    if ((rec.conflictSightings ?? 0) >= 2) return `conflicting with ${rec.baseRef ?? "its base"} (GitHub: ${github})`;
    return null;
}

/**
 * The owner's open pull requests that wait on him, oldest first, each with why.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @returns {{target: string, reason: string}[]} the list
 */
export function ownerWaitingPrs(state, now) {
    return Object.entries(state.prs ?? {})
        .filter(([, rec]) => byOwner(state, rec.author) && !rec.draft && !ownerLabel(rec, SKIP))
        .map(([n, rec]) => ({ number: Number(n), createdAt: rec.createdAt ?? null, wait: ownerWait(n, rec, state) }))
        .filter((p) => p.wait)
        .sort(oldest)
        .map((p) => ({ target: `pr:${p.number}`, reason: `${p.wait}, ${age(now, p.createdAt)}` }));
}

/**
 * An issue's rank: its priority after aging and whether it is a bug.
 * @param {any} issue the issue record
 * @param {any} config the normalized config
 * @param {Date} now the current time
 * @returns {{priority: number, bug: boolean}} the rank; priority is an index into the configured
 *   priorities, lower first, -1 for none
 */
function rankIssue(issue, config, now) {
    const labels = issue.labels ?? [];
    const priorities = config.labels?.priorities ?? [];
    const base = priorities.findIndex((p) => labels.includes(p));
    const agingDays = config.backlog?.agingDays ?? DEFAULT_AGING_DAYS;
    const untouched = Math.floor((now.getTime() - Date.parse(issue.updatedAt ?? now.toISOString())) / DAY);
    // Aging never lifts past the second level: only a person makes something critical.
    const priority = Math.max(base - Math.floor(untouched / agingDays), Math.min(base, 1));
    return { priority, bug: labels.includes("bug") };
}

/**
 * The owner's open issues that are ready: unlabeled ones (to triage), oldest first, and labeled
 * ones in rank order (design 5.4): `githerd:next` first, then priority, bug before other types,
 * oldest. An issue an open pull request already works on is left out of the ranked list.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @returns {{triage: number[], ranked: {number: number, priority: number, bug: boolean, next: boolean}[]}}
 *   the issue numbers
 */
export function readyIssues(state, config, now) {
    const triage = [];
    const ranked = [];
    for (const [n, issue] of Object.entries(state.issues?.byNumber ?? {})) {
        const labels = issue.labels ?? [];
        if (!issueReady(state, issue, labels)) continue;
        const sortable = { number: Number(n), createdAt: issue.createdAt ?? null, next: ownerLabel(issue, NEXT) };
        if (missingLabels(labels, config)) triage.push(sortable);
        else if (openPrFor(state, Number(n)) === null) ranked.push({ ...sortable, ...rankIssue(issue, config, now) });
    }
    triage.sort((a, b) => Number(b.next) - Number(a.next) || oldest(a, b));
    // A repository without priority labels ranks every issue alike (-1 sorts after the ranked ones).
    const p = (/** @type {number} */ x) => (x === -1 ? Infinity : x);
    ranked.sort(
        (a, b) =>
            Number(b.next) - Number(a.next) ||
            p(a.priority) - p(b.priority) ||
            Number(b.bug) - Number(a.bug) ||
            oldest(a, b),
    );
    return {
        triage: triage.map((t) => t.number),
        ranked: ranked.map(({ number, priority, bug, next }) => ({ number, priority, bug, next })),
    };
}

/**
 * Whether an issue may be queued: open, the owner's, not skipped, and no label that keeps it out.
 * @param {any} state the daemon state
 * @param {any} issue the issue record
 * @param {string[]} labels its labels
 * @returns {boolean} true when ready
 */
function issueReady(state, issue, labels) {
    if (issue.state !== "open" || !byOwner(state, issue.author) || ownerLabel(issue, SKIP)) return false;
    return !labels.some((l) => NOT_READY.has(l) || l.startsWith("needs-") || BREAKING.has(l));
}

// ---------------------------------------------------------------------------------------------
// The job queue order (design section 5.4): finish before starting.
// ---------------------------------------------------------------------------------------------

/** Issue priorities, most urgent first. */
const PRIORITIES = ["critical", "high", "medium", "low"];
/** Labels that keep an issue job out of the queue. */
const ISSUE_SKIP = new Set(["blocked", "needs-decision", "research"]);

/**
 * A queued job's tier in the order of design 5.4, and the words for it.
 * @param {import("./board.mjs").Job} job the job
 * @returns {[number, string]} the tier (lower first) and its words
 */
function tier(job) {
    const scope = job.facts?.scope;
    switch (job.kind) {
        case "incident":
            if (scope === "master" || scope === "release") return [1, `${scope} incident`];
            if (scope === "shared") return [1.5, "shared incident"];
            return [8.5, "low-priority incident on a non-gating workflow"];
        case "review":
            return [2, "review"];
        case "pr":
            return [3, "pull request"];
        case "title":
            return [4, "pull request title"];
        case "triage":
            return scope === "new" ? [5, "triage of new issues"] : [8, `triage ${scope ?? "refresh"}`];
        case "major":
            return [6, "major the owner approved"];
        default:
            return [7, "issue"];
    }
}

/**
 * Why a queued job is skipped right now, or null.
 * @param {import("./board.mjs").Job} job the job
 * @param {{reviewQueueFull?: boolean}} ctx the review queue at its limit
 * @returns {string | null} the reason
 */
function skipped(job, ctx) {
    if (job.facts?.skip) return `${SKIP} (owner)`;
    if (job.kind !== "issue") return null;
    const label = (job.facts?.labels ?? []).find((/** @type {string} */ l) => ISSUE_SKIP.has(l));
    if (label) return `labelled ${label}`;
    if (ctx.reviewQueueFull && job.facts?.storybook)
        return "the owner's review queue is full and it touches a Storybook";
    return null;
}

/**
 * An issue job's place among issues: in an open order first, then priority, bug before other
 * types.
 * @param {import("./board.mjs").Job} job the job
 * @returns {{order: number, priority: number, bug: number}} lower first
 */
function issueRank(job) {
    const p = PRIORITIES.indexOf(job.priority ?? "");
    return {
        order: job.facts?.order ?? Infinity,
        priority: p === -1 ? PRIORITIES.length : p,
        bug: job.facts?.bug ? 0 : 1,
    };
}

/**
 * An issue job's type in words.
 * @param {any} facts the job's facts
 * @returns {string} "bug" or "issue"
 */
const issueType = (facts) => (facts.bug ? "bug" : "issue");

/**
 * The reason line for a queued job.
 * @param {import("./board.mjs").Job} job the job
 * @param {string} words its tier's words
 * @returns {string} the reason
 */
function jobReason(job, words) {
    const f = job.facts ?? {};
    const parts = [
        f.next && `${NEXT} (owner)`,
        job.kind === "issue" && Number.isFinite(f.order) && `in open order, position ${f.order + 1}`,
        job.kind === "issue" ? `${job.priority ?? "unprioritized"} ${issueType(f)}` : words,
        f.since && `${job.kind === "incident" ? "red" : "open"} since ${f.since}`,
    ];
    return parts.filter(Boolean).join(", ");
}

/**
 * The queued jobs in the order of design 5.4, each with its one-line reason, and the queued jobs
 * skipped right now with why. Within a tier: the owner's `githerd:next` first, then for issues the
 * open order, priority and bug before other types, then oldest (`facts.since`: red since for an
 * incident, opened for a pull request or issue), then id.
 * @param {Record<string, import("./board.mjs").Job>} jobs the job records
 * @param {{reviewQueueFull?: boolean}} [ctx] what limits apply now
 * @returns {{items: {job: string, reason: string}[], skipped: {job: string, reason: string}[]}} the order
 */
export function jobOrder(jobs, ctx = {}) {
    const items = [];
    const skips = [];
    for (const job of Object.values(jobs)) {
        if (job.state !== "queued") continue;
        const skip = skipped(job, ctx);
        if (skip) skips.push({ job: job.id, reason: skip });
        else items.push({ job, tier: tier(job) });
    }
    items.sort((a, b) => {
        const ra = issueRank(a.job);
        const rb = issueRank(b.job);
        return (
            a.tier[0] - b.tier[0] ||
            Number(Boolean(b.job.facts?.next)) - Number(Boolean(a.job.facts?.next)) ||
            ra.order - rb.order ||
            ra.priority - rb.priority ||
            ra.bug - rb.bug ||
            String(a.job.facts?.since ?? "~").localeCompare(String(b.job.facts?.since ?? "~")) ||
            a.job.id.localeCompare(b.job.id)
        );
    });
    return { items: items.map((x) => ({ job: x.job.id, reason: jobReason(x.job, x.tier[1]) })), skipped: skips };
}
