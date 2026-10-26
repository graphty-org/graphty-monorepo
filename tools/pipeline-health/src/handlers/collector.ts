import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

import rates from "../../config/rates.json" with { type: "json" };
import slas from "../../config/slas.json" with { type: "json" };
import { costExplorerDaily, ssmGetParams } from "../collector/aws.js";
import { collect, type CycleReport } from "../collector/collect.js";
import { GitHub, installationToken, readAppConfig } from "../collector/github.js";
import type { Rates } from "../collector/parse.js";
import { dynamoStore } from "../dynamo.js";
import { recomputeAll } from "../recompute.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const getParams = ssmGetParams();
const awsCosts = costExplorerDaily();

/**
 * Runs every 5 minutes (EventBridge Scheduler). Records that it ran (the /v1/health heartbeat), runs one collector
 * cycle (design sections 10.4 and 4), then recomputes the rollups and page items. Without the GitHub App's
 * parameters in SSM it collects nothing from GitHub, and the GitHub sources stay "not set up" on Data sources.
 * @returns the time of this run and what the cycle did
 */
export async function handler(): Promise<{ lastRun: string } & CycleReport> {
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
    });
    const rolled = await recomputeAll(store, Date.now());
    console.log(JSON.stringify({ lastRun, ...report, ...rolled }));
    return { lastRun, ...report };
}
