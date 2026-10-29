// The four-week backfill (design section 10.4): 28 days of flaky tests, runs and jobs, pull requests and issues,
// written through the same raw writers as the collector, so the range's 5-minute buckets are marked dirty and
// recompute rebuilds their rollups. Throttled under the GitHub App's hourly budget and a share of the daily write
// budget, and resumable: each phase has a cursor holding the next (older) day, so a timeout or a second run continues
// there. Every phase loads newest first, so a stop leaves the most recent days loaded.
//
// The phases, in order:
//   1. flaky tests: the warning annotations tools/test-quarantine.mjs leaves on each test shard's check run, written
//      as the rows the live feed (ingest /v1/failures with flaky: true) writes, from today back (cursor backfill#flaky)
//   2. runs and jobs, from yesterday back (cursor backfill#<repo>#newest; today is the live collector's)
//   3. pull requests and issues updated in the range (cursor backfill#prs-issues)
//
//   aws lambda invoke --profile graphty --region us-east-2 --function-name graphty-health-backfill \
//       --cli-binary-format raw-in-base64-out --payload '{"mode":"backfill","days":28}' /dev/stdout
//   cd tools/pipeline-health && AWS_PROFILE=graphty AWS_REGION=us-east-2 pnpm run backfill [-- --days 28 --per-hour 2000]
//   (the same from this machine, src/collector/backfill-cli.ts)
//
// A job behind `needs:` gets its created_at when its last dependency finishes (checked on ci.yml run 40239928447:
// Build completed 22:38:45, every job needing it was created 22:38:45), so the queue wait is started_at -
// created_at for every job with no dependency arithmetic.

import rates from "../../config/rates.json" with { type: "json" };
import { DAILY_ROW_LIMIT, DAY, homeKey, type RawItem, type TestItem } from "../model/items.js";
import { getCursor, putRaw, recordSource, setCursor, takeQuota } from "../model/raw.js";
import type { Store } from "../model/store.js";
import { type GitHub, runJobs } from "./github.js";
import {
    flakyTestItem,
    llmCost,
    loadKind,
    offMaster,
    t4Cost,
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
    type Rates,
} from "./parse.js";
import { FLAKY_SUITE_QUERY, ISSUE_QUERY, PR_QUERY } from "./queries.js";

export interface BackfillOptions {
    store: Store;
    gh: GitHub;
    repos: string[];
    /** owner/name whose pull requests and issues are loaded. */
    repo: string;
    days: number;
    /** GitHub requests an hour at most. */
    perHour: number;
    now: number;
    /** Epoch ms (on `clock`) after which no new request is made: a Lambda's timeout less a margin. */
    deadline?: number;
    /** Stop while the App has less than this share of its hour left, for the live collector (default 0.25). */
    minRateShare?: number;
    /** The day's ingested rows past which the backfill writes nothing (default half the daily write budget). */
    rowLimit?: number;
    /** Runs per page; the cursor counts pages of this size. */
    perPage?: number;
    /** Runs GitHub lists for one query (LISTED_RUNS; tests lower it). */
    listedRuns?: number;
    /**
     * Re-read only these days' runs of these workflows, whatever the cursors say, and nothing else: a repair of days
     * an earlier backfill lost (before hourRuns, a day over GitHub's listed limit kept only its newest runs).
     */
    repair?: { days: string[]; workflows: string[] };
    log?: (line: string) => void;
    sleep?: (ms: number) => Promise<void>;
    /** The clock the throttle and the deadline read (tests pass a fake one). */
    clock?: () => number;
}

export interface BackfillReport {
    /** Flaky test detections written (new ones only). */
    flaky: number;
    runs: number;
    items: number;
    calls: number;
    /** False when it stopped early; invoke it again to continue from its cursor. */
    done: boolean;
    stopped?: "deadline" | "rate" | "write_budget";
}

