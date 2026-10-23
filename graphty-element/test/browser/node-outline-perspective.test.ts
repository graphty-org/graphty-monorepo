/**
 * @file `node.outline` stays against the node's edge wherever the node is in a 3D view.
 *
 * THE DEFECT. The ring was a flat billboard turned with the camera's ROTATION and lifted toward
 * the camera along the view axis, sized for a node in the middle of the view. Under perspective
 * that lift moves the ring of a node off to the side further out than the node itself, so as the
 * turning graph carried a node toward the side of the view a gap opened between the ring's inner
 * edge and the node: "just a ring floating in space" (the owner's report from the start page).
 *
 * WHAT IS MEASURED. Unlit red nodes with a yellow outline, one in the middle of the view and one
 * near its right side. Along the row through each node's centre, the pixels between the node's
 * last red pixel and the ring's first yellow one, on both sides, must be none (or a pixel of
 * blending). Then the graph is turned the way the start page turns it and the side node measured
 * again.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const WIDTH = 640;
const HEIGHT = 360;

/** A node in the middle, one near the right side, and corners that set the framing. */
const NODES = [
    { id: "middle", position: { x: 0, y: 0, z: 0 } },
    { id: "side", position: { x: 6.5, y: 0, z: 0 } },
    { id: "c1", position: { x: -9, y: -4, z: 0 } },
    { id: "c2", position: { x: 9, y: 4, z: 0 } },
];

/** The most background pixels allowed between the node's edge and the ring: blending only. */
const MAX_GAP = 1;

type Pixel = "red" | "yellow" | "other";

describe("node.outline under perspective", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.setLayout("fixed", { dim: 3 });
        await graph.getSession().styles.add({
            name: "red nodes, outlined in yellow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.unlit": true, "node.color": "#ff0000", "node.size": 2, "node.outline": "#ffff00" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        await graph.scene.whenReadyAsync();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The gaps between a node's red and its ring's yellow, left and right, along the row through
     * the node's centre on screen.
     * @param id - The node.
     * @returns The two gaps in pixels, and where the node's centre is drawn.
     */
    async function gaps(id: string): Promise<{ left: number; right: number; x: number }> {
        const { engine, scene } = graph;
        scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const mesh = graph.getNode(id)?.mesh;
        assert.isOk(mesh);
        const s = Vector3.Project(
            mesh.getAbsolutePosition(),
            Matrix.Identity(),
            scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );
        const x0 = Math.round(s.x);
        const row = Math.round(height - s.y);
        const kind = (x: number): Pixel => {
            const at = (row * width + x) * 4;
            const [r, g, b] = [pixels[at], pixels[at + 1], pixels[at + 2]];
            if (r > 200 && g < 80 && b < 80) {
                return "red";
            }
            return r > 150 && g > 150 && b < 100 ? "yellow" : "other";
        };
        assert.strictEqual(kind(x0), "red", `the centre of ${id} is drawn red`);
        const walk = (step: number): number => {
            let x = x0;
            while (x > 0 && x < width - 1 && kind(x) === "red") {
                x += step;
            }
            let gap = 0;
            while (x > 0 && x < width - 1 && kind(x) === "other") {
                gap++;
                x += step;
            }
            assert.strictEqual(kind(x), "yellow", `${id}'s ring is drawn ${step < 0 ? "left" : "right"} of it`);
            return gap;
        };
        return { left: walk(-1), right: walk(1), x: x0 };
    }

    it("puts the ring against a node in the middle of the view", async () => {
        const g = await gaps("middle");
        assert.isAtMost(Math.max(g.left, g.right), MAX_GAP, `gaps ${JSON.stringify(g)}`);
    });

    it("puts the ring against a node near the side of the view", async () => {
        const g = await gaps("side");
        assert.isAbove(g.x, (WIDTH * 0.65 * graph.engine.getRenderWidth()) / WIDTH, "the node is near the side");
        assert.isAtMost(Math.max(g.left, g.right), MAX_GAP, `gaps ${JSON.stringify(g)}`);
    });

    it("keeps the ring against the node as the graph turns", async () => {
        for (const turn of [0.3, 0.3, 0.3]) {
            assert.isTrue(graph.camera.autoTurn(turn), "the view turns");
            const g = await gaps("side");
            assert.isAtMost(Math.max(g.left, g.right), MAX_GAP, `after a turn: gaps ${JSON.stringify(g)}`);
        }
    });
});
