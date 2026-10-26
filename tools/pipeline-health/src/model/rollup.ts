// Rollups, recomputed and never incremented (10.3): a dirty 5-minute bucket is rebuilt from the raw items copied
// into it, then its 15-minute, hourly and daily parents from their children. A parent whose children have expired
// (a backfill of an old day) is rebuilt from below, down to the raw items.

import { addValue, emptyHistogram, mergeInto } from "./histogram.js";
import {
    type Agg,
    type Bucket,
    CHILD,
    DIRTY_PK,
    dirtyKey,
    floorTo,
    HOUR,
    idxKey,
    KEEP_MS,
    PARENT,
    type RawKind,
    rollKey,
    type RollupItem,
    skTime,
    type Step,
    STEP_MS,
    ttlAt,
} from "./items.js";
import { type Contribution, METRICS, type MetricSource } from "./metrics.js";
import { type BatchOp, isLive, type Item, type Store } from "./store.js";

export type Buckets = Map<string, Bucket>; // metric -> bucket

export const emptyAgg = (): Agg => ({ n: 0, sum: 0 });

function addTo(agg: Agg, c: Contribution, at: number): void {
    agg.n += c.n ?? 1;
    agg.sum += c.sum ?? 0;
    if (c.value === undefined) {
        return;
    }
    agg.hist ??= emptyHistogram();
    addValue(agg.hist, c.value);
    agg.max = Math.max(agg.max ?? -Infinity, c.value);
    if (agg.lastAt === undefined || at >= agg.lastAt) {
        agg.last = c.value;
        agg.lastAt = at;
    }
}

/**
 *
 * @param into
 * @param from
 */
export function mergeAgg(into: Agg, from: Agg): void {
    into.n += from.n;
    into.sum += from.sum;
    if (from.hist) {
        into.hist ??= emptyHistogram();
        mergeInto(into.hist, from.hist);
    }
    if (from.max !== undefined) {
        into.max = Math.max(into.max ?? -Infinity, from.max);
    }
    if (from.lastAt !== undefined && (into.lastAt === undefined || from.lastAt >= into.lastAt)) {
        into.last = from.last;
        into.lastAt = from.lastAt;
    }
}

function dimOf(b: Bucket, d: string): Agg {
    b.dims ??= {};
    b.dims[d] ??= emptyAgg();
    return b.dims[d];
}

/**
 *
 * @param into
 * @param from
 */
export function mergeBucket(into: Bucket, from: Bucket): void {
    mergeAgg(into, from);
    for (const [d, a] of Object.entries(from.dims ?? {})) {
        mergeAgg(dimOf(into, d), a);
    }
}

const pick = ({ n, sum, hist, max, last, lastAt, dims }: Bucket): Bucket => ({
    n,
    sum,
    ...(hist ? { hist } : {}),
    ...(max === undefined ? {} : { max }),
    ...(last === undefined ? {} : { last, lastAt }),
    ...(dims ? { dims } : {}),
});

const SOURCES = new Map<string, { metric: string; source: MetricSource }[]>();
for (const m of METRICS) {
    for (const s of m.from) {
        const k = `${s.kind}#${s.field}`;
        SOURCES.set(k, [...(SOURCES.get(k) ?? []), { metric: m.id, source: s }]);
    }
}

function contribute(out: Buckets, metric: string, c: Contribution | null, at: number): void {
    if (!c) {
        return;
    }
    const b: Bucket = out.get(metric) ?? emptyAgg();
    out.set(metric, b);
    addTo(b, c, at);
    if (c.dim !== undefined) {
        addTo(dimOf(b, c.dim), c, at);
    }
}

/**
 * One 5-minute bucket of every metric, from the raw items copied into it.
 * @param store
 * @param start
 * @param nowMs
 */
