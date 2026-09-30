/**
 * @file Degree over a scope: a listed scope and a multigraph (design/sets/sets-design.md 10.1).
 */

import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { describeScopedAdapter } from "./harness";

describeScopedAdapter("degree", (graph) => new DegreeAlgorithm(graph));
