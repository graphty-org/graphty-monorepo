/**
 * @file dfs over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { DFSAlgorithm } from "../../../src/algorithms/DFSAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("dfs", (graph: Graph) => new DFSAlgorithm(graph));