const STEP_WORKFLOWS = new Set(["release.yml", "restricted-cpu-stress.yml"]);
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
export const PRS_CURSOR = "backfill#prs-issues";
export const FLAKY_CURSOR = "backfill#flaky";
/** A repository's runs cursor: the next older day and page to load. */
export const runsCursor = (repo: string) => `backfill#${repo}#newest`;
/** The workflows whose jobs run test shards through tools/test-quarantine.mjs (release.yml and golden-verify.yml call ci.yml). */
const SHARD_WORKFLOWS = new Set(["ci.yml", "golden-verify.yml", "release.yml", "restricted-cpu-stress.yml"]);

class Stop extends Error {
    readonly why: NonNullable<BackfillReport["stopped"]>;
    constructor(why: NonNullable<BackfillReport["stopped"]>) {
        super(why);
        this.why = why;
    }
}

/** A runs cursor: the next day and page to load, and the hour when that day is read an hour at a time. */
interface RunsCursor {
    day: number | string;
    page: number;
    hour?: number;
}

/** A cursor's `{ day, page, hour }`, or undefined when there is none or it cannot be read (then start over: writes are idempotent). */
async function readCursor(store: Store, name: string): Promise<(RunsCursor & { day: number }) | undefined> {
    try {
        const raw = await getCursor(store, name);
        const c = raw ? (JSON.parse(raw) as RunsCursor & { day: string }) : undefined;
        if (c && Number.isFinite(Date.parse(c.day)))
            return { day: Date.parse(c.day), page: c.page, ...(c.hour === undefined ? {} : { hour: c.hour }) };
    } catch {
        // unreadable
    }
    return undefined;
}

export async function backfill(o: BackfillOptions): Promise<BackfillReport> {
    const sleep = o.sleep ?? ((ms) => new Promise<void>((ok) => setTimeout(ok, ms)));
    const clock = o.clock ?? Date.now;
    const log = o.log ?? (() => undefined);
    const perPage = o.perPage ?? 25;
    const started = clock();
    const calls0 = o.gh.calls;
    const r: BackfillReport = { flaky: 0, runs: 0, items: 0, calls: 0, done: false };
    // Before each call: the deadline, the App's hour, then a wait until the request budget so far allows it.
    const gate = async () => {
        if (o.deadline !== undefined && clock() >= o.deadline) throw new Stop("deadline");
        if (o.gh.rate && o.gh.rate.remaining < (o.minRateShare ?? 0.25) * o.gh.rate.limit) throw new Stop("rate");
        const wait = started + ((o.gh.calls - calls0) * 3_600_000) / o.perHour - clock();
        if (wait > 0) await sleep(wait);
    };
    const get = async <T>(path: string) => {
        await gate();
        return o.gh.rest<T>(path);
    };
    const write = async (out: RawItem[]) => {
        if (out.length && !(await takeQuota(o.store, out.length, o.now, o.rowLimit ?? DAILY_ROW_LIMIT / 2)))
            throw new Stop("write_budget");
        await putRaw(o.store, out, o.now, { merge: true });
        r.items += out.length;
    };
    const first = Math.floor((o.now - o.days * DAY) / DAY) * DAY;

    try {
        const ctx: Ctx = { o, perPage, gate, get, write, r, log };
        if (o.repair) {
            await repairRuns(ctx, o.repair.days, o.repair.workflows);
            r.done = true;
            r.calls = o.gh.calls - calls0;
            return r;
        }
        await flakyTests(ctx, first);
        for (const repo of o.repos) await repoRuns(ctx, repo, first);
        if ((await getCursor(o.store, PRS_CURSOR)) !== "done") {
            await pullRequestsAndIssues(o, gate, write, first);
            await setCursor(o.store, PRS_CURSOR, "done", o.now);
        }
        // The collector's history now starts at the range's first day, not its first live write. Every finished
        // invocation does it (min() keeps it idempotent), so re-invoking a backfill that already finished sets it too.
        await recordSource(o.store, "collector", o.now, { ok: true }, first);
        r.done = true;
    } catch (e) {
        if (!(e instanceof Stop)) throw e;
        r.stopped = e.why;
    }
    r.calls = o.gh.calls - calls0;
    return r;
}

