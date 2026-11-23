/**
 * @file louvain over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("louvain", (graph: AlgorithmHost) => new LouvainAlgorithm(graph));
