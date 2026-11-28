/**
 * @file What a reader sees, frame by frame, while a GPU layout lands its batches on a device that can be lost:
 * each node drawn where `nodeScreenPosition` says it is in that frame, each edge on its two nodes, no stray ink, and
 * ink at all -- with four batches in flight, after a node with no edges is added mid-run, after a node is removed
 * mid-run and the removal undone, in the first frames after
 * a shared-device loss, after a WebGL context restore mid-layout, and a settled layout left settled by a loss.
 *
 * shared-device-drawn.test.ts compares the row texture with the CPU copy; this file reads the picture
 * (test/helpers/frame-recorder.ts) in the frame's own task, which on WebGPU is the only time it can be read.
 *
 * Runs in the full run's graphty-element-gpu-loss shard. By hand: npx vitest run --project=gpu-loss
 * test/gpu-loss/landings-drawn.test.ts (each recording's first faulty frame is logged as a PNG; VITE_FRAME_DUMP=all logs every frame).
 */

import { assert, describe, it } from "vitest";

import { type Graph, renderManagerOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import {
    checkDrawnFrames,
    describeFrames,
    faulty,
    type FrameReport,
    STILL_CHECKED,
    stillFrames,
} from "../helpers/frame-recorder";
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

    // A removal renumbers every row after the removed one while the batches in flight were computed for the old
    // rows, and landings are copied into the row texture by row: an old batch copied over the new rows draws nodes
    // on each other's places and edges off their nodes. Undo brings the rows back through the records.
    for (const maxInFlight of [3, 4]) {
        it(`draws each frame on the renumbered rows after a mid-run removal, and still frames after its undo, with ${String(maxInFlight)} batches in flight`, async () => {
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
            const session = graph.getSession();
            // n0's place is the first row, so every other row moves down one
            await session.data.removeNodes(["n0"]);
            const ids = IDS.filter((id) => id !== "n0");
            const pairs = PAIRS.filter((pair) => !pair.includes("n0"));
            assert.strictEqual(session.data.snapshot().edgeCount, pairs.length, "n0's edges went with it");
            await landed(graph);
            assertGoodFrames(
                await checkDrawnFrames(graph, ids, pairs, 20),
                `${String(maxInFlight)} in flight after a removal`,
                20,
            );
            // undo stops the layout and puts back the arrangement the history holds (design/undo/undo-design.md
            // section 6.2): no batch in flight at the undo may land on the rows it brought back
            await session.undo();
            assert.strictEqual(session.data.snapshot().edgeCount, PAIRS.length, "undo brought n0's edges back");
            assert.isFalse(graph.isRunning(), "undo stopped the layout");
            await graph.waitForStableFrame();
            const before = IDS.map((id) => graph.nodeScreenPosition(id));
            const reports = await stillFrames(graph, IDS, PAIRS);
            const moved = Math.max(
                ...before.map((b, i) => {
                    const a = graph.nodeScreenPosition(IDS[i]);
                    return b === undefined || a === undefined ? Infinity : Math.hypot(a.x - b.x, a.y - b.y);
                }),
            );
            assert.strictEqual(
                reports.length,
                STILL_CHECKED,
                `every frame was read, none moved: ${describeFrames(reports)}`,
            );
            assert.isFalse(reports.some(faulty), `after the undo: ${describeFrames(reports)}`);
            assert.isBelow(moved, 1, `no node moved after the undo (worst ${String(moved)} px)`);
            assert.isBelow((await textureDiff(graph)).worst, 1e-5, "the row texture holds the restored rows");
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
        // Read in each frame, reported only for a faulty one (issue #10190): whether a resize drew the frame outside the
        // loop (drawNow), which landing the row table and the position reads each hold, and the new row as it stands.
        const { ticks } = renderManagerOf(graph);
        // the data manager's own lookup, not the public snapshot, which would write the owed publish
        const lateRow = dataManagerInternals.rowOf(graph.getDataManager(), "late");
        const state = (): unknown => ({
            drawnNow: ticks.drawnNow,
            landings: layoutOf(graph).landingState,
            copies: table.copies,
            uploads: table.positionUploads,
            late: { row: lateRow, ...table.rawRow(lateRow) },
        });
        assertGoodFrames(
            await checkDrawnFrames(graph, [...IDS, "late"], PAIRS, 10, { state }),
            "after a node-only add",
            10,
        );
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
