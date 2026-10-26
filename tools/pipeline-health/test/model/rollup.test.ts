import { describe, expect, it } from "vitest";

import {
    type Bucket,
    DAY,
    DIRTY_PK,
    dirtyKey,
    floorTo,
    HOUR,
    rollKey,
    type Step,
    STEP_MS,
} from "../../src/model/items.js";
import { FULL_SHARD_BUDGET_MS } from "../../src/model/metrics.js";
import { putRaw } from "../../src/model/raw.js";
import { LEASE_KEY, LEASE_MS, loadSeries, recompute, windowValue } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { refold } from "../../src/recompute.js";
import { job, MIN, obs, T0 } from "./helpers.js";

const rand = (seed: number) => () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const dayStart = floorTo(T0, "1d");

async function aDay(store: MemoryStore, now: number) {
    const r = rand(3);
    const items = Array.from({ length: 400 }, (_, i) => {
        const startedAt = dayStart + Math.floor(r() * (now - dayStart));
        return job(i, {
            createdAt: startedAt - Math.floor(r() * 20 * MIN),
            startedAt,
            completedAt: startedAt + MIN,
            hang: r() < 0.05,
        });
    });
    await putRaw(store, items, now);
    // A day of marks is more than one cycle takes (MAX_MARKS): later cycles drain the rest, newest first.
    const first = await recompute(store, now);
    expect((await store.query(DIRTY_PK)).length).toBeGreaterThan(0);
    expect(first.buckets).toBeGreaterThan(0);
    for (let cycles = 0; (await store.query(DIRTY_PK)).length; cycles++) {
        expect(cycles).toBeLessThan(5);
        await recompute(store, now);
    }
}

async function sums(store: MemoryStore, metric: string, step: Step, from: number, to: number, now: number) {
    const s = await loadSeries(store, metric, step, from, to, now);
    const out = { n: 0, sum: 0, hist: 0 };
    for (const b of s.values()) {
        out.n += b.n;
        out.sum += b.sum;
        out.hist += (b.hist ?? []).reduce((a, x) => a + x, 0);
    }
    return out;
}

