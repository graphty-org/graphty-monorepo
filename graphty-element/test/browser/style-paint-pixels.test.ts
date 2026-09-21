/**
 * @file What the style system SAYS a node is painted, checked against the pixels on the canvas.
 *
 * WHY THIS FILE EXISTS. Everything else about the migrated style system is asserted against the
 * model: `session-style-paint.test.ts` reads the colour the pass wrote into a node's instance
 * buffer, and the unit tests next to it read the resolved style. Both are the element checking
 * its own arithmetic. `node-instance-color.test.ts` reads real pixels, but of two meshes placed
 * by hand -- it proves Babylon can draw one source mesh in two colours, not that a graph the
 * element painted looks like anything.
 *
 * So there is a join nothing covered: a whole chain from a style layer, through the columnar
 * repaint, through the painter, through the mesh cache and the instanced colour buffer, to the
 * frame. Every link had a test and the chain had none, and a chain like that can be right at
 * every link and still draw the wrong picture -- a frozen material, a camera looking elsewhere,
 * an instance born at its source mesh's parking position far below the scene.
 *
 * HOW IT IS CHECKED, and why this is not circular. The element's own answer to "what is this
 * node painted" is `styles.explain({ node })`, which reads the prepared bindings the repaint
 * painted from. The canvas's answer is the pixel where that node is drawn, found by projecting
 * its world position through the live camera. The two are produced by completely separate
 * machinery -- one is the encoding model, the other is a frame buffer read back off the GPU --
 * so agreement between them is evidence and disagreement is a real defect.
 *
 * The graph below is chosen so the answer cannot be right by accident: degree varies from 1 to
 * 4 across it, so a ramp over degree paints visibly different colours, and a system that painted
 * every node the same would agree with nothing.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/**
 * A star with a tail: the hub carries four edges, the tail node one, and two nodes sit between.
 *
 * Four distinct degrees over five nodes is what makes a ramp legible in a frame this small --
 * two nodes at opposite ends of the domain land far enough apart in any sequential palette that
 * a sampled pixel tells them apart without knowing the palette.
 */
const NODES = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "tail" }];

/** The edges: hub to everything, plus one chord, so degrees run 1, 2, 2, 3, 4. */
const EDGES = [
    { src: "hub", dst: "a" },
    { src: "hub", dst: "b" },
    { src: "hub", dst: "c" },
    { src: "hub", dst: "tail" },
    { src: "a", dst: "b" },
];

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/**
 * How many frames to render before reading the buffer.
 *
 * Babylon compiles a shader asynchronously and the instanced colour buffer is a define on that
 * shader, so the first frames draw in the source material's own colour. This is the same wait
 * `node-instance-color.test.ts` makes, for the same reason.
 */
const FRAMES = 60;

/** How long to leave between frames so the compilation the first one started can land. */
const FRAME_MS = 10;

/**
 * How far apart two channel readings may be, once normalised, and still be the same colour.
 *
 * NORMALISED, because a lit sphere is not painted its own colour: diffuse shading scales all
 * three channels together by how far the surface has turned from the light, so the raw bytes on
 * screen are some fraction of the authored colour and the fraction depends on where the node
 * happens to sit. Dividing through by the strongest channel takes that scaling out and leaves
 * the ratio between the channels, which is what survives shading and is what "the same colour"
 * means here. The tolerance is wide enough for eight-bit rounding at the dark end of a ramp and
 * far too narrow to let one viridis stop pass for another.
 */
const CHANNEL_TOLERANCE = 40;

/**
 * How far apart a pixel's strongest and weakest channel must be to count as carrying a hue.
 *
 * Anything below this is grey, which is the background, the edges and a specular highlight --
 * none of which is a node's own colour.
 */
const COLOURED = 24;

