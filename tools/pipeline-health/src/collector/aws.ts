// The AWS side of the collector: the model's Store over the DynamoDB table, SSM parameters and Cost Explorer.

import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    BatchWriteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
    type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { BatchOp, Change, Condition, Item, Key, Store } from "../model/store.js";

const isConditionFailed = (e: unknown) => (e as { name?: string }).name === "ConditionalCheckFailedException";

function conditionExpr(c: Condition | undefined, names: Record<string, string>, values: Record<string, unknown>) {
    if (!c) return undefined;
    if ("notExists" in c) {
        names["#pk"] = "pk";
        return "attribute_not_exists(#pk)";
    }
    names["#cf"] = c.field;
    values[":cv"] = c.value;
    const cmp = `#cf ${c.op === "=" ? "=" : c.op} :cv`;
    return c.orNotExists ? `(attribute_not_exists(#cf) OR ${cmp})` : cmp;
}

/** The model's Store over the single table (strongly consistent reads, BatchWriteItem in chunks of 25). */
export class DynamoStore implements Store {
    private readonly doc: DynamoDBDocumentClient;
    private readonly table: string;

    constructor(table: string, client = new DynamoDBClient({})) {
        this.table = table;
        this.doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    }

    async get(key: Key) {
        const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: key, ConsistentRead: true }));
        return r.Item as Item | undefined;
    }

    async put(item: Item, condition?: Condition) {
        const names: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        const expr = conditionExpr(condition, names, values);
        try {
            await this.doc.send(
                new PutCommand({
                    TableName: this.table,
                    Item: item,
                    ...(expr
                        ? {
                              ConditionExpression: expr,
                              ExpressionAttributeNames: names,
                              ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
                          }
                        : {}),
                }),
            );
            return true;
        } catch (e) {
            if (isConditionFailed(e)) return false;
            throw e;
        }
    }

    async query(pk: string, range: { from?: string; to?: string } = {}) {
        const values: Record<string, unknown> = { ":pk": pk };
        let cond = "pk = :pk";
        if (range.from !== undefined && range.to !== undefined) {
            cond += " AND sk BETWEEN :f AND :t";
            values[":f"] = range.from;
            values[":t"] = range.to;
        } else if (range.from !== undefined) {
            cond += " AND sk >= :f";
            values[":f"] = range.from;
        } else if (range.to !== undefined) {
            cond += " AND sk <= :t";
            values[":t"] = range.to;
        }
        const out: Item[] = [];
        let start: QueryCommandInput["ExclusiveStartKey"];
        do {
            const r = await this.doc.send(
                new QueryCommand({
                    TableName: this.table,
                    KeyConditionExpression: cond,
                    ExpressionAttributeValues: values,
                    ConsistentRead: true,
                    ExclusiveStartKey: start,
                }),
            );
            out.push(...((r.Items ?? []) as Item[]));
            start = r.LastEvaluatedKey;
        } while (start);
        return out;
    }

    async update(key: Key, change: Change, condition?: Condition) {
        const names: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        const sets = Object.entries(change.set ?? {}).map(([f, v], i) => {
            names[`#s${i}`] = f;
            values[`:s${i}`] = v;
            return `#s${i} = :s${i}`;
        });
        const adds = Object.entries(change.add ?? {}).map(([f, v], i) => {
            names[`#a${i}`] = f;
            values[`:a${i}`] = v;
            return `#a${i} :a${i}`;
        });
        const expr = conditionExpr(condition, names, values);
        const update = [sets.length ? `SET ${sets.join(", ")}` : "", adds.length ? `ADD ${adds.join(", ")}` : ""]
            .filter(Boolean)
            .join(" ");
        try {
            const r = await this.doc.send(
                new UpdateCommand({
                    TableName: this.table,
                    Key: key,
                    UpdateExpression: update,
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ...(expr ? { ConditionExpression: expr } : {}),
                    ReturnValues: "ALL_NEW",
                }),
            );
            return r.Attributes as Item;
        } catch (e) {
            if (isConditionFailed(e)) return undefined;
            throw e;
        }
    }

    async batch(ops: BatchOp[]) {
        for (let i = 0; i < ops.length; i += 25) {
            let requests = ops
                .slice(i, i + 25)
                .map((op) => ("put" in op ? { PutRequest: { Item: op.put } } : { DeleteRequest: { Key: op.delete } }));
            for (let tries = 0; requests.length; tries++) {
                if (tries > 8) throw new Error("DynamoDB kept unprocessed items");
                const r = await this.doc.send(new BatchWriteCommand({ RequestItems: { [this.table]: requests } }));
                requests = (r.UnprocessedItems?.[this.table] ?? []) as typeof requests;
                if (requests.length) await new Promise((ok) => setTimeout(ok, 50 * 2 ** tries));
            }
        }
    }
}

/** SecureString parameters by name; missing ones are absent from the result. */
export function ssmGetParams(client = new SSMClient({})) {
    return async (names: string[]): Promise<Record<string, string>> => {
        const r = await client.send(new GetParametersCommand({ Names: names, WithDecryption: true }));
        return Object.fromEntries((r.Parameters ?? []).flatMap((p) => (p.Name && p.Value ? [[p.Name, p.Value]] : [])));
    };
}

/** Daily unblended cost of the account from `from` (inclusive) to `to` (exclusive), ISO days. Cost Explorer lives in us-east-1. */
export function costExplorerDaily(client = new CostExplorerClient({ region: "us-east-1" })) {
    return async (from: string, to: string): Promise<{ day: string; usd: number }[]> => {
        const out: { day: string; usd: number }[] = [];
        let token: string | undefined;
        do {
            const r = await client.send(
                new GetCostAndUsageCommand({
                    TimePeriod: { Start: from, End: to },
                    Granularity: "DAILY",
                    Metrics: ["UnblendedCost"],
                    NextPageToken: token,
                }),
            );
            for (const t of r.ResultsByTime ?? [])
                if (t.TimePeriod?.Start)
                    out.push({ day: t.TimePeriod.Start, usd: Number(t.Total?.UnblendedCost?.Amount ?? 0) });
            token = r.NextPageToken;
        } while (token);
        return out;
    };
}
