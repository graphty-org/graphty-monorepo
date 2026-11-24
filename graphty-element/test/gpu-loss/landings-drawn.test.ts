/**
 * @file What a reader sees, frame by frame, while a GPU layout lands its batches on a device that can be lost:
 * each node drawn where `nodeScreenPosition` says it is in that frame, each edge on its two nodes, no stray ink, and
 * ink at all -- with four batches in flight, after a node with no edges is added mid-run, in the first frames after
 * a shared-device loss, after a WebGL context restore mid-layout, and a settled layout left settled by a loss.
 *
 * shared-device-drawn.test.ts compares the row texture with the CPU copy; this file reads the picture
 * (test/helpers/frame-recorder.ts) in the frame's own task, which on WebGPU is the only time it can be read.
 *
 * Runs in the full run's graphty-element-gpu-loss shard. By hand: npx vitest run --project=gpu-loss
 * test/gpu-loss/landings-drawn.test.ts (VITE_FRAME_DUMP=1 prints each recording's first faulty frame as a PNG).
 */

import { assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { checkDrawnFrames, describeFrames, faulty, type FrameReport } from "../helpers/frame-recorder";
import { copied, deviceOf, landed, layoutOf, nextFrame, running, textureDiff, toldRowsLanded } from "./shared-device";

/** Nodes the shared-device graph holds (shared-device.ts), and its edges. */
const IDS = Array.from({ length: 200 }, (_, i) => `n${String(i)}`);
const PAIRS = IDS.map((id, i) => [id, `n${String((i * 7 + 1) % 200)}`] as const);

/**
 * Colors the graph's nodes and edges as the frame checks read them.
 * @param graph - The graph.
 */
async function inked(graph: Graph): Promise<void> {
    const { styles } = graph.getSession();
    await styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff" },
    });
    await styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 6 },
    });
}

/**
 * Every recorded frame is good, inked, and enough of them moved.
 * @param reports - The frames.
 * @param what - Named in the failure.
 * @param moving - Moving frames required.
 */
function assertGoodFrames(reports: readonly FrameReport[], what: string, moving: number): void {
    const summary = describeFrames(reports);
    console.log(`[landings-drawn] ${what}: ${summary}`);
    assert.isAtLeast(reports.filter((r) => r.moved > 0.25).length, moving, `${what}: the layout moved: ${summary}`);
    assert.isFalse(reports.some(faulty), `${what}: ${summary}`);
}

/**
 * Loses the WebGL context and waits for `render-lost`.
 * @param graph - The graph.
 */
async function loseWebGl(graph: Graph): Promise<void> {
    const lost = new Promise<void>((resolve) => {
        graph.on("render-lost", () => {
            resolve();
        });
    });
    const gl = graph.engine.getRenderingCanvas()?.getContext("webgl2");
    const extension = gl?.getExtension("WEBGL_lose_context");
    assert.isDefined(extension ?? undefined, "the context can be lost");
    extension?.loseContext();
    await lost;
}

/**
 * Destroys the shared device and waits until the layout has an accelerator again.
 * @param graph - The graph.
 */
async function loseSharedDevice(graph: Graph): Promise<void> {
    const before = graph.acceleration.accelerator;
    (await deviceOf(graph)).destroy();
    while (graph.acceleration.accelerator === before || graph.acceleration.accelerator === null) {
        await nextFrame();
    }
}

describe("GPU landings as drawn", () => {
    // The drawn ring has four slots: with four batches in flight the slot drawn is one a batch in flight has
    // already been told to write, so the texture shows a batch that has not landed (3 in flight is the control).
    for (const maxInFlight of [3, 4]) {
        it(`draws each frame where nodeScreenPosition says, with ${String(maxInFlight)} batches in flight`, async () => {
            const graph = await running("batched");
            await inked(graph);
            await graph.setLayout("forceatlas2", {
                maxIter: 1_000_000_000,
                maxInFlight,
                iterationsPerStep: 256,
                settleThreshold: 1e-12,
            });
            await landed(graph);
            await copied(graph);
            assertGoodFrames(await checkDrawnFrames(graph, IDS, PAIRS, 20), `${String(maxInFlight)} in flight`, 20);
            assert.isBelow((await textureDiff(graph)).worst, 1e-5, "the row texture holds the landed batch");
        });
    }

    it("keeps copying landings, and drawing them, after a node with no edges is added mid-run", async () => {
        const graph = await running("batched");
        await inked(graph);
        await copied(graph);
        await graph.addNodes([{ id: "late" }]);
        // the load's first landing goes up by upload (the ring is attached a batch after a load), and the added row,
        // told to the ring as the layout places it, is sent again over the landings of the batches then in flight
        await toldRowsLanded(graph);
        const table = graph.getRowTable();
        assert.isNotNull(table);
        const { copies } = table;
        const uploads = table.positionUploads;
        await landed(graph);
        await landed(graph);
        await landed(graph);
        const copiedAfter = table.copies - copies;
        const uploadedAfter = table.positionUploads - uploads;
        assertGoodFrames(await checkDrawnFrames(graph, [...IDS, "late"], PAIRS, 10), "after a node-only add", 10);
        assert.isAtLeast(copiedAfter, 2, `landings copied after the add (uploads ${String(uploadedAfter)})`);
        assert.strictEqual(uploadedAfter, 0, "no landing went up by upload after the add");
    });

    for (const path of ["batched", "objects"] as const) {
        it(`draws ink, every edge on its nodes, in the first frames after a shared-device loss (${path})`, async () => {
            const graph = await running(path);
            await inked(graph);
            await landed(graph);
            await loseSharedDevice(graph);
            assertGoodFrames(await checkDrawnFrames(graph, IDS, PAIRS, 20), `${path} after a shared-device loss`, 20);
        });

        it(`leaves a settled layout settled through a shared-device loss (${path})`, async () => {
            const graph = await running(path, 150);
            await inked(graph);
            await graph.waitForSettled();
            await graph.waitForStableFrame();
            const before = IDS.map((id) => graph.nodeScreenPosition(id));
            await loseSharedDevice(graph);
            await graph.waitForSettled();
            await graph.waitForStableFrame();
            const reports = await checkDrawnFrames(graph, IDS, PAIRS, 0, { max: 10 });
            const after = IDS.map((id) => graph.nodeScreenPosition(id));
            const moved = Math.max(
                ...before.map((b, i) => {
                    const a = after[i];
                    return b === undefined || a === undefined ? Infinity : Math.hypot(a.x - b.x, a.y - b.y);
                }),
            );
            assert.isFalse(reports.some(faulty), describeFrames(reports));
            assert.isBelow(
                moved,
                1,
                `no node moved on screen (worst ${String(moved)} px; ${String(layoutOf(graph).iterationsDone)} iterations after)`,
            );
        });
    }

    it("draws the latest landing in the first frames after a WebGL restore mid-layout", async () => {
        const graph = await running("batched", undefined, "webgl");
        await inked(graph);
        await landed(graph);
        await landed(graph);
        await loseWebGl(graph);
        const recording = checkDrawnFrames(graph, IDS, PAIRS, 10);
        await graph.restartRenderer();
        assertGoodFrames(await recording, "after a WebGL restore", 10);
    });
});
