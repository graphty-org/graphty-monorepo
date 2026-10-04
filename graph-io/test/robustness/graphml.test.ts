/**
 * Robustness of the GraphML importer beyond the XML layer: namespaces, edge and hyperedge
 * semantics, keys and data, hints, ports, descriptions and the attributes it does not keep. Every
 * case asserts the issue codes recorded and the data kept (counts and sample values).
 */

import { describe, expect, it } from "vitest";

import { GRAPHML_ISSUE } from "../../src/formats/graphml/constants.js";
import { codes, graphml, GRAPHML_NS, ids, issuesOf, load } from "./xml-helpers.js";

/**
 * A GraphML document whose graph is undirected.
 * @param body - the children of `<graph>`
 * @returns the document
 */
function undirected(body: string): string {
    return graphml(body).replace('edgedefault="directed"', 'edgedefault="undirected"');
}

const KEY_D = `<key id="d" for="node" attr.name="d" attr.type="string"/>`;

describe("GraphML namespaces", () => {
    it("graphml-foreign-namespace-element: a vendor element named node in another namespace is not a node", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"/><x:node xmlns:x="urn:other" id="z"/><x:edge xmlns:x="urn:other" source="a" target="z"/>`,
            ),
        );
        expect(ids({ snapshot })).toEqual(["a"]);
        expect(snapshot.edgeCount).toBe(0);
        expect(codes(report)).toEqual([GRAPHML_ISSUE.UNKNOWN_ELEMENT]);
        expect(report.issues[0].element).toBe("x:node");
    });

    it("graphml-wrong-or-missing-namespace: no namespace imports silently; a wrong one is reported and read as GraphML", async () => {
        const plain = await load("graphml", `<graphml><graph edgedefault="directed"><node id="a"/></graph></graphml>`);
        expect(plain.report.issues).toEqual([]);
        expect(plain.snapshot.nodeCount).toBe(1);
        const wrong = await load(
            "graphml",
            `<graphml xmlns="urn:wrong"><graph edgedefault="directed"><node id="a"/><node id="b"/><edge source="a" target="b"/></graph></graphml>`,
        );
        expect(codes(wrong.report)).toEqual([GRAPHML_ISSUE.NAMESPACE]);
        expect(wrong.report.issues[0].message).toContain('"urn:wrong"');
        expect(wrong.snapshot.nodeCount).toBe(2);
        expect(wrong.snapshot.edgeCount).toBe(1);
    });
});

describe("GraphML edges", () => {
    it("graphml-directed-xs-boolean-1-0: directed 1 and 0 are the xs:boolean true and false; yes stays an error", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"/><node id="b"/><edge source="a" target="b" directed="1"/><edge source="b" target="a" directed="0"/><edge source="a" target="a" directed="yes"/>`,
                "",
                "",
            ).replace('edgedefault="directed"', 'edgedefault="undirected"'),
            { onMixedDirection: "expand" },
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.INVALID_DIRECTED]);
        expect(report.issues[0].message).toContain('directed="yes"');
        expect(report.counts.skippedEdges).toBe(1);
        // directed="1" is directed in the undirected graph: expanded to a pair beside the undirected edge
        expect(report.counts.expandedMixed).toBe(1);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("graphml-forward-edge-reference-strict: under addMissingNodes false an edge before its nodes is kept", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(`<edge id="e" source="a" target="b"/><node id="a"/><node id="b"/><edge source="a" target="zz"/>`),
            { addMissingNodes: false },
        );
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.edges.value("id", 0)).toBe("e");
        expect(codes(report)).toEqual([GRAPHML_ISSUE.UNKNOWN_NODE]);
        expect(report.issues[0].line).toBe(2);
        expect(report.counts).toMatchObject({ nodes: 2, edges: 1, skippedEdges: 1 });
        expect(Object.values(GRAPHML_ISSUE)).toContain("E_UNKNOWN_NODE");
    });

    it("graphml-edge-to-nested-graph-id: an endpoint naming a nested graph is reported before its node is created", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"><graph id="g1" edgedefault="directed"><node id="c"/></graph></node><node id="b"/><edge source="g1" target="b"/>`,
            ),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.GRAPH_ENDPOINT]);
        expect(report.issues[0].message).toContain('"g1" names a <graph>');
        expect(ids({ snapshot })).toEqual(["a", "c", "b", "g1"]);
        expect(snapshot.edgeCount).toBe(1);
    });

    it('graphml-empty-edge-id: id="" is the same as no id, so two such edges are both kept', async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"/><node id="b"/><edge id="" source="a" target="b"/><edge id="" source="b" target="a"/>`,
            ),
        );
        expect(report.issues).toEqual([]);
        expect(snapshot.edgeCount).toBe(2);
        expect(snapshot.edges.get("id")).toBeNull();
    });
});

