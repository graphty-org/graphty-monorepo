/**
 * @file A whole-graph score: PageRank, which walks the graph once per pass.
 *
 * Shown in docs/guide/extending/custom-algorithms.md, which imports from
 * "@graphty/graphty-element/extend"; this file imports the same module from source so
 * test/browser/simple/define-algorithm.test.ts runs exactly the code the guide shows, and
 * test/simple/define-algorithm.test.ts fails when the two drift apart.
 */
import { defineAlgorithm } from "../../../extend";

// PageRank: on every pass, each node's rank flows to its neighbors, shared out by its degree.
defineAlgorithm({
    id: "acme-rank",
    options: { passes: { type: "integer", default: 30, min: 1, max: 200 } },
    passes: "passes",
    async nodes(graph, { options, progress }) {
        const n = graph.nodeCount;
        let rank = new Map(graph.nodes().map((node) => [node.id, 1 / n]));
        for (let pass = 1; pass <= options.passes; pass++) {
            const next = new Map();
            for (const node of graph.nodes()) {
                const from = node.edges().map((edge) => edge.other(node));
                next.set(node.id, 0.15 / n + 0.85 * from.reduce((sum, m) => sum + (rank.get(m.id) ?? 0) / m.degree, 0));
            }
            rank = next;
            await progress(pass / options.passes); // lets the page draw, and stops a cancelled run
        }
        return rank;
    },
});
