// Benchmark results (design/ci/health-dashboard.md, section 4.3, "Benchmark regressions"): one item per benchmark in
// one partition, holding its newest results, so the collector and the page read every benchmark in one query. CI's
// benchmark jobs post them (POST /v1/benchmarks, tools/results/post-benchmarks.mjs); a result names the run that
// measured it, so a retried post or a rerun of the same run replaces its own point.
//
// A result also names the machine (the runner's CPU model) that measured it: GitHub's hosted runners land on several
// CPU models about 2x apart, so a trend compares only results from the same machine as the newest one.

import { DAY, ttlAt } from "./items.js";
import { isLive, type Item, type Store } from "./store.js";

export const BENCH_PK = "BENCH";
/** Results kept per benchmark and machine: the 13 the regression rule reads, and some history for the trend. */
export const BENCH_KEEP = 20;
/** Results kept per benchmark across every machine, so an item stays small whatever runners it met. */
export const BENCH_KEEP_ALL = BENCH_KEEP * 5;
/** A benchmark nothing has posted for this long expires. */
const BENCH_TTL_MS = 90 * DAY;
/** The regression rule: the median of the newest RECENT results against the median of the BEFORE before them. */
export const RECENT = 3;
export const BEFORE = 10;
/** Slower than this many times its earlier median is a regression. */
export const REGRESSION_RATIO = 1.2;

export interface BenchPoint {
    /** When it was posted, epoch ms. */
    at: number;
    /** The result: a time, lower is better. */
    v: number;
    /** The workflow run that measured it. */
    run: number;
    sha?: string;
    /** The machine that measured it (the runner's CPU model); absent on results posted before it was sent. */
    machine?: string;
}

export interface BenchItem extends Item {
    benchmark: string;
    unit: string;
    points: BenchPoint[];
}

export const benchKey = (benchmark: string) => ({ pk: BENCH_PK, sk: benchmark });

/**
 * A benchmark's item with one more result: a result of the same run replaces its earlier one; the newest
 * BENCH_KEEP of each machine are kept (BENCH_KEEP_ALL in all), oldest first.
 * @param old - the stored item, if any
 * @param benchmark
 * @param unit
 * @param p - the new result
 * @param now
 */
export function withPoint(
    old: BenchItem | undefined,
    benchmark: string,
    unit: string,
    p: BenchPoint,
    now: number,
): BenchItem {
    const all = [...(old?.points ?? []).filter((x) => x.run !== p.run), p].sort((a, b) => a.at - b.at);
    const points = all
        .filter((x, i) => all.slice(i + 1).filter((y) => y.machine === x.machine).length < BENCH_KEEP)
        .slice(-BENCH_KEEP_ALL);
    return { ...benchKey(benchmark), benchmark, unit, points, ttl: ttlAt(now + BENCH_TTL_MS) };
}

const median = (xs: number[]): number => {
    const s = xs.toSorted((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface BenchTrend {
    /** Median of the newest RECENT results, and of the BEFORE before them; absent with fewer results than both. */
    recent?: number;
    before?: number;
    ratio?: number;
    regressed: boolean;
}

/**
 * The results measured on the same machine as the newest one, oldest first: the only ones it can be compared with.
 * @param points - oldest first
 */
export const sameMachine = (points: BenchPoint[]): BenchPoint[] =>
    points.filter((p) => p.machine === points.at(-1)?.machine);

/**
 * A sustained regression: the median of the newest 3 results is over 1.2 times the median of the 10 before them,
 * among the results of the newest one's machine. Judged only with all 13, so one slow run never counts.
 * @param all - oldest first
 */
export function trend(all: BenchPoint[]): BenchTrend {
    const points = sameMachine(all);
    if (points.length < RECENT + BEFORE) return { regressed: false };
    const recent = median(points.slice(-RECENT).map((p) => p.v));
    const before = median(points.slice(-(RECENT + BEFORE), -RECENT).map((p) => p.v));
    const ratio = before > 0 ? recent / before : undefined;
    return { recent, before, ...(ratio === undefined ? {} : { ratio }), regressed: (ratio ?? 0) > REGRESSION_RATIO };
}

/**
 * Every benchmark's item not yet expired.
 * @param store
 * @param now
 */
export async function readBenches(store: Store, now: number): Promise<BenchItem[]> {
    return ((await store.query(BENCH_PK)) as BenchItem[]).filter((b) => isLive(b, now));
}