interface Ctx {
    o: BackfillOptions;
    perPage: number;
    gate: () => Promise<void>;
    get: <T>(path: string) => Promise<T | undefined>;
    write: (out: RawItem[]) => Promise<void>;
    r: BackfillReport;
    log: (line: string) => void;
}

/**
 * One repository's runs, day by day from yesterday back to the range's first day. A cursor written by the earlier
 * oldest-first backfill (`backfill#<repo>`, its next day) means every day before that day is loaded: the walk stops
 * there.
 */
async function repoRuns(c: Ctx, repo: string, first: number): Promise<void> {
    const older = await readCursor(c.o.store, `backfill#${repo}`);
    const floor = Math.max(first, older?.day ?? first);
    const at = (await readCursor(c.o.store, runsCursor(repo))) ?? {
        day: Math.floor(c.o.now / DAY) * DAY - DAY,
        page: 1,
    };
    for (let day = at.day; day >= floor; day -= DAY)
        await dayRuns(c, repo, day, day === at.day ? at : { day, page: 1 });
}

/** GitHub lists at most this many runs for one query; past it a page comes back empty. */
export const LISTED_RUNS = 1000;

/**
 * One day's runs (a day already over: no page shifts), a page at a time from the cursor's page; the cursor moves
 * after each. A day with more runs than GitHub lists for one query (1,945 on 2026-10-12, whose 945 oldest runs and
 * their T4 jobs were lost) is read an hour at a time instead, newest first, with the hour in the cursor.
 */
async function dayRuns(c: Ctx, repo: string, day: number, from: RunsCursor): Promise<void> {
    if (from.hour !== undefined) return hourRuns(c, repo, day, from.hour, from.page);
    const limit = c.o.listedRuns ?? LISTED_RUNS;
    for (let page = from.page; page <= Math.ceil(limit / c.perPage); page++) {
        const res = await c.get<{ total_count: number; workflow_runs: GhRun[] }>(
            `repos/${repo}/actions/runs?created=${isoDay(day)}&per_page=${c.perPage}&page=${page}`,
        );
        if ((res?.total_count ?? 0) > limit) return hourRuns(c, repo, day, 23, 1);
        const last = await runsPage(c, repo, res?.workflow_runs ?? [], `${isoDay(day)} page ${page}`);
        const next = last ? { day: isoDay(day - DAY), page: 1 } : { day: isoDay(day), page: page + 1 };
        await setCursor(c.o.store, runsCursor(repo), JSON.stringify(next), c.o.now);
        if (last) return;
    }
}

/** A day's runs an hour at a time from `hour` down to midnight. ponytail: an hour past the listed limit loses its tail. */
async function hourRuns(c: Ctx, repo: string, day: number, hour: number, fromPage: number): Promise<void> {
    const limit = c.o.listedRuns ?? LISTED_RUNS;
    for (let h = hour; h >= 0; h--) {
        const hh = `${isoDay(day)}T${String(h).padStart(2, "0")}`;
        const range = encodeURIComponent(`${hh}:00:00Z..${hh}:59:59Z`);
        for (let page = h === hour ? fromPage : 1; page <= Math.ceil(limit / c.perPage); page++) {
            const res = await c.get<{ total_count: number; workflow_runs: GhRun[] }>(
                `repos/${repo}/actions/runs?created=${range}&per_page=${c.perPage}&page=${page}`,
            );
            const last = await runsPage(c, repo, res?.workflow_runs ?? [], `${hh}h page ${page}`);
            let next: RunsCursor & { day: string } = { day: isoDay(day), page: page + 1, hour: h };
            if (last) next = h > 0 ? { day: isoDay(day), page: 1, hour: h - 1 } : { day: isoDay(day - DAY), page: 1 };
            await setCursor(c.o.store, runsCursor(repo), JSON.stringify(next), c.o.now);
            if (last) break;
        }
    }
}

