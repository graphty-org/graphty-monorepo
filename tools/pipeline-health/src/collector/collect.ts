// One collector cycle (design section 10.4): GitHub runs, jobs and steps since a cursor, the jobs of every
// unfinished run, pull requests and issues in one GraphQL query each, master's state, the release lanes; hourly
// the stress run, the host matrix, npm and coverage; daily the costs. Everything is written through the model's
// raw writers (idempotent), with cursors in the table and each source's health for the Data sources page.

import type { CostItem, ObservationItem, PullRequestItem, RawItem, RunItem } from "../model/items.js";
import { DAY, HOUR, homeKey, MIN, ttlAt } from "../model/items.js";

const WEEK = 7 * DAY;
import { getCursor, putRaw, recordSource, setCursor } from "../model/raw.js";
import type { OwnerWait, QuarantineEntry, ReleaseSeen, WorkflowState } from "../model/snapshots.js";
import { readBenches, trend } from "../model/benchmarks.js";
import type { Store } from "../model/store.js";
import type { DeployBuilds } from "./aws.js";
import { flakyMembers } from "./flaky.js";
import { definedJobs, jobMembers, nonGatingJobs } from "./jobs.js";
import { type Fetch, type GitHub, HttpError, runJobs } from "./github.js";
import {
    classifyCancel,
    codeownerPatterns,
    fixedCosts,
    isGhostRun,
    llmCost,
    loadKind,
    masterState,
    npmName,
    offMaster,
    ownerWaitOf,
    prOfRun,
    prRunOf,
    prStages,
    oldestUntested,
    prStocks,
    RELEASE_WORKFLOW_EVENTS,
    releaseAttempt,
    releaseTags,
    runnerFlags,
    runnerUse,
    type StressCursorRun,
    STRESS_WEEKS,
    stressQuiet,
    stressRunState,
    suiteNotes,
    t4Cost,
    taggedNotOnNpm,
    timedOutJobs,
    toIssueItem,
    toJobItem,
    toPrItem,
    toRunItem,
    toStepItems,
    trainSkipped,
    workflowFile,
    waitsOnOwner,
    workflowState,
    type CompareCommit,
    type GhJob,
    type GhRun,
    releaseMode,
    type GqlIssue,
    type GqlPr,
    type PrRun,
    type Rates,
    type SuiteNode,
    type Tag,
} from "./parse.js";
import { markPrCaused } from "./pr-caused.js";
import {
    ISSUE_QUERY,
    OPEN_PAGE,
    ownerFilesQuery,
    PR_QUERY,
    REPO_FILES_QUERY,
    SUITE_QUERY,
    TAG_QUERY,
} from "./queries.js";
import {
    failureCause,
    nextHolders,
    nextShared,
    SNAPSHOT,
    supersededRuns,
    type HoldersSnapshot,
    type SharedSnapshot,
} from "./snapshots.js";

export interface Deps {
    store: Store;
    now: number;
    /** Undefined while the collector's GitHub App is not set up: nothing is collected from GitHub. */
    gh?: GitHub;
    /** Plain fetch for public sources (npm, Coveralls). */
    fetch: Fetch;
    /** Cost Explorer's daily cost, ISO days [from, to). Undefined: the AWS line is skipped. */
    awsCosts?: (from: string, to: string) => Promise<{ day: string; usd: number }[]>;
    rates: Rates;
    limits: { linux_windows: number; macos: number };
    org: string;
    /** owner/name of the monorepo: master, pull requests, issues, releases. */
    repo: string;
    /** The health stack's deploy build. Undefined: the stack is not redeployed from master. */
    deploy?: DeployBuilds;
}

export interface CycleReport {
    github: "not set up" | "collected";
    items: number;
    calls: number;
    errors: Record<string, string>;
    /** Items skipped because one GitHub request kept failing (section 10.4). */
    skipped: string[];
}

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
const day = (t: number) => new Date(t).toISOString().slice(0, 10);
const obs = (metric: string, value: number, at: number): ObservationItem => ({
    kind: "obs",
    id: `${metric}#${at}`,
    attempt: 1,
    metric,
    value,
    at,
});
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** Runs `fn` over `xs` with at most `n` at once. */
async function mapPool<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(xs.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(n, xs.length) }, async () => {
            while (next < xs.length) {
                const i = next++;
                out[i] = await fn(xs[i]);
            }
        }),
    );
    return out;
}

/** Workflows whose step results the collector stores (10.4 names release.yml and the stress run). */
const STEP_WORKFLOWS = new Set(["release.yml", "restricted-cpu-stress.yml"]);

class Cycle {
    readonly items: RawItem[] = [];
    readonly errors: Record<string, string> = {};
    /** Items skipped because one GitHub request kept failing; the cycle wrote everything else. */
    readonly skipped: string[] = [];
    /** Unfinished runs of this cycle, for the superseded list (pull requests part). */
    openRuns?: GhRun[];
    /** Open pull requests with their checks (pull requests part), for "Blocked by a flake". */
    openPrs?: GqlPr[];
    private readonly jsonCursors = new Map<string, unknown>();

    readonly d: Deps;

    constructor(d: Deps) {
        this.d = d;
    }

    get now() {
        return this.d.now;
    }

    o(metric: string, value: number) {
        this.items.push(obs(metric, value, this.now));
    }

    async cursor(name: string): Promise<string | undefined> {
        return getCursor(this.d.store, name);
    }

    async json<T>(name: string, fallback: T): Promise<T> {
        if (this.jsonCursors.has(name)) return this.jsonCursors.get(name) as T;
        const raw = await this.cursor(name);
        let v = fallback;
        try {
            if (raw) v = JSON.parse(raw) as T;
        } catch {
            // a cursor written by an older version: start over
        }
        this.jsonCursors.set(name, v);
        return v;
    }

    async setJson(name: string, v: unknown) {
        this.jsonCursors.set(name, v);
        await setCursor(this.d.store, name, JSON.stringify(v), this.now);
    }

