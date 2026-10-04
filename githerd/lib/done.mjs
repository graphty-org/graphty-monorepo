/**
 * Done verification (design 5.1, 5.3 and 6): `githerd_done` is a claim, and the daemon accepts it
 * only once GitHub shows the job's done-condition. A claim that does not hold goes back to the
 * worker with what is missing; three in a row end the attempt (board.verifyResult). A claim whose
 * only gap is CI still running moves the job to `waiting` on those checks, and the daemon's poll
 * checks it again (`pollVerifying`).
 *
 * Every outcome must list each defect the worker saw with an issue or a commit that exists on
 * GitHub. `failed` ends the attempt with the findings. `split` needs the filed children, `not-needed`
 * goes through the propose, confirm and grace path of proposals.mjs, and `done` is checked per kind:
 *
 * - `pr` and `issue`: the pull request is based on master, not a draft, and its head on GitHub (the
 *   polled record, confirmed with `git ls-remote`) is the pushed commit, or extends it only by merges
 *   from master (the ancestor rule: the daemon's update-branch call, Mergify's update and the review
 *   tool's `update` all add such a merge). Its required checks are green, or the only failing one is
 *   the owner's visual review, and `githerd/merge` does not fail on a line the worker can fix. An
 *   `issue` job's pull request must reference the issue.
 * - `incident`: master and low-priority scopes need the lane's newest master run green at a commit
 *   containing the fix; a shared key also needs one canary pull request green on a head containing
 *   it; a release key must be gone from the daemon's release truth; a local key needs the gate to
 *   pass on the green commit.
 * - `triage`: every issue of the batch has a verdict, and on GitHub exactly one type, priority and
 *   effort label from the configured sets, the ones reported.
 * - `review`: a verdict for the patch id the job was made for.
 * - `title`: `Lint PR Title` green on the pull request's head.
 * - `major`: the pull request merged into master, and npm's latest version of the package is the
 *   new major.
 */

import * as board from "./board.mjs";
import { raiseItem } from "./notify.mjs";
import { recordVerdict } from "./proposals.mjs";
import { run } from "./worktrees.mjs";

/** `githerd/merge` decision lines a worker can fix itself: the `!` title, an unknown package, the issue revision. */
const WORKER_LINES = new Set([3, 4, 8]);
/** The check a `title` job makes green. */
const TITLE_CHECK = "Lint PR Title";
/** The triage verdicts and the label sets they need. */
const TRIAGE_VERDICTS = new Set(["keep", "duplicate", "obsolete", "fixed"]);
const REVIEW_VERDICTS = new Set(["pass", "loosened", "breaking-unmarked", "does-not-address", "security", "other"]);
const SHA = /^[0-9a-f]{7,40}$/;
/** The job kinds whose `not-needed` is a proposal to close their issue or pull request. */
const NOT_NEEDED_KINDS = new Set(["issue", "pr"]);

/**
 * @typedef {{holds: true} | {ciPending: string} | {missing: string[]} | null} Answer what a check
 *   found: the done-condition holds, only CI on that sha is pending, what is missing, or undecided
 * @typedef {object} DoneIo what verification reads, outside the state
 * @property {(ref: string) => Promise<string>} remoteHead `git ls-remote` of a branch: its sha, or
 *   "" when the branch is gone
 * @property {(pushed: string, head: string, ref: string) => Promise<boolean>} extendedByMerges
 *   whether `head` is `pushed` plus only merges from master (the ancestor rule)
 * @property {(commit: string, sha: string) => Promise<boolean>} contains whether `commit` is an
 *   ancestor of (or is) `sha`
 * @property {(n: number) => Promise<any>} issue an issue (or pull request) from GitHub, null when
 *   it does not exist
 * @property {(sha: string) => Promise<boolean>} commitExists whether GitHub has the commit
 * @property {(sha: string, name: string) => Promise<string>} checkRun the state of a named check
 *   run on a commit: SUCCESS, FAILURE, PENDING or MISSING
 * @property {(n: number) => Promise<any>} pull a pull request from GitHub
 * @property {(name: string) => Promise<string | null>} npmLatest npm's latest version of a package
 * @property {() => string[] | null} releaseOpen the open release-incident keys of the daemon's
 *   last release-truth read, null when it has none
 * @property {() => {sha: string, passed: boolean} | null} localGate the last gate result on the
 *   reference worktree, null when none
 * @typedef {{state: any, config: any, io: DoneIo, session?: string | null}} View what a check reads
 */