/** Each day's runs of each workflow in `o.repo` (a workflow lists far fewer than LISTED_RUNS a day), with their items. */
async function repairRuns(c: Ctx, days: string[], workflows: string[]): Promise<void> {
    for (const day of days)
        for (const wf of workflows)
            for (let page = 1; page <= LISTED_RUNS / c.perPage; page++) {
                const res = await c.get<{ workflow_runs: GhRun[] }>(
                    `repos/${c.o.repo}/actions/workflows/${wf}/runs?created=${day}&per_page=${c.perPage}&page=${page}`,
                );
                if (await runsPage(c, c.o.repo, res?.workflow_runs ?? [], `${wf} ${day} page ${page}`)) break;
            }
}

/** Writes one listed page of runs with their items; true when it was the query's last page. */
async function runsPage(c: Ctx, repo: string, list: GhRun[], what: string): Promise<boolean> {
    const out: RawItem[] = [];
    for (const run of list) out.push(...(await runItems(c.get, repo, run)));
    await c.write(out);
    c.r.runs += list.length;
    c.log(`${repo} ${what}: ${out.length} items, ${c.o.gh.calls} calls`);
    return list.length < c.perPage;
}

interface FlakySuite {
    checkRuns: {
        nodes: {
            databaseId: number;
            name: string;
            completedAt: string | null;
            annotations: { nodes: { message: string }[] };
        }[];
    };
}

/**
 * The flaky tests of the range, day by day from today back: each day's test-shard runs (`o.repo` only), their check
 * suites' annotations ten suites a query, each detection the live feed's row. A row already stored (the live feed's,
 * or an earlier invocation's) is left as it is. The cursor holds the next older day; a stop mid-day redoes that day.
 */
async function flakyTests(c: Ctx, first: number): Promise<void> {
    const at = await getCursor(c.o.store, FLAKY_CURSOR);
    for (let day = at ? Date.parse(at) : Math.floor(c.o.now / DAY) * DAY; day >= first; day -= DAY) {
        const runs = await shardRuns(c, day);
        const found = await runsFlaky(c, runs);
        const fresh: TestItem[] = [];
        for (const t of found) if (!(await c.o.store.get(homeKey(t)))) fresh.push(t);
        await c.write(fresh);
        c.r.flaky += fresh.length;
        c.log(`flaky ${isoDay(day)}: ${runs.length} runs, ${found.length} detections, ${fresh.length} new`);
        await setCursor(c.o.store, FLAKY_CURSOR, isoDay(day - DAY), c.o.now);
    }
}

/** One day's runs of the workflows that run test shards. */
async function shardRuns(c: Ctx, day: number): Promise<GhRun[]> {
    const runs: GhRun[] = [];
    for (let page = 1; page <= 10; page++) {
        const res = await c.get<{ workflow_runs: GhRun[] }>(
            `repos/${c.o.repo}/actions/runs?created=${isoDay(day)}&per_page=100&page=${page}`,
        );
        const list = res?.workflow_runs ?? [];
        runs.push(...list.filter((x) => SHARD_WORKFLOWS.has(workflowFile(x.path)) && x.check_suite_node_id));
        if (list.length < 100) break;
    }
    return runs;
}

/** The runs' flaky detections, ten check suites a query, one per test id. */
async function runsFlaky(c: Ctx, runs: GhRun[]): Promise<TestItem[]> {
    const found = new Map<string, TestItem>();
    for (let i = 0; i < runs.length; i += 10) {
        const batch = runs.slice(i, i + 10);
        await c.gate();
        const data = await c.o.gh.graphql<{ nodes: (FlakySuite | null)[] }>(FLAKY_SUITE_QUERY, {
            ids: batch.map((x) => x.check_suite_node_id),
        });
        for (const [k, suite] of data.nodes.entries())
            for (const t of await suiteFlaky(c, c.o.repo, batch[k], suite)) found.set(t.id, t);
    }
    return [...found.values()];
}