    /** Runs one part; a failure is recorded against its source and never stops the other parts. */
    async part(name: string, source: string | undefined, fn: () => Promise<void>): Promise<boolean> {
        try {
            await fn();
            return true;
        } catch (e) {
            this.errors[name] = message(e);
            if (source)
                await recordSource(this.d.store, source, this.now, { ok: false, error: `${name}: ${message(e)}` });
            return false;
        }
    }

    /** True once per `everyMs`, by a cursor holding the last time. */
    async due(name: string, everyMs: number): Promise<boolean> {
        const last = Number((await this.cursor(name)) ?? 0);
        return this.now - last >= everyMs - MIN; // a minute of slack for the schedule's jitter
    }
}

// ---------------------------------------------------------------------------------------------------------------
// GitHub parts.

interface RunsPage {
    total_count: number;
    workflow_runs: GhRun[];
}
/** Every job of a run (`runs/<id>`) or of one attempt (`runs/<id>/attempts/<n>`), latest attempt's. */
function allJobs(gh: GitHub, repo: string, run: number | string): Promise<GhJob[]> {
    return runJobs((p) => gh.rest(p), `repos/${repo}/actions/runs/${run}/jobs?filter=latest`);
}

async function runsPages(gh: GitHub, path: string, maxPages = 5): Promise<GhRun[]> {
    const out: GhRun[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const r = await gh.rest<RunsPage>(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
        out.push(...(r?.workflow_runs ?? []));
        if (!r || out.length >= r.total_count || r.workflow_runs.length < 100) break;
    }
    return out;
}

/** Organization repositories with Actions activity in 28 days, refreshed hourly. */
async function activeRepos(c: Cycle, gh: GitHub): Promise<string[]> {
    const cached = await c.json<string[]>("repos", []);
    if (cached.length && !(await c.due("repos-at", HOUR))) return cached;
    const list =
        (await gh.rest<{ full_name: string; archived: boolean; pushed_at: string }[]>(
            `orgs/${c.d.org}/repos?per_page=100&type=all`,
        )) ?? [];
    const repos = list
        .filter((r) => !r.archived && c.now - Date.parse(r.pushed_at) <= 28 * DAY)
        .map((r) => r.full_name);
    if (!repos.includes(c.d.repo)) repos.unshift(c.d.repo);
    await c.setJson("repos", repos);
    await setCursor(c.d.store, "repos-at", String(c.now), c.now);
    return repos;
}

interface Collected {
    run: GhRun;
    repo: string;
    jobs?: GhJob[];
}

/**
 * Runs created since the cursor, every unfinished run, and every run that was unfinished last cycle; jobs for each
 * that is unfinished or finished since. Completed runs already stored are skipped, so a cycle costs one jobs call
 * per unfinished run plus one per run that finished.
 */
async function collectRuns(c: Cycle, gh: GitHub, repos: string[], extra: Collected[]): Promise<Collected[]> {
    const out: Collected[] = [...extra];
    const done: string[] = [];
    for (const repo of repos) {
        try {
            await repoRuns(c, gh, repo, out);
            done.push(repo);
        } catch (e) {
            // This repository's runs are read again next cycle: its cursor stays put.
            c.skipped.push(`runs of ${repo}: ${message(e)}`);
        }
    }
    // Skip completed runs already stored complete (their jobs are final).
    const keep: Collected[] = [];
    const seen = new Set<string>();
    for (const x of out) {
        const key = `${x.repo}/${x.run.id}/${x.run.run_attempt}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (x.run.status === "completed") {
            const old = await c.d.store.get(
                homeKey({ kind: "run", id: `${x.repo}/${x.run.id}`, attempt: x.run.run_attempt }),
            );
            if (old?.status === "completed") continue;
        }
        keep.push(x);
    }
    const failed: Collected[] = [];
    await mapPool(keep, 8, async (x) => {
        try {
            x.jobs = await allJobs(gh, x.repo, x.run.id);
        } catch (e) {
            failed.push(x);
            c.skipped.push(`jobs of ${x.repo} run ${x.run.id}: ${message(e)}`);
        }
    });
    // A run whose jobs could not be read is left out of this cycle and kept open, so the next cycle reads it again.
    for (const x of failed) {
        const open = await c.json<number[]>(`open#${x.repo}`, []);
        if (!open.includes(x.run.id)) await c.setJson(`open#${x.repo}`, [...open, x.run.id]);
    }
    for (const repo of done) await setCursor(c.d.store, `runs#${repo}`, iso(c.now), c.now);
    return keep.filter((x) => !failed.includes(x));
}

/** One repository's runs since its cursor, unfinished, and unfinished last cycle, into `out`. */
async function repoRuns(c: Cycle, gh: GitHub, repo: string, out: Collected[]): Promise<void> {
    const since = (await c.cursor(`runs#${repo}`)) ?? iso(c.now - 15 * MIN);
    const from = iso(Date.parse(since) - 5 * MIN);
    const fresh = await runsPages(gh, `repos/${repo}/actions/runs?created=${encodeURIComponent(`>=${from}`)}`);
    const running = await runsPages(gh, `repos/${repo}/actions/runs?status=in_progress`, 2);
    const queued = await runsPages(gh, `repos/${repo}/actions/runs?status=queued`, 2);
    const byId = new Map<number, GhRun>();
    for (const r of [...fresh, ...running, ...queued]) byId.set(r.id, r);
    const prevOpen = await c.json<number[]>(`open#${repo}`, []);
    const gone = prevOpen.filter((id) => !byId.has(id));
    for (const r of await mapPool(gone, 8, (id) => gh.rest<GhRun>(`repos/${repo}/actions/runs/${id}`)))
        if (r) byId.set(r.id, r);
    for (const run of byId.values()) out.push({ run, repo });
    await c.setJson(
        `open#${repo}`,
        [...byId.values()].filter((r) => r.status !== "completed").map((r) => r.id),
    );
}

/** Cancel class and hangs of every cancelled run in `xs`, from one GraphQL query per 20 runs. */
async function classify(
    gh: GitHub,
    xs: Collected[],
): Promise<Map<number, { cls: RunItem["cancelClass"]; hung: Set<string> }>> {
    const out = new Map<number, { cls: RunItem["cancelClass"]; hung: Set<string> }>();
    const todo = xs.filter(
        (x) => x.run.status === "completed" && x.run.conclusion === "cancelled" && x.run.check_suite_node_id,
    );
    for (let i = 0; i < todo.length; i += 20) {
        const chunk = todo.slice(i, i + 20);
        const data = await gh.graphql<{ nodes: (SuiteNode | null)[] }>(SUITE_QUERY, {
            ids: chunk.map((x) => x.run.check_suite_node_id),
        });
        chunk.forEach((x, k) => {
            const node = data.nodes[k] ?? null;
            const notes = suiteNotes(node);
            // A suite GitHub did not return is unknown, not empty: it stays red.
            out.set(x.run.id, { cls: node ? classifyCancel(notes) : "red", hung: timedOutJobs(notes) });
        });
    }
    return out;
}

async function writeRuns(
    c: Cycle,
    gh: GitHub,
    xs: Collected[],
    cancels: Map<number, { cls: RunItem["cancelClass"]; hung: Set<string> }>,
) {
    // The shared set of the last cycle (the pull requests part runs after this one).
    const shared = new Set(
        (await c.json<SharedSnapshot | undefined>(SNAPSHOT.shared, undefined))?.rows
            .filter((r) => r.end === undefined)
            .map((r) => r.check),
    );
    const runItems: RunItem[] = [];
    for (const { run, repo, jobs } of xs) {
        const cancel = cancels.get(run.id);
        const workflow = workflowFile(run.path);
        const cause =
            workflow === "ci.yml" && run.status === "completed"
                ? failureCause(run, jobs ?? [], cancel?.hung ?? new Set(), shared)
                : undefined;
        const item = toRunItem(run, repo, {
            ...(cancel?.cls ? { cancelClass: cancel.cls } : {}),
            ...(cause ? { cause } : {}),
        });
        runItems.push(item);
        c.items.push(item);
        if (workflow === "ci.yml" && run.run_attempt > 1 && run.conclusion === "success") await flaky(c, run, repo);
        for (const j of jobs ?? []) {
            c.items.push(
                toJobItem(j, repo, workflow, cancel?.hung.has(j.name) ?? false, loadKind(run), offMaster(run)),
            );
            if (STEP_WORKFLOWS.has(workflow) && j.status === "completed")
                c.items.push(...toStepItems(j, repo, workflow));
            if (j.status === "completed") {
                const t4 = t4Cost(j, repo, c.d.rates, workflow);
                const llm = llmCost(j, repo, c.d.rates, workflow, run);
                if (t4) c.items.push(t4);
                if (llm) c.items.push(llm);
            }
        }
    }
    await markPrCaused(c.d.store, gh, c.d.repo, runItems, c.now);
}

/** A rerun that passed makes its first attempt's "the change" failure flaky (reclassified as evidence arrives). */
async function flaky(c: Cycle, run: GhRun, repo: string) {
    const first = (await c.d.store.get(homeKey({ kind: "run", id: `${repo}/${run.id}`, attempt: 1 }))) as
        RunItem | undefined;
    if (first?.cause === "change") {
        const { pk: _pk, sk: _sk, ttl: _ttl, ...item } = first as RunItem & { pk: string; sk: string; ttl?: number };
        c.items.push({ ...item, cause: "flaky", ...(item.prCaused === undefined ? {} : { prCaused: false }) });
    }
}

const prRunsKey = (repo: string, pr: number) => ({ pk: `PRRUNS#${repo}#${pr}`, sk: "-" });

/** A finished pull request run GitHub names no pull request for (it merged), until the pull requests part maps it. */
interface PendingPrRun {
    id: string;
    run: Pick<GhRun, "head_branch" | "head_sha">;
    r: PrRun;
    /** Its commit was looked up once and named no merged pull request. */
    looked?: true;
}
const PENDING_PR_RUNS = "prruns-pending";

async function putPrRun(c: Cycle, repo: string, pr: number, id: string, r: PrRun) {
    const key = prRunsKey(repo, pr);
    const old = (await c.d.store.get(key))?.runs as Record<string, PrRun> | undefined;
    await c.d.store.put({ ...key, runs: { ...old, [id]: r }, ttl: ttlAt(c.now + 30 * DAY) });
}

/**
 * Each finished ci.yml pull request run attempt, kept per pull request until it merges (prStages). A run GitHub
 * names its pull request for is recorded now; a home-repository run it names none for (its pull request merged)
 * is kept pending in a cursor until a pull requests part maps it (pendingPrRuns), because putRaw stores the run
 * complete at the end of this cycle and it is never collected again.
 */
async function prRuns(c: Cycle, xs: Collected[]) {
    const pending = await c.json<PendingPrRun[]>(PENDING_PR_RUNS, []);
    const ids = new Set(pending.map((p) => p.id));
    for (const { run, repo, jobs } of xs) {
        const r = prRunOf(run, jobs ?? []);
        if (!r) continue;
        const id = `${run.id}.${run.run_attempt}`;
        const pr = run.pull_requests?.[0]?.number;
        if (pr !== undefined) await putPrRun(c, repo, pr, id, r);
        else if (repo === c.d.repo && run.head_branch && !ids.has(id)) {
            ids.add(id);
            pending.push({ id, run: { head_branch: run.head_branch, head_sha: run.head_sha }, r });
        }
    }
    if (pending.length) await c.setJson(PENDING_PR_RUNS, pending);
}

/**
 * Records the pending runs this pass's pull requests map. One that none of them maps (the pull request merged
 * before the `prs` cursor's window) is looked up once by its commit, and its pull request item is written again
 * with its stages; a run still unmapped is dropped a day after it ended.
 */
async function pendingPrRuns(c: Cycle, gh: GitHub, prs: GqlPr[]) {
    const pending = await c.json<PendingPrRun[]>(PENDING_PR_RUNS, []);
    if (!pending.length) return;
    const left: PendingPrRun[] = [];
    for (const p of pending) {
        let pr = prOfRun(p.run, prs);
        const late = pr === undefined && !p.looked;
        if (late) {
            const got = await prOfCommit(c, gh, p);
            if (got === "retry") {
                if (c.now - p.r[2] < DAY) left.push(p);
                continue;
            }
            pr = got;
        }
        if (pr === undefined) {
            if (c.now - p.r[2] < DAY) left.push({ ...p, looked: true });
            continue;
        }
        await putPrRun(c, c.d.repo, pr, p.id, p.r);
        if (late) await restage(c, pr);
    }
    await c.setJson(PENDING_PR_RUNS, left);
}

/**
 * The merged pull request whose head branch is the run's, among those GitHub lists for the run's commit (a stacked
 * branch's pull request contains the commit too). "retry" on a server error or rate limit, so one failing lookup
 * never stops the pull requests part; any other client error counts as found nothing.
 */
async function prOfCommit(c: Cycle, gh: GitHub, p: PendingPrRun): Promise<number | "retry" | undefined> {
    try {
        const found = await gh.rest<{ number: number; merged_at: string | null; head: { ref: string } }[]>(
            `repos/${c.d.repo}/commits/${p.run.head_sha}/pulls`,
        );
        return found?.find((x) => x.merged_at && x.head.ref === p.run.head_branch)?.number;
    } catch (e) {
        const status = e instanceof HttpError ? e.status : 0;
        return status >= 400 && status < 500 && status !== 403 && status !== 429 ? undefined : "retry";
    }
}

/** Writes a stored merged pull request item again with the stages of its now complete runs. */
async function restage(c: Cycle, pr: number) {
    const stored = (await c.d.store.get(homeKey({ kind: "pr", id: `${c.d.repo}#${pr}`, attempt: 1 }))) as
        (PullRequestItem & { pk: string; sk: string; ttl?: number }) | undefined;
    if (!stored) return;
    const { pk: _pk, sk: _sk, ttl: _ttl, ...item } = stored;
    c.items.push(await withStages(c, item));
}

/** A merged pull request's stage times from its recorded runs. */
async function withStages(c: Cycle, item: PullRequestItem): Promise<PullRequestItem> {
    if (item.mergedAt === undefined || item.ownerWait) return item;
    const runs = (await c.d.store.get(prRunsKey(item.repo, item.number)))?.runs as Record<string, PrRun> | undefined;
    const stages = runs && prStages(Object.values(runs), item.mergedAt);
    return stages ? { ...item, stages } : item;
}

/**
 * Runner use against the limits (4.3), counted in jobs of every unfinished run. Runs at the end of the GitHub parts,
 * after the pull requests part, so a run whose pull request is no longer open is left out (isGhostRun); when that part
 * failed, every unfinished run counts.
 */
async function runners(c: Cycle, xs: Collected[], elapsed: number) {
    const prs = c.openPrs;
    const ghost = (x: Collected) => !!prs && x.repo === c.d.repo && isGhostRun(x.run, prs, prs.length < OPEN_PAGE);
    const open = xs.filter((x) => x.run.status !== "completed" && !ghost(x));
    const jobs = open.flatMap((x) => x.jobs ?? []);
    const noJobs = open.filter((x) => !x.jobs?.length).map((x) => x.run);
    const use = runnerUse(jobs, noJobs, c.now);
    const { saturated, unassigned } = runnerFlags(use, c.d.limits.linux_windows);
    const since = Number((await c.cursor("unassigned-since")) ?? 0);
    const start = unassigned ? since || c.now : 0;
    await setCursor(c.d.store, "unassigned-since", String(start), c.now);
    // The Runners page's jobs chart (views/sections.ts `jobs`): jobs against the 60-job limit, and jobs waiting.
    c.o("ci.jobs_running", use.running.linux_windows);
    c.o("ci.running_macos", use.running.macos);
    c.o("ci.jobs_queued", use.queued);
    c.o("ci.longest_queued_ms", use.longestQueuedMs);
    c.o("ci.saturated_ms", saturated ? elapsed : 0);
    c.o("ci.unassigned_ms", unassigned ? c.now - start : 0);
    const prev = await c.json<HoldersSnapshot | undefined>(SNAPSHOT.holders, undefined);
    await c.setJson(SNAPSHOT.holders, nextHolders(prev, open, c.d.repo, saturated, c.now));
}

/** Master's state (4.1) from the newest ci.yml push runs on master. */
async function master(
    c: Cycle,
    masterRuns: Collected[],
    cancels: Map<number, { cls: RunItem["cancelClass"] }>,
    elapsed: number,
) {
    const items: RunItem[] = [];
    for (const { run, repo } of masterRuns) {
        const stored = (await c.d.store.get(
            homeKey({ kind: "run", id: `${repo}/${run.id}`, attempt: run.run_attempt }),
        )) as RunItem | undefined;
        const cls = cancels.get(run.id)?.cls ?? stored?.cancelClass;
        items.push(toRunItem(run, repo, cls ? { cancelClass: cls } : {}));
    }
    const s = masterState(items);
    c.o("master.red_span_ms", s.red && s.redSince !== undefined ? c.now - s.redSince : 0);
    c.o("master.red_builds", s.redBuilds);
    c.o("master.red_ms", s.red && s.redSince !== undefined ? Math.min(elapsed, c.now - s.redSince) : 0);
    c.o("master.building_ms", s.buildingSince === undefined ? 0 : c.now - s.buildingSince);
}

async function pullRequests(c: Cycle, gh: GitHub) {
    const [owner, name] = c.d.repo.split("/");
    const since = Date.parse((await c.cursor("prs")) ?? iso(c.now - DAY));
    let cursor: string | null = null;
    let open: GqlPr[] = [];
    const recentSeen: GqlPr[] = [];
    for (let page = 0; page < 20; page++) {
        type Page = { nodes: GqlPr[]; pageInfo: { hasNextPage: boolean; endCursor: string } };
        const data: { repository: { open: Page; recent: Page } } = await gh.graphql(PR_QUERY, {
            owner,
            name,
            cursor,
            withOpen: page === 0,
        });
        if (page === 0) open = data.repository.open.nodes;
        const recent = data.repository.recent;
        const newer = recent.nodes.filter((p) => Date.parse(p.updatedAt) >= since - 5 * MIN);
        recentSeen.push(...newer);
        if (newer.length < recent.nodes.length || !recent.pageInfo.hasNextPage) break;
        cursor = recent.pageInfo.endCursor;
    }
    await pendingPrRuns(c, gh, [...open, ...recentSeen]);
    for (const p of recentSeen) c.items.push(await withStages(c, toPrItem(p, c.d.repo)));
    for (const p of open) c.items.push(toPrItem(p, c.d.repo));
    c.openPrs = open;
    await ownerWaits(c, gh, open);
    const s = prStocks(open, c.now);
    c.o("pr.open", s.open);
    c.o("pr.oldest_open_ms", s.oldestOpenMs);
    c.o("pr.automerge_green_stuck", s.autoMergeGreenStuck);
    c.o("pr.automerge_armed_long", s.autoMergeArmedLong);
    c.o("pr.screenshot_backlog_ms", s.screenshotBacklogMs);
    c.o("pr.max_failing_same_check", s.maxFailingSameCheck);
    const prevShared = await c.json<SharedSnapshot | undefined>(SNAPSHOT.shared, undefined);
    await c.setJson(SNAPSHOT.shared, nextShared(prevShared, open, recentSeen, c.now));
    if (c.openRuns) {
        const sup = supersededRuns(c.openRuns, open, c.now);
        await c.setJson(SNAPSHOT.superseded, sup);
        c.o("ci.superseded_running", sup.rows.length);
    }
    await setCursor(c.d.store, "prs", iso(c.now), c.now);
}

/** The open pull requests waiting on the owner, with the CODEOWNERS paths their files touch (one query). */
async function ownerWaits(c: Cycle, gh: GitHub, open: GqlPr[]) {
    const waiting = open.filter((p) => p.state === "OPEN" && !p.isDraft && waitsOnOwner(p));
    const [owner, name] = c.d.repo.split("/");
    const files = new Map<number, string[]>();
    if (waiting.length) {
        const data = await gh.graphql<{ repository: Record<string, { files: { nodes: { path: string }[] } } | null> }>(
            ownerFilesQuery(waiting.map((p) => p.number)),
            { owner, name },
        );
        for (const p of waiting)
            files.set(p.number, data.repository[`p${p.number}`]?.files.nodes.map((f) => f.path) ?? []);
    }
    const codeowners = await c.json<string[]>("codeowners", []);
    const list: OwnerWait[] = waiting.map((p) => ownerWaitOf(p, files.get(p.number) ?? [], codeowners));
    await c.setJson("owner-wait", list);
}

/**
 * The committed quarantine list, CODEOWNERS, ci.yml's jobs and those allowed to fail, from master (one query;
 * hourly, and once before any exists).
 */
async function repoFiles(c: Cycle, gh: GitHub) {
    const [owner, name] = c.d.repo.split("/");
    type Blob = { text: string } | null;
    const data = await gh.graphql<{
        repository: { quarantine: Blob; codeowners: Blob; ci?: Blob; advisory?: Blob };
    }>(REPO_FILES_QUERY, { owner, name });
    const ci = data.repository.ci?.text;
    if (ci) {
        const advisory = data.repository.advisory?.text;
        const jobs = advisory
            ? ((JSON.parse(advisory) as { advisory?: { job: string; step?: string }[] }).advisory ?? [])
                  .filter((a) => !a.step)
                  .map((a) => a.job)
            : [];
        await c.setJson("non-gating", nonGatingJobs(ci, jobs));
        await c.setJson("ci-jobs", definedJobs(ci));
    }
    const q = data.repository.quarantine?.text;
    const list = q ? ((JSON.parse(q) as { quarantine?: QuarantineEntry[] }).quarantine ?? []) : [];
    await c.setJson(
        "quarantine",
        list.map(({ file, name: test, family, issue, since, expires }) => ({
            file,
            name: test,
            family,
            issue,
            since,
            expires,
        })),
    );
    await c.setJson("codeowners", codeownerPatterns(data.repository.codeowners?.text ?? ""));
}

/** Issues updated since the cursor, and the open "Release held" issues (their age is a hold's age). */
async function issues(c: Cycle, gh: GitHub): Promise<number> {
    const [owner, name] = c.d.repo.split("/");
    const since = Date.parse((await c.cursor("issues")) ?? iso(c.now - DAY));
    let cursor: string | null = null;
    let heldSince = 0;
    for (let page = 0; page < 20; page++) {
        type Page = { nodes: GqlIssue[]; pageInfo: { hasNextPage: boolean; endCursor: string } };
        const data: { repository: { recent: Page }; held: { nodes: (GqlIssue | null)[] } } = await gh.graphql(
            ISSUE_QUERY,
            {
                owner,
                name,
                cursor,
                held: `repo:${c.d.repo} is:issue is:open in:title "Release held"`,
            },
        );
        if (page === 0)
            for (const i of data.held.nodes)
                if (i?.title.startsWith("Release held") && i.state === "OPEN")
                    heldSince = Math.min(heldSince || Infinity, Date.parse(i.createdAt));
        const recent = data.repository.recent;
        const newer = recent.nodes.filter((i) => Date.parse(i.updatedAt) >= since - 5 * MIN);
        for (const i of newer) c.items.push(toIssueItem(i, c.d.repo));
        if (newer.length < recent.nodes.length || !recent.pageInfo.hasNextPage) break;
        cursor = recent.pageInfo.endCursor;
    }
    await setCursor(c.d.store, "issues", iso(c.now), c.now);
    return heldSince;
}

/**
 * The release attempts to read: every attempt of a finished run, since the runs list shows only the newest, so an
 * attempt a re-run replaced before this cycle (release-rerun.yml re-runs a red full run at once) is read through
 * runs/<id>/attempts/<n>. An attempt seen before lanes were kept is read once more. Fills in the mode of attempts
 * seen before modes were kept.
 */
function releaseTodo(runs: GhRun[], seen: Record<string, ReleaseSeen>): { newest: GhRun; path: string }[] {
    const todo: { newest: GhRun; path: string }[] = [];
    for (const r of runs.filter((x) => x.status === "completed")) {
        for (const [key, s] of Object.entries(seen))
            if (key.startsWith(`${r.id}.`)) s.mode ??= releaseMode(r.display_title);
        for (let n = 1; n <= r.run_attempt; n++)
            if (!seen[`${r.id}.${n}`]?.lanes)
                todo.push({ newest: r, path: n === r.run_attempt ? `${r.id}` : `${r.id}/attempts/${n}` });
    }
    return todo;
}

/** Reads one release attempt (`<run id>` or `<run id>/attempts/<n>`) into `seen`; a failure is read next cycle. */
async function readReleaseAttempt(
    c: Cycle,
    gh: GitHub,
    seen: Record<string, ReleaseSeen>,
    { newest, path }: { newest: GhRun; path: string },
) {
    const repo = c.d.repo;
    let r: GhRun | undefined;
    let jobs: GhJob[];
    try {
        r = path.includes("/") ? await gh.rest<GhRun>(`repos/${repo}/actions/runs/${path}`) : newest;
        if (!r) return;
        jobs = await allJobs(gh, repo, path);
    } catch (e) {
        c.skipped.push(`jobs of release run ${path}: ${message(e)}`); // not seen: read again next cycle
        return;
    }
    const a = releaseAttempt(r, jobs);
    seen[`${r.id}.${r.run_attempt}`] = {
        sha: r.head_sha,
        at: Date.parse(r.updated_at),
        tested: a.tested,
        red: a.red,
        ciFailed: a.lanes.ci === "failed",
        run: r.id,
        mode: a.mode,
        created: Date.parse(r.run_started_at ?? r.created_at),
        ok: r.conclusion === "success",
        lanes: a.lanes,
        jobs: a.jobs,
        ...(a.failedJob ? { failedJob: a.failedJob } : {}),
    };
    c.items.push(toRunItem(r, repo, { tested: a.tested }));
}

/** Release lanes (4.5) from release.yml's job conclusions, the release workflows, untested master age. */
async function releases(c: Cycle, gh: GitHub, heldSince: number) {
    const repo = c.d.repo;
    const runs =
        (await gh.rest<RunsPage>(`repos/${repo}/actions/workflows/release.yml/runs?per_page=12`))?.workflow_runs ?? [];
    const seen = await c.json<Record<string, ReleaseSeen>>("release", {});
    await mapPool(releaseTodo(runs, seen), 4, (t) => readReleaseAttempt(c, gh, seen, t));
    const attempts = Object.values(seen).sort((a, b) => b.at - a.at);
    await c.setJson(
        "release",
        Object.fromEntries(
            Object.entries(seen)
                .sort((a, b) => b[1].at - a[1].at)
                .slice(0, 40),
        ),
    );
    const candidate = attempts.find((a) => a.tested);
    const newest = attempts[0];
    c.o("release.lanes_red", candidate?.red.length ?? 0);
    const holdSince = Math.min(candidate?.red.length ? candidate.at : Infinity, heldSince || Infinity);
    c.o("release.hold_open_ms", Number.isFinite(holdSince) ? c.now - holdSince : 0);
    c.o("release.train_skipped", trainSkipped(attempts, runs) ? 1 : 0);
    c.o("master.full_run_failed", candidate?.ciFailed ? 1 : 0);

    let failing = 0;
    let maxInRow = 0;
    const wfs: WorkflowState[] = [];
    for (const wf of Object.keys(RELEASE_WORKFLOW_EVENTS)) {
        const list =
            wf === "release.yml"
                ? runs
                : ((
                      await gh.rest<RunsPage>(
                          `repos/${repo}/actions/workflows/${wf}/runs?per_page=10&event=${RELEASE_WORKFLOW_EVENTS[wf][0]}`,
                      )
                  )?.workflow_runs ?? []);
        const w = workflowState(wf, list, c.now);
        wfs.push(w);
        if (w.inRow > 0) failing++;
        maxInRow = Math.max(maxInRow, w.inRow);
    }
    await c.setJson("release-workflows", wfs);
    c.o("release.workflows_failing", failing);
    c.o("release.max_failed_in_row", maxInRow);

    // Untested master age: the oldest master commit after the newest tested candidate.
    if (candidate) {
        const cmp = await gh.rest<{ commits: CompareCommit[] }>(`repos/${repo}/compare/${candidate.sha}...master`);
        const oldest = oldestUntested(cmp?.commits ?? []);
        c.o("master.untested_age_ms", oldest === undefined ? 0 : c.now - oldest);
    }
    if (newest) await recordSource(c.d.store, "release", newest.at, { ok: true });
}

/** The weekly stress run (4.7), hourly: its newest run's filing, and three weeks finding nothing. */
async function stress(c: Cycle, gh: GitHub) {
    const repo = c.d.repo;
    const listed = (
        (await gh.rest<RunsPage>(`repos/${repo}/actions/workflows/restricted-cpu-stress.yml/runs?per_page=10`))
            ?.workflow_runs ?? []
    ).filter((r) => r.status === "completed");
    if (!listed.length) return;
    // The runs of the last three weeks (re-runs and dispatches can put three runs in one week), at least the newest.
    const runs = listed.filter((r, i) => i === 0 || c.now - Date.parse(r.created_at) <= STRESS_WEEKS * WEEK);
    // The Data sources page's stress table (views/sections.ts `stressTable`) reads this cursor: newest first.
    const cache = await c.json<Record<string, StressCursorRun>>("stress", {});
    for (const r of runs) {
        if (cache[r.id]?.at === undefined) {
            cache[r.id] = {
                ...stressRunState(await allJobs(gh, repo, r.id)),
                at: Date.parse(r.created_at),
                runId: r.id,
            };
        }
    }
    await c.setJson("stress", Object.fromEntries(runs.map((r) => [r.id, cache[r.id]])));
    const newest = cache[runs[0].id];
    const seen = runs.map((r) => cache[r.id]);
    let state = stressQuiet(seen, c.now) ? 1 : 0;
    if (newest.state === 2) state = 2;
    c.o("stress.state", state);
    await recordSource(c.d.store, "stress", Date.parse(runs[0].created_at), { ok: true });
}

async function hosts(c: Cycle, gh: GitHub) {
    const runs =
        (await gh.rest<RunsPage>(`repos/${c.d.repo}/actions/workflows/hosts.yml/runs?per_page=5&status=completed`))
            ?.workflow_runs ?? [];
    if (runs[0]) await recordSource(c.d.store, "hosts", Date.parse(runs[0].updated_at), { ok: true });
}

const etags = new Map<string, { etag: string; time: Record<string, string> }>();

/** One packument's `time`, revalidated by ETag (a 304 has no body); undefined when npm has no such package. */
async function npmTimes(f: Fetch, pkg: string): Promise<Record<string, string> | undefined> {
    const url = `https://registry.npmjs.org/${pkg.replace("/", "%2F")}`;
    const old = etags.get(pkg);
    const res = await f(url, { headers: old ? { "if-none-match": old.etag } : {} });
    if (res.status === 304 && old) return old.time;
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`npm ${pkg}: HTTP ${res.status}`);
    const body = (await res.json()) as { time?: Record<string, string> };
    const time = body.time ?? {};
    const etag = res.headers.get("etag");
    if (etag) etags.set(pkg, { etag, time });
    return time;
}