export async function fromRaw(store: Store, start: number, nowMs: number): Promise<Buckets> {
    const out: Buckets = new Map();
    for (const item of await store.query(`T#${skTime(start)}`)) {
        if (!isLive(item, nowMs)) {
            continue;
        }
        const kind = item.kind as RawKind;
        const field = item.field as string;
        const at = item[field] as number;
        if (kind === "obs") {
            const v = item.value as number;
            contribute(out, item.metric as string, { sum: v, value: v }, at);
            continue;
        }
        for (const { metric, source } of SOURCES.get(`${kind}#${field}`) ?? []) {
            contribute(out, metric, source.fold(item as never), at);
        }
    }
    return out;
}

/**
 * Stored buckets of `step` in [from, to], every metric the IDX items name: one query per metric.
 * @param store
 * @param step
 * @param from
 * @param to
 * @param nowMs
 */
export async function readStored(
    store: Store,
    step: Step,
    from: number,
    to: number,
    nowMs: number,
): Promise<Map<number, Buckets>> {
    const range = { from: skTime(from), to: skTime(to) };
    const metrics = new Set<string>();
    for (const i of await store.query(idxKey(step, 0).pk, range)) {
        if (isLive(i, nowMs)) {
            for (const m of i.metrics as string[]) {
                metrics.add(m);
            }
        }
    }
    const out = new Map<number, Buckets>();
    for (const m of metrics) {
        for (const r of (await store.query(rollKey(m, step, 0).pk, range)) as RollupItem[]) {
            if (!isLive(r, nowMs)) {
                continue;
            }
            const b = out.get(r.start) ?? new Map();
            out.set(r.start, b);
            b.set(m, pick(r));
        }
    }
    return out;
}

/**
 * A bucket still kept for at least an hour, so it can be read instead of recomputed.
 * @param step
 * @param start
 * @param nowMs
 */
const kept = (step: Step, start: number, nowMs: number) => start + KEEP_MS[step] > nowMs + HOUR;

/**
 * Every metric of one bucket of `step`, recomputed: from raw for 5 minutes, else from its children.
 * @param store
 * @param step
 * @param start
 * @param nowMs
 * @param cache
 */
export async function computePeriod(
    store: Store,
    step: Step,
    start: number,
    nowMs: number,
    cache = new Map<string, Buckets>(),
): Promise<Buckets> {
    const key = `${step}:${start}`;
    const hit = cache.get(key);
    if (hit) {
        return hit;
    }
    let out: Buckets;
    const child = CHILD[step];
    if (!child) {
        out = await fromRaw(store, start, nowMs);
    } else {
        out = new Map();
        const starts: number[] = [];
        for (let s = start; s < start + STEP_MS[step]; s += STEP_MS[child]) {
            starts.push(s);
        }
        const needRead = starts.some((s) => !cache.has(`${child}:${s}`) && kept(child, s, nowMs));
        const stored = needRead ? await readStored(store, child, start, start + STEP_MS[step] - 1, nowMs) : new Map();
        for (const s of starts) {
            const c =
                cache.get(`${child}:${s}`) ??
                (kept(child, s, nowMs)
                    ? (stored.get(s) ?? new Map())
                    : await computePeriod(store, child, s, nowMs, cache));
            for (const [m, b] of c as Buckets) {
                const into = out.get(m) ?? emptyAgg();
                out.set(m, into);
                mergeBucket(into, b);
            }
        }
    }
    cache.set(key, out);
    return out;
}

/**
 * Writes one recomputed bucket of every metric, and empties the metrics it no longer holds.
 * @param store
 * @param step
 * @param start
 * @param buckets
 * @param nowMs
 */
async function writePeriod(store: Store, step: Step, start: number, buckets: Buckets, nowMs: number): Promise<number> {
    if (!kept(step, start, nowMs)) {
        return 0;
    }
    const ttl = ttlAt(start + KEEP_MS[step]);
    const prev = ((await store.get(idxKey(step, start)))?.metrics as string[] | undefined) ?? [];
    const ops: BatchOp[] = [];
    for (const m of prev) {
        if (!buckets.has(m)) {
            ops.push({ delete: rollKey(m, step, start) });
        }
    }
    for (const [m, b] of buckets) {
        ops.push({ put: { ...rollKey(m, step, start), metric: m, step, start, ttl, ...pick(b) } });
    }
    ops.push({ put: { ...idxKey(step, start), metrics: [...buckets.keys()].sort(), ttl } });
    await store.batch(ops);
    return buckets.size;
}

