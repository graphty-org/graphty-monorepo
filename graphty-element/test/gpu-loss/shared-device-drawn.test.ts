/**
 * @file The layout fills the row table on the GPU (design/rendering/row-renderer.md 4.5): under
 * renderPath "batched" on a shared device, a landing copies the batch's drawn ring slot into the
 * `rowPosition` texture, so a running layout uploads no positions, and the texture holds what the CPU
 * copy holds. Under "objects" nothing changes. A software adapter never shares, so it is made to say
 * it is hardware.
 */

import { assert, describe, it } from "vitest";

import { adapterSays, copied, landed, nextFrame, open, running, startLayout, textureDiff } from "./shared-device";

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
});
