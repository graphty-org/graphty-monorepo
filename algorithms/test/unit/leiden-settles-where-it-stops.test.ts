/**
 * @file Leiden must stop somewhere it cannot improve by moving one node.
 *
 * WHAT THIS EXISTS TO CATCH. Leiden used to sweep the nodes ONCE per outer pass. A move changes
 * the communities every later node is weighed against, so the nodes visited early were judged
 * against a partition that no longer existed by the end of the sweep, and whatever was left
 * stranded stayed stranded. On the twenty-cat graph the element ships as a story fixture that
 * came out as ten communities scoring 0.403, where six single-node moves reach 0.509 -- a worse
 * answer than Louvain's, from the algorithm sold as the improvement on Louvain.
 *
 * The assertion below is the defect stated directly and without naming an implementation: take
 * the partition Leiden returns, try every single-node move into a neighbour's community, and
 * require that none of them scores better. A partition anyone can improve in one move is not a
 * local optimum, and a community detector that returns one has stopped early.
 */

import { describe, expect, it } from "vitest";

import { leiden } from "../../src/algorithms/community/leiden";
import { calculateModularity } from "../../src/algorithms/community/modularity-utils";
import { Graph } from "../../src/core/graph";

/**
 * Two dense groups, a third joined to them by single edges, and three nodes hanging off the ends.
 *
 * The trailing nodes are the ones a single sweep leaves behind: each is reached by exactly one
 * edge, so whether it lands with its neighbour depends entirely on whether its neighbour had
 * already settled when the sweep reached it.
 */
const EDGES: readonly (readonly [string, string, number])[] = [
    ["a1", "a2", 5],
    ["a1", "a3", 5],
    ["a2", "a3", 5],
    ["a3", "a4", 4],
    ["a1", "a4", 4],
    ["b1", "b2", 5],
    ["b1", "b3", 5],
    ["b2", "b3", 5],
    ["b3", "b4", 4],
    ["b1", "b4", 4],
    ["c1", "c2", 5],
    ["c1", "c3", 5],
    ["c2", "c3", 5],
    ["a1", "b1", 1],
    ["b2", "c1", 1],
    ["c2", "a2", 1],
    ["a4", "tail1", 3],
    ["b4", "tail2", 3],
    ["c3", "tail3", 3],
];

/**
 * The graph the edges describe.
 * @returns An undirected weighted graph.
 */
function catsAndTails(): Graph {
    const graph = new Graph({ directed: false });

    for (const [source, target, weight] of EDGES) {
        graph.addEdge(source, target, weight);
    }

    return graph;
}

/**
 * The best modularity any single node move can reach from here.
 * @param graph - The graph.
 * @param communities - The partition to improve on.
 * @returns The score, the node that moved and where it went, for the message.
 */
function bestSingleMove(
    graph: Graph,
    communities: Map<string, number>,
): { score: number; node: string; into: number } {
    const settled = calculateModularity(graph, communities);
    let best = { score: settled, node: "", into: -1 };

    for (const node of graph.nodes()) {
        const id = String(node.id);
        const home = communities.get(id);

        for (const neighbor of graph.neighbors(node.id)) {
            const into = communities.get(String(neighbor));
            if (into === undefined || into === home || home === undefined) {
                continue;
            }

            communities.set(id, into);
            const score = calculateModularity(graph, communities);
            communities.set(id, home);

            if (score > best.score) {
                best = { score, node: id, into };
            }
        }
    }

    return best;
}

describe("the partition Leiden returns", () => {
    it("cannot be improved by moving a single node to a neighbour's community", () => {
        const graph = catsAndTails();
        const result = leiden(graph);
        const communities = new Map([...result.communities].map(([node, community]) => [String(node), community]));
        const settled = calculateModularity(graph, communities);
        const better = bestSingleMove(graph, communities);

        expect(better.score).toBeLessThanOrEqual(settled + 1e-9);
        expect(
            better.node,
            `moving "${better.node}" into community ${String(better.into)} takes modularity from ` +
                `${settled.toFixed(6)} to ${better.score.toFixed(6)}, so Leiden stopped before it had finished`,
        ).toBe("");
    });

    it("scores its own partition the same way an independent reading of it does", () => {
        // The number in the result and the number the shared modularity function computes for the
        // same partition have to be one number. Two formulas is how a partition came to be chosen
        // by a score nothing else in the package agreed with.
        const graph = catsAndTails();
        const result = leiden(graph);
        const communities = new Map([...result.communities].map(([node, community]) => [String(node), community]));

        expect(result.modularity).toBeCloseTo(calculateModularity(graph, communities), 10);
    });

    it("finds the three dense groups rather than shattering or merging them", () => {
        const graph = catsAndTails();
        const result = leiden(graph);
        const sizes = new Map<number, number>();

        for (const community of result.communities.values()) {
            sizes.set(community, (sizes.get(community) ?? 0) + 1);
        }

        expect(sizes.size).toBeGreaterThanOrEqual(3);
        expect(sizes.size).toBeLessThanOrEqual(4);
        expect(Math.min(...sizes.values())).toBeGreaterThan(1);
    });
});
