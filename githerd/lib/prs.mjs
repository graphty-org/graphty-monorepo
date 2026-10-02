/**
 * Open pull request records and their "why stuck" reasons (design sections 5.2 and 6.5).
 *
 * `updatePrs` folds one poll's GraphQL nodes into the saved records. Each node may carry a
 * `detail` object with what the poll fetched for that PR beyond the GraphQL query:
 *
 * - `commits`: the full message of every commit on the head (REST `pulls/{n}/commits`), and
 *   `truncated` when the list stopped at 250. Fetched in the poll that first sees a head.
 * - `files`: the paths the head changes (REST `pulls/{n}/files`).
 * - `failedSteps`: the names of the failed steps of the one failing required context.
 * - `comments`: `{body, createdAt}` of the comments since the head, for the reject marker.
 *
 * A value decided from detail is kept while the head stays the same; a new head without detail
 * resets it, and an unchecked head counts as breaking.
 */

/**
 * @typedef {import("./config.mjs").Config} Config
 * @typedef {{ messages: string[], truncated?: boolean }} CommitList
 * @typedef {{ commits?: CommitList, files?: string[], failedSteps?: string[],
 *   comments?: { body: string, createdAt: string }[] }} Detail
 * @typedef {"SUCCESS" | "FAILURE" | "PENDING" | "MISSING"} CheckState
 * @typedef {{
 *   verdict: "green" | "red" | "unknown", branch: string, fixPr?: number | null,
 *   fixedAt?: string | null,
 * }} MasterView `branch` is the default branch; `fixPr` the recorded master fix; `fixedAt` when
 *   the commit that ended the last incident was made
 * @typedef {{
 *   headSha: string, headRef: string, baseRef: string, draft: boolean, author: string | null,
 *   title: string, createdAt: string | null, references: number[], labels: string[], headChangedAt: string, headCommittedAt: string | null,
 *   breaking: boolean, breakingCheckedFor: string | null,
 *   touchesProtected: boolean, touchesNoAutoMerge: boolean,
 *   autoMerge: boolean, mergeable: string | null, conflictSightings: number,
 *   required: Record<string, CheckState>, failingChecks: string[], failingStartedAt: string | null,
 *   ownerGate: boolean, ownerRejected: boolean, stackedOn: number | null,
 *   lastActivityAt: string, [key: string]: unknown,
 * }} PrRecord
 */

const FAILED = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR"]);
const PASSED = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const BREAKING_SUBJECT = /^[a-z]+(\([^)]*\))?!:/;
const BREAKING_FOOTER = /BREAKING[ -]CHANGE/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a PR is breaking, from its title and the full commit list of its head.
 * @param {string} title the PR title
 * @param {string[]} commits every commit message on the head, subject first
 * @param {boolean} truncated the list stopped at 250 commits, so it is not the full list
 * @returns {boolean} true when breaking or when the list cannot prove otherwise
 */
export function decideBreaking(title, commits, truncated) {
    if (truncated) return true;
    if (BREAKING_SUBJECT.test(title)) return true;
    return commits.some((m) => BREAKING_SUBJECT.test(m.split("\n", 1)[0]) || BREAKING_FOOTER.test(m));
}

/**
 * Whether a changed path falls under a configured list: an entry ending in "/" is a directory
 * prefix, any other entry is one exact file.
 * @param {string[]} files changed paths
 * @param {string[]} list configured paths
 * @returns {boolean} true when any file matches
 */
export function touches(files, list) {
    return files.some((f) => list.some((p) => (p.endsWith("/") ? f.startsWith(p) : f === p)));
}

/**
 * One context's state, normalized.
 * @param {any} ctx a CheckRun or StatusContext node
 * @returns {CheckState} its state
 */
function contextState(ctx) {
    if (ctx.__typename === "StatusContext") {
        if (ctx.state === "SUCCESS") return "SUCCESS";
        return FAILED.has(ctx.state) ? "FAILURE" : "PENDING";
    }
    if (ctx.status !== "COMPLETED") return "PENDING";
    if (PASSED.has(ctx.conclusion)) return "SUCCESS";
    return FAILED.has(ctx.conclusion) ? "FAILURE" : "PENDING";
}

/**
 * The checks of a node's head commit.
 * @param {any} node a GraphQL pullRequest node
 * @param {string[]} requiredChecks the required context names
 * @returns {{ required: Record<string, CheckState>, failing: string[], startedAt: string | null,
 *   committedAt: string | null }} required verdicts, every failing context, the latest start of a
 *   failing required check run, and the head commit's date
 */
