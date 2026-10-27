import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";

import { dynamoStore } from "../src/dynamo.ts";

const cancelled = (...codes: string[]) =>
    Object.assign(new Error("cancelled"), {
        name: "TransactionCanceledException",
        CancellationReasons: codes.map((Code) => ({ Code })),
    });

const storeWith = (send: ReturnType<typeof vi.fn>) => dynamoStore("t", { send } as unknown as DynamoDBDocumentClient);

const ops = [
    { put: { pk: "a", sk: "1", v: 1 }, condition: { field: "wid", op: "=" as const, value: "w" } },
    { delete: { pk: "b", sk: "1" } },
];

describe("dynamoStore.transact", () => {
    it("writes the ops as one transaction, each put with its own condition", async () => {
        const send = vi.fn().mockResolvedValue({});
        expect(await storeWith(send).transact(ops)).toBe(true);
        const items = send.mock.calls[0][0].input.TransactItems;
        expect(items[0].Put).toMatchObject({
            ConditionExpression: "#c = :c",
            ExpressionAttributeValues: { ":c": "w" },
        });
        expect(items[1].Delete).toEqual({ TableName: "t", Key: { pk: "b", sk: "1" } });
    });

    it("answers false when a condition failed, and retries a conflict with a concurrent write", async () => {
        expect(
            await storeWith(vi.fn().mockRejectedValue(cancelled("None", "ConditionalCheckFailed"))).transact(ops),
        ).toBe(false);
        const send = vi
            .fn()
            .mockRejectedValueOnce(cancelled("TransactionConflict", "None"))
            .mockRejectedValueOnce(cancelled("ThrottlingError", "None"))
            .mockResolvedValue({});
        expect(await storeWith(send).transact(ops)).toBe(true);
        expect(send).toHaveBeenCalledTimes(3);
    });

    it("throws a refused row as the ValidationException DynamoDB gives outside a transaction", async () => {
        const error = Object.assign(cancelled(), {
            CancellationReasons: [
                { Code: "ValidationError", Message: "Item size has exceeded the maximum allowed size" },
            ],
        });
        await expect(storeWith(vi.fn().mockRejectedValue(error)).transact(ops)).rejects.toMatchObject({
            name: "ValidationException",
            message: "Item size has exceeded the maximum allowed size",
        });
    });

    it("throws any other error", async () => {
        await expect(storeWith(vi.fn().mockRejectedValue(new Error("boom"))).transact(ops)).rejects.toThrow("boom");
    });
});
