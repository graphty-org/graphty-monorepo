/**
 * @file The two edge line options cosmos.gl offers for dense graphs, drawn on a real graph:
 * `line.fade` fades a line by its length on screen, and `line.blending` false draws it without
 * alpha blending. Both are off by default. The canvas pixels are the measure: a black line over a
 * plain background leaves `1 - pixel / background` of its alpha there. Zooming is real wheel input.
 */

import "../../src/graphty-element";

import type { Mesh, ShaderMaterial } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { clearRegisteredShadersForTesting } from "../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { defineShader } from "../../src/simple/defineShader";
import { drawnFrames } from "../helpers/drawn-frames";
import { wheel } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** How far a measured alpha may be from the arithmetic: a pixel is a byte, and a blend rounds. */
const ALPHA_TOLERANCE = 0.03;

/** The long edge's y, and the short one's. */
const LONG_Y = 3;
const SHORT_Y = -3;

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({ id: "fade/black", glsl: "vec4 shade(EdgeInput e) { return vec4(0.0, 0.0, 0.0, 1.0); }" });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A layer painting every edge.
 * @param set - What it writes over thick black lines.
 * @returns The layer.
 */
function edges(set: Record<string, unknown>): LayerSpec {
    return {
        name: "Lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.width": 24, "edge.color": "#000000", "edge.arrowHead": "none", ...set },
    };
}

/**
 * A mounted element with a long edge above a short one, drawn with one layer.
 * @param set - What the layer writes.
 * @param mode - The view.
 * @returns The element.
 */
