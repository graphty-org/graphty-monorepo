// Measured cloud usage (not billing): Cloudflare's GraphQL analytics (Worker requests by script, D1 rows, R2
// operations and storage) and CloudWatch (the table's consumed capacity, Lambda invocations, the API's requests), by
// UTC day. The collector keeps 36 days of them in the `usage` cursor and reports yesterday's value of each metric and
// its growth (the last 7 days' average over the 28 before); config/slas.json judges them against each plan's
// included amount scaled to a day. The Cloudflare overage priced from them is the Cloudflare money line's usage part.

import { CloudWatchClient, GetMetricDataCommand, type MetricDataQuery } from "@aws-sdk/client-cloudwatch";

import { DAY } from "../model/items.js";
import type { Fetch } from "./github.js";

export const CLOUDFLARE_PARAMS = {
    token: "/graphty-health/cloudflare/token",
    account: "/graphty-health/cloudflare/account-id",
};

/** ISO day -> metric -> that day's value. */
export type UsageDays = Record<string, Record<string, number>>;
/** Usage for the ISO days from `from` to `to`, both included. */
export type UsageReader = (from: string, to: string) => Promise<UsageDays>;

const add = (days: UsageDays, day: string, metric: string, n: number): void => {
    const d = (days[day] ??= {});
    d[metric] = (d[metric] ?? 0) + n;
};

// R2's Class B operations (read-like) and its free ones; every other action is Class A
// (https://developers.cloudflare.com/r2/pricing/).
const R2_CLASS_B = new Set([
    "HeadBucket",
    "HeadObject",
    "GetObject",
    "UsageSummary",
    "GetBucketEncryption",
    "GetBucketLocation",
    "GetBucketCors",
    "GetBucketLifecycleConfiguration",
]);
const R2_FREE = new Set(["DeleteObject", "DeleteBucket", "AbortMultipartUpload", "DeleteObjects"]);

const CF_QUERY = `query Usage($account: string!, $from: Date!, $to: Date!, $start: Time!, $end: Time!) {
  viewer { accounts(filter: { accountTag: $account }) {
    workers: workersInvocationsAdaptive(limit: 10000, filter: { date_geq: $from, date_leq: $to }) {
      sum { requests } dimensions { date scriptName } }
    d1: d1AnalyticsAdaptiveGroups(limit: 10000, filter: { date_geq: $from, date_leq: $to }) {
      sum { rowsRead rowsWritten } dimensions { date } }
    r2ops: r2OperationsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $start, datetime_leq: $end }) {
      sum { requests } dimensions { date actionType } }
    r2storage: r2StorageAdaptiveGroups(limit: 10000, filter: { datetime_geq: $start, datetime_leq: $end }) {
      max { payloadSize metadataSize } dimensions { date bucketName } }
  } }
}`;

interface CfGroup {
    sum?: Record<string, number>;
    max?: Record<string, number>;
    dimensions: Record<string, string>;
}

/**
 * Cloudflare's usage by day: one GraphQL call. The token needs Account Analytics: Read.
 * @param token - the read-only API token
 * @param account - the account id
 * @param doFetch - the fetch to call the API with
 * @returns the reader
 */
export function cloudflareUsage(token: string, account: string, doFetch: Fetch = fetch): UsageReader {
    return async (from, to) => {
        const res = await doFetch("https://api.cloudflare.com/client/v4/graphql", {
            method: "POST",
            headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify({
                query: CF_QUERY,
                variables: { account, from, to, start: `${from}T00:00:00Z`, end: `${to}T23:59:59Z` },
            }),
        });
        if (!res.ok) {
            throw new Error(`Cloudflare GraphQL: HTTP ${res.status}`);
        }
        const body = (await res.json()) as {
            data?: { viewer?: { accounts?: Record<string, CfGroup[]>[] } };
            errors?: { message: string }[] | null;
        };
        if (body.errors?.length) {
            throw new Error(`Cloudflare GraphQL: ${body.errors.map((e) => e.message).join("; ")}`);
        }
        const a = body.data?.viewer?.accounts?.[0] ?? {};
        const days: UsageDays = {};
        for (const g of a.workers ?? []) {
            const n = g.sum?.requests ?? 0;
            add(days, g.dimensions.date, "cf_requests", n);
            add(days, g.dimensions.date, `cf_requests.${g.dimensions.scriptName}`, n);
        }
        for (const g of a.d1 ?? []) {
            add(days, g.dimensions.date, "cf_d1_rows_read", g.sum?.rowsRead ?? 0);
            add(days, g.dimensions.date, "cf_d1_rows_written", g.sum?.rowsWritten ?? 0);
        }
        for (const g of a.r2ops ?? []) {
            const action = g.dimensions.actionType;
            if (!R2_FREE.has(action)) {
                add(
                    days,
                    g.dimensions.date,
                    R2_CLASS_B.has(action) ? "cf_r2_class_b" : "cf_r2_class_a",
                    g.sum?.requests ?? 0,
                );
            }
        }
        // Storage is a stock: each bucket's largest size that day, summed over the buckets.
        for (const g of a.r2storage ?? []) {
            add(days, g.dimensions.date, "cf_r2_storage_bytes", (g.max?.payloadSize ?? 0) + (g.max?.metadataSize ?? 0));
        }
        return days;
    };
}

