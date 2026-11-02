// Writing raw items, the daily write budget, cursors and source health. Ingest and the collector call these; the
// rollups are recomputed from what they stored (rollup.ts), so nothing here counts anything.

import { randomUUID } from "node:crypto";

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
import type { BatchOp, Condition, Item, Key, Store } from "./store.js";

/**
 * A test's rows, written in one transaction on the condition that its home row is still what `old` was (its write id
 * `wid`), re-read and retried when another post changed it in between. Two tries of one shard posting at once
 * therefore never mix their rows, and a failed result never replaces a flaky one (failed, then passed on its retry).
 * @param store - the table
 * @param r - the test's new record
 * @param old - its home row as last read, or undefined when there is none
 * @param nowMs - current time
 * @param dirty - collects the 5-minute buckets touched
 * @returns once the rows are written, or when a stored flaky row is kept
 */
async function putTest(
    store: Store,
    r: RawItem,
    old: (Item & RawItem) | undefined,
    nowMs: number,
    dirty: Set<number>,
): Promise<void> {
    for (let tries = 0; tries < 8; tries++) {
        if (tries) {
            old = (await store.get(homeKey(r))) as (Item & RawItem) | undefined;
        }
        if (r.kind === "test" && r.outcome === "failed" && old?.kind === "test" && old.outcome === "flaky") {
            return;
        }
        const [home, ...rest] = writesFor(r, old, nowMs, dirty) as [{ put: Item }, ...BatchOp[]];
        const condition = unchanged(old);
        if (await store.transact([{ put: { ...home.put, wid: randomUUID() }, condition }, ...rest])) {
            return;
        }
    }
    throw new Error(`test ${r.id}: its row kept changing under 8 tries`);
}

/**
 * The home row is still `old`: its write id, or its outcome for a row written before write ids.
 * @param old - the home row as last read, or undefined when there was none
 * @returns the condition for the transaction's home put
 */
function unchanged(old: Item | undefined): Condition {
    if (!old) {
        return { notExists: true };
    }
    if (typeof old.wid === "string") {
        return { field: "wid", op: "=", value: old.wid };
    }
    return { field: "outcome", op: "=", value: typeof old.outcome === "string" ? old.outcome : "" };
}

const timesOf = (r: RawItem): [string, number][] =>
    TIME_FIELDS[r.kind].flatMap((f) => {
        const v = (r as unknown as Record<string, unknown>)[f];
        return typeof v === "number" ? [[f, v] as [string, number]] : [];
    });

/**
 * Stores raw items idempotently: the same id and attempt replaces what was there. Each item is written to its home
 * and copied into the 5-minute bucket of each of its times; every bucket touched (and any a changed time left) is
 * marked dirty. Returns the number of items written.
 * @param store - the table
 * @param items - raw records to store
 * @param nowMs - current time
 * @param opts - write options
 * @param opts.merge - keep the live-collector-only fields of the stored copy when the new record leaves them out
 * @param opts.markSince - mark no bucket older than this dirty (the all-issues backfill: rollups older than the
 *   refold window are never rebuilt from raw items, and marking them would cost a recompute each)
 * @returns the number of items written
 */
export async function putRaw(
    store: Store,
    items: RawItem[],
    nowMs: number,
    opts: { merge?: boolean; markSince?: number } = {},
): Promise<number> {
    const ops: BatchOp[] = [];
    const dirty = new Set<number>();
    items.forEach(check);
    // The old copies are read 25 at a time: one by one, a 500-row post outlived the 10 s Lambda.
    const olds: ((Item & RawItem) | undefined)[] = [];
    for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25).map((r) => store.get(homeKey(r)));
        olds.push(...((await Promise.all(chunk)) as ((Item & RawItem) | undefined)[]));
    }
    // One write per test: a post can hold one id twice (identical test.each titles), and as in batch() the last wins.
    const tests = new Map<string, () => Promise<void>>();
    items.forEach((r, i) => {
        const merged = opts.merge ? mergeOld(r, olds[i]) : r;
        const home = homeKey(r);
        if (r.kind === "test") {
            tests.set(`${home.pk}\u0000${home.sk}`, () => putTest(store, merged, olds[i], nowMs, dirty));
        } else {
            ops.push(...writesFor(merged, olds[i], nowMs, dirty));
        }
    });
    // Before the batch, which holds the dirty marks: a recompute never runs on a bucket before its rows are in.
    // Twenty-five transactions at a time; a failed one still lets the rest, the other rows and the marks be written.
    // Typed Error for the throw below; the store and putTest reject with Errors.
    let failure: Error | undefined;
    const writes = [...tests.values()];
    for (let i = 0; i < writes.length; i += 25) {
        for (const r of await Promise.allSettled(writes.slice(i, i + 25).map((t) => t()))) {
            if (r.status === "rejected") {
                failure ??= r.reason as Error;
            }
        }
    }
    for (const start of dirty) {
        if (opts.markSince !== undefined && start < floorTo(opts.markSince, "5m")) {
            continue;
        }
        ops.push({ put: { ...dirtyKey(start), start, markedAt: nowMs } });
    }
    await store.batch(ops);
    if (failure) {
        throw failure;
    }
    return items.length;
}

