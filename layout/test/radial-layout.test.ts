import { assert, describe, it } from "vitest";

import { type Graph, radialLayout, starGraph } from "../src";

/** A path 0 - 1 - ... - (n-1). */
const pathGraph = (n: number): Graph => ({
    nodes: () => Array.from({ length: n }, (_, i) => i),
    edges: () => Array.from({ length: n - 1 }, (_, i): [number, number] => [i, i + 1]),
});


const radius = (p: number[], c: number[] = [0, 0]): number => Math.hypot(p[0] - c[0], p[1] - c[1]);

describe("Radial Layout", () => {
    it("puts each node on the ring whose index is its hop distance from the root", () => {
        // 0 - 1 - 2 - 3 - 4, rooted at 0: hop distance equals the node id
        const graph = pathGraph(5);
        const positions = radialLayout(graph, 0, 4);

        for (const node of graph.nodes()) {
            assert.approximately(radius(positions[node]), Number(node), 1e-9, `node ${node}`);
        }
    });

    it("defaults the root to the highest-degree node", () => {
        const graph = starGraph(6); // node 0 is the hub
        const positions = radialLayout(graph);

        assert.deepEqual(positions[0], [0, 0]);
        for (const node of graph.nodes().filter((n) => n !== 0)) {
            assert.approximately(radius(positions[node]), 1, 1e-9);
        }
    });

    it("puts nodes the root cannot reach on one extra outer ring", () => {
        const graph = { nodes: () => ["a", "b", "c", "x", "y"], edges: (): [string, string][] => [["a", "b"], ["b", "c"], ["x", "y"]] };
        const positions = radialLayout(graph, "a", 3, [5, 5]);

        assert.deepEqual(positions.a, [5, 5]);
        assert.approximately(radius(positions.b, [5, 5]), 1, 1e-9);
        assert.approximately(radius(positions.c, [5, 5]), 2, 1e-9);
        assert.approximately(radius(positions.x, [5, 5]), 3, 1e-9);
        assert.approximately(radius(positions.y, [5, 5]), 3, 1e-9);
    });

    it("rejects a root that is not in the graph", () => {
        assert.throws(() => radialLayout(pathGraph(3), "nope"), /root/);
    });

    it("handles an empty graph", () => {
        assert.deepEqual(radialLayout({ nodes: () => [], edges: () => [] }), {});
    });
});
