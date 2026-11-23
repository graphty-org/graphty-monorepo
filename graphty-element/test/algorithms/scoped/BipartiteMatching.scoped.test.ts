/**
 * @file bipartite-matching over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";
import type { AlgorithmHost } from "../../../src/algorithms/host";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("bipartite-matching", (graph: AlgorithmHost) => new BipartiteMatchingAlgorithm(graph));
