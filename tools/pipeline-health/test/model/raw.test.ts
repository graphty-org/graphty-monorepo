import { describe, expect, it } from "vitest";

import { DAILY_ROW_LIMIT, rollKey, skTime } from "../../src/model/items.js";
import { getCursor, putRaw, quotaUsed, recordSource, setCursor, takeQuota } from "../../src/model/raw.js";
import { recompute, windowValue } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { MIN, run, T0 } from "./helpers.js";

describe("raw writes", () => {
    it("a retried post does not count twice", async () => {
        const store = new MemoryStore();
        const batch = [run(1), run(2, { attempt: 2, conclusion: "failure" })];
        await putRaw(store, batch, T0);
        await recompute(store, T0);
        await putRaw(store, batch, T0 + MIN); // the same post again
        await recompute(store, T0 + MIN);
        const w = await windowValue(store, "ci.reruns", "1h", T0 + MIN);
        expect(w.total.n).toBe(2);
        expect(w.total.sum).toBe(1);
        const fa = await windowValue(store, "ci.first_attempt", "1h", T0 + MIN);
        expect(fa.total).toMatchObject({ n: 1, sum: 1 });
    });

    it("moves an item whose time changed, emptying its old bucket", async () => {
        const store = new MemoryStore();
        await putRaw(store, [run(1, { completedAt: T0 - 40 * MIN })], T0);
        await recompute(store, T0);
        expect(await store.get(rollKey("ci.reruns", "5m", T0 - 40 * MIN))).toBeDefined();
        await putRaw(store, [run(1, { completedAt: T0 - 10 * MIN })], T0);
        await recompute(store, T0);
        expect(await store.get(rollKey("ci.reruns", "5m", T0 - 40 * MIN))).toBeUndefined();
        expect((await windowValue(store, "ci.reruns", "1h", T0)).total.n).toBe(1);
    });

    it("marks every bucket it touches dirty, and recompute clears the marks", async () => {
        const store = new MemoryStore();
        await putRaw(store, [run(1)], T0);
        const marks = await store.query("DIRTY");
        expect(marks.map((m) => m.sk).sort()).toEqual([skTime(T0 - 30 * MIN), skTime(T0 - 10 * MIN)].sort());
        await recompute(store, T0);
        expect(await store.query("DIRTY")).toEqual([]);
    });

    it("refuses an item without an id", async () => {
        await expect(putRaw(new MemoryStore(), [{ ...run(1), id: "" }], T0)).rejects.toThrow(/id/);
    });
});

describe("daily write budget", () => {
    it("adds rows until the budget, then refuses without counting", async () => {
        const store = new MemoryStore();
        expect(await takeQuota(store, 200_000, T0)).toBe(true);
        expect(await takeQuota(store, 100_000, T0)).toBe(true);
        expect(await quotaUsed(store, T0)).toBe(DAILY_ROW_LIMIT);
        expect(await takeQuota(store, 1, T0)).toBe(false);
        expect(await quotaUsed(store, T0)).toBe(DAILY_ROW_LIMIT);
        expect(await takeQuota(store, 1, T0 + 24 * 60 * MIN)).toBe(true); // a new UTC day
        expect(await takeQuota(new MemoryStore(), DAILY_ROW_LIMIT + 1, T0)).toBe(false);
    });
});

describe("cursors and sources", () => {
    it("keeps a cursor", async () => {
        const store = new MemoryStore();
        expect(await getCursor(store, "runs")).toBeUndefined();
        await setCursor(store, "runs", "2026-10-25T12:00:00Z", T0);
        expect(await getCursor(store, "runs")).toBe("2026-10-25T12:00:00Z");
    });

    it("records the first write, the last good one and an error until the next good one", async () => {
        const store = new MemoryStore();
        await recordSource(store, "npm", T0, { ok: true });
        await recordSource(store, "npm", T0 + MIN, { ok: false, error: "token rejected" });
        await recordSource(store, "npm", T0 + 2 * MIN, { ok: false, error: "token rejected" });
        let item = await store.get({ pk: "META#source#npm", sk: "-" });
        expect(item).toMatchObject({ firstAt: T0, lastOkAt: T0, error: "token rejected", errorSince: T0 + MIN });
        await recordSource(store, "npm", T0 + 3 * MIN, { ok: true });
        item = await store.get({ pk: "META#source#npm", sk: "-" });
        expect(item?.error).toBeUndefined();
        expect(item).toMatchObject({ firstAt: T0, lastOkAt: T0 + 3 * MIN });
    });
});
