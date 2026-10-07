/**
 * @file Every refused estimate carries `refusal`: a code and its parameters, with no words, so an
 * application writes the sentence itself.
 */

import { assert, describe, it } from "vitest";

import type { CostEstimate } from "../../src/session/cost";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { loadGexfCorpus, makeSession } from "./helpers";

/**
 * Assert an estimate is refused with exactly this code and these parameters, and that no
 * parameter is a sentence.
 * @param estimate - The estimate.
 * @param code - The expected code.
 * @param params - The expected parameters.
 */
function assertRefused(estimate: CostEstimate, code: string, params: Record<string, unknown>): void {
    assert.isFalse(estimate.available);
    assert.deepStrictEqual(estimate.refusal, { code, params });
    for (const value of Object.values(estimate.refusal?.params ?? {})) {
        assert.notMatch(String(value), / /, `a parameter is a value, not words: ${String(value)}`);
    }
}

/**
 * An executor that publishes a community result putting a, b, c and d in three groups.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function threeGroups(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const path = `results.${context.runId}.group`;
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                { name: "group", plainName: "Group", technicalName: "community", kind: "node", type: "integer", path },
            ],
            measured: { nodes: 4, edges: 1 },
            nodes: [
                { id: "a", values: { group: 0 } },
                { id: "b", values: { group: 0 } },
                { id: "c", values: { group: 1 } },
                { id: "d", values: { group: 2 } },
            ],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", notes: [] },
            durationMs: 1,
        }),
    };
}

describe("a refused estimate's coded refusal", () => {
    it("codes the layout refusals", async () => {
        const harness = makeSession();
        await loadGexfCorpus(harness, "lesmiserables.gexf");
        const { session } = harness;
        const layout = (id: string, options?: Record<string, unknown>): CostEstimate =>
            session.estimate({ op: "layout.set", id, ...(options === undefined ? {} : { options }) });

        assertRefused(layout("planar"), "layout.not-planar", { layout: "planar" });
        assertRefused(layout("nowhere"), "layout.unknown", { layout: "nowhere" });
        assertRefused(layout("hierarchical"), "layout.needs-node", { layout: "hierarchical", option: "start" });
        assertRefused(layout("hierarchical", { start: "nobody" }), "layout.node-missing", {
            layout: "hierarchical",
            option: "start",
            node: "nobody",
        });
        assertRefused(layout("radial", { root: "nobody" }), "layout.node-missing", {
            layout: "radial",
            option: "root",
            node: "nobody",
        });
        assertRefused(layout("shell"), "layout.needs-grouping", { layout: "shell", option: "groupBy" });
        assertRefused(layout("shell", { groupBy: "missing" }), "layout.grouping-absent", {
            layout: "shell",
            option: "groupBy",
            attribute: "missing",
            run: null,
        });

        session.dispose();
    });

    it("names the run whose field a grouping is, so an application can call it by the run's name", async () => {
        const ids = ["a", "b", "c", "d"];
        const harness = makeSession({ runs: { execute: threeGroups } });
        harness.add(
            ids.map((id) => ({ id })),
            [{ src: "a", dst: "b" }],
        );
        const { session } = harness;
        const run = await session.runs.start("louvain", {}, { style: false });
        const attribute = `results.${run.runId}.group`;

        assertRefused(
            session.estimate({ op: "layout.set", id: "bipartite", options: { groupBy: attribute } }),
            "layout.needs-two-groups",
            { layout: "bipartite", option: "groupBy", attribute, run: run.runId, groups: 3 },
        );
        session.dispose();
    });

    it("codes the algorithm and command refusals", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }, { id: "c" }], [{ src: "a", dst: "b" }]);
        const { session } = harness;

        assertRefused(session.estimate({ op: "algo.run", algorithm: "no-such-algorithm" }), "algorithm.unknown", {
            algorithm: "no-such-algorithm",
        });
        assertRefused(session.estimate({ op: "view.set", mode: "2d" } as never), "estimate.not-costed", {
            op: "view.set",
        });
        session.dispose();
    });

    it("leaves `refusal` out of an estimate that can run", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const estimate = harness.session.estimate({ op: "layout.set", id: "force" });
        assert.isTrue(estimate.available);
        assert.isUndefined(estimate.refusal);
        harness.session.dispose();
    });
});