describe("GraphML nodes", () => {
    it("graphml-duplicate-node-across-nesting: a node declared at the top and in a nested graph is merged with a warning", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(`<node id="a"/><node id="p"><graph id="p:" edgedefault="directed"><node id="a"/></graph></node>`),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.DUPLICATE_NODE]);
        expect(snapshot.nodeCount).toBe(2);
        expect(report.counts.nodes).toBe(2);
    });

    it("graphml-children-of-skipped-node: the nodes of a nested graph whose container was skipped are reported as orphaned", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(`<node><graph id="g" edgedefault="directed"><node id="c"/></graph></node>`),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.MISSING_ID, GRAPHML_ISSUE.UNKNOWN_PARENT]);
        expect(ids({ snapshot })).toEqual(["c"]);
        expect(snapshot.nodes.get("parent")).toBeNull();
    });

    it("graphml-original-id-after-nested-graph: a graphty:originalId that arrives too late or holds markup is reported", async () => {
        const keys = `<key id="o" for="node" attr.name="graphty:originalId" attr.type="string"/>`;
        const late = await load(
            "graphml",
            graphml(
                `<node id="n1"><graph id="n1:" edgedefault="directed"><node id="c"/></graph><data key="o">real id</data></node>`,
                keys,
            ),
        );
        expect(codes(late.report)).toEqual([GRAPHML_ISSUE.ORIGINAL_ID_IGNORED]);
        expect(late.report.issues[0].message).toMatch(/after the node's nested <graph>/);
        expect(ids(late)).toEqual(["n1", "c"]);
        const nested = await load("graphml", graphml(`<node id="n1"><data key="o"><b>x</b></data></node>`, keys));
        expect(codes(nested.report)).toEqual([GRAPHML_ISSUE.ORIGINAL_ID_IGNORED]);
        expect(ids(nested)).toEqual(["n1"]);
        const ok = await load("graphml", graphml(`<node id="n1"><data key="o">real id</data></node>`, keys));
        expect(ok.report.issues).toEqual([]);
        expect(ids(ok)).toEqual(["real id"]);
    });
});

