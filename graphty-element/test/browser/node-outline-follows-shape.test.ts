/**
 * @file `node.outline` hugs a node that is not round, along its short side as well as its long one.
 *
 * THE DEFECT (#10406). The ring was a circle of the node's LONGEST half-extent, so around a capsule
 * (half as wide as it is tall) the ring met the node at the top and bottom and stood several pixels
 * off it at the sides.
 *
 * WHAT IS MEASURED. Unlit red capsules with a yellow outline, in 2D and in 3D. From the node's
 * center on screen, walk left, right, up and down: the background pixels between the node's last
 * red pixel and the ring's first yellow one must be none (or a pixel of blending) on every walk.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const WIDTH = 640;
const HEIGHT = 360;

/** The most background pixels allowed between the node's edge and the ring: blending only. */
const MAX_GAP = 1.5;

type Pixel = "red" | "yellow" | "other";

describe("node.outline on a node that is not round", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
        graph = undefined;
        container = undefined;
    });

    /**
     * Draw two outlined capsules, and two more at the corners that set the framing.
     * @param mode - The view mode.
     * @returns The graph.
     */
    async function capsules(mode: "2d" | "3d"): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        await g.setViewMode(mode);
        await g.addNodes([
            { id: "a", position: { x: -3, y: 0, z: 0 } },
            { id: "b", position: { x: 3, y: 0, z: 0 } },
            // Corners that set the framing, so the measured nodes and their rings are in view.
            { id: "c1", position: { x: -9, y: -4, z: 0 } },
            { id: "c2", position: { x: 9, y: 4, z: 0 } },
        ]);
        await g.setLayout("fixed", { dim: mode === "2d" ? 2 : 3 });
        await g.getSession().styles.add({
            name: "red capsules, outlined in yellow",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.shape": "capsule",
                "node.unlit": true,
                "node.color": "#ff0000",
                "node.size": 2,
                "node.outline": "#ffff00",
            },
        });
        await operationQueueOf(g).waitForCompletion();
        await g.waitForStableFrame();
        await g.scene.whenReadyAsync();
        return g;
    }

    /**
     * The background gaps between a node's red and its ring's yellow, walking from the node's
     * center on screen in the four directions.
     * @param g - The graph.
     * @param id - The node.
     * @returns The gaps in pixels.
     */
    async function gaps(g: Graph, id: string): Promise<Record<"left" | "right" | "up" | "down", number>> {
        const { engine, scene } = g;
        scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const mesh = g.getNode(id)?.mesh;
        assert.isOk(mesh);
        const s = Vector3.Project(
            mesh.getAbsolutePosition(),
            Matrix.Identity(),
            scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );
        const x0 = Math.round(s.x);
        const y0 = Math.round(height - s.y);
        const kind = (x: number, y: number): Pixel => {
            const at = (y * width + x) * 4;
            const [r, gr, b] = [pixels[at], pixels[at + 1], pixels[at + 2]];
            if (r > 200 && gr < 80 && b < 80) {
                return "red";
            }
            return r > 150 && gr > 150 && b < 100 ? "yellow" : "other";
        };
        assert.strictEqual(kind(x0, y0), "red", `the centre of ${id} is drawn red`);
        const inside = (x: number, y: number): boolean => x > 0 && y > 0 && x < width - 1 && y < height - 1;
        const walk = (dx: number, dy: number): number => {
            let [x, y] = [x0, y0];
            while (inside(x, y) && kind(x, y) === "red") {
                x += dx;
                y += dy;
            }
            let gap = 0;
            while (inside(x, y) && kind(x, y) === "other") {
                gap++;
                x += dx;
                y += dy;
            }
            assert.strictEqual(
                kind(x, y),
                "yellow",
                `${id} ring is drawn past it (${String(dx)}, ${String(dy)}) at ${String(x)},${String(y)}`,
            );
            return gap;
        };
        return { left: walk(-1, 0), right: walk(1, 0), up: walk(0, -1), down: walk(0, 1) };
    }

    for (const mode of ["2d", "3d"] as const) {
        it(`puts the ring against a capsule on every side in ${mode}`, async () => {
            const g = await capsules(mode);
            for (const id of ["a", "b"]) {
                const gap = await gaps(g, id);
                assert.isAtMost(Math.max(...Object.values(gap)), MAX_GAP, `${id}: gaps ${JSON.stringify(gap)}`);
            }
        });
    }
});
