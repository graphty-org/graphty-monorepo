/**
 * @file Under `renderPath: "batched"` an edge no row line can draw (here: one with an arrowhead) gets its
 * `Edge` while the frame loop paints it, one edge at a time. Each was built from the placeholder paint and
 * repainted at once: it took a line and a cap slot from the placeholder's batches and gave them straight
 * back, and a batch whose last slot leaves is disposed, so every edge built and disposed whole meshes.
 * The gephi-worldcup fidelity sample (736 labelled nodes, 9,228 colored arrows) spent most of
 * `waitForStableFrame()`'s 30 seconds on that under load and never settled (issue #9181).
 *
 * Counted, not timed: the whole meshes (not instances) the scene loses while the graph loads and settles. A node
 * still trades its placeholder instance for its batch's (`InstancedMesh`), which is not what this pins.
 */

import "../../src/graphty-element";

import { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

afterEach(() => {
    document.body.replaceChildren();
});

/** More labelled nodes than one frame's label texture check covers (`TEXTURE_FIT_CHECKS_PER_FRAME`, 256). */
const NODE_COUNT = 300;
const EDGE_COUNT = 600;

it('builds each painted edge once under renderPath "batched", and the labelled graph settles', async () => {
    const element: Graphty = document.createElement("graphty-element");
    element.renderPath = "batched";
    element.viewMode = "2d";
    element.style.cssText = "display:block;width:600px;height:450px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();

    // In place before the data, so the first paint of every edge is this one, as a file's styles are.
    await element.session.styles.add({
        name: "colored arrows",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#cc3311" },
    } as never);
    await element.session.styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "label" },
    } as never);

    const { scene } = element.graph;
    let removed = 0;
    const watch = scene.onMeshRemovedObservable.add((mesh) => {
        if (!(mesh instanceof InstancedMesh)) {
            removed++;
        }
    });
    try {
        await element.session.data.addNodes(
            Array.from({ length: NODE_COUNT }, (_, id) => ({
                id,
                position: { x: (id % 20) * 3, y: Math.floor(id / 20) * 3, z: 0 },
            })),
        );
        await element.session.data.addEdges(
            Array.from({ length: EDGE_COUNT }, (_, i) => ({ src: i % NODE_COUNT, dst: (i * 7 + 1) % NODE_COUNT })),
        );
        await element.graph.setLayout("fixed");
        await element.waitForStableFrame();
    } finally {
        scene.onMeshRemovedObservable.remove(watch);
    }

    assert.strictEqual(element.renderPath, "batched");
    assert.strictEqual(element.graph.getDataManager().edges.size, EDGE_COUNT, "every edge was built");
    // Every node's label, and no texture still owed a check for its size on screen.
    assert.isNull(element.graph.getUpdateManager().pending.firstPending("wait"), "nothing is owed");
    // Before the fix each edge disposed a batch the placeholder paint had just built: 604 here, 4 after.
    assert.isBelow(removed, EDGE_COUNT / 10, `meshes disposed while ${String(EDGE_COUNT)} edges were built`);
});
