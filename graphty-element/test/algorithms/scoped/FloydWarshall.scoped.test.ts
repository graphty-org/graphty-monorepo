/**
 * @file floyd-warshall over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { FloydWarshallAlgorithm } from "../../../src/algorithms/FloydWarshallAlgorithm";
import type { AlgorithmHost } from "../../../src/algorithms/host";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("floyd-warshall", (graph: AlgorithmHost) => new FloydWarshallAlgorithm(graph));
