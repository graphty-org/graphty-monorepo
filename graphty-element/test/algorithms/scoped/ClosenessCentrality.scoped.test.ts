/**
 * @file Closeness centrality over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { ClosenessCentralityAlgorithm } from "../../../src/algorithms/ClosenessCentralityAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("closeness", (graph) => new ClosenessCentralityAlgorithm(graph));
