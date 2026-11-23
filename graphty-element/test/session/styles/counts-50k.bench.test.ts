/**
 * @file What `styles.counts()` costs on 50,000 nodes and 250,000 edges under the starting rows the
 * graphty app draws (Everything with the base look, Ghost, Pinned, Selected and Hovered) while a
 * time window slides: the read a layer list makes for every row on each render, which held a
 * time-window drag in the app for over a second (issue #7966).
 *
 * Each round moves the window one step, so no reading is kept from the round before, then reads
 * `counts` for every layer once. The median and slowest of the rounds print as `[counts-50k]`,
 * with the stack walks the reads took.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: with no binding reading data, the Everything layer's read walks
 * the stack once per distinct set of layers that apply, not once per node. The timings print and
 * are never asserted: a stopwatch on a busy machine measures the machine. Run with:
 * npx vitest run --project=bench test/session/styles/counts-50k.bench.test.ts
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { countCounters } from "../../../src/session/styles/explain";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = 50_000;
const EDGES = 250_000;
const ROUNDS = 9;

describe("styles.counts on 50,000 nodes under the starting rows", () => {
    let session: GraphSession;

    beforeAll(async () => {
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

    it("reads every layer's counts once a window step", async () => {
        const layers = session.styles.list();
        assert.isAtLeast(layers.length, 5, "the starting rows are drawn");
        const everything = layers.find((layer) => layer.name === "Everything" && layer.target === "node");
        assert.isDefined(everything);

        const times: number[] = [];
        const perLayer = new Map<string, number[]>();
        let everythingWalks = 0;
        for (let round = 0; round < ROUNDS; round++) {
            await session.time.window({ from: (round + 1) * 4, to: 600 + (round + 1) * 4 });
            const start = performance.now();
            for (const layer of layers) {
                const before = countCounters.walks;
                const begun = performance.now();
                session.styles.counts(layer.id);
                const name = `${layer.name}/${layer.target}`;
                perLayer.set(name, [...(perLayer.get(name) ?? []), performance.now() - begun]);
                if (layer.id === everything?.id) {
                    everythingWalks = countCounters.walks - before;
                }
            }
            times.push(performance.now() - start);
        }

        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        console.log(
            `[counts-50k] ${String(layers.length)} layers, ${String(ROUNDS)} rounds: median ${median.toFixed(1)} ms, ` +
                `slowest ${(sorted.at(-1) ?? 0).toFixed(1)} ms, Everything (nodes) walked ${String(everythingWalks)} times`,
        );

        const medianOf = (values: readonly number[]): number =>
            [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
        console.log(
            `[counts-50k] per layer, median ms: ${[...perLayer].map(([name, values]) => `${name} ${medianOf(values).toFixed(1)}`).join(", ")}`,
        );

        // Ghosted or not, pinned, selected and hovered: a handful of looks, never one per node.
        assert.isAtMost(everythingWalks, 16, "one walk per distinct set of layers that apply");
        assert.isAbove(everythingWalks, 0, "the layer was walked");
    });
});
