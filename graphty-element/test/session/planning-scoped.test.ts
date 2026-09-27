/**
 * @file The planner over a scope smaller than the graph (design/sets/sets-design.md sections 6.5
 * and 10.2): an algorithm that does not compute over its scope is estimated, and refused, over the
 * whole graph; one that does is estimated over its scope plus the cost of deriving its input,
 * a + b(N + E) + c(kept edges).
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import { clearRegisteredAlgorithmsForTesting, publishAlgorithmDescriptor } from "../../src/catalog/registry";
import type { AlgorithmDescriptor } from "../../src/catalog/types";
import { resultBytes } from "../../src/session/cost/estimate";
import { derivationSeconds, keptSetScopes, type PlanningContext } from "../../src/session/planning";
import type { ResolvedScope } from "../../src/session/runs";
import type { SessionRunsOptions } from "../../src/session/types";
import { type Harness, makeSession } from "./helpers";

/** A chain of 100 nodes. */
const IDS = Array.from({ length: 100 }, (_, index) => `n${String(index)}`);

/** The first ten: a scope of 10 nodes and the 9 edges between them. */
const TEN = { nodes: IDS.slice(0, 10) };

/**
 * A session over the chain.
 * @param runs - Run options.
 * @returns The harness.
 */
function chain(runs?: SessionRunsOptions): Harness {
    const harness = makeSession(runs === undefined ? {} : { runs });
    harness.add(
        IDS.map((id) => ({ id })),
        IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })),
    );

    return harness;
}

describe("the derivation model", () => {
    it("is a + b(N + E) + c(kept edges): linear in the whole graph and in the kept edges", () => {
        const a = derivationSeconds(0, 0, 0);
        const b = derivationSeconds(1, 0, 0) - a;
        const c = derivationSeconds(0, 0, 1) - a;

        assert.isAbove(a, 0);
        assert.isAbove(b, 0);
        assert.isAbove(c, b, "a kept edge costs more than scanning one element");
        assert.closeTo(derivationSeconds(1000, 5000, 700), a + 6000 * b + 700 * c, 1e-12);
        assert.closeTo(derivationSeconds(3, 4, 0), derivationSeconds(4, 3, 0), 1e-15, "nodes and edges weigh the same");
    });

    it("reproduces the measured derivations it was fitted to within a factor of two", () => {
        // Design 6.5: 1M nodes, 5M edges; 10% of the nodes keeps about 1% of the edges, 50% about 25%.
        assert.closeTo(derivationSeconds(1e6, 5e6, 5e4), 0.064, 0.032);
        assert.closeTo(derivationSeconds(1e6, 5e6, 1.25e6), 0.273, 0.137);
    });
});

/** Degree as a plugin that computes on the whole graph whatever its scope. */
const WHOLE = "whole-degree";

describe("a run over a scope is planned by what its descriptor says it computes on", () => {
    beforeEach(() => {
        const { legacyKeys: _legacy, ...degree } = algorithmByKey("degree") as AlgorithmDescriptor & {
            legacyKeys: unknown;
        };
        publishAlgorithmDescriptor({
            descriptor: { ...degree, key: WHOLE, scopeInput: "none" },
            namespace: "acme",
            type: WHOLE,
        });
    });

    afterEach(() => {
        clearRegisteredAlgorithmsForTesting();
    });

    it("the built-ins publish that they compute over their scope", () => {
        assert.strictEqual(algorithmByKey("degree")?.scopeInput, "subgraph");
        assert.strictEqual(
            algorithmByKey("shortest-path")?.scopeInput,
            "subgraph",
            "a folded key: every class behind it declares it",
        );
    });

    it("an algorithm that does not compute over its scope is estimated over the whole graph", () => {
        const harness = chain();
        const estimate = harness.session.estimate({ op: "algo.run", algorithm: WHOLE, scope: TEN });

        assert.include(estimate.basis, "n=100 m=99");
        assert.notInclude(estimate.basis, "derive");
        harness.session.dispose();
    });

    it("one that does is estimated over its scope, plus deriving its input", () => {
        const harness = chain();
        const whole = harness.session.estimate({ op: "algo.run", algorithm: WHOLE, scope: TEN });
        const scoped = harness.session.estimate({ op: "algo.run", algorithm: "degree", scope: TEN });

        assert.include(scoped.basis, "n=10 m=9");
        assert.include(scoped.basis, "to derive the scope's subgraph");
        assert.notStrictEqual(scoped.seconds, whole.seconds);
        harness.session.dispose();
    });

    it("the whole graph as a scope derives nothing", () => {
        const harness = chain();
        const estimate = harness.session.estimate({ op: "algo.run", algorithm: "degree", scope: "graph" });

        assert.include(estimate.basis, "n=100 m=99");
        assert.notInclude(estimate.basis, "derive");
        harness.session.dispose();
    });

    it("a small scope does not admit a whole-graph run the budget refuses", async () => {
        const descriptor = algorithmByKey("degree");
        assert.isDefined(descriptor);
        // Room for ten nodes' columns and not for a hundred.
        const budget = (resultBytes(descriptor, 10, 9) + resultBytes(descriptor, 100, 99)) / 2;
        const harness = chain({ limits: { exactComputationSeconds: 30, runColumnBudgetBytes: budget } });

        const undeclared = await harness.session.plan({ op: "algo.run", algorithm: WHOLE, scope: TEN });
        assert.isFalse(undeclared.ok);
        assert.strictEqual(undeclared.blocked?.code, "E_OUT_OF_MEMORY");

        const declared = await harness.session.plan({ op: "algo.run", algorithm: "degree", scope: TEN });
        assert.isTrue(declared.ok, "computed over its scope, the run fits");
        harness.session.dispose();
    });
});

describe("the kept sets a refused run is pointed at", () => {
    it("are sized over the graph as it stands, leaving out a set that cannot resolve or holds nothing", () => {
        const sizes = new Map<string, ResolvedScope>([
            ["set_a", { nodeCount: 10, edgeCount: 9 } as ResolvedScope],
            ["set_empty", { nodeCount: 0, edgeCount: 0 } as ResolvedScope],
        ]);
        const context = {
            statistics: () => ({ nodeCount: 100, edgeCount: 99 }),
            resolveScope: (spec: { set: string }) => {
                const size = sizes.get(spec.set);
                if (size === undefined) {
                    throw new Error("detached");
                }

                return size;
            },
            keptSets: () => [
                { id: "set_a", name: "Ten" },
                { id: "set_gone", name: "Gone" },
                { id: "set_empty", name: "Nothing" },
            ],
        } as unknown as PlanningContext;

        assert.deepStrictEqual(keptSetScopes(context), [
            {
                scope: { set: "set_a" },
                label: "Ten",
                nodes: 10,
                edges: 9,
                derivationSeconds: derivationSeconds(100, 99, 9),
            },
        ]);
    });
});
