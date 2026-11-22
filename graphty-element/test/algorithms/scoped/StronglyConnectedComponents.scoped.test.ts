/**
 * @file strongly connected components over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { StronglyConnectedComponentsAlgorithm } from "../../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter(
    "strongly connected components",
    (graph: AlgorithmHost) => new StronglyConnectedComponentsAlgorithm(graph),
);
