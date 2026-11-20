/**
 * @file Picking a plain edge with a real pointer, on both render paths.
 *
 * On the `"batched"` path a plain edge (no arrowhead, dash or label) is drawn as a row line, with no `Edge`
 * object. It must be hovered, clicked and found by `elementAt` exactly as on `"objects"`, and picking it must
 * build no `Edge`. An undirected graph draws every edge plain.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { edgePickWork } from "../../src/render/PickService";
import { click, hover, nextFrame } from "../helpers/real-input";

/** The adapter the browser project was launched with; empty when it has no WebGPU. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

type Antialias = boolean | "at-rest" | "shader";

/**
 * Two parallel undirected edges, a-b above c-d, drawn.
 * @param path - The render path.
 * @param viewMode - The view.
 * @param renderer - The engine.
 * @param antialias - How the canvas multisamples, which picks the line program on `"batched"`.
 * @returns The element.
 */
async function plainEdges(
    path: "batched" | "objects",
    viewMode: "2d" | "3d",
    renderer: "webgl" | "webgpu",
    antialias: Antialias = true,
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.antialias = antialias;
    element.directed = false;
    element.style.display = "block";
    element.style.width = "500px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -6, y: 3, z: 0 } },
        { id: "b", position: { x: 6, y: 3, z: 0 } },
        { id: "c", position: { x: -6, y: -3, z: 0 } },
        { id: "d", position: { x: 6, y: -3, z: 0 } },
    ]);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "c", dst: "d" },
    ]);
    await element.graph.setLayout("fixed", { dim: viewMode === "2d" ? 2 : 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The middle of the line between two nodes, read off the row table (no `Edge` is built).
 * @param element - The element.
 * @param from - One node.
 * @param to - The other.
 * @returns The point, in CSS pixels.
 */
function between(element: Graphty, from: string, to: string): { x: number; y: number } {
    const a = element.nodeScreenPosition(from);
    const b = element.nodeScreenPosition(to);
    assert.isDefined(a);
    assert.isDefined(b);
    return { x: ((a?.x ?? 0) + (b?.x ?? 0)) / 2, y: ((a?.y ?? 0) + (b?.y ?? 0)) / 2 };
}

describe("picking a plain edge with a real pointer", () => {
    const cases: {
        path: "batched" | "objects";
        viewMode: "2d" | "3d";
        renderer: "webgl" | "webgpu";
        antialias?: Antialias;
    }[] = [];
    for (const path of ["objects", "batched"] as const) {
        for (const renderer of ["webgl", "webgpu"] as const) {
            for (const viewMode of ["2d", "3d"] as const) {
                cases.push({ path, viewMode, renderer });
            }
        }
    }

    // The lean line program, the shader-smoothed one, and lean while moving.
    for (const antialias of [false, "shader", "at-rest"] as const) {
        cases.push({ path: "batched", viewMode: "2d", renderer: "webgl", antialias });
    }

    for (const { path, viewMode, renderer, antialias } of cases) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `hovers, finds and selects it on ${path}, ${viewMode}, ${renderer}, antialias ${String(antialias ?? true)}`,
            async () => {
                const element = await plainEdges(path, viewMode, renderer, antialias);
                const { graph } = element;
                const canvas = graph.scene.getEngine().getInputElement();
                assert.isNotNull(canvas);
                const manager = graph.getDataManager();
                const [ab] = dataManagerInternals.incidentEdgeIds(manager, "a");
                const [cd] = dataManagerInternals.incidentEdgeIds(manager, "c");
                if (path === "batched") {
                    assert.strictEqual(element.rowCounts.pulledEdges, 2, "both edges are row lines");
                    assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "no Edge is built");
                }

                const top = between(element, "a", "b");
                const bottom = between(element, "c", "d");

                // Hover: the cursor says the line is there.
                await hover(element, { x: 5, y: 5 });
                await element.waitForStableFrame();
                const target = graph.getEdgeIdTarget();
                const readsBefore = target?.counts.reads ?? 0;
                await hover(element, top);
                // On WebGPU the hover answers once the edge ID target is read back, a frame or more after the move
                // is handled (and the browser may hand the move over only at the next frame): wait until the cursor
                // shows the line or a read of the target has come back without it. WebGL and objects answer at once.
                if (path === "batched" && renderer === "webgpu") {
                    while (
                        canvas?.style.cursor !== "pointer" &&
                        (target === null || target.counts.reads === readsBefore || target.counts.pending > 0)
                    ) {
                        await nextFrame();
                    }
                }

                assert.strictEqual(canvas?.style.cursor, "pointer", "the cursor shows the line");
                assert.deepEqual(element.elementAt(top), { kind: "edge", id: ab }, "elementAt finds the top edge");
                assert.deepEqual(element.elementAt(bottom), { kind: "edge", id: cd }, "and the bottom one");
                if (path === "batched") {
                    assert.strictEqual(
                        dataManagerInternals.edgesLive(manager),
                        0,
                        "a hover or elementAt builds no Edge",
                    );
                }

                // A node is selected; a click on an edge replaces it with the edge.
                const node = element.nodeScreenPosition("c");
                await click(element, { x: node?.x ?? 0, y: node?.y ?? 0 });
                await operationQueueOf(graph).waitForCompletion();
                assert.deepEqual(element.session.selection.nodes, ["c"], "the node is selected first");
                await click(element, bottom);
                await operationQueueOf(graph).waitForCompletion();
                assert.deepEqual(element.session.selection.edges, [cd], "the click selects the edge");
                assert.deepEqual(element.session.selection.nodes, [], "and replaces the node");

                // Shift adds the other edge.
                await click(element, top, { shift: true });
                await operationQueueOf(graph).waitForCompletion();
                assert.sameMembers([...element.session.selection.edges], [ab, cd], "shift adds the top edge");
            },
        );
    }
});