describe("GraphML keys and data", () => {
    it("graphml-duplicate-data-same-key: a second data of one key on one node is reported; the later value is kept", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"><data key="d">1</data><data key="d">2</data></node><node id="b"><data key="d">3</data></node>`,
                KEY_D,
            ),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(report.issues[0].message).toMatch(/later value is kept/);
        expect(snapshot.nodes.value("d", 0)).toBe("2");
        expect(snapshot.nodes.value("d", 1)).toBe("3");
    });

    it("graphml-key-declared-after-graph: data whose key is declared after the graph is reported per value", async () => {
        const doc = `<graphml xmlns="${GRAPHML_NS}"><graph edgedefault="directed"><node id="a"><data key="d">1</data></node><node id="b"><data key="d">2</data></node></graph>${KEY_D}</graphml>`;
        const { snapshot, report } = await load("graphml", doc);
        expect(codes(report)).toEqual([
            GRAPHML_ISSUE.UNKNOWN_KEY,
            GRAPHML_ISSUE.UNKNOWN_KEY,
            GRAPHML_ISSUE.KEY_DECLARED_LATE,
        ]);
        expect(report.issues[2].message).toMatch(/declared after data that uses it/);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("graphml-duplicate-edge-id-deferred: an edge waiting for its nodes keeps its id over a later edge reusing it", async () => {
        const doc = graphml(
            `<edge id="e" source="a" target="b"><data key="d">first</data></edge><node id="a"/><node id="b"/><node id="c"/><edge id="e" source="a" target="c"><data key="d">second</data></edge>`,
            `<key id="d" for="edge" attr.name="d" attr.type="string"/>`,
        );
        const { snapshot, report } = await load("graphml", doc);
        expect(codes(report)).toEqual(["E_DUPLICATE_EDGE_ID"]);
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.edges.value("d", 0)).toBe("first");
    });

    it("graphml-double-special-values: xs:double INF / -INF / NaN and Infinity read; inf is a type error; 1e400 is reported as overflow", async () => {
        const keys = `<key id="x" for="node" attr.name="x" attr.type="double"/>`;
        const values = ["INF", "-INF", "NaN", "Infinity", "-Infinity", "inf", "1e400"];
        const body = values.map((v, i) => `<node id="n${i}"><data key="x">${v}</data></node>`).join("");
        const { snapshot, report } = await load("graphml", graphml(body, keys));
        expect(codes(report)).toEqual(["E_COLUMN_TYPE", GRAPHML_ISSUE.PRECISION]);
        expect(report.issues[1].message).toMatch(/1e400.*Infinity/);
        expect(snapshot.nodeCount).toBe(7);
        const read = values.map((_, i) => snapshot.nodes.value("x", i));
        expect(read).toEqual([Infinity, -Infinity, NaN, Infinity, -Infinity, undefined, Infinity]);
    });

    it("graphml-attr-list-extension: attr.list is reported as not kept, then each list value as a type error", async () => {
        const keys = `<key id="l" for="node" attr.name="l" attr.type="int" attr.list="true"/>`;
        const { snapshot, report } = await load(
            "graphml",
            graphml(`<node id="a"><data key="l">1 2</data></node>`, keys),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.UNKNOWN_XML_ATTRIBUTE, "E_COLUMN_TYPE"]);
        expect(report.issues[0].element).toBe("attr.list");
        expect(snapshot.nodeCount).toBe(1);
    });

    it("graphml-data-on-root: a graph data element after the graph, under <graphml>, is kept as a graph attribute", async () => {
        const doc = `<graphml xmlns="${GRAPHML_NS}"><key id="g" for="graph" attr.name="name" attr.type="string"/><graph edgedefault="directed"><node id="a"/></graph><data key="g">late</data></graphml>`;
        const { snapshot, report } = await load("graphml", doc);
        expect(report.issues).toEqual([]);
        expect(snapshot.graph.value("name", 0)).toBe("late");
    });

    it("graphml-duplicate-weight-or-default: two weight keys on one edge and two defaults in one key are reported", async () => {
        const keys = `<key id="w1" for="edge" attr.name="weight" attr.type="double"/><key id="w2" for="edge" attr.name="weight" attr.type="long"/><key id="k" for="node" attr.name="k" attr.type="int"><default>1</default><default>2</default></key>`;
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"/><node id="b"/><edge source="a" target="b"><data key="w1">1.5</data><data key="w2">7</data></edge>`,
                keys,
            ),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.DUPLICATE_ATTRIBUTE, GRAPHML_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(report.issues[0].message).toMatch(/second <default>; the later one is kept/);
        expect(report.issues[1].message).toMatch(/two weight keys \("w1" and "w2"\); the later one is kept/);
        expect(Array.from(snapshot.edgeList().weights ?? [])).toEqual([7]);
        expect(snapshot.nodes.require("k").meta.default).toBe(2);
    });

    it("graphml-unchecked-attributes-on-other-elements: unknown attributes on key, data, default, port, hyperedge, endpoint and the root are reported", async () => {
        const doc = `<graphml xmlns="${GRAPHML_NS}" vendor="1"><key id="d" for="node" attr.name="d" attr.type="string" yfiles.foldertype="group"><default note="x">v</default></key><graph edgedefault="undirected"><node id="a"><data key="d" foo="1">x</data><port name="p" color="red"/></node><node id="b"/><hyperedge id="h" weight="2"><endpoint node="a" port="p"/><endpoint node="b"/></hyperedge></graph></graphml>`;
        const { snapshot, report } = await load("graphml", doc, { hyperedges: "clique" });
        expect(issuesOf(report, GRAPHML_ISSUE.UNKNOWN_XML_ATTRIBUTE).map((i) => i.element)).toEqual([
            "vendor",
            "yfiles.foldertype",
            "note",
            "foo",
            "color",
            "weight",
            "port",
        ]);
        expect(issuesOf(report, GRAPHML_ISSUE.UNKNOWN_XML_ATTRIBUTE)[6].message).toBe(
            "the <endpoint> attribute port is not kept",
        );
        expect(snapshot.nodes.value("d", 0)).toBe("x");
        expect(snapshot.edgeCount).toBe(1);
    });
});

