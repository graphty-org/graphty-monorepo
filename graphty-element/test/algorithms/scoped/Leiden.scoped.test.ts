/**
 * @file leiden over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("leiden", (graph: Graph) => new LeidenAlgorithm(graph));
