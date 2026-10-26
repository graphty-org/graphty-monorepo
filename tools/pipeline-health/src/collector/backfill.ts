// The four-week backfill (design section 10.4): 28 days of runs and jobs, pull requests and issues, written
// through the same raw writers as the collector, so the range's 5-minute buckets are marked dirty and the next
// recompute rebuilds their rollups. Throttled under the GitHub App's hourly budget and resumable: a cursor per
// repository holds the last day done.
//
//   cd tools/pipeline-health && AWS_PROFILE=graphty AWS_REGION=us-east-2 pnpm run backfill [-- --days 28 --per-hour 3000]
//
// A job behind `needs:` gets its created_at when it becomes ready (sources.md section 1), so the queue wait is
// started_at - created_at for every job with no dependency arithmetic.

import { pathToFileURL } from "node:url";
import rates from "../../config/rates.json" with { type: "json" };
import { DAY, MIN, type RawItem } from "../model/items.js";
import { getCursor, putRaw, setCursor } from "../model/raw.js";
import type { Store } from "../model/store.js";
import { GitHub, installationToken, readAppConfig } from "./github.js";
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
    log?: (line: string) => void;
    sleep?: (ms: number) => Promise<void>;
}

const STEP_WORKFLOWS = new Set(["release.yml", "restricted-cpu-stress.yml"]);
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Holds the request rate under `perHour`: before each call, waits until the budget so far allows it. */
function throttle(gh: GitHub, perHour: number, started: number, sleep: (ms: number) => Promise<void>) {
    return async () => {
        const allowedAt = started + (gh.calls * 3_600_000) / perHour;
        const wait = allowedAt - Date.now();
        if (wait > 0) await sleep(wait);
    };
}

export async function backfill(o: BackfillOptions): Promise<{ runs: number; items: number; calls: number }> {
    const sleep = o.sleep ?? ((ms) => new Promise<void>((ok) => setTimeout(ok, ms)));
    const log = o.log ?? (() => undefined);
    const gate = throttle(o.gh, o.perHour, Date.now(), sleep);
    const get = async <T>(path: string) => {
        await gate();
        return o.gh.rest<T>(path);
    };
    let runs = 0;
    let items = 0;
    const first = Math.floor((o.now - o.days * DAY) / DAY) * DAY;

    for (const repo of o.repos) {
        const done = await getCursor(o.store, `backfill#${repo}`);
        for (let day = done ? Date.parse(done) + DAY : first; day < o.now; day += DAY) {
            const out: RawItem[] = [];
            for (let page = 1; page <= 10; page++) {
                const r = await get<{ total_count: number; workflow_runs: GhRun[] }>(
                    `repos/${repo}/actions/runs?created=${isoDay(day)}&per_page=100&page=${page}`,
                );
                const list = r?.workflow_runs ?? [];
                for (const run of list) {
                    out.push(...(await runItems(get, repo, run)));
                    runs++;
                }
                // ponytail: GitHub answers at most 1,000 runs per query; a day past that loses its tail.
                if (list.length < 100) break;
            }
            await putRaw(o.store, out, o.now);
            items += out.length;
            // Days not yet over are loaded again next time; the collector covers them meanwhile.
            if (day + DAY <= o.now - 30 * MIN) await setCursor(o.store, `backfill#${repo}`, isoDay(day), o.now);
            log(`${repo} ${isoDay(day)}: ${out.length} items, ${o.gh.calls} calls`);
        }
    }
    items += await pullRequestsAndIssues(o, gate, first);
    return { runs, items, calls: o.gh.calls };
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
async function pullRequestsAndIssues(o: BackfillOptions, gate: () => Promise<void>, first: number): Promise<number> {
    const [owner, name] = o.repo.split("/");
    let n = 0;
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
            const out = nodes.map((x) => (query === PR_QUERY ? toPrItem(x, o.repo) : toIssueItem(x, o.repo)));
            await putRaw(o.store, out, o.now);
            n += out.length;
            if (nodes.length < data.repository.recent.nodes.length || !data.repository.recent.pageInfo.hasNextPage)
                break;
            cursor = data.repository.recent.pageInfo.endCursor;
        }
    }
    return n;
}

async function main() {
    const { DynamoStore, ssmGetParams } = await import("./aws.js");
    const arg = (name: string, d: number) => {
        const i = process.argv.indexOf(`--${name}`);
        return i > 0 ? Number(process.argv[i + 1]) : d;
    };
    const app = await readAppConfig(ssmGetParams());
    if (!app) {
        console.error("The collector's GitHub App is not set up (no /graphty-health/github-app/* parameters in SSM).");
        process.exit(2);
    }
    const gh = new GitHub(() => installationToken(app, fetch, Date.now()));
    const store = new DynamoStore(process.env.TABLE_NAME ?? "graphty-health");
    const repos = (
        (await gh.rest<{ full_name: string; archived: boolean; pushed_at: string }[]>(
            "orgs/graphty-org/repos?per_page=100&type=all",
        )) ?? []
    )
        .filter((r) => !r.archived && Date.now() - Date.parse(r.pushed_at) <= 28 * DAY)
        .map((r) => r.full_name);
    const r = await backfill({
        store,
        gh,
        repos,
        repo: "graphty-org/graphty-monorepo",
        days: arg("days", 28),
        perHour: arg("per-hour", 3000),
        now: Date.now(),
        log: (l) => console.log(l),
    });
    console.log(JSON.stringify(r));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