/**
 * A pull request or issue number from a job target such as `7`, `#7`, `pr:7`.
 * @param {string | number | null | undefined} target the target
 * @returns {number | null} the number
 */
function numberOf(target) {
    const n = Number(String(target ?? "").replace(/^\D+/, ""));
    return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * A defect's summary, shortened for a message.
 * @param {string} text the summary
 * @returns {string} at most 60 characters
 */
function short(text) {
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

/**
 * What is missing about the report's defects: each needs an issue or a commit that GitHub has.
 * @param {any[]} defects the reported defects
 * @param {DoneIo} io the reader
 * @returns {Promise<string[]>} the gaps
 */
async function defectGaps(defects, io) {
    const gaps = [];
    for (const d of defects ?? []) {
        const what = `defect "${short(d.summary)}"`;
        if (d.issue === undefined && !d.commit) {
            gaps.push(
                `${what} has neither an issue nor a commit: file an issue for it or name the commit that fixes it`,
            );
        } else if (d.issue !== undefined) {
            if (!(await io.issue(d.issue))) gaps.push(`${what}: issue #${d.issue} does not exist`);
        } else if (!SHA.test(d.commit) || !(await io.commitExists(d.commit))) {
            gaps.push(`${what}: commit ${d.commit} is not on GitHub`);
        }
    }
    return gaps;
}

/**
 * Whether a pull request's head on GitHub is the pushed commit, by the ancestor rule.
 * @param {any} rec the polled pull request record
 * @param {string | null} pushed the commit the worker pushed
 * @param {DoneIo} io the reader
 * @returns {Promise<string | null | true>} true when it is, the gap, or null when the poll is
 *   behind GitHub (decided on the next poll)
 */
async function headIsPushed(rec, pushed, io) {
    if (!pushed) return "pushedHead: name the commit you pushed";
    const remote = await io.remoteHead(rec.headRef);
    if (remote === "") return `branch ${rec.headRef} is gone from GitHub`;
    if (remote !== rec.headSha) return null;
    if (remote === pushed || (await io.extendedByMerges(pushed, remote, rec.headRef))) return true;
    return `GitHub's head of ${rec.headRef} is ${remote.slice(0, 9)}, not the pushed ${pushed.slice(0, 9)} or a merge from master on top of it`;
}

/**
 * The done-condition of one pull request: base master, not draft, head is the pushed commit,
 * required checks green or waiting only on the owner, `githerd/merge` not failing a worker line.
 * @param {number} number the pull request
 * @param {string | null} pushed the commit the worker pushed
 * @param {View} view what the check reads
 * @param {number | null} [issue] the issue it must reference
 * @returns {Promise<Answer>} the answer
 */
async function prAnswer(number, pushed, view, issue = null) {
    const rec = view.state.prs?.[String(number)];
    if (!rec) return { missing: [`#${number} is not an open pull request githerd has polled`] };
    const branch = view.state.master?.branch ?? "master";
    const gaps = [];
    if (rec.baseRef !== branch) gaps.push(`#${number} is based on ${rec.baseRef}, not ${branch}`);
    if (rec.draft) gaps.push(`#${number} is a draft`);
    if (issue !== null && !(rec.references ?? []).includes(issue)) {
        gaps.push(`#${number} does not reference #${issue}: add "Fixes #${issue}" to its description`);
    }
    const head = await headIsPushed(rec, pushed, view.io);
    if (head === null) return null;
    if (head !== true) gaps.push(head);
    const required = Object.entries(rec.required ?? {});
    const failing = required.filter(([, s]) => s === "FAILURE").map(([n]) => n);
    if (rec.ownerRejected) gaps.push("the owner rejected images: fix the captures he named");
    else if (failing.length && !rec.ownerGate) gaps.push(`required checks failing: ${failing.join(", ")}`);
    const gate = rec.mergeStatus;
    if (gate?.state === "failure" && WORKER_LINES.has(gate.line)) gaps.push(`githerd/merge: ${gate.description}`);
    if (gaps.length) return { missing: gaps };
    if (required.some(([, s]) => s === "PENDING" || s === "MISSING")) return { ciPending: rec.headSha };
    return { holds: true };
}

/**
 * A lane's newest master run is green at a commit containing the fix; while a run containing it is
 * in flight, CI is pending on it.
 * @param {string} name the lane
 * @param {string} fix the fix commit
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function laneAnswer(name, fix, view) {
    const lane = view.state.master?.lanes?.[name];
    if (!lane) return { missing: [`githerd has no lane ${name}`] };
    if (lane.verdict === "green" && lane.sha && (await view.io.contains(fix, lane.sha))) return { holds: true };
    for (const run of Object.values(lane.inFlight ?? {})) {
        if (await view.io.contains(fix, /** @type {any} */ (run).sha))
            return { ciPending: /** @type {any} */ (run).sha };
    }
    return {
        missing: [
            `the ${name} lane's newest master run is ${lane.verdict ?? "unknown"} at ${String(lane.sha).slice(0, 9)}, ` +
                `not green at a commit containing ${fix.slice(0, 9)}`,
        ],
    };
}

