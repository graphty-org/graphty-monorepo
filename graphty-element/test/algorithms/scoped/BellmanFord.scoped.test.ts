/**
 * @file bellman-ford over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("bellman-ford", (graph: Graph) => new BellmanFordAlgorithm(graph));
