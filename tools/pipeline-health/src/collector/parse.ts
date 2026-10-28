// Pure mapping from GitHub's responses to the model's raw items and the values the collector observes
// (design/ci/health-dashboard.md section 4). No I/O here, so every rule is tested on recorded responses.

import type {
    CostItem,
    IssueItem,
    JobItem,
    LoadKind,
    PrStages,
    PullRequestItem,
    RunItem,
    StepItem,
    TestItem,
} from "../model/items.js";
import { DAY, HOUR, MIN } from "../model/items.js";
import type { LaneJob, OwnerWait, ReleaseSeen, WorkflowState } from "../model/snapshots.js";
import { failingChecks } from "./snapshots.js";

// ---------------------------------------------------------------------------------------------------------------
// The REST shapes the collector reads (only the fields it uses).

export interface GhRun {
    id: number;
    name: string;
    path: string;
    head_branch: string | null;
    head_sha: string;
    event: string;
    status: string;
    conclusion: string | null;
    run_attempt: number;
    created_at: string;
    run_started_at?: string;
    updated_at: string;
    display_title?: string;
    check_suite_node_id?: string;
    triggering_actor?: { login: string } | null;
    pull_requests?: { number: number }[];
    repository?: { full_name: string };
}

export interface GhStep {
    name: string;
    status?: string;
    conclusion: string | null;
    number?: number;
    started_at: string | null;
    completed_at: string | null;
}

export interface GhJob {
    id: number;
    run_id: number;
    run_attempt: number;
    workflow_name?: string;
    name: string;
    status: string;
    conclusion: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    labels: string[];
    steps?: GhStep[];
}

const ms = (iso: string | null | undefined): number | undefined => (iso ? Date.parse(iso) : undefined);
const msOr = (iso: string | null) => (iso ? Date.parse(iso) : NaN);
const opt = <K extends string, V>(k: K, v: V | undefined | null) =>
    (v === undefined || v === null ? {} : { [k]: v }) as Partial<Record<K, V>>;

/** "ci.yml" from ".github/workflows/ci.yml" (a dynamic run's path keeps its own name). */
export const workflowFile = (path: string): string => path.split("/").pop()?.split("@")[0] ?? path;

// ---------------------------------------------------------------------------------------------------------------
// Runs, jobs, steps.

export function toRunItem(run: GhRun, repo: string, extra: Partial<RunItem> = {}): RunItem {
    const completed = run.status === "completed";
    const workflow = workflowFile(run.path);
    const pr = run.pull_requests?.[0]?.number;
    return {
        kind: "run",
        id: `${repo}/${run.id}`,
        attempt: run.run_attempt,
        repo,
        runId: run.id,
        workflow,
        event: run.event,
        branch: run.head_branch ?? "",
        sha: run.head_sha,
        ...opt("pr", pr),
        status: run.status,
        ...opt("conclusion", run.conclusion),
        ...(workflow === "ci.yml" && run.event === "pull_request" ? { runKind: "pr", budgetMs: 20 * MIN } : {}),
        createdAt: Date.parse(run.created_at),
        ...opt("startedAt", ms(run.run_started_at)),
        // The runs API has no completion time; a completed run's last update is its end.
        ...(completed ? { completedAt: Date.parse(run.updated_at) } : {}),
        ...extra,
    };
}

/** A test family, bins folded: "Test (graphty-element-browser-3)" and "CI / Test (graphty-3)" lose the bin. */
export function family(name: string): string | undefined {
    const m = /(?:^|\/ )Test \(([^$)]+?)(?:-\d+)?\)$/.exec(name);
    return m?.[1];
}

/** Which runner limit a job counts against (section 4.3): every GitHub-hosted job the 60, macOS also its 5. */
export function pool(labels: string[]): JobItem["pool"] {
    if (labels.some((l) => /macos/i.test(l))) return "macos";
    if (labels.some((l) => /^(ubuntu|windows)-/i.test(l) || l === "ubuntu-latest" || l === "windows-latest"))
        return "linux_windows";
    return "other";
}

/**
 * A GitHub-hosted job's OS (its list-price rate, section 7).
 * @param labels the job's runner labels
 * @returns the OS, or undefined for self-hosted and machine.dev runners
 */
export function runnerOs(labels: string[]): JobItem["os"] {
    const OS: [RegExp, NonNullable<JobItem["os"]>][] = [
        [/^macos-/i, "macos"],
        [/^windows-/i, "windows"],
        [/^ubuntu-/i, "linux"],
    ];
    return OS.find(([re]) => labels.some((l) => re.test(l)))?.[1];
}

/** A skipped job is created, started and completed at once (sources.md section 1): no wait, no duration. */
const isSkipped = (j: GhJob) => j.conclusion === "skipped";

/**
 * The kind of load a run puts on the runners (4.3, runner-minutes per merge).
 * @param run the run
 * @returns full for release.yml (whose called workflows run inside it), pr (a pull request's, including CodeQL's
 *     default setup scanning one: event `dynamic` on `refs/pull/<n>/head`), master for a push to master, else other
 */
export function loadKind(run: Pick<GhRun, "path" | "event" | "head_branch">): LoadKind {
    if (workflowFile(run.path) === "release.yml") return "full";
    if (run.event === "pull_request" || run.event === "pull_request_target") return "pr";
    if (run.event === "dynamic" && run.head_branch?.startsWith("refs/pull/")) return "pr";
    if (run.event === "push" && run.head_branch === "master") return "master";
    return "other";
}