/**
 * One canary pull request among those that had the shared key is green on a head containing the fix.
 * @param {number[]} prs the pull requests that had the key
 * @param {string} fix the fix commit
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function canaryAnswer(prs, fix, view) {
    let pending = null;
    for (const n of prs) {
        const rec = view.state.prs?.[String(n)];
        if (!rec || !(await view.io.contains(fix, rec.headSha))) continue;
        const states = Object.values(rec.required ?? {});
        if (states.every((s) => s === "SUCCESS")) return { holds: true };
        if (!states.includes("FAILURE")) pending ??= rec.headSha;
    }
    if (pending) return { ciPending: pending };
    return {
        missing: [
            `no canary pull request (${prs.map((n) => "#" + n).join(", ")}) is green on a head containing ${fix.slice(0, 9)}`,
        ],
    };
}

/**
 * An incident's done-condition, by its scope.
 * @param {any} job the job
 * @param {any} report the report
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function incidentAnswer(job, report, view) {
    const scope = job.facts?.scope;
    if (scope === "release" || scope === "local") return conditionAnswer(job, view);
    const fix = report.pushedHead ?? job.pushedHead;
    if (!fix) return { missing: ["pushedHead: name the fix commit you pushed"] };
    if (report.pr && view.state.prs?.[String(report.pr)]) {
        // The fix pull request is still open: it must be merge-ready, then master runs it.
        const pr = await prAnswer(report.pr, fix, view);
        return pr && "holds" in pr ? { ciPending: fix } : pr;
    }
    const master = await laneAnswer(job.facts?.lane ?? String(job.target).split(" / ")[0], fix, view);
    if (scope !== "shared" || !master || !("holds" in master)) return master;
    return canaryAnswer(job.facts?.prs ?? [], fix, view);
}

/**
 * A release or local-gate incident: the daemon's own reading of the condition no longer shows it.
 * @param {any} job the job
 * @param {View} view what the check reads
 * @returns {Answer} the answer
 */
function conditionAnswer(job, view) {
    if (job.facts.scope === "release") {
        const open = view.io.releaseOpen();
        if (!open) return null;
        return open.includes(job.target)
            ? { missing: [`${job.target} is still a half-state: npm and the tags disagree`] }
            : { holds: true };
    }
    const gate = view.io.localGate();
    const green = view.state.master?.greenSha;
    if (!gate || gate.sha !== green) return null;
    return gate.passed
        ? { holds: true }
        : { missing: [`the pre-push gate still fails on the green commit ${green.slice(0, 9)}`] };
}

/**
 * A triage batch: a verdict for each issue, and the reported labels on GitHub, one of each set.
 * @param {any} job the job
 * @param {any} report the report
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function triageAnswer(job, report, view) {
    const result = Array.isArray(report.result) ? report.result : [];
    const sets = view.config.labels ?? { types: [], priorities: [], efforts: [] };
    const gaps = [];
    for (const n of job.facts?.batch ?? []) {
        if (!result.some((/** @type {any} */ r) => r.issue === n)) gaps.push(`#${n} has no verdict`);
    }
    if (!result.length) gaps.push("result: a verdict for each issue of the batch");
    for (const r of result) {
        if (!TRIAGE_VERDICTS.has(r.verdict)) gaps.push(`#${r.issue}: unknown verdict ${r.verdict}`);
        const issue = await view.io.issue(r.issue);
        if (!issue) {
            gaps.push(`#${r.issue} does not exist`);
            continue;
        }
        gaps.push(...labelGaps(r, issue, sets));
    }
    return gaps.length ? { missing: gaps } : { holds: true };
}

