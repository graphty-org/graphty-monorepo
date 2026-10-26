// Pure mapping from GitHub's responses to the model's raw items and the values the collector observes
// (design/ci/health-dashboard.md section 4). No I/O here, so every rule is tested on recorded responses.

import type { CostItem, IssueItem, JobItem, PullRequestItem, RunItem, StepItem } from "../model/items.js";
import { DAY, MIN } from "../model/items.js";

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

export function toJobItem(j: GhJob, repo: string, workflow: string, hang = false): JobItem {
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
}

export interface GqlPr {
    number: number;
    title: string;
    state: string;
    isDraft: boolean;
    reviewDecision: string | null;
    baseRefName: string;
    createdAt: string;
    updatedAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    autoMergeRequest: { enabledAt: string } | null;
    labels: { nodes: { name: string }[] };
    readyEvents: { nodes: { __typename: string; createdAt?: string }[] };
    /** Only on the open page (the recent page leaves checks out). */
    commits?: { nodes: { commit: { statusCheckRollup: { state: string; contexts: { nodes: GqlCheck[] } } | null } }[] };
}

/** Labels that keep auto-merge off by rule, so the pull request waits on the owner. */
const OWNER_LABELS = new Set(["hold", "needs-decision"]);

/** Auto-merge off by rule (4.2): a hold label, a breaking title, or a required review (code-owner paths). */
export function ownerWait(p: GqlPr): boolean {
    if (p.labels.nodes.some((l) => OWNER_LABELS.has(l.name))) return true;
    if (/^\w+(\([^)]*\))?!:/.test(p.title)) return true;
    return p.reviewDecision === "REVIEW_REQUIRED";
}

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

/** Checks that restate other checks or judge metadata (4, "Excluded checks"). */
const EXCLUDED = new Set([
    "All Checks Pass",
    "Queue Checks Pass",
    "Lint PR Title",
    "Link PR Issue",
    "Visual report",
    "Draft state",
]);
const FAILED = new Set(["FAILURE", "TIMED_OUT", "STARTUP_FAILURE"]);

export interface PrStocks {
    open: number;
    oldestOpenMs: number;
    autoMergeStuck: number;
    screenshotBacklogMs: number;
    maxFailingSameCheck: number;
}

/**
 * The "now" members of 4.2 and "Red on the same check" of 4.1, from the open pull requests.
 * ponytail: reads the first 50 open pull requests; past 50 the counts stop growing, which is already red.
 */
export function prStocks(open: GqlPr[], nowMs: number): PrStocks {
    const s: PrStocks = { open: 0, oldestOpenMs: 0, autoMergeStuck: 0, screenshotBacklogMs: 0, maxFailingSameCheck: 0 };
    const failing = new Map<string, number>();
    for (const p of open) {
        if (p.state !== "OPEN" || p.isDraft) continue;
        s.open++;
        if (!ownerWait(p)) s.oldestOpenMs = Math.max(s.oldestOpenMs, nowMs - Date.parse(p.createdAt));
        const rollup = p.commits?.nodes[0]?.commit.statusCheckRollup;
        const armed = p.autoMergeRequest ? nowMs - Date.parse(p.autoMergeRequest.enabledAt) : -1;
        if (armed >= 6 * 60 * MIN || (armed >= 2 * 60 * MIN && rollup?.state === "SUCCESS")) s.autoMergeStuck++;
        const checks = new Set<string>();
        for (const c of rollup?.contexts.nodes ?? []) {
            if (
                c.__typename === "StatusContext" &&
                c.context === "Visual review" &&
                c.state === "PENDING" &&
                c.createdAt
            )
                s.screenshotBacklogMs = Math.max(s.screenshotBacklogMs, nowMs - Date.parse(c.createdAt));
            if (c.__typename === "CheckRun" && c.name && !EXCLUDED.has(c.name) && FAILED.has(c.conclusion ?? ""))
                checks.add(family(c.name) ?? c.name);
        }
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
export const releaseMode = (title: string | undefined): string => /\((\w+)\)/.exec(title ?? "")?.[1] ?? "legacy";

function laneOf(jobs: GhJob[], name: string): LaneResult {
    const mine = jobs.filter((j) => j.name === name || j.name.startsWith(`${name} / `));
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
}

export function releaseAttempt(run: GhRun, jobs: GhJob[]): ReleaseAttempt {
    const mode = releaseMode(run.display_title);
    const lanes = {} as Record<Lane, LaneResult>;
    for (const [lane, name] of Object.entries(LANES) as [Lane, string][]) lanes[lane] = laneOf(jobs, name);
    // In full and restart mode version/land/publish are skipped by design: judge the dry run instead.
    if (mode === "full" || mode === "restart") {
        lanes.version = laneOf(jobs, "Version dry run");
        lanes.land = "not in this mode";
        lanes.publish = "not in this mode";
    }
    const tested = TESTING.some((l) => lanes[l] !== "skipped" && lanes[l] !== "absent");
    const red = (Object.keys(lanes) as Lane[]).filter((l) => lanes[l] === "failed");
    return { mode, lanes, tested, red };
}

/** The scheduler's App dispatches the train; anything else is ad hoc. */
export const isScheduled = (run: GhRun): boolean => run.triggering_actor?.login === "graphty-release-scheduler[bot]";

/** Consecutive failed runs, newest first, of one workflow's completed runs. */
export function failedInRow(runs: GhRun[]): number {
    let n = 0;
    for (const r of [...runs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
        if (r.status !== "completed" || r.conclusion === "skipped" || r.conclusion === "cancelled") continue;
        if (!BAD.has(r.conclusion ?? "")) break;
        n++;
    }
    return n;
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
    const foundFailures = stress.some((j) => j.conclusion === "failure");
    const buildBroke = BAD.has(build?.conclusion ?? "");
    const broke = buildBroke || !report || BAD.has(report.conclusion ?? "");
    if (!broke) {
        return { state: 0, foundFailures };
    }
    return { state: 2, foundFailures, failedJob: buildBroke ? "Build" : REPORT };
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

export const npmName = (project: string): string => (project.startsWith("@") ? project : `@graphty/${project}`);

/** Tags whose version npm does not list; `times` maps npm name to its packument `time` (undefined: 404). */
export function taggedNotOnNpm(tags: Tag[], times: Map<string, Record<string, string> | undefined>): Tag[] {
    return tags.filter((t) => !NOT_ON_NPM.has(t.project) && !times.get(npmName(t.project))?.[t.version]);
}
