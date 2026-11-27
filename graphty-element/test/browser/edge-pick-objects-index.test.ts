/**
 * @file Edge picking on the `"objects"` path puts on screen only the edges near the pointer once the picture is
 * still (issue #10301).
 *
 * The first pick after the camera, a node or the edges changed puts every edge's two ends on screen once; each pick
 * after it, while nothing changed, measures only the edges near the pointer. It names the edge the walk over every
 * edge names.
 */

import "../../src/graphty-element";

import type { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { edgePickWork, hoverEdgeAt, pickEdgeAt } from "../../src/render/PickService";
import { drag, hover, wheel } from "../helpers/real-input";

const NODES = 40;
const EDGES = 400;
const WIDTH = 500;
const HEIGHT = 400;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A seeded random number generator (mulberry32).
 * @param seed - The seed.
 * @returns Numbers in 0..1.
 */
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A graph of crossing edges drawn on the `"objects"` path, with one loop (a curve, measured whole every pick).
 * @param viewMode - The view.
 * @returns The element.
 */
async function edgeGraph(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath("objects");
    const random = seeded(viewMode === "2d" ? 5 : 11);
    const nodes = Array.from({ length: NODES }, (_, i) => ({
        id: `n${String(i)}`,
        position: {
            x: (random() - 0.5) * 20,
            y: (random() - 0.5) * 20,
            z: viewMode === "2d" ? 0 : (random() - 0.5) * 20,
        },
    }));
    const edges = Array.from({ length: EDGES }, (_, i) => ({
        src: `n${String(i % NODES)}`,
        dst: `n${String((i * 7 + 3 + Math.floor(i / NODES)) % NODES)}`,
    })).filter((edge) => edge.src !== edge.dst);
    edges.push({ src: "n0", dst: "n0" });
    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges(edges);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The graph's edges, as the full walk takes them.
 * @param element - The element.
 * @returns The edges.
 */
function edgesOf(element: Graphty): Edge[] {
    return [...element.graph.getEdges()];
}

/**
 * The middle of an edge on screen, in the pixels the real-input helpers take.
 * @param element - The element.
 * @param edge - The edge.
 * @returns The point.
 */
function middleOf(element: Graphty, edge: Edge): { x: number; y: number } {
    const { graph } = element;
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    const a = graph.worldToScreen(edge.srcNode.drawnWorldPosition);
    const b = graph.worldToScreen(edge.dstNode.drawnWorldPosition);
    return { x: ((a.x + b.x) / 2) * scaling, y: ((a.y + b.y) / 2) * scaling };
}

/**
 * Whether a point is well away from every node on screen, so a pointer there is over no node.
 * @param element - The element.
 * @param point - The point, in the pixels the real-input helpers take.
 * @returns True when it is.
 */
function clearOfNodes(element: Graphty, point: { x: number; y: number }): boolean {
    const { graph } = element;
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    return [...graph.getNodes()].every((node) => {
        const at = graph.worldToScreen(node.drawnWorldPosition);
        return Math.hypot(at.x * scaling - point.x, at.y * scaling - point.y) > 40;
    });
}

/**
 * The edge whose middle is nearest the canvas's middle, among those whose middle is clear of every node.
 * @param element - The element.
 * @returns The edge.
 */
function centralLine(element: Graphty): Edge {
    let best: Edge | undefined;
    let bestDistance = Infinity;
    for (const edge of edgesOf(element)) {
        if (edge.srcId === edge.dstId) {
            continue;
        }

        const mid = middleOf(element, edge);
        const distance = Math.hypot(mid.x - WIDTH / 2, mid.y - HEIGHT / 2);
        if (distance < bestDistance && clearOfNodes(element, mid)) {
            bestDistance = distance;
            best = edge;
        }
    }

    assert.isDefined(best);
    return best;
}

describe("edge picking on the objects path", () => {
    for (const viewMode of ["2d", "3d"] as const) {
        it(`measures only the edges near a still pointer, in ${viewMode}`, async () => {
            const element = await edgeGraph(viewMode);
            const canvas = element.graph.scene.getEngine().getInputElement();
            assert.isNotNull(canvas);
            const total = edgesOf(element).length;

            // The first moves put every edge on screen: the scene's first index holds for its frame only, as
            // whether a node moved after that frame placed it is not known until a frame ends.
            await hover(element, { x: 1, y: 1 });
            await element.waitForStableFrame();
            await hover(element, { x: 1, y: 2 });
            await element.waitForStableFrame();
            const { indexed } = edgePickWork;
            const { measured } = edgePickWork;
            await hover(element, { x: 2, y: 2 });
            assert.strictEqual(edgePickWork.indexed - indexed, 0, "a still picture puts no edge on screen again");
            assert.strictEqual(edgePickWork.measured - measured, 1, "over empty canvas only the loop is measured");

            const heard: unknown[] = [];
            element.addEventListener("graphty-edge-hover", (event) => {
                heard.push((event as CustomEvent<{ edgeId: unknown }>).detail.edgeId);
            });
            const edge = centralLine(element);
            const before = edgePickWork.measured;
            await hover(element, middleOf(element, edge));
            assert.strictEqual(canvas?.style.cursor, "pointer", "the pointer is over a line");
            assert.lengthOf(heard, 1, "one edge is hovered");
            assert.strictEqual(edgePickWork.indexed - indexed, 0, "still no edge put on screen again");
            const near = edgePickWork.measured - before;
            assert.isAbove(near, 1, "the edge under the pointer is measured, with the loop");
            assert.isBelow(near, total / 4, `only the edges near the pointer are measured, not all ${String(total)}`);
        });
    }

    it("names the edge the walk over every edge names", async () => {
        const element = await edgeGraph("3d");
        const { graph } = element;
        await hover(element, { x: 1, y: 1 });
        await element.waitForStableFrame();
        const edges = edgesOf(element);
        const random = seeded(17);
        let hits = 0;
        const differ: string[] = [];
        for (let i = 0; i < 300; i++) {
            // Most points a few pixels off an edge's middle, the rest anywhere.
            const edge = edges[Math.floor(random() * edges.length)];
            const mid = i % 4 === 0 ? { x: random() * WIDTH, y: random() * HEIGHT } : middleOf(element, edge);
            const x = mid.x + (random() - 0.5) * 12;
            const y = mid.y + (random() - 0.5) * 12;
            const toScreen = (p: Vector3): { x: number; y: number } => graph.worldToScreen(p);
            const walked = pickEdgeAt(graph.scene, edgesOf(element), x, y, toScreen);
            const hovered = hoverEdgeAt(graph.scene, () => edgesOf(element), x, y, toScreen);
            assert.notInstanceOf(hovered, Promise, "the objects path answers now");
            hits += walked === undefined ? 0 : 1;
            if (walked !== hovered) {
                differ.push(`(${x.toFixed(1)}, ${y.toFixed(1)}): ${String(walked)} vs ${String(hovered)}`);
            }
        }

        assert.deepEqual(differ.slice(0, 5), [], `${String(differ.length)} differ`);
        assert.isAbove(hits, 100, "enough points are on an edge");
    });

    it("finds an edge where it is drawn after the camera or a node moved", async () => {
        const element = await edgeGraph("2d");
        await hover(element, { x: 1, y: 1 });
        await element.waitForStableFrame();
        const heard: unknown[] = [];
        element.addEventListener("graphty-edge-hover", (event) => {
            heard.push((event as CustomEvent<{ edgeId: unknown }>).detail.edgeId);
        });

        // The camera zooms: the index is put on screen again, and the edge is found where it is drawn now.
        await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -200);
        await element.waitForStableFrame();
        let { indexed } = edgePickWork;
        let edge = centralLine(element);
        await hover(element, middleOf(element, edge));
        assert.isAbove(edgePickWork.indexed - indexed, 0, "a moved camera puts the edges on screen again");
        assert.strictEqual(heard.at(-1), edge.id, "the edge under the pointer after the camera moved");
        await hover(element, { x: 1, y: 1 });

        // A node is dragged: its edges are found where they are drawn now.
        const { graph } = element;
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const from = graph.worldToScreen(edge.srcNode.drawnWorldPosition);
        const start = { x: from.x * scaling, y: from.y * scaling };
        await drag(element, start, { x: start.x + 60, y: start.y + 40 });
        await element.waitForStableFrame();
        await hover(element, { x: 2, y: 1 });
        ({ indexed } = edgePickWork);
        edge = edgesOf(element).find((candidate) => candidate.id === edge.id) ?? edge;
        await hover(element, middleOf(element, edge));
        assert.strictEqual(edgePickWork.indexed - indexed, 0, "the move before put the moved node's edges on screen");
        assert.strictEqual(heard.at(-1), edge.id, "the edge under the pointer after its node moved");
    });
});