/**
 * Whether GitHub shows exactly the reported type, priority and effort label on an issue, one of each
 * configured set.
 * @param {any} r the issue's triage result
 * @param {any} issue the issue as GitHub has it
 * @param {Record<string, string[]>} sets the configured label sets
 * @returns {string[]} the gaps
 */
function labelGaps(r, issue, sets) {
    const names = (issue.labels ?? []).map((/** @type {any} */ l) => (typeof l === "string" ? l : l.name));
    const gaps = [];
    for (const [set, key] of [
        ["types", "type"],
        ["priorities", "priority"],
        ["efforts", "effort"],
    ]) {
        const on = names.filter((/** @type {string} */ l) => (sets[set] ?? []).includes(l));
        const want = r.labels?.[key];
        if (on.length !== 1 || on[0] !== want) {
            gaps.push(`#${r.issue} has ${key} labels [${on.join(", ")}] on GitHub, not exactly ${want ?? "one"}`);
        }
    }
    return gaps;
}

/**
 * A review: a known verdict for the patch the job was made for.
 * @param {any} job the job
 * @param {any} report the report
 * @returns {Answer} the answer
 */
function reviewAnswer(job, report) {
    const r = report.result;
    if (!r || Array.isArray(r) || !REVIEW_VERDICTS.has(r.verdict)) return { missing: ["result: a review verdict"] };
    const want = job.facts?.patchId;
    if (!want) return { missing: ["the job names no patch id; githerd cannot check this verdict"] };
    if (r.patchId !== want) return { missing: [`the verdict is for patch ${r.patchId}, not the job's ${want}`] };
    return { holds: true };
}

/**
 * A title job: `Lint PR Title` green on the pull request's head.
 * @param {number} number the pull request
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function titleAnswer(number, view) {
    const rec = view.state.prs?.[String(number)];
    if (!rec) return { missing: [`#${number} is not an open pull request githerd has polled`] };
    const state = await view.io.checkRun(rec.headSha, TITLE_CHECK);
    if (state === "SUCCESS") return { holds: true };
    if (state === "FAILURE") return { missing: [`${TITLE_CHECK} fails on ${rec.headSha.slice(0, 9)}`] };
    return { ciPending: rec.headSha };
}

/**
 * A major: the group's pull request merged into master and npm shows the new major.
 * @param {any} job the job; `facts.package` and `facts.major` name the package and its new major
 * @param {any} report the report
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function majorAnswer(job, report, view) {
    if (!report.pr) return { missing: ["pr: the pull request that carries the group"] };
    const pr = await view.io.pull(report.pr);
    const branch = view.state.master?.branch ?? "master";
    if (!pr?.merged || pr.base?.ref !== branch) return { missing: [`#${report.pr} is not merged into ${branch}`] };
    const latest = await view.io.npmLatest(job.facts?.package ?? job.target);
    if (latest === null) return null;
    if (Number(latest.split(".")[0]) >= Number(job.facts?.major)) return { holds: true };
    return {
        missing: [`npm's latest ${job.facts?.package ?? job.target} is ${latest}, not major ${job.facts?.major}`],
    };
}

/**
 * A `split`: the parent issue's children are filed, by the owner's account, and are not the parent.
 * @param {any} job the job
 * @param {any} report the report
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function splitAnswer(job, report, view) {
    if (job.kind !== "issue") return { missing: [`a ${job.kind} job cannot be split; report done or failed`] };
    const children = report.children ?? [];
    if (!children.length) return { missing: ["children: the issues you filed for the parts"] };
    const gaps = [];
    for (const n of children) {
        const child = await view.io.issue(n);
        if (!child || child.pull_request) gaps.push(`child #${n} is not an issue`);
        else if (n === numberOf(job.target)) gaps.push(`child #${n} is the parent itself`);
        else if (!board.byOwner(view.state, child.user?.login))
            gaps.push(`child #${n} was not filed by the owner's account`);
    }
    return gaps.length ? { missing: gaps } : { holds: true };
}

/**
 * `not-needed`: an issue's and a pull request's go through the proposal path (the proposal is the
 * record that holds it), or hold once GitHub shows the item closed.
 * @param {any} job the job
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
async function notNeededAnswer(job, view) {
    if (!NOT_NEEDED_KINDS.has(job.kind)) {
        return { missing: [`not-needed is for issue and pr jobs; report a ${job.kind} job done or failed`] };
    }
    const n = numberOf(job.target);
    const p = view.state.proposals?.[`${job.kind}:${n}`];
    const item = await (job.kind === "issue" ? view.io.issue(n) : view.io.pull(n));
    if (item?.state === "closed" || (p && !["dropped", "vetoed", "voided"].includes(p.status))) return { holds: true };
    return { missing: [`#${n} has no open proposal to close it: give evidence from current master`] };
}

/**
 * Checks a report against GitHub: the defects, then the outcome's done-condition. `failed` needs
 * only the defects.
 * @param {any} job the job
 * @param {any} report the `githerd_done` arguments
 * @param {View} view what the check reads
 * @returns {Promise<Answer>} the answer
 */
