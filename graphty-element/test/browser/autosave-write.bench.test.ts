/**
 * @file What an autosave write costs, and what a restore holds in memory, at 10,000, 50,000 and
 * 100,000 nodes, against the budgets of design/work-protection/design.md section 5.4. Recorded,
 * never asserted: every row prints as `[autosave-bench]` and as a `bench-row` the `browser-bench`
 * project appends to `benchmarks/results/browser-<host>.jsonl`. It gates nothing.
 *
 * Runs in Chromium (the `browser-bench` project) over the real IndexedDB store, with no renderer:
 * the cost of a write is building its parts on the main thread (`buildParts`, synchronous, so its
 * stopwatch is exact) and committing them (asynchronous, mostly off the main thread). Each size runs
 * three times: a write after a data change (every part) and an ordinary write after a settings change
 * (the `rest` part only).
 *
 * The restore's memory peak is the largest `performance.memory.usedJSHeapSize` seen between a full
 * collection and the restore settling, sampled at every turn of the event loop; the page runs with
 * `--enable-precise-memory-info` and `--expose-gc`. A synchronous step (parsing the data part) is
 * seen only after it returns, so the figure is a floor of the true peak.
 *
 * Budgets (design 5.4, at 50,000 nodes): an ordinary write 10 to 20 ms of main thread and up to
 * 2 MB; a write after a data change about 0.7 s and 14 MB.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { indexedDbAutosaveStore } from "../../src/autosave/indexedDbStore";
import { buildParts, EVERY_PART, type PartTag } from "../../src/autosave/parts";

const SIZES = [10_000, 50_000, 100_000];
const RUNS = 3;

/**
 * A session holding a ring of `n` nodes, each with a `probe` attribute.
 * @param n - The node count.
 * @returns The session.
 */
async function ring(n: number): Promise<GraphSession> {
    const session = createGraphSession();
    const ids = Array.from({ length: n }, (_, i) => `n${i}`);
    await session.data.addNodes(ids.map((id) => ({ id, probe: 0 })));
    await session.data.addEdges(ids.map((id, i) => ({ source: id, target: ids[(i + 1) % n] })));
    return session;
}

/**
 * Build the parts a write of `tags` carries, timed.
 * @param session - The session.
 * @param tags - The parts.
 * @returns Main-thread milliseconds and the bytes built.
 */
function build(session: GraphSession, tags: readonly PartTag[]): { ms: number; bytes: number } {
    const start = performance.now();
    const { parts } = buildParts(session, new Set(tags), new Map(), new Map());
    const ms = performance.now() - start;
    const bytes = Object.values(parts).reduce((sum, text) => sum + (text?.length ?? 0), 0);
    return { ms, bytes };
}

/**
 * Print one row.
 * @param row - The row.
 */
function record(row: Record<string, unknown>): void {
    console.log(`[autosave-bench] ${JSON.stringify(row)}`);
    console.log(
        `bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "browser", agent: navigator.userAgent, ...row })}`,
    );
}

/**
 * The JavaScript heap in use, in bytes (Chromium only).
 * @returns The bytes, or null.
 */
function heap(): number | null {
    return (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
}

describe("autosave write cost and restore memory (recorded, never asserted)", () => {
    it.each(SIZES)("%i nodes", async (n) => {
        const name = `graphty-autosave-bench-${n}`;
        const session = await ring(n);
        const store = indexedDbAutosaveStore({ name });
        const saver = new Autosaver({ session, store, key: "bench" });
        await saver.recover();

        for (let run = 1; run <= RUNS; run++) {
            await session.data.updateNodes(
                Array.from({ length: n }, (_, i) => ({ id: `n${i}`, values: { probe: run } })),
            );
            const data = build(session, EVERY_PART);
            let start = performance.now();
            await saver.flush();
            const dataFlushMs = performance.now() - start;
            assert.strictEqual(saver.status.state, "saved", "the data write committed");

            await session.config.set({ name: `run ${run}` });
            const ordinary = build(session, ["rest"]);
            start = performance.now();
            await saver.flush();
            const ordinaryFlushMs = performance.now() - start;
            assert.strictEqual(saver.status.state, "saved", "the ordinary write committed");

            record({
                name: "autosave write",
                nodes: n,
                run,
                dataBuildMs: Math.round(data.ms),
                dataBytes: data.bytes,
                dataFlushMs: Math.round(dataFlushMs),
                ordinaryBuildMs: Math.round(ordinary.ms * 10) / 10,
                ordinaryBytes: ordinary.bytes,
                ordinaryFlushMs: Math.round(ordinaryFlushMs),
            });
        }

        saver.stop();
        await saver.settled();
        await store.close();

        // A restore into a fresh session, as the next load of the page does.
        const { gc } = globalThis as { gc?: () => void };
        gc?.();
        const base = heap();
        let peak = base ?? 0;
        let sampling = true;
        const sample = (): void => {
            peak = Math.max(peak, heap() ?? 0);
            if (sampling) {
                setTimeout(sample, 0);
            }
        };
        sample();
        const fresh = createGraphSession();
        const readStore = indexedDbAutosaveStore({ name });
        const reader = new Autosaver({ session: fresh, store: readStore, key: "bench" });
        const start = performance.now();
        const restored = await reader.recover();
        const restoreMs = performance.now() - start;
        sampling = false;
        assert.isNotNull(restored, "the work came back");
        assert.strictEqual(fresh.data.snapshot().nodeCount, n);
        record({
            name: "autosave restore",
            nodes: n,
            restoreMs: Math.round(restoreMs),
            heapPeakMB: base === null ? null : Math.round((peak - base) / 2 ** 20),
        });
        reader.stop();
        await readStore.close();
        await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
        });
    });
});
