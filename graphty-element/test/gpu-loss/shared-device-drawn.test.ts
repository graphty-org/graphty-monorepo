/**
 * @file The layout fills the row table on the GPU (design/rendering/row-renderer.md 4.5): under
 * renderPath "batched" on a shared device, a landing copies the batch's drawn ring slot into the
 * `rowPosition` texture, so a running layout uploads no positions, and the texture holds what the CPU
 * copy holds. Under "objects" nothing changes. A software adapter never shares, so it is made to say
 * it is hardware. At rest the texture holds what the upload path would have sent, and a click while
 * the layout runs picks the node where the card shows it.
 */

import { assert, describe, it } from "vitest";

import { WRITABLE_LANE } from "../../src/data/lane";
import { click } from "../helpers/real-input";
import {
    adapterSays,
    copied,
    landed,
    layoutOf,
    nextFrame,
    open,
    running,
    startLayout,
    submitLayout,
    textureDiff,
} from "./shared-device";

describe("the layout filling the row table on a shared device", () => {
    it("copies each landing into the texture and uploads no positions while it runs", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        // the ring is attached a batch after the load
        await copied(graph);
        const { copies } = table;
        const uploads = table.positionUploads;
        await landed(graph);
        await landed(graph);

        assert.isAtLeast(table.copies - copies, 2);
        assert.strictEqual(table.positionUploads - uploads, 0);

        const uploadsBeforeRead = table.positionUploads;
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
        assert.strictEqual(table.positionUploads - uploadsBeforeRead, 0);
    });

    it("touches no row on the CPU per landing, and publishes the rows when something reads them", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await copied(graph);
        await landed(graph);
        const lane = graph.getDataManager()[WRITABLE_LANE];
        const engine = layoutOf(graph);
        const { copies, repackedRows } = table;
        const written = lane.generation;
        const walked = engine.rowsWalked;
        await landed(graph);
        await landed(graph);
        await landed(graph);

        // each landing went up by copy, and no row was written, repacked or walked on the CPU for it
        assert.isAtLeast(table.copies - copies, 2);
        assert.strictEqual(lane.generation - written, 0);
        assert.strictEqual(table.repackedRows - repackedRows, 0);
        assert.strictEqual(engine.rowsWalked - walked, 0);

        // a read publishes the rows the card shows
        const at = graph.getNode("n0")?.getPosition();
        assert.isTrue(Number.isFinite(at?.x));
        assert.isAbove(lane.generation - written, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
    });

    it("shows the rows added while it runs once the layout places them", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await copied(graph);
        const added = Array.from({ length: 40 }, (_, i) => ({ id: `added${String(i)}` }));
        await graph.addNodes(added);
        await graph.addEdges(added.map((node, i) => ({ src: node.id, dst: `n${String(i)}` })));
        const { copies } = table;
        const shown = (): number =>
            Array.from(table.rowPosition.subarray(0, 4 * table.rows)).filter((v, i) => i % 4 === 3 && v === 1).length;
        // the rows show once a landing places them, and only a copy puts that landing in the texture
        while (table.copies === copies || shown() <= 200) {
            await nextFrame();
        }

        assert.isAbove(table.copies - copies, 0);
        assert.isAbove(shown(), 200);
        const diff = await textureDiff(graph);
        assert.isBelow(diff.wWorst, 1e-5);
        assert.isBelow(diff.worst, 1e-5);
    });

    it("never copies under objects, even with the row table open", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        graph.setRenderPath("objects");
        // under "objects" the table is only opened by tests and the benchmark harness; opened, it would
        // take landings from the ring if the path did not keep the ring off
        const table = graph.openRowTable();
        await startLayout(graph);
        assert.strictEqual(graph.rendererStatus?.layoutDevice, "shared");
        assert.isNull(graph.getDrawnTarget());
        const uploads = table.positionUploads;
        await landed(graph);
        await landed(graph);

        assert.strictEqual(table.copies, 0);
        assert.isNull(table.drawnMirror);
        assert.isAbove(table.positionUploads - uploads, 0);
    });

    it("rests with the texture equal to what the upload path sends", async () => {
        const graph = await running("batched", 150);
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await copied(graph);
        const { copies } = table;
        while (!layoutOf(graph).isSettled) {
            await nextFrame();
        }
        // the settling batch repacks from the lane, which is the upload path
        await graph.waitForSettled();

        assert.isAbove(table.copies, 0);
        assert.isAtLeast(table.copies, copies);
        const diff = await textureDiff(graph);
        assert.isBelow(diff.worst, 1e-6);
        assert.isBelow(diff.wWorst, 1e-6);
    });

    it("draws its first landings at the size the layout measures", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        graph.setRenderPath("batched");
        await submitLayout(graph);
        // the farthest any node stands from the origin, over the first landings: a seeded ForceAtlas2
        // spreads some 3,000 times over in its first batches, and a landing drawn with the map measured
        // before them stood some 2,000 times the size of the next (#6584)
        const reach = (): number =>
            Math.max(
                ...Array.from({ length: 200 }, (_, i) => {
                    const { x, y, z } = graph.getNode(`n${String(i)}`)?.getPosition() ?? { x: 0, y: 0, z: 0 };
                    return Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
                }),
            );
        const reaches: number[] = [];
        for (let i = 0; i < 4; i++) {
            await landed(graph);
            reaches.push(reach());
        }

        assert.isAbove(graph.getRowTable()?.copies ?? 0, 0);
        assert.isBelow(Math.max(...reaches) / Math.min(...reaches), 2, reaches.join(", "));
    });

    it("selects the node a click lands on while the layout copies", async () => {
        const graph = await running("batched");
        await copied(graph);
        // the node farthest from its nearest neighbour on screen, framed whole, so the click can only
        // land on it
        const shown = Array.from({ length: 200 }, (_, i) => `n${String(i)}`).flatMap((id) => {
            const at = graph.nodeScreenPosition(id);
            return at?.visible === true ? [{ id, x: at.x, y: at.y }] : [];
        });
        const gap = (node: { x: number; y: number }): number =>
            Math.min(
                ...shown
                    .filter((other) => other !== node)
                    .map((other) => Math.hypot(other.x - node.x, other.y - node.y)),
            );
        const target = shown.reduce((best, node) => (gap(node) > gap(best) ? node : best)).id;
        await graph.zoomToNodes(target, { extent: "drawn" });
        await copied(graph);
        // textureDiff stops the frames, so the node stands where the card shows it while the pointer
        // travels; the layout is still mid-run, with its batch in flight
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
        assert.isFalse(layoutOf(graph).isSettled);
        const at = graph.nodeScreenPosition(target);
        assert.isTrue(at?.visible);
        assert.isNull(graph.getSelectedNode());

        await click(graph.canvas, { x: at?.x ?? 0, y: at?.y ?? 0 });
        // Babylon tells a tap from a double tap after the release, so the selection follows it
        while (graph.getSelectedNode() === null) {
            await nextFrame();
        }

        assert.strictEqual(graph.getSelectedNode()?.id, target);
    });
});
