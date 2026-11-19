// Types, readable paths and lineage (design design/data/multiple-data-sources-design.md, 3.7 to
// 3.9 and 4.3). Ported from the reference model's type-rules-and-untyped-sources build cases,
// extract-edge-type, late-findings 4.3 and 3.8, and roundtrips "a reduced edge across sources".
import { assert, describe, it } from "vitest";

import { lineage, READABLE_PATHS, readPath } from "../../../src/session/sources/steps/provenance";
import { csv, edgesOf, Fixture, nodeIn, phase1 } from "./helpers";

// The name a column is read under, before its rename.
const READ_NAME = "merchant_category";

describe("type rules (3.7)", () => {
    it("lets a column-and-values rule beat a whole-source rule, then registry order", () => {
        const { f, t } = phase1([10000, 10001]);
        f.declareType({ name: "ios use", kind: "edge", rules: [{ source: t, column: "os", values: ["ios"] }] });
        f.declareType({ name: "later whole", kind: "edge", rules: [{ source: t }] });
        const types = edgesOf(f.built()).map((e) => e.type);
        assert.deepEqual(
            types,
            ["transfer", "ios use"],
            "android row keeps the first whole rule, ios takes the value rule",
        );
    });

    it("types by a column read under its working name after a rename", () => {
        const f = new Fixture();
        const t = f.stage(
            { edges: csv("a,m,merchant_category\nA1,M1,fuel\nA2,M2,food\n") },
            { edges: { source: "a", target: "m", renamed: { [READ_NAME]: "category" } } },
        );
        f.add(t);
        f.declareType({
            name: "fuel purchase",
            kind: "edge",
            rules: [{ source: t, column: "category", values: ["fuel"] }],
        });
        assert.deepEqual(
            edgesOf(f.built()).map((e) => e.type),
            ["fuel purchase", null],
        );
    });

    it("lets the first step that types a meeting node set its type, keeping the other in its lineage", () => {
        const f = new Fixture();
        f.import({ nodes: csv("id\np1\n") }, { key: "id", type: "person" });
        const b = f.stage({ nodes: csv("id\np1\np2\n") }, { nodes: { key: "id", space: "person" } });
        f.rule("node", "customer", { source: b });
        f.add(b);
        const r = f.built();
        assert.equal(nodeIn(r, "person", "p1")?.type, "person");
        assert.deepEqual(lineage(r, { space: "person", key: "p1" })?.otherTypes, ["customer"]);
        assert.equal(nodeIn(r, "person", "p2")?.type, "customer");
        assert.equal(r.stats[1].typeDiffers, 1);
    });

    it("lets a typed step give a type to a node an untyped step built", () => {
        const f = new Fixture();
        f.import(
            { edges: csv("a,b\np1,p2\n") },
            { mapping: { edges: { source: "a", target: "b", sourceSpace: "person", targetSpace: "person" } } },
        );
        f.import({ nodes: csv("id\np1\n") }, { key: "id", type: "person" });
        const r = f.built();
        assert.equal(nodeIn(r, "person", "p1")?.type, "person");
        assert.isNull(nodeIn(r, "person", "p2")?.type);
    });

    it("gives Extract's new edges its edge type and writes the node rule { source, part, end: target }", () => {
        const f = new Fixture();
        const t = f.import(
            { edges: csv("txn_id,account_id,merchant_id,device_id\nT1,A1,M1,D1\nT2,A2,M2,D2\n") },
            {
                edges: {
                    from: { column: "account_id", type: "account" },
                    to: { column: "merchant_id", type: "merchant" },
                },
            },
        );
        const part = f.extract(t, { column: "device_id", type: "device", edgeType: "used" });
        const r = f.built();
        const made = edgesOf(r).filter((e) => e.key.startsWith(`${part}/`));
        assert.equal(made.length, 2);
        assert.isTrue(made.every((e) => e.type === "used"));
        assert.deepEqual(f.types.find((x) => x.name === "device")?.rules, [{ source: t, part, end: "target" }]);
        assert.equal([...r.nodes.values()].filter((n) => n.type === "device").length, 2);
    });
});

describe("readable paths (3.9)", () => {
    it("answers every readable path on nodes and edges", () => {
        const f = new Fixture();
        const t = f.import(
            { edges: csv("eid,a,m,w,time\nE1,A1,M1,5,2026-01-02T00:00:00Z\n") },
            {
                mapping: {
                    edges: {
                        edgeId: "eid",
                        source: "a",
                        sourceSpace: "account",
                        target: "m",
                        targetSpace: "merchant",
                        weight: "w",
                        time: "time",
                    },
                },
            },
        );
        f.rule("edge", "transfer", { source: t });
        const r = f.built();
        const [e] = edgesOf(r);
        const n = nodeIn(r, "account", "A1");
        assert.deepEqual(
            READABLE_PATHS.map((p) => readPath(e, p)),
            ["transfer", t, [t], null, "E1", Date.parse("2026-01-02T00:00:00Z"), 5],
        );
        assert.deepEqual(
            READABLE_PATHS.map((p) => (n ? readPath(n, p) : undefined)),
            [null, t, [t], "account", "A1", null, null],
        );
        assert.equal(readPath(e, "w"), "5", "any other path reads the shown value");
    });
});

describe("reduced edges (3.8)", () => {
    it("lets the source leaf for B hold an edge T and B both have, with the summed weight", () => {
        const f = new Fixture();
        f.repeatedEdges = "sum";
        const mapping = {
            edges: {
                source: "a",
                sourceSpace: "account",
                target: "m",
                targetSpace: "merchant",
                weight: "w",
                weightMeaning: "strength",
            },
        };
        const t = f.stage({ edges: csv("a,m,w\nacct-7,m-3,10\n") }, mapping);
        f.add(t);
        const b = f.stage({ edges: csv("a,m,w\nacct-7,m-3,5\n") }, mapping);
        f.add(b);
        const r = f.built();
        assert.equal(r.edges.size, 1);
        const [e] = edgesOf(r);
        assert.deepEqual(readPath(e, "_source.loads"), [t, b]);
        assert.equal(readPath(e, "graphty.weight"), 15);
        assert.deepEqual(lineage(r, { load: t, key: e.key })?.aliases, [
            { load: b, key: `${f.sources[b].origin.copy}#0` },
        ]);
    });

    it("spans an extracted edge reduced from several rows over their times", () => {
        const f = new Fixture();
        const t = f.import(
            {
                edges: csv(
                    "txn_id,account_id,merchant_id,device_id,time\n" +
                        "T1,A1,M1,D1,2026-01-03T00:00:00Z\nT2,A1,M2,D1,2026-01-01T00:00:00Z\nT3,A1,M1,D1,2026-01-09T00:00:00Z\n",
                ),
            },
            {
                mapping: {
                    edges: {
                        edgeId: "txn_id",
                        source: "account_id",
                        sourceSpace: "account",
                        target: "merchant_id",
                        targetSpace: "merchant",
                        time: "time",
                    },
                },
            },
        );
        const part = f.extract(t, { column: "device_id", type: "device", edgeType: "used" });
        const [used] = edgesOf(f.built()).filter((e) => e.key.startsWith(`${part}/`));
        assert.equal(used.time, Date.parse("2026-01-01T00:00:00Z"), "starts at its earliest row");
        assert.equal(used.timeEnd, Date.parse("2026-01-09T00:00:00Z"), "ends at its latest row");
    });
});
