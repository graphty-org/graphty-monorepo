// One collector cycle (design section 10.4): GitHub runs, jobs and steps since a cursor, the jobs of every
// unfinished run, pull requests and issues in one GraphQL query each, master's state, the release lanes; hourly
// the stress run, the host matrix, npm and coverage; daily the costs. Everything is written through the model's
// raw writers (idempotent), with cursors in the table and each source's health for the Data sources page.

import type { CostItem, ObservationItem, RawItem, RunItem } from "../model/items.js";
import { DAY, HOUR, homeKey, MIN } from "../model/items.js";
import { getCursor, putRaw, recordSource, setCursor } from "../model/raw.js";
import type { Store } from "../model/store.js";
import type { Fetch, GitHub } from "./github.js";
import {
    classifyCancel,
    failedInRow,
    fixedCosts,
    llmCost,
    masterState,
    npmName,
    prStocks,
    releaseAttempt,
    releaseTags,
    runnerFlags,
    runnerUse,
    type StressCursorRun,
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
    workflowFile,
    type GhJob,
    type GhRun,
    type GqlIssue,
    type GqlPr,
    type Lane,
    type Rates,
    type SuiteNode,
    type Tag,
} from "./parse.js";
import { ISSUE_QUERY, PR_QUERY, SUITE_QUERY, TAG_QUERY } from "./queries.js";
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
}

export interface CycleReport {
    github: "not set up" | "collected";
    items: number;
    calls: number;
    errors: Record<string, string>;
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
    /** Unfinished runs of this cycle, for the superseded list (pull requests part). */
    openRuns?: GhRun[];
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
interface JobsPage {
    total_count: number;
    jobs: GhJob[];
}

async function allJobs(gh: GitHub, repo: string, runId: number): Promise<GhJob[]> {
    const jobs: GhJob[] = [];
    for (let page = 1; page <= 5; page++) {
        const r = await gh.rest<JobsPage>(
            `repos/${repo}/actions/runs/${runId}/jobs?per_page=100&filter=latest&page=${page}`,
        );
        jobs.push(...(r?.jobs ?? []));
        if (!r || jobs.length >= r.total_count || !r.jobs.length) break;
    }
    return jobs;
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
    for (const repo of repos) {
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
    await mapPool(keep, 8, async (x) => {
        x.jobs = await allJobs(gh, x.repo, x.run.id);
    });
    for (const repo of repos) await setCursor(c.d.store, `runs#${repo}`, iso(c.now), c.now);
    return keep;
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
            const notes = suiteNotes(data.nodes[k] ?? null);
            out.set(x.run.id, { cls: classifyCancel(notes), hung: timedOutJobs(notes) });
        });
    }
    return out;
}

async function writeRuns(
    c: Cycle,
    xs: Collected[],
    cancels: Map<number, { cls: RunItem["cancelClass"]; hung: Set<string> }>,
) {
    // The shared set of the last cycle (the pull requests part runs after this one).
    const shared = new Set(
        (await c.json<SharedSnapshot | undefined>(SNAPSHOT.shared, undefined))?.rows
            .filter((r) => r.end === undefined)
            .map((r) => r.check),
    );
    for (const { run, repo, jobs } of xs) {
        const cancel = cancels.get(run.id);
        const workflow = workflowFile(run.path);
        const cause =
            workflow === "ci.yml" && run.status === "completed"
                ? failureCause(run, jobs ?? [], cancel?.hung ?? new Set(), shared)
                : undefined;
        c.items.push(
            toRunItem(run, repo, { ...(cancel?.cls ? { cancelClass: cancel.cls } : {}), ...(cause ? { cause } : {}) }),
        );
        if (workflow === "ci.yml" && run.run_attempt > 1 && run.conclusion === "success") await flaky(c, run, repo);
        for (const j of jobs ?? []) {
            c.items.push(toJobItem(j, repo, workflow, cancel?.hung.has(j.name) ?? false));
            if (STEP_WORKFLOWS.has(workflow) && j.status === "completed")
                c.items.push(...toStepItems(j, repo, workflow));
            if (j.status === "completed") {
                const t4 = t4Cost(j, repo, c.d.rates, workflow);
                const llm = llmCost(j, repo, c.d.rates, workflow);
                if (t4) c.items.push(t4);
                if (llm) c.items.push(llm);
            }
        }
    }
}

/** A rerun that passed makes its first attempt's "the change" failure flaky (reclassified as evidence arrives). */
async function flaky(c: Cycle, run: GhRun, repo: string) {
    const first = (await c.d.store.get(homeKey({ kind: "run", id: `${repo}/${run.id}`, attempt: 1 }))) as
        RunItem | undefined;
    if (first?.cause === "change") {
        const { pk: _pk, sk: _sk, ttl: _ttl, ...item } = first as RunItem & { pk: string; sk: string; ttl?: number };
        c.items.push({ ...item, cause: "flaky" });
    }
}

/** Runner use against the limits (4.3), counted in jobs of every unfinished run. */
async function runners(c: Cycle, xs: Collected[], elapsed: number) {
    const open = xs.filter((x) => x.run.status !== "completed");
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
    c.openRuns = open.map((x) => x.run);
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
        for (const p of newer) c.items.push(toPrItem(p, c.d.repo));
        recentSeen.push(...newer);
        if (newer.length < recent.nodes.length || !recent.pageInfo.hasNextPage) break;
        cursor = recent.pageInfo.endCursor;
    }
    for (const p of open) c.items.push(toPrItem(p, c.d.repo));
    const s = prStocks(open, c.now);
    c.o("pr.open", s.open);
    c.o("pr.oldest_open_ms", s.oldestOpenMs);
    c.o("pr.automerge_stuck", s.autoMergeStuck);
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

