import { GraphBuilder, type GraphBuilderOptions, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { XGMML_ISSUE } from "../../../src/formats/xgmml/constants.js";
import { xgmmlImporter, type XgmmlImportOptions } from "../../../src/formats/xgmml/importer.js";
import { importGraph, listGraphs } from "../../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../../src/types.js";
import { byteStream, textChunksOf } from "../../helpers/corpus.js";

type Options = XgmmlImportOptions & CommonImportOptions;

interface Loaded {
    readonly snapshot: GraphSnapshot;
    readonly report: ImportReport;
}

async function load(
    input: ImportInput,
    options?: Options,
    builder: Partial<GraphBuilderOptions> = {},
): Promise<Loaded> {
    const sink = new GraphBuilder({ directed: false, weightDtype: "f64", ...builder });
    const report = await xgmmlImporter.import(input, sink, options);
    return { snapshot: sink.freeze(), report };
}

async function failure(input: ImportInput, options?: Options): Promise<ImportError> {
    try {
        await load(input, options);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return err as ImportError;
    }
    throw new Error("expected an ImportError");
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function cell(snapshot: GraphSnapshot, table: "nodes" | "edges", name: string, id: string | number): unknown {
    const column = snapshot[table].get(name);
    if (column === null) {
        throw new Error(`no ${table} column ${name}`);
    }
    const index = table === "nodes" ? snapshot.ids.indexOf(id) : Number(id);
    if (index === INVALID_INDEX) {
        throw new Error(`no node ${String(id)}`);
    }
    if (!column.isSet(index)) {
        return undefined;
    }
    const value = column.value(index);
    return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : value;
}

function graphValue(snapshot: GraphSnapshot, name: string): unknown {
    const column = snapshot.graph.get(name);
    return column === null || !column.isSet(0) ? undefined : column.value(0);
}

const NS =
    'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"';

function cy3(body: string, root = 'id="1" label="Net" directed="1" cy:documentVersion="3.0"'): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<graph ${root} ${NS}>\n${body}\n</graph>\n`;
}

function draft(body: string, root = ""): string {
    return `<?xml version="1.0"?>\n<!DOCTYPE graph PUBLIC "-//John Punin//DTD graph description//EN" "http://www.cs.rpi.edu/~puninj/XGMML/xgmml.dtd">\n<graph id="1" label="D" ${root}>\n${body}\n</graph>\n`;
}

describe("xgmmlImporter facts and sniffing", () => {
    it("declares the format facts", () => {
        expect(xgmmlImporter.format).toBe("xgmml");
        expect(xgmmlImporter.extensions).toEqual([".xgmml", ".xml"]);
        expect(xgmmlImporter.mimeTypes).toEqual(["application/xgmml", "text/xgmml", "text/xgmml+xml"]);
    });

    it("scores the namespace or DOCTYPE 0.95, a bare graph root 0.5, anything else 0", () => {
        const enc = (t: string): Uint8Array => new TextEncoder().encode(t);
        const sniff = xgmmlImporter.sniff ?? ((): number => -1);
        expect(sniff(enc(cy3("")))).toBe(0.95);
        expect(sniff(enc(draft("")))).toBe(0.95);
        expect(sniff(enc("<!-- Database: 70 -->\n<graph label='x'>"))).toBe(0.5);
        expect(sniff(enc('<graph id="v" cy:view="1" xmlns="http://www.cs.rpi.edu/XGMML">'))).toBe(0.95);
        expect(sniff(enc('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'))).toBe(0);
        expect(sniff(enc('<gexf xmlns="http://gexf.net/1.3">'))).toBe(0);
        expect(sniff(enc('{"graph": "<graph>"}'))).toBe(0);
    });

    it("wins its own files through the registry, by name and by content, against GraphML and GEXF", async () => {
        const text = cy3('<node id="a" label="A"/>');
        const named = await importGraph(text, { filename: "x.xml" });
        expect(named.format).toBe("xgmml");
        const bare = await importGraph(text);
        expect(bare.format).toBe("xgmml");
    });
});

describe("xgmmlImporter nodes, edges and direction", () => {
    it("reads a Cytoscape 3 export: ids kept as strings, labels, edge ids, per-edge direction", async () => {
        const { snapshot, report } = await load(
            cy3(`
  <node id="1" label="A"/>
  <node id="01" label="B"/>
  <node id=" 1 " label="C"/>
  <edge id="e1" label="A (pp) B" source="1" target="01" cy:directed="1"/>
  <edge id="e2" label="B (pp) C" source="01" target=" 1 " cy:directed="0"/>`),
        );
        expect(snapshot.nodeCount).toBe(3);
        expect(snapshot.ids.indexOf("01")).not.toBe(INVALID_INDEX);
        expect(snapshot.ids.indexOf(" 1 ")).not.toBe(INVALID_INDEX);
        expect(cell(snapshot, "nodes", "label", "01")).toBe("B");
        expect(snapshot.nodes.byRole("label")?.meta.name).toBe("label");
        expect(snapshot.edges.byRole("id")?.meta.name).toBe("id");
        expect(snapshot.directed).toBe(true);
        expect(report.counts.expandedMixed).toBe(1);
        expect(report.errorCount).toBe(0);
    });

    it("follows the DTD: no root directed means undirected; directed=1 directed; defaultDirected overrides", async () => {
        const body = '<node id="a"/><node id="b"/><edge source="a" target="b"/>';
        expect((await load(draft(body))).snapshot.directed).toBe(false);
        expect((await load(draft(body, 'directed="1"'))).snapshot.directed).toBe(true);
        expect((await load(draft(body), { defaultDirected: true })).snapshot.directed).toBe(true);
    });

    it("accepts true / yes / no for directed with W_XGMML_BAD_DIRECTED and falls back on anything else", async () => {
        const body = '<node id="a"/><node id="b"/><edge source="a" target="b"/>';
        const yes = await load(draft(body, 'directed="true"'));
        expect(yes.snapshot.directed).toBe(true);
        expect(codes(yes.report)).toContain(XGMML_ISSUE.BAD_DIRECTED);
        const two = await load(draft(body, 'directed="2"'));
        expect(two.snapshot.directed).toBe(false);
        expect(codes(two.report)).toContain(XGMML_ISSUE.BAD_DIRECTED);
        const edge = await load(cy3('<node id="a"/><node id="b"/><edge source="a" target="b" cy:directed="maybe"/>'));
        expect(codes(edge.report)).toContain(XGMML_ISSUE.BAD_DIRECTED);
        expect(edge.snapshot.directed).toBe(true);
    });

    it("keeps self-loops and parallel edges; weight is THE weight and 0 is a real weight", async () => {
        const { snapshot } = await load(
            draft(
                '<node id="1"/><node id="3"/><edge source="1" target="1" weight="0"/><edge source="1" target="3" weight="2.5"/><edge source="1" target="3" weight="0"/>',
            ),
        );
        expect(snapshot.edgeCount).toBe(3);
        expect(snapshot.weights === null ? [] : Array.from(snapshot.weights)).toContain(0);
        expect(snapshot.weights === null ? [] : Array.from(snapshot.weights)).toContain(2.5);
    });

    it("resolves an edge written before its nodes", async () => {
        const { snapshot, report } = await load(
            cy3('<edge source="-1" target="-2" cy:directed="1"/><node id="-1"/><node id="-2"/>'),
        );
        expect(snapshot.edgeCount).toBe(1);
        expect(report.errorCount).toBe(0);
    });

    it("reads a missing node id from the label, and skips a node with neither (E_MISSING_ID)", async () => {
        const { snapshot, report } = await load(
            draft('<node label="only"/><node><att name="x" value="1"/></node><node id="b"/>'),
        );
        expect(snapshot.ids.indexOf("only")).not.toBe(INVALID_INDEX);
        expect(snapshot.nodeCount).toBe(2);
        expect(codes(report)).toEqual(expect.arrayContaining([XGMML_ISSUE.ID_FROM_LABEL, XGMML_ISSUE.MISSING_ID]));
        expect(report.counts.skippedNodes).toBe(1);
    });

    it("merges a node declared twice (W_DUPLICATE_NODE): the later one fills unset values only", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a" label="A"><att name="x" value="1" type="integer"/></node>
<node id="a" label="A2"><att name="x" value="2" type="integer"/><att name="y" value="z" type="string"/></node>`),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toContain(XGMML_ISSUE.DUPLICATE_NODE);
        expect(cell(snapshot, "nodes", "x", "a")).toBe(1);
        expect(cell(snapshot, "nodes", "y", "a")).toBe("z");
        expect(cell(snapshot, "nodes", "label", "a")).toBe("A");
    });

    it("skips the second edge of a repeated id (E_DUPLICATE_EDGE_ID)", async () => {
        const { snapshot, report } = await load(
            cy3('<node id="a"/><node id="b"/><edge id="e" source="a" target="b"/><edge id="e" source="b" target="a"/>'),
        );
        expect(snapshot.edgeCount).toBe(1);
        expect(codes(report)).toContain(XGMML_ISSUE.DUPLICATE_EDGE_ID);
    });

    it("refuses a dangling endpoint by default (E_UNKNOWN_NODE) and adds it under addMissingNodes", async () => {
        const doc = cy3('<node id="a"/><edge source="a" target="ghost"/>');
        const refused = await load(doc);
        expect(refused.snapshot.edgeCount).toBe(0);
        expect(codes(refused.report)).toContain("E_UNKNOWN_NODE");
        const added = await load(doc, { addMissingNodes: true });
        expect(added.snapshot.nodeCount).toBe(2);
        expect(added.snapshot.edgeCount).toBe(1);
    });

    it("enforces addMissingNodes false through the registry's builder too", async () => {
        const result = await importGraph(cy3('<node id="a"/><edge source="a" target="ghost"/>'), { format: "xgmml" });
        expect(result.snapshot.edgeCount).toBe(0);
        expect(codes(result.report)).toContain("E_UNKNOWN_NODE");
    });

    it("resolves missing and unknown endpoints through Cytoscape label aliases, and fills the interaction", async () => {
        const doc = cy3(
            '<node id="1" label="A"/><node id="2" label="B"/><edge label="A (pp) B"/><edge label="1 (pd) 2" source="9"/>',
        );
        const { snapshot, report } = await load(doc);
        expect(snapshot.edgeCount).toBe(2);
        expect(codes(report)).toContain(XGMML_ISSUE.LABEL_ALIAS);
        expect(cell(snapshot, "edges", "interaction", 0)).toBe("pp");
        const off = await load(doc, { labelAliases: false });
        expect(off.snapshot.edgeCount).toBe(0);
        expect(codes(off.report)).toEqual(expect.arrayContaining([XGMML_ISSUE.MISSING_ENDPOINT, "E_UNKNOWN_NODE"]));
    });

    it("does not use aliases in a file without the Cytoscape namespace; a label with parentheses is just text", async () => {
        const { snapshot, report } = await load(draft('<node id="a" label="(e0-p-e6)"/><edge label="a (x) a"/>'));
        expect(snapshot.edgeCount).toBe(0);
        expect(codes(report)).toContain(XGMML_ISSUE.MISSING_ENDPOINT);
        expect(cell(snapshot, "nodes", "label", "a")).toBe("(e0-p-e6)");
    });
});

