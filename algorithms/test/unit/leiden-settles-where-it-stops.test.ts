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

/**
 * The twenty-cat graph graphty-element's Community stories load
 * (graphty-element/test/helpers/cat-social-network-2.json), edge `value` as the weight, which is
 * how the element hands it over. Leiden used to return four communities here scoring 0.5371
 * while moving Sir_Naps_A_Lot alone into Zoom_Zoom's community scored about 0.015 more: local
 * moving ran only on aggregated levels, so a node merged early could never leave again.
 */
const CAT_EDGES: readonly (readonly [string, string, number])[] = [
    ["Mr_Whiskers", "Mittens_The_Destroyer", 8],
    ["Princess_Fluffington", "Sir_Naps_A_Lot", 6],
    ["Garbage_Bandit", "Shadow_Ninja", 9],
    ["Chonky_Boy", "Mrs_Henderson", 10],
    ["Chonky_Boy", "The_Vet", 1],
    ["Mrs_Henderson", "Garbage_Bandit", 7],
    ["Zoom_Zoom", "Sir_Naps_A_Lot", 3],
    ["Princess_Fluffington", "Mr_Whiskers", 2],
    ["Shadow_Ninja", "Chonky_Boy", 5],
    ["Mittens_The_Destroyer", "The_Vet", 4],
    ["Professor_Pawsington", "Princess_Fluffington", 8],
    ["Tiny_Terror", "Old_Tom", 3],
    ["Bella_Ballerina", "Professor_Pawsington", 7],
    ["Midnight_Howler", "Mr_Whiskers", 6],
    ["Butterscotch", "Mrs_Henderson", 10],
    ["Ghost_Cat", "Old_Tom", 5],
    ["Therapy_Cat_Whisper", "The_Vet", 9],
    ["Neighbor_Dog_Rex", "Mr_Whiskers", 4],
    ["Window_Watcher_Wendy", "Zoom_Zoom", 6],
    ["Zoom_Zoom", "Tiny_Terror", 8],
    ["Garbage_Bandit", "Butterscotch", 3],
    ["Shadow_Ninja", "Ghost_Cat", 7],
    ["Sir_Naps_A_Lot", "Window_Watcher_Wendy", 5],
    ["Mittens_The_Destroyer", "Neighbor_Dog_Rex", 9],
    ["Old_Tom", "Mrs_Henderson", 4],
    ["Tiny_Terror", "Butterscotch", 6],
    ["Professor_Pawsington", "The_Vet", 2],
    ["Midnight_Howler", "Window_Watcher_Wendy", 5],
    ["Bella_Ballerina", "Therapy_Cat_Whisper", 4],
];

/**
 * The cat graph.
 * @returns An undirected weighted graph.
 */
function cats(): Graph {
    const graph = new Graph({ directed: false });

    for (const [source, target, weight] of CAT_EDGES) {
        graph.addEdge(source, target, weight);
    }

    return graph;
}

describe("Leiden on the twenty-cat graph", () => {
    const graph = cats();
    const result = leiden(graph);
    const communities = new Map([...result.communities].map(([node, community]) => [String(node), community]));
    const settled = calculateModularity(graph, communities);

    it("cannot be improved by moving one node to a neighbour's community or to a community of its own", () => {
        const alone = Math.max(...communities.values()) + 1;

        for (const node of graph.nodes()) {
            const id = String(node.id);
            const home = communities.get(id);
            if (home === undefined) {
                continue;
            }

            const targets = new Set([alone]);
            for (const neighbor of graph.neighbors(node.id)) {
                const into = communities.get(String(neighbor));
                if (into !== undefined && into !== home) {
                    targets.add(into);
                }
            }

            for (const into of targets) {
                communities.set(id, into);
                const score = calculateModularity(graph, communities);
                communities.set(id, home);

                expect(
                    score,
                    `moving "${id}" into community ${String(into)} takes modularity from ` +
                        `${settled.toFixed(6)} to ${score.toFixed(6)}`,
                ).toBeLessThanOrEqual(settled + 1e-9);
            }
        }
    });

    it("returns connected communities", () => {
        const members = new Map<number, string[]>();
        for (const [node, community] of communities) {
            members.set(community, [...(members.get(community) ?? []), node]);
        }

        for (const [community, nodes] of members) {
            const reached = new Set([nodes[0]]);
            const queue = [nodes[0]];
            for (let node = queue.pop(); node !== undefined; node = queue.pop()) {
                for (const neighbor of graph.neighbors(node)) {
                    const id = String(neighbor);
                    if (communities.get(id) === community && !reached.has(id)) {
                        reached.add(id);
                        queue.push(id);
                    }
                }
            }

            expect(reached.size, `community ${String(community)} is not connected`).toBe(nodes.length);
        }
    });

    it("scores at least 0.56, the best partition networkx Louvain finds", () => {
        expect(result.modularity).toBeCloseTo(settled, 10);
        expect(settled).toBeGreaterThanOrEqual(0.56);
    });
});
