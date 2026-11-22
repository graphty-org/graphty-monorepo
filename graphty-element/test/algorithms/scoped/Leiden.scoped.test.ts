/**
 * @file leiden over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("leiden", (graph: AlgorithmHost) => new LeidenAlgorithm(graph));