/**
 * `r` over what is stored, keeping only the fields the live collector alone writes (LIVE_ONLY: cause, cancelClass,
 * hang, stages, tested) when `r` leaves them out, so a writer that knows less (the backfill) never erases them. Every
 * other field `r` leaves out stays unset.
 * @param r - the new record
 * @param old - the stored copy, if any
 * @returns the record to write
 */
function mergeOld(r: RawItem, old: (Item & RawItem) | undefined): RawItem {
    if (!old) {
        return r;
    }
    // Only what the live collector alone knows survives; every other field the new record leaves out means
    // "unset" (a skipped job's startedAt, a null conclusion) and must not come back from the old copy.
    const live = Object.fromEntries(
        LIVE_ONLY.filter((k) => old[k] !== undefined && (r as unknown as Record<string, unknown>)[k] === undefined).map(
            (k) => [k, old[k]],
        ),
    );
    return { ...r, ...live };
}
const LIVE_ONLY = ["cause", "prCaused", "cancelClass", "hang", "stages", "tested"] as const;

/**
 * Throws when a raw record has an unknown kind or lacks its id or attempt.
 * @param r - the record to check
 */
export function check(r: RawItem): void {
    if (!TIME_FIELDS[r.kind]) {
        throw new Error(`unknown kind ${String((r as { kind: unknown }).kind)}`);
    }
    if (typeof r.id !== "string" || !r.id || !Number.isInteger(r.attempt)) {
        throw new Error("id and attempt required");
    }
}

/**
 * The home item, a copy per time field, and the removal of copies a changed time left behind.
 * @param r - the record to write
 * @param old - its stored copy, if any
 * @param nowMs - current time, the expiry base of a record with no times
 * @param dirty - collects the 5-minute buckets touched
 * @returns the puts and deletes
 */
function writesFor(r: RawItem, old: RawItem | undefined, nowMs: number, dirty: Set<number>): BatchOp[] {
    const keep = KEEP_DAYS[r.kind];
    const times = timesOf(r);
    const first = times.length ? Math.min(...times.map(([, t]) => t)) : nowMs;
    const body = { ...r, ...(keep === undefined ? {} : { ttl: ttlAt(first + keep * DAY) }) };
    const ops: BatchOp[] = [{ put: { ...body, ...homeKey(r) } }];
    // Index copies: one whose key changed (a test seen at another time) is removed first.
    const fresh = indexKeys(r);
    for (const k of old ? indexKeys(old) : []) {
        if (!fresh.some((f) => f.pk === k.pk && f.sk === k.sk)) {
            ops.push({ delete: k });
        }
    }
    for (const k of fresh) {
        ops.push({ put: { ...body, ...k } });
    }
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
 * @param store - the table
 * @param rows - rows about to be written
 * @param nowMs - current time, which picks the day
 * @param limit - the day's row limit
 * @returns true when the rows fit and were counted
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
 * Rows counted against today's write budget.
 * @param store - the table
 * @param nowMs - current time, which picks the day
 * @returns the rows written today, 0 when none
 */
export async function quotaUsed(store: Store, nowMs: number): Promise<number> {
    return ((await store.get(quotaKey(nowMs)))?.rows as number | undefined) ?? 0;
}

/**
 * Reads a named cursor.
 * @param store - the table
 * @param name - cursor name
 * @returns the cursor's value, or undefined when unset
 */
export async function getCursor(store: Store, name: string): Promise<string | undefined> {
    return ((await store.get(cursorKey(name))) as CursorItem | undefined)?.value;
}

/**
 * Writes a named cursor.
 * @param store - the table
 * @param name - cursor name
 * @param value - the new value
 * @param nowMs - current time, stored as when it was set
 */
export async function setCursor(store: Store, name: string, value: string, nowMs: number): Promise<void> {
    await store.put({ ...cursorKey(name), value, at: nowMs });
}

/**
 * The oldest time any of these items is bucketed by, or undefined when none has one.
 * @param items - raw records
 * @returns the oldest time, epoch ms
 */
export function oldestAt(items: RawItem[]): number | undefined {
    const ts = items.flatMap((r) => timesOf(r).map(([, v]) => v));
    return ts.length ? Math.min(...ts) : undefined;
}

/**
 * Records one write (or failed attempt) of a source, for its age and error (section 9). firstAt is where the source's
 * history starts: the first write, or earlier when a write carries older events (a writer posting its backlog).
 * @param store - the table
 * @param source - source name
 * @param nowMs - current time
 * @param result - whether the write worked, with its partial note or error
 * @param since - the oldest event time in this write, if older than nowMs
 */
export async function recordSource(
    store: Store,
    source: string,
    nowMs: number,
    result: { ok: true; partial?: string } | { ok: false; error: string },
    since?: number,
): Promise<void> {
    const key: Key = sourceKey(source);
    const old = (await store.get(key)) as SourceItem | undefined;
    const item: SourceItem = {
        ...key,
        source,
        firstAt: Math.min(old?.firstAt ?? nowMs, since ?? nowMs),
        lastAt: nowMs,
        ...(old?.lastOkAt === undefined ? {} : { lastOkAt: old.lastOkAt }),
    };
    if (result.ok) {
        item.lastOkAt = nowMs;
        if (result.partial) {
            item.partial = result.partial;
        }
    } else {
        item.error = result.error;
        item.errorSince = old?.error ? (old.errorSince ?? nowMs) : nowMs;
    }
    await store.put(item);
}
