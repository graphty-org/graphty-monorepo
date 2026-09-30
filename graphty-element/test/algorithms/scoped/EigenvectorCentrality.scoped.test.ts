/**
 * @file Eigenvector centrality over a scope: a listed scope and a multigraph
 * (design/sets/sets-design.md 10.1).
 */

import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("eigenvector", (graph) => new EigenvectorCentralityAlgorithm(graph));
