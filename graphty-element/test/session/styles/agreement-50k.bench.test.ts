/**
 * @file What `styles.agreement()` costs on 50,000 nodes and 250,000 edges under the starting rows the
 * graphty app draws while a time window slides: the readings a style panel takes for each row on
 * every render (what lies beneath the row, and what paints over it), which held a filter change in
 * the app for about 6 s (issue #7966).
 *
 * Each round moves the window one step, so no reading is kept from the round before, then reads
 * the panel's readings for every row once. The median and slowest of the rounds print as
 * `[agreement-50k]`, with the stack walks the reads took.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: with no binding reading data, a read walks the stack once per
 * distinct set of layers that apply, not once per element. The timings print and are never
 * asserted: a stopwatch on a busy machine measures the machine. Run with:
 * npx vitest run --project=bench test/session/styles/agreement-50k.bench.test.ts
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { agreementCounters } from "../../../src/session/styles/explain";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = 50_000;
const EDGES = 250_000;
const ROUNDS = 9;

describe("styles.agreement on 50,000 nodes under the starting rows", () => {
    let session: GraphSession;

    beforeAll(async () => {
        setDefaultFeatures(["timeline"]);
        session = createGraphSession();
        await session.config.set({ startingRows: true, editableBase: true });
        let seed = 7;
        const next = (): number => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        const nodes = Array.from({ length: NODES }, (_unused, i) => ({
            id: `n${String(i)}`,
            kind: `k${String(i % 10)}`,
            t: Math.floor(next() * 1000),
        }));
        const edges = Array.from({ length: EDGES }, () => ({
            source: `n${String(Math.floor(next() * NODES))}`,
            target: `n${String(Math.floor(next() * NODES))}`,
        }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
        await session.time.setField({ nodes: { start: "t", unit: "ordinal" } });
        await session.time.setSettings({ outside: "ghost" });
        await session.time.window({ from: 0, to: 600 });
        await session.styles.settled();
    });

    afterAll(() => {
        session.dispose();
    });

    it("reads every row's panel readings once a window step", async () => {
        const rows = session.styles.tree().filter((row) => row.kind === "layer");
        assert.isAtLeast(rows.length, 4, "the starting rows are drawn");

        const times: number[] = [];
        let walks = 0;
        for (let round = 0; round < ROUNDS; round++) {
            await session.time.window({ from: (round + 1) * 4, to: 600 + (round + 1) * 4 });
            const before = agreementCounters.walks;
            const start = performance.now();
            session.styles.agreement("graph");
            for (const row of rows) {
                session.styles.agreement("graph", undefined, { below: row.id, over: row.id });
                session.styles.agreement("graph", undefined, { over: row.id });
            }
            times.push(performance.now() - start);
            walks = agreementCounters.walks - before;
        }

        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        const reads = 1 + 2 * rows.length;
        console.log(
            `[agreement-50k] ${String(rows.length)} rows, ${String(reads)} reads, ${String(ROUNDS)} rounds: ` +
                `median ${median.toFixed(1)} ms, slowest ${(sorted.at(-1) ?? 0).toFixed(1)} ms, ${String(walks)} walks a round`,
        );

        // Ghosted or not, pinned, selected and hovered: a handful of looks per read, never one per element.
        assert.isAtMost(walks, reads * 32, "one walk per distinct set of layers that apply");
        assert.isAbove(walks, 0, "the stack was walked");
    });
});