export function toJobItem(j: GhJob, repo: string, workflow: string, hang = false, load?: LoadKind): JobItem {
    const skipped = isSkipped(j);
    const fam = family(j.name);
    return {
        kind: "job",
        id: `${repo}/${j.id}`,
        attempt: j.run_attempt,
        repo,
        runId: j.run_id,
        workflow,
        name: j.name,
        ...opt("family", fam),
        pool: pool(j.labels),
        ...opt("os", runnerOs(j.labels)),
        ...opt("load", load),
        status: j.status,
        ...opt("conclusion", j.conclusion),
        ...(hang ? { hang: true } : {}),
        createdAt: Date.parse(j.created_at),
        ...(skipped ? {} : opt("startedAt", ms(j.started_at))),
        ...(skipped ? {} : opt("completedAt", ms(j.completed_at))),
    };
}

export function toStepItems(j: GhJob, repo: string, workflow: string): StepItem[] {
    return (j.steps ?? [])
        .filter((s) => s.conclusion !== "skipped" && s.completed_at)
        .map((s, i) => ({
            kind: "step" as const,
            id: `${repo}/${j.id}/${s.number ?? i + 1}`,
            attempt: j.run_attempt,
            repo,
            runId: j.run_id,
            jobId: j.id,
            workflow,
            job: j.name,
            name: s.name,
            ...opt("conclusion", s.conclusion),
            ...opt("startedAt", ms(s.started_at)),
            ...opt("completedAt", ms(s.completed_at)),
        }));
}

// ---------------------------------------------------------------------------------------------------------------
// Cancels and hangs, from the check runs' annotations (4, "Master state": never from timing).

export interface CheckRunNote {
    name: string;
    conclusion: string | null;
    annotations: string[];
}

export type CancelClass = NonNullable<RunItem["cancelClass"]>;

export function classifyCancel(checkRuns: CheckRunNote[]): CancelClass {
    // No job was ever created: the run was cancelled while it waited, because a newer push or dispatch replaced it
    // in its concurrency group (ci.yml since #3855/#3940). It never ran, so it says nothing about the commit.
    if (!checkRuns.length) return "superseded";
    const all = checkRuns.flatMap((c) => c.annotations);
    if (all.some((m) => /Canceling since a higher priority waiting request for/i.test(m))) return "superseded";
    if (all.some((m) => /The run was cancell?ed by @/i.test(m))) return "by-hand";
    return "red";
}

/** Names of jobs that ended at their own timeout-minutes (a hang). */
export function timedOutJobs(checkRuns: CheckRunNote[]): Set<string> {
    return new Set(
        checkRuns
            .filter((c) => c.annotations.some((m) => /has exceeded the maximum execution time/i.test(m)))
            .map((c) => c.name),
    );
}

/** The GraphQL answer for `nodes(ids: [check suite ids])`, flattened. */
export interface SuiteNode {
    id: string;
    checkRuns?: { nodes: { name: string; conclusion: string | null; annotations: { nodes: { message: string }[] } }[] };
}
export const suiteNotes = (node: SuiteNode | null): CheckRunNote[] =>
    (node?.checkRuns?.nodes ?? []).map((c) => ({
        name: c.name,
        conclusion: c.conclusion?.toLowerCase() ?? null,
        annotations: c.annotations.nodes.map((a) => a.message),
    }));

// ---------------------------------------------------------------------------------------------------------------
// Master state (4.1), from the newest ci.yml push runs on master.

const RED = new Set(["failure", "timed_out", "startup_failure"]);

export interface MasterState {
    red: boolean;
    /** When the current red span began (the first red build after the last green), when red. */
    redSince?: number;
    redBuilds: number;
    /** The newest build queued or running, and since when. */
    buildingSince?: number;
}