describe("rollups", () => {
    it("recomputed 15m, 1h and 1d buckets sum to their 5m children", async () => {
        const store = new MemoryStore();
        const now = T0 + 11 * HOUR;
        await aDay(store, now);
        for (const metric of ["ci.runner_wait", "ci.hangs"]) {
            const fives = await sums(store, metric, "5m", dayStart, now, now);
            expect(fives.n).toBe(400);
            for (const step of ["15m", "1h", "1d"] as Step[]) {
                expect(await sums(store, metric, step, dayStart, now, now)).toEqual(fives);
            }
            // and every parent equals its own children
            const parents = await loadSeries(store, metric, "1h", dayStart, now, now);
            for (const [start, b] of parents) {
                const kids = await sums(store, metric, "15m", start, start + HOUR - 1, now);
                expect({ n: b.n, sum: b.sum }).toEqual({ n: kids.n, sum: kids.sum });
            }
        }
    });

    it("a dirty bucket of an old day rebuilds its expired parents from the raw items", async () => {
        const store = new MemoryStore();
        const old = dayStart - 20 * DAY; // 5m (2 d) and 1h (14 d) buckets of that day are long gone
        await putRaw(
            store,
            [0, 3, 7, 23].map((h, i) =>
                job(i, {
                    createdAt: old + h * HOUR,
                    startedAt: old + h * HOUR + MIN,
                    completedAt: old + h * HOUR + 2 * MIN,
                }),
            ),
            T0,
        );
        await recompute(store, T0);
        expect(await store.get(rollKey("ci.runner_wait", "5m", old))).toBeUndefined(); // not kept
        const day = (await store.get(rollKey("ci.runner_wait", "1d", old))) as unknown as Bucket;
        expect(day.n).toBe(4);
        // A late write into one hour of that day keeps the other hours.
        await putRaw(store, [job(99, { createdAt: old + 5 * HOUR, startedAt: old + 5 * HOUR + MIN })], T0);
        await recompute(store, T0);
        expect(((await store.get(rollKey("ci.runner_wait", "1d", old))) as unknown as Bucket).n).toBe(5);
    });

    it("keeps stocks as the newest value and the peak, per bucket and merged", async () => {
        const store = new MemoryStore();
        await putRaw(
            store,
            [obs("pr.open", 9, T0 - 9 * MIN), obs("pr.open", 30, T0 - 6 * MIN), obs("pr.open", 12, T0 - MIN)],
            T0,
        );
        await recompute(store, T0);
        const w = await windowValue(store, "pr.open", "1h", T0);
        expect(w.total).toMatchObject({ last: 12, max: 30 });
    });

    it("reads windows as twelve 5m, twenty-four 15m and twenty-four 1h buckets", async () => {
        const store = new MemoryStore();
        await putRaw(store, [obs("ci.saturated_ms", 1, T0 - 2 * HOUR)], T0);
        await recompute(store, T0);
        const one = await windowValue(store, "ci.saturated_ms", "1h", T0);
        const six = await windowValue(store, "ci.saturated_ms", "6h", T0);
        const day = await windowValue(store, "ci.saturated_ms", "24h", T0);
        expect([one.series.length, six.series.length, day.series.length]).toEqual([12, 24, 24]);
        expect([one.step, six.step, day.step]).toEqual(["5m", "15m", "1h"]);
        expect(one.from).toBe(T0 - 11 * STEP_MS["5m"]);
        expect([one.total.sum, six.total.sum, day.total.sum]).toEqual([0, 1, 1]);
    });

    it("writes only the dirty buckets and their parents", async () => {
        const store = new MemoryStore();
        await putRaw(store, [job(1)], T0);
        const r = await recompute(store, T0);
        // startedAt and completedAt (28 and 20 min back) dirty two 5m buckets, sharing one 15m, 1h and 1d parent.
        expect(r.buckets).toBe(5);
        expect((await recompute(store, T0)).buckets).toBe(0);
    });

    it("never runs two recomputes at once: the second waits for the lease and keeps the marks", async () => {
        const store = new MemoryStore();
        await putRaw(store, [job(1)], T0);
        // The backfill holds the lease mid-recompute; the collector's cycle must not build parents or clear marks.
        await store.put({ ...LEASE_KEY, token: "backfill", until: T0 + LEASE_MS });
        expect(await recompute(store, T0)).toEqual({ buckets: 0, items: 0, busy: true });
        expect((await store.query(DIRTY_PK)).length).toBe(2);
        // A holder that died: the lease expires and the next cycle takes it, then releases it.
        const r = await recompute(store, T0 + LEASE_MS + 1);
        expect(r.buckets).toBe(5);
        expect((await store.get(LEASE_KEY))?.until).toBe(0);
        expect((await recompute(store, T0 + LEASE_MS + 2)).busy).toBeUndefined();
    });
});

describe("refold", () => {
    it("folds a full-run shard stored before the fold changed, once per fold version", async () => {
        const store = new MemoryStore();
        const at = T0 - HOUR;
        await putRaw(
            store,
            [
                {
                    kind: "shard_run",
                    id: "old",
                    attempt: 1,
                    source: "ci",
                    variant: "layout",
                    family: "layout",
                    bin: false,
                    full: true,
                    sha: "abc",
                    outcome: "passed",
                    startedAt: at - 300_000,
                    endedAt: at,
                    secs: 300,
                    files: [],
                },
            ],
            T0,
        );
        // Stored and folded by an older fold: its bucket carries no mark and no contribution.
        await store.batch([{ delete: dirtyKey(floorTo(at, "5m")) }]);
        await recompute(store, T0);
        expect((await sums(store, "ci.full_shard_time", "5m", at - HOUR, T0, T0)).sum).toBe(0);
        expect(await refold(store, T0)).toBeGreaterThan(0);
        expect(await refold(store, T0)).toBe(0);
        await recompute(store, T0);
        expect((await sums(store, "ci.full_shard_time", "5m", at - HOUR, T0, T0)).sum).toBe(FULL_SHARD_BUDGET_MS);
    });
});
