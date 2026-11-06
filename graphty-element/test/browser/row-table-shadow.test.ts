/**
 * @file The row tables follow the drawing (design/rendering/row-renderer.md, stage 4): on every
 * frame through a load, a layout transition, a drag, a freeze that renumbers and a 2D switch, each
 * row holds where its node is drawn and `rowBounds` agrees, and a still graph uploads nothing.
 * The drag is real mouse input.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    clearRegisteredTransitionsForTesting,
    registerSnapshotLayout,
    registerTransition,
    type SnapshotLayoutInput,
} from "../../extend";
import type { Graphty } from "../../index.js";
import { writableLane } from "../../src/data/lane";
import { operationQueueOf } from "../../src/Graph";
import type { RowTable } from "../../src/render/RowTable";
import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";
import { drawnFrames } from "../helpers/drawn-frames";
import { drag, moveHeld, press, release } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

/**
 * A layout that puts the nodes in a row at y = 1, 4 apart.
 * @param input - The graph.
 * @returns The coordinates.
 */
function line(input: SnapshotLayoutInput): Float32Array<ArrayBuffer> {
    const out = new Float32Array(input.dimensions * input.graph.nodeCount);
    for (let i = 0; i < input.graph.nodeCount; i++) {
        out[input.dimensions * i] = i * 4;
        out[input.dimensions * i + 1] = 1;
    }

    return out;
}

const LINE: AuthoredLayoutDescriptor = {
    id: "row-table-line",
    plainName: "Line",
    technicalName: "Nodes in a line",
    description: "Puts the nodes in a line.",
    family: "geometric",
    kind: "batch",
    maxDimensions: 2,
    sizeRating: "any",
    structuralInputs: [],
    engine: "row-table-line",
    options: [],
};

beforeAll(() => {
    registerSnapshotLayout({ descriptor: LINE, compute: line });
    registerTransition({
        descriptor: { id: "row-table/particles", plainName: "Particles" },
        drawable: "particles",
        move: (t, from, to) => ({
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
            z: from.z + (to.z - from.z) * t,
        }),
    });
});

