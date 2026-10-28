/**
 * @file Edge shaders, the taper and the lift drawn on a real graph (design/rendering/
 * shader-styles.md, package E5): an edge surface keeps the line's width, taper and arrowheads; an
 * edge effect draws on the line's own route, straight, curved or bent; a tapered edge narrows to
 * its arrowhead; a lifted edge is drawn and picked along its arc, and only for a flat layout in
 * 3D; a removed edge is kept drawn only while an effect on it plays its exit. Clicks are real
 * mouse input (test/helpers/real-input.ts).
 */

import "../../../src/graphty-element";

import { type AbstractMesh, Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import type { Edge } from "../../../src/Edge";
import { operationQueueOf } from "../../../src/Graph";
import { EdgeShaderDrawing } from "../../../src/meshes/EdgeShaderDrawing";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "e5/red",
        glsl: "vec4 shade(EdgeInput e) { return vec4(1.0, 0.0, 0.0, 1.0); }",
    });
    defineShader({
        id: "e5/glow",
        place: "along",
        reach: 3,
        glsl: `vec4 shade(EdgeInput e) {
            float a = 1.0 - smoothstep(0.0, 3.0, abs(e.side));
            return vec4(0.0, a, 0.0, a);
        }`,
    });
    defineShader({
        id: "e5/fade",
        place: "along",
        params: { exiting: { by: "since.unmatched", domain: [0, 0.5] } },
        glsl: `vec4 shade(EdgeInput e) {
            float a = e.sinceExited < 0.0 ? 1.0 : clamp(1.0 - e.sinceExited / 0.5, 0.0, 1.0);
            return vec4(0.0, 0.0, a, a);
        }`,
    });
    defineShader({
        id: "e5/still",
        place: "along",
        glsl: "vec4 shade(EdgeInput e) { return vec4(0.0, 0.0, 1.0, 1.0); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** An edge to add: its ends and the data it carries. */
interface EdgeIn {
    readonly source: string;
    readonly target: string;
    readonly [key: string]: unknown;
}

/**
 * A mounted element with nodes at fixed places.
 * @param nodes - The nodes.
 * @param edges - The edges.
 * @param layers - Layers added after the data.
 * @param view - The view, and whether the layout is flat in it (3D only).
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    edges: readonly EdgeIn[],
    layers: readonly LayerSpec[],
    view: { readonly mode: "2d" | "3d"; readonly dim?: 2 | 3 } = { mode: "2d" },
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
    await element.session.data.addEdges(edges.map((edge) => ({ ...edge })));
    await element.graph.setLayout("fixed", { dim: view.dim ?? 3 });
    await element.setViewMode(view.mode);
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.waitForStableFrame();
    return element;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * The edges of the graph, in the order they were added.
 * @param element - The element.
 * @returns The edges.
 */
function edgesOf(element: Graphty): Edge[] {
    return [...element.graph.getDataManager().edges.values()];
}

/**
 * The canvas pixels of one column or row, after the next frames.
 * @param element - The element.
 * @param from - One end, CSS pixels.
 * @param to - The other end, along one axis.
 * @returns r, g, b, a per pixel.
 */
async function strip(element: Graphty, from: Point, to: Point): Promise<number[][]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const x0 = Math.round(Math.min(from.x, to.x) * scale);
    const x1 = Math.round(Math.max(from.x, to.x) * scale);
    const yTop = Math.round(Math.min(from.y, to.y) * scale);
    const yBottom = Math.round(Math.max(from.y, to.y) * scale);
    const width = Math.max(1, x1 - x0);
    const height = Math.max(1, yBottom - yTop);
    const read = (await engine.readPixels(
        x0,
        engine.getRenderHeight() - yBottom,
        width,
        height,
    )) as unknown as Uint8Array;
    const out: number[][] = [];
    for (let i = 0; i < width * height; i++) {
        out.push([read[i * 4], read[i * 4 + 1], read[i * 4 + 2], read[i * 4 + 3]]);
    }

    return out;
}

/**
 * How many pixels across a horizontal line are drawn, at one x, counting the pixels of a column
 * that differ from the background.
 * @param element - The element.
 * @param x - The world x.
 * @param y - The line's world y.
 * @returns The count.
 */
async function thickness(element: Graphty, x: number, y: number): Promise<number> {
    const top = element.worldToScreen({ x, y: y + 1.5, z: 0 });
    const bottom = element.worldToScreen({ x, y: y - 1.5, z: 0 });
    const column = await strip(element, { x: top.x, y: top.y }, { x: top.x + 1, y: bottom.y });
    const [background] = column;
    return column.filter((pixel) => pixel.slice(0, 3).some((value, i) => Math.abs(value - background[i]) > 40)).length;
}

/**
 * Whether a color is mostly one channel.
 * @param pixel - The pixel.
 * @param channel - 0 red, 1 green, 2 blue.
 * @returns True when that channel leads the others by a margin.
 */
function leads(pixel: readonly number[], channel: number): boolean {
    return [0, 1, 2].every((other) => other === channel || pixel[channel] > pixel[other] + 60);
}

/**
 * The middle of a strip of pixels across a point.
 * @param element - The element.
 * @param at - The world point.
 * @returns The pixel there.
 */
async function pixelAt(element: Graphty, at: { x: number; y: number; z: number }): Promise<number[]> {
    const point = element.worldToScreen(at);
    const [pixel] = await strip(element, point, { x: point.x + 1, y: point.y + 1 });
    return pixel;
}

describe("edge surfaces", () => {
    it("replace the line's color and keep its width, its taper and its arrowheads", async () => {
        const element = await mounted(
            [
                { id: "a", x: -6, y: 3 },
                { id: "b", x: 6, y: 3 },
                { id: "c", x: -6, y: -3 },
                { id: "d", x: 6, y: -3 },
            ],
            [
                { source: "a", target: "b", shaded: true },
                { source: "c", target: "d" },
            ],
            [
                {
                    name: "Lines",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.width": 24, "edge.color": "#3366cc", "edge.arrowHead": "normal" },
                },
                {
                    name: "Red",
                    target: "edge",
                    selector: { match: "has", path: "data.shaded" },
                    set: { "edge.shaders": [{ shader: "e5/red" }] },
                },
            ],
        );
        const [shaded, plain] = edgesOf(element);
        await until(element, "the surface draws the line", () =>
            (shaded.drawnLine?.name ?? "").startsWith("edge-surface|"),
        );

        assert.isTrue(leads(await pixelAt(element, { x: -2, y: 3, z: 0 }), 0), "the surface draws red");
        assert.isTrue(leads(await pixelAt(element, { x: -2, y: -3, z: 0 }), 2), "the plain line stays its blue");
        const surfaceWidth = await thickness(element, -2, 3);
        const plainWidth = await thickness(element, -2, -3);
        assert.isAbove(plainWidth, 2);
        assert.closeTo(surfaceWidth, plainWidth, 1, "the surface keeps the line's width");
        assert.lengthOf(shaded.drawnCaps, 1, "the surface keeps the arrowhead");
        assert.strictEqual(shaded.drawnCaps[0].span, plain.drawnCaps[0].span, "the same arrowhead as the plain line");

        await element.session.styles.add({
            name: "Taper",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.taper": 0.25 },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await until(element, "the tapered surface draws", () =>
            (shaded.drawnLine?.name ?? "").startsWith("edge-surface|"),
        );
        const near = await thickness(element, -3, 3);
        const far = await thickness(element, 2, 3);
        assert.isBelow(far, near, `the tapered surface narrows toward its target (${String(near)} to ${String(far)})`);
        assert.closeTo(far, await thickness(element, 2, -3), 1, "as the tapered plain line does");
    });
});

describe("tapered edges", () => {
    it("narrow toward the target, where the arrowhead sits", async () => {
        const element = await mounted(
            [
                { id: "a", x: -8, y: 0 },
                { id: "b", x: 8, y: 0 },
            ],
            [{ source: "a", target: "b" }],
            [
                {
                    name: "Taper",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.width": 24, "edge.taper": 0.25, "edge.arrowHead": "normal" },
                },
            ],
        );
        const [edge] = edgesOf(element);
        await until(element, "the line draws from a widened batch", () => (edge.drawnLine?.name ?? "").includes("-w"));

        const nearSource = await thickness(element, -5, 0);
        const nearTarget = await thickness(element, 5, 0);
        assert.isBelow(
            nearTarget,
            nearSource * 0.7,
            `narrower at the target (${String(nearSource)} to ${String(nearTarget)})`,
        );
        const cap = edge.arrowCap;
        assert.isNotNull(cap);
        assert.isAbove(cap.position.x, 5, "the arrowhead sits at the narrowed end");
    });
});

describe("edge effects", () => {
    it("draw on the line's own route, straight, curved and bent", async () => {
        const element = await mounted(
            [
                { id: "a", x: -6, y: 5 },
                { id: "b", x: 6, y: 5 },
                { id: "c", x: -6, y: 0 },
                { id: "d", x: 6, y: 0 },
                { id: "e", x: -6, y: -5 },
                { id: "f", x: 6, y: -5 },
            ],
            [
                { source: "a", target: "b" },
                { source: "c", target: "d", curved: true },
                { source: "e", target: "f", bent: true },
            ],
            [
                {
                    name: "Glow",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.width": 8, "edge.color": "#444444", "edge.shaders": [{ shader: "e5/glow" }] },
                },
                {
                    name: "Curve",
                    target: "edge",
                    selector: { match: "has", path: "data.curved" },
                    set: { "edge.curvature": true },
                },
                {
                    name: "Bend",
                    target: "edge",
                    selector: { match: "has", path: "data.bent" },
                    set: { "edge.bends": "0.5,0.2" },
                },
            ],
        );
        const edges = edgesOf(element);
        await until(element, "every edge draws its effect", () =>
            edges.every((edge) => edge.drawnEffects.length === 1),
        );
        await drawnFrames(element.graph.getScene(), 2);

        for (const [i, edge] of edges.entries()) {
            const [effect] = edge.drawnEffects;
            const line = edge.drawnCurve;
            if (line === null) {
                assert.lengthOf(effect.points, 2, "a straight edge's effect is one piece");
                const middle = effect.points[0].add(effect.points[1]).scale(0.5);
                assert.isTrue(middle.equalsWithEpsilon(edge.drawnCentre, 1e-4), "on the straight line");
            } else {
                assert.strictEqual(
                    effect.points.length,
                    line.length,
                    `edge ${String(i)}: one piece per piece of the line`,
                );
                for (const [k, point] of effect.points.entries()) {
                    assert.isTrue(
                        point.equalsWithEpsilon(line[k], 1e-4),
                        `edge ${String(i)}: point ${String(k)} on the route`,
                    );
                }
            }

            // The effect draws three times the line's width: green just beside the line.
            const centre = edge.drawnCentre;
            assert.isTrue(
                leads(await pixelAt(element, centre.add(new Vector3(0, 0.12, 0))), 1),
                `edge ${String(i)} glows beside its line`,
            );
        }
    });
});

describe("lifted edges", () => {
    it("are drawn and picked along the lifted arc for a flat layout in 3D", async () => {
        const element = await mounted(
            [
                { id: "a", x: -6, y: 0 },
                { id: "b", x: 6, y: 0 },
            ],
            [{ source: "a", target: "b" }],
            [{ name: "Arc", target: "edge", selector: { match: "everything" }, set: { "edge.lift": 4 } }],
            { mode: "3d", dim: 2 },
        );
        await element.graph.setCameraState({ position: { x: 0, y: -24, z: 2 }, target: { x: 0, y: 0, z: 1 } });
        await element.graph.waitForStableFrame();
        const [edge] = edgesOf(element);
        await until(element, "the edge draws as an arc", () => (edge.drawnCurve?.length ?? 0) > 8);
        // The view the points are projected through is the one the last drawn frame used.
        await drawnFrames(element.graph.getScene(), 2);
        const arc = edge.drawnCurve ?? [];
        const top = arc.reduce((best, point) => (point.z > best.z ? point : best));
        assert.closeTo(top.z, 4, 0.2, "the arc rises by the lift");

        const world = (edge.mesh as AbstractMesh).getWorldMatrix();
        const onArc = element.worldToScreen(Vector3.TransformCoordinates(top, world));
        const offArc = element.worldToScreen(Vector3.TransformCoordinates(new Vector3(top.x, top.y, 0), world));
        await click(element, offArc);
        await drawnFrames(element.graph.getScene(), 3);
        assert.deepEqual(
            element.session.selection.edges,
            [],
            "a click under the arc, on the straight route, picks nothing",
        );

        await click(element, onArc);
        await drawnFrames(element.graph.getScene(), 3);
        assert.deepEqual(element.session.selection.edges, [edge.id], "a click on the arc picks the edge");
    });

    it("draws flat in the 2D view and reports edge.lift-needs-flat-layout", async () => {
        const element = await mounted(
            [
                { id: "a", x: -6, y: 0 },
                { id: "b", x: 6, y: 0 },
            ],
            [{ source: "a", target: "b" }],
            [],
        );
        const layer = await element.session.styles.add({
            name: "Arc",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.lift": 4 },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await drawnFrames(element.graph.getScene(), 3);
        const [edge] = edgesOf(element);
        assert.isNull(edge.drawnCurve, "the edge is drawn straight");
        assert.deepEqual(element.session.styles.counts(layer.id).undrawn, [
            { code: "edge.lift-needs-flat-layout", params: { count: 1 } },
        ]);
    });
});

describe("removed edges", () => {
    /**
     * A graph of two edges carrying one effect, and a way to read what its batches hold.
     * @param effect - The effect.
     * @returns The element and the stats reader.
     */
    async function withEffect(
        effect: string,
    ): Promise<{ element: Graphty; live: () => number; exiting: () => number }> {
        const element = await mounted(
            [
                { id: "a", x: -6, y: 2 },
                { id: "b", x: 6, y: 2 },
                { id: "c", x: -6, y: -2 },
            ],
            [
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
            [
                {
                    name: "Effect",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.shaders": [{ shader: effect }] },
                },
            ],
        );
        const stats = (): ReturnType<EdgeShaderDrawing["stats"]> | undefined =>
            EdgeShaderDrawing.peek(element.graph.getScene())?.stats();
        const live = (): number => [...(stats()?.slots.values() ?? [])].reduce((sum, count) => sum + count, 0);
        await until(element, "both edges draw the effect", () => live() === 2);
        return { element, live, exiting: () => stats()?.exiting ?? 0 };
    }

    it("go in the same frame when no effect on them has an exit", async () => {
        const { element, live } = await withEffect("e5/still");
        const [gone] = edgesOf(element);
        await element.session.data.removeEdges([gone.id]);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.strictEqual(live(), 1, "the removed edge's effect slot is handed back before the next frame");
        assert.isTrue(gone.isDisposed());
    });

    it("are kept drawn while an effect's exit plays, then go", async () => {
        const { element, live, exiting } = await withEffect("e5/fade");
        const [gone] = edgesOf(element);
        await element.session.data.removeEdges([gone.id]);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.strictEqual(live(), 2, "the removed edge's effect is still drawn");
        assert.strictEqual(exiting(), 1, "while its exit plays");
        await until(element, "the exit ends and its slot is handed back", () => live() === 1 && exiting() === 0);
    });
});