describe("GraphML hints, descriptions and limits", () => {
    it("graphml-parse-hint-mismatch: a disagreeing parse.nodes / parse.edges hint is W_COUNT_MISMATCH; an impossible one W_COUNT_HINT", async () => {
        const mismatch = await load(
            "graphml",
            graphml(
                `<node id="a"/><edge source="a" target="a"/><edge source="a" target="a"/><edge source="a" target="a"/>`,
                "",
                ` parse.nodes="5" parse.edges="0"`,
            ),
        );
        expect(codes(mismatch.report)).toEqual([GRAPHML_ISSUE.COUNT_MISMATCH, GRAPHML_ISSUE.COUNT_MISMATCH]);
        expect(mismatch.report.issues.map((i) => i.element)).toEqual(["parse.nodes", "parse.edges"]);
        expect(mismatch.report.issues[0].message).toMatch(/parse.nodes="5".*holds 1/);
        expect(mismatch.snapshot.edgeCount).toBe(3);
        const huge = await load(
            "graphml",
            graphml(`<node id="a"/>`, "", ` parse.nodes="99999999999" parse.edges="-1"`),
        );
        expect(codes(huge.report)).toEqual([GRAPHML_ISSUE.COUNT_HINT, GRAPHML_ISSUE.COUNT_HINT]);
    });

    it("graphml-desc-silently-dropped: a nested graph's desc, a hyperedge's desc and a second graph description are reported", async () => {
        const nested = await load(
            "graphml",
            graphml(
                `<node id="a"><graph id="a:" edgedefault="directed"><desc>inner</desc><node id="b"/></graph></node>`,
            ),
        );
        expect(codes(nested.report)).toEqual([GRAPHML_ISSUE.DESC_DROPPED]);
        const hyper = await load(
            "graphml",
            undirected(
                `<node id="a"/><node id="b"/><hyperedge><desc>h</desc><endpoint node="a"/><endpoint node="b"/></hyperedge>`,
            ),
            { hyperedges: "clique" },
        );
        expect(codes(hyper.report)).toEqual([GRAPHML_ISSUE.DESC_DROPPED]);
        expect(hyper.snapshot.edgeCount).toBe(1);
        const twice = await load(
            "graphml",
            `<graphml xmlns="${GRAPHML_NS}"><desc>root text</desc><graph edgedefault="directed"><desc>graph text</desc><node id="a"/></graph></graphml>`,
        );
        expect(codes(twice.report)).toEqual([GRAPHML_ISSUE.DESC_DROPPED]);
        expect(twice.snapshot.meta.description).toBe("graph text");
    });

    it("graphml-second-top-level-graph-data: a second top-level graph's data and hints are reported, the first graph's value kept", async () => {
        const keys = `<key id="g" for="graph" attr.name="gname" attr.type="string"/>`;
        const doc = `<graphml xmlns="${GRAPHML_NS}">${keys}<graph edgedefault="directed"><data key="g">first</data><node id="a"/></graph><graph edgedefault="directed" parse.nodes="1"><data key="g">second</data><node id="b"/></graph></graphml>`;
        const { snapshot, report } = await load("graphml", doc);
        expect(codes(report)).toEqual([
            GRAPHML_ISSUE.MULTIPLE_GRAPHS,
            GRAPHML_ISSUE.PARSE_HINT_IGNORED,
            GRAPHML_ISSUE.NESTED_GRAPH_DATA,
        ]);
        expect(report.issues[2].message).toMatch(/second top-level <graph>/);
        expect(snapshot.graph.value("gname", 0)).toBe("first");
        expect(snapshot.nodeCount).toBe(2);
    });

    it("graphml-nested-edgedefault-missing-unbounded: 2,000 nested graphs without edgedefault give one warning", async () => {
        const body = Array.from(
            { length: 2000 },
            (_, i) => `<node id="p${i}"><graph><node id="c${i}"/></graph></node>`,
        ).join("");
        const { snapshot, report } = await load("graphml", graphml(body));
        expect(snapshot.nodeCount).toBe(4000);
        expect(codes(report)).toEqual([GRAPHML_ISSUE.EDGEDEFAULT_MISSING]);
        expect(report.issues[0].message).toMatch(/nested <graph>/);
    });
});

