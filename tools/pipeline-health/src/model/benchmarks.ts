// Benchmark results (design/ci/health-dashboard.md, section 4.3, "Benchmark regressions"): one item per benchmark in
// one partition, holding its newest results, so the collector and the page read every benchmark in one query. CI's
// benchmark jobs post them (POST /v1/benchmarks, tools/results/post-benchmarks.mjs); a result names the run that
// measured it, so a retried post or a rerun of the same run replaces its own point.
//
// A result also names the machine (the runner's CPU model) that measured it: GitHub's hosted runners land on several
// CPU models about 2x apart, so a trend compares only results from the same machine as the newest one. A result may
// also name its input (a fingerprint of the graph it timed): a benchmark whose input changed times different work, so
// a trend compares only results of the newest one's input too, and a new input starts a new series.

import { DAY, ttlAt } from "./items.js";
import { isLive, type Item, type Key, type Store } from "./store.js";

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
/**
 * The noise floor, in median absolute deviations of the BEFORE results: a rise smaller than this many of them is within
 * the run-to-run scatter the series already shows and never counts. 3 MADs is about 2 standard deviations of one
 * result, about 3 of the median of the newest 3.
 */
export const NOISE_MADS = 3;

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
    /** What it timed (a fingerprint of its input graph); absent when the harness does not send one. */
    input?: string;
}

export interface BenchItem extends Item {
    benchmark: string;
    unit: string;
    points: BenchPoint[];
}

export const benchKey = (benchmark: string): Key => ({ pk: BENCH_PK, sk: benchmark });

/**
 * A benchmark's item with one more result: a result of the same run replaces its earlier one; the newest
 * BENCH_KEEP of each machine are kept (BENCH_KEEP_ALL in all), oldest first.
 * @param old - the stored item, if any
 * @param benchmark - benchmark name
 * @param unit - unit of its values
 * @param p - the new result
 * @param now - current time, epoch ms, for the expiry
 * @returns the item to store
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
 * The results measured on the same machine and the same input as the newest one, oldest first: the only ones it can
 * be compared with.
 * @param points - oldest first
 * @returns the newest machine's results of the newest input, oldest first
 */
export const sameMachine = (points: BenchPoint[]): BenchPoint[] =>
    points.filter((p) => p.machine === points.at(-1)?.machine && p.input === points.at(-1)?.input);

/**
 * The series' timer tick: the smallest gap between two of its distinct values, when every value is a whole number
 * of that gap. A reading quantized to a timer tick (the T4 lane's GPU profiler reads in 65.536 us ticks) takes only
 * whole ticks; a series that is not (an unquantized one, or a steady one with an outlier: 100 x9 and 300) has none.
 * @param vs - the values
 * @returns the tick, or 0 when the values show none
 */
export function quantum(vs: number[]): number {
    const s = [...new Set(vs)].sort((a, b) => a - b);
    const q = s.slice(1).reduce((m, v, i) => Math.min(m, v - s[i]), Infinity);
    const whole = (v: number): boolean => Math.abs(v / q - Math.round(v / q)) < 1e-6;
    return Number.isFinite(q) && s.every(whole) ? q : 0;
}

/**
 * A sustained regression: the median of the newest 3 results is over 1.2 times the median of the 10 before them,
 * among the results of the newest one's machine and input, and the medians differ by more than one step of the resolution
 * (quantum) of the results before the newest 3, so a one-tick change of a reading at its timer's resolution never
 * counts, and by more than NOISE_MADS median absolute deviations of the 10 before them, so a rise inside the scatter
 * the series shows with no code change never counts (a sub-millisecond benchmark on a hosted runner moves 1.7x from
 * run to run). The newest 3 are left out of both thresholds so the change being judged never sets its own.
 * Judged only with all 13, so one slow run never counts.
 * @param all - oldest first
 * @returns the two medians, their ratio and whether it regressed
 */
export function trend(all: BenchPoint[]): BenchTrend {
    const points = sameMachine(all);
    if (points.length < RECENT + BEFORE) {
        return { regressed: false };
    }
    const recent = median(points.slice(-RECENT).map((p) => p.v));
    const earlier = points.slice(-(RECENT + BEFORE), -RECENT).map((p) => p.v);
    const before = median(earlier);
    const ratio = before > 0 ? recent / before : undefined;
    // 1.5 quanta so float noise in a one-tick gap never passes and two ticks always do.
    // ponytail: earlier results all one value give no resolution (quantum 0), so a one-tick step off a perfectly
    // steady series still counts; a known per-lane tick would close that if it shows up.
    const aboveTick = recent - before > 1.5 * quantum(points.slice(0, -RECENT).map((p) => p.v));
    const aboveNoise = recent - before > NOISE_MADS * median(earlier.map((v) => Math.abs(v - before)));
    return {
        recent,
        before,
        ...(ratio === undefined ? {} : { ratio }),
        regressed: (ratio ?? 0) > REGRESSION_RATIO && aboveTick && aboveNoise,
    };
}

/**
 * Every benchmark's item not yet expired.
 * @param store - the table
 * @param now - current time, epoch ms
 * @returns the live benchmark items
 */
export async function readBenches(store: Store, now: number): Promise<BenchItem[]> {
    return ((await store.query(BENCH_PK)) as BenchItem[]).filter((b) => isLive(b, now));
}
