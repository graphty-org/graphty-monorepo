// The reader source (design design/data/multiple-data-sources-design.md, 3.1, 3.2, 3.8 and 3.9):
// edits win over every step, Use is an ordinary edit, reader adds live in source:reader, and a
// column a rule, role or step reads refuses edits. Ported from the reference model's roundtrips
// "reader edits", late-findings 3.1, review-round-5 3.8, review-round-7 3.1 and
// reference-path-and-time-role 3.8 / 3.10 cases.
import { assert, describe, it } from "vitest";

import { resolveNode } from "../../../src/session/sources/steps/build";
import { cell, element, lineage, readPath, values } from "../../../src/session/sources/steps/provenance";
import { csv, Fixture, nodeIn } from "./helpers";

const P1 = { space: "person", key: "p1" };

function holders(): { f: Fixture; t: string; a: string } {
    const f = new Fixture();
    const t = f.import({ nodes: csv("id,holder\np1,Ann\np2,Bo\n") }, { key: "id", type: "person" });
    const a = f.import({ nodes: csv("id,holder\np1,Zed Q0\n") }, { key: "id", type: "person" });
    return { f, t, a };
}

describe("reader edits (3.8)", () => {
    it("lets an edit win; Use writes an ordinary reader edit", () => {
        const { f, a } = holders();
        assert.equal(values(f.built(), P1, "holder")?.shown, "Ann", "keep shows the first source");
        assert.isString(f.use(P1, "holder", a));
        const r = f.built();
        assert.equal(values(r, P1, "holder")?.origin, "reader");
        assert.deepEqual(cell(r, P1, "holder"), { state: "value", value: "Zed Q0", edited: true });
        assert.equal(values(r, P1, "holder")?.shown, "Zed Q0");
        assert.deepEqual(lineage(r, P1)?.reader, [f.reader[0].id]);
        f.edit(P1, "holder", "Typed");
        assert.equal(values(f.built(), P1, "holder")?.shown, "Typed", "the later edit wins");
    });

    it("keeps the first edit's `was` on a second edit of the same cell", () => {
        const { f } = holders();
        f.edit(P1, "holder", "X");
        f.edit(P1, "holder", "Y");
        assert.deepEqual(
            f.reader.map((o) => (o.op === "edit" ? o.was : undefined)),
            ["Ann", "Ann"],
        );
    });

    it("tells empty from not carried", () => {
        const f = new Fixture();
        f.import({ nodes: csv("id,holder\np1,\n") }, { key: "id", type: "person" });
        const r = f.built();
        assert.deepEqual(cell(r, P1, "holder"), { state: "empty" });
        assert.deepEqual(cell(r, P1, "nope"), { state: "not-carried" });
    });

    it("leaves an edit whose element is gone unbound, reported as W_REFERENCE_UNBOUND", () => {
        const { f, t, a } = holders();
        f.edit({ space: "person", key: "p2" }, "holder", "B2");
        f.removeSource(t);
        const r = f.built();
        assert.deepEqual(r.readerResults, [{ id: f.reader[0].id, applied: false }]);
        assert.deepEqual(r.issues, [
            {
                code: "W_REFERENCE_UNBOUND",
                params: { ref: { space: "person", key: "p2" }, edit: f.reader[0].id },
            },
        ]);
        assert.isNotNull(resolveNode(r, "person", "p1"), `${a} still supplies p1`);
    });

    it("removes a node with its edges, and an edge by { load, key }", () => {
        const f = new Fixture();
        const k = f.import(
            { edges: csv("eid,from,to\nE1,p1,p2\nE2,p2,p3\n") },
            {
                mapping: {
                    edges: {
                        edgeId: "eid",
                        source: "from",
                        target: "to",
                        sourceSpace: "person",
                        targetSpace: "person",
                    },
                },
            },
        );
        f.reader.push({ id: "r1", op: "remove", node: { space: "person", key: "p1" } });
        let r = f.built();
        assert.equal(r.nodes.size, 2);
        assert.deepEqual(
            [...r.edges.values()].map((e) => e.key),
            ["E2"],
        );
        f.reader.push({ id: "r2", op: "remove", edge: { load: k, key: "E2" } });
        r = f.built();
        assert.equal(r.edges.size, 0);
        assert.equal(r.nodes.size, 2, "removing an edge keeps its ends");
    });
});