describe("xgmmlImporter attributes", () => {
    it("types atts by cy:type before type: Integer i32, Long f64 (declared long), Double, Boolean, String, List", async () => {
        const { snapshot, report } = await load(
            cy3(`<att type="boolean" name="net_att_1" value="1" cy:type="Boolean"/>
<att type="list" name="net_att_2" cy:type="List" cy:elementType="Integer"><att type="integer" value="5" cy:type="Integer"/></att>
<node id="-1" label="node1">
  <att type="string" name="s" value="node 1" cy:type="String"/>
  <att type="list" name="l" cy:type="List" cy:elementType="Long"><att type="integer" value="1" cy:type="Long"/></att>
  <att type="integer" name="i" value="40" cy:type="Integer"/>
  <att type="integer" name="g" value="1200" cy:type="Long"/>
  <att type="real" name="r" value="5.373E-8" cy:type="Double"/>
</node>`),
        );
        expect(report.errorCount).toBe(0);
        expect(snapshot.nodes.get("i")?.dtype).toBe("i32");
        expect(snapshot.nodes.get("g")?.dtype).toBe("f64");
        expect(snapshot.nodes.get("g")?.meta.origin?.type).toBe("long");
        expect(snapshot.nodes.get("r")?.dtype).toBe("f64");
        expect(cell(snapshot, "nodes", "r", "-1")).toBeCloseTo(5.373e-8);
        expect(snapshot.nodes.get("l")?.meta.itemDtype).toBe("f64");
        expect(cell(snapshot, "nodes", "l", "-1")).toEqual([1]);
        expect(graphValue(snapshot, "net_att_1")).toBe(true);
        expect(Array.from(graphValue(snapshot, "net_att_2") as number[])).toEqual([5]);
    });

    it("widens an integer that overflows i32 to f64 (W_WIDENED); 1e400 is Infinity with W_PRECISION", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a"><att type="integer" name="n" value="2147483648"/><att type="real" name="r" value="1e400"/></node>
<node id="b"><att type="integer" name="n" value="1"/><att type="real" name="r" value="-Infinity"/></node>`),
        );
        expect(snapshot.nodes.get("n")?.dtype).toBe("f64");
        expect(cell(snapshot, "nodes", "n", "a")).toBe(2147483648);
        expect(cell(snapshot, "nodes", "r", "a")).toBe(Number.POSITIVE_INFINITY);
        expect(cell(snapshot, "nodes", "r", "b")).toBe(Number.NEGATIVE_INFINITY);
        expect(codes(report)).toEqual(expect.arrayContaining([XGMML_ISSUE.WIDENED, XGMML_ISSUE.PRECISION]));
    });

    it("records E_BAD_VALUE for values that do not parse (Java-only forms included) and leaves the cell unset", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a"><att type="integer" name="i" value="abc"/><att type="real" name="r" value="1.0d"/><att type="real" name="h" value="0x1p3"/><att type="boolean" name="b" value="2"/></node>
<node id="b"><att type="integer" name="i" value=" 5 "/><att type="real" name="r" value="NaN"/><att type="boolean" name="b" value="YES"/></node>`),
        );
        expect(codes(report).filter((c) => c === XGMML_ISSUE.BAD_VALUE)).toHaveLength(4);
        expect(cell(snapshot, "nodes", "i", "a")).toBeUndefined();
        expect(cell(snapshot, "nodes", "i", "b")).toBe(5);
        expect(cell(snapshot, "nodes", "r", "b")).toBeNaN();
        expect(cell(snapshot, "nodes", "b", "b")).toBe(true);
        // NaN is a double exactly; only a finite spelling that overflows loses precision
        expect(codes(report)).not.toContain(XGMML_ISSUE.PRECISION);
    });

    it("widens disagreeing declared types per 5.1 with W_WIDENED: int and real to f64, number and string to string", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a"><att type="integer" name="x" value="1"/><att type="integer" name="y" value="7"/></node>
<node id="b"><att type="real" name="x" value="2.5"/><att type="string" name="y" value="seven"/></node>`),
        );
        expect(snapshot.nodes.get("x")?.dtype).toBe("f64");
        expect(["string", "dict"]).toContain(snapshot.nodes.get("y")?.dtype);
        expect(cell(snapshot, "nodes", "y", "a")).toBe("7");
        expect(codes(report)).toContain(XGMML_ISSUE.WIDENED);
    });

    it("leaves a value-less att unset but declares its column", async () => {
        const { snapshot } = await load(cy3('<node id="a"><att type="real" name="r"/></node>'));
        expect(snapshot.nodes.get("r")?.dtype).toBe("f64");
        expect(cell(snapshot, "nodes", "r", "a")).toBeUndefined();
    });

    it("reads Cytoscape's list cases: no type and no items, a typed empty list, a child without value, an empty string", async () => {
        const { snapshot, report } = await load(
            cy3(`<att type="list" name="null_value_list"/>
<att type="list" name="empty_list_1" cy:elementType="String"/>
<att type="list" name="empty_list_2"><att type="string"/></att>
<att type="list" name="list_with_empty_string"><att type="string" value=""/></att>
<att type="list" name="int_list"><att type="integer" value="1"/><att type="integer" value="2"/></att>`),
        );
        expect(Array.from(graphValue(snapshot, "null_value_list") as string[])).toEqual([]);
        expect(codes(report)).toContain(XGMML_ISSUE.EMPTY_LIST_TYPE);
        expect(Array.from(graphValue(snapshot, "empty_list_1") as string[])).toEqual([]);
        expect(Array.from(graphValue(snapshot, "empty_list_2") as string[])).toEqual([]);
        expect(Array.from(graphValue(snapshot, "list_with_empty_string") as string[])).toEqual([""]);
        expect(Array.from(graphValue(snapshot, "int_list") as number[])).toEqual([1, 2]);
    });

    it("widens mixed list child types and keeps a record list, a list of lists and a 2.x map as json (W_XGMML_RECORD_LIST)", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a">
  <att type="list" name="mixed"><att type="integer" value="1"/><att type="string" value="x"/></att>
  <att type="list" name="person"><att name="name" type="string" value="J"/><att name="ssn" type="string" value="1"/></att>
  <att type="list" name="lol"><att type="list"><att type="integer" value="1"/></att><att type="list"><att type="integer" value="2"/></att></att>
  <att type="map" name="m"><att name="k" type="string" value="v"/></att>
</node>`),
        );
        expect(cell(snapshot, "nodes", "mixed", "a")).toEqual(["1", "x"]);
        expect(cell(snapshot, "nodes", "person", "a")).toEqual({ name: "J", ssn: "1" });
        expect(cell(snapshot, "nodes", "lol", "a")).toEqual([["1"], ["2"]]);
        expect(cell(snapshot, "nodes", "m", "a")).toEqual({ k: "v" });
        expect(codes(report)).toContain(XGMML_ISSUE.RECORD_LIST);
    });

    it("keeps foreign XML inside a node att as a json string", async () => {
        const { snapshot, report } = await load(
            draft(
                '<node id="a"><att name="card"><rdf:RDF xmlns:rdf="r"><rdf:Description about="x">t &amp; u</rdf:Description></rdf:RDF></att></node>',
            ),
        );
        expect(cell(snapshot, "nodes", "card", "a")).toBe(
            '<rdf:RDF xmlns:rdf="r"><rdf:Description about="x">t &amp; u</rdf:Description></rdf:RDF>',
        );
        expect(codes(report)).toContain(XGMML_ISSUE.RECORD_LIST);
    });

    it("reports malformed atts once per kind (W_XGMML_BAD_ATT): list with value, scalar with children, no name", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a">
  <att type="list" name="l" value="ignored"><att type="string" value="x"/></att>
  <att type="string" name="s" value="v"><att type="string" value="child"/></att>
  <att type="string" value="nameless"/>
</node>`),
        );
        expect(cell(snapshot, "nodes", "l", "a")).toEqual(["x"]);
        expect(cell(snapshot, "nodes", "s", "a")).toBe("v");
        expect(codes(report).filter((c) => c === XGMML_ISSUE.BAD_ATT)).toHaveLength(3);
    });

    it("marks cy:hidden columns (1, true, yes in any case), keeps equations as text, flags .SUID references", async () => {
        const { snapshot, report } = await load(
            cy3(`<node id="a">
  <att type="string" name="_private" value="v" cy:hidden="TRUE"/>
  <att type="string" name="visible" value="v" cy:hidden="0"/>
  <att type="string" name="f" value="=ABS($x)" cy:equation="1"/>
  <att type="integer" name="other_node.SUID" value="21"/>
</node>`),
        );
        expect(snapshot.nodes.get("_private")?.meta.extra.hidden).toBe(true);
        expect(snapshot.nodes.get("visible")?.meta.extra.hidden).toBeUndefined();
        expect(cell(snapshot, "nodes", "f", "a")).toBe("=ABS($x)");
        expect(codes(report)).toContain(XGMML_ISSUE.EQUATION_AS_TEXT);
        expect(snapshot.nodes.get("other_node.SUID")?.meta.extra.suidReference).toBe(true);
        expect(snapshot.nodes.get("other_node.SUID")?.dtype).toBe("f64");
    });

    it("decodes Cytoscape's \\n and \\t escapes in Cytoscape files only (option cytoscapeEscapes)", async () => {
        const att = '<node id="a"><att type="string" name="t" value="a\\nb\\tc"/></node>';
        expect(cell((await load(cy3(att))).snapshot, "nodes", "t", "a")).toBe("a\nb\tc");
        expect(cell((await load(draft(att))).snapshot, "nodes", "t", "a")).toBe("a\\nb\\tc");
        expect(cell((await load(cy3(att), { cytoscapeEscapes: false })).snapshot, "nodes", "t", "a")).toBe("a\\nb\\tc");
    });

    it("reports an unknown att type (kept as text) and a repeated att on one element (later wins)", async () => {
        const { snapshot, report } = await load(
            cy3(
                '<node id="a"><att type="float" name="f" value="1.5"/><att type="string" name="d" value="1"/><att type="string" name="d" value="2"/></node>',
            ),
        );
        expect(cell(snapshot, "nodes", "f", "a")).toBe("1.5");
        expect(cell(snapshot, "nodes", "d", "a")).toBe("2");
        expect(codes(report)).toEqual(
            expect.arrayContaining([XGMML_ISSUE.UNKNOWN_ATTR_TYPE, XGMML_ISSUE.DUPLICATE_ATTRIBUTE]),
        );
    });

    it("keeps other node XML attributes as text-grammar columns and @name beside a label as a name column", async () => {
        const { snapshot } = await load(draft('<node id="a" label="A" name="base" weight="-1" labelanchor="c"/>'));
        expect(cell(snapshot, "nodes", "name", "a")).toBe("base");
        expect(cell(snapshot, "nodes", "weight", "a")).toBe(-1);
        expect(cell(snapshot, "nodes", "labelanchor", "a")).toBe("c");
    });

    it("renames an att that collides with a fixed column (W_COLUMN_RENAMED)", async () => {
        const { snapshot, report } = await load(
            cy3('<node id="a" label="A"><att type="string" name="label" value="other"/></node>'),
        );
        expect(cell(snapshot, "nodes", "label", "a")).toBe("A");
        expect(snapshot.nodes.names()).toContain("label#2");
        expect(codes(report)).toContain(XGMML_ISSUE.COLUMN_RENAMED);
    });
});

describe("xgmmlImporter graph metadata and graphics", () => {
    it("reads RDF metadata into the graph meta, documentVersion into sourceVersion, graph atts into columns", async () => {
        const result = await importGraph(
            `<?xml version='1.0'?>
<graph id="Yeast (gal)" ${NS}>
  <att name="documentVersion" value="1.0"/>
  <att name="networkMetadata"><rdf:RDF><rdf:Description rdf:about="http://www.cytoscape.org/"><dc:title>Yeast</dc:title><dc:description>about</dc:description><dc:date>2006-05-31 15:02:11</dc:date></rdf:Description></rdf:RDF></att>
  <att name="backgroundColor" value="#9999ff"/>
  <att label="GRAPH_VIEW_ZOOM" name="GRAPH_VIEW_ZOOM" value="1.06" type="real"/>
</graph>`,
            { format: "xgmml" },
        );
        const { meta } = result.snapshot;
        expect(meta.name).toBe("Yeast");
        expect(meta.description).toBe("about");
        expect(meta.created).toBe("2006-05-31 15:02:11");
        expect(meta.sourceFormat).toBe("xgmml");
        expect(meta.sourceVersion).toBe("1.0");
        expect(graphValue(result.snapshot, "backgroundColor")).toBe("#9999ff");
        expect(graphValue(result.snapshot, "GRAPH_VIEW_ZOOM")).toBeCloseTo(1.06);
        expect(result.snapshot.graph.get("documentVersion")).toBeNull();
    });

    it("warns about an unparseable documentVersion", async () => {
        const { report } = await load(cy3("", 'cy:documentVersion="3.x"'));
        expect(codes(report)).toContain(XGMML_ISSUE.DOCUMENT_VERSION);
    });

    it("stores positions y-up in an f32 x3 column, z in its own column, graphics as json without x y z", async () => {
        const { snapshot } = await load(
            cy3(`<node id="a"><graphics type="ELLIPSE" x="10" y="20" z="3" fill="#fff"><att name="NODE_LABEL" value="A" type="string"/><att name="lockedVisualProperties" type="list"><att name="NODE_SHAPE" value="TRIANGLE" type="string"/><att name="NODE_SIZE" value="9" type="string"/></att></graphics></node>
<node id="b"><graphics x="0" y="0"/></node>
<graphics><att name="NETWORK_SCALE_FACTOR" value="0.67" type="string"/></graphics>`),
        );
        const position = snapshot.nodes.byRole("position");
        expect(position?.meta.name).toBe("position");
        expect(position?.dtype).toBe("f32");
        expect(position?.meta.extra).toMatchObject({ sourceDims: 2, units: "file" });
        expect(cell(snapshot, "nodes", "position", "a")).toEqual([10, -20, 0]);
        expect(Object.is((cell(snapshot, "nodes", "position", "b") as number[])[1], 0)).toBe(true);
        expect(cell(snapshot, "nodes", "z", "a")).toBe(3);
        expect(cell(snapshot, "nodes", "graphics", "a")).toEqual({
            type: "ELLIPSE",
            fill: "#fff",
            NODE_LABEL: "A",
            lockedVisualProperties: { NODE_SHAPE: "TRIANGLE", NODE_SIZE: "9" },
        });
        expect(graphValue(snapshot, "graphics")).toEqual({ NETWORK_SCALE_FACTOR: "0.67" });
    });

    it("puts z into the position in the draft dialect and under zAs position; reads <center> and <Line>", async () => {
        const drafted = await load(
            draft(
                '<node id="a"><graphics type="rhombus"><center x="1" y="2" z="3"/></graphics></node><node id="b"/><edge source="a" target="b"><graphics><Line><point x="1" y="2"/><point x="3" y="4"/></Line></graphics></edge>',
            ),
        );
        expect(cell(drafted.snapshot, "nodes", "position", "a")).toEqual([1, -2, 3]);
        expect(drafted.snapshot.nodes.byRole("position")?.meta.extra.sourceDims).toBe(3);
        expect(cell(drafted.snapshot, "edges", "graphics", 0)).toEqual({
            Line: [
                { x: "1", y: "2" },
                { x: "3", y: "4" },
            ],
        });
        const zAs = await load(cy3('<node id="a"><graphics x="1" y="2" z="5"/></node>'), { zAs: "position" });
        expect(cell(zAs.snapshot, "nodes", "position", "a")).toEqual([1, -2, 5]);
        expect(zAs.snapshot.nodes.get("z")).toBeNull();
    });

    it("merges two graphics elements key by key, later wins; keeps 2.x cy: graphics and nested graphics atts", async () => {
        const { snapshot } = await load(
            cy3(`<node id="a"><graphics x="1" y="1" fill="#000" cy:nodeTransparency="0.5"/><graphics y="2" fill="#111"><att name="cytoscapeNodeGraphicsAttributes"><att name="nodeLabelFont" value="Default-0-12"/></att></graphics></node>
<edge source="a" target="a"><graphics width="2"><att name="edgeBend"><att name="handle" x="1" y="2"/><att name="handle" x="3" y="4"/></att></graphics></edge>`),
        );
        expect(cell(snapshot, "nodes", "position", "a")).toEqual([1, -2, 0]);
        expect(cell(snapshot, "nodes", "graphics", "a")).toEqual({
            fill: "#111",
            "cy:nodeTransparency": "0.5",
            cytoscapeNodeGraphicsAttributes: { nodeLabelFont: "Default-0-12" },
        });
        expect(cell(snapshot, "edges", "graphics", 0)).toEqual({
            width: "2",
            edgeBend: [
                { x: "1", y: "2" },
                { x: "3", y: "4" },
            ],
        });
    });
});

describe("xgmmlImporter nested graphs", () => {
    const groups2x = `<?xml version="1.0"?>
<graph label="Network 0" ${NS} directed="1">
  <att name="documentVersion" value="1.1"/>
  <node label="node0" id="-1"/>
  <node label="node1" id="-2"/>
  <node label="node2" id="-3"/>
  <node label="metanode 1" id="-4">
    <att type="integer" name="__groupState" value="1" cy:hidden="true"/>
    <att><graph><att type="string" name="gr_att_1" value="Lorem Ipsum"/>
      <node xlink:href="#-2"/><node xlink:href="#-1"/>
      <edge label="node0 (DirectedEdge) node1" source="-1" target="-2"/>
      <edge label="node1 (DirectedEdge) node2" source="-2" target="-3"/>
    </graph></att>
  </node>
  <edge label="node0 (DirectedEdge) node1" source="-1" target="-2"/>
  <edge label="node1 (DirectedEdge) node2" source="-2" target="-3"/>
</graph>`;

    it("makes a 2.x group node the parent of its members and drops the 2.x writer's repeated edges", async () => {
        const { snapshot, report } = await load(groups2x);
        expect(snapshot.nodeCount).toBe(4);
        expect(snapshot.edgeCount).toBe(2);
        expect(codes(report)).toContain(XGMML_ISSUE.GROUP_DUPLICATE_EDGE);
        expect(snapshot.nodes.byRole("parent")?.meta.name).toBe("parent");
        expect(cell(snapshot, "nodes", "parent", "-1")).toBe(snapshot.ids.indexOf("-4"));
        expect(cell(snapshot, "nodes", "xgmml.subgraph", "-4")).toEqual({
            id: null,
            label: null,
            atts: { gr_att_1: "Lorem Ipsum" },
        });
    });

    it("treats every node-nested graph of the draft dialect as a subgraph, with cross-level edges at the root", async () => {
        const { snapshot } = await load(
            draft(
                '<node id="1"><att><graph><node id="11"/><node id="12"/></graph></att></node><node id="2"><att><graph><node id="21"/></graph></att></node><edge source="11" target="21"/>',
            ),
        );
        expect(snapshot.nodeCount).toBe(5);
        expect(cell(snapshot, "nodes", "parent", "21")).toBe(snapshot.ids.indexOf("2"));
        expect(snapshot.edgeCount).toBe(1);
    });

    it("gives a node in two groups the parents list, drops a membership that closes a cycle", async () => {
        const multi = await load(
            cy3(`<node id="g1"><att name="__isGroup" value="1" type="boolean"/><att><graph><node id="m"/></graph></att></node>
<node id="g2"><att name="__isGroup" value="true" type="boolean"/><att><graph><node xlink:href="#m"/></graph></att></node>`),
        );
        expect(multi.snapshot.nodes.byRole("parents")?.meta.name).toBe("parents");
        expect(cell(multi.snapshot, "nodes", "parents", "m")).toEqual([
            multi.snapshot.ids.indexOf("g1"),
            multi.snapshot.ids.indexOf("g2"),
        ]);
        const cycle = await load(
            draft(
                '<node id="a"><att><graph><node id="b"><att><graph><node xlink:href="#a"/></graph></att></node></graph></att></node>',
            ),
        );
        expect(codes(cycle.report)).toContain(XGMML_ISSUE.PARENT_CYCLE);
        const unknown = await load(draft('<node id="a"><att><graph><node xlink:href="#ghost"/></graph></att></node>'));
        expect(codes(unknown.report)).toContain(XGMML_ISSUE.UNKNOWN_PARENT);
    });

    it("reads a Cytoscape 3 nested graph that is not a group as a nested-network pointer, cycles included", async () => {
        const { snapshot, report } = await load(
            cy3(
                `<node id="1" label="Node 1"><att><graph id="10" label="Nb" cy:registered="1"><node id="6" label="Node 6"><att><graph xlink:href="#1root"/></att></node></graph></att></node>
<node id="2"><att><graph xlink:href="other.xgmml#223"/></att></node>
<node id="3"><att><graph xlink:href="#nowhere"/></att></node>`,
                'id="1root" label="Na" directed="1" cy:documentVersion="3.0"',
            ),
        );
        expect(snapshot.nodeCount).toBe(4);
        expect(snapshot.nodes.byRole("parent")).toBeNull();
        expect(cell(snapshot, "nodes", "cytoscape.nestedNetwork", "1")).toBe("Nb");
        expect(cell(snapshot, "nodes", "xgmml.networkPointer", "2")).toBe("other.xgmml#223");
        expect(codes(report)).toEqual(
            expect.arrayContaining([XGMML_ISSUE.CROSS_FILE_REFERENCE, XGMML_ISSUE.DANGLING_REFERENCE]),
        );
    });

    it("reports an xlink:href outside a group that names nothing (W_DANGLING_REFERENCE)", async () => {
        const { snapshot, report } = await load(
            draft('<node id="a"/><att><graph id="s"><node xlink:href="#ghost"/><edge xlink:href="#e9"/></graph></att>'),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toContain(XGMML_ISSUE.DANGLING_REFERENCE);
    });

    it("skips a graph nested in an edge att (W_XGMML_EDGE_NESTED_GRAPH)", async () => {
        const { snapshot, report } = await load(
            cy3('<node id="a"/><edge source="a" target="a"><att><graph><node id="hidden"/></graph></att></edge>'),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toContain(XGMML_ISSUE.EDGE_NESTED_GRAPH);
    });

    it("flattens a generic document's root-level subgraphs, with membership in xgmml.networks", async () => {
        const { snapshot } = await load(
            draft(
                '<att><graph id="s1"><node id="a"/></graph></att><node id="b"/><att><graph id="s2"><node xlink:href="#a"/><node xlink:href="#b"/></graph></att>',
            ),
        );
        expect(snapshot.nodeCount).toBe(2);
        expect(cell(snapshot, "nodes", "xgmml.networks", "a")).toEqual(["s1", "s2"]);
    });
});

describe("xgmmlImporter session network documents", () => {
    const session = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<graph id="155" label="Set 1" cy:view="0" cy:registered="0" cy:documentVersion="3.0" ${NS}>
  <att><graph id="171" label="Na" cy:registered="1">
      <node id="183" label="Node 1"><att><graph xlink:href="207-Set+2.xgmml#223"/></att></node>
      <node id="182" label="Node 2"/>
      <node id="181" label="Node 3"><att><graph xlink:href="#186"/></att></node>
      <edge id="185" label="Node 1 (interaction) Node 2" source="183" target="182" cy:directed="1"/>
      <edge id="184" label="Node 2 (interaction) Node 3" source="182" target="181" cy:directed="1"/>
  </graph></att>
  <att><graph id="186" label="Na.1" cy:registered="1">
      <node xlink:href="#181"/><node xlink:href="#182"/>
      <node id="196" label="Node 4"><att><graph xlink:href="#197"/></att></node>
      <edge xlink:href="#184"/>
  </graph></att>
  <att><graph id="197" label="Na.1.1" cy:registered="1"><node xlink:href="#196"/></graph></att>
  <edge id="900" label="meta" source="183" target="182" cy:directed="1"/>
</graph>`;

    it("lists the registered networks and reads the first by default (W_MULTIPLE_GRAPHS)", async () => {
        const listed = await xgmmlImporter.listGraphs?.(session);
        expect(listed).toEqual([
            { index: 0, name: "Na", nodes: 3, edges: 2 },
            { index: 1, name: "Na.1", nodes: 3, edges: 1 },
            { index: 2, name: "Na.1.1", nodes: 1, edges: 0 },
        ]);
        const { snapshot, report } = await load(session);
        expect(snapshot.nodeCount).toBe(3);
        expect(snapshot.edgeCount).toBe(2);
        expect(snapshot.meta.name).toBe("Na");
        expect(codes(report)).toEqual(
            expect.arrayContaining([XGMML_ISSUE.MULTIPLE_GRAPHS, XGMML_ISSUE.ROOT_ONLY_ELEMENTS]),
        );
        expect(cell(snapshot, "nodes", "cytoscape.nestedNetwork", "181")).toBe("Na.1");
    });

    it("reads a chosen network by graphName / graphIndex, references resolved; importAll reads each", async () => {
        const second = await load(session, { graphName: "Na.1" });
        expect(second.snapshot.nodeCount).toBe(3);
        expect(second.snapshot.edgeCount).toBe(1);
        expect(cell(second.snapshot, "nodes", "cytoscape.nestedNetwork", "196")).toBe("Na.1.1");
        const third = await load(session, { graphIndex: 2 });
        expect(third.snapshot.nodeCount).toBe(1);
        const err = await failure(session, { graphName: "nope" });
        expect(codes(err.report)).toContain(XGMML_ISSUE.GRAPH_NOT_FOUND);
        const sinks: GraphBuilder[] = [];
        const reports = await xgmmlImporter.importAll?.(session, () => {
            const b = new GraphBuilder({ directed: true });
            sinks.push(b);
            return b;
        });
        expect(reports).toHaveLength(3);
        expect(sinks.map((b) => b.freeze().nodeCount)).toEqual([3, 3, 1]);
    });

    it("lists through the registry", async () => {
        const listed = await listGraphs(session, { filename: "x.xgmml" });
        expect(listed?.map((g) => g.name)).toEqual(["Na", "Na.1", "Na.1.1"]);
    });

    it("refuses a session view document on its own (E_XGMML_VIEW_DOCUMENT)", async () => {
        const err = await failure(
            `<graph id="82" label="Na" cy:view="1" cy:networkId="52" ${NS}><node id="84" cy:nodeId="64"><graphics x="1" y="2"/></node></graph>`,
        );
        expect(codes(err.report)).toContain(XGMML_ISSUE.VIEW_DOCUMENT);
    });
});

