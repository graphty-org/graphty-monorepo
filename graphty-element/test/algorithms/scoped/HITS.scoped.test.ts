/**
 * @file HITS over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("hits", (graph) => new HITSAlgorithm(graph));