describe("reader adds (3.1)", () => {
    it("puts a node the reader adds in source:reader, supplied by the reader", () => {
        const { f } = holders();
        f.addNode("X-1", { holder: "New" });
        const r = f.built();
        const n = element(r, { space: "source:reader", key: "X-1" });
        assert.deepEqual(n?.loads, ["reader"]);
        assert.equal(n?.values.holder, "New");
        assert.equal(n ? readPath(n, "graphty.space") : null, "source:reader");
    });

    it("keeps a reader add in source:reader even when it names another space", () => {
        const { f } = holders();
        f.reader.push({ id: "r1", op: "add", node: { space: "person", key: "A-2" } });
        const r = f.built();
        assert.isNull(resolveNode(r, "person", "A-2"));
        assert.isNotNull(resolveNode(r, "source:reader", "A-2"));
    });
});

describe("guarded columns (3.8)", () => {
    // Transactions whose merchants carry a category moved onto them.
    function merchants(): { f: Fixture; t: string } {
        const f = new Fixture();
        const t = f.import(
            { edges: csv("txn_id,account_id,merchant_id,category\nT1,A1,M1,atm\nT2,A2,M2,fuel\n") },
            {
                mapping: {
                    edges: {
                        edgeId: "txn_id",
                        source: "account_id",
                        sourceSpace: "account",
                        target: "merchant_id",
                        targetSpace: "merchant",
                    },
                },
            },
        );
        f.rule("node", "account", { source: t, end: "source" });
        f.rule("node", "merchant", { source: t, end: "target" });
        f.moveColumns(t, ["category"], "target");
        return { f, t };
    }

    it("refuses an edit to a type-rule column with E_EDIT_ROLE_COLUMN; the type keeps matching", () => {
        const { f, t } = merchants();
        f.declareType({
            name: "atm",
            kind: "node",
            rules: [{ source: t, end: "target", column: "category", values: ["atm"] }],
        });
        const ref = { space: "merchant", key: "M2" };
        assert.deepEqual(f.edit(ref, "category", "atm"), {
            code: "E_EDIT_ROLE_COLUMN",
            params: { column: "category" },
        });
        assert.equal(element(f.built(), ref)?.values.category, "fuel");
    });

    it("refuses an edit to an edge's end column, so the edge never ends elsewhere than its cell", () => {
        const { f, t } = merchants();
        const ref = { load: t, key: "T1" };
        const to = element(f.built(), ref);
        assert.deepEqual(f.edit(ref, "merchant_id", "M2"), {
            code: "E_EDIT_ROLE_COLUMN",
            params: { column: "merchant_id" },
        });
        assert.equal(to && "to" in to ? to.to : null, nodeIn(f.built(), "merchant", "M1")?.id);
    });
});

describe("time role and reader picks (3.9, 3.10)", () => {
    it("lets Use settle a time column and the time follows; a typed edit stays refused", () => {
        const f = new Fixture();
        const mapping = { nodes: { time: "last_seen" } };
        f.import(
            { nodes: csv("id,last_seen\np1,2026-03-01\np2,2026-01-10\n") },
            { key: "id", type: "person", mapping },
        );
        const b = f.import(
            { nodes: csv("id,last_seen\np1,2026-05-20\np2,2025-12-31\n") },
            { key: "id", type: "person", mapping },
        );
        const ref = { space: "person", key: "p2" };
        assert.deepEqual(f.edit(ref, "last_seen", "2020-01-01"), {
            code: "E_EDIT_ROLE_COLUMN",
            params: { column: "last_seen" },
        });
        assert.isString(f.use(ref, "last_seen", b));
        const r = f.built();
        assert.equal(values(r, ref, "last_seen")?.shown, "2025-12-31");
        const n = element(r, ref);
        assert.equal(n ? readPath(n, "graphty.time") : null, Date.parse("2025-12-31T00:00:00Z"));
        assert.equal(n?.timeFrom, b);
    });
});
