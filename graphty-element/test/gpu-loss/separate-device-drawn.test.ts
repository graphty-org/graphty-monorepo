/**
 * @file The layout fills the row table from its own device (design/rendering/row-renderer.md 4.5):
 * under renderPath "batched" on WebGL, which shares no device with the accelerator, a landing reads the
 * batch's drawn ring slot back in the batch's one mapped readback and sends it to the `rowPosition`
 * texture as it came, so no row is written, repacked or walked on the CPU per landing, and the texture
 * holds what the CPU copy holds once something reads the rows. Under "objects" nothing changes.
 */

import { assert, describe, it } from "vitest";

import { WRITABLE_LANE } from "../../src/data/lane";
import type { Graph } from "../../src/Graph";
import { landed, layoutOf, nextFrame, running, textureDiff } from "./shared-device";

/**
 * Waits for the layout to send a landing's drawn rows to the texture, after this call.
 * @param graph - The graph.
 */
async function uploadedLanding(graph: Graph): Promise<void> {
    const table = graph.getRowTable();
    assert.isNotNull(table);
    const before = table.landedUploads;
    while (table.landedUploads <= before) {
        await nextFrame();
    }
}

describe("the layout filling the row table from a separate device", () => {
    it("touches no row on the CPU per landing, and publishes the rows when something reads them", async () => {
        const graph = await running("batched", undefined, "webgl");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await uploadedLanding(graph);
        await landed(graph);
        const lane = graph.getDataManager()[WRITABLE_LANE];
        const engine = layoutOf(graph);
        const { landedUploads, repackedRows } = table;
        const written = lane.changes;
        const { generation } = lane;
        const walked = engine.rowsWalked;
        await landed(graph);
        await landed(graph);
        await landed(graph);

        // each landing went up as read back, and no row was written, repacked or walked on the CPU for it
        assert.isAtLeast(table.landedUploads - landedUploads, 2);
        assert.strictEqual(table.copies, 0);
        assert.strictEqual(lane.changes - written, 0);
        assert.strictEqual(table.repackedRows - repackedRows, 0);
        assert.strictEqual(engine.rowsWalked - walked, 0);
        // yet the public generation says the coordinates moved, once a landing
        assert.isAtLeast(lane.generation - generation, 3);

        // a read publishes the rows the texture shows
        const at = graph.getNode("n0")?.getPosition();
        assert.isTrue(Number.isFinite(at?.x));
        assert.isAbove(lane.changes - written, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
    });

    it("draws a layout switched to while a landing is owed", async () => {
        const graph = await running("batched", undefined, "webgl");
        await uploadedLanding(graph);
        await landed(graph);
        const lane = graph.getDataManager()[WRITABLE_LANE];
        const written = lane.changes;
        await landed(graph);
        assert.strictEqual(lane.changes - written, 0);

        await graph.setLayout("circular");
        await nextFrame();
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
    });

    for (const renderer of ["webgl", "webgpu"] as const) {
        it(`frames a landing owed on ${renderer} by the box its rows are in (issue #8427)`, async () => {
            const graph = await running("batched", undefined, renderer);
            await landed(graph);
            const lane = graph.getDataManager()[WRITABLE_LANE];
            const engine = layoutOf(graph);
            await landed(graph);
            const written = lane.changes;
            await landed(graph);
            assert.strictEqual(lane.changes - written, 0, "the landing is owed, not written");
            const owed = Float64Array.from(engine.publishedBounds() ?? []);

            // reading every row writes the owed publish: the rows' own box, and the box the written path reports
            const rows = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
            for (const node of graph.getNodes()) {
                const { x, y, z } = node.getPosition();
                [x, y, z].forEach((value, axis) => {
                    rows[axis] = Math.min(rows[axis], value);
                    rows[axis + 3] = Math.max(rows[axis + 3], value);
                });
            }
            assert.isAbove(lane.changes - written, 0);
            const writtenBox = Array.from(engine.publishedBounds() ?? []);

            assert.lengthOf(owed, 6);
            const span = Math.max(rows[3] - rows[0], rows[4] - rows[1], rows[5] - rows[2]);
            owed.forEach((value, i) => {
                assert.approximately(value, rows[i], span * 1e-5, `owed box [${String(i)}] against the rows`);
                assert.approximately(value, writtenBox[i], span * 1e-5, `owed box [${String(i)}] against the written`);
            });
        });
    }

    it("publishes every landing on the CPU under renderPath objects", async () => {
        const graph = await running("objects", undefined, "webgl");
        const lane = graph.getDataManager()[WRITABLE_LANE];
        await landed(graph);
        const written = lane.changes;
        await landed(graph);
        await landed(graph);

        assert.isNull(graph.getRowTable());
        assert.isAtLeast(lane.changes - written, 2);
    });
});
