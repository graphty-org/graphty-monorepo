/**
 * @file Markov, spectral and hierarchical clustering, A* and edge betweenness: what each computes
 * on a graph whose answer is known.
 *
 * The fixture is two triangles joined by one costly bridge, C - D. Every clustering should split
 * it at the bridge, every shortest path between the triangles crosses the bridge, and A* with no
 * heuristic must find the route Dijkstra finds.
 */

import { assert, describe, it } from "vitest";

import { Algorithm } from "../../src/algorithms/Algorithm";
import { AStarAlgorithm } from "../../src/algorithms/AStarAlgorithm";
import { DijkstraAlgorithm } from "../../src/algorithms/DijkstraAlgorithm";
import { EdgeBetweennessCentralityAlgorithm } from "../../src/algorithms/EdgeBetweennessCentralityAlgorithm";
import { HierarchicalClusteringAlgorithm } from "../../src/algorithms/HierarchicalClusteringAlgorithm";
import { MarkovClusteringAlgorithm } from "../../src/algorithms/MarkovClusteringAlgorithm";
import { type AlgorithmOutput, type DeclaredAlgorithm, detachedRunContext } from "../../src/algorithms/results";
import { SpectralClusteringAlgorithm } from "../../src/algorithms/SpectralClusteringAlgorithm";
import type { Graph } from "../../src/Graph";
import { createMockGraph } from "../helpers/mockGraph";

const TWO_TRIANGLES = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 1 },
        { srcId: "A", dstId: "C", weight: 1 },
        { srcId: "C", dstId: "D", weight: 5 },
        { srcId: "D", dstId: "E", weight: 1 },
        { srcId: "E", dstId: "F", weight: 1 },
        { srcId: "D", dstId: "F", weight: 1 },
    ],
};

/** Two pieces no path joins: a pair and a triangle. */
const TWO_PIECES = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "C", dstId: "D", weight: 1 },
        { srcId: "D", dstId: "E", weight: 1 },
        { srcId: "C", dstId: "E", weight: 1 },
    ],
};

/**
 * Run one algorithm on a fixture.
 * @param fixture - The graph.
 * @param make - Builds the algorithm.
 * @returns What it produced.
 */
async function run(
    fixture: Parameters<typeof createMockGraph>[0],
    make: (graph: Graph) => DeclaredAlgorithm,
): Promise<AlgorithmOutput> {
    const output = await make(await createMockGraph(fixture)).compute(detachedRunContext());
    assert.isNotNull(output);
    return output;
}

/**
 * The value one field holds on every node, by id.
 * @param output - The result.
 * @param field - The field.
 * @returns The values.
 */
function nodeValues(output: AlgorithmOutput, field: string): Record<string, unknown> {
    return Object.fromEntries((output.nodes ?? []).map((node) => [String(node.id), node.values[field]]));
}

/**
 * The partition a community result describes, as sorted lists of members.
 * @param output - The result.
 * @returns The groups.
 */
function groupsOf(output: AlgorithmOutput): string[][] {
    const byGroup = new Map<unknown, string[]>();
    for (const [id, group] of Object.entries(nodeValues(output, "group"))) {
        byGroup.set(group, [...(byGroup.get(group) ?? []), id]);
    }
    return [...byGroup.values()].map((members) => members.sort()).sort((a, b) => a[0].localeCompare(b[0]));
}

describe("registration", () => {
    for (const [type, cls] of [
        ["markov-clustering", MarkovClusteringAlgorithm],
        ["spectral-clustering", SpectralClusteringAlgorithm],
        ["hierarchical-clustering", HierarchicalClusteringAlgorithm],
        ["astar", AStarAlgorithm],
        ["edge-betweenness", EdgeBetweennessCentralityAlgorithm],
    ] as const) {
        it(`registers ${type} under the graphty namespace`, () => {
            assert.strictEqual(Algorithm.getClass("graphty", type), cls);
        });
    }
});