/**
 * Recomputes every dirty 5-minute bucket and its parents, then clears the marks it consumed. The collector runs it
 * every cycle (reserved concurrency 1, so two never race each other).
 * @param store
 * @param nowMs
 */
export async function recompute(store: Store, nowMs: number): Promise<{ buckets: number; items: number }> {
    const marks = await store.query(DIRTY_PK);
    const cache = new Map<string, Buckets>();
    let level = new Set(marks.map((m) => m.start as number));
    let step: Step | undefined = "5m";
    let buckets = 0;
    let items = 0;
    while (step && level.size) {
        for (const start of [...level].sort((a, b) => a - b)) {
            items += await writePeriod(
                store,
                step,
                start,
                await computePeriod(store, step, start, nowMs, cache),
                nowMs,
            );
            buckets++;
        }
        const parent: Step | undefined = PARENT[step];
        if (parent) {
            level = new Set([...level].map((s) => floorTo(s, parent)));
        }
        step = parent;
    }
    // A mark re-set while we worked (a newer markedAt) stays for the next cycle.
    // ponytail: a write landing between this get and the delete loses its mark until the bucket is next touched;
    // a conditional delete in the adapter closes it if that ever shows.
    const clear: BatchOp[] = [];
    for (const m of marks) {
        const cur = await store.get(dirtyKey(m.start as number));
        if (cur && cur.markedAt === m.markedAt) {
            clear.push({ delete: dirtyKey(m.start as number) });
        }
    }
    await store.batch(clear);
    return { buckets, items };
}

// ---------------------------------------------------------------------------------------------------------------
// Window values (section 8).

export type WindowName = "1h" | "6h" | "24h" | "7d" | "28d";
export const WINDOWS: Record<WindowName, { step: Step; count: number }> = {
    "1h": { step: "5m", count: 12 },
    "6h": { step: "15m", count: 24 },
    "24h": { step: "1h", count: 24 },
    "7d": { step: "1d", count: 7 },
    "28d": { step: "1d", count: 28 },
};

export interface MetricWindow {
    metric: string;
    window: WindowName;
    step: Step;
    /** Start of the oldest bucket; the newest is the current, partial one. */
    from: number;
    to: number;
    total: Bucket;
    series: { start: number; bucket: Bucket }[];
}

/**
 * One metric's buckets of `step` in [from, to], by start.
 * @param store
 * @param metric
 * @param step
 * @param from
 * @param to
 * @param nowMs
 */
export async function loadSeries(
    store: Store,
    metric: string,
    step: Step,
    from: number,
    to: number,
    nowMs: number,
): Promise<Map<number, Bucket>> {
    const out = new Map<number, Bucket>();
    for (const r of (await store.query(rollKey(metric, step, 0).pk, {
        from: skTime(from),
        to: skTime(to),
    })) as RollupItem[]) {
        if (isLive(r, nowMs)) {
            out.set(r.start, pick(r));
        }
    }
    return out;
}

/**
 * A metric over one window, from its stored rollups: one single-partition query.
 * @param store
 * @param metric
 * @param window
 * @param nowMs
 */
export async function windowValue(
    store: Store,
    metric: string,
    window: WindowName,
    nowMs: number,
): Promise<MetricWindow> {
    const { step, count } = WINDOWS[window];
    const end = floorTo(nowMs, step);
    const from = end - (count - 1) * STEP_MS[step];
    const got = await loadSeries(store, metric, step, from, end, nowMs);
    const total: Bucket = emptyAgg();
    const series: MetricWindow["series"] = [];
    for (let s = from; s <= end; s += STEP_MS[step]) {
        const b = got.get(s) ?? emptyAgg();
        mergeBucket(total, b);
        series.push({ start: s, bucket: b });
    }
    return { metric, window, step, from, to: nowMs, total, series };
}
