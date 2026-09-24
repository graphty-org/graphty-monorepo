/**
 * @file Modularity is Newman's Q, and a partition of everything into one community scores zero.
 *
 * Newman's Q subtracts a null-model term over every PAIR of nodes inside a community, not only
 * over the pairs an edge happens to join. Both community-detection modularity functions in this
 * package used to collect that term over the edge list alone, which leaves the penalty far too
 * small. The shortfall grows with community size, so coarser partitions scored higher almost
 * monotonically and the single-community partition -- whose modularity is 0 by definition -- beat
 * every real split. `girvanNewman` returns a dendrogram for a caller to take the argmax of, so a
 * score that ranks the uncut graph first meant no consumer ever received a cut.
 *
 * The check is against a textbook double sum written out here, so it pins the magnitude as well
 * as the zero: a formula that is merely scaled wrong ranks the levels correctly and still fails.
 */
import { describe, expect, it } from "vitest";

import { girvanNewman } from "../../src/algorithms/community/girvan-newman.js";
import { calculateModularity } from "../../src/algorithms/community/modularity-utils.js";
import { Graph } from "../../src/core/graph.js";
import type { NodeId } from "../../src/types/index.js";

/**
 * Newman's Q, written as the textbook double sum over ordered pairs.
 *
 * Deliberately the slow O(n^2) reading of the formula, with nothing shared with the
 * implementations it checks.
 * @param graph - The graph the partition is over.
 * @param communityOf - Which community each node belongs to.
 * @returns The modularity of that partition.
 */
function textbookModularity(graph: Graph, communityOf: Map<NodeId, number>): number {
    const ids = [...graph.nodes()].map((node) => node.id);

    let totalEdgeWeight = 0;
    for (const edge of graph.edges()) {
        totalEdgeWeight += edge.weight ?? 1;
    }

    if (totalEdgeWeight === 0) {
        return 0;
    }

    const degreeOf = new Map<NodeId, number>();
    for (const id of ids) {
        let degree = 0;
        for (const neighbor of graph.neighbors(id)) {
            degree += graph.getEdge(id, neighbor)?.weight ?? 1;
        }

        degreeOf.set(id, degree);
    }

    let sum = 0;
    for (const i of ids) {
        for (const j of ids) {
            if (communityOf.get(i) !== communityOf.get(j)) {
                continue;
            }

            const edge = graph.getEdge(i, j) ?? graph.getEdge(j, i);
            const adjacency = edge === undefined || edge === null ? 0 : (edge.weight ?? 1);
            const expected = ((degreeOf.get(i) ?? 0) * (degreeOf.get(j) ?? 0)) / (2 * totalEdgeWeight);

            sum += adjacency - expected;
        }
    }

    return sum / (2 * totalEdgeWeight);
}

/**
 * Build an undirected graph from an edge list.
 * @param edges - The edges, as node-id pairs.
 * @returns The graph.
 */
function undirected(edges: readonly (readonly [string, string])[]): Graph {
    const graph = new Graph({ directed: false });

    for (const [source, target] of edges) {
        graph.addEdge(source, target);
    }

    return graph;
}

/**
 * Put every node of a graph in the same community.
 * @param graph - The graph.
 * @returns The one-community partition.
 */
function everythingTogether(graph: Graph): Map<NodeId, number> {
    return new Map([...graph.nodes()].map((node) => [node.id, 0] as const));
}

/**
 * Read one dendrogram level as a node-to-community map.
 * @param level - The level.
 * @returns Which community each node is in.
 */
function partitionOf(level: { communities: NodeId[][] }): Map<NodeId, number> {
    const communityOf = new Map<NodeId, number>();

    level.communities.forEach((community, index) => {
        for (const id of community) {
            communityOf.set(id, index);
        }
    });

    return communityOf;
}

/** Two triangles joined through a single node, so the split is not a matter of opinion. */
const TWO_TRIANGLES: readonly (readonly [string, string])[] = [
    ["A1", "A2"],
    ["A2", "A3"],
    ["A1", "A3"],
    ["B1", "B2"],
    ["B2", "B3"],
    ["B1", "B3"],
    ["A1", "bridge"],
    ["bridge", "B1"],
];

/** Four triangles in a ring, joined by one edge each, so several cuts are available. */
const FOUR_GROUPS: readonly (readonly [string, string])[] = [
    ["a1", "a2"], ["a2", "a3"], ["a1", "a3"],
    ["b1", "b2"], ["b2", "b3"], ["b1", "b3"],
    ["c1", "c2"], ["c2", "c3"], ["c1", "c3"],
    ["d1", "d2"], ["d2", "d3"], ["d1", "d3"],
    ["a1", "b1"],
    ["b2", "c1"],
    ["c2", "d1"],
    ["d2", "a2"],
];

describe("modularity is Newman's Q", () => {
    describe("the shared calculation", () => {
        it("scores a connected graph's single-community partition at zero", () => {
            for (const edges of [TWO_TRIANGLES, FOUR_GROUPS]) {
                const graph = undirected(edges);

                expect(calculateModularity(graph, everythingTogether(graph))).toBeCloseTo(0, 12);
            }
        });

        it("matches the textbook double sum on a real split", () => {
            const graph = undirected(TWO_TRIANGLES);
            const split = new Map<NodeId, number>([
                ["A1", 0], ["A2", 0], ["A3", 0],
                ["bridge", 0],
                ["B1", 1], ["B2", 1], ["B3", 1],
            ]);

            expect(calculateModularity(graph, split)).toBeCloseTo(textbookModularity(graph, split), 12);
        });
    });

    describe("the dendrogram girvanNewman publishes", () => {
        it("scores its uncut first level at zero on a connected graph", () => {
            for (const edges of [TWO_TRIANGLES, FOUR_GROUPS]) {
                const dendrogram = girvanNewman(undirected(edges));

                expect(dendrogram[0].communities).toHaveLength(1);
                expect(dendrogram[0].modularity).toBeCloseTo(0, 12);
            }
        });

        it("scores every level at the textbook value", () => {
            for (const edges of [TWO_TRIANGLES, FOUR_GROUPS]) {
                const graph = undirected(edges);

                for (const level of girvanNewman(graph)) {
                    expect(level.modularity).toBeCloseTo(textbookModularity(graph, partitionOf(level)), 12);
                }
            }
        });

        it("scores a real cut above the uncut graph, so the argmax is a cut", () => {
            for (const edges of [TWO_TRIANGLES, FOUR_GROUPS]) {
                const dendrogram = girvanNewman(undirected(edges));
                const best = dendrogram.reduce((winner, candidate) =>
                    candidate.modularity > winner.modularity ? candidate : winner,
                );

                expect(best.communities.length).toBeGreaterThan(1);
                expect(best.modularity).toBeGreaterThan(0);
            }
        });
    });
});
