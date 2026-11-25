/**
 * @file Framing a moving graph recomputes each moved node's world matrix once and the graph root's not at all, and
 * leaves every node's matrix current for the render (issue #9420). It used to force the recompute, which also forced
 * the graph root above each node: the root was recomputed once per node, and each recompute made every node measured
 * before it stale again, so the render computed every node a second time. At 20,000 nodes that was about 35 ms a
 * frame. What is asserted is counted work: world-matrix recomputes and the nodes left stale.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const COUNT = 300;
const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Mount an element holding a row of nodes, drawn as objects.
 * @returns The element, drawn.
 */
async function loaded(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = "objects";
    element.layout = "fixed";
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    mounted.push(element);
    element.nodeData = Array.from({ length: COUNT }, (_, id) => ({ id, position: { x: id, y: 0, z: 0 } }));
    await vi.waitFor(() => {
        assert.strictEqual(element.graph.getNodeCount(), COUNT);
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("framing a moved graph (#9420)", () => {
    it("recomputes each moved node once, the root never, and leaves no node stale for the render", async () => {
        const element = await loaded();
        const { graph } = element;
        const root = graph.scene.getTransformNodeByName("graph-root");
        assert.isNotNull(root);
        const nodes = graph.getNodes();
        const counts = { root: 0, nodes: 0 };
        const rootWatch = root.onAfterWorldMatrixUpdateObservable.add(() => {
            counts.root++;
        });
        const nodeWatches = nodes.map((node) =>
            node.mesh.onAfterWorldMatrixUpdateObservable.add(() => {
                counts.nodes++;
            }),
        );
        try {
            // One layout step, then the framing walk, with no render between them (as in a frame).
            for (const node of nodes) {
                const at = node.drawnPosition;
                node.setMeshPosition(at.x, at.y + 1, at.z);
            }

            const boxes = nodes.map((node) => node.framingBounds());
            assert.strictEqual(counts.root, 0, "graph root recomputes");
            assert.strictEqual(counts.nodes, COUNT, "node recomputes");
            assert.strictEqual(nodes.filter((node) => !node.mesh.isSynchronized()).length, 0, "nodes left stale");
            // The box is where the node is now, not where it was drawn.
            nodes.forEach((node, at) => {
                const box = boxes[at];
                const center = node.drawnWorldPosition;
                assert.closeTo((box.min.y + box.max.y) / 2, center.y, 1e-4);
            });

            // Framed again with nothing moved: nothing is recomputed, and the boxes are the same.
            counts.nodes = 0;
            const again = nodes.map((node) => node.framingBounds());
            assert.strictEqual(counts.nodes, 0, "node recomputes with nothing moved");
            assert.strictEqual(counts.root, 0, "graph root recomputes with nothing moved");
            assert.deepEqual(
                again.map(({ min, max }) => [min.asArray(), max.asArray()]),
                boxes.map(({ min, max }) => [min.asArray(), max.asArray()]),
            );
        } finally {
            root.onAfterWorldMatrixUpdateObservable.remove(rootWatch);
            nodes.forEach((node, at) => node.mesh.onAfterWorldMatrixUpdateObservable.remove(nodeWatches[at]));
        }
    });

    it("frames nodes restyled after they were drawn where they are, not at the origin (#10066)", async () => {
        const element = await loaded();
        element.zoomToFit();
        await element.waitForStableFrame();
        const before = element.getCameraState();

        // A new opacity is drawn from another source mesh: each node's instance moves onto it where it stands.
        const ends = [0, COUNT - 1];
        await element.session.styles.add({
            name: "Ends",
            target: "node",
            selector: { match: "ids", nodes: ends },
            set: { "node.opacity": 0.5 },
        });
        await element.waitForStableFrame();

        const last = element.graph.getNodes()[COUNT - 1];
        const { min, max } = last.framingBounds();
        assert.closeTo((min.x + max.x) / 2, last.drawnWorldPosition.x, 1e-4);
        element.zoomToFit();
        await element.waitForStableFrame();
        assert.deepEqual(element.getCameraState(), before);
    });
});
