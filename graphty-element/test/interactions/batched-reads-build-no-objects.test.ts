/**
 * @file On the `"batched"` render path most rows are drawn with no `Node` or `Edge`. Three paths built
 * one for every row (issues #10023 and #10031):
 *
 * - `element.pinnedNodes` asked every `Node` whether it was pinned: 747 ms and +52 MB at 20,000 nodes
 *   to return an empty set.
 * - `graph.getEdges()` was `Array.from` over the edge map, which builds every `Edge`.
 * - a layout built for 2D put each node with a Z onto the plane through its `Node`.
 *
 * What is asserted is counted work: the `Node`s and `Edge`s each step builds. The pin is made by
 * the browser's own input pipeline, a drag of the node.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drag } from "../helpers/real-input";

const COUNT = 40;
const NODES = Array.from({ length: COUNT }, (_, id) => ({
    id,
    position: { x: (id % 8) * 3 - 10, y: Math.floor(id / 8) * 3 - 6, z: (id % 3) * 2 - 2 },
}));
const EDGES = Array.from({ length: COUNT - 1 }, (_, id) => ({ src: id, dst: id + 1 }));

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The graph, its nodes at positions that carry a Z.
 * @param path - The render path.
 * @param view - The view mode.
 * @param layout - The layout and its options.
 * @returns The element, its picture final.
 */
async function mounted(
    path: RenderPath,
    view: "2d" | "3d",
    layout: readonly [string, Record<string, unknown>],
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.viewMode = view;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout(...layout);
    // A row line draws an edge with no arrowhead, so such an edge is stored with no `Edge`.
    await element.session.styles.add({
        name: "uncapped",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * The `Node`s and `Edge`s built so far.
 * @param element - The element.
 * @returns The counts.
 */
function built(element: Graphty): { nodes: number; edges: number } {
    const manager = element.graph.getDataManager();
    return { nodes: dataManagerInternals.nodesBuilt(manager), edges: dataManagerInternals.edgesBuilt(manager) };
}

/**
 * Every node's Z, by row.
 * @param element - The element.
 * @returns The Zs.
 */
function zs(element: Graphty): number[] {
    const { positions } = element.graph.getDataManager();
    const at = { x: 0, y: 0, z: 0 };
    return Array.from({ length: positions.count }, (_, row) => {
        positions.read(row, at);
        return at.z;
    });
}

const FIXED_3D = ["fixed", { dim: 3 }] as const;

describe("reads on the batched path", () => {
    it("pinnedNodes, getEdges and getEdgeIds build no Node or Edge", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const before = built(element);
        assert.deepStrictEqual(before, { nodes: 0, edges: 0 }, "rows are drawn with no Node or Edge");

        assert.strictEqual(element.pinnedNodes.size, 0, "nothing is pinned");
        assert.strictEqual(element.graph.getEdges().length, EDGES.length, "every edge is listed");
        assert.strictEqual(element.graph.getEdgeIds().length, EDGES.length, "every edge id is listed");

        assert.deepStrictEqual(built(element), before, "the reads built nothing");
    });

    it("pinnedNodes answers a node a drag pinned, building no other", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const from = element.nodeScreenPosition(12);
        assert.isDefined(from, "node 12 is on screen");
        await drag(element, from, { x: from.x + 30, y: from.y + 20 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        const before = built(element);
        assert.deepStrictEqual([...element.pinnedNodes], [12], "the drag pinned node 12");
        assert.isTrue(element.isPinned(12));
        assert.deepStrictEqual(built(element), before, "the read built nothing");
    });

    it("getEdges builds each Edge as it is read, in the order getEdgeIds lists the ids", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const edges = element.graph.getEdges();
        const ids = element.graph.getEdgeIds();
        assert.strictEqual(edges[5].id, ids[5], "an element read is the edge with that id");
        assert.strictEqual(built(element).edges, 1, "reading one element built one Edge");
        assert.deepStrictEqual(
            edges.map((edge) => edge.id),
            ids,
            "walking the array gives every edge in id order",
        );
    });
});

describe.each(["batched", "objects"] as const)("a layout built for 2D on %s", (path) => {
    it("puts a fixed arrangement held off the plane onto it, building no Node or Edge", async () => {
        // Fixed keeps each node's Z when it is added, as the objects path always drew it.
        const element = await mounted(path, "2d", ["fixed", {}]);
        assert.isTrue(
            zs(element).some((z) => z !== 0),
            "the arrangement holds nodes off the plane",
        );
        const before = built(element);

        await element.graph.setLayout("fixed", { scalingFactor: 1 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.deepStrictEqual(
            zs(element),
            NODES.map(() => 0),
            "every node is on the plane",
        );
        assert.deepStrictEqual(built(element), before, "the build built nothing");
    });

    it("puts a 3D fixed arrangement onto the plane when the view turns 2D, building no Node or Edge", async () => {
        const element = await mounted(path, "3d", FIXED_3D);
        const before = built(element);

        await element.setViewMode("2d");
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.deepStrictEqual(
            zs(element),
            NODES.map(() => 0),
            "every node is on the plane",
        );
        assert.deepStrictEqual(built(element), before, "the switch built nothing");
    });
});
