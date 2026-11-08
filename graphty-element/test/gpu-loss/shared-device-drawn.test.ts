/**
 * @file The layout fills the row table on the GPU (design/rendering/row-renderer.md 4.5): under
 * renderPath "batched" on a shared device, a landing copies the batch's drawn ring slot into the
 * `rowPosition` texture, so a running layout uploads no positions, and the texture holds what the CPU
 * copy holds. Under "objects" nothing changes. A software adapter never shares, so it is made to say
 * it is hardware.
 */

import { assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";
import { adapterSays, deviceOf, landed, nextFrame, open, startLayout } from "./shared-device";

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

/**
 * The worst relative difference between the `rowPosition` texture and the CPU copy, read with no frame
 * between them. The frame's publish reaches the CPU copy at the next frame's repack, so that repack is
 * run here.
 * @param graph - The graph.
 * @returns The worst difference over every lane, and over the w lanes alone.
 */
async function textureDiff(graph: Graph): Promise<{ worst: number; wWorst: number }> {
    const table = graph.getRowTable();
    assert.isNotNull(table);
    graph.engine.stopRenderLoop();
    table.flush();
    const cpu = table.rowPosition.slice(0, 4 * table.rows);
    const gpu = (await table.positionTexture.readPixels()) as Float32Array;
    let worst = 0;
    let wWorst = 0;
    for (let i = 0; i < cpu.length; i++) {
        const d = Math.abs((gpu[i] ?? Number.NaN) - (cpu[i] ?? 0)) / Math.max(1, Math.abs(cpu[i] ?? 0));
        worst = Math.max(worst, d);
        wWorst = i % 4 === 3 ? Math.max(wWorst, d) : wWorst;
    }

    return { worst, wWorst };
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

        const uploadsBeforeRead = table.positionUploads;
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
        assert.strictEqual(table.positionUploads - uploadsBeforeRead, 0);
    });

    it("shows the rows added while it runs once the layout places them", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await landed(graph);
        await landed(graph);
        const added = Array.from({ length: 40 }, (_, i) => ({ id: `added${String(i)}` }));
        await graph.addNodes(added);
        await graph.addEdges(added.map((node, i) => ({ src: node.id, dst: `n${String(i)}` })));
        const { copies } = table;
        for (let i = 0; i < 6; i++) {
            await landed(graph);
        }

        assert.isAtLeast(table.copies - copies, 1);
        const shown = Array.from(table.rowPosition.subarray(0, 4 * table.rows)).filter(
            (v, i) => i % 4 === 3 && v === 1,
        );
        assert.isAbove(shown.length, 200);
        const diff = await textureDiff(graph);
        assert.isBelow(diff.wWorst, 1e-5);
        assert.isBelow(diff.worst, 1e-5);
    });

    it("fills the table on the new device after the shared device is lost", async () => {
        const graph = await running("batched");
        const before = graph.acceleration.accelerator;
        await landed(graph);
        await landed(graph);
        const old = await deviceOf(graph);
        old.destroy();
        while (graph.acceleration.accelerator === before || graph.acceleration.accelerator === null) {
            await nextFrame();
        }

        // the ring is attached again a batch after the rebuild's load
        await landed(graph);
        await landed(graph);
        const table = graph.getRowTable();
        assert.isNotNull(table);
        assert.notStrictEqual(graph.getDrawnTarget()?.device, old);
        const { copies } = table;
        const uploads = table.positionUploads;
        for (let i = 0; i < 5; i++) {
            await landed(graph);
        }

        assert.isAtLeast(table.copies - copies, 5);
        assert.strictEqual(table.positionUploads - uploads, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
    });

    it("suspends the copy while a layout transition moves the rows, and resumes it after", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await landed(graph);
        await landed(graph);
        const session = graph.getSession();
        await session.config.set({ layoutTransition: { transition: "glide", seconds: 30, hold: 0.5 } });
        const runner = transitionsOf(graph.getLayoutManager());
        assert.isDefined(runner);
        await graph.setLayout("forceatlas2", { maxIter: 1_000_000, scalingRatio: 4 });
        // held halfway, the rows stay off their lanes until a layout with no transition ends the move
        await landed(graph);
        const { copies } = table;
        const uploads = table.positionUploads;
        for (let i = 0; i < 3; i++) {
            await landed(graph);
        }

        assert.isTrue(runner.active);
        assert.strictEqual(table.copies - copies, 0);
        assert.isAbove(table.positionUploads - uploads, 0);

        // a layout set with no transition ends the move
        await session.config.set({ layoutTransition: undefined });
        await graph.setLayout("forceatlas2", { maxIter: 1_000_000 });
        assert.isFalse(runner.active);
        for (let i = 0; i < 4; i++) {
            await landed(graph);
        }

        assert.isAbove(table.copies - copies, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
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
        for (let i = 0; i < 3; i++) {
            await landed(graph);
        }

        assert.strictEqual(table.copies, 0);
        assert.isNull(table.drawnMirror);
        assert.isAbove(table.positionUploads - uploads, 0);
    });
});