describe("the work of a plain edge pick on batched", () => {
    /** A 20 by 20 grid of short vertical lines, each its own pair of nodes. */
    const LINES = 400;

    it("measures only the lines near a hover, and builds no Edge", async () => {
        const element = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.renderPath = "batched";
        element.directed = false;
        element.style.display = "block";
        element.style.width = "500px";
        element.style.height = "400px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.setViewMode("2d");
        await operationQueueOf(element.graph).waitForCompletion();
        const nodes = Array.from({ length: LINES * 2 }, (_, i) => {
            const line = Math.floor(i / 2);
            return {
                id: `n${String(i)}`,
                position: { x: (line % 20) * 5, y: Math.floor(line / 20) * 4 + (i % 2 === 0 ? 1.5 : -1.5), z: 0 },
            };
        });
        const edges = Array.from({ length: LINES }, (_, i) => ({
            src: `n${String(i * 2)}`,
            dst: `n${String(i * 2 + 1)}`,
        }));
        await element.session.data.addNodes(nodes);
        await element.session.data.addEdges(edges);
        await element.graph.setLayout("fixed", { dim: 2 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const manager = element.graph.getDataManager();
        assert.strictEqual(element.rowCounts.pulledEdges, LINES, "every edge is a row line");
        const canvas = element.graph.scene.getEngine().getInputElement();

        // The first move may rebuild and draw the edge ID target.
        await hover(element, { x: 2, y: 2 });
        await element.waitForStableFrame();
        const empty = edgePickWork.rowLines;
        await hover(element, { x: 3, y: 3 });
        assert.strictEqual(edgePickWork.rowLines - empty, 0, "over empty canvas no line is measured");

        const mid = between(element, "n420", "n421");
        const near = edgePickWork.rowLines;
        await hover(element, mid);
        const measured = edgePickWork.rowLines - near;
        assert.isAbove(measured, 0, "the line under the pointer is measured");
        assert.isBelow(measured, 10, "only the lines near the pointer are measured");
        assert.strictEqual(canvas?.style.cursor, "pointer", "the cursor shows the line");
        assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "a hover builds no Edge");

        const [id] = dataManagerInternals.incidentEdgeIds(manager, "n420");
        const beforePress = edgePickWork.rowLines;
        assert.deepEqual(element.elementAt(mid), { kind: "edge", id }, "elementAt names the line");
        const pressed = edgePickWork.rowLines - beforePress;
        assert.isAbove(pressed, 0, "elementAt measures the line under the point");
        assert.isBelow(pressed, 10, "and only the lines near it, as a hover does (WebGL)");
        assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "elementAt builds no Edge");
        await click(element, mid);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.deepEqual(element.session.selection.edges, [id], "the click selects it");
        assert.strictEqual(dataManagerInternals.edgesLive(manager), 1, "only the selected edge gets an Edge");
    });
});
