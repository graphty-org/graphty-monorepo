// Edge-making steps in the build (design design/data/multiple-data-sources-design.md, 3.3, 3.4,
// 3.8 and section 10 items 4, 9 and 29): edge keys, repeats, reductions and part minting.
import { assert, describe, it } from "vitest";

import { resolveEdge } from "../../../src/session/sources/steps/build";
import type { EdgeMapping } from "../../../src/session/sources/steps/types";
import { accountsCsv, csv, edgesOf, Fixture, keyOf, nodeIn, phase1 } from "./helpers";

describe("repeated edges", () => {
    it("reduces an interaction STRING and BioGRID both list to one edge under repeatedEdges first", () => {
        const f = new Fixture();
        f.repeatedEdges = "first";
        const ends = { source: "a", sourceSpace: "gene", target: "b", targetSpace: "gene" };
        f.import(
            { edges: csv("a,b,score\nTP53,MDM2,0.99\nTP53,EP300,0.95\n") },
            { mapping: { edges: { ...ends, weight: "score", weightMeaning: "strength" } } },
        );
        f.import(
            { edges: csv("a,b,system\nTP53,MDM2,Two-hybrid\nTP53,BRCA1,Affinity\n") },
            { mapping: { edges: ends } },
        );
        const r = f.built();
        const touches = (e: { from: string; to: string }, k: string): boolean =>
            keyOf(r, e.from) === k || keyOf(r, e.to) === k;
        assert.equal(edgesOf(r).filter((e) => keyOf(r, e.from) === "TP53" && keyOf(r, e.to) === "MDM2").length, 1);
        assert.equal(edgesOf(r).filter((e) => touches(e, "TP53")).length, 3, "TP53 has three distinct partners");
    });

    it("leaves two join.edges rows naming one pair to repeatedEdges when the step has no `repeated` (keep: two edges)", () => {
        const f = new Fixture();
        f.import({ nodes: csv("id\np1\np2\n") }, { key: "id", type: "person" });
        const calls = f.import({ nodes: csv("call,a,b\nc1,p1,p2\nc2,p1,p2\n") }, { key: "call", type: "call" });
        f.steps.push({
            op: "join.edges",
            source: calls,
            part: f.mint(calls),
            read: { table: "nodes", source: "a", sourceSpace: "person", target: "b", targetSpace: "person" },
        });
        const r = f.built();
        assert.equal(edgesOf(r).filter((e) => keyOf(r, e.from) === "p1" && keyOf(r, e.to) === "p2").length, 2);
    });

    const base: EdgeMapping = {
        source: "a",
        sourceSpace: "account",
        target: "m",
        targetSpace: "merchant",
        weight: "w",
    };
    function pair(
        policy: "first" | "sum",
        mapT: EdgeMapping,
        mapC: EdgeMapping,
        typed: boolean,
        cRows = "a,m,w\nacct-7,m-3,5\n",
    ): Fixture {
        const f = new Fixture();
        f.repeatedEdges = policy;
        const t = f.stage({ edges: csv("a,m,w\nacct-7,m-3,10\n") }, { edges: mapT });
        f.add(t);
        const c = f.stage({ edges: csv(cRows) }, { edges: mapC });
        if (typed) {
            f.rule("edge", "transfer", { source: t });
            f.rule("edge", "chargeback", { source: c });
        }
        f.add(c);
        return f;
    }

    it("never reduces edges of two types, under repeatedEdges first or sum", () => {
        const m = { ...base, weightMeaning: "strength" };
        assert.deepEqual(
            edgesOf(pair("first", m, m, true).built())
                .map((e) => e.type)
                .sort(),
            ["chargeback", "transfer"],
        );
        assert.deepEqual(
            edgesOf(pair("sum", m, m, true, "a,m,w\nacct-7,m-3,10\n").built())
                .map((e) => e.type)
                .sort(),
            ["chargeback", "transfer"],
        );
    });

    it("leaves repeats whose weight meanings differ parallel under repeatedEdges sum", () => {
        const f = pair("sum", { ...base, weightMeaning: "strength" }, { ...base, weightMeaning: "distance" }, false);
        assert.equal(edgesOf(f.built()).length, 2);
    });

    it("sums an untyped repeat of one meaning into one edge both sources supply", () => {
        const m = { ...base, weightMeaning: "strength" };
        const f = pair("sum", m, m, false);
        const edges = edgesOf(f.built());
        assert.equal(edges.length, 1);
        assert.equal(edges[0].weight, 15);
        assert.equal(edges[0].loads.length, 2);
    });

    it("never folds a refund into a purchase of one file typed by value", () => {
        const f = new Fixture();
        f.repeatedEdges = "sum";
        const t = f.stage(
            { edges: csv("a,m,w,kind\nacct-7,m-3,10,purchase\nacct-7,m-3,10,refund\n") },
            { edges: { ...base, weightMeaning: "strength" } },
        );
        f.rule("edge", "purchase", { source: t, column: "kind", values: ["purchase"] });
        f.rule("edge", "refund", { source: t, column: "kind", values: ["refund"] });
        f.add(t);
        assert.deepEqual(
            edgesOf(f.built())
                .map((e) => e.type)
                .sort(),
            ["purchase", "refund"],
        );
    });

    it("raises E_EDGE_KEY_COLLISION for two rows of one source with one edge id", () => {
        const f = new Fixture();
        f.import(
            { edges: csv("id,a,b\ne1,x,y\ne1,y,z\n") },
            { mapping: { edges: { edgeId: "id", source: "a", target: "b" } } },
        );
        const r = f.built();
        assert.equal(r.edges.size, 1);
        assert.deepEqual(
            r.issues.map((i) => i.code),
            ["E_EDGE_KEY_COLLISION"],
        );
    });
});

