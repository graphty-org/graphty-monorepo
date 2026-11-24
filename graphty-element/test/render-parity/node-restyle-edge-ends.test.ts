/**
 * @file A node.size layer added after the graph is drawn moves the edge ends and arrowheads out to
 * the new node surface on `"batched"` as on `"objects"` (issue #9857).
 *
 * The graph is loaded into an element already drawn, so on `"batched"` most rows have no Node
 * object (asserted). The `"batched"` path had kept each arrowed edge's end trimmed to the old size,
 * so the arrowhead ended inside the enlarged node.
 *
 * How to run, from graphty-element:
 *   npx vitest run --project=render-parity test/render-parity/node-restyle-edge-ends.test.ts
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { assertSameFrame, type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

const N = 8;
const IDS = Array.from({ length: N }, (_, i) => String(i));
/** Plain and arrowed edges, in disjoint parts. */
const EDGES = [
    { source: "0", target: "1", directed: false },
    { source: "2", target: "3" },
    { source: "4", target: "5", directed: false },
    { source: "5", target: "6", directed: false },
    { source: "6", target: "4" },
];

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Draw the graph with nodes at size 1.2, set either from the start or by a layer added after.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param restyle - Whether the size arrives in a layer added after the graph is drawn.
 * @returns The canvas.
 */
async function draw(path: "objects" | "batched", view: "2d" | "3d", restyle: boolean): Promise<CanvasFrame> {
    const element: Graphty = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.replaceChildren(element);
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.size": restyle ? 0.6 : 1.2 },
    });
    await element.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 4 },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    const a = (i: number): number => (2 * Math.PI * i) / N;
    await element.session.data.addNodes(
        IDS.map((id, i) => ({ id, position: { x: 4 * Math.cos(a(i)), y: 4 * Math.sin(a(i)), z: 0 } })),
    );
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    if (path === "batched") {
        assert.isBelow(dataManagerInternals.nodesBuilt(element.graph.getDataManager()), N, "some rows have no Node");
    }

    if (restyle) {
        await element.session.styles.add({
            name: "Bigger",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1.2 },
        });
        await operationQueueOf(element.graph).waitForCompletion();
    }

    return readCanvas(element.graph);
}

describe.each(["3d", "2d"] as const)("edge ends on both paths, %s", (view) => {
    it.for([
        ["with the node size set from the start", false],
        ["after a node.size layer added after the load", true],
    ] as const)("%s", async ([what, restyle]) => {
        const objects = await draw("objects", view, restyle);
        const batched = await draw("batched", view, restyle);
        assertSameFrame(objects, batched, `objects and batched ${what} in ${view}`);
    });
});
