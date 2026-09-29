/**
 * @file The first algorithm's edge companion: an edge score from its two ends.
 *
 * Shown in docs/guide/extending/custom-algorithms.md, which imports from
 * "@graphty/graphty-element/extend"; this file imports the same module from source so
 * test/browser/simple/define-algorithm.test.ts runs exactly the code the guide shows, and
 * test/simple/define-algorithm.test.ts fails when the two drift apart.
 */
import { defineAlgorithm } from "../../../extend";

// An edge's confidence relative to the confidence-weighted degrees of its two ends.
defineAlgorithm({
    id: "acme-confidence-share",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    edge: (edge, { options }) => {
        const c = edge.weight(options.confidence);
        const a = edge.source.strength(options.confidence);
        const b = edge.target.strength(options.confidence);
        return c === undefined || !a || !b ? undefined : c / Math.sqrt(a * b);
    },
});
