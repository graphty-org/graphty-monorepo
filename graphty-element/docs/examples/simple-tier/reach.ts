/**
 * @file A suggested name: a node score whose result is named after the setting that changes it.
 *
 * Shown in docs/guide/extending/custom-algorithms.md, which imports from
 * "@graphty/graphty-element/extend"; this file imports the same module from source so
 * test/browser/simple/define-algorithm.test.ts runs exactly the code the guide shows, and
 * test/simple/define-algorithm.test.ts fails when the two drift apart.
 */
import { defineAlgorithm } from "../../../extend";

// Reach: how many other nodes are within `hops` steps. The result is named after the hop count.
defineAlgorithm({
    id: "acme-reach",
    options: { hops: { type: "integer", default: 2, min: 1, max: 10 } },
    suggestedName: (options) =>
        options.hops === 2 ? undefined : { id: `acme_reach_${options.hops}`, label: `Reach in ${options.hops} hops` },
    node: (node, { options }) => {
        const seen = new Set([node.id]);
        let frontier = [node];
        for (let hop = 0; hop < options.hops; hop++) {
            frontier = frontier.flatMap((next) => next.neighbors()).filter((next) => !seen.has(next.id));
            frontier.forEach((next) => seen.add(next.id));
        }
        return seen.size - 1;
    },
});
