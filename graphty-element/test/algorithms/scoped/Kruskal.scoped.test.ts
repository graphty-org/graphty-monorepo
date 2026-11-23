/**
 * @file Kruskal over a scope: a listed scope, a multigraph and generated scopes
 * (design/sets/sets-design.md 10.1).
 */

import { describe, it } from "vitest";

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { assertOverGeneratedScopes, describeScopedAdapter } from "./harness";

const build = (graph: AlgorithmHost): KruskalAlgorithm => new KruskalAlgorithm(graph);

describeScopedAdapter("kruskal", build);

describe("kruskal over generated scopes", () => {
    it("equals the run on the scope's own graph, induced and listed", async () => {
        await assertOverGeneratedScopes(build);
    });
});
