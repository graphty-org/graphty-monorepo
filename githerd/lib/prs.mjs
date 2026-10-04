/**
 * Open pull request records and their "why stuck" reasons (design sections 5.2 and 6.5), and the
 * `githerd/merge` decision, the stacks and the review patch id (design section 4.6).
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

import { execFileSync } from "node:child_process";

/**
 * @typedef {import("./config.mjs").Config} Config
 * @typedef {{ messages: string[], truncated?: boolean }} CommitList
 * @typedef {{ commits?: CommitList, files?: string[], failedSteps?: string[],
 *   comments?: { body: string, createdAt: string }[] }} Detail
 * @typedef {"SUCCESS" | "FAILURE" | "PENDING" | "MISSING"} CheckState
 * @typedef {{
 *   verdict: "green" | "red" | "unknown", branch: string,
 *   fixedAt?: string | null,
 * }} MasterView `branch` is the default branch; `fixedAt` when
 *   the commit that ended the last incident was made
 * @typedef {{
 *   headSha: string, headRef: string, baseRef: string, draft: boolean, author: string | null,
 *   title: string, createdAt: string | null, references: number[], labels: string[], headChangedAt: string, headCommittedAt: string | null,
 *   breaking: boolean, breakingCheckedFor: string | null,
 *   touchesProtected: boolean,
 *   autoMerge: boolean, mergeable: string | null, conflictSightings: number,
 *   required: Record<string, CheckState>, failingChecks: string[], failingStartedAt: string | null,
 *   ownerGate: boolean, ownerRejected: boolean, stackedOn: number | null,
 *   lastActivityAt: string, mergeStatus?: MergeStatus | null, [key: string]: unknown,
 * }} PrRecord `mergeStatus` is the `githerd/merge` status last decided for the head
 */

const FAILED = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR"]);
const PASSED = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const BREAKING_SUBJECT = /^[a-z]+(\([^)]*\))?!:/;
const BREAKING_FOOTER = /BREAKING[ -]CHANGE/;

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
    return commits.some(isBreakingCommit);
}

/**
 * Whether one commit message is breaking: `!` in its subject or a `BREAKING CHANGE` footer.
 * @param {string} message the full message, subject first
 * @returns {boolean} true when breaking
 */
function isBreakingCommit(message) {
    return BREAKING_SUBJECT.test(message.split("\n", 1)[0]) || BREAKING_FOOTER.test(message);
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
        const rec = foldPr(node, saved[node.number], config, now);
        if (node.baseRefName !== master.branch) rec.stackedOn = byHead.get(node.baseRefName) ?? null;
        out[node.number] = rec;
    }
    return out;
}

/**
 * Folds one pull request's poll answer into its saved record.
 * @param {any} node a GraphQL pullRequest node, optionally with `detail` ({@link Detail})
 * @param {PrRecord | undefined} prev its record from the last poll
 * @param {Config} config the normalized config
 * @param {string} now the poll time, ISO
 * @returns {PrRecord} the record, `stackedOn` still null
 */
function foldPr(node, prev, config, now) {
    const sameHead = prev?.headSha === node.headRefOid;
    /** @type {Detail} */
    const detail = node.detail ?? {};
    const checks = readChecks(node, config.requiredChecks);
    // What a new head resets; the same head keeps what was decided for it.
    const kept = sameHead
        ? /** @type {PrRecord} */ (prev)
        : {
              headChangedAt: now,
              breaking: false,
              breakingCheckedFor: null,
              touchesProtected: false,
              conflictSightings: 0,
              ownerRejected: false,
          };

    /** @type {PrRecord} */
    const rec = {
        ...prev,
        headSha: node.headRefOid,
        headRef: node.headRefName,
        baseRef: node.baseRefName,
        draft: node.isDraft,
        author: node.author?.login ?? null,
        title: node.title,
        createdAt: node.createdAt ?? null,
        references: (node.closingIssuesReferences?.nodes ?? []).map((/** @type {any} */ i) => i.number),
        labels: (node.labels?.nodes ?? []).map((/** @type {any} */ l) => l.name),
        headChangedAt: kept.headChangedAt,
        headCommittedAt: checks.committedAt,
        breaking: kept.breaking,
        breakingCheckedFor: kept.breakingCheckedFor,
        touchesProtected: kept.touchesProtected,
        autoMerge: node.autoMergeRequest != null,
        mergeable: prev?.mergeable ?? null,
        conflictSightings: kept.conflictSightings,
        required: checks.required,
        failingChecks: checks.failing,
        failingStartedAt: checks.startedAt,
        ownerGate: ownerGateOf(config, checks.required, detail, sameHead && prev?.ownerGate === true),
        ownerRejected: kept.ownerRejected,
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
    }
    if (config.ownerGate?.rejectMarker && detail.comments) {
        const marker = new RegExp(String.raw`<!--\s*${escape(config.ownerGate.rejectMarker)}\b`);
        const since = rec.headCommittedAt ?? rec.headChangedAt;
        rec.ownerRejected = detail.comments.some((c) => c.createdAt > since && marker.test(c.body));
    }
    return rec;
}

