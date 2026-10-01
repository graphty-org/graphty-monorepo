/**
 * @file bipartite-matching over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("bipartite-matching", (graph: Graph) => new BipartiteMatchingAlgorithm(graph));
