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
import {
    adapterSays,
    landed,
    layoutOf,
    nextFrame,
    open,
    running,
    submitLayout,
    textureDiff,
    unmount,
} from "./shared-device";

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
        const measured = engine.envelopeRowsWalked;
        await landed(graph);
        await landed(graph);
        await landed(graph);
        // the fit-to-view envelope came from the device: no row walked for it either (issue #8801)
        assert.strictEqual(engine.envelopeRowsWalked - measured, 0);

        // each landing went up as read back, and no row was written, repacked or walked on the CPU for it
        assert.isAtLeast(table.landedUploads - landedUploads, 2);
        assert.strictEqual(table.copies, 0);
        assert.strictEqual(lane.changes - written, 0);
        assert.strictEqual(table.repackedRows - repackedRows, 0);
        assert.strictEqual(engine.rowsWalked - walked, 0);
        // yet the public generation says the coordinates moved, once a landing
        assert.isAtLeast(lane.generation - generation, 3);

        // a read of one node answers where the texture shows it and writes no row; a read of the table writes them
        const at = graph.getNode("n0")?.getPosition();
        assert.isTrue(Number.isFinite(at?.x));
        assert.strictEqual(lane.changes - written, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
        assert.isAbove(lane.changes - written, 0);
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

    it("fits a running layout from the device's envelope as a CPU walk would (issue #8801)", async () => {
        const graph = await running("batched", undefined, "webgl");
        const engine = layoutOf(graph);
        await uploadedLanding(graph);
        await landed(graph);
        const both = engine.envelopeAgreement();
        assert.isNotNull(both);
        const { device, walked } = both;
        assert.isNotNull(device, "the landing the array holds was measured on the device");
        assert.strictEqual(device.placed, walked.placed);
        assert.deepStrictEqual(device.box, walked.box, "the box is exact");
        const { box } = walked;
        const span = Math.max(box[3] - box[0], box[4] - box[1], box[5] - box[2]);
        assert.isAbove(box[5] - box[2], 0, "a 3D layout, so z counts in the radius");
        device.centre.forEach((value, axis) => {
            assert.approximately(value, walked.centre[axis], span * 1e-5, `centre ${String(axis)}`);
        });
        assert.approximately(device.scale / walked.scale, 1, 1e-5, "the scale");
    });

    it("frames a settled layout from the device's envelope as from a CPU walk (issue #8801)", async () => {
        const settled = async (device: boolean): Promise<{ walked: number; graph: Graph }> => {
            const graph = await open("auto", "webgl");
            graph.setRenderPath("batched");
            await submitLayout(graph, 120, 7);
            const engine = layoutOf(graph);
            engine.deviceEnvelope = device;
            const walked = engine.envelopeRowsWalked;
            await graph.waitForSettled();
            await graph.waitForStableFrame();
            return { walked: engine.envelopeRowsWalked - walked, graph };
        };
        // Taken for hardware, as `running` does, or "auto" runs the layout on the CPU on a software adapter (CI's).
        adapterSays("test-hardware");
        const fromDevice = await settled(true);
        // The settled landing is fitted by the device's envelope, which agrees with a CPU walk of the same rows.
        // Compared within one run: two seeded runs on a software adapter need not lay out to the same bits.
        const both = layoutOf(fromDevice.graph).envelopeAgreement();
        assert.isNotNull(both);
        const { device, walked } = both;
        assert.isNotNull(device, "the settled landing was measured on the device");
        assert.isAbove(walked.box[5] - walked.box[2], 0, "a 3D layout, so z counts in the radius");
        assert.approximately(device.scale / walked.scale, 1, 1e-5, "the scale");
        const span = Math.max(...walked.box.slice(3).map((max, axis) => max - walked.box[axis]));
        device.centre.forEach((value, axis) => {
            assert.approximately(value, walked.centre[axis], span * 1e-5, `centre ${String(axis)}`);
        });
        unmount();

        // the device measured the running layout's fits, the walk measured every one of them
        const fromWalk = await settled(false);
        assert.isBelow(fromDevice.walked, fromWalk.walked);
    });

    it("draws every landing of a running layout on demand (issue #8801)", async () => {
        const graph = await running("batched", undefined, "webgl");
        graph.setLayoutBehavior({ rendering: { onDemand: true } });
        const engine = layoutOf(graph);
        const drawn: number[] = [];
        const watch = graph.scene.onAfterRenderObservable.add(() => {
            drawn.push(engine.landedBatchesPublished);
        });
        for (let i = 0; i < 5; i++) {
            await landed(graph);
        }
        // the newest landing reaches the screen
        while (drawn.at(-1) !== engine.landedBatchesPublished) {
            await nextFrame();
        }
        graph.scene.onAfterRenderObservable.remove(watch);

        assert.isAtLeast(new Set(drawn).size, 5, "every landing was drawn");
    });

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
