/**
 * @file K-core decomposition over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { KCoreAlgorithm } from "../../../src/algorithms/KCoreAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("k-core", (graph) => new KCoreAlgorithm(graph));
