import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

import { dynamoStore } from "../dynamo.js";
import { recomputeAll } from "../recompute.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Runs every 5 minutes (EventBridge Scheduler). For now it only records that it ran, which keeps
 * the dead-man alarm OK; collection, rollups and alerts follow (design sections 10.4 and 13).
 * @returns the time of this run
 */
export async function handler(): Promise<{ lastRun: string }> {
    const lastRun = new Date().toISOString();
    await doc.send(
        new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: { pk: "META", sk: "collector", lastRun },
        }),
    );
    await recomputeAll(dynamoStore(process.env.TABLE_NAME ?? "graphty-health"), Date.now());
    return { lastRun };
}
