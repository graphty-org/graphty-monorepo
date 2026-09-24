/**
 * @file A lit node has to be SHADED in its own colour, not flooded with it.
 *
 * WHAT A NODE'S COLOUR IS MADE OF. A 3D node is drawn from a shared `StandardMaterial` whose
 * diffuse colour is neutral white and whose emissive colour is a flat fifth of white -- the
 * "minimum brightness floor" that keeps a shadowed surface from going black -- and the node's real
 * colour arrives per instance, in a vertex colour buffer. Babylon's default fragment shader spends
 * that buffer LAST:
 *
 *     finalDiffuse = clamp(diffuseBase * diffuseColor + emissiveColor, 0, 1) * instanceColour
 *
 * With a white diffuse and a 0.2 floor the clamp saturates everywhere the light term passes 0.8,
 * which under this element's single hemispheric light is the whole cap of the node facing the
 * light. Left alone, every pixel inside that cap would come out as the node's flat unshaded colour,
 * and the gradient a material carrying its own colour produces -- where the colour is inside the
 * clamp and the lit pole rides up to 1.2 times it -- would be gone. The plugin in
 * `src/meshes/InstanceColorShading.ts` is what stops that, and this file is what notices if it
 * ever stops working.
 *
 * WHY IT IS WORTH A TEST. Nothing else in the package can see this. The style model reports the
 * colour it resolved, the instance buffer holds the colour it was handed, the mesh is the mesh: by
 * every reading the element takes of itself the node is the right colour. Only the frame buffer
 * knows the lit half of it is flat, and the only reason anyone found out is that a visual baseline
 * from before the colour moved into the buffer disagreed by six to eight percent on the handful of
 * nodes whose lit cap was large enough to cross a diff threshold.
 *
 * HOW IT IS MEASURED, and why not simply "is this pixel 204". The specular highlight adds white,
 * the frame may pass through an image-processing stage, and neither is what this file is about. So
 * the reading is the SPREAD between two channels of the node's colour -- red minus green for an
 * orange node. White added to a pixel lifts both channels together and cancels out of a
 * difference, which makes the spread a measurement of the diffuse term alone.
 *
 * WHAT THE FIX WAS MEASURED AGAINST, once, while it was being written. A material that carries
 * its own colour is the picture this is trying to get back, and it can be built in the same scene:
 * put the colour in the material's diffuse and emissive floor and set the instance buffer to
 * white, and the frame that comes out is plugin-independent, because multiplying by white before
 * or after a clamp is the same thing. Against that reference the element drew 16,268 differing
 * pixels, by up to 33 of 255, before the instance colour was moved inside the clamp; after, 20
 * pixels differ and none of them by more than 1, which is the order the two expressions round in.
 * That measurement is not kept as a test -- it can only be set up by writing a colour into a
 * material by hand, which is the one thing nothing in this package is allowed to do -- so the
 * standing gate is the ceiling below.
 *
 * The arithmetic that makes it a decision rather than a threshold to taste: with the colour spent
 * after the clamp, a pixel is `clamp(...) * colour + white * specular`, so its spread can never
 * exceed the colour's own spread, 153 for the orange used here, however bright the light. With the
 * colour inside the clamp the lit cap climbs to about 1.16 times the colour before it saturates,
 * and the spread measures 178. There is no tuning of the light, the floor or the diffuse that
 * moves the first number: it is a ceiling, and passing it is only possible for a renderer that
 * multiplies the instance colour in before the clamp.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { type Frame, readFrame } from "../helpers/paint-assertions";

/** How wide the canvas is. */
const WIDTH = 480;

/** How tall it is. */
const HEIGHT = 360;

/** One node, because this is a question about one node's surface. */
const NODES = [{ id: "one" }];

/**
 * The node's colour: an orange whose channels are far apart and whose brightest channel has room
 * above it.
 *
 * The spread is what gets measured, so the two channels have to differ by a lot. And red sits at
 * 0.8, which leaves headroom for the 1.18 the lit cap climbs to -- a colour any nearer white would
 * clamp at the top for a second reason and hide the one this file is about.
 */
const COLOR = "#CC3300";

/** The node colour's red channel, 0-255. */
const COLOR_RED = 0xcc;

/** Its green channel. */
const COLOR_GREEN = 0x33;

/**
 * The widest red-minus-green any pixel can show when the instance colour is spent after the clamp.
 *
 * This is the ceiling the fault imposes, not a measurement: `clamp(...)` is at most 1, so the
 * diffuse part of a pixel is at most the colour itself, and the specular part is white and cancels
 * out of the difference.
 */
const FLOODED_SPREAD = COLOR_RED - COLOR_GREEN;

/**
 * How far past that ceiling the lit cap must reach.
 *
 * The shading being asked for measures 178 -- 25 past the ceiling -- so a margin of 8 is well
 * short of it and still unreachable by a renderer that has the fault. It is insurance against a driver that dithers, not a tolerance for a partial fix.
 */
const SHADED_MARGIN = 8;

/**
 * How far apart two channels must be before a pixel counts as the node rather than the page.
 *
 * The background is whitesmoke and the edges are grey, so both read zero here. The node's own
 * darkest visible pixel is about 84 on this measure, and a pixel at the silhouette that has been
 * blended with the background falls below it -- which is the point: a blended pixel is a mixture
 * and has nothing to say about how the surface was shaded.
 */
const NODE_SPREAD = 30;

/** How many frames to render before reading, enough for the instanced-colour shader to compile. */
const FRAMES = 60;