/** npm (4.5): tagged `{project}@{version}` releases of the last 30 days that npm does not list. */
async function npm(c: Cycle, gh: GitHub) {
    const [owner, name] = c.d.repo.split("/");
    const data = await gh.graphql<{
        repository: {
            refs: { nodes: { name: string; target: { committedDate?: string; tagger?: { date: string } } }[] };
        };
    }>(TAG_QUERY, { owner, name });
    const tags: Tag[] = releaseTags(data.repository.refs.nodes).filter((t) => c.now - t.taggedAt <= 30 * DAY);
    const pkgs = [...new Set(tags.map((t) => npmName(t.project)))];
    const times = new Map<string, Record<string, string> | undefined>();
    await mapPool(pkgs, 4, async (p) => times.set(p, await npmTimes(c.d.fetch, p)));
    const missing = taggedNotOnNpm(tags, times);
    for (const t of tags) {
        const published = times.get(npmName(t.project))?.[t.version];
        c.items.push({
            kind: "npm",
            id: `${npmName(t.project)}@${t.version}`,
            attempt: 1,
            pkg: npmName(t.project),
            version: t.version,
            taggedAt: t.taggedAt,
            ...(published ? { publishedAt: Date.parse(published) } : {}),
        });
    }
    c.o("npm.tagged_missing", missing.length);
    c.o("npm.tagged_missing_oldest_ms", missing.length ? c.now - Math.min(...missing.map((t) => t.taggedAt)) : 0);
    await recordSource(c.d.store, "npm", c.now, { ok: true });
}

