/**
 * @file The simple tier's first algorithm: a node score from an edge attribute.
 *
 * Shown in docs/guide/extending/custom-algorithms.md, which imports from
 * "@graphty/graphty-element/extend"; this file imports the same module from source so
 * test/browser/simple/define-algorithm.test.ts runs exactly the code the guide shows, and
 * test/simple/define-algorithm.test.ts fails when the two drift apart.
 */
import { defineAlgorithm } from "../../../extend";

// Confidence-weighted degree: the summed confidence of the edges touching a node.
// options.confidence is the attribute's NAME; strength() reads each edge's value.
defineAlgorithm({
    id: "acme-confidence-degree",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    node: (node, { options }) => node.strength(options.confidence),
});