/** Runs newest first or in any order; a gray cancel (superseded, by hand) keeps the verdict before it. */
export function masterState(runs: RunItem[]): MasterState {
    const sorted = [...runs].sort((a, b) => b.createdAt - a.createdAt);
    const building = sorted.find((r) => r.status !== "completed");
    const out: MasterState = { red: false, redBuilds: 0, ...opt("buildingSince", building?.createdAt) };
    for (const r of sorted) {
        if (r.status !== "completed") continue;
        const c = r.conclusion ?? "";
        const red = RED.has(c) || (c === "cancelled" && r.cancelClass === "red");
        if (c === "success") break;
        if (!red) continue; // gray: superseded, by hand, skipped, neutral
        out.red = true;
        out.redBuilds++;
        out.redSince = r.completedAt ?? r.createdAt;
    }
    return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Runner use (4.3), counted in jobs of every unfinished run, never from run status.

export interface RunnerUse {
    running: Record<JobItem["pool"], number>;
    queued: number;
    /** Jobs queued over 2 minutes. */
    queuedOver2: number;
    longestQueuedMs: number;
}

export function runnerUse(jobs: GhJob[], runsWithoutJobs: GhRun[], nowMs: number): RunnerUse {
    const use: RunnerUse = {
        running: { linux_windows: 0, macos: 0, other: 0 },
        queued: 0,
        queuedOver2: 0,
        longestQueuedMs: 0,
    };
    for (const j of jobs) {
        const p = pool(j.labels);
        if (j.status === "in_progress") {
            use.running[p]++;
            if (p === "macos") use.running.linux_windows++; // a macOS job counts against the 60 too
        } else if (j.status === "queued" || j.status === "waiting" || j.status === "pending") {
            if (p === "other") continue; // machine.dev and self-hosted pools are outside GitHub's limit
            const age = nowMs - Date.parse(j.created_at);
            use.queued++;
            if (age > 2 * MIN) use.queuedOver2++;
            use.longestQueuedMs = Math.max(use.longestQueuedMs, age);
        }
    }
    for (const r of runsWithoutJobs)
        use.longestQueuedMs = Math.max(use.longestQueuedMs, nowMs - Date.parse(r.created_at));
    return use;
}

/**
 * An unfinished pull_request run of the home repository whose pull request is no longer open (merged or closed):
 * GitHub can leave it queued for hours (run 40441556963, "Lint PR Title" queued 21 h after #3940 merged). It holds no
 * runner and nobody waits on it, so runner use leaves it out. GitHub empties a merged pull request's runs'
 * pull_requests, so a run is matched to an open pull request by number or head branch. `open` must be every open pull
 * request: with a truncated list nothing is called a ghost.
 */
export function isGhostRun(run: GhRun, open: GqlPr[], complete: boolean): boolean {
    if (!complete || run.event !== "pull_request" || run.status === "completed") return false;
    const listed = new Set((run.pull_requests ?? []).map((p) => p.number));
    return !open.some((p) => listed.has(p.number) || p.headRefName === run.head_branch);
}

/** Saturated: jobs queued > 2 min while running >= limit - 3. Not assigned: queued > 2 min while running < 75%. */
export function runnerFlags(use: RunnerUse, limit: number): { saturated: boolean; unassigned: boolean } {
    const waiting = use.queuedOver2 > 0;
    return {
        saturated: waiting && use.running.linux_windows >= limit - 3,
        unassigned: waiting && use.running.linux_windows < 0.75 * limit,
    };
}

// ---------------------------------------------------------------------------------------------------------------
// Pull requests (4.2), from one GraphQL query.

export interface GqlCheck {
    __typename: string;
    name?: string;
    status?: string;
    conclusion?: string | null;
    context?: string;
    state?: string;
    createdAt?: string;
    startedAt?: string;
}

export interface GqlPr {
    number: number;
    title: string;
    state: string;
    isDraft: boolean;
    reviewDecision: string | null;
    baseRefName: string;
    headRefName?: string;
    headRefOid?: string;
    createdAt: string;
    updatedAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    autoMergeRequest: { enabledAt: string } | null;
    /** Null for a deleted account. */
    author?: { login: string } | null;
    labels: { nodes: { name: string }[] };
    readyEvents: { nodes: { __typename: string; createdAt?: string }[] };
    /** Only on the open page (the recent page leaves checks out). */
    commits?: {
        nodes: {
            commit: {
                oid?: string;
                committedDate?: string;
                statusCheckRollup: { state: string; contexts: { nodes: GqlCheck[] } } | null;
            };
        }[];
    };
}

/** Labels that keep auto-merge off by rule, so the pull request waits on the owner. */
const OWNER_LABELS = new Set(["hold", "needs-decision"]);

/** Auto-merge off by rule (4.2): a hold label, a breaking title, or a required review (code-owner paths). */
export function ownerWait(p: GqlPr): boolean {
    if (p.labels.nodes.some((l) => OWNER_LABELS.has(l.name))) return true;
    if (/^\w+(\([^)]*\))?!:/.test(p.title)) return true;
    return p.reviewDecision === "REVIEW_REQUIRED";
}

/** The repository owner's account: tools/pr-open.sh leaves auto-merge off on a pull request he opened. */
export const OWNER_LOGIN = "apowers313";

/**
 * Waiting on the owner now: auto-merge off by rule (ownerWait), or his own pull request with auto-merge off, which
 * only he merges. Left out of the open count and the oldest open (4.2); listed under "Waiting on the owner".
 */
export const waitsOnOwner = (p: GqlPr): boolean =>
    ownerWait(p) || (p.author?.login === OWNER_LOGIN && !p.autoMergeRequest);

/** Ready time: the last ReadyForReviewEvent, else creation when it was never a draft. */
export function readyAt(p: GqlPr): number | undefined {
    const ready = p.readyEvents.nodes.filter((e) => e.__typename === "ReadyForReviewEvent" && e.createdAt);
    if (ready.length) return Date.parse(ready[ready.length - 1].createdAt!);
    const drafted = p.readyEvents.nodes.some((e) => e.__typename === "ConvertToDraftEvent");
    return p.isDraft || drafted ? undefined : Date.parse(p.createdAt);
}

export function toPrItem(p: GqlPr, repo: string): PullRequestItem {
    return {
        kind: "pr",
        id: `${repo}#${p.number}`,
        attempt: 1,
        repo,
        number: p.number,
        base: p.baseRefName,
        createdAt: Date.parse(p.createdAt),
        ...opt("readyAt", readyAt(p)),
        ...opt("mergedAt", ms(p.mergedAt)),
        ...opt("closedAt", ms(p.closedAt)),
        ...(ownerWait(p) ? { ownerWait: true } : {}),
    };
}

/** The hold labels and breaking title that keep a pull request waiting on the owner, with the CODEOWNERS paths. */
export function ownerWaitOf(p: GqlPr, files: string[], codeowners: string[]): OwnerWait {
    return {
        number: p.number,
        title: p.title,
        since: readyAt(p) ?? Date.parse(p.createdAt),
        paths: ownedPaths(files, codeowners),
        breaking: /^\w+(\([^)]*\))?!:/.test(p.title),
        labels: p.labels.nodes.map((l) => l.name).filter((l) => OWNER_LABELS.has(l)),
    };
}

