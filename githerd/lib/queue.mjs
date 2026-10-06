/**
 * What githerd could work on, and in what order (design section 5.4). `jobs.mjs` turns the facts
 * below into job records; `jobOrder` orders the queued ones, each with a one-line reason.
 *
 * The facts: which of the owner's open pull requests need work and which wait on the owner, and
 * which of the owner's open issues are ready, unlabeled ones (to triage) apart from ranked ones.
 * Issues rank by priority (aged up one level per `backlog.agingDays` untouched, never above the
 * second level), then bugs first, then low effort before medium before high, then oldest. `githerd:next` moves an item to the front of its
 * kind and `githerd:skip` removes it, but only when the owner applied the label (`ownerLabels`,
 * checked by the daemon against the issue's events).
 *
 * Only the owner's issues and pull requests are in it. Nothing here changes the state.
 */

import { byOwner, TERMINAL } from "./board.mjs";

const DAY = 24 * 60 * 60 * 1000;
/** Labels that keep an issue out of the queue, besides every `needs-*` label. */
const NOT_READY = new Set(["blocked", "research", "in-progress"]);
/** Labels that mark a breaking change, held for the next major. */
const BREAKING = new Set(["breaking", "breaking-change", "breaking-hold"]);
/** The owner's override labels. */
export const NEXT = "githerd:next";
export const SKIP = "githerd:skip";
const DEFAULT_AGING_DAYS = 60;
/** Issue efforts, cheapest first: within a priority and type, cheap fixes go first. */
const EFFORTS = ["low", "medium", "high"];
const MINUTE = 60 * 1000;
/** How long githerd waits for a session to answer that a failed pull request is its own. */
const DEFAULT_ASK_MINUTES = 10;
/** The committer of GitHub's own commits (update-branch, Mergify's updates): no session's push. */
const GITHUB_COMMITTER = "noreply@github.com";

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
 * The label kinds an issue lacks: each of type, priority and effort with a configured set that
 * none of its labels is from.
 * @param {string[]} labels the issue's labels
 * @param {any} config the normalized config
 * @returns {("type" | "priority" | "effort")[]} the missing kinds, empty when none is missing
 */
