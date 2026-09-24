/**
 * @file Node labels that would overlap on screen are not drawn on top of each other.
 *
 * Every node label is its own plane, and nothing used to check whether two of them landed in the
 * same place, so two labelled nodes near each other drew their words over one another. The
 * element now thins them out before every frame: the label of the node with more edges is kept
 * and the one it would cover is hidden.
 *
 * The rectangles here are measured independently of the pass: from each label's world bounding
 * box after a frame, projected through the scene's own transform.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

const WIDTH = 640;
const HEIGHT = 480;
const FRAMES = 8;
const FRAME_MS = 10;

/** A hub with two leaves: the hub has the most edges, so its label is the one that is kept. */
const EDGES = [
    { src: "hub", dst: "left" },
    { src: "hub", dst: "right" },
];

interface Rect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

describe("node labels do not overlap", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
    });

    async function draw(nodes: { id: string; position: { x: number; y: number; z: number } }[]): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        await g.addNodes(nodes);
        await g.addEdges(EDGES);
        await g.setLayout("fixed", { dim: 3 });
        await g.operationQueue.waitForCompletion();
        await g.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "A LONG LABEL FOR THIS NODE" },
        });
        await g.operationQueue.waitForCompletion();

        for (let at = 0; at < FRAMES; at++) {
            g.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        return g;
    }

    /**
     * Which labels are drawn, and where.
     * @param g - The graph.
     * @returns The screen rectangle of every label on screen, by node id.
     */
    function drawnLabels(g: Graph): Map<string, Rect> {
        const camera = g.scene.activeCamera;
        assert.isNotNull(camera);
        const viewport = camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight());
        const drawn = new Map<string, Rect>();

        for (const id of ["hub", "left", "right"]) {
            const mesh = g.getNode(id)?.label?.labelMesh;
            assert.isOk(mesh, `node ${id} has a label`);
            if (!mesh.isEnabled() || !mesh.isVisible) {
                continue;
            }

            const xs: number[] = [];
            const ys: number[] = [];
            for (const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
                const p = Vector3.Project(corner, Matrix.Identity(), g.scene.getTransformMatrix(), viewport);
                xs.push(p.x);
                ys.push(p.y);
            }

            drawn.set(id, {
                left: Math.min(...xs),
                right: Math.max(...xs),
                top: Math.min(...ys),
                bottom: Math.max(...ys),
            });
        }

        return drawn;
    }

    function overlaps(a: Rect, b: Rect): boolean {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    it("keeps one label where three would be drawn over each other, and it is the hub's", async () => {
        const g = await draw([
            { id: "hub", position: { x: 0, y: 0, z: 0 } },
            { id: "left", position: { x: -0.3, y: 0.1, z: 0 } },
            { id: "right", position: { x: 0.3, y: -0.1, z: 0 } },
        ]);

        const drawn = drawnLabels(g);

        assert.deepEqual(
            [...drawn.keys()],
            ["hub"],
            "three labels sit within a few pixels of each other, so only the best-connected " +
                "node's label should be drawn",
        );
    });

    it("keeps a selected node's label over a better-connected one", async () => {
        const g = await draw([
            { id: "hub", position: { x: 0, y: 0, z: 0 } },
            { id: "left", position: { x: -0.3, y: 0.1, z: 0 } },
            { id: "right", position: { x: 0.3, y: -0.1, z: 0 } },
        ]);

        assert.isTrue(g.selectNode("left"));
        await g.operationQueue.waitForCompletion();
        g.scene.render();

        assert.deepEqual([...drawnLabels(g).keys()], ["left"]);
    });

    it("does not let a label behind the camera hide one in front of it", async () => {
        // The camera stands among the nodes, looking at "left". The hub and "right" sit behind
        // it, and the hub's label (drawn 1.25 above its node) is the mirror of the label of
        // "left" through the camera, so a projection that ignores which side of the camera a
        // point is on puts the two labels in the same place, and the hub has more edges.
        const g = await draw([
            { id: "hub", position: { x: 0, y: -2.5, z: -5 } },
            { id: "left", position: { x: 0, y: 0, z: 5 } },
            { id: "right", position: { x: 0, y: 0, z: -8 } },
        ]);

        await g.setCameraState({ position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 5 } });
        for (let at = 0; at < FRAMES; at++) {
            g.scene.render();
        }

        const left = g.getNode("left")?.label?.labelMesh;
        assert.isOk(left);
        assert.isTrue(left.isEnabled() && left.isVisible, "the label the camera is looking at is drawn");
    });

    it("draws every label once the nodes are far enough apart", async () => {
        const g = await draw([
            { id: "hub", position: { x: 0, y: 0, z: 0 } },
            { id: "left", position: { x: 0, y: 4, z: 0 } },
            { id: "right", position: { x: 0, y: -4, z: 0 } },
        ]);

        const drawn = drawnLabels(g);
        const rects = [...drawn.values()];

        assert.strictEqual(drawn.size, 3, `only ${[...drawn.keys()].join(", ")} drawn`);
        for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
                assert.isFalse(overlaps(rects[i], rects[j]), "no two drawn labels overlap");
            }
        }
    });
});