function readChecks(node, requiredChecks) {
    const commit = node.commits?.nodes?.[0]?.commit;
    const contexts = commit?.statusCheckRollup?.contexts?.nodes ?? [];
    /** @type {Record<string, CheckState>} */
    const required = Object.fromEntries(requiredChecks.map((n) => [n, "MISSING"]));
    const failing = [];
    let startedAt = null;
    for (const ctx of contexts) {
        const name = ctx.__typename === "StatusContext" ? ctx.context : ctx.name;
        const state = contextState(ctx);
        if (state === "FAILURE" && !failing.includes(name)) failing.push(name);
        if (!Object.hasOwn(required, name)) continue;
        // A name reported twice (a re-run) takes the worst: failure, then pending, then success.
        const order = ["MISSING", "SUCCESS", "PENDING", "FAILURE"];
        if (order.indexOf(state) > order.indexOf(required[name])) required[name] = state;
        if (state === "FAILURE" && ctx.startedAt && (!startedAt || ctx.startedAt > startedAt)) {
            startedAt = ctx.startedAt;
        }
    }
    return { required, failing, startedAt, committedAt: commit?.committedDate ?? null };
}

/**
 * Folds one poll's open pull requests into the saved records.
 * @param {Record<string, PrRecord>} saved the records from the last poll
 * @param {any[]} nodes GraphQL pullRequest nodes, each optionally with `detail` ({@link Detail})
 * @param {MasterView} master the default branch's verdict
 * @param {Config} config the normalized config
 * @param {string} [now] the poll time, ISO
 * @returns {Record<string, PrRecord>} records for exactly the PRs in `nodes`
 */
export function updatePrs(saved, nodes, master, config, now = new Date().toISOString()) {
    /** @type {Record<string, PrRecord>} */
    const out = {};
    const byHead = new Map(nodes.map((n) => [n.headRefName, n.number]));
    for (const node of nodes) {
        const prev = saved[node.number];
        const sameHead = prev?.headSha === node.headRefOid;
        /** @type {Detail} */
        const detail = node.detail ?? {};
        const checks = readChecks(node, config.requiredChecks);

        /** @type {PrRecord} */
        const rec = {
            ...(prev ?? {}),
            headSha: node.headRefOid,
            headRef: node.headRefName,
            baseRef: node.baseRefName,
            draft: node.isDraft,
            author: node.author?.login ?? null,
            title: node.title,
            createdAt: node.createdAt ?? null,
            references: (node.closingIssuesReferences?.nodes ?? []).map((i) => i.number),
            labels: (node.labels?.nodes ?? []).map((l) => l.name),
            headChangedAt: sameHead ? prev.headChangedAt : now,
            headCommittedAt: checks.committedAt,
            breaking: sameHead ? prev.breaking : false,
            breakingCheckedFor: sameHead ? prev.breakingCheckedFor : null,
            touchesProtected: sameHead ? prev.touchesProtected : false,
            touchesNoAutoMerge: sameHead ? prev.touchesNoAutoMerge : false,
            autoMerge: node.autoMergeRequest != null,
            mergeable: prev?.mergeable ?? null,
            conflictSightings: sameHead ? prev.conflictSightings : 0,
            required: checks.required,
            failingChecks: checks.failing,
            failingStartedAt: checks.startedAt,
            ownerGate: false,
            ownerRejected: sameHead ? prev.ownerRejected : false,
            stackedOn: null,
            lastActivityAt: node.updatedAt,
        };

        // UNKNOWN is GitHub still computing: no data, so nothing about mergeability changes.
        if (node.mergeable !== "UNKNOWN") {
            rec.mergeable = node.mergeable;
            rec.conflictSightings = node.mergeable === "CONFLICTING" ? rec.conflictSightings + 1 : 0;
        }

        if (detail.commits) {
            rec.breaking = decideBreaking(node.title, detail.commits.messages, detail.commits.truncated === true);
            rec.breakingCheckedFor = node.headRefOid;
        } else if (BREAKING_SUBJECT.test(node.title)) {
            // A retitle to "x!:" makes the PR breaking without a new head.
            rec.breaking = true;
        }

        if (detail.files) {
            rec.touchesProtected = touches(detail.files, config.protectedPaths);
            rec.touchesNoAutoMerge = touches(detail.files, config.noAutoMergePaths);
        }

        const failingRequired = Object.keys(checks.required).filter((n) => checks.required[n] === "FAILURE");
        if (config.ownerGate && failingRequired.length === 1) {
            if (detail.failedSteps) {
                const steps = config.ownerGate.steps.map((s) => new RegExp(s));
                rec.ownerGate =
                    detail.failedSteps.length > 0 && detail.failedSteps.every((n) => steps.some((re) => re.test(n)));
            } else {
                rec.ownerGate = sameHead && prev.ownerGate === true;
            }
        }

        if (config.ownerGate?.rejectMarker && detail.comments) {
            const marker = new RegExp(`<!--\\s*${escape(config.ownerGate.rejectMarker)}\\b`);
            const since = rec.headCommittedAt ?? rec.headChangedAt;
            rec.ownerRejected = detail.comments.some((c) => c.createdAt > since && marker.test(c.body));
        }

        if (node.baseRefName !== master.branch) rec.stackedOn = byHead.get(node.baseRefName) ?? null;
        out[node.number] = rec;
    }
    return out;
}

