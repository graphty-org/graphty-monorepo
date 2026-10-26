// Writing raw items, the daily write budget, cursors and source health. Ingest and the collector call these; the
// rollups are recomputed from what they stored (rollup.ts), so nothing here counts anything.

import {
    copyKey,
    type CursorItem,
    cursorKey,
    DAILY_ROW_LIMIT,
    DAY,
    dirtyKey,
    floorTo,
    homeKey,
    indexKeys,
    KEEP_DAYS,
    quotaKey,
    type RawItem,
    type SourceItem,
    sourceKey,
    TIME_FIELDS,
    ttlAt,
} from "./items.js";
import type { BatchOp, Item, Key, Store } from "./store.js";

const timesOf = (r: RawItem): [string, number][] =>
    TIME_FIELDS[r.kind].flatMap((f) => {
        const v = (r as unknown as Record<string, unknown>)[f];
        return typeof v === "number" ? [[f, v] as [string, number]] : [];
    });

/**
 * Stores raw items idempotently: the same id and attempt replaces what was there. Each item is written to its home
 * and copied into the 5-minute bucket of each of its times; every bucket touched (and any a changed time left) is
 * marked dirty. Returns the number of items written.
 * @param store
 * @param items
 * @param nowMs
 */
export async function putRaw(store: Store, items: RawItem[], nowMs: number): Promise<number> {
    const ops: BatchOp[] = [];
    const dirty = new Set<number>();
    items.forEach(check);
    // The old copies are read 25 at a time: one by one, a 500-row post outlived the 10 s Lambda.
    const olds: ((Item & RawItem) | undefined)[] = [];
    for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25).map((r) => store.get(homeKey(r)));
        olds.push(...((await Promise.all(chunk)) as ((Item & RawItem) | undefined)[]));
    }
    items.forEach((r, i) => ops.push(...writesFor(r, olds[i], nowMs, dirty)));
    for (const start of dirty) {
        ops.push({ put: { ...dirtyKey(start), start, markedAt: nowMs } });
    }
    await store.batch(ops);
    return items.length;
}

function check(r: RawItem): void {
    if (!TIME_FIELDS[r.kind]) {
        throw new Error(`unknown kind ${String((r as { kind: unknown }).kind)}`);
    }
    if (typeof r.id !== "string" || !r.id || !Number.isInteger(r.attempt)) {
        throw new Error("id and attempt required");
    }
}

/**
 * The home item, a copy per time field, and the removal of copies a changed time left behind.
 * @param r
 * @param old
 * @param nowMs
 * @param dirty
 */
function writesFor(r: RawItem, old: RawItem | undefined, nowMs: number, dirty: Set<number>): BatchOp[] {
    const keep = KEEP_DAYS[r.kind];
    const times = timesOf(r);
    const first = times.length ? Math.min(...times.map(([, t]) => t)) : nowMs;
    const body = { ...r, ...(keep === undefined ? {} : { ttl: ttlAt(first + keep * DAY) }) };
    const ops: BatchOp[] = [{ put: { ...body, ...homeKey(r) } }];
    // Index copies: one whose key changed (a test seen at another time) is removed first.
    const fresh = indexKeys(r);
    for (const k of old ? indexKeys(old) : [])
        if (!fresh.some((f) => f.pk === k.pk && f.sk === k.sk)) ops.push({ delete: k });
    for (const k of fresh) ops.push({ put: { ...body, ...k } });
    const now = new Map(times);
    for (const [f, t] of old ? timesOf(old) : []) {
        const moved = now.get(f);
        if (moved !== undefined && floorTo(moved, "5m") === floorTo(t, "5m")) {
            continue;
        }
        ops.push({ delete: copyKey(r, f, t) });
        dirty.add(floorTo(t, "5m"));
    }
    for (const [f, t] of times) {
        ops.push({ put: { ...body, ...copyKey(r, f, t), field: f } });
        dirty.add(floorTo(t, "5m"));
    }
    return ops;
}

/**
 * Adds `rows` to today's count under a condition, so the day never passes `limit` (10.5). False when it would: the
 * caller answers 429 and writes nothing.
 * @param store
 * @param rows
 * @param nowMs
 * @param limit
 */
export async function takeQuota(store: Store, rows: number, nowMs: number, limit = DAILY_ROW_LIMIT): Promise<boolean> {
    if (rows > limit) {
        return false;
    }
    const done = await store.update(
        quotaKey(nowMs),
        { add: { rows }, set: { ttl: ttlAt(nowMs + 8 * DAY) } },
        { field: "rows", op: "<=", value: limit - rows, orNotExists: true },
    );
    return done !== undefined;
}

/**
 *
 * @param store
 * @param nowMs
 */
export async function quotaUsed(store: Store, nowMs: number): Promise<number> {
    return ((await store.get(quotaKey(nowMs)))?.rows as number | undefined) ?? 0;
}

/**
 *
 * @param store
 * @param name
 */
export async function getCursor(store: Store, name: string): Promise<string | undefined> {
    return ((await store.get(cursorKey(name))) as CursorItem | undefined)?.value;
}

/**
 *
 * @param store
 * @param name
 * @param value
 * @param nowMs
 */
export async function setCursor(store: Store, name: string, value: string, nowMs: number): Promise<void> {
    await store.put({ ...cursorKey(name), value, at: nowMs });
}

/**
 * Records one write (or failed attempt) of a source, for its age and error (section 9).
 * @param store
 * @param source
 * @param nowMs
 * @param result
 */
export async function recordSource(
    store: Store,
    source: string,
    nowMs: number,
    result: { ok: true } | { ok: false; error: string },
): Promise<void> {
    const key: Key = sourceKey(source);
    const old = (await store.get(key)) as SourceItem | undefined;
    const item: SourceItem = {
        ...key,
        source,
        firstAt: old?.firstAt ?? nowMs,
        lastAt: nowMs,
        ...(old?.lastOkAt === undefined ? {} : { lastOkAt: old.lastOkAt }),
    };
    if (result.ok) {
        item.lastOkAt = nowMs;
    } else {
        item.error = result.error;
        item.errorSince = old?.error ? (old.errorSince ?? nowMs) : nowMs;
    }
    await store.put(item);
}
