/**
 * @file A grouping: connected components, published as a community result.
 *
 * Shown in docs/guide/extending/custom-algorithms.md, which imports from
 * "@graphty/graphty-element/extend"; this file imports the same module from source so
 * test/browser/simple/define-algorithm.test.ts runs exactly the code the guide shows, and
 * test/simple/define-algorithm.test.ts fails when the two drift apart.
 */
import { defineAlgorithm } from "../../../extend";

// Connected components: each node's group is named after the first node of its component.
defineAlgorithm({
    id: "acme-components",
    groups: (graph) => {
        const group = new Map();
        for (const start of graph.nodes()) {
            if (group.has(start.id)) continue;
            group.set(start.id, start.id);
            const queue = [start];
            for (const node of queue) {
                for (const next of node.neighbors()) {
                    if (group.has(next.id)) continue;
                    group.set(next.id, start.id);
                    queue.push(next);
                }
            }
        }
        return group;
    },
});
