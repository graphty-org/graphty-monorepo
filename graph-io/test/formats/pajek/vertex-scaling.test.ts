/**
 * The vertex section of a .net file must be linear in the vertex count.
 *
 * It was quadratic until 2026-09-16: under the default options (`nodeIdFrom: "id"` plus
 * `restoreMangledIds: true`) `verticesHeader` allocates `idOfPos`, so every vertex line takes the
 * restore-mode branch of `vertexLine`, whose gap-fill loop restarted at position zero each time.
 * Ascending vertex numbers -- the order Pajek itself writes -- therefore cost n(n-1)/2 iterations:
 * 100k vertices took 2.36 s against 49 ms once the loop resumed from a high-water mark.
 *
 * Nothing in the suite caught it. `test/audit/streaming-quadratic.test.ts` compares INPUT SHAPES at
 * one fixed size and never doubles the vertex count, and it is gated on IO_BENCH=1 besides. This
 * test is deliberately ungated and small enough to run in the default suite: a regression test that
 * only runs behind an env flag would not have caught this one either.
 *
 * The bound is loose on purpose. Quadratic growth multiplies the time by ~16 when the vertex count
 * quadruples; linear growth multiplies it by ~4. Anything under 8 is linear with a wide margin for a
 * loaded host, and the defect missed it by a factor of four.
 */

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { pajekImporter } from "../../../src/formats/pajek/importer.js";

/** A vertices-only .net document with ascending, labelled vertex lines. */
function verticesOnly(count: number): string {
    const lines = [`*Vertices ${count}`];
    for (let i = 1; i <= count; i++) {
        lines.push(`${i} "v${i}"`);
    }
    return `${lines.join("\n")}\n`;
}

/** The fastest of `runs` imports of `text`, in ms (the least disturbed by the host). */
async function best(runs: number, text: string): Promise<number> {
    let fastest = Infinity;
    for (let run = 0; run < runs; run++) {
        const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
        const started = performance.now();
        await pajekImporter.import(text, sink);
        fastest = Math.min(fastest, performance.now() - started);
    }
    return fastest;
}

/** The most quadrupling the vertex count may multiply the time by and still count as linear. */
const QUADRUPLING_BOUND = 8;

describe("Pajek vertex-section scaling", () => {
    it(
        "stays linear in the vertex count under the default options",
        async () => {
            const small = verticesOnly(25_000);
            const large = verticesOnly(100_000);

            // warm the JIT on a throwaway document so the first timed import is not the slow one
            await best(1, verticesOnly(2_000));

            const smallMs = await best(3, small);
            const largeMs = await best(3, large);
            const ratio = largeMs / Math.max(smallMs, 0.001);

            expect(
                ratio,
                `4x the vertices cost ${ratio.toFixed(1)}x the time ` +
                    `(${smallMs.toFixed(0)} ms at 25k, ${largeMs.toFixed(0)} ms at 100k); ` +
                    "linear is about 4x, quadratic about 16x",
            ).toBeLessThan(QUADRUPLING_BOUND);
        },
        { timeout: 120_000 },
    );

    it("numbers the nodes in vertex order whatever the line order", async () => {
        // the gap-fill the high-water mark optimises is what makes this true; pin the behaviour it
        // must not change, at a size where both the old and the new loop are fast
        const ascending = new GraphBuilder({ directed: true });
        await pajekImporter.import(verticesOnly(50), ascending);
        const ascendingSnapshot = ascending.freeze();

        const descendingLines = ["*Vertices 50"];
        for (let i = 50; i >= 1; i--) {
            descendingLines.push(`${i} "v${i}"`);
        }
        const descending = new GraphBuilder({ directed: true });
        await pajekImporter.import(`${descendingLines.join("\n")}\n`, descending);
        const descendingSnapshot = descending.freeze();

        expect(descendingSnapshot.nodeCount).toBe(ascendingSnapshot.nodeCount);
        expect(descendingSnapshot.ids.toArray()).toEqual(ascendingSnapshot.ids.toArray());
    });
});
