/**
 * @file girvan-newman over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import type { Graph } from "../../../src/Graph";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("girvan-newman", (graph: Graph) => new GirvanNewmanAlgorithm(graph));