/** Builds started for one tools/pipeline-health tree before a failure is left for a person. */
const DEPLOY_ATTEMPTS = 3;

export const DEPLOY_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    tree: object(expression: "master:tools/pipeline-health") { oid }
    budgets: object(expression: "master:ci-budgets.json") { oid }
    head: object(expression: "master") { oid }
  }
}`;

/**
 * Redeploys the health stack: when master's tools/pipeline-health tree (or ci-budgets.json) differs from the one the last build was
 * started for, starts the deploy build at master's head, unless the last build is still running. A failed build
 * is retried for the same tree up to DEPLOY_ATTEMPTS times and stays an error on the deploy source until one passes.
 * @param c - the cycle
 * @param gh - the GitHub App client
 * @param builds - the deploy build
 */
async function deploy(c: Cycle, gh: GitHub, builds: DeployBuilds): Promise<void> {
    const [owner, name] = c.d.repo.split("/");
    const data = await gh.graphql<{
        repository: { tree: { oid: string } | null; budgets?: { oid: string } | null; head: { oid: string } | null };
    }>(DEPLOY_QUERY, { owner, name });
    // ci-budgets.json is bundled into the Lambda (metrics.ts), so a budget change redeploys like a folder change.
    const folder = data.repository.tree?.oid;
    const tree = folder && data.repository.budgets ? `${folder}+${data.repository.budgets.oid}` : folder;
    const head = data.repository.head?.oid;
    if (!tree || !head) {
        throw new Error("master has no tools/pipeline-health");
    }
    const last = await c.json<{ tree?: string; buildId?: string; attempt?: number }>("deploy", {});
    const status = last.buildId ? await builds.status(last.buildId) : undefined;
    if (status === "IN_PROGRESS") {
        await recordSource(c.d.store, "deploy", c.now, { ok: true });
        return;
    }
    // STOPPED is someone stopping the build on purpose: never started again for the same tree.
    const failed = status !== undefined && status !== "SUCCEEDED" && status !== "STOPPED";
    const attempt = last.tree === tree ? (last.attempt ?? 1) : 0;
    // A new tree starts a build; a failed build of the same tree is retried up to DEPLOY_ATTEMPTS times in all.
    if (last.tree !== tree || (failed && attempt < DEPLOY_ATTEMPTS)) {
        const buildId = await builds.start(head);
        await c.setJson("deploy", { tree, buildId, commit: head, attempt: attempt + 1 });
        if (last.tree === tree)
            throw new Error(`deploy build ${last.buildId} ${status}; attempt ${attempt + 1} started`);
    } else if (failed) {
        throw new Error(`deploy build ${last.buildId} ${status} after ${attempt} attempts`);
    } else if (status === "STOPPED") {
        // Not restarted, but not healthy either: the stack runs older code than master until a new tree deploys.
        throw new Error(`deploy build ${last.buildId} STOPPED; not restarted for the same tree`);
    }
    await recordSource(c.d.store, "deploy", c.now, { ok: true });
}

// ---------------------------------------------------------------------------------------------------------------
// Parts that need no GitHub App.

/** Coverage freshness: the newest Coveralls build on master (yellow past 24 h, red past 48 h). */
async function coverage(c: Cycle) {
    const res = await c.d.fetch(`https://coveralls.io/github/${c.d.repo}.json?branch=master`, {
        headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`coveralls: HTTP ${res.status}`);
    const body = (await res.json()) as { created_at?: string };
    if (!body.created_at) throw new Error("coveralls: no build");
    await recordSource(c.d.store, "coverage", Date.parse(body.created_at), { ok: true });
}

