/**
 * Fade by age, drawn: with `ageFade: 0.2` an edge starting at the window's first instant draws at
 * about a fifth of its opacity and one near its end at nearly full, a line behind a faded one
 * shows through it, the lines keep drawing while the program switches, an opaque line does not
 * fade, a step uploads no edge slot, and at 1 the picture is the one the timeline-off element draws.
 * The canvas pixels are the measure: a black line over the background leaves
 * `1 - pixel / background` of its alpha there.
 */
import "../../src/graphty-element";

import { type Mesh, type ShaderMaterial } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { EdgeLineBatch, isEdgeLineBatchMesh } from "../../src/meshes/EdgeLineBatch";
import { drawnFrames } from "../helpers/drawn-frames";

const WIDTH = 400;
const HEIGHT = 300;
const AGED = "#define EDGE_AGED";
/** How far a measured alpha may be from the arithmetic: a pixel is a byte, and a blend rounds. */
const ALPHA_TOLERANCE = 0.05;
/** The oldest and the newest instant; the window runs over both. */
const OLD = 2;
const NEW = 9;
/** What the newest edge's opacity is: its age is (10 - 9) / 8 of the window. */
const NEW_ALPHA = 1 - (1 - 0.2) * (1 / 8);

let mounted: Graphty | null = null;

afterEach(() => {
    vi.restoreAllMocks();
    mounted?.remove();
    mounted = null;
});

interface Point {
    readonly x: number;
    readonly y: number;
}

/**
 * An element with an old and a new horizontal edge, and two crossings of an old and a new edge:
 * in one the old edge is nearer the camera, in the other the new one.
 * @param features - The experiments it runs with.
 * @param set - What the edge layer writes besides black, thick lines.
 * @returns The element, drawn.
 */
async function element(features: string[], set: Record<string, unknown> = {}): Promise<Graphty> {
    const graphty = document.createElement("graphty-element");
    graphty.style.display = "block";
    graphty.style.width = `${String(WIDTH)}px`;
    graphty.style.height = `${String(HEIGHT)}px`;
    graphty.features = features;
    document.body.appendChild(graphty);
    mounted = graphty;
    await graphty.updateComplete;
    await operationQueueOf(graphty.graph).waitForCompletion();
    const at = (id: string, x: number, y: number, z = 0): Record<string, unknown> => ({ id, position: { x, y, z } });
    await graphty.session.data.addNodes([
        at("o0", -6, 5),
        at("o1", 6, 5),
        at("n0", -6, 3),
        at("n1", 6, 3),
        // Crossing one: the old edge in front (z 3), the new one behind (z -3); crossing two the other way.
        at("a0", -6, -1, 3),
        at("a1", -2, -1, 3),
        at("b0", -4, 1, -3),
        at("b1", -4, -3, -3),
        at("c0", 2, -1, -3),
        at("c1", 6, -1, -3),
        at("d0", 4, 1, 3),
        at("d1", 4, -3, 3),
    ]);
    await graphty.session.data.addEdges([
        { src: "o0", dst: "o1", t: OLD },
        { src: "n0", dst: "n1", t: NEW },
        { src: "a0", dst: "a1", t: OLD },
        { src: "b0", dst: "b1", t: NEW },
        { src: "c0", dst: "c1", t: OLD },
        { src: "d0", dst: "d1", t: NEW },
    ]);
    await graphty.graph.setLayout("fixed", { dim: 3 });
    await graphty.session.styles.add({
        name: "Lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.width": 8, "edge.color": "#000000", "edge.arrowHead": "none", ...set },
    });
    await drawn(graphty);
    return graphty;
}

/**
 * Wait for what the session says to reach the picture.
 * @param graphty - The element.
 */
async function drawn(graphty: Graphty): Promise<void> {
    await operationQueueOf(graphty.graph).waitForCompletion();
    await graphty.waitForStableFrame();
    await drawnFrames(graphty.graph.getScene(), 2);
}

/**
 * Designate `t` on edges and open a window over every instant.
 * @param graphty - The element.
 */
async function windowed(graphty: Graphty): Promise<void> {
    await graphty.session.time.setField({ edges: { start: "t", unit: "ordinal" } });
    await graphty.session.time.ready;
    await graphty.session.time.window({ from: OLD, to: NEW + 1, step: 1 });
}

