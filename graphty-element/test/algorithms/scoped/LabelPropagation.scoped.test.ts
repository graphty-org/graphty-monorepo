/**
 * @file label-propagation over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

/*
 * The shared listed fixture splits into the same two groups listed or induced. Here the members
 * form a clique, which spreads one label over all four, while the listed edges a>b and c>d are two
 * pairs that cannot share one.
 */
describeScopedAdapter("label-propagation", (graph: Graph) => new LabelPropagationAlgorithm(graph), {
    nodes: ["a", "b", "c", "d", "e"],
    edges: [
        ["a", "b", 1],
        ["a", "c", 1],
        ["a", "d", 1],
        ["b", "c", 1],
        ["b", "d", 1],
        ["c", "d", 1],
        ["d", "e", 1],
    ],
    members: ["a", "b", "c", "d"],
    listed: (source, target) => (source === "a" && target === "b") || (source === "c" && target === "d"),
});
