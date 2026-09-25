/**
 * @file Node labels that would overlap on screen are not drawn on top of each other.
 *
 * Every node label is its own plane, and nothing used to check whether two of them landed in the
 * same place, so two labelled nodes near each other drew their words over one another. With the
 * graph's `labels.declutter` behaviour on, the element thins them out: the label of the node with
 * more edges is kept and the one it would cover is hidden. It is off by default, and off means
 * every label a style asks for is drawn.
 *
 * The rectangles here are measured independently of the pass: from each label's world bounding
 * box after a frame, projected through the scene's own transform.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { LabelDeclutter } from "../../src/managers/LabelDeclutter";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";

const WIDTH = 640;
const HEIGHT = 480;
const FRAMES = 8;
const FRAME_MS = 10;

/** A hub with two leaves: the hub has the most edges, so its label is the one that is kept. */
const EDGES = [
    { src: "hub", dst: "left" },
    { src: "hub", dst: "right" },
];

/**
 * Three nodes so close that their labels land within a few pixels of each other.
 *
 * Looked at from an explicit camera, not from zoom-to-fit: the fit frames the nodes only (#76),
 * and these three span 1.6 world units while each label hangs 1.25 units above its node, so the
 * fitted camera (2.0 units out) leaves the top label above the top of the screen, where the pass
 * rightly ignores it. From 11 units out every label is in view; whether they overlap does not
 * depend on the distance, only on their being seen at all.
 */