afterAll(() => {
    clearRegisteredLayoutsForTesting();
    clearRegisteredTransitionsForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** What the watch found: frames checked and every row that parted from its node, by frame. */
interface Watch {
    frames: number;
    parted: string[];
}

/**
 * Compare every row with its node, as a frame is drawn.
 * @param element - The element.
 * @param table - Its row table.
 * @returns What it has found so far, kept up to date.
 */
function watchRows(element: Graphty, table: RowTable): Watch {
    const { graph } = element;
    const scene = graph.getScene();
    const watch: Watch = { frames: 0, parted: [] };
    const observer = scene.onAfterRenderObservable.add(() => {
        watch.frames++;
        for (const node of graph.getNodes()) {
            const row = node.index;
            const { x, y, z } = node.drawnPosition;
            const [px, py, pz, w] = table.rowPosition.subarray(row * 4, row * 4 + 4);
            const [bx, by, bz, radius] = table.rowBounds.subarray(row * 4, row * 4 + 4);
            const shown = node.getRenderState() === "visible";
            const wanted = shown ? node.drawnScale : 0;
            const same =
                px === Math.fround(x) &&
                py === Math.fround(y) &&
                pz === Math.fround(z) &&
                bx === px &&
                by === py &&
                bz === pz &&
                Math.abs((w ?? 0) - wanted) < 1e-5 &&
                Math.abs((radius ?? 0) - (shown ? node.drawnBoundingRadius : 0)) < 1e-4;
            if (!same) {
                watch.parted.push(
                    `frame ${String(watch.frames)} node ${String(node.id)} row ${String(row)}: ` +
                        `[${String(px)},${String(py)},${String(pz)},${String(w)}] r ${String(radius)} ` +
                        `drawn [${String(x)},${String(y)},${String(z)}] w ${String(wanted)}`,
                );
            }
        }
    });
    cleanups.push(() => scene.onAfterRenderObservable.remove(observer));
    return watch;
}

/**
 * A mounted element with its row table open before any data arrives.
 * @returns The element and the table.
 */
async function mounted(): Promise<{ element: Graphty; table: RowTable }> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return { element, table: element.graph.openRowTable() };
}

/**
 * Add nodes at fixed places, with one joined pair, and settle on the fixed layout.
 * @param element - The element.
 * @param view - The view mode.
 */
async function placed(element: Graphty, view: "2d" | "3d"): Promise<void> {
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: -1, z: 2 } },
        { id: "b", position: { x: 4, y: -1, z: -2 } },
        { id: "c", position: { x: 0, y: 3, z: 1 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

describe("the row tables", () => {
    it("follow a running layout through a load in two parts", async () => {
        const { element, table } = await mounted();
        const watch = watchRows(element, table);
        await element.graph.setLayout("ngraph", { seed: 7 });
        await element.session.data.addNodes(Array.from({ length: 30 }, (_, id) => ({ id })));
        await element.session.data.addEdges(Array.from({ length: 29 }, (_, id) => ({ source: id, target: id + 1 })));
        await drawnFrames(element.graph.getScene(), 5);
        await element.session.data.addNodes(Array.from({ length: 30 }, (_, id) => ({ id: id + 30 })));
        await element.waitForStableFrame();
        assert.isAbove(watch.frames, 5, "frames were drawn");
        assert.strictEqual(table.rows, 60);
        assert.deepStrictEqual(watch.parted.slice(0, 5), []);
    });

    it("upload nothing while the graph is still, and agree with the texture", async () => {
        const { element, table } = await mounted();
        await placed(element, "3d");
        await drawnFrames(element.graph.getScene(), 2);
        const { uploads } = table;
        await drawnFrames(element.graph.getScene(), 5);
        assert.strictEqual(table.uploads, uploads, "no upload while still");
        const texels = new Float32Array((await table.positionTexture.readPixels())?.buffer as ArrayBuffer);
        assert.deepStrictEqual([...texels.subarray(0, 12)], [...table.rowPosition.subarray(0, 12)]);
    });

    it("follow a particle transition, shrink included", async () => {
        const { element, table } = await mounted();
        await placed(element, "2d");
        const scene = element.graph.getScene();
        // One 60 Hz step a drawn frame, so the move takes the same frames however slow they are.
        let clock = performance.now();
        const now = vi.spyOn(performance, "now").mockImplementation(() => clock);
        const tick = scene.onBeforeRenderObservable.add(() => {
            clock += 1000 / 60;
        });
        cleanups.push(() => {
            scene.onBeforeRenderObservable.remove(tick);
            now.mockRestore();
        });
        const watch = watchRows(element, table);
        let shrunk = false;
        const seen = scene.onAfterRenderObservable.add(() => {
            const w = table.rowPosition[3] ?? 1;
            shrunk ||= w > 0 && w < 0.5;
        });
        cleanups.push(() => scene.onAfterRenderObservable.remove(seen));
        await element.session.config.set({ layoutTransition: { transition: "row-table/particles", seconds: 0.4 } });
        await element.graph.setLayout("row-table-line");
        const runner = transitionsOf(element.graph.getLayoutManager());
        await drawnFrames(scene, 2);
        while (runner?.active === true) {
            await drawnFrames(scene, 1);
        }
        await drawnFrames(scene, 2);
        assert.isTrue(shrunk, "a row was drawn shrunk");
        assert.isAbove(watch.frames, 10, "the move took frames");
        assert.deepStrictEqual(watch.parted.slice(0, 5), []);
        assert.strictEqual(table.rowPosition[3], 1, "whole once it lands");
    });

    it("follow a real drag, held and dropped", async () => {
        const { element, table } = await mounted();
        await placed(element, "2d");
        const watch = watchRows(element, table);
        const node = element.graph.getNode("c");
        assert.isDefined(node);
        const from = element.worldToScreen(node.drawnWorldPosition);
        const at = { x: from.x + 40, y: from.y + 30 };
        const { x: startX } = node.drawnPosition;
        await drag(element, from, at);
        await drawnFrames(element.graph.getScene(), 2);
        assert.notStrictEqual(node.drawnPosition.x, startX, "the drag moved the node");
        await press(element, at);
        await moveHeld(element, { x: at.x + 20, y: at.y });
        await drawnFrames(element.graph.getScene(), 2);
        await release(element, { x: at.x + 20, y: at.y });
        await drawnFrames(element.graph.getScene(), 2);
        assert.deepStrictEqual(watch.parted.slice(0, 5), []);
    });

    it("follow a freeze that renumbers, and a node hidden and shown", async () => {
        const { element, table } = await mounted();
        await placed(element, "3d");
        const watch = watchRows(element, table);
        const { graph } = element;
        const node = graph.getNode("c");
        assert.isDefined(node);
        const before = node.index;
        await element.session.data.removeNodes(["a"]);
        await element.session.data.addNodes([{ id: "d", position: { x: 1, y: 1, z: 1 } }]);
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        await drawnFrames(graph.getScene(), 2);
        assert.notStrictEqual(node.index, before, "the freeze renumbered the rows");
        node.setRenderState("hidden");
        await drawnFrames(graph.getScene(), 2);
        assert.strictEqual(table.rowPosition[node.index * 4 + 3], 0);
        node.setRenderState("visible");
        await drawnFrames(graph.getScene(), 2);
        assert.strictEqual(table.rowPosition[node.index * 4 + 3], 1);
        assert.deepStrictEqual(watch.parted.slice(0, 5), []);
    });

    it("drop z in 2D and take it back in 3D", async () => {
        const { element, table } = await mounted();
        await placed(element, "3d");
        const watch = watchRows(element, table);
        const node = element.graph.getNode("a");
        assert.isDefined(node);
        assert.strictEqual(table.rowPosition[node.index * 4 + 2], 2);
        await element.setViewMode("2d");
        await element.waitForStableFrame();
        await drawnFrames(element.graph.getScene(), 2);
        assert.strictEqual(table.rowPosition[node.index * 4 + 2], 0);
        await element.setViewMode("3d");
        await element.waitForStableFrame();
        await drawnFrames(element.graph.getScene(), 2);
        assert.strictEqual(table.rowPosition[node.index * 4 + 2], 2);
        assert.deepStrictEqual(watch.parted.slice(0, 5), []);
    });

    it("repack from the lane alone, past a row drawn elsewhere", async () => {
        const { element, table } = await mounted();
        await placed(element, "3d");
        const { graph } = element;
        const lane = writableLane(graph.getDataManager());
        const a = graph.getNode("a");
        const b = graph.getNode("b");
        assert.isDefined(lane);
        assert.isDefined(a);
        assert.isDefined(b);
        const rowOf = (row: number): number[] => [...table.rowPosition.subarray(row * 4, row * 4 + 4)];

        // No node is told: only the lane moved, as a batched row's will.
        lane.write(a.index, 9, 8, 7);
        // Drawn off its lane, as a drag does, so the repack must leave it.
        b.setMeshPosition(1, 2, 3);
        lane.write(b.index, 5, 5, 5);
        table.flush();
        assert.deepStrictEqual(rowOf(a.index), [9, 8, 7, 1]);
        assert.deepStrictEqual(rowOf(b.index), [1, 2, 3, 1]);
        assert.strictEqual(table.rowBounds[a.index * 4], 9);

        // Unplaced: the vertex collapses and picking skips it.
        const view = lane.view(lane.count);
        view[a.index * 3] = Number.NaN;
        lane.moved();
        table.flush();
        assert.strictEqual(rowOf(a.index)[3], 0);
        assert.strictEqual(table.rowBounds[a.index * 4 + 3], 0);

        // Landing on the lane lets a held row go.
        b.setMeshPosition(5, 5, 5);
        lane.write(b.index, 6, 6, 6);
        table.flush();
        assert.deepStrictEqual(rowOf(b.index), [6, 6, 6, 1]);
    });

    it("send every row again after the context comes back", async () => {
        const { element, table } = await mounted();
        await placed(element, "3d");
        const { graph } = element;
        await drawnFrames(graph.getScene(), 2);
        const { uploads, uploadedBytes } = table;
        graph.getScene().getEngine().getRenderingCanvas()?.dispatchEvent(new Event("webglcontextrestored"));
        await drawnFrames(graph.getScene(), 2);
        assert.strictEqual(table.uploads, uploads + 2, "both textures went up");
        assert.strictEqual(
            table.uploadedBytes - uploadedBytes,
            table.rowPosition.byteLength + table.rowExtent.byteLength,
        );
    });

    it("cost a graph that never opens them nothing", async () => {
        const element = document.createElement("graphty-element");
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        assert.isNull(element.graph.getRowTable());
    });
});
