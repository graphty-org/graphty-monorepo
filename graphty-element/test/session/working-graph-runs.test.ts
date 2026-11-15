/**
 * @file Planning a run, and finding a node to run from, over the working graph
 * (design/working-graph/design.md section 6 and decisions 52 and 53). With the session's
 * `workingGraph` option on, a run over what is shown computes over the view whatever its algorithm
 * declares, so it is estimated -- and refused -- over the view: a run the budget refuses on the
 * whole graph may run filtered. The find box a path's ends are chosen from lists only what is
 * shown, unless it names the whole graph. With the option off, both are as they were.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import { clearRegisteredAlgorithmsForTesting, publishAlgorithmDescriptor } from "../../src/catalog/registry";
import type { AlgorithmDescriptor } from "../../src/catalog/types";
import { resultBytes } from "../../src/session/cost/estimate";
import type { SessionRunsOptions } from "../../src/session/types";
import { type Harness, makeSession } from "./helpers";

/** A chain of 100 nodes. */
const IDS = Array.from({ length: 100 }, (_, index) => `n${String(index)}`);

/** Degree as a plugin that declares no scoped input. */
const WHOLE = "working-whole-degree";

/**
 * A session over the chain with its first ten nodes shown.
 * @param working - Whether the session reads the working graph.
 * @param runs - Run options.
 * @returns The harness.
 */
async function filtered(working: boolean, runs?: SessionRunsOptions): Promise<Harness> {
    const harness = makeSession(runs === undefined ? {} : { runs });
    harness.add(
        IDS.map((id) => ({ id, name: id })),
        IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })),
    );
    harness.session.workingGraph = working;
    await harness.session.visibility.set({ kind: "member", of: { nodes: IDS.slice(0, 10) } });

    return harness;
}

describe("a run over what is shown is planned over the view", () => {
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

    it("estimates an algorithm that declares no scoped input over the view, with the option on", async () => {
        const harness = await filtered(true);
        const estimate = harness.session.estimate({ op: "algo.run", algorithm: WHOLE });

        assert.include(estimate.basis, "n=10 m=9");
        harness.session.dispose();
    });

    it("estimates it over the whole graph, as before, with the option off", async () => {
        const harness = await filtered(false);
        const estimate = harness.session.estimate({ op: "algo.run", algorithm: WHOLE });

        assert.include(estimate.basis, "n=100 m=99");
        harness.session.dispose();
    });

    it("keeps a named scope that is not what is shown on the whole-graph estimate", async () => {
        const harness = await filtered(true);
        const estimate = harness.session.estimate({
            op: "algo.run",
            algorithm: WHOLE,
            scope: { nodes: IDS.slice(0, 5) },
        });

        assert.include(estimate.basis, "n=100 m=99");
        harness.session.dispose();
    });

    it("admits, filtered, a run the budget refuses on the whole graph", async () => {
        const descriptor = algorithmByKey("degree");
        assert.isDefined(descriptor);
        // Room for ten nodes' columns and not for a hundred.
        const budget = (resultBytes(descriptor, 10, 9) + resultBytes(descriptor, 100, 99)) / 2;
        const limits = { limits: { exactComputationSeconds: 30, runColumnBudgetBytes: budget } };

        const off = await filtered(false, limits);
        const refused = await off.session.plan({ op: "algo.run", algorithm: WHOLE });
        assert.isFalse(refused.ok);
        assert.strictEqual(refused.blocked?.code, "E_OUT_OF_MEMORY");
        off.session.dispose();

        const on = await filtered(true, limits);
        const admitted = await on.session.plan({ op: "algo.run", algorithm: WHOLE });
        assert.isTrue(admitted.ok, "computed over the view, the run fits");
        on.session.dispose();
    });
});

describe("the find box a path's ends are chosen from", () => {
    /**
     * The node ids a find lists.
     * @param harness - The session.
     * @param text - What was typed.
     * @param scope - The scope it names, if any.
     * @returns The ids.
     */
    function found(harness: Harness, text: string, scope?: "graph"): string[] {
        return harness.session
            .find(text, { kinds: ["node"], limit: Infinity, ...(scope === undefined ? {} : { scope }) })
            .records.map((hit) => String(hit.id));
    }

    it("lists only what is shown with the option on, and a hidden node when it names the whole graph", async () => {
        const harness = await filtered(true);

        assert.deepStrictEqual(found(harness, "n50"), [], "a hidden node is no path end");
        assert.deepStrictEqual(found(harness, "n5"), ["n5"]);
        assert.deepStrictEqual(found(harness, "n50", "graph"), ["n50"]);
        harness.session.dispose();
    });

    it("lists a hidden node too with the option off, as before", async () => {
        const harness = await filtered(false);

        assert.deepStrictEqual(found(harness, "n50"), ["n50"]);
        harness.session.dispose();
    });
});