/**
 * Where a world point is on screen.
 * @param graphty - The element.
 * @param x - World x.
 * @param y - World y.
 * @param z - World z.
 * @returns CSS pixels.
 */
function screen(graphty: Graphty, x: number, y: number, z = 0): Point {
    return graphty.worldToScreen({ x, y, z });
}

/**
 * Where two segments cross on screen.
 * @param a - One segment's ends.
 * @param b - The other's.
 * @returns The crossing.
 */
function crossing(a: readonly [Point, Point], b: readonly [Point, Point]): Point {
    const [p, p2] = a;
    const [q, q2] = b;
    const r = { x: p2.x - p.x, y: p2.y - p.y };
    const s = { x: q2.x - q.x, y: q2.y - q.y };
    const t = ((q.x - p.x) * s.y - (q.y - p.y) * s.x) / (r.x * s.y - r.y * s.x);
    return { x: p.x + t * r.x, y: p.y + t * r.y };
}

/**
 * The alpha a black line leaves at a screen point, against the background in a corner.
 * @param graphty - The element.
 * @param point - CSS pixels.
 * @returns 0 to 1.
 */
async function alphaAt(graphty: Graphty, point: Point): Promise<number> {
    const { engine } = graphty.graph;
    const scale = engine.getRenderWidth() / WIDTH;
    const read = async (p: Point): Promise<Uint8Array> =>
        (await engine.readPixels(
            Math.round(p.x * scale),
            engine.getRenderHeight() - Math.round(p.y * scale),
            1,
            1,
        )) as unknown as Uint8Array;
    const background = await read({ x: 2, y: 2 });
    // The darkest of a few pixels across the point, so a line a pixel or two wide is read at its middle.
    let alpha = 0;
    for (let dy = -2; dy <= 2; dy++) {
        const pixel = await read({ x: point.x, y: point.y + dy / scale });
        alpha = Math.max(alpha, 1 - pixel[1] / background[1]);
    }

    return alpha;
}

/**
 * The defines of every joined line batch's material.
 * @param graphty - The element.
 * @returns One list per batch.
 */
function lineDefines(graphty: Graphty): string[][] {
    return graphty.graph
        .getScene()
        .meshes.filter((mesh) => isEdgeLineBatchMesh(mesh) && (mesh as Mesh).material !== null)
        .map((mesh) => ((mesh as Mesh).material as ShaderMaterial).options.defines);
}

/**
 * The whole canvas as drawn now.
 * @param graphty - The element.
 * @returns Its bytes.
 */
async function canvasBytes(graphty: Graphty): Promise<Uint8Array> {
    const { engine } = graphty.graph;
    return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
}

