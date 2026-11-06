/**
 * Hidden edges skipping the join shader, drawn: with the timeline on, a hidden edge leaves the
 * background at its midpoint and a shown one draws its line, through steps, a jump and a filter,
 * as instances and as one expanded mesh, and on the WebGPU engine when the run has an adapter.
 * With the timeline off the lines compile without the skip and the picture is the same.
 * test/mesh-testing/edge-skip-hidden.test.ts holds the program to its switch.
 */
import "../../src/graphty-element";

import { ShaderMaterial } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { forceExpandedLines, isEdgeLineBatchMesh } from "../../src/meshes/EdgeLineBatch";
import { drawnFrames } from "../helpers/drawn-frames";
import { styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

const SKIP = "#define EDGE_SKIP_HIDDEN";
/** The height of each row's edge; edge i is timed i. */
const ROWS = [5, 3, 1, -1, -3, -5];
const LINE = "#0000ff";

let mounted: Graphty | null = null;

afterEach(() => {
    forceExpandedLines(null);
    mounted?.remove();
    mounted = null;
});

/**
 * Wait for what the masks say to reach the picture.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
    await drawnFrames(element.graph.getScene(), 2);
}

/**
 * An element drawing one horizontal edge per row, plus two nodes at one place joined by an edge of
 * no length.
 * @param features - The experiments it runs with.
 * @param renderer - The engine it asks for.
 * @returns The element, drawn.
 */
async function rowsElement(features: string[], renderer: "webgl" | "webgpu" = "webgl"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.features = features;
    element.renderer = renderer;
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        ...ROWS.flatMap((y, row) => [
            { id: `src${String(row)}`, keep: row === 1 ? 0 : 1, position: { x: -4, y, z: 0 } },
            { id: `dst${String(row)}`, keep: 1, position: { x: 4, y, z: 0 } },
        ]),
        { id: "same0", keep: 1, position: { x: 0, y: -7, z: 0 } },
        { id: "same1", keep: 1, position: { x: 0, y: -7, z: 0 } },
    ]);
    await element.session.data.addEdges([
        ...ROWS.map((_, row) => ({ src: `src${String(row)}`, dst: `dst${String(row)}`, t: row })),
        { src: "same0", dst: "same1", t: 0 },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await styleEveryNode(element.graph, { "node.color": "#808080", "node.size": 0.5 });
    await styleEveryEdge(element.graph, { "edge.color": LINE, "edge.width": 4 });
    await drawn(element);
    return element;
}

/**
 * The defines of every joined line batch's material.
 * @param element - The element.
 * @returns One list per batch.
 */
function lineDefines(element: Graphty): string[][] {
    return element.graph
        .getScene()
        .meshes.filter((mesh) => isEdgeLineBatchMesh(mesh) && mesh.material instanceof ShaderMaterial)
        .map((mesh) => (mesh.material as ShaderMaterial).options.defines);
}

/**
 * A copy of the canvas as drawn now.
 * @param element - The element.
 * @returns Its pixels and size.
 */
function canvasPixels(element: Graphty): { data: Uint8ClampedArray; width: number; scale: number } {
    const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(canvas, 0, 0);
    return {
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        scale: canvas.width / canvas.clientWidth,
    };
}

/**
 * How many line-colored pixels each row has around its edge's midpoint.
 * @param element - The element.
 * @returns One count per row.
 */
function inkAtMidpoints(element: Graphty): number[] {
    const { data, width, scale } = canvasPixels(element);
    return ROWS.map((_, row) => {
        const src = element.nodeScreenPosition(`src${String(row)}`);
        const dst = element.nodeScreenPosition(`dst${String(row)}`);
        assert.exists(src);
        assert.exists(dst);
        const cx = Math.round(((src.x + dst.x) / 2) * scale);
        const cy = Math.round(((src.y + dst.y) / 2) * scale);
        const reach = Math.round(6 * scale);
        let ink = 0;
        for (let y = cy - reach; y <= cy + reach; y++) {
            for (let x = cx - reach; x <= cx + reach; x++) {
                const at = (y * width + x) * 4;
                ink += Number(data[at + 2] > 150 && data[at] < 100 && data[at + 1] < 100);
            }
        }

        return ink;
    });
}

/**
 * Assert each row's midpoint shows its line exactly when the session says the edge is visible.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
function assertDrawnAsMasks(element: Graphty, when: string): void {
    const ink = inkAtMidpoints(element);
    const edges = [...element.graph.getDataManager().edges.values()];
    let shown = 0;
    for (const [row, count] of ink.entries()) {
        const edge = edges.find((candidate) => candidate.srcNode.id === `src${String(row)}`);
        assert.exists(edge);
        const visible = element.session.visibility.isVisible(edge.id);
        shown += Number(visible);
        if (visible) {
            assert.isAbove(count, 0, `${when}: row ${String(row)} is shown and draws its line`);
        } else {
            assert.strictEqual(count, 0, `${when}: row ${String(row)} is hidden and leaves the background`);
        }
    }

    assert.isAbove(shown, 0, `${when}: some row is shown`);
    assert.isBelow(shown, ROWS.length, `${when}: some row is hidden`);
}

/**
 * Open a window, step it, jump it and filter it, checking the picture each time.
 * @param element - The element, with the timeline on.
 */
async function stepJumpAndFilter(element: Graphty): Promise<void> {
    const { time, visibility } = element.session;
    await time.setField({ edges: { start: "t" } });
    await time.ready;
    await time.window({ from: 0, to: 2, step: 1, nodes: "ends" });
    await drawn(element);
    assert.isAbove(lineDefines(element).length, 0, "the edges are drawn as batches");
    for (const defines of lineDefines(element)) {
        assert.include(defines, SKIP, "the lines were built to skip hidden pieces");
    }

    assertDrawnAsMasks(element, "the window opened");
    for (const at of [1, 2]) {
        await time.seek(at, { commit: false });
        await drawn(element);
        assertDrawnAsMasks(element, `a step to ${String(at)}`);
    }

    await time.seek(4);
    await drawn(element);
    assertDrawnAsMasks(element, "a jump");

    await time.seek(0);
    await visibility.set({ kind: "range", attribute: "data.keep", min: 1 });
    await drawn(element);
    assertDrawnAsMasks(element, "a filter");
}

describe("hidden edges skip the join shader", () => {
    for (const expanded of [false, true]) {
        it(`draw only what is shown, ${expanded ? "expanded" : "instanced"}`, async () => {
            forceExpandedLines(expanded);
            await stepJumpAndFilter(await rowsElement(["timeline"]));
        });
    }

    it("draw the same picture with the timeline off, an edge of no length included", async () => {
        const off = await rowsElement([]);
        for (const defines of lineDefines(off)) {
            assert.notInclude(defines, SKIP, "off, the lines keep today's program");
        }

        const before = canvasPixels(off).data;
        off.remove();

        const on = await rowsElement(["timeline"]);
        for (const defines of lineDefines(on)) {
            assert.include(defines, SKIP);
        }

        const after = canvasPixels(on).data;
        assert.strictEqual(after.length, before.length);
        let differ = 0;
        for (let at = 0; at < after.length; at++) {
            differ += Number(Math.abs(after[at] - before[at]) > 1);
        }

        assert.strictEqual(differ, 0, "bytes that differ");
    });

    describe.skipIf(ADAPTER === "")(`on the WebGPU engine (${ADAPTER})`, () => {
        it("draws only what is shown", async () => {
            const element = await rowsElement(["timeline"], "webgpu");
            assert.strictEqual(element.rendererStatus?.active, "webgpu");
            await stepJumpAndFilter(element);
        });
    });
});