const PILED = [
    { id: "hub", position: { x: 0, y: 0, z: 0 } },
    { id: "left", position: { x: -0.3, y: 0.1, z: 0 } },
    { id: "right", position: { x: 0.3, y: -0.1, z: 0 } },
];
const PILED_VIEW = { position: { x: 0, y: 0.6, z: -11 }, target: { x: 0, y: 0.6, z: 0 } };

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

    async function draw(
        nodes: { id: string; position: { x: number; y: number; z: number } }[],
        declutter = true,
        view?: typeof PILED_VIEW,
    ): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        if (declutter) {
            g.setLayoutBehavior({ labels: { declutter: true } });
        }

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

        if (view) {
            await g.setCameraState(view);
            g.scene.render();
        }

        return g;
    }

    /**
     * Which labels are drawn, and where.
     * @param g - The graph.
     * @param ids - The nodes to look at.
     * @param words - Measure the label's words rather than its whole plane.
     * @returns The screen rectangle of every label on screen, by node id.
     */
    function drawnLabels(g: Graph, ids = ["hub", "left", "right"], words = false): Map<string, Rect> {
        const camera = g.scene.activeCamera;
        assert.isNotNull(camera);
        const viewport = camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight());
        const drawn = new Map<string, Rect>();

        for (const id of ids) {
            const label = g.getNode(id)?.label;
            const mesh = label?.labelMesh;
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

            const plane = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
            if (words && label) {
                const text = label.textBounds;
                const w = plane.right - plane.left;
                const h = plane.bottom - plane.top;
                drawn.set(id, {
                    left: plane.left + text.left * w,
                    right: plane.left + text.right * w,
                    top: plane.top + text.top * h,
                    bottom: plane.top + text.bottom * h,
                });
            } else {
                drawn.set(id, plane);
            }
        }

        return drawn;
    }

    function overlaps(a: Rect, b: Rect): boolean {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    it("keeps one label where three would be drawn over each other, and it is the hub's", async () => {
        const g = await draw(PILED, true, PILED_VIEW);

        const drawn = drawnLabels(g);

        assert.deepEqual(
            [...drawn.keys()],
            ["hub"],
            "three labels sit within a few pixels of each other, so only the best-connected " +
                "node's label should be drawn",
        );
    });

    it("keeps a selected node's label over a better-connected one", async () => {
        const g = await draw(PILED, true, PILED_VIEW);

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

    function passOf(g: Graph): LabelDeclutter {
        const found: unknown = g.scene.metadata?.labelDeclutter;
        if (!(found instanceof LabelDeclutter)) {
            assert.fail("a labelled scene has a declutter pass");
        }

        return found;
    }

    it("hides no label when labels.declutter is off, which is the default", async () => {
        const g = await draw(PILED, false);

        assert.isFalse(g.styles.config.behavior.labels.declutter, "off unless a consumer turns it on");
        assert.deepEqual([...drawnLabels(g).keys()], ["hub", "left", "right"]);
        assert.strictEqual(passOf(g).passes, 0, "an element that was never asked to declutter never measures");
    });

    it("shows and hides labels as the setting is toggled while the graph is drawn", async () => {
        const g = await draw(PILED, false, PILED_VIEW);
        assert.deepEqual([...drawnLabels(g).keys()], ["hub", "left", "right"]);

        g.setLayoutBehavior({ labels: { declutter: true } });
        g.scene.render();
        assert.deepEqual([...drawnLabels(g).keys()], ["hub"], "turned on: only the hub's label is drawn");

        g.setLayoutBehavior({ labels: { declutter: false } });
        g.scene.render();
        assert.deepEqual([...drawnLabels(g).keys()], ["hub", "left", "right"], "turned off: every label is back");
    });

    it("keeps a hidden label hidden when its animation starts", async () => {
        // The element starts every label's animation once the layout settles, and again 100 ms
        // after init for a layout that settled at once. Neither moves a node or the camera, so
        // the pass does not run again afterwards: a start that showed a label the pass had hidden
        // left it drawn over the one it lost to, and whether that happened depended on whether
        // the timer fired before or after the pass.
        const g = await draw(PILED);
        const label = RichTextLabel.createLabel(g.scene, { text: "A LONG LABEL FOR THIS NODE" });
        const mesh = label.labelMesh;
        assert.isOk(mesh);
        mesh.isVisible = false;

        label.startAnimation();

        assert.isFalse(mesh.isVisible, "starting the animation showed a label the declutter pass had hidden");
        label.dispose();
    });

    it("does not re-run the pass on a frame where nothing moved, and does when something did", async () => {
        const g = await draw(PILED);
        const pass = passOf(g);

        const before = pass.passes;
        for (let at = 0; at < 20; at++) {
            g.scene.render();
        }
        assert.strictEqual(pass.passes, before, "a still camera over a still layout is placed once");

        assert.isTrue(g.selectNode("left"));
        await g.operationQueue.waitForCompletion();
        g.scene.render();
        assert.isAbove(pass.passes, before, "a selection change places the labels again");

        const afterSelect = pass.passes;
        const hub = g.getNode("hub");
        assert.isOk(hub);
        hub.mesh.position.x += 5;
        g.scene.render();
        assert.isAbove(pass.passes, afterSelect, "a node that moved places the labels again");
    });

    it("never draws two labels whose words overlap, and keeps the selected one", async () => {
        // A tight grid of forty labelled nodes: plenty of collisions to resolve.
        const nodes = [];
        const ids: string[] = [];
        for (let i = 0; i < 40; i++) {
            const id = `n${String(i).padStart(2, "0")}`;
            ids.push(id);
            nodes.push({ id, position: { x: (i % 8) * 0.8, y: Math.floor(i / 8) * 0.6, z: 0 } });
        }

        const g = await draw(nodes);
        assert.isTrue(g.selectNode("n17"));
        await g.operationQueue.waitForCompletion();
        g.scene.render();

        const drawn = drawnLabels(g, ids, true);
        const entries = [...drawn.entries()];
        assert.isTrue(drawn.has("n17"), "the selected node's label is drawn");
        assert.isAbove(drawn.size, 1, "more than one label is drawn");
        assert.isBelow(drawn.size, ids.length, "some label was hidden");
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                assert.isFalse(
                    overlaps(entries[i][1], entries[j][1]),
                    `the words of ${entries[i][0]} and ${entries[j][0]} overlap`,
                );
            }
        }
    });
});
