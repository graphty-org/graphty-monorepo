/**
 * The text a worker gets from `githerd_next` for its job (design 5.1, 5.7 and 7.1 step 6): what the
 * target is, the done-condition in plain words, what earlier attempts found, the owner's standing
 * policies, the rules every worker follows and, for a review job, the review rubric.
 *
 * The done-conditions here are the words for what the daemon checks before it accepts
 * `githerd_done`; the check itself is not here. The rules only restate what the launch prompt
 * already gave as the user's words, because a Stop-hook reason that contradicts the user is refused
 * (design 7.3).
 */

/** What a job of each kind works on, as a noun before its target. */
const TARGET_NOUN = /** @type {Record<string, string>} */ ({
    incident: "failure",
    pr: "pull request",
    issue: "issue",
    triage: "issue batch",
    review: "diff",
    title: "pull request title",
    major: "breaking group",
});

/** What a job of each kind is for, in one line. */
const PURPOSE = /** @type {Record<string, string>} */ ({
    incident:
        "Something shared is broken. Find the cause, fix it in one pull request, and get the fix onto master. Label your fix pull request priority:critical (gh pr edit --add-label priority:critical): Mergify then merges it first, and githerd lets it through the hold on the red lane.",
    pr: "This pull request is stuck. Make its required checks pass on its current head.",
    issue: "Resolve this issue with a pull request against master, or show that it needs no change.",
    triage: "Label and judge each issue in this batch. Change no code.",
    review: "Review this diff before it may merge. Change no code.",
    title: "The title of this pull request fails commitlint. Fix the title only; there is no worktree.",
    major: "The owner approved shipping these breaking changes together. Combine them into one pull request.",
});

/**
 * The done-condition of an incident, by its scope. A low-priority incident is a red master workflow
 * that does not gate merges, so its condition is master's.
 */
const INCIDENT_DONE = /** @type {Record<string, string>} */ ({
    master: "the failing workflow's newest run on master is green at a commit that contains your fix.",
    low: "the failing workflow's newest run on master is green at a commit that contains your fix.",
    shared: "the failing check passes on master at a commit with your fix, and on one other open pull request after it is updated from master.",
    release: "npm has every version the release tagged, and master has the release's version commit.",
    local: "the pre-push gate passes on the last green commit of master.",
});

/** The done-condition of every other kind. */
const DONE = /** @type {Record<string, string>} */ ({
    pr:
        "every required check is green on the pull request's current head, its base is master and it is not a draft; " +
        "or all that is left waits only on the owner (a visual review or an open owner item).",
    issue:
        "a pull request that references the issue, based on master and not a draft, whose head on GitHub is the commit you pushed, " +
        "has every required check green (or waits only on the owner), and githerd/merge is not pending for a reason you can fix. " +
        "Or the issue needs no change (outcome not-needed, with evidence; it is closed only after the owner had a chance to object), " +
        "or it is split into new issues you filed (outcome split, with their numbers).",
    triage:
        "each issue in the batch has exactly one type, one priority (critical, high, medium, low) and one effort (high, medium, low) " +
        "label from the labels the repository already has, and a verdict: keep, duplicate (of which issue), obsolete or fixed (with evidence).",
    review: "you returned one verdict from the rubric below for this patch id.",
    title: "the Lint PR Title check is green.",
    major: "one pull request holds the whole group, it merged, and npm shows the new major version.",
});

/** A refresh triage job's purpose and done-condition: the session judges which issues are affected. */
const REFRESH_PURPOSE =
    "The pull requests below merged since the last refresh. Judge which of the open issues below they affect (fixed, made obsolete, changed or duplicated), reading the diffs (git show on each merge commit) and the issues (githerd_read) as you need. Label and judge each affected issue. Change no code.";
const REFRESH_DONE =
    "each open issue you judge the merges affect, and every issue under MUST JUDGE, has exactly one type, one priority (critical, high, medium, low) " +
    "and one effort (high, medium, low) label from the labels the repository already has, and a verdict: keep, duplicate (of which issue), obsolete or fixed (with evidence). " +
    "An issue the merges do not affect needs no entry.";

/**
 * The lines a refresh triage job adds: the merges with their changed files, the issues they mention
 * without closing them, and the open issues.
 * @param {any} facts the job's facts
 * @returns {string[]} the lines
 */
function refreshLines(facts) {
    const lines = ["MERGED SINCE THE LAST REFRESH:"];
    for (const pr of facts.merged ?? []) {
        const more = pr.truncated ? " (more files than listed)" : "";
        lines.push(`  #${pr.number} ${pr.title ?? ""} (merge ${String(pr.mergeSha ?? "unknown").slice(0, 12)})${more}`);
        lines.push(...(pr.paths ?? []).map((/** @type {string} */ p) => `      ${p}`));
    }
    if (facts.batch?.length) {
        lines.push(
            `MUST JUDGE (a merge mentions them without closing them): ${facts.batch.map((/** @type {number} */ n) => `#${n}`).join(" ")}`,
        );
    }
    lines.push("OPEN ISSUES:", ...(facts.open ?? []).map((/** @type {any} */ i) => `  #${i.number} ${i.title}`));
    return lines;
}

/** How to report the end, by kind. */
const FINISH = /** @type {Record<string, string>} */ ({
    triage: "Call githerd_done with outcome done and result set to one entry per issue.",
    review: "Call githerd_done with outcome done and result set to your verdict, the patch id and your notes.",
});
const FINISH_DEFAULT =
    "Call githerd_done with the outcome, the pull request and the head you pushed. githerd checks the claim against GitHub and tells you what is missing if it does not hold.";

