import rates from "../../config/rates.json" with { type: "json" };
import slas from "../../config/slas.json" with { type: "json" };
import { costExplorerDaily, DynamoStore, ssmGetParams } from "../collector/aws.js";
import { collect, type CycleReport } from "../collector/collect.js";
import { GitHub, installationToken, readAppConfig } from "../collector/github.js";
import type { Rates } from "../collector/parse.js";

const store = new DynamoStore(process.env.TABLE_NAME ?? "graphty-health");
const getParams = ssmGetParams();
const awsCosts = costExplorerDaily();

/**
 * Runs every 5 minutes (EventBridge Scheduler). Records that it ran (the /v1/health heartbeat), then one collector
 * cycle (design sections 10.4 and 4). Without the GitHub App's parameters in SSM it collects nothing from GitHub,
 * and the GitHub sources stay "not set up" on the Data sources page.
 * @returns the time of this run and what the cycle did
 */
export async function handler(): Promise<{ lastRun: string } & CycleReport> {
    const now = Date.now();
    const lastRun = new Date(now).toISOString();
    await store.put({ pk: "META", sk: "collector", lastRun });
    const app = await readAppConfig(getParams);
    const gh = app ? new GitHub(() => installationToken(app, fetch, Date.now())) : undefined;
    const report = await collect({
        store,
        now,
        gh,
        fetch,
        awsCosts,
        rates: rates as unknown as Rates,
        limits: slas.runnerLimits,
        org: "graphty-org",
        repo: "graphty-org/graphty-monorepo",
    });
    // Recomputing the dirty buckets, the page items and the alerts follows here (src/recompute.ts).
    console.log(JSON.stringify({ lastRun, ...report }));
    return { lastRun, ...report };
}
