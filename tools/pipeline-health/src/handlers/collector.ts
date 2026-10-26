import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

import rates from "../../config/rates.json" with { type: "json" };
import slas from "../../config/slas.json" with { type: "json" };
import { codeBuildDeploy, costExplorerDaily, ssmGetParams } from "../collector/aws.js";
import { backfill, backfillRepos, type BackfillReport } from "../collector/backfill.js";
import { collect, type CycleReport } from "../collector/collect.js";
import { GitHub, installationToken, readAppConfig } from "../collector/github.js";
import type { Rates } from "../collector/parse.js";
import { dynamoStore } from "../dynamo.js";
import { recompute } from "../model/rollup.js";
import { recomputeAll } from "../recompute.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const getParams = ssmGetParams();
const awsCosts = costExplorerDaily();
const deploy = process.env.DEPLOY_PROJECT ? codeBuildDeploy(process.env.DEPLOY_PROJECT) : undefined;

/**
 * Runs every 5 minutes (EventBridge Scheduler). Records that it ran (the /v1/health heartbeat), runs one collector
 * cycle (design sections 10.4 and 4), then recomputes the rollups and page items. Without the GitHub App's
 * parameters in SSM it collects nothing from GitHub, and the GitHub sources stay "not set up" on Data sources.
 * @returns the time of this run and what the cycle did
 */
export function handler(event?: Record<string, never>): Promise<{ lastRun: string } & CycleReport>;
export function handler(
    event: BackfillEvent,
    context?: { getRemainingTimeInMillis(): number },
): Promise<BackfillResult>;
export async function handler(
    event?: Partial<BackfillEvent>,
    context?: { getRemainingTimeInMillis(): number },
): Promise<({ lastRun: string } & CycleReport) | BackfillResult> {
    if (event?.mode === "backfill") return runBackfill(event as BackfillEvent, context);
    const now = Date.now();
    const lastRun = new Date(now).toISOString();
    await doc.send(
        new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: { pk: "META", sk: "collector", lastRun },
        }),
    );
    const store = dynamoStore(process.env.TABLE_NAME ?? "graphty-health");
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
        deploy,
    });
    const rolled = await recomputeAll(store, Date.now());
    console.log(JSON.stringify({ lastRun, ...report, ...rolled }));
    return { lastRun, ...report };
}

/** The invocation payload of the four-week backfill (design section 10.4). */
export interface BackfillEvent {
    mode: "backfill";
    days?: number;
    perHour?: number;
}

export type BackfillResult =
    | ({ mode: "backfill"; recomputed: number; dirtyLeft: boolean } & BackfillReport)
    | { mode: "backfill"; error: "github_app_not_set_up" };

/**
 * One slice of the backfill: loads from its cursor until 90 s before the timeout, then recomputes dirty buckets
 * until 30 s before it. Invoke again while `done` is false; the scheduled collector drains what is left dirty.
 */
async function runBackfill(
    event: BackfillEvent,
    context?: { getRemainingTimeInMillis(): number },
): Promise<BackfillResult> {
    const start = Date.now();
    const end = start + (context?.getRemainingTimeInMillis() ?? 60_000);
    const app = await readAppConfig(getParams);
    if (!app) return { mode: "backfill", error: "github_app_not_set_up" };
    const gh = new GitHub(() => installationToken(app, fetch, Date.now()));
    const store = dynamoStore(process.env.TABLE_NAME ?? "graphty-health");
    const repo = "graphty-org/graphty-monorepo";
    const report = await backfill({
        store,
        gh,
        repos: await backfillRepos(gh, "graphty-org", repo, start),
        repo,
        days: Math.min(event.days ?? 28, 28),
        perHour: event.perHour ?? 2000,
        now: start,
        deadline: end - 90_000,
    });
    let recomputed = 0;
    let dirtyLeft = true;
    while (Date.now() < end - 30_000) {
        const r = await recompute(store, Date.now());
        recomputed += r.buckets;
        if (r.buckets === 0) {
            dirtyLeft = false;
            break;
        }
    }
    const out: BackfillResult = { mode: "backfill", ...report, recomputed, dirtyLeft };
    console.log(JSON.stringify(out));
    return out;
}
