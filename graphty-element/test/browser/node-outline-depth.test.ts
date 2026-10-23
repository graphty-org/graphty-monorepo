/**
 * @file `node.outline` is drawn in the scene, by depth, like the node it rings.
 *
 * THE DEFECT. The outline used to be a Babylon highlight layer: a full-screen pass composited
 * after the whole frame with the depth test off, kept off only the outlined node's own pixels by
 * the stencil. So the ring of a node behind another was painted across the nearer node, and the
 * ring was painted over every label, a nearer one included. The owner's reports: "highlight clips
 * nodes" and "highlight is in front of labels".
 *
 * WHAT IS MEASURED. A large red node at the origin carries a yellow outline. A blue node nearer
 * the camera sits where that ring is drawn; a green label panel nearer the camera sits over the
 * ring's other side. Neither may show any yellow, and the red node keeps its own color up to its
 * rim. The ring itself must still be drawn where nothing covers it.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const WIDTH = 480;
const HEIGHT = 360;

/** The ringed node at the origin, a node in front of its right side, and a label node in front of its left. */
const NODES = [
    { id: "ringed", position: { x: 0, y: 0, z: 0 } },
    { id: "front", position: { x: 1.3, y: 0, z: -2 } },
    { id: "named", position: { x: -1.3, y: -0.6, z: -2 } },
    // Far corners, so the framing leaves the ringed node a fair size in the middle.
    { id: "c1", position: { x: -5, y: -4, z: 0 } },
    { id: "c2", position: { x: 5, y: 4, z: 0 } },
];

/** Whether a pixel is the outline's yellow. */
function yellow(p: Uint8Array, at: number): boolean {
    return p[at] > 150 && p[at + 1] > 150 && p[at + 2] < 100;
}

describe("node.outline is drawn by depth", () => {
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
        const { styles } = graph.getSession();
        await styles.add({
            name: "flat colors",
            target: "node",
            selector: { match: "everything" },
            set: { "node.unlit": true, "node.color": "#888888", "node.size": 1 },
        });
        await styles.add({
            name: "the ringed node",
            target: "node",
            selector: { match: "ids", nodes: ["ringed"] },
            set: { "node.color": "#ff0000", "node.size": 2, "node.outline": "#ffff00" },
        });
        await styles.add({
            name: "the node in front",
            target: "node",
            selector: { match: "ids", nodes: ["front"] },
            set: { "node.color": "#0000ff" },
        });
        await styles.add({
            name: "the label in front",
            target: "node",
            selector: { match: "ids", nodes: ["named"] },
            set: {
                "node.color": "#0000ff",
                "node.label": "WW",
                "node.labelStyle": { sizePx: 96, background: "#10B981", color: "#10B981" },
            },
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
     * The frame, and where a world point lands on it (rows bottom first, as WebGL reads them).
     * @returns The pixels, the width, and a projector.
     */
    async function frame(): Promise<{
        pixels: Uint8Array;
        width: number;
        at: (p: Vector3) => { x: number; y: number };
    }> {
        const { engine } = graph;
        graph.scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        const viewport = camera.viewport.toGlobal(width, height);
        const at = (p: Vector3): { x: number; y: number } => {
            const s = Vector3.Project(p, Matrix.Identity(), graph.scene.getTransformMatrix(), viewport);
            return { x: Math.round(s.x), y: Math.round(height - s.y) };
        };
        return { pixels, width, at };
    }

    /**
     * Count the yellow pixels in a screen box.
     * @param f - The frame.
     * @param f.pixels - Its pixels.
     * @param f.width - Its width.
     * @param box - The box, rows bottom first.
     * @param box.left - Left column.
     * @param box.right - Right column.
     * @param box.bottom - Bottom row.
     * @param box.top - Top row.
     * @returns How many are yellow.
     */
    function yellowIn(
        f: { pixels: Uint8Array; width: number },
        box: { left: number; right: number; bottom: number; top: number },
    ): number {
        let count = 0;
        for (let y = box.bottom; y <= box.top; y++) {
            for (let x = box.left; x <= box.right; x++) {
                if (yellow(f.pixels, (y * f.width + x) * 4)) {
                    count++;
                }
            }
        }
        return count;
    }

    it("draws the ring where nothing covers it", async () => {
        const f = await frame();
        const centre = f.at(Vector3.Zero());
        // Above the ringed node: no node or label there.
        const rim = f.at(new Vector3(0, 1.6, 0)).y - centre.y;
        const count = yellowIn(f, { left: centre.x - 8, right: centre.x + 8, bottom: centre.y, top: centre.y + rim });
        assert.isAbove(count, 10, "a ring of the outline color is drawn above the node");
    });

    it("keeps the ringed node's own color up to its rim", async () => {
        const f = await frame();
        const centre = f.at(Vector3.Zero());
        // The node's radius is 1 (size 2): 85% of the way out is still inside it.
        const inside = f.at(new Vector3(0, 0.85, 0)).y;
        const at = (inside * f.width + centre.x) * 4;
        const rgb = [f.pixels[at], f.pixels[at + 1], f.pixels[at + 2]];
        assert.isTrue(rgb[0] > 200 && rgb[1] < 80 && rgb[2] < 80, `the node's rim is red, not ${String(rgb)}`);
    });

    it("lets a nearer node cover the ring", async () => {
        const f = await frame();
        const front = graph.nodeScreenPosition("front");
        assert.isOk(front);
        const c = f.at(new Vector3(1.3, 0, -2));
        const r = Math.floor(front.radius * 0.6);
        const count = yellowIn(f, { left: c.x - r, right: c.x + r, bottom: c.y - r, top: c.y + r });
        assert.strictEqual(
            count,
            0,
            `${String(count)} yellow pixels of the ring behind were drawn over the nearer node`,
        );
    });

    it("lets a nearer label cover the ring", async () => {
        const f = await frame();
        const label = graph.getNode("named")?.label?.labelMesh;
        assert.isOk(label, "the label under test is drawn");
        label.computeWorldMatrix(true);
        const box = label.getBoundingInfo().boundingBox;
        const a = f.at(box.minimumWorld);
        const b = f.at(box.maximumWorld);
        const inset = 4;
        const rect = {
            left: Math.min(a.x, b.x) + inset,
            right: Math.max(a.x, b.x) - inset,
            bottom: Math.min(a.y, b.y) + inset,
            top: Math.max(a.y, b.y) - inset,
        };
        // The fixture must put the label over part of the ring, or this test says nothing.
        let covered = 0;
        for (let degrees = 0; degrees < 360; degrees += 5) {
            const angle = (degrees * Math.PI) / 180;
            const p = f.at(new Vector3(1.15 * Math.cos(angle), 1.15 * Math.sin(angle), 0));
            if (p.x >= rect.left && p.x <= rect.right && p.y >= rect.bottom && p.y <= rect.top) {
                covered++;
            }
        }
        assert.isAbove(covered, 2, `the label ${JSON.stringify(rect)} covers no part of the ring`);
        const count = yellowIn(f, rect);
        assert.strictEqual(count, 0, `${String(count)} yellow pixels of the ring were drawn over the nearer label`);
    });
});
