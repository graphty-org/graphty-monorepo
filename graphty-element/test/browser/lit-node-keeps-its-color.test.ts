/**
 * @file A lit 3D surface stays the color it was styled, at every angle, however pale the color.
 *
 * A 3D node's lit color is `clamp(light * color + 0.2 * color)` plus whatever specular the light
 * adds. The scene's one light is matte (no specular) and its intensity is 0.8, so the face turned
 * straight at it comes out at exactly the style color and nothing comes out brighter. Two ways
 * that breaks, and the color each one shows up on:
 *
 * - a light brighter than 0.8 lifts the full-facing face past 1.0 times the color, so a PALE
 *   color clamps channel by channel toward white and its hue slides (yellow goes white-yellow);
 * - a specular light adds white on top, so even a MID color like a plain blue gets a white glint
 *   on every shiny face and on the round arrow caps.
 *
 * Measured in OKLCH, on every pixel that belongs to a node or a cap: the hue stays within 10
 * degrees of the style color's, the lightness never rises past the style color's own plus 0.02,
 * and the chroma relative to lightness (C / L, which a shadow keeps and white wash destroys) stays
 * within 15% of the style color's. Shapes with flat faces (tetrahedron, box) are used because each
 * face is lit evenly and a face turned toward the light is where the clamp shows.
 */

import Color from "colorjs.io";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { OKABE_ITO_COLORS } from "../../src/config/palettes/categorical";
import { Graph, operationQueueOf } from "../../src/Graph";
import { type Frame, readFrame } from "../helpers/paint-assertions";

const WIDTH = 480;
const HEIGHT = 360;

/** A mid blue: fails on the specular glint. */
const MID_BLUE = "#3B82F6";

/** The palest color of the element's default categorical node palette: fails on the clamp. */
const PALEST_DEFAULT = [...OKABE_ITO_COLORS].sort((a, b) => oklchOf(b).l - oklchOf(a).l)[0];

/** Orbit: yaw 200 degrees around the vertical, pitch 50 degrees above the horizon. */
const YAW = (200 * Math.PI) / 180;
const PITCH = (50 * Math.PI) / 180;

const HUE_TOLERANCE_DEG = 10;
const RELATIVE_CHROMA_TOLERANCE = 0.15;
const LIGHTNESS_HEADROOM = 0.02;

/** Pixels below this chroma are the gray page, gray edges or anti-aliased silhouette. */
const MIN_CHROMA = 0.04;

/** How far in from the silhouette a pixel must be to count as surface. */
const INTERIOR_RADIUS = 2;

const FRAMES = 60;
const CASE_TIMEOUT_MS = 30000;

interface Lch {
    l: number;
    c: number;
    h: number;
}

/**
 * OKLCH of an sRGB color.
 * @param color - A hex string, or 0-255 channels.
 * @returns Lightness 0-1, chroma, hue in degrees.
 */
function oklchOf(color: string | readonly [number, number, number]): Lch {
    const c =
        typeof color === "string"
            ? new Color(color)
            : new Color("srgb", [color[0] / 255, color[1] / 255, color[2] / 255]);
    const [l, chroma, h] = c.to("oklch").coords;

    return { l: l ?? 0, c: chroma ?? 0, h: Number.isNaN(h) ? 0 : (h ?? 0) };
}

/**
 * Smallest angle between two hues.
 * @param a - Degrees.
 * @param b - Degrees.
 * @returns Degrees, 0-180.
 */
function hueDistance(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;

    return d > 180 ? 360 - d : d;
}

interface Reading {
    pixels: number;
    worstHue: number;
    worstRelativeChroma: number;
    brightest: number;
}

/**
 * Read every pixel of a frame that is wholly a node or a cap against the style color.
 *
 * A pixel counts only when every pixel within {@link INTERIOR_RADIUS} of it is colored too. The
 * silhouette is anti-aliased against the near-white page, and a blended pixel is lighter and
 * grayer than any surface: it says nothing about how the surface was lit.
 * @param frame - The frame.
 * @param style - The style color.
 * @returns The worst deviations found.
 */