export async function verifyClaim(job, report, view) {
    const gaps = await defectGaps(report.defects, view.io);
    if (gaps.length) return { missing: gaps };
    if (report.outcome === "failed") return { holds: true };
    if (report.outcome === "split") return splitAnswer(job, report, view);
    if (report.outcome === "not-needed") return notNeededAnswer(job, view);
    const pushed = report.pushedHead ?? job.pushedHead ?? null;
    switch (job.kind) {
        case "pr":
            return prAnswer(job.pr ?? numberOf(job.target), pushed, view);
        case "issue": {
            const pr = report.pr ?? job.pr;
            if (!pr) return { missing: ["pr: the pull request that fixes the issue"] };
            return prAnswer(pr, pushed, view, numberOf(job.target));
        }
        case "incident":
            return incidentAnswer(job, report, view);
        case "triage":
            return triageAnswer(job, report, view);
        case "review":
            return reviewAnswer(job, report);
        case "title":
            return titleAnswer(job.pr ?? numberOf(job.target), view);
        default:
            return majorAnswer(job, report, view);
    }
}

/**
 * The same check, with a GitHub or git failure read as "undecided" rather than as a gap.
 * @param {any} job the job
 * @param {any} report the report
 * @param {View} view what the check reads
 * @returns {Promise<{answer: Answer, error?: string}>} the answer, and the failure if one hid it
 */
async function check(job, report, view) {
    try {
        return { answer: await verifyClaim(job, report, view) };
    } catch (err) {
        return { answer: null, error: /** @type {Error} */ (err).message };
    }
}

/**
 * What the worker's tool result says about an answer.
 * @param {Answer} answer the answer
 * @param {any} after what board.verifyResult returned
 * @param {string} [error] why it was undecided
 * @returns {{verified: boolean, missing?: string[], ended?: boolean}} the result
 */
function toolAnswer(answer, after, error) {
    if (answer && "holds" in answer) return { verified: true };
    if (answer && "ciPending" in answer) {
        return {
            verified: false,
            missing: [`checks still running on ${answer.ciPending.slice(0, 9)}; githerd rings you when they finish`],
        };
    }
    if (!answer) {
        const why = error ? `GitHub could not be read (${error})` : "GitHub's answer is behind the branch";
        return { verified: false, missing: [`not decided yet: ${why}; githerd checks again on its next poll`] };
    }
    const missing = /** @type {{missing: string[]}} */ (answer).missing;
    return { verified: false, missing, ...(after?.action === "working" ? {} : { ended: true }) };
}

/**
 * Records a triage batch's verdicts and an issue's or pull request's `not-needed` as proposals.
 * @param {any} job the job
 * @param {any} report the report
 * @param {View} view what the check reads
 * @param {Date} now the current time
 * @returns {string[]} verdicts the proposal path refused
 */
function recordVerdicts(job, report, view, now) {
    const at = now.toISOString();
    const session = view.session ?? job.holder?.session ?? "unknown";
    /** @type {any[]} */
    let verdicts = [];
    if (report.outcome === "not-needed") {
        const verdict = job.kind === "pr" ? "not-needed-pr" : "not-needed";
        verdicts = [{ verdict, number: numberOf(job.target), evidence: report.evidence }];
    } else if (job.kind === "triage" && Array.isArray(report.result)) {
        verdicts = report.result.map((/** @type {any} */ r) => ({
            verdict: r.verdict,
            number: r.issue,
            of: r.of,
            evidence: r.evidence,
        }));
    }
    const refused = [];
    for (const v of verdicts) {
        const r = recordVerdict(view.state, { ...v, session, at });
        if (r.refused) refused.push(`#${v.number}: ${r.refused}`);
    }
    return refused;
}