/** Money lines by day for this month: AWS from Cost Explorer, the fixed plans spread over the month. */
async function costs(c: Cycle) {
    const monthStart = Date.UTC(new Date(c.now).getUTCFullYear(), new Date(c.now).getUTCMonth(), 1);
    const lines: CostItem[] = [];
    for (let t = monthStart; t <= c.now; t += DAY) lines.push(...fixedCosts(c.d.rates, t));
    if (c.d.awsCosts) {
        for (const r of await c.d.awsCosts(day(monthStart), day(c.now + DAY)))
            lines.push({
                kind: "cost",
                id: `aws#${r.day}`,
                attempt: 1,
                line: "aws",
                day: Date.parse(r.day),
                usd: r.usd,
            });
    }
    c.items.push(...lines);
    await recordSource(c.d.store, "billing", c.now, { ok: true });
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * Items whose stored home differs from them. The npm tags and the month's cost lines are read again every hour or
 * day; rewriting unchanged ones would mark a month of buckets dirty for nothing.
 */
async function changed(store: Store, items: RawItem[]): Promise<RawItem[]> {
    const keep = await mapPool(items, 16, async (r) => {
        if (r.kind === "obs") return true;
        const old = await store.get(homeKey(r));
        return !old || Object.entries(r).some(([k, v]) => JSON.stringify(old[k]) !== JSON.stringify(v));
    });
    return items.filter((_, i) => keep[i]);
}

/** Every GitHub part of one cycle; the collector source is OK when the runs, pull requests and issues were. */
async function collectGitHub(c: Cycle, gh: GitHub, elapsed: number, hourly: boolean) {
    const d = c.d;
    let ok = true;
    let collected: Collected[] | undefined;
    ok &&= await c.part("github", "collector", async () => {
        const repos = await activeRepos(c, gh);
        const masterList = (
            (
                await gh.rest<RunsPage>(
                    `repos/${d.repo}/actions/workflows/ci.yml/runs?branch=master&event=push&per_page=20`,
                )
            )?.workflow_runs ?? []
        ).map((run) => ({ run, repo: d.repo }));
        const xs = await collectRuns(c, gh, repos, []);
        // Pending is persisted now, before putRaw stores the runs complete at the end of the cycle.
        await prRuns(c, xs);
        const cancels = await classify(gh, [...xs, ...masterList]);
        await writeRuns(c, gh, xs, cancels);
        collected = xs;
        c.openRuns = xs.filter((x) => x.run.status !== "completed").map((x) => x.run);
        await master(c, masterList, cancels, elapsed);
    });
    const missing = async (name: string) => (await c.cursor(name)) === undefined;
    if (hourly || (await missing("quarantine")) || (await missing("non-gating")) || (await missing("ci-jobs")))
        await c.part("repo files", "collector", () => repoFiles(c, gh));
    ok = (await c.part("pull requests", "collector", () => pullRequests(c, gh))) && ok;
    const xs = collected;
    if (xs) ok = (await c.part("runners", "collector", () => runners(c, xs, elapsed))) && ok;
    let heldSince = 0;
    const readIssues = async () => {
        heldSince = await issues(c, gh);
    };
    ok = (await c.part("issues", "collector", readIssues)) && ok;
    await c.part("releases", "release", () => releases(c, gh, heldSince));
    const open = c.openPrs;
    if (open)
        await c.part("flaky", "collector", async () => {
            for (const [metric, value] of Object.entries(await flakyMembers(d.store, gh, d.repo, open, c.now)))
                c.o(metric, value);
        });
    await c.part("jobs", "collector", async () => {
        const { list, obs: o } = await jobMembers(d.store, gh, d.repo, c.now);
        await c.setJson("chronic-jobs", list);
        for (const [metric, value] of Object.entries(o)) c.o(metric, value);
    });
    if (hourly) {
        await c.part("stress", "stress", () => stress(c, gh));
        await c.part("hosts", "hosts", () => hosts(c, gh));
        await c.part("npm", "npm", () => npm(c, gh));
    }
    const builds = d.deploy;
    if (builds) await c.part("deploy", "deploy", () => deploy(c, gh, builds));
    if (gh.rate) c.o("github.rate_remaining_share", gh.rate.remaining / gh.rate.limit);
    const partial = c.skipped.join("; ").slice(0, 300);
    if (ok) await recordSource(d.store, "collector", d.now, { ok: true, ...(partial ? { partial } : {}) });
}

export async function collect(d: Deps): Promise<CycleReport> {
    const c = new Cycle(d);
    const prev = Number((await c.cursor("cycle")) ?? 0);
    const elapsed = prev ? Math.min(5 * MIN, d.now - prev) : 5 * MIN;
    const hourly = await c.due("hourly", HOUR);
    const daily = await c.due("daily", DAY);

    if (hourly) await c.part("coverage", "coverage", () => coverage(c));
    if (daily) await c.part("costs", "billing", () => costs(c));

    await c.part("benchmarks", undefined, async () => {
        const benches = await readBenches(d.store, d.now);
        c.o("ci.bench_regressions", benches.filter((b) => trend(b.points).regressed).length);
    });
    const gh = d.gh;
    if (gh) await collectGitHub(c, gh, elapsed, hourly);

    const items = await changed(d.store, c.items);
    await putRaw(d.store, items, d.now);
    await setCursor(d.store, "cycle", String(d.now), d.now);
    if (hourly) await setCursor(d.store, "hourly", String(d.now), d.now);
    if (daily && !c.errors.costs) await setCursor(d.store, "daily", String(d.now), d.now);
    return {
        github: gh ? "collected" : "not set up",
        items: items.length,
        calls: gh?.calls ?? 0,
        errors: c.errors,
        skipped: c.skipped,
    };
}