function readAgainst(frame: Frame, style: Lch): Reading {
    const { width, height } = frame;
    const lch: Lch[] = [];
    for (let at = 0; at < frame.pixels.length; at += 4) {
        lch.push(oklchOf([frame.pixels[at], frame.pixels[at + 1], frame.pixels[at + 2]]));
    }
    const colored = (x: number, y: number): boolean =>
        x >= 0 && y >= 0 && x < width && y < height && lch[y * width + x].c >= MIN_CHROMA;
    const interior = (x: number, y: number): boolean => {
        for (let dy = -INTERIOR_RADIUS; dy <= INTERIOR_RADIUS; dy++) {
            for (let dx = -INTERIOR_RADIUS; dx <= INTERIOR_RADIUS; dx++) {
                if (!colored(x + dx, y + dy)) {
                    return false;
                }
            }
        }

        return true;
    };

    const styleRatio = style.c / style.l;
    let pixels = 0;
    let worstHue = 0;
    let worstRelativeChroma = 0;
    let brightest = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!interior(x, y)) {
                continue;
            }

            const px = lch[y * width + x];
            pixels++;
            worstHue = Math.max(worstHue, hueDistance(px.h, style.h));
            worstRelativeChroma = Math.max(worstRelativeChroma, Math.abs(px.c / px.l / styleRatio - 1));
            brightest = Math.max(brightest, px.l);
        }
    }

    return { pixels, worstHue, worstRelativeChroma, brightest };
}

/**
 * Mount a tetrahedron and a box joined by an edge with a sphere-dot cap, all in one color, and
 * orbit the camera to the test angle.
 * @param color - The style color.
 * @returns The graph, its container and the frame.
 */
async function mount(color: string): Promise<{ container: HTMLElement; graph: Graph; frame: Frame }> {
    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);

    const graph = new Graph(container);
    void graph.setViewMode("3d");
    await graph.init();
    await graph.addNodes([{ id: "tetra" }, { id: "box" }]);
    await graph.addEdges([{ src: "tetra", dst: "box" }]);

    const session = graph.getSession();
    await session.styles.add({
        name: "one color",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": color },
    });
    await session.styles.add({
        name: "tetrahedron",
        target: "node",
        selector: { match: "ids", nodes: ["tetra"] },
        set: { "node.shape": "tetrahedron" },
    });
    await session.styles.add({
        name: "box",
        target: "node",
        selector: { match: "ids", nodes: ["box"] },
        set: { "node.shape": "box" },
    });
    await session.styles.add({
        name: "sphere-dot cap",
        target: "edge",
        selector: { match: "everything" },
        set: {
            "edge.color": color,
            "edge.arrowHead": "sphere-dot",
            "edge.arrowHeadSize": 3,
            "edge.arrowHeadColor": color,
        },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame({ timeoutMs: CASE_TIMEOUT_MS });

    const state = graph.getCameraState();
    const target = state.target ?? { x: 0, y: 0, z: 0 };
    const position = state.position ?? { x: 0, y: 0, z: 1 };
    const radius = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
    await graph.setCameraState({ alpha: YAW, beta: Math.PI / 2 - PITCH, radius, target });

    return { container, graph, frame: await readFrame(graph, FRAMES) };
}

for (const [name, color] of [
    ["a mid blue", MID_BLUE],
    ["the palest default node color", PALEST_DEFAULT],
] as const) {
    describe(`a lit 3D scene in ${name} (${color})`, () => {
        const style = oklchOf(color);
        let container: HTMLElement;
        let graph: Graph;
        let reading: Reading;

        beforeAll(async () => {
            let frame: Frame;
            ({ container, graph, frame } = await mount(color));
            reading = readAgainst(frame, style);
        }, CASE_TIMEOUT_MS * 2);

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        it("draws the nodes and the cap", () => {
            assert.isAbove(reading.pixels, 500, `Nothing on the canvas is ${color}.`);
        });

        it("keeps the style color's hue", () => {
            assert.isAtMost(reading.worstHue, HUE_TOLERANCE_DEG, `A lit pixel's hue moved off ${color}.`);
        });

        it("is never washed toward white", () => {
            assert.isAtMost(
                reading.worstRelativeChroma,
                RELATIVE_CHROMA_TOLERANCE,
                `A lit pixel lost the saturation of ${color}: white was added on top of it.`,
            );
        });

        it("is never lit brighter than the style color itself", () => {
            assert.isAtMost(
                reading.brightest,
                style.l + LIGHTNESS_HEADROOM,
                `A lit pixel is brighter than ${color}: the light clamps it toward white.`,
            );
        });
    });
}
