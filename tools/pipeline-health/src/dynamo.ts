// The model's Store (src/model/store.ts) over the single DynamoDB table `graphty-health`: strongly consistent reads,
// paginated queries, conditional puts and updates, and batches chunked into BatchWriteItem calls of 25.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    BatchWriteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    TransactWriteCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import type { BatchOp, Change, Condition, Item, Key, Store, TransactOp } from "./model/store.js";

const failed = (error: unknown): boolean => (error as { name?: string }).name === "ConditionalCheckFailedException";

function conditionOf(
    c: Condition | undefined,
    names: Record<string, string>,
    values: Record<string, unknown>,
): string | undefined {
    if (!c) {
        return undefined;
    }
    if ("notExists" in c) {
        return "attribute_not_exists(pk)";
    }
    names["#c"] = c.field;
    values[":c"] = c.value;
    const op = c.op === "=" ? "=" : c.op;
    return c.orNotExists ? `(#c ${op} :c OR attribute_not_exists(#c))` : `#c ${op} :c`;
}

const RETRY = new Set(["TransactionConflict", "ThrottlingError", "ProvisionedThroughputExceeded"]);
const keyOf = (k: Key): Key => ({ pk: k.pk, sk: k.sk });
const idOf = (k: Key): string => `${k.pk}\u0000${k.sk}`;

/**
 * The store over one table.
 * @param tableName - the DynamoDB table
 * @param client - a document client (tests pass their own)
 * @returns the store
 */
export function dynamoStore(
    tableName: string,
    client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
        marshallOptions: { removeUndefinedValues: true },
    }),
): Store {
    return {
        async get(key) {
            const r = await client.send(
                new GetCommand({ TableName: tableName, Key: keyOf(key), ConsistentRead: true }),
            );
            return r.Item as Item | undefined;
        },

        async put(item, condition) {
            const names: Record<string, string> = {};
            const values: Record<string, unknown> = {};
            const expr = conditionOf(condition, names, values);
            try {
                await client.send(
                    new PutCommand({
                        TableName: tableName,
                        Item: item,
                        ...(expr
                            ? {
                                  ConditionExpression: expr,
                                  ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
                                  ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
                              }
                            : {}),
                    }),
                );
                return true;
            } catch (error) {
                if (failed(error)) {
                    return false;
                }
                throw error;
            }
        },

        async query(pk, range = {}) {
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
            let start: Record<string, unknown> | undefined;
            do {
                const r = await client.send(
                    new QueryCommand({
                        TableName: tableName,
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
        },

        async update(key, change: Change, condition) {
            const names: Record<string, string> = {};
            const values: Record<string, unknown> = {};
            const parts: string[] = [];
            const add = Object.entries(change.add ?? {});
            const set = Object.entries(change.set ?? {});
            add.forEach(([f, n], i) => {
                names[`#a${i}`] = f;
                values[`:a${i}`] = n;
            });
            set.forEach(([f, v], i) => {
                names[`#s${i}`] = f;
                values[`:s${i}`] = v;
            });
            if (set.length) {
                parts.push(`SET ${set.map((_, i) => `#s${i} = :s${i}`).join(", ")}`);
            }
            if (add.length) {
                parts.push(`ADD ${add.map((_, i) => `#a${i} :a${i}`).join(", ")}`);
            }
            const expr = conditionOf(condition, names, values);
            try {
                const r = await client.send(
                    new UpdateCommand({
                        TableName: tableName,
                        Key: keyOf(key),
                        UpdateExpression: parts.join(" "),
                        ...(expr ? { ConditionExpression: expr } : {}),
                        ExpressionAttributeNames: names,
                        ExpressionAttributeValues: values,
                        ReturnValues: "ALL_NEW",
                    }),
                );
                return r.Attributes as Item;
            } catch (error) {
                if (failed(error)) {
                    return undefined;
                }
                throw error;
            }
        },

        async batch(ops: BatchOp[]) {
            // BatchWriteItem refuses two ops on one key: the last one wins, as the ops would apply in order.
            const last = new Map<string, BatchOp>();
            for (const op of ops) {
                const id = idOf("put" in op ? op.put : op.delete);
                last.delete(id);
                last.set(id, op);
            }
            const all = [...last.values()].map((op) =>
                "put" in op ? { PutRequest: { Item: op.put } } : { DeleteRequest: { Key: keyOf(op.delete) } },
            );
            const write = async (chunk: typeof all): Promise<void> => {
                let pending: typeof all | undefined = chunk;
                for (let tries = 0; pending?.length; tries++) {
                    if (tries === 8) {
                        throw new Error(`batch write: ${pending.length} items unprocessed`);
                    }
                    if (tries) {
                        await new Promise((r) => setTimeout(r, 50 * 2 ** tries));
                    }
                    const r = await client.send(new BatchWriteCommand({ RequestItems: { [tableName]: pending } }));
                    pending = r.UnprocessedItems?.[tableName] as typeof all | undefined;
                }
            };
            // Eight BatchWriteItem calls at a time (ops on one key are already merged above).
            for (let i = 0; i < all.length; i += 200) {
                const group: Promise<void>[] = [];
                for (let j = i; j < Math.min(i + 200, all.length); j += 25) {
                    group.push(write(all.slice(j, j + 25)));
                }
                await Promise.all(group);
            }
        },

        async transact(ops: TransactOp[]) {
            // A transaction refuses two ops on one key: the last one wins, as in batch().
            const last = new Map<string, TransactOp>();
            for (const op of ops) {
                const id = idOf("put" in op ? op.put : op.delete);
                last.delete(id);
                last.set(id, op);
            }
            const items = [...last.values()].map((op) => {
                if (!("put" in op)) {
                    return { Delete: { TableName: tableName, Key: keyOf(op.delete) } };
                }
                const names: Record<string, string> = {};
                const values: Record<string, unknown> = {};
                const expr = conditionOf(op.condition, names, values);
                return {
                    Put: {
                        TableName: tableName,
                        Item: op.put,
                        ...(expr
                            ? {
                                  ConditionExpression: expr,
                                  ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
                                  ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
                              }
                            : {}),
                    },
                };
            });
            // A concurrent write to one of the keys, or throttling, cancels the transaction: try again.
            for (let tries = 0; ; tries++) {
                try {
                    await client.send(new TransactWriteCommand({ TransactItems: items }));
                    return true;
                } catch (error) {
                    const reasons =
                        (error as { CancellationReasons?: { Code?: string; Message?: string }[] })
                            .CancellationReasons ?? [];
                    if (reasons.some((r) => r.Code === "ConditionalCheckFailed")) {
                        return false;
                    }
                    // A row DynamoDB refuses (over a size limit) answers as it does outside a transaction.
                    const invalid = reasons.find((r) => r.Code === "ValidationError");
                    if (invalid) {
                        throw Object.assign(new Error(invalid.Message), { name: "ValidationException" });
                    }
                    if (tries === 4 || !reasons.some((r) => RETRY.has(r.Code ?? ""))) {
                        throw error;
                    }
                    await new Promise((r) => setTimeout(r, 50 * 2 ** tries));
                }
            }
        },
    };
}