describe("GraphML ports", () => {
    it("graphml-undeclared-port-reference: a sourceport / targetport naming a port its node lacks is reported once with the count", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"><port name="p1"><port name="inner"/></port></node><node id="b"/><edge source="a" target="b" sourceport="p1" targetport="zz"/><edge source="a" target="b" sourceport="inner"/><edge source="b" target="a" sourceport="q"/>`,
            ),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.PORT_DECLARATION, GRAPHML_ISSUE.DANGLING_REFERENCE]);
        expect(report.issues[1].message).toMatch(/^2 edge port reference\(s\).*first: b:zz/);
        expect(snapshot.edges.value("sourceport", 0)).toBe("p1");
        expect(snapshot.edges.value("targetport", 0)).toBe("zz");
    });

    it("graphml-graph-inside-edge: a graph held by an edge is dropped with a named issue and its nodes counted as skipped", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(
                `<node id="a"/><node id="b"/><edge source="a" target="b"><graph edgedefault="directed"><node id="c"><data key="x">t</data></node><node id="d"/><edge source="c" target="d"/></graph></edge>`,
            ),
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.EDGE_GRAPH_DROPPED]);
        expect(report.counts).toMatchObject({ nodes: 2, edges: 1, skippedNodes: 2, skippedEdges: 1 });
        expect(ids({ snapshot })).toEqual(["a", "b"]);
    });
});

