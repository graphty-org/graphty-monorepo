/**
 * @file The edge ID target an edge hover reads on the `"batched"` path (design/rendering/row-renderer.md 4.4).
 *
 * Hover names the edge the full walk names at every sampled point, except where two lines cover
 * the same pixels (the target keeps the one drawn last), which is listed. A pointer move measures
 * only the edges drawn near it: none over empty canvas, and never every edge.
 */

import "../../src/graphty-element";

import type { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { edgePickWork, hoverEdgeAt, pickEdgeAt } from "../../src/render/PickService";
import { hover, nextFrame } from "../helpers/real-input";

const NODES = 30;
const EDGES = 60;
const POINTS = 400;
const WIDTH = 500;
const HEIGHT = 400;
/** The window's half-width hover reads, in render pixels, at a scaling of 1. */
const WINDOW = 7;
/** The adapter the browser project was launched with; empty when it has no WebGPU. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

interface Point {
    x: number;
    y: number;
}

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
 * A graph of crossing edges in a view, drawn.
 * @param viewMode - The view.
 * @param path - The render path.
 * @param renderer - The engine.
 * @returns The element.
 */
async function edgeGraph(
    viewMode: "2d" | "3d",
    path: "batched" | "objects" = "batched",
    renderer: "webgl" | "webgpu" = "webgl",
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
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
    element.graph.setRenderPath(path);
    const random = seeded(viewMode === "2d" ? 3 : 7);
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
        dst: `n${String((i * 7 + 3) % NODES)}`,
    }));
    // A loop: the target cannot draw it, so hover measures it with the window's edges.
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
 * The drawn edge at a point by the full walk.
 * @param element - The element.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The id.
 */
function walked(element: Graphty, x: number, y: number): unknown {
    const { graph } = element;
    return pickEdgeAt(graph.scene, edgesOf(element), x, y, (p: Vector3) => graph.worldToScreen(p));
}

/**
 * Seeded points: most a few pixels off an edge's line, the rest anywhere.
 * @param element - The element.
 * @param seed - The seed.
 * @returns The points, in CSS pixels.
 */
function nearEdges(element: Graphty, seed: number): { x: number; y: number }[] {
    const random = seeded(seed);
    const { graph } = element;
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    const edges = edgesOf(element);
    return Array.from({ length: POINTS }, () => {
        if (random() < 0.2) {
            return { x: random() * WIDTH, y: random() * HEIGHT };
        }

        const edge = edges[Math.floor(random() * edges.length)];
        const a = graph.worldToScreen(edge.srcNode.drawnWorldPosition);
        const b = graph.worldToScreen(edge.dstNode.drawnWorldPosition);
        const t = random();
        return {
            x: (a.x + (b.x - a.x) * t) * scaling + (random() - 0.5) * 16,
            y: (a.y + (b.y - a.y) * t) * scaling + (random() - 0.5) * 16,
        };
    });
}

/**
 * The distance from a point to a segment.
 * @param p - The point.
 * @param a - One end.
 * @param b - The other.
 * @returns The distance.
 */
function toSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Whether the target may not show a line near a point because another line, drawn later, covers
 * its pixels there: every part of it within the window around the point lies within a pixel of
 * the other line (lines between the same nodes, lines that run on from each other, a hub's lines
 * at the hub).
 * @param element - The element.
 * @param missed - The line the walk named.
 * @param shown - The line hover named.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns True when it may be covered.
 */
function overdrawn(element: Graphty, missed: Edge, shown: Edge, x: number, y: number): boolean {
    const { graph } = element;
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    const at = (edge: Edge): [Point, Point] => [
        graph.worldToScreen(edge.srcNode.drawnWorldPosition),
        graph.worldToScreen(edge.dstNode.drawnWorldPosition),
    ];
    const [a, b] = at(missed);
    const [c, d] = at(shown);
    const px = x / scaling;
    const py = y / scaling;
    for (let t = 0; t <= 1; t += 1 / 1024) {
        const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        if (Math.max(Math.abs(p.x - px), Math.abs(p.y - py)) <= WINDOW && toSegment(p, c, d) > 1) {
            return false;
        }
    }

    return true;
}

