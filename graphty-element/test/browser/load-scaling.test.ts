/**
 * @file Loading a graph costs time in proportion to its size.
 *
 * A load used to grow faster than its edge count: `setData` queued one `data-add` per node and
 * per edge, and the element queued a whole-graph repaint behind every one of them. A 4000-edge
 * load ran 4080 whole-graph repaints, which is quadratic in the edge count. A consumer calling
 * `addEdge` in a loop paid the same.
 *
 * The second cause was per arrowhead: each one's material walked every mesh in the scene when it
 * was created (`FilledArrowRenderer`), so the default arrowheads made a batched load quadratic
 * too.
 *
 * Both facts are counts, so they hold on any machine however busy it is: a load paints the whole
 * graph a couple of times, not once per element, and the scene-wide walks Babylon's material dirty
 * mechanism makes grow with the edge count, not with its square. A stopwatch ratio between two
 * load sizes used to stand in for the second; two loads timed one after the other measure whatever
 * else the machine was doing in between.
 */

import { Material } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import type { ElementSession } from "../../src/session";
import { asData, cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/** At most this many whole-graph repaints for one load, however many elements it holds. */
const MAX_REPAINTS_PER_LOAD = 2;

/** Linear is 4 for a 4x load; quadratic is 16. */
const MAX_LOAD_RATIO = 6;

/**
 * A graph with one node per `perNode` edges, placed on a grid so a fixed layout has positions.
 * @param edgeCount - How many edges.
 * @param perNode - Edges per node.
 * @returns The records.
 */
function graphOf(
    edgeCount: number,
    perNode = 5,
): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
    const nodeCount = Math.max(10, Math.ceil(edgeCount / perNode));
    const side = Math.ceil(Math.sqrt(nodeCount));
    const nodes = Array.from({ length: nodeCount }, (_unused, i) => ({
        id: `n${String(i)}`,
        position: { x: (i % side) * 10, y: Math.floor(i / side) * 10, z: 0 },
    }));
    const edges = Array.from({ length: edgeCount }, (_unused, i) => ({
        id: `e${String(i)}`,
        source: `n${String(i % nodeCount)}`,
        target: `n${String((i * 7 + 1) % nodeCount)}`,
    }));

    return { nodes, edges };
}

/**
 * Count the whole-graph repaints a graph runs from now on.
 * @param graph - The graph to watch.
 * @returns A function answering the count so far.
 */
function countRepaints(graph: Graph): () => number {
    const { paint } = graph.getSession() as ElementSession;
    const original = paint.repaintAll.bind(paint);
    let count = 0;

    (paint as { repaintAll: typeof paint.repaintAll }).repaintAll = async (stack, context) => {
        count++;

        return original(stack, context);
    };

    return () => count;
}

describe("a load", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
        await graph.setLayout("fixed");
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    it("repaints the whole graph a couple of times through setData, not once per element", async () => {
        const repaints = countRepaints(graph);

        graph.setData(graphOf(300));
        await graph.waitForStableFrame();

        assert.strictEqual(graph.getDataManager().edges.size, 300, "every edge loaded");
        assert.isAtMost(
            repaints(),
            MAX_REPAINTS_PER_LOAD,
            `setData of 60 nodes and 300 edges ran ${String(repaints())} whole-graph repaints`,
        );
    });

    it("repaints the whole graph a couple of times when edges are added one at a time", async () => {
        const data = graphOf(200);
        await graph.addNodes(data.nodes);
        await graph.waitForStableFrame();
        const repaints = countRepaints(graph);

        for (const edge of data.edges) {
            void graph.addEdge(asData(edge));
        }

        await graph.waitForStableFrame();

        assert.strictEqual(graph.getDataManager().edges.size, 200, "every edge loaded");
        assert.isAtMost(
            repaints(),
            MAX_REPAINTS_PER_LOAD,
            `200 addEdge calls ran ${String(repaints())} whole-graph repaints`,
        );
    });
});

/**
 * Count the meshes Babylon's material dirty walks visit from now on. Every material setter that
 * can change shader defines walks every submesh of every mesh in the scene unless the material's
 * dirty mechanism is blocked; one walk per element over a scene that grows with the elements is a
 * load quadratic in its size (issue #388).
 * @returns A function answering the count so far, and one that stops counting.
 */
function countDirtyWalks(): { visits: () => number; stop: () => void } {
    type Walker = { _markAllSubMeshesAsDirty: (this: Material, func: unknown) => void };
    const proto = Material.prototype as unknown as Walker;
    const original = proto._markAllSubMeshesAsDirty;
    let visits = 0;

    proto._markAllSubMeshesAsDirty = function walk(this: Material, func: unknown): void {
        const scene = this.getScene();
        if (!scene.blockMaterialDirtyMechanism && !this.blockDirtyMechanism) {
            visits += scene.meshes.length;
        }

        original.call(this, func);
    };

    return {
        visits: () => visits,
        stop: () => {
            proto._markAllSubMeshesAsDirty = original;
        },
    };
}

describe("the scene-wide work of a load", () => {
    /**
     * Count the dirty-walk visits of one load of a fresh graph, from setData to the first finished
     * frame.
     * @param edgeCount - How many edges to load.
     * @returns The meshes the walks visited.
     */
    async function walkedByLoad(edgeCount: number): Promise<number> {
        const graph = await createTestGraph();
        const walks = countDirtyWalks();

        try {
            await graph.setLayout("fixed");
            graph.setData(graphOf(edgeCount));
            await graph.waitForStableFrame({ timeoutMs: 120000 });

            return walks.visits();
        } finally {
            walks.stop();
            cleanupTestGraph(graph);
        }
    }

    it("grows roughly linearly with the edge count between 500 and 2000 edges, default arrowheads on", async () => {
        const small = await walkedByLoad(500);
        const large = await walkedByLoad(2000);

        assert.isAtMost(
            large,
            MAX_LOAD_RATIO * Math.max(small, 1),
            `the dirty walks of a 500-edge load visited ${String(small)} meshes and of a 2000-edge load ` +
                `${String(large)}. Linear is 4 times as many.`,
        );
    }, 300000);
});
