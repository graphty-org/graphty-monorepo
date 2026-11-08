/**
 * @file The layout fills the row table on the GPU (design/rendering/row-renderer.md 4.5): under
 * renderPath "batched" on a shared device, a landing copies the batch's drawn ring slot into the
 * `rowPosition` texture, so a running layout uploads no positions, and the texture holds what the CPU
 * copy holds. Under "objects" nothing changes. A software adapter never shares, so it is made to say
 * it is hardware.
 */

import { assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { adapterSays, landed, open, startLayout } from "./shared-device";

/**
 * Opens a graph on the given path with a running layout.
 * @param path - The render path.
 * @returns The graph.
 */
async function running(path: "objects" | "batched"): Promise<Graph> {
    adapterSays("test-hardware");
    const graph = await open();
    graph.setRenderPath(path);
    await startLayout(graph);
    assert.strictEqual(graph.rendererStatus?.layoutDevice, "shared");
    return graph;
}

describe("the layout filling the row table on a shared device", () => {
    it("copies each landing into the texture and uploads no positions while it runs", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        // the ring is attached a batch after the load; wait for it to land once
        await landed(graph);
        await landed(graph);
        const { copies } = table;
        const uploads = table.positionUploads;
        for (let i = 0; i < 5; i++) {
            await landed(graph);
        }

        assert.isAtLeast(table.copies - copies, 5);
        assert.strictEqual(table.positionUploads - uploads, 0);

        // no frame between the CPU copy read and the texture read; the frame's publish reaches the CPU copy
        // at the next frame's repack, so that repack is run here
        graph.engine.stopRenderLoop();
        table.flush();
        assert.strictEqual(table.positionUploads - uploads, 0);
        const cpu = table.rowPosition.slice(0, 4 * table.rows);
        const gpu = (await table.positionTexture.readPixels()) as Float32Array;
        let worst = 0;
        for (let i = 0; i < cpu.length; i++) {
            worst = Math.max(
                worst,
                Math.abs((gpu[i] ?? Number.NaN) - (cpu[i] ?? 0)) / Math.max(1, Math.abs(cpu[i] ?? 0)),
            );
        }

        assert.isBelow(worst, 1e-5);
    });

    it("never copies under objects", async () => {
        const graph = await running("objects");
        const table = graph.getRowTable();
        for (let i = 0; i < 3; i++) {
            await landed(graph);
        }

        assert.strictEqual(table?.copies ?? 0, 0);
    });
});
