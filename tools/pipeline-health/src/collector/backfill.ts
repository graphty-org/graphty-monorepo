// The four-week backfill (design section 10.4): 28 days of runs and jobs, pull requests and issues, written
// through the same raw writers as the collector, so the range's 5-minute buckets are marked dirty and recompute
// rebuilds their rollups. Throttled under the GitHub App's hourly budget and a share of the daily write budget, and
// resumable: a cursor per repository holds the next day and page, so a timeout or a second run continues there.
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
import { DAILY_ROW_LIMIT, DAY, MIN, type RawItem } from "../model/items.js";
import { getCursor, putRaw, setCursor, takeQuota } from "../model/raw.js";
import type { Store } from "../model/store.js";
import type { GitHub } from "./github.js";
import {
    llmCost,
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
import { ISSUE_QUERY, PR_QUERY } from "./queries.js";

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
    log?: (line: string) => void;
    sleep?: (ms: number) => Promise<void>;
    /** The clock the throttle and the deadline read (tests pass a fake one). */
    clock?: () => number;
}

export interface BackfillReport {
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

class Stop extends Error {
    readonly why: NonNullable<BackfillReport["stopped"]>;
    constructor(why: NonNullable<BackfillReport["stopped"]>) {
        super(why);
        this.why = why;
    }
}

/** The next day and page to load, from the repository's cursor; a missing cursor starts at the range's first day. */
async function position(store: Store, repo: string, first: number): Promise<{ day: number; page: number }> {
    const raw = await getCursor(store, `backfill#${repo}`);
    try {
        const c = raw ? (JSON.parse(raw) as { day: string; page: number }) : undefined;
        if (c) return { day: Math.max(first, Date.parse(c.day)), page: c.page };
    } catch {
        // an unreadable cursor: start over (every write is idempotent)
    }
    return { day: first, page: 1 };
}

export async function backfill(o: BackfillOptions): Promise<BackfillReport> {
    const sleep = o.sleep ?? ((ms) => new Promise<void>((ok) => setTimeout(ok, ms)));
    const clock = o.clock ?? Date.now;
    const log = o.log ?? (() => undefined);
    const perPage = o.perPage ?? 25;
    const started = clock();
    const calls0 = o.gh.calls;
    const r: BackfillReport = { runs: 0, items: 0, calls: 0, done: false };
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
        await putRaw(o.store, out, o.now);
        r.items += out.length;
    };
    const first = Math.floor((o.now - o.days * DAY) / DAY) * DAY;

    try {
        const ctx: Ctx = { o, perPage, get, write, r, log };
        for (const repo of o.repos) await repoRuns(ctx, repo, first);
        if ((await getCursor(o.store, PRS_CURSOR)) !== "done") {
            await pullRequestsAndIssues(o, gate, write, first);
            await setCursor(o.store, PRS_CURSOR, "done", o.now);
        }
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
    get: <T>(path: string) => Promise<T | undefined>;
    write: (out: RawItem[]) => Promise<void>;
    r: BackfillReport;
    log: (line: string) => void;
}

/** One repository's runs, day by day from its cursor. */
async function repoRuns(c: Ctx, repo: string, first: number): Promise<void> {
    const at = await position(c.o.store, repo, first);
    for (let day = at.day; day < c.o.now; day += DAY) await dayRuns(c, repo, day, day === at.day ? at.page : 1);
}

/** One day's runs, a page at a time from `fromPage`; the cursor moves after each page of a day that is over. */
async function dayRuns(c: Ctx, repo: string, day: number, fromPage: number): Promise<void> {
    // A day not yet over gains runs, which shifts its pages: it is never recorded as done.
    const closed = day + DAY <= c.o.now - 30 * MIN;
    // ponytail: GitHub answers at most 1,000 runs per query; a day past that loses its tail.
    for (let page = fromPage; page <= Math.ceil(1000 / c.perPage); page++) {
        const res = await c.get<{ total_count: number; workflow_runs: GhRun[] }>(
            `repos/${repo}/actions/runs?created=${isoDay(day)}&per_page=${c.perPage}&page=${page}`,
        );
        const list = res?.workflow_runs ?? [];
        const out: RawItem[] = [];
        for (const run of list) out.push(...(await runItems(c.get, repo, run)));
        await c.write(out);
        c.r.runs += list.length;
        c.log(`${repo} ${isoDay(day)} page ${page}: ${out.length} items, ${c.o.gh.calls} calls`);
        const last = list.length < c.perPage;
        const next = last ? { day: isoDay(day + DAY), page: 1 } : { day: isoDay(day), page: page + 1 };
        if (closed) await setCursor(c.o.store, `backfill#${repo}`, JSON.stringify(next), c.o.now);
        if (last) return;
    }
}

/** One run's items: every attempt (filter=all), its jobs, release and stress steps, T4 and LLM costs. */
async function runItems(
    get: <T>(path: string) => Promise<T | undefined>,
    repo: string,
    run: GhRun,
): Promise<RawItem[]> {
    const workflow = workflowFile(run.path);
    const out: RawItem[] = [toRunItem(run, repo)];
    const jobs: GhJob[] = [];
    for (let page = 1; page <= 5; page++) {
        const r = await get<{ total_count: number; jobs: GhJob[] }>(
            `repos/${repo}/actions/runs/${run.id}/jobs?filter=all&per_page=100&page=${page}`,
        );
        jobs.push(...(r?.jobs ?? []));
        if (!r || jobs.length >= r.total_count || !r.jobs.length) break;
    }
    for (let a = 1; a < run.run_attempt; a++) {
        const earlier = await get<GhRun>(`repos/${repo}/actions/runs/${run.id}/attempts/${a}`);
        if (earlier) out.push(toRunItem(earlier, repo));
    }
    for (const j of jobs) {
        out.push(toJobItem(j, repo, workflow));
        if (j.status !== "completed") continue;
        if (STEP_WORKFLOWS.has(workflow)) out.push(...toStepItems(j, repo, workflow));
        const t4 = t4Cost(j, repo, rates as unknown as Rates);
        const llm = llmCost(j, repo, rates as unknown as Rates);
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