describe("xgmmlImporter document-level errors and repairs", () => {
    it("fails on empty input (E_EMPTY_INPUT), truncated XML (E_XML_SYNTAX) and a non-graph root (E_NO_GRAPH)", async () => {
        expect(codes((await failure("   \n")).report)).toContain(XGMML_ISSUE.EMPTY_INPUT);
        expect(codes((await failure(cy3('<node id="a">').slice(0, -10))).report)).toContain(XGMML_ISSUE.XML_SYNTAX);
        const xhtml = await failure(
            '<html xmlns:xgmml="http://www.cs.rpi.edu/XGMML"><body><xgmml:graph/></body></html>',
        );
        expect(codes(xhtml.report)).toContain(XGMML_ISSUE.NO_GRAPH);
    });

    it("reads a root graph without namespace or DOCTYPE with W_XGMML_NO_NAMESPACE, and a prefixed root", async () => {
        const bare = await load('<graph label="x"><node id="a"/></graph>');
        expect(codes(bare.report)).toContain(XGMML_ISSUE.NO_NAMESPACE);
        const prefixed = await load(
            '<xgmml:graph xmlns:xgmml="http://www.cs.rpi.edu/XGMML"><xgmml:node id="a"/></xgmml:graph>',
        );
        expect(prefixed.snapshot.nodeCount).toBe(1);
        expect(codes(prefixed.report)).not.toContain(XGMML_ISSUE.NO_NAMESPACE);
    });

    it("skips unknown elements with their subtree, once per name", async () => {
        const { snapshot, report } = await load(cy3('<foo><node id="inside"/></foo><desc>x</desc><node id="a"/>'));
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report).filter((c) => c === XGMML_ISSUE.UNKNOWN_ELEMENT)).toHaveLength(2);
    });

    it("never expands DOCTYPE entities and never fetches an external one", async () => {
        const laughs = `<?xml version="1.0"?><!DOCTYPE graph [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;">]><graph><node id="&b;"/></graph>`;
        expect(codes((await failure(laughs)).report)).toContain(XGMML_ISSUE.XML_SYNTAX);
        const external = `<?xml version="1.0"?><!DOCTYPE graph SYSTEM "file:///etc/passwd"><graph><node id="a"/></graph>`;
        expect((await load(external)).snapshot.nodeCount).toBe(1);
    });

    it("repairs bare ampersands and pairs surrogate references only when asked, warning per repair", async () => {
        const amp = cy3(
            '<att type="string" name="&amp;net" value="&ABC"/><node id="a"><att type="string" name="x" value="CDE&"/></node>',
        );
        expect(codes((await failure(amp)).report)).toContain(XGMML_ISSUE.XML_SYNTAX);
        const repaired = await load(amp, { repairBareAmpersands: true });
        expect(codes(repaired.report).filter((c) => c === XGMML_ISSUE.AMPERSAND_REPAIRED)).toHaveLength(2);
        expect(cell(repaired.snapshot, "nodes", "x", "a")).toBe("CDE&");
        const smile = cy3('<node id="a" label="&#xd83d;&#xde00;"/>');
        expect(codes((await failure(smile)).report)).toContain(XGMML_ISSUE.XML_SYNTAX);
        const paired = await load(smile, { pairSurrogateReferences: true });
        expect(cell(paired.snapshot, "nodes", "label", "a")).toBe(String.fromCodePoint(0x1f600));
        expect(codes(paired.report)).toContain(XGMML_ISSUE.SURROGATE_PAIRED);
    });

    it("reads every input shape alike, honours the signal and reports progress", async () => {
        const text = cy3('<node id="a"/><node id="b"/><edge source="a" target="b"/>');
        const bytes = new TextEncoder().encode(text);
        for (const input of [text, bytes, byteStream(bytes, 7), textChunksOf(text, 5)]) {
            expect((await load(input)).snapshot.edgeCount).toBe(1);
        }
        const controller = new AbortController();
        controller.abort();
        await expect(load(text, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
        const progress: number[] = [];
        await load(bytes, { onProgress: (done) => progress.push(done) });
        expect(progress[progress.length - 1]).toBe(bytes.byteLength);
    });

    it("rejects bad option values with E_UNSUPPORTED", async () => {
        await expect(load(cy3(""), { zAs: "depth" as "column" })).rejects.toMatchObject({ code: "E_UNSUPPORTED" });
        await expect(load(cy3(""), { labelAliases: "yes" as unknown as boolean })).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
    });

    it("reads a Latin-1 document by its declaration and undeclared Latin-1 with W_ENCODING_FALLBACK", async () => {
        const latin = new Uint8Array([
            ...new TextEncoder().encode('<?xml version="1.0" encoding="ISO-8859-1"?><graph><node id="caf'),
            0xe9,
            ...new TextEncoder().encode('"/></graph>'),
        ]);
        expect((await load(latin)).snapshot.ids.indexOf(`caf${String.fromCharCode(0xe9)}`)).not.toBe(INVALID_INDEX);
        const undeclared = new Uint8Array([
            ...new TextEncoder().encode('<graph><node id="caf'),
            0xe9,
            ...new TextEncoder().encode('"/></graph>'),
        ]);
        expect(codes((await load(undeclared)).report)).toContain(XGMML_ISSUE.ENCODING_FALLBACK);
    });
});