export function missingLabelKinds(labels, config) {
    const { types = [], priorities = [], efforts = [] } = config.labels ?? {};
    const sets = /** @type {const} */ ([
        ["type", types],
        ["priority", priorities],
        ["effort", efforts],
    ]);
    return sets.filter(([, set]) => set.length > 0 && !labels.some((l) => set.includes(l))).map(([kind]) => kind);
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
export const failingRequired = (rec) =>
    Object.entries(rec.required ?? {})
        .filter(([, v]) => v === "FAILURE")
        .map(([k]) => k);

/**
 * What githerd asks the sessions about before it offers a pull request as a job (design 8.2): its
 * failing required checks, and a conflict seen twice (a conflicting head runs no CI, so nothing
 * else would show that a session is still on it).
 * @param {any} rec the pull request's record
 * @returns {string[]} the problems, empty when there is nothing to ask about
 */
export const askProblems = (rec) => [
    ...failingRequired(rec),
    ...((rec.conflictSightings ?? 0) >= 2 ? [`conflicts with ${rec.baseRef ?? "its base"}`] : []),
];

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
 * landing on its own, waits on the owner, is a draft, or is not the owner's. A pull request stacked
 * on another one needs a worker only for a conflict with its base: resolving it is a session's
 * work, never the owner's decision.
 * @param {string} number the PR number
 * @param {any} rec the PR record
 * @param {any} state the daemon state
 * @returns {string | null} the need
 */
export function prWork(number, rec, state) {
    if (!byOwner(state, rec.author) || rec.draft) return null;
    if (ownerWait(number, rec, state)) return null;
    // GitHub's answer of this poll, read again every poll: it clears as soon as GitHub says so.
    const github = rec.mergeState ?? rec.mergeable ?? "CONFLICTING";
    const base = rec.stackedOn ? `its base #${rec.stackedOn}` : (rec.baseRef ?? "its base");
    const conflict = (rec.conflictSightings ?? 0) >= 2 ? `conflicting with ${base} (GitHub: ${github})` : null;
    if (rec.stackedOn) return conflict;
    const failing = failingRequired(rec);
    if (rec.ownerRejected) return "owner rejected images";
    if (rec.captureFailed?.length) return `visual capture failed: ${rec.captureFailed.join("; ")}`;
    // A known flaky test is not the pull request's failure (flakes.mjs): the job says so.
    if (failing.length && !rec.ownerGate) return rec.knownFlake ?? `required check failing: ${failing.join(", ")}`;
    return conflict;
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
 * An issue's effort label without its prefix ("low"), or null when it has none.
 * @param {string[]} labels the issue's labels
 * @param {any} config the normalized config
 * @returns {string | null} the effort
 */
function issueEffort(labels, config) {
    const label = (config.labels?.efforts ?? []).find((/** @type {string} */ e) => labels.includes(e));
    return label ? label.replace(/^[^:]*:/, "") : null;
}

/**
 * The place of an effort in the order, cheapest first; an unknown or missing one last.
 * @param {string | null | undefined} effort the effort without its prefix
 * @returns {number} lower first
 */
function effortRank(effort) {
    const i = EFFORTS.indexOf(effort ?? "");
    return i === -1 ? EFFORTS.length : i;
}

/**
 * An issue's rank: its priority after aging, whether it is a bug, and its effort.
 * @param {any} issue the issue record
 * @param {any} config the normalized config
 * @param {Date} now the current time
 * @returns {{priority: number, bug: boolean, effort: string | null}} the rank; priority is an index
 *   into the configured priorities, lower first, -1 for none
 */
function rankIssue(issue, config, now) {
    const labels = issue.labels ?? [];
    const priorities = config.labels?.priorities ?? [];
    const base = priorities.findIndex((p) => labels.includes(p));
    const agingDays = config.backlog?.agingDays ?? DEFAULT_AGING_DAYS;
    const untouched = Math.floor((now.getTime() - Date.parse(issue.updatedAt ?? now.toISOString())) / DAY);
    // Aging never lifts past the second level: only a person makes something critical.
    const priority = Math.max(base - Math.floor(untouched / agingDays), Math.min(base, 1));
    return { priority, bug: labels.includes("bug"), effort: issueEffort(labels, config) };
}

/**
 * The owner's open issues that are ready: those missing a label kind (to triage), oldest first, and labeled
 * ones in rank order (design 5.4): `githerd:next` first, then priority, bug before other types,
 * low effort before high, oldest. An issue an open pull request already works on is left out of the ranked list.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {Date} now the clock
 * @returns {{triage: number[], ranked: {number: number, priority: number, bug: boolean, effort: string | null,
 *   next: boolean}[]}}
 *   the issue numbers
 */
export function readyIssues(state, config, now) {
    const triage = [];
    const ranked = [];
    for (const [n, issue] of Object.entries(state.issues?.byNumber ?? {})) {
        const labels = issue.labels ?? [];
        if (!issueReady(state, issue, labels)) continue;
        const sortable = { number: Number(n), createdAt: issue.createdAt ?? null, next: ownerLabel(issue, NEXT) };
        if (missingLabelKinds(labels, config).length) triage.push(sortable);
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
            effortRank(a.effort) - effortRank(b.effort) ||
            oldest(a, b),
    );
    return {
        triage: triage.map((t) => t.number),
        ranked: ranked.map(({ number, priority, bug, effort, next }) => ({ number, priority, bug, effort, next })),
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
// Pull requests in use (the owner's decision of 2026-10-04): a pull request one session works on is
// never offered to another.
// ---------------------------------------------------------------------------------------------

/**
 * The pull request a job works on: a `pr` or `title` job's, a review's, or the one a job made.
 * @param {any} job the job
 * @returns {number | null} the number
 */
export const prOf = (job) => job.pr ?? job.facts?.pr ?? null;

/**
 * Why another job on pull request `n` keeps it in use, or null: a job in flight on it, claimed by
 * a live session or being started.
 * @param {any} state the daemon state
 * @param {number | string} n the pull request
 * @param {{except?: string | null, review?: boolean, session?: string | null}} [opts] the job
 *   asking (never in use by itself), whether it is a review (only an owner session's claim hides a
 *   review) and the session asking (its own claim is reported as "yours")
 * @returns {string | null} the reason
 */
export function jobOnPr(state, n, { except = null, review = false, session: caller = null } = {}) {
    for (const j of Object.values(state.jobs ?? {})) {
        if (j.id === except || j.state === "queued" || TERMINAL.includes(j.state)) continue;
        if (String(prOf(j)) !== String(n) || (review && j.holder?.startedBy !== "owner")) continue;
        const session = j.holder?.session;
        if (!session) return `in flight as ${j.id}`;
        if (session === caller) return `yours: you claimed ${j.id}`;
        return `claimed by session ${j.holder.name ?? state.sessions?.[session]?.name ?? session}`;
    }
    return null;
}

/**
 * Whether githerd itself, or GitHub, made a pull request's head: a head `githerd_push` or the
 * upkeep recorded in `state.pushedByGitherd`, or a commit by GitHub (update-branch, Mergify).
 * @param {any} state the daemon state
 * @param {any} rec the pull request's record
 * @returns {boolean} true when nobody else pushed it
 */
export const headIsGitherds = (state, rec) =>
    Boolean(state.pushedByGitherd?.[rec.headSha]) || rec.headCommitter === GITHUB_COMMITTER;

/**
 * The live question about a pull request's failed head (`state.asks`), or null when there is none
 * for its newest head: a new push starts over.
 * @param {any} state the daemon state
 * @param {number | string} n the pull request
 * @returns {any} the question
 */
export function askFor(state, n) {
    const ask = state.asks?.[String(n)];
    return ask && ask.head === state.prs?.[String(n)]?.headSha ? ask : null;
}

/**
 * Why pull request `n` is in use, or null (design 8.2). In use while:
 *
 * 1. another job on it is in flight: claimed by a live session, or being started;
 * 2. CI runs on a head someone other than githerd pushed (a required check is pending);
 * 3. CI failed on such a head, or it conflicts with its base, and githerd asked the live sessions
 *    whose it is: until a session answers it is its own (then until that session ends or a new
 *    push arrives), or until `workers.askMinutes` pass with no answer, or at once when there was
 *    no session to ask. While asks are dry-run nobody heard the question, so silence says nothing
 *    and the pull request stays in use.
 *
 * 4. a live session holds an owner record for it (`state.prOwners`, asks.mjs): whatever its head;
 * 5. a live session owns it by inference (`state.prInferred`, owners.mjs): it last pushed the
 *    branch, or it works in the branch's worktree. The explicit record of 4 wins over it. Not in
 *    use from here on when it is broken and its owner left githerd's question unanswered
 *    (`state.prReleased`, asks.mjs brokenOwned), until a new push.
 *
 * A reason that names the asking session itself starts "yours:".
 *
 * A head githerd or GitHub made is never in use for 2 and 3. A review is a second look at a
 * worker's patch while that worker waits, so only an owner session's claim hides it.
 * @param {any} state the daemon state
 * @param {number | string} n the pull request
 * @param {{config?: any, now: Date, except?: string | null, review?: boolean, session?: string | null}} opts
 *   the config, the clock, the job asking (never in use by itself), whether it is a review, and the
 *   session asking
 * @returns {string | null} the reason
 */
export function prInUse(state, n, { config, now, except = null, review = false, session = null }) {
    const job = jobOnPr(state, n, { except, review, session });
    if (job) return job;
    const owned = state.prOwners?.[String(n)];
    if (owned && session && owned.session === session) return "yours: you said it is yours";
    if (owned) return `session ${owned.name} owns it (${owned.by === "cli" ? "the owner said so" : "it said so"})`;
    // Broken, and its owner did not say it is fixing it (asks.mjs brokenOwned): offered at once.
    const inferred = state.prInferred?.[String(n)];
    // A release under an owner that cannot answer (no githerd tools) does not hold: it owns it while it lives.
    const released = state.prReleased?.[String(n)];
    if (released && released === state.prs?.[String(n)]?.headSha && !inferred?.noTools) return null;
    if (inferred && session && inferred.session === session) return `yours: ${inferred.evidence}`;
    if (inferred) return `session ${inferred.name} owns it (${inferred.evidence})`;
    return brokenHeadInUse(state, n, { config, now, session });
}

/**
 * Why pull request `n` is in use by its broken head (rule 3 of `prInUse`): CI running or failed on
 * a head someone else pushed, or a conflict, while githerd asks whose it is.
 * @param {any} state the daemon state
 * @param {number | string} n the pull request
 * @param {{config?: any, now: Date, session: string | null}} opts the config, the clock and the
 *   session asking
 * @returns {string | null} the reason
 */
function brokenHeadInUse(state, n, { config, now, session }) {
    const rec = state.prs?.[String(n)];
    if (!rec?.headSha || headIsGitherds(state, rec)) return null;
    const head = String(rec.headSha ?? "").slice(0, 7);
    if (Object.values(rec.required ?? {}).includes("PENDING")) return `CI running on ${head}, pushed by someone else`;
    if (askProblems(rec).length === 0) return null;
    const what = failingRequired(rec).length
        ? `CI failed on ${head}`
        : `${head} conflicts with ${rec.baseRef ?? "its base"}`;
    return askInUse(askFor(state, n), what, { config, now, session });
}

/**
 * Why a broken pull request is in use by githerd's question of whose it is.
 * @param {any} ask the question (`askFor`), or null when none was asked yet
 * @param {string} what what is wrong with its head
 * @param {{config?: any, now: Date, session: string | null}} opts the config, the clock and the
 *   session asking
 * @returns {string | null} the reason
 */
function askInUse(ask, what, { config, now, session }) {
    if (!ask) return `${what}; githerd is asking the sessions in this repository whose it is`;
    if (ask.owner && session && ask.owner.session === session) return "yours: you said you are working on it";
    if (ask.owner) return `session ${ask.owner.name} said it is working on it`;
    if (ask.dryRun) return `${what}; would ask the sessions in this repository whose it is; asks are dry-run`;
    const asked = ask.sessions?.length ?? 0;
    if (asked === 0) return null;
    const minutes = config?.workers?.askMinutes ?? DEFAULT_ASK_MINUTES;
    if (now.getTime() - Date.parse(ask.askedAt) >= minutes * MINUTE) return null;
    return `${what}; asked ${asked} session${asked === 1 ? "" : "s"} at ${ask.askedAt.slice(11, 16)} UTC; no owner yet`;
}

/**
 * The sessions that wrote pull request `n`: every session that claimed a job on it other than a
 * review (the job that made it, and those that pushed to it), the session that said it is its
 * own (`state.prOwners`, or the answer to githerd's question), and its inferred owner
 * (`state.prInferred`).
 * @param {any} state the daemon state
 * @param {number | string} n the pull request
 * @returns {Set<string>} the session ids
 */
function prAuthors(state, n) {
    const authors = new Set();
    for (const j of Object.values(state.jobs ?? {})) {
        if (j.kind !== "review" && String(prOf(j)) === String(n)) for (const s of j.sessions ?? []) authors.add(s);
    }
    const owners = [state.prOwners, state.prInferred].map((o) => o?.[String(n)]?.session);
    for (const s of [...owners, askFor(state, n)?.owner?.session]) if (s) authors.add(s);
    return authors;
}

/** Why a session may not review its own pull request. */
const SELF_REVIEW = "you wrote this pull request";

/**
 * Why a job is in use (its pull request is, by someone else), or null. With the asking session: a
 * review of a pull request that session wrote is never its to take, and a reason naming that
 * session itself starts "yours:".
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {{config?: any, now: Date, session?: string | null}} opts the config, the clock and the
 *   session asking
 * @returns {string | null} the reason
 */
export function jobInUse(state, job, opts) {
    const n = prOf(job);
    if (n === null) return null;
    const review = job.kind === "review";
    if (review && opts.session && prAuthors(state, n).has(opts.session)) return SELF_REVIEW;
    return prInUse(state, n, { ...opts, except: job.id, review });
}

// ---------------------------------------------------------------------------------------------
// The job queue order (design section 5.4): finish before starting.
// ---------------------------------------------------------------------------------------------

/** Issue priorities, most urgent first. */
const PRIORITIES = ["critical", "high", "medium", "low"];
/** A pull request's priority label: `priority:high`, or a bare `high`. */
const PR_PRIORITY = /^(?:priority:)?(critical|high|medium|low)$/;
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
            if (scope === "verdict") return [1, "master failure awaiting Claude's verdict"];
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
 * Whether a job finishes work already in flight rather than starting new work: a pull request's
 * review, fix or title, an issue master already names (verify the fix) and a re-land.
 * @param {import("./board.mjs").Job} job the job
 * @returns {boolean} true when it finishes
 */
function finishes(job) {
    if (job.kind === "issue") return Boolean(job.facts?.references?.length) || job.facts?.scope === "reland";
    return job.kind === "review" || job.kind === "pr" || job.kind === "title";
}

/**
 * A pull request job's priority, from the owner's priority label on it, or null.
 * @param {import("./board.mjs").Job} job the job
 * @returns {string | null} the priority
 */
function prPriority(job) {
    for (const l of job.facts?.labels ?? []) {
        const m = PR_PRIORITY.exec(l);
        if (m) return m[1];
    }
    return null;
}

/**
 * A job's priority tier, lower first (index into `PRIORITIES`). The owner's label decides: an
 * issue's priority, a pull request's own priority label. `githerd:next` or a place in an open order
 * lifts a job to the top tier. Without a label, work in flight and the daemon's own jobs (triage,
 * major) stay in the top tier, and an unprioritized issue goes last.
 * @param {import("./board.mjs").Job} job the job
 * @returns {number} the tier
 */
function priorityTier(job) {
    if (job.facts?.next || Number.isFinite(job.facts?.order)) return 0;
    const label = job.kind === "issue" ? job.priority : prPriority(job);
    const p = PRIORITIES.indexOf(label ?? "");
    if (p !== -1) return p;
    return job.kind === "issue" ? PRIORITIES.length : 0;
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
 * The sort key of a queued job (design 5.4): urgent incidents first and the low-priority rest last;
 * between them the priority tier, then work that finishes before work that starts, then the kind's
 * tier, the owner's `githerd:next`, an open order, bug before other types, low effort before high.
 * @param {import("./board.mjs").Job} job the job
 * @param {number} kindTier the kind's tier
 * @returns {number[]} lower first
 */
function sortKey(job, kindTier) {
    let band = 1;
    if (kindTier < 2) band = 0;
    else if (kindTier >= 8) band = 2;
    return [
        band,
        band === 1 ? priorityTier(job) : 0,
        finishes(job) ? 0 : 1,
        kindTier,
        job.facts?.next ? 0 : 1,
        job.facts?.order ?? Infinity,
        job.facts?.bug ? 0 : 1,
        effortRank(job.facts?.effort),
    ];
}

/**
 * The rule that places an issue job, in words: "critical bug, effort low".
 * @param {string | null | undefined} priority the job's priority
 * @param {any} facts the job's facts
 * @returns {string} the words
 */
export function issueRule(priority, facts) {
    const type = facts.bug ? "bug" : (facts.type ?? "issue");
    return [`${priority ?? "unprioritized"} ${type}`, facts.effort && `effort ${facts.effort}`]
        .filter(Boolean)
        .join(", ");
}

/**
 * What a job is about, in words: the pull request or issue it names ("#710").
 * @param {import("./board.mjs").Job} job the job
 * @returns {string} the reference
 */
function refOf(job) {
    const n =
        prOf(job) ??
        String(job.target ?? "")
            .replace(/^#/, "")
            .split(" ")[0];
    return n ? `#${n}` : job.id;
}

/**
 * The rule that places a job, in words: "finishes #710: conflicting with master", "starts #322:
 * high enhancement, effort low", or its tier's words.
 * @param {import("./board.mjs").Job} job the job
 * @param {string} words its tier's words
 * @returns {string} the rule
 */
function placeRule(job, words) {
    const f = job.facts ?? {};
    if (job.kind === "issue") {
        const rule = issueRule(job.priority, f);
        if (f.scope === "reland") return `finishes ${refOf(job)}: re-land, ${rule}`;
        if (f.references?.length) return `finishes ${refOf(job)}: verify the fix, ${rule}`;
        return `starts ${refOf(job)}: ${rule}`;
    }
    if (!finishes(job)) return words;
    const what = job.kind === "pr" && job.reason ? job.reason : words;
    const label = prPriority(job);
    const priority = label ? `, ${label} priority` : "";
    return `finishes ${refOf(job)}: ${what}${priority}`;
}

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
        placeRule(job, words),
        f.since && `${job.kind === "incident" ? "red" : "open"} since ${f.since}`,
    ];
    return parts.filter(Boolean).join(", ");
}

/**
 * The queued jobs in the order of design 5.4, each with its one-line reason, and the queued jobs
 * skipped right now with why. Urgent incidents first (verdicts, master, release, shared); then by
 * the owner's priority label (`priorityTier`), and within one priority, work that finishes what is
 * in flight (a review, a pull request's fix or title, verifying a fix master names, a re-land)
 * before work that starts something new (triage of new issues, a major, a fresh issue); then the
 * kind's tier, the owner's `githerd:next`, for issues the open order, bug before other types and
 * low effort before high, then oldest (`facts.since`: red since for an incident, opened for a pull
 * request or issue), then id. Triage passes and low-priority incidents come last.
 * A job whose pull request is in use (`prInUse`) is neither ordered nor skipped but listed apart.
 * @param {Record<string, import("./board.mjs").Job>} jobs the job records
 * @param {{reviewQueueFull?: boolean, inUse?: (job: any) => string | null}} [ctx] what limits apply
 *   now, and why a job is in use
 * @returns {{items: {job: string, reason: string}[], skipped: {job: string, reason: string}[],
 *   inUse: {job: string, reason: string}[]}} the order
 */
export function jobOrder(jobs, ctx = {}) {
    const items = [];
    const skips = [];
    const used = [];
    for (const job of Object.values(jobs)) {
        if (job.state !== "queued") continue;
        const skip = skipped(job, ctx);
        const inUse = skip ? null : (ctx.inUse?.(job) ?? null);
        if (skip) skips.push({ job: job.id, reason: skip });
        else if (inUse) used.push({ job: job.id, reason: inUse });
        else {
            const t = tier(job);
            items.push({ job, tier: t, key: sortKey(job, t[0]) });
        }
    }
    items.sort((a, b) => {
        const i = a.key.findIndex((v, k) => v !== b.key[k]);
        if (i !== -1) return a.key[i] - b.key[i];
        return (
            String(a.job.facts?.since ?? "~").localeCompare(String(b.job.facts?.since ?? "~")) ||
            a.job.id.localeCompare(b.job.id)
        );
    });
    return {
        items: items.map((x) => ({ job: x.job.id, reason: jobReason(x.job, x.tier[1]) })),
        skipped: skips,
        inUse: used,
    };
}
