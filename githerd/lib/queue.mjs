/**
 * The work queue (design section 10.2): one deterministic order for everything githerd and the
 * sessions could work on, each item with a one-line reason that explains its place.
 *
 * Across kinds, finish before starting: a red master, then a stuck release, then the owner's open
 * PRs that need work, then issues (unlabeled ones first, since they cannot be ranked). PRs go
 * oldest first, a quick unblocker ahead of slower work; a stacked PR waits for its base, and a PR
 * waiting on the owner is listed on the owner's waiting list and not worked. Issues go by
 * priority (aged up one level per `backlog.agingDays` untouched, never above the second level),
 * then bugs first, then oldest, then lower effort. `githerd:next` moves an item to the front of its
 * kind and `githerd:skip` removes it, but only when the owner applied the label (`ownerLabels`,
 * checked by the daemon against the issue's events).
 *
 * Only the owner's issues and PRs are in it. It changes nothing in the state.
 */

import { byOwner, holderAlive } from "./board.mjs";

const DAY = 24 * 60 * 60 * 1000;
/** Labels that keep an issue out of the queue, besides every `needs-*` label. */
export const NOT_READY = ["blocked", "research", "in-progress"];
/** Labels that mark a breaking change, held for the next major. */
const BREAKING = ["breaking", "breaking-change", "breaking-hold"];
/** The owner's override labels. */
export const NEXT = "githerd:next";
export const SKIP = "githerd:skip";
/** The effort label whose backlog runs get the `backlog-high` model and caps. */
const HIGH_EFFORT = "effort:high";
const DEFAULT_AGING_DAYS = 60;
const DEFAULT_WIP_CAP = 3;

/**
 * @typedef {object} QueueItem
 * @property {"master" | "release" | "pr" | "triage" | "issue"} kind what sort of work
 * @property {string} target the claim target: `master`, `task:release`, `pr:N` or `issue:N`
 * @property {string} reason one line that explains the item's place
 * @property {string} [waiting] why it is listed but not worked yet
 * @property {"high"} [effort] an effort:high issue
 */

/**
 * Whether the record carries `label` and the owner is the one who applied it.
 * @param {any} rec an issue or PR record
 * @param {string} label the label
 * @returns {boolean} true when the owner applied it
 */
function ownerLabel(rec, label) {
    return (rec.labels ?? []).includes(label) && (rec.ownerLabels ?? []).includes(label);
}

/**
 * Whether an issue lacks a type, priority or effort label from a configured set.
 * @param {string[]} labels the issue's labels
 * @param {any} config the normalized config
 * @returns {boolean} true when one is missing
 */