/**
 * The AWS side's usage by day from CloudWatch: one GetMetricData call.
 * @param table - the DynamoDB table
 * @param apiId - the HTTP API's id, or undefined to leave its requests out
 * @param client - the CloudWatch client
 * @returns the reader
 */
export function cloudWatchUsage(
    table: string,
    apiId: string | undefined,
    client = new CloudWatchClient({}),
): UsageReader {
    const q = (id: string, ns: string, name: string, dims: Record<string, string>): MetricDataQuery => ({
        Id: id,
        MetricStat: {
            Metric: {
                Namespace: ns,
                MetricName: name,
                Dimensions: Object.entries(dims).map(([Name, Value]) => ({ Name, Value })),
            },
            Period: 86_400,
            Stat: "Sum",
        },
    });
    const queries: [string, MetricDataQuery][] = [
        ["aws_dynamo_read_units", q("r", "AWS/DynamoDB", "ConsumedReadCapacityUnits", { TableName: table })],
        ["aws_dynamo_write_units", q("w", "AWS/DynamoDB", "ConsumedWriteCapacityUnits", { TableName: table })],
        // No dimension: every Lambda of the account (only this stack's live here, see COST_TAG in health-stack.ts).
        ["aws_lambda_invocations", q("l", "AWS/Lambda", "Invocations", {})],
        ...(apiId
            ? [["aws_api_requests", q("a", "AWS/ApiGateway", "Count", { ApiId: apiId })] as [string, MetricDataQuery]]
            : []),
    ];
    return async (from, to) => {
        const days: UsageDays = {};
        let token: string | undefined;
        do {
            const r = await client.send(
                new GetMetricDataCommand({
                    StartTime: new Date(`${from}T00:00:00Z`),
                    EndTime: new Date(Date.parse(`${to}T00:00:00Z`) + DAY),
                    MetricDataQueries: queries.map(([, x]) => x),
                    NextToken: token,
                }),
            );
            for (const res of r.MetricDataResults ?? []) {
                const metric = queries.find(([, x]) => x.Id === res.Id)?.[0];
                (res.Timestamps ?? []).forEach((t, i) => {
                    if (metric) {
                        add(days, t.toISOString().slice(0, 10), metric, res.Values?.[i] ?? 0);
                    }
                });
            }
            token = r.NextToken;
        } while (token);
        return days;
    };
}

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Merges fresh days into the kept history (a fresh day replaces the kept one: analytics settle late) and drops days
 * over 36 days old.
 * @param kept - the stored history
 * @param fresh - days just read
 * @param now - current time
 * @returns the merged history
 */
export function mergeUsage(kept: UsageDays, fresh: UsageDays, now: number): UsageDays {
    const oldest = isoDay(now - 36 * DAY);
    const out: UsageDays = {};
    for (const [d, v] of Object.entries(kept)) {
        if (d >= oldest) {
            out[d] = v;
        }
    }
    for (const [d, v] of Object.entries(fresh)) {
        if (d >= oldest) {
            out[d] = { ...out[d], ...v };
        }
    }
    return out;
}

/**
 * Each usage metric's daily allowance: Cloudflare's included monthly amount over 30 (a stock: its included GB, in
 * bytes), and AWS's `perDay` (config/rates.json awsUsage).
 * @param cloudflare - rates.cloudflareUsage
 * @param aws - rates.awsUsage
 * @returns metric -> allowance per day
 */