interface SeenAttempt {
    sha: string;
    at: number;
    tested: boolean;
    red: Lane[];
    ciFailed: boolean;
}

/** Release lanes (4.5) from release.yml's job conclusions, the release workflows, untested master age. */
async function releases(c: Cycle, gh: GitHub, heldSince: number) {
    const repo = c.d.repo;
    const runs =
        (await gh.rest<RunsPage>(`repos/${repo}/actions/workflows/release.yml/runs?per_page=12`))?.workflow_runs ?? [];
    const seen = await c.json<Record<string, SeenAttempt>>("release", {});
    const todo = runs.filter((r) => r.status === "completed" && !seen[`${r.id}.${r.run_attempt}`]);
    await mapPool(todo, 4, async (r) => {
        const a = releaseAttempt(r, await allJobs(gh, repo, r.id));
        seen[`${r.id}.${r.run_attempt}`] = {
            sha: r.head_sha,
            at: Date.parse(r.updated_at),
            tested: a.tested,
            red: a.red,
            ciFailed: a.lanes.ci === "failed",
        };
        c.items.push(toRunItem(r, repo, { tested: a.tested }));
    });
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
    c.o("release.train_skipped", newest && !newest.tested && newest.sha !== candidate?.sha ? 1 : 0);
    c.o("master.full_run_failed", candidate?.ciFailed ? 1 : 0);

    let failing = 0;
    let maxInRow = 0;
    for (const wf of ["release.yml", "promote.yml", "release-watch.yml"]) {
        const list =
            wf === "release.yml"
                ? runs
                : ((await gh.rest<RunsPage>(`repos/${repo}/actions/workflows/${wf}/runs?per_page=10`))?.workflow_runs ??
                  []);
        const n = failedInRow(list);
        if (n > 0) failing++;
        maxInRow = Math.max(maxInRow, n);
    }
    c.o("release.workflows_failing", failing);
    c.o("release.max_failed_in_row", maxInRow);

    // Untested master age: the oldest master commit after the newest tested candidate.
    if (candidate) {
        type Compare = { commits: { parents: unknown[]; commit: { committer: { date: string } } }[] };
        const cmp = await gh.rest<Compare>(`repos/${repo}/compare/${candidate.sha}...master`);
        const merges = (cmp?.commits ?? []).filter((x) => x.parents.length > 1);
        const dates = (merges.length ? merges : (cmp?.commits ?? [])).map((x) => Date.parse(x.commit.committer.date));
        c.o("master.untested_age_ms", dates.length ? c.now - Math.min(...dates) : 0);
    }
    if (newest) await recordSource(c.d.store, "release", newest.at, { ok: true });
}

/** The weekly stress run (4.7), hourly: its newest run's filing, and three weeks finding nothing. */
async function stress(c: Cycle, gh: GitHub) {
    const repo = c.d.repo;
    const runs = (
        (await gh.rest<RunsPage>(`repos/${repo}/actions/workflows/restricted-cpu-stress.yml/runs?per_page=3`))
            ?.workflow_runs ?? []
    ).filter((r) => r.status === "completed");
    if (!runs.length) return;
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
    const quiet = runs.length === 3 && runs.every((r) => !cache[r.id].foundFailures);
    c.o("stress.state", newest.state === 2 ? 2 : quiet ? 1 : 0);
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

export async function collect(d: Deps): Promise<CycleReport> {
    const c = new Cycle(d);
    const prev = Number((await c.cursor("cycle")) ?? 0);
    const elapsed = prev ? Math.min(5 * MIN, d.now - prev) : 5 * MIN;
    const hourly = await c.due("hourly", HOUR);
    const daily = await c.due("daily", DAY);

    if (hourly) await c.part("coverage", "coverage", () => coverage(c));
    if (daily) await c.part("costs", "billing", () => costs(c));

    const gh = d.gh;
    if (gh) {
        let ok = true;
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
            const cancels = await classify(gh, [...xs, ...masterList]);
            await writeRuns(c, xs, cancels);
            await runners(c, xs, elapsed);
            await master(c, masterList, cancels, elapsed);
        });
        ok = (await c.part("pull requests", "collector", () => pullRequests(c, gh))) && ok;
        let heldSince = 0;
        ok = (await c.part("issues", "collector", async () => void (heldSince = await issues(c, gh)))) && ok;
        await c.part("releases", "release", () => releases(c, gh, heldSince));
        if (hourly) {
            await c.part("stress", "stress", () => stress(c, gh));
            await c.part("hosts", "hosts", () => hosts(c, gh));
            await c.part("npm", "npm", () => npm(c, gh));
        }
        if (gh.rate) c.o("github.rate_remaining_share", gh.rate.remaining / gh.rate.limit);
        if (ok) await recordSource(d.store, "collector", d.now, { ok: true });
    }

    const items = await changed(d.store, c.items);
    await putRaw(d.store, items, d.now);
    await setCursor(d.store, "cycle", String(d.now), d.now);
    if (hourly) await setCursor(d.store, "hourly", String(d.now), d.now);
    if (daily && !c.errors.costs) await setCursor(d.store, "daily", String(d.now), d.now);
    return { github: gh ? "collected" : "not set up", items: items.length, calls: gh?.calls ?? 0, errors: c.errors };
}