export function missingLabels(labels, config) {
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
export function openPrFor(state, number) {
    const hit = Object.entries(state.prs ?? {}).find(
        ([, p]) =>
            (p.references ?? []).includes(number) ||
            new RegExp(`#${number}(?!\\d)`).test(p.title ?? "") ||
            p.headRef === `githerd/issue-${number}`,
    );
    return hit ? Number(hit[0]) : null;
}

/**
 * githerd's own open work: its open PRs plus its running backlog runs, held under `backlog.wipCap`.
 * @param {any} state the daemon state
 * @returns {number} the count
 */
function openWork(state) {
    const prs = Object.values(state.prs ?? {}).filter((p) => p.headRef?.startsWith("githerd/")).length;
    const runs = Object.values(state.runs ?? {}).filter((r) => r.kind === "backlog" && r.status === "running").length;
    return prs + runs;
}

/**
 * Who already has a target: a live claim, a running githerd run, or a live session on a PR's
 * head branch.
 * @param {any} state the daemon state
 * @param {string} target the target
 * @param {Date} now the current time
 * @param {Date} startedAt when the daemon started
 * @returns {string | null} the holder's name, or null when nobody has it
 */
export function takenBy(state, target, now, startedAt) {
    const claim = state.claims?.[target];
    if (claim && Date.parse(claim.expiresAt) > now.getTime() && holderAlive(state, claim.holder, now, startedAt)) {
        return claim.holderName ?? claim.holder;
    }
    const run = Object.entries(state.runs ?? {}).find(
        ([, r]) => r.status === "running" && [r.target, ...(r.batch ?? [])].includes(target),
    );
    if (run) return run[0];
    const head = target.startsWith("pr:") ? state.prs?.[target.slice(3)]?.headRef : null;
    const session = Object.entries(state.sessions ?? {}).find(
        ([id, s]) => head && s.branch === head && holderAlive(state, id, now, startedAt),
    );
    return session ? (session[1].name ?? session[0]) : null;
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
 * A label without its `group:` prefix.
 * @param {string} label the label
 * @returns {string} the name
 */
const bare = (label) => label.replace(/^[^:]*:/, "");

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
 * What a PR needs from a run or a session, or null when it is landing on its own.
 * @param {any} rec the PR record
 * @returns {string | null} the need
 */
function prNeed(rec) {
    const failing = failingRequired(rec);
    if (rec.ownerRejected) return "owner rejected images";
    if (failing.length && !rec.ownerGate) return `required check failing: ${failing.join(", ")}`;
    if ((rec.conflictSightings ?? 0) >= 2) return "conflicting";
    return null;
}

/**
 * A quick unblocker for a failing PR: a branch update from a verified-green master, or a rerun of
 * checks that all have a known flake mechanism (`state.flakes`, recorded by `githerd_rerun_failed`).
 * @param {any} rec the PR record
 * @param {any} state the daemon state
 * @returns {string | null} what to do, or null
 */
function quickFix(rec, state) {
    if (!failingRequired(rec).length) return null;
    const m = state.master ?? {};
    if (m.verdict === "green" && m.fixedAt && rec.failingStartedAt && rec.failingStartedAt < m.fixedAt) {
        return "quick: update the branch from green master";
    }
    const own = (rec.failingChecks ?? []).filter((/** @type {string} */ c) => !(c in (rec.required ?? {})));
    if (own.length && own.every((/** @type {string} */ c) => state.flakes?.[c])) {
        return `quick: rerun ${own.join(", ")}, a known flake`;
    }
    return null;
}

/**
 * An issue's rank: its priority after aging, whether it is a bug, and its effort.
 * @param {any} issue the issue record
 * @param {any} config the normalized config
 * @param {Date} now the current time
 * @returns {{priority: number, bug: boolean, effort: number, text: string}} the rank and its words
 */
function rankIssue(issue, config, now) {
    const labels = issue.labels ?? [];
    const priorities = config.labels?.priorities ?? [];
    const efforts = config.labels?.efforts ?? [];
    const base = priorities.findIndex((p) => labels.includes(p));
    const agingDays = config.backlog?.agingDays ?? DEFAULT_AGING_DAYS;
    const untouched = Math.floor((now.getTime() - Date.parse(issue.updatedAt ?? now.toISOString())) / DAY);
    // Aging never lifts past the second level: only a person makes something critical.
    const priority = Math.max(base - Math.floor(untouched / agingDays), Math.min(base, 1));
    const bug = labels.includes("bug");
    const type = bug ? "bug" : (config.labels?.types ?? []).find((t) => labels.includes(t));
    const aged = priority < base ? ` (aged up from ${bare(priorities[base])}, ${untouched} days untouched)` : "";
    const effort = efforts.find((e) => labels.includes(e));
    return {
        priority,
        bug,
        // Efforts are listed largest first, so a larger index is less work.
        effort: efforts.indexOf(/** @type {string} */ (effort)),
        // A repository without priority labels ranks every issue alike.
        text: `${base === -1 ? "unprioritized" : `${bare(priorities[priority])}-priority`} ${type ?? "issue"}${aged}, ${age(now, issue.createdAt)}${effort ? `, ${effort}` : ""}`,
    };
}

/**
 * The ordered queue and the owner's waiting list of PRs.
 * @param {{state: any, config: any, now: Date}} ctx the state, the normalized config and the clock
 * @returns {{items: QueueItem[], ownerWaiting: QueueItem[]}} the queue, and the PRs that wait on
 *   the owner, oldest first
 */
export function workQueue({ state, config, now }) {
    /** @type {QueueItem[]} */
    const items = [];
    const red = state.master?.verdict === "red";
    const front = (/** @type {boolean} */ next, /** @type {string[]} */ words) =>
        [...(next ? [`${NEXT} (owner)`] : []), ...words].join(", ");

    const incident = Object.values(state.incidents ?? {}).find((i) => i.status === "open");
    if (red && incident) {
        const since = state.master.since ? ` since ${state.master.since.slice(11, 16)} UTC` : "";
        items.push({ kind: "master", target: "master", reason: `master is red${since} (${incident.id})` });
    }

    const release = Object.values(state.escalations ?? {}).find(
        (e) =>
            !e.resolvedAt &&
            (e.kind === "release-failed" || e.kind === "release-stalled" || e.key.startsWith("lane-stuck:")),
    );
    if (release) items.push({ kind: "release", target: "task:release", reason: `stuck release: ${release.summary}` });

    /** @typedef {{number: number, createdAt: string | null, item: QueueItem}} Sortable */
    /** @type {(Sortable & {next: boolean, quick: boolean})[]} */
    const prs = [];
    /** @type {Sortable[]} */
    const ownerWaiting = [];
    for (const [n, rec] of Object.entries(state.prs ?? {})) {
        if (!byOwner(state, rec.author) || rec.draft || ownerLabel(rec, SKIP)) continue;
        const sortable = { number: Number(n), createdAt: rec.createdAt ?? null };
        const wait = ownerWait(n, rec, state);
        if (wait) {
            ownerWaiting.push({
                ...sortable,
                item: { kind: "pr", target: `pr:${n}`, reason: `${wait}, ${age(now, rec.createdAt)}` },
            });
            continue;
        }
        const need = prNeed(rec);
        if (!need) continue;
        const quick = quickFix(rec, state);
        const next = ownerLabel(rec, NEXT);
        /** @type {QueueItem} */
        const item = {
            kind: "pr",
            target: `pr:${n}`,
            reason: front(next, [...(quick ? [quick] : []), need, `open PR, ${age(now, rec.createdAt)}`]),
        };
        if (rec.stackedOn) item.waiting = `stacked: waits for #${rec.stackedOn}`;
        else if (red) item.waiting = "held: master is red";
        prs.push({ ...sortable, next, quick: Boolean(quick), item });
    }
    prs.sort((a, b) => Number(b.next) - Number(a.next) || Number(b.quick) - Number(a.quick) || oldest(a, b));
    ownerWaiting.sort(oldest);

    const cap = config.backlog?.wipCap ?? DEFAULT_WIP_CAP;
    const wip = openWork(state);
    /** @type {(Sortable & {next: boolean})[]} */
    const triage = [];
    /** @type {(Sortable & {next: boolean, priority: number, bug: boolean, effort: number})[]} */
    const ranked = [];
    for (const [n, issue] of Object.entries(state.issues?.byNumber ?? {})) {
        const labels = issue.labels ?? [];
        if (issue.state !== "open" || !byOwner(state, issue.author) || ownerLabel(issue, SKIP)) continue;
        if (labels.some((l) => NOT_READY.includes(l) || l.startsWith("needs-") || BREAKING.includes(l))) continue;
        const next = ownerLabel(issue, NEXT);
        const sortable = { number: Number(n), createdAt: issue.createdAt ?? null, next };
        if (missingLabels(labels, config)) {
            const reason = front(next, ["unlabeled: triage it so it can be ranked", age(now, issue.createdAt)]);
            triage.push({ ...sortable, item: { kind: "triage", target: `issue:${n}`, reason } });
            continue;
        }
        const rank = rankIssue(issue, config, now);
        /** @type {QueueItem} */
        const item = { kind: "issue", target: `issue:${n}`, reason: front(next, [rank.text]) };
        if (labels.includes(HIGH_EFFORT)) item.effort = "high";
        const pr = openPrFor(state, Number(n));
        if (pr) item.waiting = `PR #${pr} is open for it`;
        else if (red) item.waiting = "held: master is red";
        else if (wip >= cap) item.waiting = `githerd has ${wip} PRs or runs open, cap ${cap}: landing PRs first`;
        ranked.push({ ...sortable, ...rank, item });
    }
    triage.sort((a, b) => Number(b.next) - Number(a.next) || oldest(a, b));
    ranked.sort(
        (a, b) =>
            Number(b.next) - Number(a.next) ||
            a.priority - b.priority ||
            Number(b.bug) - Number(a.bug) ||
            String(a.createdAt ?? "~").localeCompare(String(b.createdAt ?? "~")) ||
            b.effort - a.effort ||
            a.number - b.number,
    );

    items.push(...[...prs, ...triage, ...ranked].map((x) => x.item));
    return { items, ownerWaiting: ownerWaiting.map((x) => x.item) };
}