async function mounted(set: Record<string, unknown>, mode: "2d" | "3d" = "2d"): Promise<Graphty> {
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
    await element.session.data.addNodes([
        { id: "a", position: { x: -6, y: LONG_Y, z: 0 } },
        { id: "b", position: { x: 6, y: LONG_Y, z: 0 } },
        { id: "c", position: { x: -1.5, y: SHORT_Y, z: 0 } },
        { id: "d", position: { x: 1.5, y: SHORT_Y, z: 0 } },
    ]);
    await element.session.data.addEdges([
        { source: "a", target: "b" },
        { source: "c", target: "d" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(mode);
    await element.session.styles.add(edges(set));
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.waitForStableFrame();
    return element;
}

/**
 * The canvas pixel at a world point, after the next frames.
 * @param element - The element.
 * @param x - The world x.
 * @param y - The world y.
 * @returns r, g, b, a.
 */
async function pixelAt(element: Graphty, x: number, y: number): Promise<Uint8Array> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const point = element.worldToScreen({ x, y, z: 0 });
    const scale = engine.getRenderWidth() / WIDTH;
    const read = engine.readPixels(
        Math.round(point.x * scale),
        engine.getRenderHeight() - Math.round(point.y * scale),
        1,
        1,
    );
    return (await read) as unknown as Uint8Array;
}

/**
 * What alpha a black line leaves at a world point, against the empty background beside the graph.
 * @param element - The element.
 * @param x - The world x.
 * @param y - The world y.
 * @returns The alpha, 0 to 1.
 */
async function alphaAt(element: Graphty, x: number, y: number): Promise<number> {
    const background = await pixelAt(element, 0, 0);
    const pixel = await pixelAt(element, x, y);
    return 1 - pixel[1] / background[1];
}

/**
 * How long a horizontal edge is drawn on screen, in CSS pixels.
 * @param element - The element.
 * @param half - Half the edge's world length.
 * @param y - The edge's world y.
 * @returns The length.
 */
function screenLength(element: Graphty, half: number, y: number): number {
    return element.worldToScreen({ x: half, y, z: 0 }).x - element.worldToScreen({ x: -half, y, z: 0 }).x;
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
 * The defines an edge's line is compiled with.
 * @param edge - The edge.
 * @returns The defines.
 */
function definesOf(edge: Edge): string[] {
    return ((edge.mesh as Mesh).material as ShaderMaterial).options.defines;
}

describe("line.fade", () => {
    for (const mode of ["2d", "3d"] as const) {
        it(`fades a line past its end and leaves one under its start alone, in ${mode}`, async () => {
            const measuring = await mounted({}, mode);
            const short = screenLength(measuring, 1.5, SHORT_Y);
            const long = screenLength(measuring, 6, LONG_Y);
            assert.isAbove(long, short + 40);

            const element = await mounted({ "edge.fadeStart": short + 10, "edge.fadeEnd": long - 10 }, mode);

            assert.closeTo(await alphaAt(element, 3, LONG_Y), 0.25, ALPHA_TOLERANCE, "the long line");
            assert.closeTo(await alphaAt(element, 0, SHORT_Y), 1, ALPHA_TOLERANCE, "the short line");
        });
    }

    it("fades in proportion between its start and end, and multiplies the line's opacity", async () => {
        const measuring = await mounted({});
        const long = screenLength(measuring, 6, LONG_Y);

        const halfWay = await mounted({ "edge.fadeStart": 0, "edge.fadeEnd": 2 * long, "edge.fadeOpacity": 0 });
        assert.closeTo(await alphaAt(halfWay, 3, LONG_Y), 0.5, ALPHA_TOLERANCE);

        const translucent = await mounted({ "edge.opacity": 0.5, "edge.fadeEnd": 1, "edge.fadeOpacity": 0.5 });
        assert.closeTo(await alphaAt(translucent, 3, LONG_Y), 0.25, ALPHA_TOLERANCE);
    });

    it("follows the line's length on screen as the reader zooms", async () => {
        const measuring = await mounted({});
        const long = screenLength(measuring, 6, LONG_Y);

        const element = await mounted({ "edge.fadeStart": long, "edge.fadeEnd": 2 * long, "edge.fadeOpacity": 0 });
        assert.closeTo(await alphaAt(element, 3, LONG_Y), 1, ALPHA_TOLERANCE, "at its start before the zoom");

        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        const scene = element.graph.getScene();
        for (let i = 0; i < 30 && screenLength(element, 6, LONG_Y) < 1.2 * long; i++) {
            await wheel(canvas, { x: WIDTH / 2, y: HEIGHT / 2 }, -120);
            await drawnFrames(scene, 2);
        }

        const zoomed = screenLength(element, 6, LONG_Y);
        assert.isAbove(zoomed, 1.2 * long, "the wheel zoomed in");
        const expected = 2 - zoomed / long;
        // the line has grown past the canvas at this zoom, so the middle of it is what is read
        assert.closeTo(await alphaAt(element, 0, LONG_Y), expected, ALPHA_TOLERANCE, "fainter once longer on screen");
    });

    it("measures a bent edge whole, so every piece of it fades alike", async () => {
        const measuring = await mounted({});
        const long = screenLength(measuring, 6, LONG_Y);
        // Each of the two pieces is about half the edge, so a fade by piece would leave them whole.
        const element = await mounted({
            "edge.bends": "0.5,0.1",
            "edge.fadeStart": 0.7 * long,
            "edge.fadeEnd": 0.9 * long,
        });

        assert.closeTo(await alphaAt(element, -3, LONG_Y + 0.6), 0.25, ALPHA_TOLERANCE, "the first piece");
        assert.closeTo(await alphaAt(element, 3, LONG_Y + 0.6), 0.25, ALPHA_TOLERANCE, "the second piece");
    });

    it("fades a line drawn with a surface", async () => {
        const element = await mounted({ "edge.shaders": [{ shader: "fade/black" }], "edge.fadeEnd": 1 });
        const [line] = edgesOf(element);
        const scene = element.graph.getScene();
        for (let i = 0; i < 600 && !(line.drawnLine?.name ?? "").startsWith("edge-surface|"); i++) {
            await drawnFrames(scene, 1);
        }

        assert.include(line.drawnLine?.name ?? "", "edge-surface|");
        assert.closeTo(await alphaAt(element, 3, LONG_Y), 0.25, ALPHA_TOLERANCE);
    });

    it("draws nothing different with no end, which is the default", async () => {
        const element = await mounted({ "edge.fadeStart": 0, "edge.fadeOpacity": 0 });

        assert.closeTo(await alphaAt(element, 3, LONG_Y), 1, ALPHA_TOLERANCE);
        const defines = definesOf(edgesOf(element)[0]);
        assert.notInclude(defines, "#define EDGE_FADE");
        assert.notInclude(defines, "#define EDGE_WIDENED", "an unfaded line pays for no static values");
    });
});

describe("line.blending", () => {
    for (const mode of ["2d", "3d"] as const) {
        it(`false draws the line at full strength whatever its opacity or fade, in ${mode}`, async () => {
            const element = await mounted(
                { "edge.blending": false, "edge.opacity": 0.2, "edge.fadeEnd": 1, "edge.fadeOpacity": 0 },
                mode,
            );

            assert.closeTo(await alphaAt(element, 3, LONG_Y), 1, ALPHA_TOLERANCE);
            const pixel = await pixelAt(element, 3, LONG_Y);
            assert.strictEqual(pixel[3], 255, "and writes an opaque canvas pixel");
            const [edge] = edgesOf(element);
            assert.include(definesOf(edge), "#define EDGE_OPAQUE");
            const mesh = edge.mesh as Mesh;
            assert.isFalse(mesh.material?.needAlphaBlendingForMesh(mesh), "and is drawn in the opaque pass");
        });
    }

    it("false draws a line under a pixel wide at full strength", async () => {
        const element = await mounted({ "edge.width": 0.1, "edge.blending": false });
        const blended = await mounted({ "edge.width": 0.1 });

        // Antialiasing still softens a one-pixel line that falls between pixels, so it is the
        // comparison that holds, not an alpha of 1.
        assert.isAbove(await thinAlpha(element), (await thinAlpha(blended)) + 0.2);
    });

    it("blends when left unset or true", async () => {
        for (const set of [{}, { "edge.blending": true }]) {
            const element = await mounted({ "edge.opacity": 0.5, ...set });
            assert.closeTo(await alphaAt(element, 3, LONG_Y), 0.5, ALPHA_TOLERANCE);
            assert.notInclude(definesOf(edgesOf(element)[0]), "#define EDGE_OPAQUE");
        }
    });
});

/**
 * The strongest alpha in a column across the long edge, for a line too thin to hit by a point.
 * @param element - The element.
 * @returns The alpha.
 */
async function thinAlpha(element: Graphty): Promise<number> {
    let strongest = 0;
    for (let dy = -0.1; dy <= 0.1; dy += 0.01) {
        strongest = Math.max(strongest, await alphaAt(element, 3, LONG_Y + dy));
    }

    return strongest;
}
