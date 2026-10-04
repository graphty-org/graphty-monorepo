/**
 * Robustness of the GEXF importer beyond the XML layer: the header, namespaces, weights, count
 * hints, attribute values, intervals, containment and the attributes it does not keep. Every case
 * asserts the issue codes recorded and the data kept (counts and sample values).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GEXF_ISSUE } from "../../src/formats/gexf/index.js";
import { bytesOf, codes, gexf, GEXF_NS, ids, issuesOf, load } from "./helpers.js";

const E_ACUTE = String.fromCharCode(0xe9);
const AB = `<node id="a"/><node id="b"/>`;
const EDGE_ATTRS = (body: string): string => `<attributes class="edge">${body}</attributes>`;
const NODE_ATTRS = (body: string): string => `<attributes class="node">${body}</attributes>`;

/** The weights of a snapshot's edges, in edge order. */
function weights(result: { readonly snapshot: GraphSnapshot }): number[] {
    return Array.from(result.snapshot.edgeList().weights ?? []);
}

describe("GEXF header", () => {
    it("gexf-version-missing-or-unknown: a missing version takes the namespace's; an unknown one is reported", async () => {
        const missing = await load("gexf", `<gexf xmlns="http://www.gexf.net/1.2draft"><graph><nodes><node id="a"/></nodes></graph></gexf>`);
        expect(missing.report.issues).toEqual([]);
        expect(missing.snapshot.meta.sourceVersion).toBe("1.2");
        const unknown = await load("gexf", `<gexf xmlns="${GEXF_NS}" version="9.0"><graph><nodes><node id="a"/></nodes></graph></gexf>`);
        expect(codes(unknown.report)).toEqual([GEXF_ISSUE.HEADER_VALUE]);
        expect(unknown.report.issues[0].element).toBe("version");
        expect(unknown.snapshot.meta.sourceVersion).toBe("9.0");
        expect(unknown.snapshot.nodeCount).toBe(1);
    });

    it("gexf-1-0-draft: a 1.0draft graph type is read as the mode; the edge cardinal attribute is reported as not kept", async () => {
        const doc = `<gexf xmlns="http://www.gexf.net/1.0draft" version="1.0"><graph type="static"><nodes>${AB}</nodes><edges><edge source="a" target="b" cardinal="2"/></edges></graph></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        // corrected: an unknown XML attribute now has its own code (W_UNKNOWN_XML_ATTRIBUTE), not W_UNKNOWN_ELEMENT
        expect(codes(report)).toEqual([GEXF_ISSUE.UNKNOWN_XML_ATTRIBUTE]);
        expect(report.issues[0].element).toBe("cardinal");
        expect(snapshot.meta.mode).toBe("static");
        expect(snapshot.edgeCount).toBe(1);
    });

    it("gexf-second-graph: a second graph is merged into the first with W_MULTIPLE_GRAPHS, its header ignored", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3"><graph defaultedgetype="directed"><nodes>${AB}</nodes></graph><graph defaultedgetype="undirected"><nodes><node id="c"/></nodes><edges><edge source="a" target="c"/></edges></graph></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual([GEXF_ISSUE.MULTIPLE_GRAPHS]);
        expect(ids({ snapshot })).toEqual(["a", "b", "c"]);
        expect(snapshot.directed).toBe(true);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("gexf-idtype-mismatch: an id that contradicts idtype=integer is reported once", async () => {
        const { snapshot, report } = await load("gexf", gexf(`<node id="1"/><node id="x"/><node id="y"/>`, null, "", ` idtype="integer"`));
        expect(codes(report)).toEqual([GEXF_ISSUE.HEADER_VALUE]);
        expect(report.issues[0].message).toMatch(/"x" is not an integer.*idtype="integer"/);
        expect(ids({ snapshot })).toEqual([1, "x", "y"]);
    });

    it("gexf-meta-bad-date: a lastmodifieddate that is not a date is reported and kept as written", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3"><meta lastmodifieddate="yesterday"><creator>me</creator></meta><graph><nodes><node id="a"/></nodes></graph></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual([GEXF_ISSUE.HEADER_VALUE]);
        expect(report.issues[0].element).toBe("lastmodifieddate");
        expect(snapshot.meta.modified).toBe("yesterday");
        const ok = await load("gexf", doc.replace("yesterday", "2020-01-31"));
        expect(ok.report.issues).toEqual([]);
    });

    it("gexf-meta-after-graph: a <meta> after the graph is still applied", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes><node id="a"/></nodes></graph><meta lastmodifieddate="2020-01-01"><creator>Gephi</creator><description>d</description><keywords>x, y</keywords></meta></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        expect(report.issues).toEqual([]);
        expect(snapshot.meta).toMatchObject({ creator: "Gephi", description: "d", keywords: ["x", "y"], modified: "2020-01-01" });
    });

    it("xml-declared-latin1-gexf: GEXF bytes declaring ISO-8859-1 decode as Latin-1 with no issue", async () => {
        const doc = gexf(`<node id="caf${E_ACUTE}"/>`).replace("UTF-8", "ISO-8859-1");
        const result = await load("gexf", bytesOf(doc, "latin1"));
        expect(result.report.issues).toEqual([]);
        expect(ids(result)).toEqual([`caf${E_ACUTE}`]);
    });
});

describe("GEXF namespaces and structure", () => {
    it("gexf-viz-without-viz-namespace: a colour outside a viz namespace is an unknown element, not the viz colour", async () => {
        for (const child of [`<color r="1" g="2" b="3"/>`, `<q:color xmlns:q="urn:other" r="1" g="2" b="3"/>`]) {
            const { snapshot, report } = await load("gexf", gexf(`<node id="a">${child}</node>`));
            expect(codes(report), child).toEqual([GEXF_ISSUE.UNKNOWN_ELEMENT]);
            expect(snapshot.nodes.byRole("color"), child).toBeNull();
        }
        // the declared viz namespace, and a viz: prefix the document forgot to declare, are read
        const declared = await load("gexf", gexf(`<node id="a"><viz:color r="255" g="0" b="0"/></node>`));
        expect(declared.report.issues).toEqual([]);
        expect(declared.snapshot.nodes.byRole("color")).not.toBeNull();
        const undeclared = await load(
            "gexf",
            `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes><node id="a"><viz:size value="3"/></node></nodes></graph></gexf>`,
        );
        expect(undeclared.report.issues).toEqual([]);
        expect(undeclared.snapshot.nodes.value("size", 0)).toBe(3);
    });

    it("gexf-two-nodes-sections: both sections are read", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes><node id="a"/></nodes><nodes><node id="b"/></nodes><edges><edge source="a" target="b"/></edges></graph></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        expect(report.issues).toEqual([]);
        expect(ids({ snapshot })).toEqual(["a", "b"]);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("gexf-empty-node-id (corrected): id=\"\" is a legal GEXF id (xs:string) and round-trips through the exporter", async () => {
        // the expectation was E_MISSING_ID; GEXF types ids as xs:string, the exporter writes id="" for
        // the empty id, and the round-trip suite reads it back, so only a MISSING id is an error
        const { snapshot, report } = await load("gexf", gexf(`<node id=""/><node id="b"/>`, `<edge source="" target="b"/>`));
        expect(report.issues).toEqual([]);
        expect(ids({ snapshot })).toEqual(["", "b"]);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("gexf-empty-edge-endpoint (corrected): source=\"\" names the node whose id is empty, so without one it is E_UNKNOWN_NODE", async () => {
        const { snapshot, report } = await load("gexf", gexf(`<node id="a"/>`, `<edge source="" target="a"/>`));
        expect(codes(report)).toEqual([GEXF_ISSUE.UNKNOWN_NODE]);
        expect(report.counts.skippedEdges).toBe(1);
        expect(snapshot.nodeCount).toBe(1);
    });

    it("gexf-children-of-skipped-node: the nodes nested in a node without an id are reported as orphaned", async () => {
        const { snapshot, report } = await load("gexf", gexf(`<node label="no id"><nodes><node id="c"/></nodes></node>`));
        expect(codes(report)).toEqual([GEXF_ISSUE.MISSING_ID, GEXF_ISSUE.UNKNOWN_PARENT]);
        expect(ids({ snapshot })).toEqual(["c"]);
        expect(snapshot.nodes.get("parent")).toBeNull();
    });

    it("gexf-parent-cycle: a pid cycle and a pid naming the node itself are E_PARENT_CYCLE, the closing links dropped", async () => {
        const { snapshot, report } = await load(
            "gexf",
            gexf(`<node id="a" pid="b"/><node id="b" pid="a"/><node id="c" pid="c"/><node id="d" pid="a"/>`),
        );
        expect(codes(report)).toEqual([GEXF_ISSUE.PARENT_CYCLE, GEXF_ISSUE.PARENT_CYCLE]);
        expect(report.issues.map((i) => i.element)).toEqual(["b", "c"]);
        const parent = snapshot.nodes.require("parent");
        expect([0, 1, 2, 3].map((i) => (parent.isSet(i) ? parent.value(i) : null))).toEqual([1, null, null, 0]);
    });

    it("gexf-parent-repeated: a duplicate node repeating its pid is not a parent cycle", async () => {
        const { snapshot, report } = await load("gexf", gexf(`<node id="a"/><node id="b" pid="a"/><node id="b" pid="a"/>`));
        expect(codes(report)).toEqual(["W_DUPLICATE_NODE"]);
        expect(snapshot.nodes.require("parent").value(1)).toBe(0);
    });

    it("gexf-1-0-gephi-viz: GEXF 1.0's gephi.org viz namespace and <attributes type> are read (diseasome.gexf)", async () => {
        const doc = readFileSync(
            fileURLToPath(new URL("../conformance/fixtures/gexf/gephi-datasets/diseasome.gexf", import.meta.url)),
        );
        // its 1419 pid="0" (naming no node) are errors of their own, so the limit is lifted
        const { snapshot, report } = await load("gexf", doc, { errorLimit: Infinity });
        const found = new Set(codes(report));
        expect(found.has(GEXF_ISSUE.UNKNOWN_ELEMENT)).toBe(false);
        // edge cardinal is genuinely not kept; <attributes type> is the 1.0 spelling of mode
        expect(issuesOf(report, GEXF_ISSUE.UNKNOWN_XML_ATTRIBUTE).map((i) => i.element)).toEqual(["cardinal"]);
        expect(snapshot.nodeCount).toBe(1419);
        const position = Array.from(snapshot.nodes.byRole("position")?.value(0) as ArrayLike<number>);
        expect(position[0]).toBeCloseTo(-116.486664, 3);
        expect(position[1]).toBeCloseTo(-126.38917, 3);
        expect(snapshot.nodes.byRole("color")).not.toBeNull();
        expect(snapshot.nodes.byRole("size")).not.toBeNull();
    });

    it("gexf-issue-code-reuse: a <parent> without for is a parent issue; an unknown node attribute an attribute issue", async () => {
        const doc = gexf(`<node id="a" foo="1"><parents><parent/></parents></node>`);
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual([GEXF_ISSUE.UNKNOWN_XML_ATTRIBUTE, GEXF_ISSUE.UNKNOWN_PARENT]);
        expect(report.issues[0].element).toBe("foo");
        expect(GEXF_ISSUE.UNKNOWN_XML_ATTRIBUTE).toBe("W_UNKNOWN_XML_ATTRIBUTE");
        expect(snapshot.nodeCount).toBe(1);
    });

    it("gexf-unchecked-attributes-on-other-elements: unknown attributes on graph, attributes, attribute, attvalue, spell, nodes, edges, meta and gexf are reported", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3" g1="1"><meta lastmodifieddate="2020-01-01" m1="1"/><graph defaultedgetype="directed" timeformat="double" x1="1"><attributes class="node" a1="1"><attribute id="t" title="t" type="string" b1="1"/></attributes><nodes n1="1"><node id="a"><attvalues><attvalue for="t" value="x" lang="en"/></attvalues><spells><spell start="1" end="2" s1="1"/></spells></node><node id="b"/></nodes><edges e1="1"><edge source="a" target="b"/></edges></graph></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        expect(issuesOf(report, GEXF_ISSUE.UNKNOWN_XML_ATTRIBUTE).map((i) => i.element)).toEqual([
            "g1",
            "m1",
            "x1",
            "a1",
            "b1",
            "n1",
            "lang",
            "s1",
            "e1",
        ]);
        expect(snapshot.nodes.value("t", 0)).toBe("x");
        expect(snapshot.edgeCount).toBe(1);
    });
});

describe("GEXF weights", () => {
    it("gexf-weight-invalid-text: NaN, text and a decimal comma are E_INVALID_WEIGHT and the edge is skipped", async () => {
        const edges = ["NaN", "heavy", "1,5"].map((w) => `<edge source="a" target="b" weight="${w}"/>`).join("");
        const { snapshot, report } = await load("gexf", gexf(AB, `${edges}<edge source="b" target="a" weight="2"/>`));
        expect(codes(report)).toEqual(["E_INVALID_WEIGHT", "E_INVALID_WEIGHT", "E_INVALID_WEIGHT"]);
        expect(report.counts.skippedEdges).toBe(3);
        expect(weights({ snapshot })).toEqual([2]);
    });

    it("gexf-weight-infinite: INF is a legal weight (design 3.7); 1e400 overflows and is reported as W_PRECISION", async () => {
        const inf = await load("gexf", gexf(AB, `<edge source="a" target="b" weight="INF"/>`));
        expect(inf.report.issues).toEqual([]);
        expect(weights(inf)).toEqual([Infinity]);
        const big = await load("gexf", gexf(AB, `<edge source="a" target="b" weight="1e400"/>`));
        expect(codes(big.report)).toEqual([GEXF_ISSUE.PRECISION]);
        expect(big.report.issues[0].message).toMatch(/1e400 is beyond the double range/);
        expect(weights(big)).toEqual([Infinity]);
    });

    it("gexf-weight-attr-and-attvalue-conflict: a weight attribute and a weight attvalue on one edge are reported; the attvalue wins", async () => {
        const head = EDGE_ATTRS(`<attribute id="w" title="weight" type="double"/>`);
        const doc = gexf(AB, `<edge source="a" target="b" weight="2"><attvalues><attvalue for="w" value="3"/></attvalues></edge>`, head);
        const result = await load("gexf", doc);
        expect(codes(result.report)).toEqual([GEXF_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(result.report.issues[0].message).toMatch(/weight="2".*"3"; the attvalue is kept/);
        expect(weights(result)).toEqual([3]);
    });

    it("gexf-two-weight-attributes: a second attribute titled weight is reported and kept as a renamed column", async () => {
        const head = EDGE_ATTRS(`<attribute id="w1" title="weight" type="double"/><attribute id="w2" title="weight" type="double"/>`);
        const doc = gexf(AB, `<edge source="a" target="b"><attvalues><attvalue for="w1" value="4"/><attvalue for="w2" value="5"/></attvalues></edge>`, head);
        const result = await load("gexf", doc);
        expect(codes(result.report)).toEqual([GEXF_ISSUE.DUPLICATE_ATTRIBUTE, GEXF_ISSUE.COLUMN_RENAMED]);
        expect(result.report.issues[0].message).toMatch(/"w2" is also titled weight; attribute "w1" is the weight/);
        expect(weights(result)).toEqual([4]);
        expect(result.snapshot.meta.weightOrigin).toMatchObject({ id: "w1" });
        expect(result.snapshot.edges.value("weight#w2", 0)).toBe(5);
    });

    it("gexf-weight-error-policies-disagree: blank is absent everywhere; a bad weight is E_INVALID_WEIGHT everywhere", async () => {
        const head = EDGE_ATTRS(`<attribute id="w" title="weight" type="double"/>`);
        const blank = await load(
            "gexf",
            gexf(
                AB,
                `<edge source="a" target="b" weight=""/><edge source="b" target="a"><attvalues><attvalue for="w" value=""/></attvalues></edge>`,
                head,
            ),
        );
        expect(blank.report.issues).toEqual([]);
        expect(blank.snapshot.edgeCount).toBe(2);
        expect(blank.snapshot.edges.byRole("weight")?.isSet(0) ?? false).toBe(false);
        // a bad XML weight skips the edge before it reaches the sink; a bad weight attvalue arrives
        // after the edge was added, so the edge stays with its earlier weight (deferred: unifying
        // these needs the edge held back until </edge>)
        const bad = await load(
            "gexf",
            gexf(
                AB,
                `<edge source="a" target="b" weight="heavy"/><edge source="b" target="a" weight="2"><attvalues><attvalue for="w" value="heavy"/></attvalues></edge>`,
                head,
            ),
        );
        expect(codes(bad.report)).toEqual(["E_INVALID_WEIGHT", "E_INVALID_WEIGHT"]);
        expect(bad.report.counts.skippedEdges).toBe(1);
        expect(weights(bad)).toEqual([2]);
    });
});

describe("GEXF count hints", () => {
    it("gexf-count-hint-mismatch: a disagreeing count is W_COUNT_MISMATCH; an impossible one W_COUNT_HINT", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes count="10"><node id="a"/></nodes><edges count="2"><edge source="a" target="a"/></edges></graph></gexf>`;
        const mismatch = await load("gexf", doc);
        expect(codes(mismatch.report)).toEqual([GEXF_ISSUE.COUNT_MISMATCH, GEXF_ISSUE.COUNT_MISMATCH]);
        expect(mismatch.report.issues[0].message).toMatch(/count="10".*holds 1 <node>/);
        expect(mismatch.snapshot.nodeCount).toBe(1);
        for (const count of ["999999999999", "-3"]) {
            const huge = await load("gexf", doc.replace('count="10"', `count="${count}"`).replace('count="2"', 'count="1"'));
            expect(codes(huge.report), count).toEqual([GEXF_ISSUE.COUNT_HINT]);
        }
    });

    it("gexf-count-hint-number-coercion: a count that is not decimal digits is W_COUNT_HINT and ignored", async () => {
        for (const count of ["", "0x10", "1e3", " 5 "]) {
            const { snapshot, report } = await load(
                "gexf",
                `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes count="${count}"><node id="a"/></nodes></graph></gexf>`,
            );
            expect(codes(report), JSON.stringify(count)).toEqual([GEXF_ISSUE.COUNT_HINT]);
            expect(snapshot.nodeCount).toBe(1);
        }
    });
});

