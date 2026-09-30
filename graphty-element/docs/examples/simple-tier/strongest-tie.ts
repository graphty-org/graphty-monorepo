/**
 * @file An optional weight: a node score that also runs on an unweighted graph.
 *
 * Shown in docs/guide/extending/custom-algorithms.md, which imports from
 * "@graphty/graphty-element/extend"; this file imports the same module from source so
 * test/browser/simple/define-algorithm.test.ts runs exactly the code the guide shows, and
 * test/simple/define-algorithm.test.ts fails when the two drift apart.
 */
import { defineAlgorithm, type EdgeView } from "../../../extend";

// The strongest single tie of each node. With no weight attribute picked, every edge weighs 1.
// A node with no weighted edge gets -Infinity, which is "not measured".
const heaviest = (edges: readonly EdgeView[], weight: string | undefined) =>
    Math.max(...edges.map((edge) => edge.weight(weight) ?? -Infinity));

defineAlgorithm({
    id: "acme-strongest-tie",
    options: { weight: { type: "attribute", on: "edge", default: null } },
    node: (node, { options }) => heaviest(node.edges(), options.weight),
});
