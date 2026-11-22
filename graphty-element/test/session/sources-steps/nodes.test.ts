// Node steps in the build (design design/data/multiple-data-sources-design.md, 3.2 to 3.6 and 4.3):
// empty keys, repeats, merges, translations and removing a source.
import { assert, describe, it } from "vitest";

import { nodeId, resolveNode } from "../../../src/session/sources/steps/build";
import { accountsCsv, csv, Fixture, nodeIn, nodesOf, phase1 } from "./helpers";

describe("keys (4.3)", () => {
    it("leaves out an empty key cell and counts it; only a mapping with no key column makes keyless rows", () => {
        const f = new Fixture();
        const a = f.import({ nodes: csv("id,x\n,1\nB,2\n") }, { key: "id" });
        let r = f.built();
        assert.equal(r.stats[0].emptyKey, 1);
        assert.equal(r.nodes.size, 1);
        assert.equal(r.fates.get(a)?.get("nodes#0")?.fate, "left-out:empty-key");
        assert.deepEqual(r.issues, [{ code: "W_KEY_EMPTY", params: { source: a, column: "id", rows: 1 } }]);
        const b = f.import({ nodes: csv("x\n1\n2\n") }, { mapping: { nodes: {} } });
        r = f.built();
        assert.isNotNull(resolveNode(r, `source:${b}`, `${f.sources[b].origin.copy}#0`));
    });
});

describe("renames (4.4, 7.12)", () => {
    it("never reads two columns under one working name: a rename onto a column the rows carry is not applied", () => {
        const f = new Fixture();
        const eur = "amount_eur";
        f.import(
            { nodes: csv(`id,amount,${eur}\np1,10,9\n`) },
            { key: "id", type: "payment", mapping: { nodes: { key: "id", renamed: { [eur]: "amount" } } } },
        );
        assert.deepInclude(nodeIn(f.built(), "payment", "p1")?.values, { amount: "10", [eur]: "9" });
    });
});

describe("repeats within one source (3.3)", () => {
    it("takes the first value when `repeated` is absent, and counts rows that differ", () => {
        const { f } = phase1([10000, 10001]);
        const v = f.stage({ nodes: csv("account_id,tier\nA-10000,gold\nA-10000,silver\n") }, {});
        f.steps.push({
            op: "join.node-values",
            source: v,
            read: { table: "nodes", key: "account_id", space: "account" },
            columns: ["tier"],
        });
        const r = f.built();
        assert.equal(nodeIn(r, "account", "A-10000")?.values.tier, "gold");
        assert.equal(r.stats.at(-1)?.rowsDiffer, 1);
        assert.deepEqual(
            nodeIn(r, "account", "A-10000")?.loads.includes(v),
            true,
            "values a step writes supply the node",
        );
    });
});

describe("join.merge (3.4, 3.6)", () => {
    it("gives the merged account the last alert's value under Repeats: Last", () => {
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
        const merged = (repeated: "first" | "last"): unknown => {
            const g = f.fork();
            const k = g.stage(
                { nodes: csv("alert_id,account_id,score\nK1,A1,1\nK2,A1,9\nK3,A2,4\n") },
                { nodes: { key: "alert_id" } },
            );
            g.merge({ from: { source: k, field: "account_id" }, into: { space: "account" }, repeated });
            const r = g.built();
            assert.equal(r.stats.at(-1)?.merged, 3);
            assert.deepEqual(r.stats.at(-1)?.groups, [3, 2], "group sizes count node 1 and its node 2s");
            assert.equal(nodeIn(r, "account", "A1")?.type, "account", "node 1 keeps its type");
            return nodeIn(r, "account", "A1")?.values.score;
        };
        assert.equal(merged("last"), "9");
        assert.equal(merged("first"), "1");
    });

    const keys = [10000, 10001, 10002, 11200];
    function phase6(unmatchedFrom?: "keep" | "drop"): { f: Fixture; t: string; a: string } {
        const { f, t } = phase1(keys);
        const a = f.stage({ nodes: accountsCsv(keys) }, { nodes: { key: "account_id", space: "account" } });
        f.rule("node", "account", { source: a });
        f.merge({
            from: { source: a, field: "account_id" },
            into: { space: "account" },
            ...(unmatchedFrom ? { unmatchedFrom } : {}),
        });
        return { f, t, a };
    }

    it("folds a staged accounts file into the accounts the transactions named, with their values", () => {
        const { f, a } = phase6();
        const r = f.built();
        assert.equal(nodesOf(r).filter((n) => n.space === "account").length, keys.length);
        assert.equal(nodeIn(r, "account", "A-10001")?.values.email, "u1@bank-a.test");
        assert.equal(
            resolveNode(r, `source:${a}`, "A-10001")?.id,
            nodeId("account", "A-10001"),
            "node 2's key is an alias",
        );
    });

    it("looks a translated value up in source 1's space and resolves merge aliases (3.5)", () => {
        const { f, a } = phase6();
        const kyc = f.stage(
            { nodes: csv("alert_id,account_id,email\nK-1,A-10001,u1@bank-a.test\nK-2,A-11200,u1200@bank-a.test\n") },
            { nodes: { key: "alert_id" } },
        );
        f.merge({ from: { source: kyc, field: "email" }, into: { source: a, field: "email" } });
        const step = f.steps.at(-1);
        assert.equal(step && "via" in step ? step.via : undefined, a);
        const r = f.built();
        assert.equal(r.stats.at(-1)?.merged, 2);
        assert.equal(
            resolveNode(r, `source:${a}`, "A-10001")?.id,
            nodeId("account", "A-10001"),
            "source 1's own space reaches node 1 through the alias",
        );
        assert.isTrue(nodeIn(r, "account", "A-10001")?.loads.includes(kyc));
    });

    it("keeps source 2's nodes after removing source 1 from a Key merge with Only 2 Drop", () => {
        const { f, t, a } = phase6("drop");
        const from = (src: string): number => nodesOf(f.built()).filter((n) => n.loads.includes(src)).length;
        assert.equal(from(a), keys.length, "accounts.csv supplies its matched accounts before the removal");
        f.removeSource(t);
        assert.deepEqual(
            f.steps.map((s) => s.op),
            ["join.add"],
            "the merge depends on the source that supplied its node 1s",
        );
        assert.equal(from(a), keys.length, "the data without transactions.csv still holds accounts.csv's accounts");
    });

    it("drops an unmatched node 2 under Only 2 Drop, and moves it into node 1's space under Keep", () => {
        const f = new Fixture();
        f.import({ nodes: csv("id\nA1\n") }, { key: "id", type: "account" });
        const s2 = f.stage({ nodes: csv("id,note\nA1,x\nA9,y\n") }, { nodes: { key: "id" } });
        const g = f.fork();
        f.merge({ from: { source: s2, field: "id" }, into: { space: "account" }, unmatchedFrom: "drop" });
        assert.deepEqual(
            nodesOf(f.built()).map((n) => n.key),
            ["A1"],
        );
        g.merge({ from: { source: s2, field: "id" }, into: { space: "account" } });
        const r = g.built();
        assert.equal(nodeIn(r, "account", "A9")?.values.note, "y");
        assert.equal(resolveNode(r, `source:${s2}`, "A9")?.key, "A9", "its former place is an alias");
    });
});