describe("clustering splits two triangles at the bridge", () => {
    const SPLIT = [
        ["A", "B", "C"],
        ["D", "E", "F"],
    ];

    it("markov clustering", async () => {
        assert.deepStrictEqual(groupsOf(await run(TWO_TRIANGLES, (g) => new MarkovClusteringAlgorithm(g))), SPLIT);
    });

    it("spectral clustering into two", async () => {
        assert.deepStrictEqual(
            groupsOf(await run(TWO_TRIANGLES, (g) => new SpectralClusteringAlgorithm(g, { clusters: 2 }))),
            SPLIT,
        );
    });

    it("hierarchical clustering into two keeps each triangle's outer pair together", async () => {
        // Hop distances tie everywhere on this graph, so which side a bridge end joins is a
        // tie-break; the outer pairs, two hops from the bridge's far side, are not.
        const groups = groupsOf(
            await run(
                TWO_TRIANGLES,
                (g) => new HierarchicalClusteringAlgorithm(g, { clusters: 2, linkage: "average" }),
            ),
        );

        assert.lengthOf(groups, 2);
        assert.isTrue(groups.some((members) => members.includes("A") && members.includes("B")));
        assert.isTrue(groups.some((members) => members.includes("E") && members.includes("F")));
        assert.isFalse(groups.some((members) => members.includes("A") && members.includes("F")));
    });

    it("hierarchical clustering into as many clusters as nodes leaves every node alone", async () => {
        const output = await run(TWO_TRIANGLES, (g) => new HierarchicalClusteringAlgorithm(g, { clusters: 6 }));
        assert.lengthOf(groupsOf(output), 6);
    });

    it("hierarchical clustering never merges two pieces no path joins, and says so", async () => {
        const output = await run(TWO_PIECES, (g) => new HierarchicalClusteringAlgorithm(g, { clusters: 1 }));
        assert.deepStrictEqual(groupsOf(output), [
            ["A", "B"],
            ["C", "D", "E"],
        ]);
        assert.include(output.caveats.notes, "1 clusters were asked for; the graph allows 2.");
    });

    it("publishes a group on every node and nothing on an edge", async () => {
        for (const make of [
            (g: Graph) => new MarkovClusteringAlgorithm(g),
            (g: Graph) => new SpectralClusteringAlgorithm(g),
            (g: Graph) => new HierarchicalClusteringAlgorithm(g),
        ]) {
            const output = await run(TWO_TRIANGLES, make);
            assert.strictEqual(output.shape, "community");
            assert.lengthOf(output.nodes ?? [], 6);
            assert.isUndefined(output.edges);
            assert.notInclude(
                output.fields.map((field) => field.name),
                "modularity",
            );
        }
    });
});

describe("A*", () => {
    it("with no heuristic finds the route Dijkstra finds, and calls it exact", async () => {
        const astar = await run(TWO_TRIANGLES, (g) => new AStarAlgorithm(g, { source: "A", target: "F" }));
        const dijkstra = await run(TWO_TRIANGLES, (g) => new DijkstraAlgorithm(g, { source: "A", target: "F" }));

        assert.deepStrictEqual(nodeValues(astar, "onPath"), nodeValues(dijkstra, "onPath"));
        assert.deepStrictEqual(nodeValues(astar, "order"), nodeValues(dijkstra, "order"));
        assert.deepStrictEqual(
            (astar.edges ?? []).map((edge) => edge.values.onPath),
            (dijkstra.edges ?? []).map((edge) => edge.values.onPath),
        );
        assert.deepStrictEqual(astar.graph, { length: 4, cost: 7, hops: 3 });
        assert.strictEqual(astar.caveats.method, "astar");
        assert.isTrue(astar.caveats.exact);
    });

    it("with the layout heuristic and no positions yet still finds a route, and says it may not be the cheapest", async () => {
        const output = await run(
            TWO_TRIANGLES,
            (g) => new AStarAlgorithm(g, { source: "A", target: "F", heuristic: "layout-distance" }),
        );

        assert.deepStrictEqual(output.graph, { length: 4, cost: 7, hops: 3 });
        assert.strictEqual(output.caveats.method, "astar-layout-distance");
        assert.isFalse(output.caveats.exact);
    });

    it("marks only the route's nodes as on it", async () => {
        const output = await run(TWO_TRIANGLES, (g) => new AStarAlgorithm(g, { source: "A", target: "F" }));
        assert.deepStrictEqual(nodeValues(output, "onPath"), {
            A: true,
            B: false,
            C: true,
            D: true,
            E: false,
            F: true,
        });
    });
});

describe("edge betweenness", () => {
    it("scores the bridge highest, and publishes on edges only", async () => {
        const output = await run(TWO_TRIANGLES, (g) => new EdgeBetweennessCentralityAlgorithm(g));
        const values = (output.edges ?? []).map((edge) => edge.values.value as number);

        assert.strictEqual(output.shape, "edge-metric");
        assert.isUndefined(output.nodes);
        assert.lengthOf(values, 7);
        // Edge 3 is C - D: every one of the nine pairs across the triangles crosses it.
        assert.strictEqual(values[3], 9);
        assert.strictEqual(Math.max(...values), values[3]);
    });

    it("samples when asked, and says the result is an estimate", async () => {
        const output = await run(TWO_TRIANGLES, (g) => new EdgeBetweennessCentralityAlgorithm(g, { k: 2 }));

        assert.isFalse(output.caveats.exact);
        assert.strictEqual(output.caveats.sampleSize, 2);
    });
});