describe("fade by age", () => {
    it("fades the oldest edge in the window to the setting, and a line behind it shows through", async () => {
        const graphty = await element(["timeline"]);
        await windowed(graphty);
        await graphty.session.time.setSettings({ ageFade: 0.2 });
        await drawn(graphty);
        for (const defines of lineDefines(graphty)) {
            assert.include(defines, AGED);
        }

        const old = await alphaAt(graphty, screen(graphty, 0, 5));
        const recent = await alphaAt(graphty, screen(graphty, 0, 3));
        assert.closeTo(old, 0.2, ALPHA_TOLERANCE, "the oldest edge draws at the setting");
        assert.closeTo(recent, NEW_ALPHA, ALPHA_TOLERANCE, "an edge near the window's end nearly at full");
        assert.closeTo(old / recent, 0.2 / NEW_ALPHA, 0.06, "old over new");

        for (const [h, v, hz, vz] of [
            [["a0", -6, -2], ["b0", -4, -4], 3, -3],
            [["c0", 2, 6], ["d0", 4, 4], -3, 3],
        ] as const) {
            const across: [Point, Point] = [screen(graphty, h[1], -1, hz), screen(graphty, h[2], -1, hz)];
            const down: [Point, Point] = [screen(graphty, v[1], 1, vz), screen(graphty, v[2], -3, vz)];
            const both = await alphaAt(graphty, crossing(across, down));
            // Both drawn: 1 - (1 - 0.2)(1 - NEW_ALPHA). Hidden by the faded line's depth: 0.2.
            assert.closeTo(both, 1 - 0.8 * (1 - NEW_ALPHA), ALPHA_TOLERANCE, `the crossing at ${h[0]}`);
        }
    });

    it("draws the fade on a graph drawn on demand once the frame is stable", async () => {
        const graphty = await element(["timeline"]);
        await graphty.setRenderSettings({ onDemand: true });
        await windowed(graphty);
        await graphty.session.time.window({ from: OLD - 1, to: NEW + 1, step: 1 });
        await operationQueueOf(graphty.graph).waitForCompletion();
        await graphty.waitForStableFrame();

        // Only the stable frame is waited for: nothing here asks the graph for a frame.
        await graphty.session.time.setSettings({ ageFade: 0.2 });
        await graphty.waitForStableFrame();
        const faded = await alphaAt(graphty, screen(graphty, 0, 5));
        assert.isBelow(faded, 0.5, "the oldest edge faded");

        // The same two edges stay inside: only the uniform moves.
        await graphty.session.time.seek(OLD - 0.5, { commit: false });
        await graphty.waitForStableFrame();
        assert.isBelow(await alphaAt(graphty, screen(graphty, 0, 5)), faded - 0.02, "a step that hides nothing");
    });

    it("keeps the lines drawn through the switch", async () => {
        const graphty = await element(["timeline"]);
        await windowed(graphty);
        await drawn(graphty);
        const scene = graphty.graph.getScene();
        const point = screen(graphty, 0, 3);
        const settled = graphty.session.time.setSettings({ ageFade: 0.2 });
        let frames = 0;
        while (!lineDefines(graphty).every((defines) => defines.includes(AGED))) {
            await drawnFrames(scene, 1);
            frames++;
            assert.isAbove(await alphaAt(graphty, point), 0.5, `frame ${String(frames)} draws the line`);
        }

        await settled;
        await drawn(graphty);
        assert.isAbove(await alphaAt(graphty, point), 0.5, "after the switch");
    });

    it("leaves an opaque line unfaded", async () => {
        const graphty = await element(["timeline"], { "edge.blending": false });
        await windowed(graphty);
        await graphty.session.time.setSettings({ ageFade: 0.2 });
        await drawn(graphty);
        assert.closeTo(await alphaAt(graphty, screen(graphty, 0, 5)), 1, ALPHA_TOLERANCE);
    });

    it("leaves a straight dashed line unfaded", async () => {
        const graphty = await element(["timeline"], { "edge.style": "dash" });
        await windowed(graphty);
        await graphty.session.time.setSettings({ ageFade: 0.2 });
        await drawn(graphty);
        // The darkest point along the old edge, so a gap between dashes is not what is read.
        let alpha = 0;
        for (let x = -3; x <= 3; x += 0.25) {
            alpha = Math.max(alpha, await alphaAt(graphty, screen(graphty, x, 5)));
        }

        assert.closeTo(alpha, 1, ALPHA_TOLERANCE);
    });

    it("a step writes the uniform and no edge slot", async () => {
        const graphty = await element(["timeline"]);
        await windowed(graphty);
        await graphty.session.time.window({ from: OLD - 1, to: NEW + 1, step: 1 });
        await graphty.session.time.setSettings({ ageFade: 0.2 });
        await drawn(graphty);

        // Every upload an edge line batch makes goes through its one send.
        const uploads = vi.spyOn(EdgeLineBatch.prototype as unknown as { send: () => void }, "send");
        const before = await alphaAt(graphty, screen(graphty, 0, 5));
        // The same two edges stay inside: neither instant is passed.
        await graphty.session.time.seek(OLD - 0.5, { commit: false });
        await drawn(graphty);
        assert.strictEqual(uploads.mock.calls.length, 0, "no edge line upload");
        assert.isBelow(await alphaAt(graphty, screen(graphty, 0, 5)), before - 0.02, "the old edge is older now");
    });

    it("at 1 draws what the element without the timeline draws", async () => {
        const off = await element([]);
        const before = await canvasBytes(off);
        off.remove();

        const on = await element(["timeline"]);
        await on.session.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await drawn(on);
        for (const defines of lineDefines(on)) {
            assert.notInclude(defines, AGED);
        }

        const after = await canvasBytes(on);
        assert.strictEqual(after.length, before.length);
        let differ = 0;
        for (let at = 0; at < after.length; at++) {
            differ += Number(Math.abs(after[at] - before[at]) > 1);
        }

        assert.strictEqual(differ, 0, "bytes that differ");
    });
});