describe("GraphML hyperedges", () => {
    const two = `<node id="a"/><node id="b"/>`;
    // an undirected graph, so an undirected expansion is one edge (in a directed one it is a pair)
    const graphml = (body: string): string => undirected(body);

    it("graphml-hyperedge-degenerate: a hyperedge without endpoints is an error and skipped; one endpoint under star is a hub and one edge", async () => {
        const empty = await load("graphml", graphml(`${two}<hyperedge id="h"/>`), { hyperedges: "star" });
        expect(codes(empty.report)).toEqual([GRAPHML_ISSUE.HYPEREDGE_ENDPOINT]);
        expect(empty.report.counts).toMatchObject({ nodes: 2, edges: 0, skippedEdges: 1 });
        // corrected expectation: a one-endpoint star is a legal expansion (the hub joined to its endpoint)
        const one = await load("graphml", graphml(`${two}<hyperedge id="h"><endpoint node="a"/></hyperedge>`), {
            hyperedges: "star",
        });
        expect(one.report.issues).toEqual([]);
        expect(one.snapshot.nodeCount).toBe(3);
        expect(one.snapshot.edgeCount).toBe(1);
    });

    it("graphml-clique-yields-no-edges: a clique of same-direction endpoints is reported and counted as skipped", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(`${two}<hyperedge id="h"><endpoint node="a" type="in"/><endpoint node="b" type="in"/></hyperedge>`),
            { hyperedges: "clique" },
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.HYPEREDGE_ENDPOINT]);
        expect(report.issues[0].message).toMatch(/yields no edge/);
        expect(report.counts.skippedEdges).toBe(1);
        expect(snapshot.edgeCount).toBe(0);
    });

    it("graphml-hyperedge-bypasses-addmissingnodes: an undeclared endpoint is E_UNKNOWN_NODE under addMissingNodes false, and counted when created", async () => {
        const hyper = `<hyperedge id="h"><endpoint node="a"/><endpoint node="zz"/></hyperedge>`;
        for (const hyperedges of ["star", "clique"] as const) {
            const strict = await load("graphml", graphml(`${two}${hyper}`), { hyperedges, addMissingNodes: false });
            expect(codes(strict.report), hyperedges).toEqual([GRAPHML_ISSUE.UNKNOWN_NODE]);
            expect(strict.snapshot.edgeCount, hyperedges).toBe(0);
            expect(ids(strict), hyperedges).toEqual(["a", "b"]);
            const lenient = await load("graphml", graphml(`${two}${hyper}`), { hyperedges });
            expect(lenient.report.issues, hyperedges).toEqual([]);
            expect(lenient.report.counts.nodes, hyperedges).toBe(lenient.snapshot.nodeCount);
        }
        // a forward reference is legal: the endpoint declared after the hyperedge
        const forward = await load("graphml", graphml(`<node id="a"/>${hyper}<node id="zz"/>`), {
            hyperedges: "clique",
            addMissingNodes: false,
        });
        expect(forward.report.issues).toEqual([]);
        expect(forward.snapshot.edgeCount).toBe(1);
    });

    it("graphml-star-hub-collides-with-later-node: a node with a hub's id is reported as a hub clash, not as a duplicate", async () => {
        const { snapshot, report } = await load(
            "graphml",
            graphml(`${two}<hyperedge id="h"><endpoint node="a"/><endpoint node="b"/></hyperedge><node id="h"/>`),
            { hyperedges: "star" },
        );
        expect(codes(report)).toEqual([GRAPHML_ISSUE.HUB_ID_CLASH]);
        expect(snapshot.nodeCount).toBe(3);
        expect(snapshot.edgeCount).toBe(2);
    });
});

describe("GraphML yFiles graphics", () => {
    it("graphml-yfiles-bad-geometry: a geometry value that is not a number is reported per field; the tree is kept", async () => {
        const keys = `<key id="g" for="node" yfiles.type="nodegraphics"/>`;
        const node = `<node id="a"><data key="g"><y:ShapeNode xmlns:y="http://www.yworks.com/xml/graphml"><y:Geometry x="abc" y="NaN" width="-5" height="10"/></y:ShapeNode></data></node>`;
        const { snapshot, report } = await load("graphml", graphml(node, keys));
        expect(codes(report)).toEqual([GRAPHML_ISSUE.YFILES_VALUE, GRAPHML_ISSUE.YFILES_VALUE]);
        expect(report.issues.map((i) => i.message)).toEqual([
            "a yFiles node x that is not a number is not mapped to its yfiles column (the graphics tree is kept)",
            "a yFiles node y that is not a number is not mapped to its yfiles column (the graphics tree is kept)",
        ]);
        expect(snapshot.nodes.value("yfiles.width", 0)).toBe(-5);
        expect(snapshot.nodes.get("yfiles.position")).toBeNull();
        expect(snapshot.nodes.value("g", 0)).toBeTypeOf("object");
    });
});
