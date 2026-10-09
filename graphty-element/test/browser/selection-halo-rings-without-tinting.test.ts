/**
 * @file A selected node keeps its own colour; the halo shows as a ring around it.
 *
 * The halo is a translucent sphere a little larger than the node. Drawn with both faces, its
 * front hemisphere sat between the camera and the node, so every selected node was seen through
 * a 40% veil of gold: black read olive, orange read mustard. Only the back hemisphere is drawn
 * now. Behind the node the depth test hides it, and past the node's edge it shows -- a ring.
 *
 * These read pixels, because "which faces are drawn" has no model-level proxy.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Two nodes: one to select, one to compare it against. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

const WIDTH = 640;
const HEIGHT = 480;

/** How far a channel may drift between the selected and the unselected node's centre. */
const SAME = 12;

type Rgb = { r: number; g: number; b: number };

describe("the selection halo rings a node without tinting it", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.getSession().styles.add({
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
        await graph.waitForStableFrame();
        graph.scene.render();
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
     * The mean colour of a 3x3 patch.
     * @param pixels - The frame.
     * @param at - The patch centre.
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

    function node(id: string): { centre: Vector3; radius: number } {
        const found = graph.getNode(id);
        assert.isDefined(found);
        const extent = found.mesh.getBoundingInfo().boundingBox.extendSizeWorld;

        return { centre: found.mesh.absolutePosition.clone(), radius: Math.max(extent.x, extent.y, extent.z) };
    }

    it("leaves a selected black node black, with the ring in the selection colour", async () => {
        await graph.select({ nodes: ["alpha"] });
        const pixels = await readFrame();

        const alpha = node("alpha");
        const selected = patch(pixels, project(alpha.centre));
        const unselected = patch(pixels, project(node("omega").centre));
        const detail = `selected ${JSON.stringify(selected)}, unselected ${JSON.stringify(unselected)}`;

        assert.closeTo(selected.r, unselected.r, SAME, `red: ${detail}`);
        assert.closeTo(selected.g, unselected.g, SAME, `green: ${detail}`);
        assert.closeTo(selected.b, unselected.b, SAME, `blue: ${detail}`);

        // Halfway between the node's edge and the halo's (1.45x the node radius), along the
        // camera's own right so the offset lies in the screen plane.
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        const right = camera.getDirection(Vector3.Right()).normalize();
        const ring = patch(pixels, project(alpha.centre.add(right.scale(alpha.radius * 1.22))));

        // Gold (#FFD700) at 40% over the light background: strong red and green, little blue.
        assert.isAbove(ring.r - ring.b, 40, `the ring carries the gold, read ${JSON.stringify(ring)}`);
        assert.isAbove(ring.g - ring.b, 30, `the ring carries the gold, read ${JSON.stringify(ring)}`);
    });

    it("still draws the halo when the camera is inside it", async () => {
        await graph.select({ nodes: ["alpha"] });
        const before = await readFrame();
        const corner = { x: 4, y: 4 };
        const background = patch(before, corner);

        const halo = graph.scene.meshes.find(
            (mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled(),
        );
        assert.isDefined(halo, "a selected node has a halo");
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);

        // A unit-diameter source, so this scaling puts the sphere's surface twice the camera's
        // distance from its centre: the camera is inside, and the far wall is in front of it.
        halo.scaling.setAll(4 * Vector3.Distance(camera.globalPosition, halo.absolutePosition));
        graph.scene.render();
        const { engine } = graph;
        const inside = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        const tinted = patch(inside, corner);

        assert.isAbove(
            background.b - tinted.b,
            40,
            `the inner wall tints the whole view gold: before ${JSON.stringify(background)}, inside ${JSON.stringify(tinted)}`,
        );
    });
});
