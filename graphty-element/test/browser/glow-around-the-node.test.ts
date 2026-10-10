/**
 * @file A glow is drawn around a node and never over it, and its opacity fades it.
 *
 * The glow used to be a Babylon GlowLayer, which ADDS a blur of the node over the frame, the node
 * included: a glowing node took the glow's color, and around it, added to the light canvas, the
 * glow showed almost nothing. And a glow color with an opacity (`#rrggbbaa`) was parsed by a
 * helper that answers black for anything but `#rrggbb`, so a faded glow was drawn black. Both the
 * fixed glow and one encoded from data (each node its own glow color) are checked.
 *
 * These read pixels, because "drawn around and not over" has no model-level proxy.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { nextFrame } from "../helpers/real-input";

const NODES = [
    { id: "alpha", weight: 1 },
    { id: "omega", weight: 9 },
];

const WIDTH = 640;
const HEIGHT = 480;

/** How far a channel may drift at a node's center when its glow is switched on. */
const SAME = 12;

type Rgb = { r: number; g: number; b: number };

describe("a glow is drawn around the node, not over it", () => {
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
        await graph.setLayout("circular", { scale: 0.3 });
        // Black nodes, so a glow laid over one shows at its center.
        await session.styles.add({
            name: "black nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#000000" },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    async function readFrame(): Promise<Uint8Array> {
        // The stable frame waits for the glow layer's shaders; a few more frames let its blur
        // passes run on what is drawn.
        await graph.waitForStableFrame();
        for (let i = 0; i < 4; i++) {
            graph.scene.render();
            await nextFrame();
        }
        const { engine } = graph;

        return (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
    }

    /**
     * Where a world point lands in the frame buffer (bottom row first).
     * @param at - The world point.
     * @returns Pixel coordinates.
     */
    function project(at: Vector3): { x: number; y: number } {
        const { engine } = graph;
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        const p = Vector3.Project(
            at,
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
        );

        return { x: Math.round(p.x), y: Math.round(engine.getRenderHeight() - p.y) };
    }

    /**
     * The mean color of a 3x3 patch.
     * @param pixels - The frame.
     * @param at - The patch center.
     * @returns The channels.
     */
    function patch(pixels: Uint8Array, at: { x: number; y: number }): Rgb {
        const width = graph.engine.getRenderWidth();
        const sum = { r: 0, g: 0, b: 0 };
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const o = ((at.y + dy) * width + at.x + dx) * 4;
                sum.r += pixels[o];
                sum.g += pixels[o + 1];
                sum.b += pixels[o + 2];
            }
        }

        return { r: sum.r / 9, g: sum.g / 9, b: sum.b / 9 };
    }

    /**
     * A node's center, and a point just past its edge along the camera's right.
     * @param id - The node.
     * @returns The two points, in frame-buffer pixels.
     */
    function spots(id: string): { center: { x: number; y: number }; ring: { x: number; y: number } } {
        const node = graph.getNode(id);
        assert.isDefined(node);
        const extent = node.mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        const radius = Math.max(extent.x, extent.y, extent.z);
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        const right = camera.getDirection(Vector3.Right()).normalize();
        const center = node.mesh.absolutePosition.clone();

        return { center: project(center), ring: project(center.add(right.scale(radius * 1.15))) };
    }

    async function glow(set: Record<string, string>): Promise<string> {
        const layer = await session.styles.add({
            name: "glow",
            target: "node",
            selector: { match: "everything" },
            set,
        });
        await operationQueueOf(graph).waitForCompletion();
        return layer.id;
    }

    it("leaves a glowing node its own color and draws the glow around it", async () => {
        const before = await readFrame();
        await glow({ "node.glow": "#ff00ff" });
        const after = await readFrame();
        const { center, ring } = spots("alpha");

        const was = patch(before, center);
        const now = patch(after, center);
        const detail = `center before ${JSON.stringify(was)}, with glow ${JSON.stringify(now)}`;
        assert.closeTo(now.r, was.r, SAME, `red: ${detail}`);
        assert.closeTo(now.g, was.g, SAME, `green: ${detail}`);
        assert.closeTo(now.b, was.b, SAME, `blue: ${detail}`);

        // Magenta over the light canvas: red and blue stay high, green drops.
        const halo = patch(after, ring);
        const bare = patch(before, ring);
        assert.isAbove(bare.g - halo.g, 20, `the glow shows past the node's edge: ${JSON.stringify({ bare, halo })}`);
        assert.isAbove(halo.r, 200, `the glow is magenta, not dark: ${JSON.stringify(halo)}`);
    });

    it("fades a glow given an opacity, and never draws it black", async () => {
        const before = await readFrame();
        const id = await glow({ "node.glow": "#ff00ff" });
        const opaque = patch(await readFrame(), spots("alpha").ring);
        await session.styles.update(id, { set: { "node.glow": "#ff00ff40" } });
        await operationQueueOf(graph).waitForCompletion();
        const faded = patch(await readFrame(), spots("alpha").ring);
        const bare = patch(before, spots("alpha").ring);

        const detail = JSON.stringify({ bare, opaque, faded });
        assert.isAbove(faded.g, opaque.g + 10, `a quarter-opaque glow is fainter than an opaque one: ${detail}`);
        assert.isAbove(bare.g - faded.g, 5, `it still shows: ${detail}`);
        assert.isAbove(faded.r, 200, `it fades toward the canvas, not toward black: ${detail}`);
        assert.isAbove(faded.b, 200, `it fades toward the canvas, not toward black: ${detail}`);
    });

    it("draws a glow encoded from data around each node, in that node's own color", async () => {
        const before = await readFrame();
        const proposal = session.styles.proposeEncoding({
            column: { kind: "node", name: "weight" },
            channel: "node.glow",
        });
        assert.isTrue(proposal.ok, "the element can glow by a number");
        if (!proposal.ok) {
            return;
        }
        await session.styles.add({
            name: "glow by weight",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.glow": proposal.binding },
        });
        await operationQueueOf(graph).waitForCompletion();
        const after = await readFrame();

        const halos: Rgb[] = [];
        for (const id of ["alpha", "omega"]) {
            const { center, ring } = spots(id);
            const was = patch(before, center);
            const now = patch(after, center);
            assert.closeTo(now.r + now.g + now.b, was.r + was.g + was.b, 3 * SAME, `${id} keeps its color`);
            const halo = patch(after, ring);
            const bare = patch(before, ring);
            const change = Math.abs(halo.r - bare.r) + Math.abs(halo.g - bare.g) + Math.abs(halo.b - bare.b);
            assert.isAbove(change, 30, `${id} glows: ${JSON.stringify({ bare, halo })}`);
            halos.push(halo);
        }
        const [a, b] = halos;
        assert.isAbove(
            Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b),
            20,
            `the two nodes glow in different colors: ${JSON.stringify(halos)}`,
        );
    });
});
