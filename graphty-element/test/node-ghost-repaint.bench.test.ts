/**
 * @file What it costs to repaint many nodes with a paint that changes only their fill's opacity:
 * what a filter change or the time window does to every node it ghosts or brings back (#7966).
 *
 * Runs in the `bench` project (npx vitest run --project=bench test/node-ghost-repaint.bench.test.ts),
 * never under coverage. Prints, as `[node-ghost-repaint]`, the median over the rounds of one
 * repaint of every node, asked about and drawn as `UpdateManager.paintNodes` does it.
 *
 * Measured on the development machine (i9-14900), 2026-11-16, 20,000 nodes, median of 5 rounds:
 * 456 ms when each node compared its whole style with the drawn one four times, 264 ms with one
 * comparison kept between the two calls. The counted-work assertion is node-ghost-repaint.test.ts.
 */
import { afterAll, assert, describe, it } from "vitest";

import { ghostNodes, repaint } from "./helpers/ghost-repaint";

const NODES = 20_000;
const ROUNDS = 5;

describe("repainting nodes with only a new fill opacity", () => {
    const built = ghostNodes(NODES);

    afterAll(() => {
        built.dispose();
    });

    it("prints the time per repaint", () => {
        const times: number[] = [];
        for (let round = 0; round < ROUNDS; round++) {
            const start = performance.now();
            const rebuilt = repaint(built.nodes, round % 2 === 0 ? 0.2 : undefined);
            times.push(performance.now() - start);
            assert.strictEqual(rebuilt, 0, "an opacity change moves every mesh rather than rebuilding it");
        }

        times.sort((a, b) => a - b);
        console.log(`[node-ghost-repaint] ${String(NODES)} nodes, median ${times[ROUNDS >> 1].toFixed(0)} ms`, times);
    });
});