/** Room for a cold browser, a shader compile and sixty frames. */
const CASE_TIMEOUT_MS = 30000;

/** What one frame says about the surface of the one node in it. */
interface Surface {
    /** The widest red-minus-green found on the node. */
    readonly widestSpread: number;
    /** The dimmest red found on the node, which is its shadowed side. */
    readonly dimmestRed: number;
    /** How many pixels were counted as the node, so a reading of nothing cannot pass. */
    readonly pixels: number;
}

/**
 * Read the one node's surface out of a frame.
 * @param frame - The frame, as WebGL handed it back.
 * @returns What the surface looks like.
 */
function surfaceOf(frame: Frame): Surface {
    let widestSpread = 0;
    let dimmestRed = 255;
    let pixels = 0;

    for (let at = 0; at < frame.pixels.length; at += 4) {
        const red = frame.pixels[at];
        const green = frame.pixels[at + 1];
        const spread = red - green;

        if (spread < NODE_SPREAD) {
            continue;
        }

        pixels++;
        widestSpread = Math.max(widestSpread, spread);
        dimmestRed = Math.min(dimmestRed, red);
    }

    return { widestSpread, dimmestRed, pixels };
}

/**
 * Mount a graph holding one node of {@link COLOR}, in the view mode asked for.
 * @param viewMode - "3d" for the lit node, "2d" for the flat one.
 * @returns The graph and the element it was mounted in.
 */
async function mountOneNode(viewMode: "2d" | "3d"): Promise<{ container: HTMLElement; graph: Graph }> {
    const container = document.createElement("div");

    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);

    const graph = new Graph(container);

    // The opening view mode, written where `init()` reads it, rather than a switch afterwards:
    // there is nothing on screen yet to switch.
    graph.styles.config.graph.viewMode = viewMode;
    await graph.init();
    await graph.addNodes(NODES);

    // THROUGH A STYLE LAYER, which is the only way an appearance is allowed to be applied. It also
    // happens to be the path the fault lives on: a layer's colour is interned, so the material is
    // built neutral and the colour is handed to the instance.
    await graph.getSession().styles.add({
        name: "one orange node",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": COLOR },
    });
    await graph.operationQueue.waitForCompletion();

    return { container, graph };
}

describe("a lit node's surface", () => {
    let container: HTMLElement;
    let graph: Graph;
    let surface: Surface;

    beforeAll(async () => {
        ({ container, graph } = await mountOneNode("3d"));
        surface = surfaceOf(await readFrame(graph, FRAMES));
    }, CASE_TIMEOUT_MS);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("is there at all", () => {
        assert.isAbove(
            surface.pixels,
            500,
            `Nothing on the canvas is the node's colour, so there is no surface to read. ` +
                `Either the node was not painted ${COLOR} or it was not drawn.`,
        );
    });

    it("keeps the gradient its own colour makes, instead of flooding with it", () => {
        assert.isAbove(
            surface.widestSpread,
            FLOODED_SPREAD + SHADED_MARGIN,
            `The lit cap of the node is flat. The widest red-minus-green anywhere on it is ` +
                `${String(surface.widestSpread)}, and the node's own colour spreads ` +
                `${String(FLOODED_SPREAD)} -- so no pixel is lit past the flat colour, which is ` +
                `what happens when the per-instance colour is multiplied in AFTER the shader ` +
                `clamps the light term. The colour has to reach the diffuse term before the ` +
                `clamp, not after it.`,
        );
    });

    it("keeps the shadowed side where the brightness floor puts it", () => {
        // The floor is a fifth, and the hemispheric light's ground colour is 0.35, so the dimmest
        // lit pixel is about 0.55 of the colour: 112 of 204. The band is wide enough for the
        // silhouette to be a pixel out and narrow enough to fail a "fix" that lifts the whole
        // surface -- raising the light or dropping the floor buys the gradient back by washing the
        // shadowed side out, and that is a different picture, not this one.
        assert.isAtLeast(
            surface.dimmestRed,
            Math.round(COLOR_RED * 0.45),
            `The shadowed side of the node is darker than the minimum-brightness floor allows.`,
        );
        assert.isAtMost(
            surface.dimmestRed,
            Math.round(COLOR_RED * 0.65),
            `The shadowed side of the node has been washed out: the dimmest red on it is ` +
                `${String(surface.dimmestRed)} where the floor puts it near ` +
                `${String(Math.round(COLOR_RED * 0.55))}. A gradient bought by brightening the ` +
                `light or dropping the floor is a different picture, not the one this asks for.`,
        );
    });
});

describe("a 2D node's surface", () => {
    let container: HTMLElement;
    let graph: Graph;
    let surface: Surface;

    beforeAll(async () => {
        ({ container, graph } = await mountOneNode("2d"));
        surface = surfaceOf(await readFrame(graph, FRAMES));
    }, CASE_TIMEOUT_MS);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("stays flat, because a 2D node is drawn unlit", () => {
        assert.isAbove(surface.pixels, 500, "The 2D node was not drawn in its colour.");

        // Exactly the colour, top and bottom: there is no light in this mode, so every pixel of the
        // disc is the colour it was painted. Stated as a band of one to absorb a byte of rounding
        // between the buffer and the frame.
        assert.closeTo(
            surface.widestSpread,
            FLOODED_SPREAD,
            1,
            `A 2D node is unlit and must be drawn in exactly its own colour.`,
        );
        assert.closeTo(
            surface.dimmestRed,
            COLOR_RED,
            1,
            `A 2D node is unlit and must be drawn in exactly its own colour.`,
        );
    });
});