/** One check suite's flaky detections; a re-run's check runs get their attempt from the run's jobs (job id = check run id). */
async function suiteFlaky(c: Ctx, repo: string, run: GhRun, suite: FlakySuite | null): Promise<TestItem[]> {
    const hits = (suite?.checkRuns.nodes ?? []).flatMap((cr) =>
        cr.annotations.nodes.map((a) => ({ cr, message: a.message })),
    );
    let attempts: Map<number, number> | undefined;
    const out: TestItem[] = [];
    for (const { cr, message } of hits) {
        const probe = flakyTestItem(message, cr.name, run.id, 1, 0);
        if (!probe) continue;
        if (run.run_attempt > 1 && !attempts) {
            const jobs = await runJobs(c.get, `repos/${repo}/actions/runs/${run.id}/jobs?filter=all`);
            attempts = new Map(jobs.map((j) => [j.id, j.run_attempt]));
        }
        const attempt = attempts?.get(cr.databaseId) ?? 1;
        const seenAt = cr.completedAt ? Date.parse(cr.completedAt) : Date.parse(run.updated_at);
        out.push(flakyTestItem(message, cr.name, run.id, attempt, seenAt)!);
    }
    return out;
}

/** One run's items: every attempt (filter=all), its jobs, release and stress steps, T4 and LLM costs. */
async function runItems(
    get: <T>(path: string) => Promise<T | undefined>,
    repo: string,
    run: GhRun,
): Promise<RawItem[]> {
    const workflow = workflowFile(run.path);
    const out: RawItem[] = [toRunItem(run, repo)];
    const jobs = await runJobs(get, `repos/${repo}/actions/runs/${run.id}/jobs?filter=all`);
    for (let a = 1; a < run.run_attempt; a++) {
        const earlier = await get<GhRun>(`repos/${repo}/actions/runs/${run.id}/attempts/${a}`);
        if (earlier) out.push(toRunItem(earlier, repo));
    }
    for (const j of jobs) {
        out.push(toJobItem(j, repo, workflow, false, loadKind(run), offMaster(run)));
        if (j.status !== "completed") continue;
        if (STEP_WORKFLOWS.has(workflow)) out.push(...toStepItems(j, repo, workflow));
        const t4 = t4Cost(j, repo, rates as unknown as Rates, workflow);
        const llm = llmCost(j, repo, rates as unknown as Rates, workflow, run);
        if (t4) out.push(t4);
        if (llm) out.push(llm);
    }
    return out;
}

/** Pull requests and issues updated in the range, paged by update time. */
async function pullRequestsAndIssues(
    o: BackfillOptions,
    gate: () => Promise<void>,
    write: (out: RawItem[]) => Promise<void>,
    first: number,
): Promise<void> {
    const [owner, name] = o.repo.split("/");
    for (const [query, vars] of [
        [PR_QUERY, { withOpen: false }],
        [ISSUE_QUERY, { held: `repo:${o.repo} is:issue is:open in:title "Release held"` }],
    ] as const) {
        let cursor: string | null = null;
        for (let page = 0; page < 100; page++) {
            await gate();
            type Page = { nodes: (GqlPr & GqlIssue)[]; pageInfo: { hasNextPage: boolean; endCursor: string } };
            const data: { repository: { recent: Page } } = await o.gh.graphql(query, { owner, name, cursor, ...vars });
            const nodes = data.repository.recent.nodes.filter((x) => Date.parse(x.updatedAt) >= first);
            await write(nodes.map((x) => (query === PR_QUERY ? toPrItem(x, o.repo) : toIssueItem(x, o.repo))));
            if (nodes.length < data.repository.recent.nodes.length || !data.repository.recent.pageInfo.hasNextPage)
                break;
            cursor = data.repository.recent.pageInfo.endCursor;
        }
    }
}

/** The organization's repositories pushed to in 28 days, and `repo` always. */
export async function backfillRepos(gh: GitHub, org: string, repo: string, now: number): Promise<string[]> {
    const list =
        (await gh.rest<{ full_name: string; archived: boolean; pushed_at: string }[]>(
            `orgs/${org}/repos?per_page=100&type=all`,
        )) ?? [];
    const repos = list.filter((x) => !x.archived && now - Date.parse(x.pushed_at) <= 28 * DAY).map((x) => x.full_name);
    return repos.includes(repo) ? repos : [repo, ...repos];
}
