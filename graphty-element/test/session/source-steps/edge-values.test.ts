/**
 * @file An edge-values join under the source-steps experiment (design 3.4, 8.6): a second file's
 * column onto the edges its key names, as a `join.edge-values` step, so a run can be weighted by
 * it. Ported from the reference model's late-findings "no way to weight a run from a second file's
 * values" case.
 */

import { assert, describe, it } from "vitest";

import { phase1 } from "./scenario";

describe("source-steps: an edge-values join", () => {
    it("weights a run from a second file's values; an edge without the column has no weight", async () => {
        const { session, t } = await phase1();
        const draft = await session.data.prepare(
            { type: "csv", config: { data: "txn_id,risk\nT-1,0.9\nT-2,0.1\n" }, name: "risk.csv" },
            { onto: "graph" },
        );
        await draft.load({ join: { keys: [{ file: "txn_id", graph: "id" }], shape: "edge-values" } });
        const joined = session.data.steps().at(-1);
        assert.strictEqual(joined?.op, "join.edge-values");
        const risk = new Map(session.data.edges().map((e) => [String(e.txn_id), e.risk]));
        assert.strictEqual(risk.get("T-1"), 0.9);
        assert.isUndefined(risk.get("T-3"), "T-3 is in no row of risk.csv");
        assert.strictEqual(session.data.count({ source: t }).edges, 4, "no edge added or lost");
        const plan = await session.plan({ op: "algo.run", algorithm: "pagerank", params: { weight: "risk" } });
        assert.strictEqual(plan.caveats.weight?.attribute, "risk");
        session.dispose();
    });
});
