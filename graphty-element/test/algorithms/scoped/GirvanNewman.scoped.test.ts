/**
 * @file girvan-newman over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import type { AlgorithmHost } from "../../../src/algorithms/host";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("girvan-newman", (graph: AlgorithmHost) => new GirvanNewmanAlgorithm(graph));
