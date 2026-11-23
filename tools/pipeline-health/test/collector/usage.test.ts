import { describe, expect, it, vi } from "vitest";

import rates from "../../config/rates.json" with { type: "json" };
import {
    allowances,
    cloudflareOverage,
    type CloudflareRate,
    cloudflareUsage,
    mergeUsage,
    type UsageDays,
    usageObservations,
} from "../../src/collector/usage.ts";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 23, 12);
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

describe("cloudflareUsage", () => {
    it("sums one GraphQL answer into per-day metrics, R2 operations by class", async () => {
        const answer = {
            data: {
                viewer: {
                    accounts: [
                        {
                            workers: [
                                {
                                    sum: { requests: 10 },
                                    dimensions: { date: "2026-11-22", scriptName: "graphty-results" },
                                },
                                {
                                    sum: { requests: 5 },
                                    dimensions: { date: "2026-11-22", scriptName: "graphty-nx-cache" },
                                },
                            ],
                            d1: [{ sum: { rowsRead: 900, rowsWritten: 7 }, dimensions: { date: "2026-11-22" } }],
                            r2ops: [
                                { sum: { requests: 3 }, dimensions: { date: "2026-11-22", actionType: "PutObject" } },
                                { sum: { requests: 4 }, dimensions: { date: "2026-11-22", actionType: "GetObject" } },
                                {
                                    sum: { requests: 9 },
                                    dimensions: { date: "2026-11-22", actionType: "DeleteObject" },
                                },
                            ],
                            r2storage: [
                                {
                                    max: { payloadSize: 100, metadataSize: 1 },
                                    dimensions: { date: "2026-11-22", bucketName: "a" },
                                },
                            ],
                        },
                    ],
                },
            },
        };
        const doFetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(answer))));
        const days = await cloudflareUsage("t", "acct", doFetch)("2026-11-21", "2026-11-23");
        expect(days["2026-11-22"]).toEqual({
            cf_requests: 15,
            "cf_requests.graphty-results": 10,
            "cf_requests.graphty-nx-cache": 5,
            cf_d1_rows_read: 900,
            cf_d1_rows_written: 7,
            cf_r2_class_a: 3,
            cf_r2_class_b: 4,
            cf_r2_storage_bytes: 101,
        });
        expect(doFetch).toHaveBeenCalledTimes(1);
    });

    it("throws on a GraphQL error, so the source turns red instead of reading zero", async () => {
        const doFetch = vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify({ data: null, errors: [{ message: "not authorized" }] }))),
        );
        await expect(cloudflareUsage("t", "a", doFetch)("2026-11-21", "2026-11-23")).rejects.toThrow(/not authorized/);
    });
});

describe("usage history", () => {
    it("keeps 36 days and lets a fresh read replace a day", () => {
        const kept: UsageDays = { [iso(NOW - 40 * DAY)]: { x: 1 }, [iso(NOW - DAY)]: { x: 1, y: 2 } };
        expect(mergeUsage(kept, { [iso(NOW - DAY)]: { x: 5 } }, NOW)).toEqual({ [iso(NOW - DAY)]: { x: 5, y: 2 } });
    });

    it("reports yesterday's value and the last 7 days' average over the 28 before", () => {
        const days: UsageDays = {};
        for (let i = 1; i <= 35; i++) {
            days[iso(NOW - i * DAY)] = { cf_requests: i <= 7 ? 300 : 100 };
        }
        const obs = Object.fromEntries(usageObservations(days, { cf_requests: 1000, other: 5 }, NOW));
        expect(obs).toEqual({
            "usage.cf_requests_share": 0.3,
            "usage.cf_requests_growth": 3,
            "cost.cloudflare_usage_share": 0.3,
        });
    });

    it("gives no growth before a week of earlier history", () => {
        const days: UsageDays = { [iso(NOW - DAY)]: { a: 1 }, [iso(NOW - 9 * DAY)]: { a: 1 } };
        expect(usageObservations(days, { aws_a: 4 }, NOW)).toEqual([]);
        const aws = { [iso(NOW - DAY)]: { aws_a: 1 }, [iso(NOW - 9 * DAY)]: { aws_a: 1 } };
        expect(usageObservations(aws, { aws_a: 4 }, NOW)).toEqual([["usage.aws_a_share", 0.25]]);
    });
});

describe("allowances", () => {
    it("scales Cloudflare's monthly allowance to a day and takes AWS's per day", () => {
        const per = allowances(
            rates.cloudflareUsage as unknown as Record<string, CloudflareRate>,
            rates.awsUsage as unknown as Record<string, { perDay: number }>,
        );
        expect(per.cf_d1_rows_read).toBeCloseTo(25e9 / 30);
        expect(per.cf_r2_storage_bytes).toBe(10e9);
        expect(per.aws_dynamo_write_units).toBe(850_000);
        expect(Object.keys(per).some((k) => k.startsWith("$"))).toBe(false);
    });
});

describe("cloudflareOverage", () => {
    const cf = rates.cloudflareUsage as unknown as Record<string, CloudflareRate>;
    const start = Date.UTC(2026, 10, 1);

    it("prices the Oct 25 to Nov 23 bill's D1 rows: 56 billion read and 62 million written", () => {
        const days: UsageDays = {};
        for (let i = 0; i < 28; i++) {
            days[iso(start + i * DAY)] = { cf_d1_rows_read: 56e9 / 28, cf_d1_rows_written: 62e6 / 28 };
        }
        const over = cloudflareOverage(days, cf, start, start + 28 * DAY);
        const total = Object.values(over).reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(31 + 12, 1);
        // Nothing until the month's allowance is used up.
        expect(over[iso(start)]).toBeUndefined();
    });

    it("charges nothing inside the plan", () => {
        const days: UsageDays = { [iso(start)]: { cf_requests: 1e6, cf_r2_class_a: 1000, cf_r2_storage_bytes: 5e9 } };
        expect(cloudflareOverage(days, cf, start, start + DAY)).toEqual({});
    });
});