/** The verdicts of a review job, each with when it applies (design 5.1). */
export const REVIEW_RUBRIC = Object.freeze([
    ["pass", "nothing below applies."],
    ["loosened", "a test, limit or threshold was weakened."],
    ["breaking-unmarked", "the change breaks a published API or format and is not marked as breaking."],
    ["does-not-address", "the diff does not do what the issue or job asked."],
    [
        "security",
        "a network fetch, a use of a secret or a new external host in a sensitive path, or a new dependency without a reason.",
    ],
    ["other", "anything else that should hold the merge; say what in the notes for the owner."],
]);

const RUBRIC_ALLOWED = [
    "Not loosening, and allowed: an audit ignore with a reason and a dated review; a benchmark floor moved",
    "to the measured noise band of 10 or more recorded samples of that row on the same runner class.",
];

/** The rules every worker follows (design 7.1 step 6, 7.3 and 10.1). */
export const RULES = Object.freeze([
    "Decide reversible questions yourself and record why in your findings. Ask the owner only through githerd_ask_owner, and only for what only the owner can do: a one-way door, a visual approval, money, a credential, a login, a change to the machine, a new permission rule.",
    "Never write ACTION NEEDED. Skills that ask the user a question are answered by you.",
    "When someone asks you a question, answer it without acting on it. A message about another job gets: this is the worker for <your job>.",
    "Push only through githerd_push. Wait for checks, a lane, a release, another job or a background task only through githerd_wait, then end your turn; githerd rings you when it changes.",
    "Before a step that runs longer than 20 minutes with no output, call githerd_expect.",
    "Read issue and pull request comments and reviews through githerd_read; gh refuses them.",
    "Ask for a re-run of a failed CI job through githerd_rerun, never gh run rerun.",
    "Never stash, reset, check out a file, clean or rebase, never use --no-verify, never put an attribution line in a commit message, and never weaken a test, limit or threshold to make it pass.",
    "Work only in this worktree. Do not edit githerd, .claude, .github/workflows, .husky, tools/prepush.sh or visual-baselines.",
    "githerd never merges and you cannot: Mergify merges once checks and githerd/merge pass.",
    "Never comment on, react to, or open an issue or pull request in any Cytoscape.js repository; reading them is fine.",
    "Only the owner approves visual changes: never accept a baseline or change what a visual check captures. Never advance a breaking change; the owner groups majors. Bring a branch up to date by merging, never by rebasing.",
    "Never call a failure flaky or blame load or timing without naming the mechanism. Sign every commit. Write plain ASCII and American spelling. Fix a graphty-element defect in graphty-element, never around it in the graphty app.",
    "When your turn ends without the job done, take one of four ways forward: keep working, githerd_wait, githerd_ask_owner, or githerd_done with outcome failed and your findings.",
]);

/**
 * The lines about earlier attempts: each one's outcome, findings and theory, and whether this
 * attempt starts from the evidence rather than the earlier theories.
 * @param {any} job the job record
 * @returns {string[]} the lines, empty for a first attempt
 */
function earlier(job) {
    const attempts = (job.attempts ?? []).filter((/** @type {any} */ a) => a.endedAt);
    if (!attempts.length) return [];
    const lines = ["EARLIER ATTEMPTS:"];
    for (const [i, a] of attempts.entries()) {
        lines.push(`  ${i + 1}. ${a.outcome ?? "ended"}: ${a.findings || "no findings recorded"}`);
        if (a.theory) lines.push(`     theory: ${a.theory}`);
    }
    if (job.evidenceFirst) {
        lines.push(
            "  Two attempts have failed. Do not start from their theories: gather the evidence again first, then compare it with them.",
        );
    }
    return lines;
}

/**
 * The job's text for its worker.
 * @param {any} job the job record (`board.newJob`)
 * @param {{policies?: {text: string, endedAt?: string | null}[]}} [ctx] the owner's policies; only
 *   free-text policies that have not ended are shown
 * @returns {string} the text
 */
export function jobText(job, ctx = {}) {
    if (!(job.kind in TARGET_NOUN)) throw new Error(`no job text for kind ${job.kind}`);
    const refresh = job.kind === "triage" && job.facts?.scope === "refresh";
    const done = refresh
        ? REFRESH_DONE
        : job.kind === "incident"
          ? INCIDENT_DONE[job.facts?.scope ?? "master"]
          : DONE[job.kind];
    if (!done) throw new Error(`no done-condition for incident scope ${job.facts?.scope}`);
    const purpose = refresh ? REFRESH_PURPOSE : PURPOSE[job.kind];
    const lines = [`JOB ${job.id}`, `TARGET: ${TARGET_NOUN[job.kind]} ${job.target}`, `WHAT FOR: ${purpose}`];
    if (job.reason) lines.push(`WHY NOW: ${job.reason}`);
    lines.push(`DONE WHEN: ${done}`, `TO FINISH: ${FINISH[job.kind] ?? FINISH_DEFAULT}`, ...earlier(job));
    if (refresh) lines.push(...refreshLines(job.facts));
    const policies = (ctx.policies ?? []).filter((p) => !p.endedAt && p.text);
    if (policies.length) lines.push("OWNER POLICIES:", ...policies.map((p) => `  - ${p.text}`));
    lines.push("RULES:", ...RULES.map((r) => `  - ${r}`));
    if (job.kind === "review") {
        lines.push(
            "REVIEW RUBRIC (pick one verdict):",
            ...REVIEW_RUBRIC.map(([v, when]) => `  - ${v}: ${when}`),
            ...RUBRIC_ALLOWED.map((l) => `  ${l}`),
        );
    }
    return `${lines.join("\n")}\n`;
}