/**
 * Whether the only failing required check fails only in the owner gate's steps: the PR waits on
 * the owner's visual review, not on a fix.
 * @param {Config} config the normalized config
 * @param {Record<string, CheckState>} required the required checks' states
 * @param {Detail} detail what was read for this head
 * @param {boolean} before the answer for this head at the last poll
 * @returns {boolean} true when it waits on the owner
 */
function ownerGateOf(config, required, detail, before) {
    const failing = Object.keys(required).filter((n) => required[n] === "FAILURE");
    if (!config.ownerGate || failing.length !== 1) return false;
    if (!detail.failedSteps) return before;
    const steps = config.ownerGate.steps.map((s) => new RegExp(s));
    return detail.failedSteps.length > 0 && detail.failedSteps.every((n) => steps.some((re) => re.test(n)));
}

/**
 * Escapes a string for use inside a regular expression.
 * @param {string} s the text
 * @returns {string} the text with every special character escaped
 */
function escape(s) {
    return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
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
 * The reasons a PR is not merging, in the order of design section 6.5.
 * @param {number} number the PR number
 * @param {PrRecord} rec its record
 * @param {{ master: MasterView,
 *   claims?: Record<string, { holder: string, holderName?: string | null }>,
 *   sessions?: Record<string, { branch?: string, name?: string }> }} ctx `claims` and `sessions`
 *   hold only the live ones
 * @returns {string[]} the reasons, empty when nothing holds the PR
 */
export function whyStuck(number, rec, ctx) {
    const reasons = [...pullRequestReasons(rec, ctx.master)];

    const claim = ctx.claims?.[`pr:${number}`];
    if (claim) reasons.push(`claimed by ${claim.holderName ?? claim.holder}`);
    for (const [id, s] of Object.entries(ctx.sessions ?? {})) {
        if (s.branch === rec.headRef) reasons.push(`worked by session ${s.name ?? id}`);
    }
    return reasons;
}

/**
 * The reasons that come from the pull request itself, in the order of design section 6.5.
 * @param {PrRecord} rec its record
 * @param {MasterView} master the default branch's verdict
 * @returns {string[]} the reasons
 */
function pullRequestReasons(rec, master) {
    const reasons = [];
    if (rec.draft) reasons.push("draft");
    if (rec.mergeStatus?.state === "failure") reasons.push(rec.mergeStatus.description);
    if (rec.conflictSightings >= 2) reasons.push("conflicting");
    if (rec.ownerRejected) reasons.push("owner rejected images: fix needed");
    else if (rec.ownerGate) reasons.push("waiting on owner: visual review");
    if (countsAsBreaking(rec)) reasons.push("breaking: held for a grouped major");
    if (rec.baseRef !== master.branch) {
        const base = rec.stackedOn ? `#${rec.stackedOn}` : "branch " + rec.baseRef;
        reasons.push(`stacked: waiting on ${base}`);
    }
    reasons.push(...failingReasons(rec, master));
    if (rec.autoMerge) reasons.push("native auto-merge armed: bypasses githerd/merge");
    if (Object.values(rec.required).some((v) => v === "PENDING" || v === "MISSING")) reasons.push("checks pending");
    return reasons;
}

/**
 * The reasons about failing required checks.
 * @param {PrRecord} rec the record
 * @param {MasterView} master the default branch's verdict
 * @returns {string[]} the reasons
 */
function failingReasons(rec, master) {
    const failing = Object.keys(rec.required).filter((n) => rec.required[n] === "FAILURE");
    if (!failing.length) return [];
    const reasons = rec.ownerGate ? [] : [`required check failing: ${failing.join(", ")}`];
    if (master.fixedAt && rec.failingStartedAt && rec.failingStartedAt < master.fixedAt) {
        reasons.push("failure predates master fix");
    }
    return reasons;
}

// ---------------------------------------------------------------------------------------------
// The githerd/merge decision and stacks (design section 4.6)
// ---------------------------------------------------------------------------------------------

/**
 * The paths through which a pull request can affect a gating lane other than CI (CI can be broken
 * by anything). GPU: `scripts/bench-groups.js` maps every file under the package's `src/` to at
 * least one benchmark group (a file it cannot place selects all of them) and nothing outside it,
 * plus the lane's own workflow, scripts and benchmark files. Hosts: the `paths` filter of
 * `hosts.yml`.
 */
const LANE_PATHS = {
    GPU: [
        "webgpu-graph-algorithms/src/",
        "webgpu-graph-algorithms/scripts/",
        "webgpu-graph-algorithms/benchmarks/",
        ".github/workflows/gpu.yml",
    ],
    Hosts: [
        "webgpu-graph-algorithms/",
        "graph-format/",
        "layout/",
        "graphty-element/",
        ".github/workflows/hosts.yml",
        "pnpm-lock.yaml",
    ],
};

/** What each lane's hold says about the pull request, after "held: <lane> lane red since <time>". */
const LANE_REASON = {
    GPU: " and this pull request touches a benchmark group or the lane's scripts",
    Hosts: " and this pull request touches the host matrix's paths",
};

/** Paths whose change needs a security review before a githerd job's pull request merges (line 6). */
const SECURITY_PATHS = [".github/workflows/", ".husky/", "tools/prepush.sh", ".npmrc", ".claude/", "githerd/"];

/**
 * What `nx release` reads: every published package and the release's own configuration.
 * ponytail: a fixed list of the published packages; read the private flags of the workspace's
 * package.json files when a package is added often enough to forget this list.
 */
export const RELEASE_INPUTS = [
    "algorithms/",
    "compact-mantine/",
    "graph-format/",
    "graph-io/",
    "graph-samples/",
    "graphty-element/",
    "layout/",
    "remote-logger/",
    "visual-review/",
    "webgpu-graph-algorithms/",
    "nx.json",
    "release-hold.json",
    "tools/release-hold.mjs",
    "tools/changelog-renderer.cjs",
    ".github/workflows/release.yml",
];

/** GitHub refuses a commit status description longer than this. */
const DESCRIPTION_MAX = 140;

/**
 * @typedef {{workflow: string, since: string, fixPrs?: number[]}} RedLane a gating lane that is red
 *   and classified code (paid capacity, outside and drift park a lane instead): its workflow name,
 *   when its red stretch began (ISO), and the pull requests recorded as its incident's fix or revert
 * @typedef {{project: string, from: string, to: string}} Bump one "New version" line of the
 *   release dry-run on the reference worktree merged with the head
 * @typedef {{
 *   kind: string, patchId: string | null, reviewed: string[], securityReviewed: string[],
 *   workerPushedOwnerPaths?: boolean, issueRevision?: string | null, acknowledgedRevision?: string | null,
 * }} JobFacts the githerd job that made the pull request: its kind, the head's patch id (null until
 *   computed), the patch ids whose review and security review passed, whether a worker pushed changes
 *   under `githerd/` or `.claude/`, and for an `issue` job the issue's current revision and the one
 *   the job acknowledged
 * @typedef {{
 *   number: number, author: string | null, title: string, labels: string[],
 *   commits: string[] | null, commitsTruncated?: boolean, files: string[] | null, filesTruncated?: boolean,
 *   dependencies: {added: string[], unknownToNpm: string[]} | null, ownerItemOpen?: boolean,
 *   job?: JobFacts | null, releaseBumps?: Bump[] | null,
 * }} MergeFacts what githerd knows about one open pull request into master at its current head.
 *   `null` means not read yet for this head: commit messages, changed files, the packages it adds
 *   (with those npm does not know), the release dry-run (needed only when it changes release inputs).
 *   `filesTruncated` is set when the file listing stopped early (pagination cut short, or GitHub's
 *   3000-file cap): the files not seen may touch any path, so every path-dependent line fails closed
 * @typedef {{
 *   login: string | null, redLanes: RedLane[], releaseRunning?: boolean, freezeMerges?: boolean,
 *   heldPackages?: string[], starvation?: string | null, approvedMajors?: string[],
 * }} MergeContext the repository-wide facts: the owner's login, the code-red gating lanes, whether
 *   the release job (not its gate job) is running, the `freeze-merges` policy, the packages the
 *   owner's `hold-package` policies hold, the starvation hold's
 *   reason when one applies (4.7), and the projects whose major bump the owner approved as a group
 * @typedef {{state: "success" | "failure" | "pending", description: string, line: number | null}}
 *   MergeStatus the `githerd/merge` commit status and the decision line that failed (null otherwise)
 * @typedef {string} LineResult `PASS`, `WAIT`, or the failure's reason ("held: ...")
 */

/** A line holds. */
const PASS = "";
/** A line waits for a fact about this head that githerd has not read yet. */
const WAIT = "waiting";

/**
 * A red stretch's start as the status shows it: month, day, hour and minute in UTC.
 * @param {string} iso the time
 * @returns {string} such as `10-01 15:37 UTC`
 */
function shortTime(iso) {
    return `${iso.slice(5, 10)} ${iso.slice(11, 16)} UTC`;
}

/**
 * Whether the head touches a list of paths; null while its files are not read, true when the
 * listing was truncated (an unseen file may touch any of them).
 * @param {MergeFacts} pr the pull request
 * @param {string[]} list the paths (see `touches`)
 * @returns {boolean | null} true, false or not known yet
 */
function touchesList(pr, list) {
    if (!pr.files) return null;
    return pr.filesTruncated || touches(pr.files, list);
}

/**
 * The hold of the first code-red gating lane that can affect the pull request.
 * @param {MergeFacts} pr the pull request
 * @param {RedLane[]} lanes the code-red gating lanes
 * @returns {LineResult} the result
 */
function laneHold(pr, lanes) {
    let result = PASS;
    for (const lane of lanes) {
        if (lane.fixPrs?.includes(pr.number)) continue;
        const paths = LANE_PATHS[lane.workflow];
        const affects = paths ? touchesList(pr, paths) : true;
        if (affects)
            return `held: ${lane.workflow} lane red since ${shortTime(lane.since)}${LANE_REASON[lane.workflow] ?? ""}`;
        if (affects === null) result = WAIT;
    }
    return result;
}

/**
 * The owner's `hold-package` policies: a pull request that changes a held package is held. A
 * package is named as its directory or its npm name (`layout`, `@graphty/layout`).
 * @param {MergeFacts} pr the pull request
 * @param {string[]} names the held packages
 * @returns {LineResult} the result
 */
function heldPackage(pr, names) {
    let result = PASS;
    for (const name of names) {
        const touched = touchesList(pr, [`${name.replace(/^@[^/]+\//, "")}/`]);
        if (touched) return `held: package ${name} is held by the owner`;
        if (touched === null) result = WAIT;
    }
    return result;
}

/**
 * Line 2: no hold applies.
 * @param {MergeFacts} pr the pull request
 * @param {MergeContext} ctx the repository facts
 * @returns {LineResult} the result
 */
function noHold(pr, ctx) {
    const lane = laneHold(pr, ctx.redLanes);
    if (lane !== PASS && lane !== WAIT) return lane;
    const release = ctx.releaseRunning ? touchesList(pr, RELEASE_INPUTS) : false;
    if (release) return "held: the release job is running and this pull request changes release inputs";
    if (ctx.freezeMerges) return "held: the owner froze merges";
    const held = heldPackage(pr, ctx.heldPackages ?? []);
    if (held !== PASS && held !== WAIT) return held;
    if (ctx.starvation) return `held: starvation hold (${ctx.starvation})`;
    return lane === WAIT || release === null || held === WAIT ? WAIT : PASS;
}

/**
 * Line 3: a breaking commit is under a title that carries `!` too.
 * @param {MergeFacts} pr the pull request
 * @returns {LineResult} the result
 */
function breakingTitled(pr) {
    if (pr.commits === null) return WAIT;
    if (BREAKING_SUBJECT.test(pr.title)) return PASS;
    if (pr.commitsTruncated)
        return "held: the commit list is too long to read, so it counts as breaking; put ! in the title";
    return pr.commits.some(isBreakingCommit) ? "held: a commit is breaking but the title has no !" : PASS;
}

/**
 * Line 6: a githerd job's pull request was reviewed on its current patch.
 * @param {MergeFacts} pr the pull request
 * @returns {LineResult} the result
 */
function reviewed(pr) {
    const job = pr.job;
    if (!job) return PASS;
    if (job.workerPushedOwnerPaths) return "held: needs owner session (a worker changed githerd/ or .claude/)";
    if (job.patchId === null) return WAIT;
    if (!job.reviewed.includes(job.patchId)) return "held: no review has passed on this patch";
    const sensitive = touchesList(pr, SECURITY_PATHS);
    if (sensitive === null || pr.dependencies === null) return WAIT;
    if ((sensitive || pr.dependencies.added.length > 0) && !job.securityReviewed.includes(job.patchId)) {
        return "held: no security review has passed on this patch";
    }
    return PASS;
}

/**
 * Line 7: the release dry-run shows no major outside an approved group and no 0.x package going to
 * 1.0.0.
 * @param {MergeFacts} pr the pull request
 * @param {MergeContext} ctx the repository facts
 * @returns {LineResult} the result
 */
function releaseSafe(pr, ctx) {
    const release = touchesList(pr, RELEASE_INPUTS);
    if (release === false) return PASS;
    if (release === null || !pr.releaseBumps) return WAIT;
    const major = (/** @type {string} */ v) => Number(v.split(".")[0]);
    for (const b of pr.releaseBumps) {
        if (major(b.from) === 0 && major(b.to) >= 1) return `held: ${b.project} would go from ${b.from} to ${b.to}`;
        if (major(b.to) > major(b.from) && !(ctx.approvedMajors ?? []).includes(b.project)) {
            return `held: ${b.project} would publish major ${b.to} outside an approved group`;
        }
    }
    return PASS;
}

/**
 * Line 1: the author is the owner; undecided until the owner's login is known.
 * @param {MergeFacts} pr the pull request
 * @param {MergeContext} ctx the repository facts
 * @returns {LineResult} the result
 */
function ownerAuthored(pr, ctx) {
    if (!ctx.login) return WAIT;
    return pr.author === ctx.login ? PASS : `held: the author ${pr.author ?? "(unknown)"} is not the owner`;
}

/**
 * Line 4: no package it adds is unknown to npm.
 * @param {MergeFacts} pr the pull request
 * @returns {LineResult} the result
 */
function knownPackages(pr) {
    if (pr.dependencies === null) return WAIT;
    const unknown = pr.dependencies.unknownToNpm;
    return unknown.length === 0 ? PASS : `held: npm does not know ${unknown.join(", ")}`;
}

/**
 * Line 5: no `needs-decision` label and no open owner item.
 * @param {MergeFacts} pr the pull request
 * @returns {LineResult} the result
 */
function notWaitingOnOwner(pr) {
    if (pr.labels.includes("needs-decision")) return "held: needs-decision label";
    return pr.ownerItemOpen ? "held: waiting on the owner" : PASS;
}

/**
 * Line 8: an `issue` job acknowledged the issue's current revision.
 * @param {MergeFacts} pr the pull request
 * @returns {LineResult} the result
 */
function issueAcknowledged(pr) {
    const job = pr.job;
    if (job?.kind !== "issue" || job.acknowledgedRevision === job.issueRevision) return PASS;
    return "held: the job has not acknowledged the issue's latest edit";
}

/** The decision's lines 1 to 8, in order. */
const LINES = [
    ownerAuthored,
    noHold,
    breakingTitled,
    knownPackages,
    notWaitingOnOwner,
    reviewed,
    releaseSafe,
    issueAcknowledged,
];

/**
 * The `githerd/merge` status of one open pull request into master (design 4.6): every line of the
 * decision is checked, `failure` names the first line that fails, `pending` means a line still
 * waits for a fact about this head (and no line fails), and `success` means every line holds.
 * A hold is never `pending`, because a pending pull request at the front of Mergify's queue
 * blocks every one behind it.
 * @param {MergeFacts} pr the pull request at its current head
 * @param {MergeContext} ctx the repository facts
 * @returns {MergeStatus} the status to post
 */
export function mergeDecision(pr, ctx) {
    const results = LINES.map((check) => check(pr, ctx));
    const failed = results.findIndex((r) => r !== PASS && r !== WAIT);
    if (failed >= 0) {
        return { state: "failure", description: results[failed].slice(0, DESCRIPTION_MAX), line: failed + 1 };
    }
    if (results.includes(WAIT)) return { state: "pending", description: "githerd is evaluating", line: null };
    return { state: "success", description: "githerd: safe to merge", line: null };
}

/**
 * @typedef {{number: number, base: string, headRef: string, head: string}} StackPr an open pull
 *   request: its base branch, its head branch and its head commit
 * @typedef {{action: "retarget", pr: number, to: string} | {action: "update", pr: number, base: number}}
 *   StackStep one step the daemon takes on a stacked pull request
 */

/**
 * The stacks among the open pull requests, built from each one's base branch: a pull request
 * based on another open pull request's head branch is its child.
 * @param {StackPr[]} prs the open pull requests
 * @returns {number[][]} each chain from its root (based on master or on a branch no open pull
 *   request heads) to a leaf; a pull request with no child and no parent is in no chain
 */
export function stackChains(prs) {
    const byHead = new Map(prs.map((p) => [p.headRef, p]));
    /** @type {Map<number, StackPr[]>} */
    const children = new Map();
    for (const p of prs) {
        const parent = byHead.get(p.base);
        if (parent && parent.number !== p.number)
            children.set(parent.number, [...(children.get(parent.number) ?? []), p]);
    }
    /** @type {number[][]} */
    const chains = [];
    /**
     * Extends a chain to every leaf below it.
     * @param {number[]} chain the chain so far
     */
    const walk = (chain) => {
        const below = (children.get(chain.at(-1) ?? 0) ?? []).filter((c) => !chain.includes(c.number));
        if (below.length === 0) chains.push(chain);
        for (const c of below) walk([...chain, c.number]);
    };
    for (const p of prs) {
        const parent = byHead.get(p.base);
        if ((!parent || parent.number === p.number) && children.has(p.number)) walk([p.number]);
    }
    return chains;
}

/**
 * What the daemon does to stacked pull requests after a poll (design 4.6, "Stacks"): a child whose
 * base pull request merged is retargeted to master (GitHub will not, since branches are not deleted
 * on merge, and deleting the base branch would close the child); a child whose base pull request's
 * head moved is updated from it. Parents come before their children.
 * @param {StackPr[]} prs the open pull requests now
 * @param {Record<string, string>} lastHeads each pull request's head commit at the previous poll,
 *   by number
 * @param {string[]} mergedHeads the head branches of pull requests merged since the previous poll
 * @param {string} branch the default branch
 * @returns {StackStep[]} the steps, in order
 */
export function stackSteps(prs, lastHeads, mergedHeads, branch) {
    const byHead = new Map(prs.map((p) => [p.headRef, p]));
    const depth = (/** @type {StackPr} */ p) => {
        let d = 0;
        for (let q = byHead.get(p.base); q && d <= prs.length; q = byHead.get(q.base)) d++;
        return d;
    };
    /** @type {StackStep[]} */
    const steps = [];
    for (const p of [...prs].sort((a, b) => depth(a) - depth(b) || a.number - b.number)) {
        if (p.base === branch) continue;
        if (mergedHeads.includes(p.base)) {
            steps.push({ action: "retarget", pr: p.number, to: branch });
            continue;
        }
        const parent = byHead.get(p.base);
        const before = parent ? lastHeads[parent.number] : undefined;
        if (parent && before !== undefined && before !== parent.head) {
            steps.push({ action: "update", pr: p.number, base: parent.number });
        }
    }
    return steps;
}

/**
 * The patch id a review is keyed on: `git patch-id --stable` of the diff from the merge base of the
 * default branch and the head to the head, leaving out `visual-baselines/`. A merge from master
 * leaves it unchanged, and so does the owner's visual-review Finish commit, so neither needs a
 * second review.
 * @param {string} cwd a checkout holding both commits
 * @param {string} base the default branch's commit or ref
 * @param {string} head the pull request's head commit
 * @returns {string} the patch id; `empty` when the head changes nothing outside the baselines
 */
export function patchId(cwd, base, head) {
    const git = (/** @type {string[]} */ args, input = "") =>
        execFileSync("git", args, { cwd, input, encoding: "utf8", maxBuffer: 1 << 30 }); // NOSONAR(S4036): the owner's git from his PATH, as in tools/
    const mergeBase = git(["merge-base", base, head]).trim();
    const diff = git(["diff", "--no-color", "--no-ext-diff", mergeBase, head, "--", ".", ":(exclude)visual-baselines"]);
    return git(["patch-id", "--stable"], diff).split(" ")[0] || "empty";
}
