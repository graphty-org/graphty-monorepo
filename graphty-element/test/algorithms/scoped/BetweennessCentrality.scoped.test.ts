/**
 * @file Betweenness centrality over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("betweenness", (graph) => new BetweennessCentralityAlgorithm(graph));
