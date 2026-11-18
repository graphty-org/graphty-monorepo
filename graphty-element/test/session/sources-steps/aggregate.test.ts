// A step's `aggregate` settles repeated keys per column (design
// design/data/multiple-data-sources-design.md, 3.3 and 3.4): count, sum, min, max, mean, first,
// last or list, on join.node-values, join.merge and join.edges.
import { assert, describe, it } from "vitest";

import type { Step } from "../../../src/session/sources/steps/types";
import { csv, edgesOf, Fixture, nodeIn, phase1 } from "./helpers";

type Aggregate = NonNullable<Extract<Step, { op: "join.node-values" }>["aggregate"]>;

describe("aggregate on join.node-values", () => {
    const valuesOf = (aggregate: Aggregate): Record<string, unknown> | undefined => {
        const { f } = phase1([10000, 10001]);
        const v = f.stage({ nodes: csv("account_id,amount\nA-10000,5\nA-10000,7\nA-10001,2\n") }, {});
        f.steps.push({
            op: "join.node-values",
            source: v,
            read: { table: "nodes", key: "account_id", space: "account" },
            columns: ["amount"],
            aggregate,
        });
        return nodeIn(f.built(), "account", "A-10000")?.values;
    };

    it("sums two rows for one key, and counts them", () => {
        assert.equal(valuesOf({ amount: "sum" })?.amount, 12);
        assert.equal(valuesOf({ amount: "count" })?.amount, 2);
    });

    it("gives min, max, mean, first, last and list", () => {
        assert.equal(valuesOf({ amount: "min" })?.amount, 5);
        assert.equal(valuesOf({ amount: "max" })?.amount, 7);
        assert.equal(valuesOf({ amount: "mean" })?.amount, 6);
        assert.equal(valuesOf({ amount: "first" })?.amount, "5");
        assert.equal(valuesOf({ amount: "last" })?.amount, "7");
        assert.deepEqual(valuesOf({ amount: "list" })?.amount, ["5", "7"]);
    });
});

describe("aggregate on join.merge", () => {
    it("sums the merged values of every node 2 folding into one node 1", () => {
        const f = new Fixture();
        f.import(
            { edges: csv("txn_id,account_id,merchant_id\nT1,A1,M1\nT2,A2,M1\n") },
            {
                edges: {
                    from: { column: "account_id", type: "account" },
                    to: { column: "merchant_id", type: "merchant" },
                },
            },
        );
        const k = f.stage(
            { nodes: csv("alert_id,account_id,score\nK1,A1,1\nK2,A1,9\nK3,A2,4\n") },
            { nodes: { key: "alert_id" } },
        );
        f.merge({ from: { source: k, field: "account_id" }, into: { space: "account" } });
        const step = f.steps.at(-1);
        assert.equal(step?.op, "join.merge");
        f.steps[f.steps.length - 1] = { ...(step as Extract<Step, { op: "join.merge" }>), aggregate: { score: "sum" } };
        const r = f.built();
        assert.equal(nodeIn(r, "account", "A1")?.values.score, 10);
        assert.equal(nodeIn(r, "account", "A2")?.values.score, 4);
    });
});

describe("aggregate on join.edges", () => {
    it("makes one edge per end pair and writes each column's aggregate", () => {
        const f = new Fixture();
        const s = f.stage({ edges: csv("from,to,amount\nA,B,3\nA,B,4\nB,C,1\n") }, {});
        f.steps.push({
            op: "join.edges",
            source: s,
            part: f.mint(s),
            read: {
                table: "edges",
                source: "from",
                sourceSpace: "acct",
                target: "to",
                targetSpace: "acct",
                weight: null,
            },
            aggregate: { amount: "sum" },
        });
        const r = f.built();
        assert.deepEqual(
            r.issues.filter((i) => i.code.startsWith("E_")),
            [],
        );
        const edges = edgesOf(r);
        assert.equal(edges.length, 2);
        assert.deepEqual(edges.map((e) => e.values.amount).sort(), [1, 7]);
    });
});
