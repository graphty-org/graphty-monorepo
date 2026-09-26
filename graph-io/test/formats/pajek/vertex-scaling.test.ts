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
 * It counts work rather than time: the reads of the importer's per-vertex id table, which the
 * gap-fill loop walks. A time ratio between two sizes also measured the machine (on a hybrid CPU
 * the two runs can land on cores of different speed); the count is the same on every run.
 */

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { pajekImporter } from "../../../src/formats/pajek/importer.js";
import { arrayReadsOfLength } from "../../helpers/work-meter.js";

/** A vertices-only .net document with ascending, labelled vertex lines. */
function verticesOnly(count: number): string {
    const lines = [`*Vertices ${count}`];
    for (let i = 1; i <= count; i++) {
        lines.push(`${i} "v${i}"`);
    }
    return `${lines.join("\n")}\n`;
}

/** The reads of the per-vertex id table while importing a vertices-only document of `count` lines. */
async function idTableReads(count: number): Promise<number> {
    const text = verticesOnly(count);
    const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const reads = await arrayReadsOfLength(count, () => pajekImporter.import(text, sink).then(() => undefined));
    expect(sink.nodeCount).toBe(count);
    return reads;
}

/** The most reads of the id table per vertex (the restarting gap-fill read about count / 2). */
const READS_PER_VERTEX_BOUND = 10;

describe("Pajek vertex-section scaling", () => {
    it("reads the per-vertex id table a bounded number of times per vertex under the default options", async () => {
        for (const count of [1_000, 10_000]) {
            const reads = await idTableReads(count);
            expect(
                reads,
                `${count} vertices read the id table ${reads} times; linear is a few per vertex, quadratic about ${count / 2}`,
            ).toBeLessThan(READS_PER_VERTEX_BOUND * count);
        }
    });

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