/** The jobs whose `githerd_done` check is in progress, per daemon state. */
const checking = new WeakMap();

/**
 * The set of jobs whose done check runs, for one daemon state.
 * @param {any} state the daemon state
 * @returns {Set<string>} the job ids
 */
function inProgress(state) {
    let jobs = checking.get(state);
    if (!jobs) checking.set(state, (jobs = new Set()));
    return jobs;
}

/**
 * `githerd_done` for a job the caller holds: the report is checked against GitHub before it is
 * accepted. `failed` ends the attempt with the findings (the defects still have to be filed). One
 * check per job runs at a time, and the job must still be the caller's once GitHub has answered.
 * @param {{state: any, config: any, now: Date, io: DoneIo, commit: (entry: any) => Promise<void>}} ctx
 *   the request context
 * @param {any} job the caller's job
 * @param {any} report the arguments
 * @param {string | null} session the calling session
 * @returns {Promise<{text: string, isError?: boolean}>} the tool result
 */
export async function githerdDone(ctx, job, report, session) {
    if (job.state !== "working")
        throw new Error(`${job.id} is ${job.state}; githerd_done is for a job you are working on`);
    const jobs = inProgress(ctx.state);
    if (jobs.has(job.id)) {
        return reply({
            verified: false,
            missing: ["a done check for this job is already running; wait for its answer"],
        });
    }
    jobs.add(job.id);
    try {
        return await settleClaim(ctx, job, report, session);
    } finally {
        jobs.delete(job.id);
    }
}

/**
 * Checks one claim and applies the answer, unless the job moved while GitHub was read.
 * @param {{state: any, config: any, now: Date, io: DoneIo, commit: (entry: any) => Promise<void>}} ctx
 *   the request context
 * @param {any} job the caller's job
 * @param {any} report the arguments
 * @param {string | null} session the calling session
 * @returns {Promise<{text: string, isError?: boolean}>} the tool result
 */
async function settleClaim(ctx, job, report, session) {
    const { now } = ctx;
    const holder = job.holder;
    const moved = () => job.state !== "working" || job.holder?.session !== holder?.session;
    const movedReply = () =>
        reply({
            verified: false,
            missing: [`${job.id} became ${job.state} while this claim was checked; it was not applied`],
        });
    const view = { state: ctx.state, config: ctx.config, io: ctx.io, session };
    // An issue's or pull request's not-needed is a proposal; it is recorded only for a report whose
    // defects are filed.
    const filed = async () => (await defectGaps(report.defects, ctx.io).catch(() => ["unread"])).length === 0;
    if (report.outcome === "not-needed" && NOT_NEEDED_KINDS.has(job.kind) && (await filed())) {
        if (moved()) return movedReply();
        const refused = recordVerdicts(job, report, view, now);
        if (refused.length) return reply({ verified: false, missing: refused });
    }
    const { answer, error } = await check(job, report, view);
    if (moved()) return movedReply();
    job.report = { ...report, at: now.toISOString(), session };
    if (report.outcome === "failed") {
        if (!answer || !("holds" in answer)) return reply(toolAnswer(answer, { action: "working" }, error));
        const ended = board.endAttempt(
            job,
            { outcome: "failed", findings: report.findings, theory: report.theory ?? "" },
            now,
        );
        afterSettle(ctx.state, job, holder, ended, now);
        await ctx.commit({ kind: "done-report", job: job.id, outcome: "failed", next: ended.action });
        return reply({ verified: true });
    }
    board.move(job, "verifying", now);
    const after = board.verifyResult(job, answer, now);
    if (after?.action === "waiting") job.waitingFor.verify = true;
    if (after?.action === "done" && job.kind === "triage") recordVerdicts(job, report, view, now);
    if (after?.action === "done" && report.children) job.children = report.children;
    afterSettle(ctx.state, job, holder, after, now);
    await ctx.commit({
        kind: "done-report",
        job: job.id,
        outcome: report.outcome,
        next: after?.action ?? "verifying",
        error,
    });
    return reply(toolAnswer(answer, after, error));
}

