/**
 * @file A lit 3D surface stays the color it was styled, at every angle, however pale the color,
 * under each of the element's lightings, and a lighting switched at runtime takes effect.
 *
 * Measured in OKLCH, on every pixel that belongs to a node or a cap. Two ways a light breaks a
 * color, and the color each one shows up on:
 *
 * - a light brighter than the color lifts a PALE color channel by channel toward white, and its
 *   hue slides (yellow goes white-yellow);
 * - a specular light adds white on top, so even a MID color like a plain blue gets a white glint
 *   on every shiny face.
 *
 * The default, "studio" (a key light and a fill, neither with specular, and a rim in the node's
 * own color), lifts a lit face a little past the style color -- 1.13 times its lightness at most
 * in the lighting experiment -- and never to white. "headlight" and "matte" top out at the style
 * color, and "flat" draws exactly it. Shapes with flat faces (tetrahedron, box) are used because
 * each face is lit evenly and a face turned toward the light is where a clamp shows.
 */

import Color from "colorjs.io";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { DEFAULT_LIGHTING, type Lighting, LIGHTING_VALUES } from "../../src/config/Lighting";
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

/**
 * The relative chroma tolerance under the studio lighting, which lifts a lit face past the style
 * color: a saturated blue made lighter loses chroma relative to lightness inside sRGB (measured
 * 0.20 for the mid blue) without any white in it, which the white-pixel count rules out on its own.
 */
const STUDIO_RELATIVE_CHROMA_TOLERANCE = 0.25;

/** How far past the style color's lightness the studio lighting may lift a lit face. */
const STUDIO_MAX_LIGHTNESS_RATIO = 1.15;

/** A pixel with every channel above this has been lifted to white. */
const WHITE = 240;

/** Pixels below this chroma are the gray page, gray edges or anti-aliased silhouette. */
const MIN_CHROMA = 0.04;

/** How far in from the silhouette a pixel must be to count as surface. */
const INTERIOR_RADIUS = 2;

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
    /** Pixels with every channel above {@link WHITE}. */
    white: number;
    /** Lightness spread (95th minus 5th percentile): how much depth the shading gives. */
    spread: number;
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
    const isWhite: boolean[] = [];
    for (let at = 0; at < frame.pixels.length; at += 4) {
        const rgb = [frame.pixels[at], frame.pixels[at + 1], frame.pixels[at + 2]] as const;
        lch.push(oklchOf(rgb));
        isWhite.push(rgb.every((channel) => channel > WHITE));
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
    let white = 0;
    const lightness: number[] = [];

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
            lightness.push(px.l);
            if (isWhite[y * width + x]) {
                white++;
            }
        }
    }

    lightness.sort((a, b) => a - b);
    const at = (q: number): number => lightness[Math.floor((lightness.length - 1) * q)] ?? 0;

    return { pixels, worstHue, worstRelativeChroma, brightest, white, spread: at(0.95) - at(0.05) };
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
    await nextFrameDrawn(graph);

    return { container, graph, frame: await readFrame(graph) };
}

/**
 * Wait until the scene has recompiled whatever the last change dirtied and drawn a frame with it.
 * A frame the element already calls stable is not redrawn by `readFrame` on its own.
 * @param graph - The graph.
 */
async function nextFrameDrawn(graph: Graph): Promise<void> {
    await graph.scene.whenReadyAsync();
    await new Promise<void>((resolve) => {
        graph.scene.onAfterRenderObservable.addOnce(() => {
            resolve();
        });
    });
}

for (const [name, color] of [
    ["a mid blue", MID_BLUE],
    ["the palest default node color", PALEST_DEFAULT],
] as const) {
    describe(`a lit 3D scene in ${name} (${color})`, () => {
        const style = oklchOf(color);
        let container: HTMLElement;
        let graph: Graph;
        const readings = new Map<Lighting | "default", Reading>();

        // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
        beforeAll(async () => {
            let frame: Frame;
            ({ container, graph, frame } = await mount(color));
            readings.set("default", readAgainst(frame, style));
            // Switched at runtime, one after another on the same graph, and back to the default
            // last: each reading is only right if the switch before it took effect.
            for (const lighting of ["matte", "headlight", "flat", "studio"] as const) {
                graph.setLighting(lighting);
                await nextFrameDrawn(graph);
                readings.set(lighting, readAgainst(await readFrame(graph), style));
            }
        }, CASE_TIMEOUT_MS * 4);

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        const reading = (lighting: Lighting | "default"): Reading => {
            const found = readings.get(lighting);
            assert.isDefined(found, `no frame was read under ${lighting}`);
            return found;
        };

        it("is lit studio by default", () => {
            assert.strictEqual(graph.getLighting(), DEFAULT_LIGHTING);
            assert.strictEqual(DEFAULT_LIGHTING, "studio");
        });

        for (const lighting of ["default", ...LIGHTING_VALUES] as const) {
            describe(`under ${lighting}`, () => {
                it("draws the nodes and the cap, in the style color's hue", () => {
                    const r = reading(lighting);
                    assert.isAbove(r.pixels, 500, `Nothing on the canvas is ${color}.`);
                    assert.isAtMost(r.worstHue, HUE_TOLERANCE_DEG, `A lit pixel's hue moved off ${color}.`);
                });

                it("never lifts a pixel to white", () => {
                    const r = reading(lighting);
                    assert.strictEqual(r.white, 0, `${String(r.white)} pixels of ${color} were lifted to white.`);
                    const studio = lighting === "default" || lighting === "studio";
                    assert.isAtMost(
                        r.worstRelativeChroma,
                        studio ? STUDIO_RELATIVE_CHROMA_TOLERANCE : RELATIVE_CHROMA_TOLERANCE,
                        `A lit pixel lost the saturation of ${color}: white was added on top of it.`,
                    );
                });
            });
        }

        for (const lighting of ["default", "studio"] as const) {
            it(`under ${lighting}, lifts a lit face at most ${String(STUDIO_MAX_LIGHTNESS_RATIO)} times the style lightness`, () => {
                const r = reading(lighting);
                assert.isAtMost(r.brightest, style.l * STUDIO_MAX_LIGHTNESS_RATIO, `A lit pixel is too bright.`);
            });
        }

        for (const lighting of ["matte", "headlight"] as const) {
            it(`under ${lighting}, is never lit brighter than the style color itself`, () => {
                assert.isAtMost(
                    reading(lighting).brightest,
                    style.l + LIGHTNESS_HEADROOM,
                    `A lit pixel is brighter than ${color}: the light clamps it toward white.`,
                );
            });
        }

        it("under flat, draws every pixel in exactly the style color", () => {
            const r = reading("flat");
            assert.isAtMost(r.spread, 0.01, "A flat node is shaded.");
            assert.closeTo(r.brightest, style.l, 0.01, `A flat node is not ${color}.`);
        });

        it("under studio, shades with more depth than matte", () => {
            assert.isAbove(reading("studio").spread, reading("matte").spread, "Studio is no rounder than matte.");
        });

        it("switching back at runtime gives the same picture as the default", () => {
            assert.closeTo(reading("studio").brightest, reading("default").brightest, 0.01);
            assert.closeTo(reading("studio").spread, reading("default").spread, 0.01);
        });
    });
}

describe("lighting values", () => {
    it("refuses a value that is not a lighting, keeping the one in effect", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        await graph.init();
        try {
            graph.setLighting("matte");
            assert.throws(() => {
                graph.setLighting("shiny" as Lighting);
            });
            assert.strictEqual(graph.getLighting(), "matte");
        } finally {
            graph.dispose();
            container.remove();
        }
    });
});
