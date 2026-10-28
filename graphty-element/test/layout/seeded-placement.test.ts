/**
 * A seeded layout gives the same picture every time, and a different seed gives a different one.
 *
 * - ngraph.forcelayout never reads a generator handed to it: it seeds its own with a hard-coded
 *   42, so the element places each node from the `seed` itself before the simulation starts.
 * - The random layout ("Scattered") is what the element recommends for a large graph, with the
 *   promise "the same every time". A consumer applies it by name alone, so its seed has a fixed
 *   default rather than a fresh `Math.random()` one per load.
 */
import { assert, describe, it, vi } from "vitest";

import type { Edge } from "../../src/Edge";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { RandomLayout } from "../../src/layout/RandomLayoutEngine";
import type { Node } from "../../src/Node";

const IDS = ["a", "b", "c", "d", "e", "f"];

/**
 * A small path graph as a layout engine sees one.
 * @returns the nodes and the edges between consecutive nodes
 */
function pathGraph(): { nodes: Node[]; edges: Edge[] } {
    const nodes = IDS.map((id, index) => ({ id, index }) as unknown as Node);
    const edges = nodes
        .slice(1)
        .map((dst, i) => ({ srcId: nodes[i].id, dstId: dst.id, srcNode: nodes[i], dstNode: dst }) as unknown as Edge);
    return { nodes, edges };
}

/**
 * Run an ngraph layout for a fixed number of steps.
 * @param config - the engine's options
 * @returns every node's coordinates, flattened
 */
function runNGraph(config: object): number[] {
    const { nodes, edges } = pathGraph();
    const layout = new NGraphEngine(config);
    nodes.forEach((n) => {
        layout.addNode(n);
    });
    edges.forEach((e) => {
        layout.addEdge(e);
    });
    for (let i = 0; i < 50; i++) {
        layout.step();
    }

    return nodes.flatMap((n) => {
        const p = layout.getNodePosition(n);
        return [p.x, p.y, p.z ?? 0];
    });
}

/**
 * Lay out with the random engine.
 * @param opts - the engine's options
 * @returns every node's coordinates, flattened
 */
function runRandom(opts: object): number[] {
    const { nodes, edges } = pathGraph();
    const layout = new RandomLayout(opts);
    layoutEngineInternals.addNodes(layout, nodes);
    layoutEngineInternals.addEdges(layout, edges);
    return nodes.flatMap((n) => {
        const p = layout.getNodePosition(n);
        return [p.x, p.y, p.z ?? 0];
    });
}

describe("seeded placement", () => {
    it("gives the ngraph layout a different picture for a different seed", () => {
        assert.notDeepEqual(runNGraph({ seed: 1 }), runNGraph({ seed: 2 }));
    });

    it("gives the ngraph layout the same picture for the same seed", () => {
        assert.deepEqual(runNGraph({ seed: 1 }), runNGraph({ seed: 1 }));
        assert.deepEqual(runNGraph({ seed: 7, dim: 2 }), runNGraph({ seed: 7, dim: 2 }));
    });

    it("keeps a seeded 2D ngraph layout flat", () => {
        const coords = runNGraph({ seed: 3, dim: 2 });
        for (let i = 2; i < coords.length; i += 3) {
            assert.strictEqual(coords[i], 0);
        }
    });

    it("scatters the random layout the same way twice when no seed is given", () => {
        assert.deepEqual(runRandom({}), runRandom({}));
    });

    it("still lets an explicit seed change the random layout", () => {
        assert.notDeepEqual(runRandom({ seed: 5 }), runRandom({ seed: 6 }));
    });

    it("parts two nodes on one point without an engine-approximated Math function, where it parted them before", () => {
        // Math.cos and Math.sin leave their last bit to the engine, and the direction they gave fed every later step
        // of the simulation. With no repulsion and no edges, only the nodeGap separation moves the nodes, and the two
        // unpinned nodes sit exactly on the pinned one, so it takes the coincident branch.
        const nodes = ["a", "b", "c"].map(
            (id, index) => ({ id, index, drawnRadius: 1, roundRadius: 1 }) as unknown as Node,
        );
        const layout = new NGraphEngine({ seed: 1, dim: 2, nodeGap: 1, gravity: 0 });
        nodes.forEach((n) => {
            layout.addNode(n);
            layoutEngineInternals.setNodePosition(layout, n, { x: 0, y: 0, z: 0 });
        });
        layoutEngineInternals.pin(layout, nodes[0]);
        for (const name of ["cos", "sin", "tan", "atan2", "hypot", "log", "exp", "pow"] as const) {
            vi.spyOn(Math, name).mockImplementation(() => {
                throw new Error(`Math.${name} called`);
            });
        }
        try {
            for (let i = 0; i < 3; i++) {
                layout.step();
            }
        } finally {
            vi.restoreAllMocks();
        }
        // recorded with Math.cos and Math.sin, before the change
        assert.deepStrictEqual(
            nodes.map((n) => layout.getNodePosition(n)),
            [
                { x: 0, y: 0, z: 0 },
                { x: 2.105497360229492, y: 2.137026071548462, z: 0 },
                { x: -1.7828494310379028, y: 2.4127676486968994, z: 0 },
            ],
        );
    });
});