/**
 * What follows a job leaving its session (design 5.3 and 7.3): a job that ended done, failed or
 * back in the queue lost its holder, so the session githerd started for it is put on
 * `state.retiring`, which the daemon ends (its window, then what it left running in the worktree).
 * An urgent job whose last attempt failed raises one owner item with the attempts' findings.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {any} holder its holder before the change
 * @param {any} result what board.endAttempt or board.verifyResult returned
 * @param {Date} now the current time
 */
export function afterSettle(state, job, holder, result, now) {
    if (holder?.pane && !job.holder) {
        state.retiring ??= [];
        state.retiring.push({ job: job.id, holder, reason: `job ${job.state}`, at: now.toISOString() });
    }
    if (result?.action === "failed" && result.ownerItem) {
        const findings = job.attempts
            .map((/** @type {any} */ a, /** @type {number} */ i) => `${i + 1}. ${a.outcome}: ${a.findings || "none"}`)
            .join(" ");
        raiseItem(
            state,
            {
                id: `failed-urgent:${job.id}`,
                kind: "failed-urgent",
                question: `${job.id} failed after ${job.attempts.length} attempts. Findings: ${findings}`,
                target: itemTarget(job),
            },
            now,
        );
    }
}

/**
 * The pull request or issue an owner item about a job is posted on.
 * @param {any} job the job
 * @returns {string | null} `pr:<n>`, `issue:<n>`, or null when the job has neither
 */
function itemTarget(job) {
    if (job.pr) return `pr:${job.pr}`;
    const n = numberOf(job.target);
    if (n && job.kind === "pr") return `pr:${n}`;
    if (n && job.kind === "issue") return `issue:${n}`;
    const pr = job.report?.pr;
    return pr ? `pr:${pr}` : null;
}

/**
 * A tool result from an answer object.
 * @param {{verified: boolean, missing?: string[], ended?: boolean}} body the answer
 * @returns {{text: string, isError?: boolean}} the result
 */
function reply(body) {
    return body.verified ? { text: JSON.stringify(body) } : { text: JSON.stringify(body), isError: true };
}

/**
 * Checks again, once per poll, every job whose claimed done is not settled: `verifying` jobs (an
 * undecided answer counts toward the two-poll bound) and jobs that verification left `waiting` on
 * CI, which end `done`, or go back to work with the news of what is missing.
 * @param {any} state the daemon state
 * @param {{config: any, io: DoneIo, now: Date}} ctx the context
 * @returns {Promise<{job: string, action: string}[]>} what changed
 */
export async function pollVerifying(state, ctx) {
    const out = [];
    for (const job of Object.values(state.jobs ?? {})) {
        const j = /** @type {any} */ (job);
        const waiting = j.state === "waiting" && j.waitingFor?.verify;
        if (!j.report || (j.state !== "verifying" && !waiting)) continue;
        const before = j.state;
        const holder = j.holder;
        const { answer } = await check(j, j.report, { state, config: ctx.config, io: ctx.io });
        // A job that moved while GitHub was read (the watchdog, a death) is left to its new state.
        if (j.state !== before || (waiting && !j.waitingFor?.verify)) continue;
        const result = waiting ? settleWaiting(j, answer, ctx.now) : board.verifyResult(j, answer, ctx.now);
        const action = typeof result === "string" ? result : result?.action;
        if (action === "waiting") j.waitingFor.verify = true;
        afterSettle(state, j, holder, typeof result === "string" ? null : result, ctx.now);
        if (action) out.push({ job: j.id, action });
    }
    return out;
}

/**
 * Settles a job that verification left waiting on CI: done once its claim holds, back to work with
 * news when something is missing, unchanged while CI runs or the answer is undecided.
 * @param {any} job the job
 * @param {Answer} answer the answer
 * @param {Date} now the current time
 * @returns {string | null} the new state, or null when unchanged
 */
function settleWaiting(job, answer, now) {
    if (answer && "holds" in answer) {
        board.move(job, "done", now);
        return "done";
    }
    if (!answer || !("missing" in answer)) return null;
    job.news.push({ at: now.toISOString(), text: `not done yet: ${answer.missing.join("; ")}`, acked: false });
    board.move(job, "working", now);
    return "working";
}