/**
 * Escapes a string for use inside a regular expression.
 * @param {string} s the text
 * @returns {string} the text with every special character escaped
 */
function escape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whether the PR must be treated as breaking: decided breaking, or not yet decided for its head.
 * @param {PrRecord} rec the record
 * @returns {boolean} true when breaking or unchecked
 */
export function countsAsBreaking(rec) {
    return rec.breaking || rec.breakingCheckedFor !== rec.headSha;
}

/**
 * Whether design section 8 would turn auto-merge on for this PR.
 * @param {PrRecord} rec the record
 * @param {MasterView} master the default branch's verdict
 * @param {string | null | undefined} login the owner, the account gh is logged in as; only the
 *   owner's PRs are eligible
 * @returns {boolean} true when eligible
 */
export function autoMergeEligible(rec, master, login) {
    return (
        !rec.draft &&
        !countsAsBreaking(rec) &&
        rec.baseRef === master.branch &&
        !rec.labels.includes("breaking-hold") &&
        !rec.touchesNoAutoMerge &&
        Boolean(login) &&
        rec.author === login
    );
}

/**
 * The reasons a PR is not merging, in the order of design section 6.5.
 * @param {number} number the PR number
 * @param {PrRecord} rec its record
 * @param {{ master: MasterView, config: Config, now?: number, login?: string | null,
 *   claims?: Record<string, { holder: string, holderName?: string | null }>,
 *   sessions?: Record<string, { branch?: string, name?: string }> }} ctx `claims` and `sessions`
 *   hold only the live ones; `now` is milliseconds since the epoch; `login` is the owner
 * @returns {string[]} the reasons, empty when nothing holds the PR
 */
export function whyStuck(number, rec, ctx) {
    const { master, config } = ctx;
    const now = ctx.now ?? Date.now();
    const reasons = [];
    const failing = Object.keys(rec.required).filter((n) => rec.required[n] === "FAILURE");
    const pending = Object.keys(rec.required).filter((n) => ["PENDING", "MISSING"].includes(rec.required[n]));

    if (rec.draft) reasons.push("draft");
    if (master.verdict === "red" && master.fixPr !== number) reasons.push("held: master is red");
    if (rec.conflictSightings >= 2) reasons.push("conflicting");
    if (rec.ownerRejected) reasons.push("owner rejected images: fix needed");
    else if (rec.ownerGate) reasons.push("waiting on owner: visual review");
    if (countsAsBreaking(rec)) reasons.push("breaking: held for a grouped major");
    if (rec.baseRef !== master.branch) {
        reasons.push(`stacked: waiting on ${rec.stackedOn ? `#${rec.stackedOn}` : `branch ${rec.baseRef}`}`);
    }
    if (failing.length && !rec.ownerGate) reasons.push(`required check failing: ${failing.join(", ")}`);
    if (failing.length && master.fixedAt && rec.failingStartedAt && rec.failingStartedAt < master.fixedAt) {
        reasons.push("failure predates master fix");
    }
    if (!rec.autoMerge && autoMergeEligible(rec, master, ctx.login)) reasons.push("auto-merge off");
    if (rec.touchesNoAutoMerge) reasons.push("owner merges: touches githerd or CI config");
    if (pending.length) reasons.push("checks pending");

    const claim = ctx.claims?.[`pr:${number}`];
    if (claim) reasons.push(`claimed by ${claim.holderName ?? claim.holder}`);
    for (const [id, s] of Object.entries(ctx.sessions ?? {})) {
        if (s.branch === rec.headRef) reasons.push(`worked by session ${s.name ?? id}`);
    }

    const idleDays = Math.floor((now - Date.parse(rec.lastActivityAt)) / DAY_MS);
    if (idleDays >= config.staleDays) reasons.push(`stale: no activity for ${idleDays} days`);
    return reasons;
}