/** A CODEOWNERS pattern as a path test: "/x/" a directory at the root, "x" anywhere, "*" within a name. */
function ownerPattern(pat: string): RegExp {
    const body = (pat.startsWith("/") ? pat.slice(1) : `**/${pat}`).replace(/\/$/, "");
    const re = body
        .split("**/")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*"))
        .join("(?:.*/)?");
    return new RegExp(`^${re}(?:/.*)?$`);
}

/** The CODEOWNERS patterns (as written, leading "/" dropped) that some of `files` match, in CODEOWNERS order. */
export function ownedPaths(files: string[], codeowners: string[]): string[] {
    return codeowners
        .filter((pat) => {
            const re = ownerPattern(pat);
            return files.some((f) => re.test(f));
        })
        .map((pat) => pat.replace(/^\//, ""));
}

/** The patterns of a CODEOWNERS file, one per rule line. */
export const codeownerPatterns = (text: string): string[] =>
    text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => l.split(/\s+/)[0]);

/** One ci.yml pull request run attempt for "Where the time goes": [start, first job start, end, passed 1/0]. */
export type PrRun = [number, number, number, 0 | 1];

/**
 * The pull request a run belongs to. GitHub empties a run's pull_requests once its pull request merged, so
 * fall back to the head branch among the cycle's pull requests, preferring one whose head is the run's commit,
 * then a merged one when it is the only pull request with that branch name (fork branches named "main" collide);
 * otherwise none.
 */
export function prOfRun(
    run: Pick<GhRun, "pull_requests" | "head_branch" | "head_sha">,
    prs: GqlPr[],
): number | undefined {
    const listed = run.pull_requests?.[0]?.number;
    if (listed !== undefined || !run.head_branch) return listed;
    const same = prs.filter((p) => p.headRefName === run.head_branch);
    return (
        same.find((p) => p.headRefOid === run.head_sha) ??
        (same.length === 1 ? same.find((p) => p.mergedAt) : undefined)
    )?.number;
}

export function prRunOf(run: GhRun, jobs: GhJob[]): PrRun | undefined {
    if (workflowFile(run.path) !== "ci.yml" || run.event !== "pull_request" || run.status !== "completed")
        return undefined;
    if (run.conclusion !== "success" && run.conclusion !== "failure") return undefined;
    const start = Date.parse(run.run_attempt > 1 && run.run_started_at ? run.run_started_at : run.created_at);
    const starts = jobs.map((j) => msOr(j.started_at)).filter(Number.isFinite);
    const first = starts.length ? Math.max(start, Math.min(...starts)) : start;
    return [start, first, Math.max(first, Date.parse(run.updated_at)), run.conclusion === "success" ? 1 : 0];
}

/**
 * Where a merged pull request's time went (4.2 Where the time goes), from its ci.yml runs before the merge: waiting
 * for a runner until the first job started, checks running from then to the run's end, red from a failed run's end
 * to the next run, and green to merged after the last run passed.
 * ponytail: only the first job's runner wait counts as waiting; later jobs' waits count as checks running, and
 * overlapping runs add up. Per-job waits if the bars ever need to be exact.
 */
export function prStages(runs: PrRun[], mergedAt: number): PrStages | undefined {
    const rs = runs.filter((r) => r[0] <= mergedAt).sort((a, b) => a[0] - b[0]);
    if (!rs.length) return undefined;
    const s: PrStages = { runners: 0, checks: 0, red: 0, merging: 0 };
    rs.forEach(([start, first, end, ok], i) => {
        s.runners += first - start;
        s.checks += end - first;
        if (!ok) s.red += Math.max(0, Math.min(rs[i + 1]?.[0] ?? mergedAt, mergedAt) - end);
    });
    const last = rs[rs.length - 1];
    if (last[3]) s.merging = Math.max(0, mergedAt - last[2]);
    return s;
}

export interface PrStocks {
    open: number;
    oldestOpenMs: number;
    /** Armed, green and still unmerged 2 h after arming. */
    autoMergeGreenStuck: number;
    /** Armed 24 h or more, green or not. */
    autoMergeArmedLong: number;
    screenshotBacklogMs: number;
    maxFailingSameCheck: number;
}

/** How long the pull request's pictures have waited for the owner: its pending "Visual review" status, 0 if none. */
function screenshotWaitMs(p: GqlPr, nowMs: number): number {
    let ms = 0;
    for (const c of p.commits?.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []) {
        if (c.__typename === "StatusContext" && c.context === "Visual review" && c.state === "PENDING" && c.createdAt)
            ms = Math.max(ms, nowMs - Date.parse(c.createdAt));
    }
    return ms;
}

/**
 * The "now" members of 4.2 and "Red on the same check" of 4.1, from the open pull requests.
 * ponytail: reads the first 50 open pull requests; past 50 the counts stop growing, which is already red.
 */
export function prStocks(open: GqlPr[], nowMs: number): PrStocks {
    const s: PrStocks = {
        open: 0,
        oldestOpenMs: 0,
        autoMergeGreenStuck: 0,
        autoMergeArmedLong: 0,
        screenshotBacklogMs: 0,
        maxFailingSameCheck: 0,
    };
    const failing = new Map<string, number>();
    for (const p of open) {
        if (p.state !== "OPEN" || p.isDraft) continue;
        if (!waitsOnOwner(p)) {
            s.open++;
            s.oldestOpenMs = Math.max(s.oldestOpenMs, nowMs - Date.parse(p.createdAt));
        }
        const rollup = p.commits?.nodes[0]?.commit.statusCheckRollup;
        const armed = p.autoMergeRequest ? nowMs - Date.parse(p.autoMergeRequest.enabledAt) : -1;
        if (armed >= 2 * 60 * MIN && rollup?.state === "SUCCESS") s.autoMergeGreenStuck++;
        if (armed >= 24 * 60 * MIN) s.autoMergeArmedLong++;
        s.screenshotBacklogMs = Math.max(s.screenshotBacklogMs, screenshotWaitMs(p, nowMs));
        // An aggregator failing alone counts too (4, "Excluded checks").
        const checks = new Set(failingChecks(p, nowMs).map((c) => c.check));
        for (const c of checks) failing.set(c, (failing.get(c) ?? 0) + 1);
    }
    s.maxFailingSameCheck = Math.max(0, ...failing.values());
    return s;
}

// ---------------------------------------------------------------------------------------------------------------
// Issues.

export interface GqlIssue {
    number: number;
    title: string;
    state: string;
    stateReason: string | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    labels: { nodes: { name: string }[] };
}

export function toIssueItem(i: GqlIssue, repo: string): IssueItem {
    return {
        kind: "issue",
        id: `${repo}#${i.number}`,
        attempt: 1,
        repo,
        number: i.number,
        labels: i.labels.nodes.map((l) => l.name),
        createdAt: Date.parse(i.createdAt),
        ...opt("closedAt", ms(i.closedAt)),
        ...opt("stateReason", i.stateReason?.toLowerCase()),
    };
}

// ---------------------------------------------------------------------------------------------------------------
// Release lanes (4.5), from release.yml's job conclusions (sources.md section 3).

export const LANES = {
    ci: "CI",
    t4: "T4 GPU",
    hosts: "Hosts",
    autosave_macos: "Work protection (macOS)",
    audit: "Security audit",
    llm: "LLM regression",
    version: "Version the release",
    land: "Land the release on master",
    publish: "Publish the release",
} as const;
export type Lane = keyof typeof LANES;
export type LaneResult = "passed" | "failed" | "skipped" | "running" | "not in this mode" | "absent";

const TESTING: Lane[] = ["ci", "t4", "hosts", "autosave_macos", "audit", "llm"];
const BAD = new Set(["failure", "timed_out", "cancelled", "startup_failure", "action_required"]);

/** "full" from "Release (full)"; runs before 2026-10-25 18:00 say just "Release" (legacy). */
export const releaseMode = (title: string | undefined): string => /\(([\w-]+)\)/.exec(title ?? "")?.[1] ?? "legacy";

const jobsOf = (jobs: GhJob[], name: string) => jobs.filter((j) => j.name === name || j.name.startsWith(`${name} / `));

function laneOf(jobs: GhJob[], name: string): LaneResult {
    const mine = jobsOf(jobs, name);
    if (!mine.length) return "absent";
    if (mine.some((j) => j.status !== "completed")) return "running";
    if (mine.some((j) => BAD.has(j.conclusion ?? ""))) return "failed";
    if (mine.every((j) => j.conclusion === "skipped")) return "skipped";
    return "passed";
}

export interface ReleaseAttempt {
    mode: string;
    lanes: Record<Lane, LaneResult>;
    /** It tested its candidate: some testing lane did not skip. */
    tested: boolean;
    red: Lane[];
    /** Each lane's jobs that ran (not skipped): name, count, wall time, newest failure. */
    jobs: Partial<Record<Lane, LaneJob>>;
    /** The first job that failed, wherever it is (for an attempt that failed before its lanes). */
    failedJob?: string;
}

function laneJob(mine: GhJob[], name: string): LaneJob | undefined {
    const ran = mine.filter((j) => j.conclusion !== "skipped");
    if (!ran.length) return undefined;
    const starts = ran.map((j) => msOr(j.started_at)).filter(Number.isFinite);
    const ends = ran.map((j) => msOr(j.completed_at)).filter(Number.isFinite);
    const bad = ran
        .filter((j) => BAD.has(j.conclusion ?? ""))
        .map((j) => msOr(j.completed_at))
        .filter(Number.isFinite);
    return {
        job: ran.length === 1 ? ran[0].name : name,
        n: ran.length,
        s: starts.length && ends.length ? Math.round((Math.max(...ends) - Math.min(...starts)) / 1000) : 0,
        ...(bad.length ? { redAt: Math.max(...bad) } : {}),
    };
}

export function releaseAttempt(run: GhRun, jobs: GhJob[]): ReleaseAttempt {
    const mode = releaseMode(run.display_title);
    const names: Record<Lane, string> = { ...LANES };
    // In full and restart mode version/land/publish are skipped by design: judge the dry run instead.
    const full = mode === "full" || mode === "restart";
    if (full) names.version = "Version dry run";
    const lanes = {} as Record<Lane, LaneResult>;
    const laneJobs: Partial<Record<Lane, LaneJob>> = {};
    for (const [lane, name] of Object.entries(names) as [Lane, string][]) {
        lanes[lane] = laneOf(jobs, name);
        const j = laneJob(jobsOf(jobs, name), name);
        if (j) laneJobs[lane] = j;
    }
    if (full) {
        lanes.land = "not in this mode";
        lanes.publish = "not in this mode";
        // A failed job inside a lane can be non-gating (continue-on-error: CI's Performance Benchmarks, Story tests
        // parity), which the jobs API does not say. "Red early (<lane>)" runs only when the lane's result is failure,
        // so a lane whose Red early job skipped passed. Not in a cancelled run (!cancelled() skips every Red early
        // job) and not over a cancelled or timed-out job, which continue-on-error does not cover.
        for (const [lane, name] of Object.entries(names) as [Lane, string][]) {
            const early = jobs.find((j) => j.name === `Red early (${name})`);
            const onlyFailures = jobsOf(jobs, name).every(
                (j) => !BAD.has(j.conclusion ?? "") || j.conclusion === "failure",
            );
            if (
                lanes[lane] === "failed" &&
                run.conclusion !== "cancelled" &&
                onlyFailures &&
                early?.status === "completed" &&
                early.conclusion === "skipped"
            ) {
                lanes[lane] = "passed";
            }
        }
    }
    const tested = TESTING.some((l) => lanes[l] !== "skipped" && lanes[l] !== "absent");
    const red = (Object.keys(lanes) as Lane[]).filter((l) => lanes[l] === "failed");
    const failed = jobs
        .filter((j) => BAD.has(j.conclusion ?? ""))
        .sort((a, b) => msOr(a.completed_at) - msOr(b.completed_at))[0];
    return { mode, lanes, tested, red, jobs: laneJobs, ...(failed ? { failedJob: failed.name } : {}) };
}

/** The scheduler's App dispatches the train; anything else is ad hoc. */
export const isScheduled = (run: GhRun): boolean => run.triggering_actor?.login === "graphty-release-scheduler[bot]";

/** The newest runs that failed in a row, newest first, of one workflow's completed runs. */
export function failedStreak(runs: GhRun[]): GhRun[] {
    const out: GhRun[] = [];
    for (const r of [...runs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
        if (r.status !== "completed" || r.conclusion === "skipped" || r.conclusion === "cancelled") continue;
        if (!BAD.has(r.conclusion ?? "")) break;
        out.push(r);
    }
    return out;
}

/**
 * The cancelled runs a newer run of the same workflow took the place of: a newer run was created before the cancel
 * (a concurrency group replacing a waiting run, or a stuck run cancelled by hand after its successor started).
 * Neutral: neither failed nor a skipped train. A run cancelled with no successor yet still counts as it did.
 */
export function replacedRuns(runs: GhRun[]): Set<number> {
    const created = runs.map((r) => Date.parse(r.created_at));
    return new Set(
        runs
            .filter(
                (r) =>
                    r.status === "completed" &&
                    r.conclusion === "cancelled" &&
                    created.some((t) => t > Date.parse(r.created_at) && t <= Date.parse(r.updated_at)),
            )
            .map((r) => r.id),
    );
}

/** Release modes that test nothing new by design (a promotion, a hold's end, a held candidate's re-test). */
const NOT_A_TRAIN = new Set(["promote-nightly", "abandon", "candidate"]);

/**
 * Whether the train skipped a new commit: the newest train attempt (not a promote-nightly, abandon or candidate run)
 * that a newer run did not replace did not test, on a commit other than the candidate's.
 * @param attempts the seen attempts, newest first
 * @param runs the release workflow's newest runs
 */
export function trainSkipped(attempts: ReleaseSeen[], runs: GhRun[]): boolean {
    const replaced = replacedRuns(runs);
    const modes = new Map(runs.map((r) => [r.id, releaseMode(r.display_title)]));
    const train = (a: ReleaseSeen) => a.run === undefined || !NOT_A_TRAIN.has(modes.get(a.run) ?? "full");
    const candidate = attempts.find((a) => a.tested);
    const newest = attempts.find((a) => train(a) && (a.run === undefined || !replaced.has(a.run)));
    return !!newest && !newest.tested && newest.sha !== candidate?.sha;
}

/**
 * The events each release workflow declares in its `on:` (test/collector/parse.test.ts checks them against the
 * files). GitHub also records a failed run of a workflow for a push to any branch whose copy of the file it cannot
 * use (promote.yml's "10 failures in a row" on 2026-10-25 were such push runs), which say nothing about the workflow.
 */
export const RELEASE_WORKFLOW_EVENTS: Record<string, string[]> = {
    "release.yml": ["workflow_dispatch"],
    "promote.yml": ["workflow_dispatch"],
    "release-watch.yml": ["workflow_run"],
};

/** The runs of an event the workflow declares; every run when the workflow's events are not known. */
export const declaredRuns = (workflow: string, runs: GhRun[]): GhRun[] =>
    runs.filter((r) => RELEASE_WORKFLOW_EVENTS[workflow]?.includes(r.event) ?? true);

/** Consecutive failed runs, newest first, of one workflow's completed runs. */
export const failedInRow = (runs: GhRun[]): number => failedStreak(runs).length;

/**
 * One release workflow's row (4.5, Release workflows): completed runs in the last hour, how many failed, the
 * failing streak and its start. ponytail: counts only the runs the collector reads (10 or 12), so "in a row"
 * stops there.
 */
export function workflowState(workflow: string, all: GhRun[], nowMs: number): WorkflowState {
    const runs = declaredRuns(workflow, all);
    const hour = runs.filter(
        (r) => r.status === "completed" && r.conclusion !== "skipped" && nowMs - Date.parse(r.created_at) <= HOUR,
    );
    const streak = failedStreak(runs);
    const replaced = replacedRuns(runs);
    return {
        workflow,
        runs: hour.length,
        failed: hour.filter((r) => BAD.has(r.conclusion ?? "") && !replaced.has(r.id)).length,
        inRow: streak.length,
        ...(streak.length ? { since: Date.parse(streak[streak.length - 1].created_at) } : {}),
    };
}

// ---------------------------------------------------------------------------------------------------------------
// The weekly stress run (4.7): 0 ok, 1 found nothing three weeks running, 2 filing failed or the run broke.

export interface StressRun {
    state: 0 | 2;
    foundFailures: boolean;
    /** The job that broke the run (Build, or the filing job), or "File the load-sensitive tests" when it never ran. */
    failedJob?: string;
}

/** One stress run as the collector's `stress` cursor keeps it (the Data sources page reads it). */
export type StressCursorRun = StressRun & { at: number; runId: number };

/** The step restricted-cpu-stress.yml runs in a shard job only when that shard's tests failed. */
export const STRESS_FOUND = "Tests failed under the CPU quota";

/**
 * One stress run's state from its jobs.
 * @param jobs the run's jobs
 * @returns its state, whether it found failures, and the job that broke it
 */
export function stressRunState(jobs: GhJob[]): StressRun {
    const REPORT = "File the load-sensitive tests";
    const report = jobs.find((j) => j.name === REPORT);
    const build = jobs.find((j) => j.name === "Build");
    const stress = jobs.filter((j) => j.name.startsWith("Restricted CPU"));
    // The test step has continue-on-error, so a shard job concludes success even when its tests failed; the
    // workflow runs a marker step only then. A job that failed outright still counts.
    const foundFailures = stress.some(
        (j) =>
            j.conclusion === "failure" ||
            (j.steps ?? []).some((s) => s.name === STRESS_FOUND && s.conclusion === "success"),
    );
    const buildBroke = BAD.has(build?.conclusion ?? "");
    const broke = buildBroke || !report || BAD.has(report.conclusion ?? "");
    if (!broke) {
        return { state: 0, foundFailures };
    }
    return { state: 2, foundFailures, failedJob: buildBroke ? "Build" : REPORT };
}

/** Weeks of stress runs the "found nothing" rule reads. */
export const STRESS_WEEKS = 3;

/**
 * Found nothing three weeks running: a run in each of the last three weeks (7-day slots back from now), and none of
 * the runs in them found a failure. Three runs alone are not three weeks: a re-run or a dispatch puts two in a week.
 * @param runs the stress runs (any order)
 * @param nowMs now
 */
export function stressQuiet(runs: Pick<StressCursorRun, "at" | "foundFailures">[], nowMs: number): boolean {
    const inRange = runs.filter((r) => nowMs - r.at < STRESS_WEEKS * 7 * DAY);
    const weeks = new Set(inRange.map((r) => Math.floor((nowMs - r.at) / (7 * DAY))));
    return weeks.size === STRESS_WEEKS && !inRange.some((r) => r.foundFailures);
}

// ---------------------------------------------------------------------------------------------------------------
// Costs (section 7).

export interface Rates {
    t4: { bootMin: number; usdPerMin: Record<string, number> };
    llm: { step: string; usdPerPaidStep: number; paidConclusions: string[] };
    fixedMonthly: Record<string, { usd: number } | null>;
}

const dayOf = (msTime: number) => Math.floor(msTime / DAY) * DAY;

/** One machine.dev T4 job: minutes rounded up, plus boot, times the tenancy's rate. */
export function t4Cost(j: GhJob, repo: string, rates: Rates, workflow?: string): CostItem | undefined {
    const label = j.labels.find((l) => l.startsWith("machine/gpu=t4"));
    if (!label || !j.started_at || !j.completed_at || isSkipped(j)) return undefined;
    const tenancy = /tenancy=(\w+)/.exec(label)?.[1] ?? "on_demand";
    const rate = rates.t4.usdPerMin[tenancy];
    if (rate === undefined) return undefined; // a missing rate is NO DATA, never zero
    const min = Math.ceil((Date.parse(j.completed_at) - Date.parse(j.started_at)) / MIN) + rates.t4.bootMin;
    const end = Date.parse(j.completed_at);
    return {
        kind: "cost",
        id: `t4#${repo}/${j.id}`,
        attempt: j.run_attempt,
        line: "t4",
        ...opt("workflow", workflow),
        day: dayOf(end),
        usd: min * rate,
    };
}

/** Paid LLM test steps (as tools/llm-due.mjs counts them) times the per-run cost. */
export function llmCost(j: GhJob, repo: string, rates: Rates, workflow?: string): CostItem | undefined {
    const paid = (j.steps ?? []).filter(
        (s) => s.name === rates.llm.step && rates.llm.paidConclusions.includes(s.conclusion ?? ""),
    );
    if (!paid.length) return undefined;
    const end = Date.parse(paid[paid.length - 1].completed_at ?? j.completed_at ?? j.created_at);
    return {
        kind: "cost",
        id: `llm#${repo}/${j.id}`,
        attempt: j.run_attempt,
        line: "llm",
        ...opt("workflow", workflow),
        day: dayOf(end),
        usd: paid.length * rates.llm.usdPerPaidStep,
    };
}

/** Each fixed monthly line spread over the month's days, so a month-to-date projection holds. */
export function fixedCosts(rates: Rates, dayMs: number): CostItem[] {
    const d = new Date(dayMs);
    const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const day = dayOf(dayMs);
    const iso = new Date(day).toISOString().slice(0, 10);
    return Object.entries(rates.fixedMonthly).flatMap(([line, r]) =>
        r && !line.startsWith("$")
            ? [{ kind: "cost" as const, id: `${line}#${iso}`, attempt: 1, line, day, usd: r.usd / days }]
            : [],
    );
}

// ---------------------------------------------------------------------------------------------------------------
// npm (4.5 "Tagged, not on npm").

export interface Tag {
    project: string;
    version: string;
    taggedAt: number;
}

/** `{project}@{version}` tags; `golden-good` and other non-release tags are dropped. */
export function releaseTags(
    nodes: { name: string; target: { committedDate?: string; tagger?: { date: string } } }[],
): Tag[] {
    return nodes.flatMap((n) => {
        const m = /^(.+)@(\d+\.\d+\.\d+[^@]*)$/.exec(n.name);
        const when = n.target.committedDate ?? n.target.tagger?.date;
        return m && when ? [{ project: m[1], version: m[2], taggedAt: Date.parse(when) }] : [];
    });
}

/** Projects with tags that are never published to npm (the graphty app ships as a site; githerd is retired). */
export const NOT_ON_NPM = new Set(["graphty", "githerd"]);

/** Projects published to npm without the @graphty scope (test/collector/parse.test.ts checks the package.json names). */
export const UNSCOPED_ON_NPM = new Set(["babylonjs-map"]);

export const npmName = (project: string): string =>
    project.startsWith("@") || UNSCOPED_ON_NPM.has(project) ? project : `@graphty/${project}`;

/** Tags whose version npm does not list; `times` maps npm name to its packument `time` (undefined: 404). */
export function taggedNotOnNpm(tags: Tag[], times: Map<string, Record<string, string> | undefined>): Tag[] {
    return tags.filter((t) => !NOT_ON_NPM.has(t.project) && !times.get(npmName(t.project))?.[t.version]);
}

/** A compare (base...master) commit: its sha, parents and committer date. */
export interface CompareCommit {
    sha: string;
    parents: { sha: string }[];
    commit: { committer: { date: string } };
}

/**
 * The commit date of the oldest commit on master's first-parent line after the tested base, or undefined when master
 * is the base. Only that line landed on master: a pull request branch's own merge of master (a second-parent ancestor)
 * can be a day older than its landing and must not age master.
 * @param commits the compare's commits, oldest first, master's head last
 * @returns the oldest first-parent commit's date in ms
 */
export function oldestUntested(commits: CompareCommit[]): number | undefined {
    const bySha = new Map(commits.map((c) => [c.sha, c]));
    let at = commits.at(-1);
    let oldest: number | undefined;
    while (at) {
        oldest = Date.parse(at.commit.committer.date);
        at = bySha.get(at.parents[0]?.sha ?? "");
    }
    return oldest;
}

// ---------------------------------------------------------------------------------------------------------------
// Flaky tests from CI annotations (the flaky-history backfill).

/**
 * The jobs that run test shards through tools/test-quarantine.mjs: the check run's name, its job key (GITHUB_JOB,
 * the third part of the invocation id tools/results/run-group.mjs baseId() makes) and the family suffix
 * (run-group.mjs groupFamily(): the story-tests job takes screenshots, `<family>-shots`).
 */
const SHARD_JOBS: [RegExp, string, string][] = [
    [/(?:^|\/ )Test \(/, "test", ""],
    [/(?:^|\/ )Story tests \(/, "story-tests", "-shots"],
    [/(?:^|\/ )Restricted CPU \(/, "stress", ""],
];

/**
 * A test that failed on try 1 and passed its retry, as tools/test-quarantine.mjs prints it (printDecision) and
 * tools/results/run-group.mjs prJudge() rewords it: `[FLAKY] <shard>: <file> > <test> failed and passed on the same
 * inputs, ...`, `[FLAKY-UNRELATED] ... failed and passed; ...`, `[QUARANTINED] ... failed and passed; ...`. A
 * `[QUARANTINED] ... failed again` test failed both times: not flaky. A file name holds no " > "; a test name may.
 */
const FLAKY_LINE =
    /^\[(?:FLAKY|FLAKY-UNRELATED|QUARANTINED)\] (\S+): (.+?) > (.+) failed and passed(?: on the same inputs,|;)/;

/**
 * The live feed's row (ingest.ts failureItems() for tools/results/client.mjs postFlaky()) for one annotation of a
 * test shard's check run, or undefined when the annotation is not a flaky test or the check run is no test shard.
 * Same id, so a backfilled row and a live one are the same row. The annotation carries no failure message, so the
 * signature is empty.
 * @param message the annotation's message
 * @param checkRun the check run's name ("Test (layout)", "CI / Test (layout)")
 * @param runId the workflow run's id
 * @param attempt the run attempt the check run belongs to
 * @param seenAt when the check run completed
 */
export function flakyTestItem(
    message: string,
    checkRun: string,
    runId: number,
    attempt: number,
    seenAt: number,
): TestItem | undefined {
    const job = SHARD_JOBS.find(([re]) => re.test(checkRun));
    const m = FLAKY_LINE.exec(message);
    if (!job || !m) return undefined;
    const [, shard, file, name] = m;
    const invocation = `${runId}.${attempt}.${job[1]}.${shard}.1`;
    return {
        kind: "test",
        id: `${invocation}#${file}#${name}`,
        attempt: 1,
        source: "ci",
        invocation,
        family: shard.replace(/-\d+$/, "") + job[2],
        file,
        name,
        outcome: "flaky",
        status: "fail",
        signature: "",
        seenAt,
    };
}
