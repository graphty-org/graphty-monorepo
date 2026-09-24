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
 * The two sizes are 16x apart, not 4x, because the two measurements can run on cores of different
 * speed. The development host is a hybrid Intel part (P-cores 0-15, E-cores 16-31) and the kernel
 * moves a vitest worker between them freely. Pinned with taskset, the importer is linear on either
 * core type (25k -> 100k costs 4.0-4.7x) but an E-core runs it 1.6-1.9x slower, so small-on-a-P-core
 * then large-on-an-E-core measured 6.7-7.1x -- and 8.0x in the two pre-push failures, against the
 * old bound of 8. At 4x apart the gap between linear (4) and quadratic (16) is too narrow to absorb
 * a 2x core-speed swing: the quadratic importer measured large-on-P / small-on-E only reached 8.6-10.5x.
 * At 16x apart, the linear importer measures 18-24x on one core and 28-33x with the P-to-E swing,
 * and the quadratic one 113-134x even with the swing working against it; 64 sits between with about
 * a 2x margin each side. The rounds interleave the sizes so both minima usually come from the same
 * kind of core.
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

/** One import of `text`, in ms. */
async function timed(text: string): Promise<number> {
    const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const started = performance.now();
    await pajekImporter.import(text, sink);
    return performance.now() - started;
}

/** The most multiplying the vertex count by 16 may multiply the time by and still count as linear. */
const SIXTEENFOLD_BOUND = 64;

describe("Pajek vertex-section scaling", () => {
    it(
        "stays linear in the vertex count under the default options",
        async () => {
            const small = verticesOnly(6_250);
            const large = verticesOnly(100_000);

            // warm the JIT on a throwaway document so the first timed import is not the slow one
            await timed(verticesOnly(2_000));

            // the fastest of three per size (the least disturbed), the sizes interleaved
            let smallMs = Infinity;
            let largeMs = Infinity;
            for (let round = 0; round < 3; round++) {
                smallMs = Math.min(smallMs, await timed(small));
                largeMs = Math.min(largeMs, await timed(large));
            }
            const ratio = largeMs / Math.max(smallMs, 0.001);

            expect(
                ratio,
                `16x the vertices cost ${ratio.toFixed(1)}x the time ` +
                    `(${smallMs.toFixed(1)} ms at 6.25k, ${largeMs.toFixed(0)} ms at 100k); ` +
                    "linear is about 16x, quadratic about 256x",
            ).toBeLessThan(SIXTEENFOLD_BOUND);
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
