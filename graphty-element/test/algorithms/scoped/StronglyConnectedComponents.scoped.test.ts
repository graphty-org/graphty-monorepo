/**
 * @file strongly connected components over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { StronglyConnectedComponentsAlgorithm } from "../../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter(
    "strongly connected components",
    (graph: Graph) => new StronglyConnectedComponentsAlgorithm(graph),
);
