/**
 * @file Katz centrality over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("katz", (graph) => new KatzCentralityAlgorithm(graph));