describe("GEXF attribute values", () => {
    it("gexf-attvalue-outside-options: a value outside the declared options is reported once and kept", async () => {
        const head = NODE_ATTRS(`<attribute id="0" title="kind" type="string"><options>a|b</options></attribute>`);
        const nodes = ["a", "c", "d"].map((v, i) => `<node id="n${i}"><attvalues><attvalue for="0" value="${v}"/></attvalues></node>`).join("");
        const { snapshot, report } = await load("gexf", gexf(nodes, null, head));
        expect(codes(report)).toEqual([GEXF_ISSUE.VALUE_OUTSIDE_OPTIONS]);
        expect(report.issues[0].message).toMatch(/"c" is not among the options of attribute "kind"/);
        expect([0, 1, 2].map((i) => snapshot.nodes.value("kind", i))).toEqual(["a", "c", "d"]);
    });

    it("gexf-duplicate-attvalue: two static values of one attribute on one node are reported; the later is kept", async () => {
        const head = NODE_ATTRS(`<attribute id="0" title="n" type="integer"/>`);
        const { snapshot, report } = await load(
            "gexf",
            gexf(`<node id="a"><attvalues><attvalue for="0" value="1"/><attvalue for="0" value="2"/></attvalues></node>`, null, head),
        );
        expect(codes(report)).toEqual([GEXF_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(report.issues[0].message).toMatch(/later value "2" is kept/);
        expect(snapshot.nodes.value("n", 0)).toBe(2);
    });

    it("gexf-attributes-after-nodes: values of an attribute declared after the nodes are dropped, and the late declaration says so", async () => {
        const doc = `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes><node id="a"><attvalues><attvalue for="0" value="1"/></attvalues></node></nodes>${NODE_ATTRS(`<attribute id="0" title="n" type="integer"/>`)}</graph></gexf>`;
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual([GEXF_ISSUE.UNKNOWN_ATTRIBUTE, GEXF_ISSUE.UNKNOWN_ATTRIBUTE]);
        expect(report.issues[1].message).toMatch(/declared after values that use it/);
        expect(snapshot.nodes.require("n").isSet(0)).toBe(false);
    });
});

describe("GEXF time", () => {
    it("gexf-inverted-spell: an element lifetime or a spell that starts after it ends is E_BAD_VALUE and not kept", async () => {
        const doc = gexf(
            `<node id="a" start="5" end="1"/><node id="b"><spells><spell start="3" end="2"/><spell start="1" end="2"/></spells></node>`,
            null,
            "",
            ` timeformat="integer"`,
        );
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual([GEXF_ISSUE.BAD_VALUE, GEXF_ISSUE.BAD_VALUE]);
        expect(report.issues[0].message).toMatch(/starts after it ends \(5 > 1\)/);
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.nodes.byRole("start")).toBeNull();
        expect((snapshot.nodes.value("spells", 1) as ArrayLike<number>[]).map((pair) => Array.from(pair))).toEqual([[1, 2]]);
    });

    it("gexf-timeformat-mismatch: a date or text time under timeformat double is E_COLUMN_TYPE; the node is kept", async () => {
        const doc = gexf(`<node id="a" start="2020-01-01"/><node id="b" start="abc"/>`, null, "", ` timeformat="double"`);
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE", "E_COLUMN_TYPE"]);
        expect(report.issues[0].message).toMatch(/2020-01-01/);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("gexf-timestamp-and-start-both: timestamp beside start / end is reported once; start / end win", async () => {
        const head = NODE_ATTRS(`<attribute id="0" title="v" type="string"/>`);
        const doc = gexf(
            `<node id="a" timestamp="3" start="1" end="5"><attvalues><attvalue for="0" value="x" timestamp="3" start="1" end="5"/></attvalues></node>`,
            null,
            head,
            ` timeformat="integer"`,
        );
        const { snapshot, report } = await load("gexf", doc);
        expect(codes(report)).toEqual([GEXF_ISSUE.TIMESTAMP_CONFLICT, GEXF_ISSUE.TIMED_VALUE_ON_STATIC]);
        expect(snapshot.nodes.value("start", 0)).toBe(1);
        expect(snapshot.nodes.value("end", 0)).toBe(5);
        expect(snapshot.nodes.value("timestamp", 0)).toBe(3);
    });

    it("gexf-bad-pid-skips-lifetime: a pid that does not coerce is reported and the lifetime is still written", async () => {
        const doc = gexf(`<node id="1" pid="abc" start="1" end="5"/>`, null, "", ` timeformat="integer"`);
        const { snapshot, report } = await load("gexf", doc, { ids: "number" });
        expect(codes(report)).toEqual(["E_INVALID_ID"]);
        expect(snapshot.nodes.value("start", 0)).toBe(1);
        expect(snapshot.nodes.value("end", 0)).toBe(5);
    });
});

describe("GEXF edges", () => {
    it("gexf-edge-id-claimed-before-validation: an edge rejected for its endpoint or weight does not claim its id", async () => {
        const { snapshot, report } = await load(
            "gexf",
            gexf(
                AB,
                `<edge id="e1" source="a" target="zz"/><edge id="e1" source="a" target="b" weight="heavy"/><edge id="e1" source="a" target="b"/>`,
            ),
        );
        expect(codes(report)).toEqual([GEXF_ISSUE.UNKNOWN_NODE, "E_INVALID_WEIGHT"]);
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.edges.value("id", 0)).toBe("e1");
    });
});
