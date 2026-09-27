/**
 * @file louvain over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("louvain", (graph: Graph) => new LouvainAlgorithm(graph));