/**
 * The real reader: git in the daemon's repository, the GitHub client, npm's registry.
 * @param {{root: string, repo: string, github: any, remote?: string, branch?: string,
 *   fetchFn?: typeof fetch, releaseOpen?: () => string[] | null,
 *   localGate?: () => {sha: string, passed: boolean} | null}} options the repository, the
 *   `owner/name`, the GitHub client, the remote and default branch, and the daemon's last release
 *   truth and reference gate result
 * @returns {DoneIo} the reader
 */
export function doneIo({
    root,
    repo,
    github,
    remote = "origin",
    branch = "master",
    fetchFn = fetch,
    releaseOpen,
    localGate,
}) {
    const git = (/** @type {string[]} */ args) => run("git", args, { cwd: root });
    const ancestor = async (/** @type {string} */ a, /** @type {string} */ b) => {
        const r = await git(["merge-base", "--is-ancestor", a, b]);
        if (r.code > 1) throw new Error(`git merge-base failed: ${r.stderr.trim()}`);
        return r.code === 0;
    };
    const known = async (/** @type {string} */ sha) => (await git(["cat-file", "-e", `${sha}^{commit}`])).code === 0;
    const fetchRefs = async (/** @type {string[]} */ refs) => {
        const r = await git(["fetch", "-q", "--no-tags", remote, ...refs]);
        if (r.code !== 0) throw new Error(`git fetch failed: ${r.stderr.trim()}`);
    };
    const remoteHead = async (/** @type {string} */ ref) => {
        const r = await git(["ls-remote", remote, `refs/heads/${ref}`]);
        if (r.code !== 0) throw new Error(`git ls-remote failed: ${r.stderr.trim()}`);
        return r.stdout.split("\t")[0].trim();
    };
    /**
     * A GitHub read that answers null for a 404 or 422 (no such item).
     * @param {string} path the path
     * @returns {Promise<any>} the body, or null
     */
    const get = async (path) => {
        try {
            return (await github.get(path)).body ?? null;
        } catch (err) {
            if ([404, 422].includes(/** @type {any} */ (err)?.status)) return null;
            throw err;
        }
    };
    return {
        remoteHead,
        async extendedByMerges(pushed, head, ref) {
            const master = await remoteHead(branch);
            await fetchRefs([ref, branch]);
            if (!(await known(pushed)) || !(await ancestor(pushed, head))) return false;
            const r = await git(["rev-list", "--first-parent", "--parents", `${pushed}..${head}`]);
            if (r.code !== 0) throw new Error(`git rev-list failed: ${r.stderr.trim()}`);
            // ponytail: a merge is recognized by its shape (a first-parent merge whose other parents
            // are on master), not by who made it; read the committer if a worker ever hides work in one.
            for (const line of r.stdout.trim().split("\n").filter(Boolean)) {
                const others = line.split(" ").slice(2);
                if (!others.length) return false;
                for (const p of others) if (!(await ancestor(p, master))) return false;
            }
            return true;
        },
        async contains(commit, sha) {
            if (!(await known(sha))) await fetchRefs([branch]);
            return (await known(commit)) && (await known(sha)) && ancestor(commit, sha);
        },
        issue: (n) => get(`repos/${repo}/issues/${n}`),
        commitExists: async (sha) => (await get(`repos/${repo}/commits/${sha}`)) !== null,
        async checkRun(sha, name) {
            const body = await get(`repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(name)}`);
            const runs = [...(body?.check_runs ?? [])].sort((a, b) => b.id - a.id);
            if (!runs.length) return "MISSING";
            if (runs[0].status !== "completed") return "PENDING";
            return ["success", "neutral", "skipped"].includes(runs[0].conclusion) ? "SUCCESS" : "FAILURE";
        },
        pull: (n) => get(`repos/${repo}/pulls/${n}`),
        async npmLatest(name) {
            try {
                const res = await fetchFn(`https://registry.npmjs.org/${name.replace("/", "%2f")}`, {
                    headers: { accept: "application/vnd.npm.install-v1+json" },
                    signal: AbortSignal.timeout(15_000),
                });
                if (!res.ok) return null;
                return (await res.json())?.["dist-tags"]?.latest ?? null;
            } catch {
                return null;
            }
        },
        releaseOpen: releaseOpen ?? (() => null),
        localGate: localGate ?? (() => null),
    };
}