describe("edge keys (section 10 item 4)", () => {
    it("keys Extract's reduced edges <part>/<from>|<to>, escaped, so two end pairs stay two edges even with '|' in ids", () => {
        const f = new Fixture();
        const t = f.import(
            { edges: csv("hit_id,query,subject,family\nH1,gi|7,sp|P1,sp|F\nH2,gi|7|sp,P1,F\n") },
            { edges: { from: { column: "query", type: "seq" }, to: { column: "subject", type: "seq" } } },
        );
        f.extract(t, { column: "family", type: "family" });
        const r = f.built();
        const used = edgesOf(r).filter((e) => e.loads.includes(t) && /^\d+\//.test(e.key));
        assert.deepEqual(used.map((e) => `${keyOf(r, e.from)} -> ${keyOf(r, e.to)}`).sort(), [
            "gi|7 -> sp|F",
            "gi|7|sp -> F",
        ]);
        assert.deepEqual(used.map((e) => e.key).sort(), ["1/gi\\|7\\|sp|F", "1/gi\\|7|sp\\|F"]);
    });

    it("keys a join.edges row with no edge id and no `repeated` <part>/<copy id>#<row>", () => {
        const { f, t } = phase1([10000, 10001]);
        const part = f.mint(t);
        f.steps.push({
            op: "join.edges",
            source: t,
            part,
            read: {
                table: "edges",
                source: "account_id",
                sourceSpace: "account",
                target: "device_id",
                targetSpace: "device",
            },
            columns: [],
        });
        const { copy } = f.sources[t].origin;
        assert.isNotNull(resolveEdge(f.built(), t, `${part}/${copy}#0`));
    });

    it("matches join.edge-values' read.edgeId against the full edge key, part prefix included", () => {
        const { f, t } = phase1([10000, 10001]);
        const part = f.extract(t, { column: "device_id", type: "device" });
        const e = edgesOf(f.built()).find((x) => x.key.startsWith(`${part}/`));
        assert.isDefined(e);
        if (!e) {
            return;
        }
        const bare = e.key.slice(String(part).length + 1);
        const flags = f.stage(
            {
                edges: [
                    { eid: e.key, flag: "full" },
                    { eid: bare, flag: "bare" },
                ],
            },
            {},
        );
        f.steps.push({
            op: "join.edge-values",
            source: flags,
            edges: e.load,
            read: { table: "edges", edgeId: "eid" },
            columns: ["flag"],
        });
        const r = f.built();
        assert.equal(resolveEdge(r, e.load, e.key)?.values.flag, "full");
        const st = r.stats.at(-1);
        assert.deepEqual([st?.matched, st?.unmatched], [1, 1]);
    });

    it("supplies the nodes Extract makes from the source, with or without columns", () => {
        const { f, t } = phase1([10000, 10001]);
        f.extract(t, { column: "device_id", type: "device" });
        const dev = [...f.built().nodes.values()].find((n) => n.type === "device");
        assert.deepEqual([dev?.loads, dev?.named], [[t], []]);
        f.extract(t, { column: "os", type: "platform", columns: ["os"] });
        const os = [...f.built().nodes.values()].find((n) => n.type === "platform");
        assert.deepEqual(os?.loads, [t]);
        assert.isString(os?.values.os);
    });
});

describe("part minting (3.3)", () => {
    it("mints 1, 2; after deleting 1, 3; keeps part 2's keys; a deleted part's reference stays unbound", () => {
        const keys = [10000, 10001, 10002];
        const { f } = phase1(keys);
        const a = f.stage({ nodes: accountsCsv(keys) }, { nodes: { key: "account_id", space: "account" } });
        f.add(a);
        const k = f.stage(
            { nodes: csv("alert_id,account_id\nK-0,A-10000\nK-1,A-10001\n") },
            { nodes: { key: "alert_id" } },
        );
        const connect = (direction?: "from-into"): number =>
            f.connect({
                from: { source: k, field: "account_id" },
                into: { space: "account" },
                ...(direction ? { direction } : {}),
            });
        assert.equal(connect(), 1);
        assert.equal(connect("from-into"), 2);
        const part2 = (): string[] =>
            edgesOf(f.built())
                .filter((e) => e.key.startsWith("2/"))
                .map((e) => e.key)
                .sort();
        const keys2 = part2();
        assert.deepEqual(keys2, ["2/K-0", "2/K-1"]);
        f.steps = f.steps.filter((s) => !(s.op === "join.edges" && s.part === 1));
        assert.equal(connect(), 3, "a deleted step's part is never reused in the session");
        assert.deepEqual(part2(), keys2, "adding or deleting another step never re-keys an edge");
        // After reopen the session's high mark is gone; a saved reference to part 3 keeps it from coming back.
        f.steps = f.steps.filter((s) => !(s.op === "join.edges" && s.part === 3));
        const note = { load: k, key: "3/K-0" };
        const reopened = f.fork();
        reopened.forgetMinted();
        assert.equal(reopened.mint(k, [note]), 4);
        assert.isNull(resolveEdge(reopened.built(), note.load, note.key));
    });
});

describe("edge ends and staging", () => {
    it("leaves out an edge row whose end is empty and counts it", () => {
        const f = new Fixture();
        const t = f.import({ edges: csv("a,b\nx,\ny,z\n") }, { mapping: { edges: { source: "a", target: "b" } } });
        const r = f.built();
        assert.equal(r.edges.size, 1);
        assert.equal(r.fates.get(t)?.get("edges#0")?.fate, "left-out:empty-end");
        assert.deepEqual(r.issues, [{ code: "W_KEY_EMPTY", params: { source: t, column: "b", rows: 1 } }]);
        assert.isUndefined(nodeIn(r, `source:${t}`, ""));
    });
});