describe("what the style system says, and what the canvas shows", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render until the shaders have compiled, then read the frame off the GPU.
     * @returns The pixels, four bytes each, bottom row first, as WebGL hands them back.
     */
    async function readFrame(): Promise<Uint8Array> {
        const { engine } = graph;

        for (let frame = 0; frame < FRAMES; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
    }

    /**
     * The most colourful pixel within a few pixels of where one node is drawn.
     *
     * MOST COLOURFUL RATHER THAN BRIGHTEST, and the difference is the whole measurement. The
     * element's default background is whitesmoke and a sphere carries a near-white specular
     * highlight, so "brightest" finds the background or the highlight on every node and reports
     * the same near-white for all of them -- a reading that agrees with nothing and would fail a
     * correct picture. Both of those are grey, though: what separates a node from the paper it is
     * drawn on is that the node has a hue. So the pixel with the widest spread between its
     * strongest and weakest channel is the one carrying the most of the instance's own colour.
     *
     * A radius rather than a point because projection lands between pixels and a node is a few
     * pixels wide.
     * @param pixels - The frame.
     * @param at - Where the node is in world space.
     * @returns The channels of that pixel, or null when nothing near it carries a hue at all.
     */
    function sample(pixels: Uint8Array, at: Vector3): { r: number; g: number; b: number } | null {
        const { engine } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const camera = graph.scene.activeCamera;

        assert.isNotNull(camera, "a graph that has rendered has an active camera");

        const projected = Vector3.Project(
            at,
            // Identity, because `absolutePosition` is already world space. The transform matrix
            // the scene hands back is view times projection, which is the rest of the journey.
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );

        // WebGL reads bottom row first and projection counts from the top, so y is flipped here
        // rather than at every use.
        const centreX = Math.round(projected.x);
        const centreY = Math.round(height - projected.y);
        const radius = 12;
        let best: { r: number; g: number; b: number } | null = null;
        let bestSpread = 0;

        for (let y = centreY - radius; y <= centreY + radius; y++) {
            for (let x = centreX - radius; x <= centreX + radius; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) {
                    continue;
                }

                const offset = (y * width + x) * 4;
                const pixel = { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] };
                const spread = Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b);

                if (spread < COLOURED) {
                    continue;
                }

                if (best === null || spread > bestSpread) {
                    best = pixel;
                    bestSpread = spread;
                }
            }
        }

        return best;
    }

    /**
     * The colour the element says one node is painted, as three channels.
     * @param id - The node id.
     * @returns The channels, or null when nothing painted a colour onto it.
     */
    function saidToBe(id: string): { r: number; g: number; b: number } | null {
        const painted = session.styles.explain({ node: id }).merged["node.color"];

        if (typeof painted !== "object" || painted === null || !("r" in painted)) {
            return null;
        }

        // `Rgba` already counts 0 to 255, which is the frame buffer's own scale, so the two
        // readings are directly comparable and nothing is converted here.
        const { r, g, b } = painted as { r: number; g: number; b: number };

        return { r, g, b };
    }

    /**
     * One colour with its strongest channel scaled to 255, so two readings of the same colour at
     * different brightnesses come out equal.
     * @param colour - The channels.
     * @returns The same hue at full strength.
     */
    function normalised(colour: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
        const peak = Math.max(colour.r, colour.g, colour.b);

        if (peak === 0) {
            return colour;
        }

        return {
            r: Math.round((colour.r / peak) * 255),
            g: Math.round((colour.g / peak) * 255),
            b: Math.round((colour.b / peak) * 255),
        };
    }

    /**
     * Where one node is drawn, in world space.
     * @param id - The node id.
     * @returns The position.
     */
    function positionOf(id: string): Vector3 {
        const node = graph.getNodes().find((candidate) => String(candidate.id) === id);

        assert.isDefined(node, `the graph holds a node called ${id}`);

        return node.mesh.absolutePosition;
    }

    it("draws the element's own default colour, and says it is drawing it", async () => {
        const pixels = await readFrame();
        const said = saidToBe("hub");

        assert.isNotNull(said, "the element's base layer paints every node a colour");

        const shown = sample(pixels, positionOf("hub"));

        assert.isNotNull(shown, "and the node is actually on screen where the camera is looking");

        const drawn = normalised(shown);
        const meant = normalised(said);

        assert.closeTo(drawn.r, meant.r, CHANNEL_TOLERANCE, "red");
        assert.closeTo(drawn.g, meant.g, CHANNEL_TOLERANCE, "green");
        assert.closeTo(drawn.b, meant.b, CHANNEL_TOLERANCE, "blue");
    });

    it("draws an algorithm's ramp, node by node, in the colours it reports", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });
        await graph.operationQueue.waitForCompletion();

        const pixels = await readFrame();
        const checked: string[] = [];

        // The hub and the tail sit at opposite ends of the degree domain, so they are the pair a
        // ramp has the most to say about and the pair a broken ramp is most likely to collapse.
        for (const id of ["hub", "tail"]) {
            const said = saidToBe(id);

            assert.isNotNull(said, `the encoding painted ${id}`);

            const shown = sample(pixels, positionOf(id));

            assert.isNotNull(shown, `${id} is on screen`);

            const drawn = normalised(shown);
            const meant = normalised(said);

            assert.closeTo(drawn.r, meant.r, CHANNEL_TOLERANCE, `${id} red`);
            assert.closeTo(drawn.g, meant.g, CHANNEL_TOLERANCE, `${id} green`);
            assert.closeTo(drawn.b, meant.b, CHANNEL_TOLERANCE, `${id} blue`);
            checked.push(`${said.r},${said.g},${said.b}`);
        }

        // Without this the test above would pass on a ramp that had collapsed to one colour: two
        // nodes agreeing with a model that says they are identical proves only that nothing
        // painted anything.
        assert.strictEqual(new Set(checked).size, 2, "the busiest node and the quietest are not painted alike");
    });
});