describe("the edge ID target", () => {
    const cases = [
        { viewMode: "2d", renderer: "webgl" },
        { viewMode: "3d", renderer: "webgl" },
        // WebGPU reads back after a frame, and pads each row it reads to 256 bytes.
        { viewMode: "2d", renderer: "webgpu" },
    ] as const;
    for (const { viewMode, renderer } of cases) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `names the edge the full walk names, in ${viewMode} on ${renderer}`,
            async () => {
                const element = await edgeGraph(viewMode, "batched", renderer);
                const { graph } = element;
                assert.strictEqual(graph.engine.isWebGPU, renderer === "webgpu");
                const target = graph.getEdgeIdTarget();
                assert.isNotNull(target, "the batched path keeps an edge target");
                // The material compiles on its own; until then a read answers null.
                while (target?.candidates(0, 0, 1) === null) {
                    await nextFrame();
                }

                let hits = 0;
                const overlaps: string[] = [];
                const differ: string[] = [];
                for (const { x, y } of nearEdges(element, 11)) {
                    const answer = hoverEdgeAt(
                        graph.scene,
                        () => edgesOf(element),
                        x,
                        y,
                        (p) => graph.worldToScreen(p),
                    );
                    assert.strictEqual(answer instanceof Promise, renderer === "webgpu", "WebGL answers at once");
                    const read = await answer;
                    const expected = walked(element, x, y);
                    hits += expected === undefined ? 0 : 1;
                    if (read === expected) {
                        continue;
                    }

                    // Two lines over the same pixels: the target keeps only the one drawn last. A line
                    // whose nearest point to the pointer is its end at a node another line also ends at
                    // is drawn over there by that line.
                    const where = `${x.toFixed(1)},${y.toFixed(1)}: hover ${String(read)}, walk ${String(expected)}`;
                    const all = edgesOf(element);
                    const one = all.find((e) => e.id === expected);
                    const other = all.find((e) => e.id === read);
                    if (one !== undefined && other !== undefined && overdrawn(element, one, other, x, y)) {
                        overlaps.push(where);
                    } else {
                        differ.push(where);
                    }
                }

                if (overlaps.length > 0) {
                    console.info(`lines drawn over, ${viewMode}:`, overlaps);
                }

                assert.deepEqual(
                    differ.slice(0, 5),
                    [],
                    `${String(differ.length)} differ: ${differ.slice(0, 5).join("; ")}`,
                );
                assert.isAbove(hits, POINTS / 2, "enough points are on an edge");
            },
        );
    }

    it("hovers with a real pointer and measures only the edges near it", async () => {
        const element = await edgeGraph("2d");
        const { graph } = element;
        const canvas = graph.scene.getEngine().getInputElement();
        assert.isNotNull(canvas);
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const [edge] = edgesOf(element);
        const a = graph.worldToScreen(edge.srcNode.drawnWorldPosition);
        const b = graph.worldToScreen(edge.dstNode.drawnWorldPosition);
        const mid = { x: ((a.x + b.x) / 2) * scaling, y: ((a.y + b.y) / 2) * scaling };

        // The first move may rebuild and draw the target.
        await hover(element, { x: 1, y: 1 });
        await element.waitForStableFrame();
        const empty = edgePickWork.measured;
        await hover(element, { x: 2, y: 2 });
        assert.strictEqual(
            edgePickWork.measured - empty,
            1,
            "over empty canvas only the loop the target cannot draw is measured",
        );
        assert.strictEqual(canvas?.style.cursor, "", "empty canvas");

        const before = edgePickWork.measured;
        await hover(element, mid);
        assert.strictEqual(canvas?.style.cursor, "pointer", "a line");
        const measured = edgePickWork.measured - before;
        assert.isAbove(measured, 0, "the edge under the pointer is measured");
        assert.isBelow(measured, EDGES / 4, "only the edges near the pointer are measured");
    });

    it.skipIf(ADAPTER === "")("hovers an edge with a real pointer on WebGPU", async () => {
        const element = await edgeGraph("2d", "batched", "webgpu");
        const { graph } = element;
        assert.isTrue(graph.engine.isWebGPU);
        const canvas = graph.scene.getEngine().getInputElement();
        assert.isNotNull(canvas);
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const [edge] = edgesOf(element);
        const a = graph.worldToScreen(edge.srcNode.drawnWorldPosition);
        const b = graph.worldToScreen(edge.dstNode.drawnWorldPosition);
        // Below the middle of the window, where rows past the first few of an unpadded read were lost.
        const mid = { x: ((a.x + b.x) / 2) * scaling, y: ((a.y + b.y) / 2) * scaling - 3 };
        await hover(element, { x: 1, y: 1 });
        await element.waitForStableFrame();
        await hover(element, mid);
        // The answer comes back after a frame draws the target.
        while (canvas?.style.cursor !== "pointer") {
            await nextFrame();
        }

        assert.strictEqual(canvas.style.cursor, "pointer", "a line");
    });

    it("measures every edge on a move on the objects path, as before", async () => {
        const element = await edgeGraph("2d", "objects");
        assert.isNull(element.graph.getEdgeIdTarget());
        await hover(element, { x: 1, y: 1 });
        const before = edgePickWork.measured;
        await hover(element, { x: 2, y: 2 });
        assert.strictEqual(edgePickWork.measured - before, EDGES + 1, "the walk measures each edge");
    });
});