export function allowances(
    cloudflare: Record<string, CloudflareRate> = {},
    aws: Record<string, { perDay: number }> = {},
): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [m, r] of Object.entries(cloudflare)) {
        if (!m.startsWith("$")) {
            out[m] = r.stock ? r.included * 1e9 : r.included / 30;
        }
    }
    for (const [m, r] of Object.entries(aws)) {
        if (!m.startsWith("$")) {
            out[m] = r.perDay;
        }
    }
    return out;
}

/**
 * For every metric with an allowance that yesterday has: yesterday's value as a share of its daily allowance
 * (usage.<metric>_share), and its growth, the last 7 days' average over the 28 days' before (usage.<metric>_growth,
 * once 7 of those have data and their average is above 0). Also cost.cloudflare_usage_share, the largest Cloudflare
 * share.
 * @param days - the usage history
 * @param allowance - metric -> allowance per day (allowances())
 * @param now - current time
 * @returns observation metric names and values
 */
export function usageObservations(days: UsageDays, allowance: Record<string, number>, now: number): [string, number][] {
    const today = Math.floor(now / DAY) * DAY;
    const yesterday = days[isoDay(today - DAY)] ?? {};
    const avg = (metric: string, from: number, n: number): { mean: number; have: number } => {
        let sum = 0;
        let have = 0;
        for (let i = 0; i < n; i++) {
            const v = days[isoDay(today - (from + i) * DAY)]?.[metric];
            if (v !== undefined) {
                sum += v;
                have++;
            }
        }
        return { mean: have ? sum / have : 0, have };
    };
    const out: [string, number][] = [];
    let cloudflare: number | undefined;
    for (const [metric, per] of Object.entries(allowance)) {
        const value = yesterday[metric];
        if (value === undefined || per <= 0) {
            continue;
        }
        out.push([`usage.${metric}_share`, value / per]);
        if (metric.startsWith("cf_")) {
            cloudflare = Math.max(cloudflare ?? 0, value / per);
        }
        const recent = avg(metric, 1, 7);
        const prior = avg(metric, 8, 28);
        if (recent.have && prior.have >= 7 && prior.mean > 0) {
            out.push([`usage.${metric}_growth`, recent.mean / prior.mean]);
        }
    }
    if (cloudflare !== undefined) {
        out.push(["cost.cloudflare_usage_share", cloudflare]);
    }
    return out;
}

/** What a Cloudflare metric costs past the Workers Paid plan's monthly allowance (config/rates.json). */
export interface CloudflareRate {
    /** Included per month: units, or GB-months for a stock in bytes. */
    included: number;
    /** USD per million units past it, or per GB-month for a stock. */
    usd: number;
    /** A stock in bytes, billed by GB-month (the month's average). */
    stock?: boolean;
}

/**
 * The Cloudflare overage each day of the month adds: the month's cumulative overage through that day less through
 * the day before, so the days sum to what the month's bill charges past the plan so far.
 * @param days - the usage history
 * @param rates - metric -> its rate
 * @param monthStart - the month's first day, epoch ms
 * @param now - current time
 * @returns ISO day -> USD
 */
export function cloudflareOverage(
    days: UsageDays,
    rates: Record<string, CloudflareRate>,
    monthStart: number,
    now: number,
): Record<string, number> {
    // config/rates.json's "$comment" rides along with the rates.
    const priced = Object.entries(rates).filter(([m]) => !m.startsWith("$"));
    const d = new Date(monthStart);
    const inMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const used: Record<string, number> = {};
    const cost = (): number =>
        priced.reduce((usd, [m, r]) => {
            const n = r.stock ? (used[m] ?? 0) / 1e9 / inMonth : (used[m] ?? 0) / 1e6;
            const over = n - (r.stock ? r.included : r.included / 1e6);
            return usd + Math.max(0, over) * r.usd;
        }, 0);
    const out: Record<string, number> = {};
    let before = 0;
    for (let t = monthStart; t < now; t += DAY) {
        const day = isoDay(t);
        for (const [m] of priced) {
            used[m] = (used[m] ?? 0) + (days[day]?.[m] ?? 0);
        }
        const through = cost();
        if (through > before) {
            out[day] = through - before;
        }
        before = through;
    }
    return out;
}
