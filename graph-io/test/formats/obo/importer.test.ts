import { GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { OBO_ISSUE, oboImporter, type OboImportOptions } from "../../../src/formats/obo/importer.js";
import { importGraph } from "../../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../../src/types.js";
import { corpusFiles, inputShapes, malformedFiles, readCorpusBytes, readMalformedBytes } from "../../helpers/corpus.js";

type Options = OboImportOptions & CommonImportOptions;

async function load(
    input: ImportInput,
    options?: Options,
    builder?: GraphBuilder,
): Promise<{ snapshot: GraphSnapshot; report: ImportReport }> {
    const sink = builder ?? new GraphBuilder({ directed: true });
    const report = await oboImporter.import(input, sink, options);
    return { snapshot: sink.freeze(), report };
}

async function fails(input: ImportInput, options?: Options): Promise<ImportError> {
    try {
        await load(input, options);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return err as ImportError;
    }
    throw new Error("expected the import to throw ImportError");
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function ids(snapshot: GraphSnapshot): unknown[] {
    return Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i));
}

function cell(snapshot: GraphSnapshot, column: string, id: string): unknown {
    const col = snapshot.nodes.get(column);
    const index = snapshot.ids.indexOf(id);
    if (col === null || index < 0 || !col.isSet(index)) {
        return undefined;
    }
    const value = col.value(index);
    return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<unknown>) : value;
}

/** The edges as `source relation target` strings, in edge order. */
function edges(snapshot: GraphSnapshot): string[] {
    const list = snapshot.edgeList();
    const relation = snapshot.edges.get("relation");
    return Array.from({ length: snapshot.edgeCount }, (_, e) => {
        const r = relation?.isSet(e) === true ? String(relation.value(e)) : "?";
        return `${String(snapshot.ids.idOf(list.src[e]))} ${r} ${String(snapshot.ids.idOf(list.dst[e]))}`;
    });
}

function edgeCell(snapshot: GraphSnapshot, column: string, e: number): unknown {
    const col = snapshot.edges.get(column);
    return col?.isSet(e) === true ? col.value(e) : undefined;
}

const HEAD = "format-version: 1.4\nontology: test\n\n";

describe("oboImporter: frames, nodes and edges (design 4.2)", () => {
    it("reads Terms as nodes and is_a / relationship as directed child -> parent edges", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nname: a\n\n[Term]\nid: X:2\nname: b\nis_a: X:1 ! a\nrelationship: part_of X:1\n\n[Typedef]\nid: part_of\nname: part of\n`;
        const { snapshot, report } = await load(text);
        expect(report.issues).toEqual([]);
        expect(snapshot.directed).toBe(true);
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
        expect(edges(snapshot)).toEqual(["X:2 is_a X:1", "X:2 part_of X:1"]);
        expect(snapshot.nodes.byRole("label")?.meta.name).toBe("name");
        expect(snapshot.edges.byRole("kind")?.meta.name).toBe("relation");
        expect(snapshot.edges.get("relation")?.dtype).toBe("dict");
        expect(cell(snapshot, "type", "X:1")).toBe("Term");
        expect(report.counts).toMatchObject({ nodes: 2, edges: 2, skippedNodes: 0, skippedEdges: 0 });
        expect(snapshot.meta).toMatchObject({ name: "test", sourceFormat: "obo", sourceVersion: "1.4" });
        expect(snapshot.meta.extra).toEqual({
            obo: {
                header: { "format-version": ["1.4"], ontology: ["test"] },
                typedefs: { part_of: { id: ["part_of"], name: ["part of"] } },
            },
        });
    });

    it("maps every Term tag onto its column", async () => {
        const text = [
            "format-version: 1.2",
            "default-namespace: gene_ontology",
            'subsetdef: slim "a slim"',
            'synonymtypedef: UK_SPELLING "British"',
            "",
            "[Term]",
            "id: GO:1",
            "is_anonymous: false",
            "name: thing",
            "namespace: biological_process",
            "alt_id: GO:9",
            "alt_id: GO:8",
            'def: "A thing." [PMID:1, GOC:x "curator"]',
            "comment: note",
            "subset: slim",
            'synonym: "s1" EXACT []',
            'synonym: "s2" BROAD UK_SPELLING [A:1]',
            'xref: Wikipedia:Thing "a page"',
            "xref: EC:1.1",
            "builtin: true",
            'property_value: IAO:0000589 "label" xsd:string',
            "property_value: seeAlso X:2",
            "intersection_of: GO:2",
            "intersection_of: part_of GO:3",
            "union_of: GO:2",
            "union_of: GO:3",
            "equivalent_to: GO:4",
            "disjoint_from: GO:5",
            "created_by: someone",
            "creation_date: 2009-04-13T01:32:36Z",
            "",
            "[Term]",
            "id: GO:2",
            "",
        ].join("\n");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(cell(snapshot, "name", "GO:1")).toBe("thing");
        expect(cell(snapshot, "namespace", "GO:1")).toBe("biological_process");
        expect(cell(snapshot, "namespace", "GO:2")).toBe("gene_ontology");
        expect(cell(snapshot, "is_anonymous", "GO:1")).toBe(false);
        expect(cell(snapshot, "alt_id", "GO:1")).toEqual(["GO:9", "GO:8"]);
        expect(cell(snapshot, "def", "GO:1")).toBe("A thing.");
        expect(cell(snapshot, "def.xrefs", "GO:1")).toEqual(["PMID:1", "GOC:x"]);
        expect(cell(snapshot, "comment", "GO:1")).toBe("note");
        expect(cell(snapshot, "subset", "GO:1")).toEqual(["slim"]);
        expect(cell(snapshot, "synonym", "GO:1")).toEqual([
            { text: "s1", scope: "EXACT", type: null, xrefs: [] },
            { text: "s2", scope: "BROAD", type: "UK_SPELLING", xrefs: ["A:1"] },
        ]);
        expect(cell(snapshot, "xref", "GO:1")).toEqual(["Wikipedia:Thing", "EC:1.1"]);
        expect(cell(snapshot, "xref.descriptions", "GO:1")).toEqual({
            "Wikipedia:Thing": "a page",
            "GOC:x": "curator",
        });
        expect(cell(snapshot, "builtin", "GO:1")).toBe(true);
        expect(cell(snapshot, "property_value", "GO:1")).toEqual([
            { relation: "IAO:0000589", value: "label", datatype: "xsd:string" },
            { relation: "seeAlso", value: "X:2", datatype: null },
        ]);
        expect(cell(snapshot, "intersection_of", "GO:1")).toEqual([
            { relation: null, target: "GO:2" },
            { relation: "part_of", target: "GO:3" },
        ]);
        expect(cell(snapshot, "union_of", "GO:1")).toEqual(["GO:2", "GO:3"]);
        expect(cell(snapshot, "equivalent_to", "GO:1")).toEqual(["GO:4"]);
        expect(cell(snapshot, "disjoint_from", "GO:1")).toEqual(["GO:5"]);
        expect(cell(snapshot, "created_by", "GO:1")).toBe("someone");
        expect(cell(snapshot, "creation_date", "GO:1")).toBe("2009-04-13T01:32:36Z");
        // the logical axioms are columns, not edges (OBO Basic and OBO Graphs agree)
        expect(snapshot.edgeCount).toBe(0);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("reads Instance frames: instance_of is an edge, relationship too, property_value a column", async () => {
        const text = `${HEAD}[Term]\nid: C:1\n\n[Instance]\nid: I:1\nname: john\ninstance_of: C:1\nproperty_value: shoe_size "8" xsd:positiveInteger\nrelationship: knows I:2\n\n[Instance]\nid: I:2\ninstance_of: C:1\n\n[Typedef]\nid: knows\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(cell(snapshot, "type", "I:1")).toBe("Instance");
        expect(edges(snapshot)).toEqual(["I:1 instance_of C:1", "I:1 knows I:2", "I:2 instance_of C:1"]);
        expect(cell(snapshot, "property_value", "I:1")).toEqual([
            { relation: "shoe_size", value: "8", datatype: "xsd:positiveInteger" },
        ]);
    });

    it("keeps qualifiers on the edge and counts the same relation with other qualifiers as another edge", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:2 {is_inferred="true"}\nis_a: X:2\nrelationship: part_of X:2 {cardinality="2", gci_relation="part_of", gci_filler="T:1"} ! two\n\n[Term]\nid: X:2\n\n[Typedef]\nid: part_of\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(edges(snapshot)).toEqual(["X:1 is_a X:2", "X:1 is_a X:2", "X:1 part_of X:2"]);
        expect(edgeCell(snapshot, "qualifiers", 0)).toEqual({ is_inferred: "true" });
        expect(edgeCell(snapshot, "qualifiers", 1)).toBeUndefined();
        expect(edgeCell(snapshot, "qualifiers", 2)).toEqual({
            cardinality: "2",
            gci_relation: "part_of",
            gci_filler: "T:1",
        });
    });

    it("keeps self-loops, cycles and parallel relations; counts identical clauses once (spec 4.1.1)", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:1\nis_a: X:2\nis_a: X:2\nrelationship: part_of X:2\n\n[Term]\nid: X:2\nrelationship: has_part X:1\n\n[Typedef]\nid: part_of\n\n[Typedef]\nid: has_part\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(edges(snapshot)).toEqual(["X:1 is_a X:1", "X:1 is_a X:2", "X:1 part_of X:2", "X:2 has_part X:1"]);
    });

    it("merges two frames with one id: lists take the union, a single value keeps the first", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nname: a\nxref: A:1\nis_a: X:2\n\n[Term]\nid: X:1\nname: b\nxref: A:1\nxref: A:2\nis_a: X:2\nis_a: X:3\n\n[Term]\nid: X:2\n\n[Term]\nid: X:3\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([OBO_ISSUE.DUPLICATE_NODE, OBO_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(ids(snapshot)).toEqual(["X:1", "X:2", "X:3"]);
        expect(cell(snapshot, "name", "X:1")).toBe("a");
        expect(cell(snapshot, "xref", "X:1")).toEqual(["A:1", "A:2"]);
        expect(edges(snapshot)).toEqual(["X:1 is_a X:2", "X:1 is_a X:3"]);
        expect(report.issues[0]).toMatchObject({ category: "merged", element: "X:1", line: 10 });
    });

    it("keeps the first of a single-valued tag given twice and reports the tag once with its count", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nname: a\nname: b\ncomment: c1\ncomment: c2\n\n[Term]\nid: X:2\ncomment: d1\ncomment: d2\n`;
        const { snapshot, report } = await load(text);
        expect(cell(snapshot, "name", "X:1")).toBe("a");
        expect(cell(snapshot, "comment", "X:2")).toBe("d1");
        const dup = report.issues.filter((i) => i.code === OBO_ISSUE.DUPLICATE_ATTRIBUTE);
        expect(dup.map((i) => i.element)).toEqual(["name", "comment"]);
        expect(dup[1].message).toContain("2 time(s)");
    });

    it("leaves Typedefs as metadata by default and makes them nodes under typedefs: nodes", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nrelationship: part_of X:2\n\n[Term]\nid: X:2\n\n[Typedef]\nid: part_of\nname: part of\nis_transitive: true\ninverse_of: has_part\ntransitive_over: part_of\nholds_over_chain: part_of part_of\nequivalent_to_chain: part_of part_of\ndomain: X:1\nrange: X:2\nis_a: overlaps\nxref: BFO:0000050\nexpand_expression_to: "BFO_0000051 some ?Y" []\n\n[Typedef]\nid: has_part\n\n[Typedef]\nid: overlaps\n`;
        const meta = await load(text);
        expect(codes(meta.report)).toEqual([]);
        expect(ids(meta.snapshot)).toEqual(["X:1", "X:2"]);
        expect(meta.snapshot.meta.extra.obo).toMatchObject({
            typedefs: {
                part_of: { is_transitive: ["true"], holds_over_chain: ["part_of part_of"], is_a: ["overlaps"] },
                has_part: { id: ["has_part"] },
            },
        });
        const nodes = await load(text, { typedefs: "nodes" });
        expect(codes(nodes.report)).toEqual([]);
        expect(ids(nodes.snapshot)).toEqual(["X:1", "X:2", "part_of", "has_part", "overlaps"]);
        expect(cell(nodes.snapshot, "type", "part_of")).toBe("Typedef");
        expect(cell(nodes.snapshot, "is_transitive", "part_of")).toBe(true);
        expect(cell(nodes.snapshot, "inverse_of", "part_of")).toBe("has_part");
        expect(cell(nodes.snapshot, "transitive_over", "part_of")).toEqual(["part_of"]);
        expect(cell(nodes.snapshot, "holds_over_chain", "part_of")).toEqual([["part_of", "part_of"]]);
        expect(cell(nodes.snapshot, "domain", "part_of")).toBe("X:1");
        expect(cell(nodes.snapshot, "expand_expression_to", "part_of")).toEqual([
            { template: "BFO_0000051 some ?Y", xrefs: [] },
        ]);
        expect(edges(nodes.snapshot)).toEqual(["X:1 part_of X:2", "part_of is_a overlaps"]);
    });

    it("refuses an unknown value of its own options", async () => {
        await expect(load(HEAD, { typedefs: "edges" as "nodes" })).rejects.toBeInstanceOf(GraphFormatError);
        await expect(load(HEAD, { obsolete: "hide" as "drop" })).rejects.toBeInstanceOf(GraphFormatError);
    });
});

describe("oboImporter: obsolete terms (design 4.2)", () => {
    const text = `${HEAD}[Term]\nid: X:1\nis_obsolete: true\nreplaced_by: X:2\nconsider: X:3\n\n[Term]\nid: X:2\nis_a: X:3\n\n[Term]\nid: X:3\nis_a: X:1\n`;

    it("keeps obsolete terms with is_obsolete true and their edges", async () => {
        const { snapshot, report } = await load(text);
        expect(snapshot.nodeCount).toBe(3);
        expect(cell(snapshot, "is_obsolete", "X:1")).toBe(true);
        expect(cell(snapshot, "is_obsolete", "X:2")).toBeUndefined();
        expect(cell(snapshot, "replaced_by", "X:1")).toEqual(["X:2"]);
        expect(cell(snapshot, "consider", "X:1")).toEqual(["X:3"]);
        expect(codes(report)).toEqual([]);
    });

    it("drops them and their edges under obsolete: drop, saying how many", async () => {
        const { snapshot, report } = await load(text, { obsolete: "drop" });
        expect(ids(snapshot)).toEqual(["X:2", "X:3"]);
        expect(edges(snapshot)).toEqual(["X:2 is_a X:3"]);
        expect(codes(report)).toEqual([OBO_ISSUE.OBSOLETE_DROPPED]);
        expect(report.issues[0].message).toContain("1 obsolete term(s) and 1 edge(s)");
    });

    it("reports an obsolete term with is_a and replaced_by on a live term (1.2 guide, fastobo-validator)", async () => {
        const bad = `${HEAD}[Term]\nid: X:1\nis_obsolete: true\nis_a: X:2\n\n[Term]\nid: X:2\nreplaced_by: X:1\n`;
        const { snapshot, report } = await load(bad);
        expect(edges(snapshot)).toEqual(["X:1 is_a X:2"]);
        expect(codes(report)).toEqual([OBO_ISSUE.OBSOLETION, OBO_ISSUE.OBSOLETION]);
    });
});

describe("oboImporter: references (design 4.2, research 6 rows 25-27)", () => {
    it("makes a placeholder node for an undeclared target, with one warning and the count", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:99\nrelationship: part_of UBERON:1\nis_a: X:98\n\n[Typedef]\nid: part_of\n`;
        const { snapshot, report } = await load(text);
        expect(ids(snapshot)).toEqual(["X:1", "X:99", "UBERON:1", "X:98"]);
        expect(cell(snapshot, "graphty.placeholder", "X:99")).toBe(true);
        expect(cell(snapshot, "graphty.placeholder", "X:1")).toBeUndefined();
        expect(cell(snapshot, "type", "X:99")).toBeUndefined();
        expect(codes(report)).toEqual([OBO_ISSUE.DANGLING_REFERENCE]);
        expect(report.issues[0].message).toContain("3 target(s)");
        expect(report.counts.nodes).toBe(4);
    });

    it("names the term a dangling target is an alt_id of, and still makes the placeholder", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nalt_id: X:7\n\n[Term]\nid: X:2\nis_a: X:7\n`;
        const { snapshot, report } = await load(text);
        expect(ids(snapshot)).toEqual(["X:1", "X:2", "X:7"]);
        expect(report.issues[0].message).toContain("X:7 (an alt_id of X:1)");
    });

    it("drops the edge instead under addMissingNodes: false, through the registry and a caller's sink", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:99\n`;
        const viaRegistry = await importGraph(text, { format: "obo", addMissingNodes: false });
        expect(viaRegistry.snapshot.nodeCount).toBe(1);
        expect(viaRegistry.snapshot.edgeCount).toBe(0);
        expect(codes(viaRegistry.report)).toEqual([OBO_ISSUE.DANGLING_REFERENCE]);
        expect(viaRegistry.report.counts.skippedEdges).toBe(1);
        const sink = new GraphBuilder({ directed: true, addMissingNodes: true });
        const own = await load(text, { addMissingNodes: false }, sink);
        expect(own.snapshot.edgeCount).toBe(0);
        // the importer makes its placeholders itself, so a sink refusing missing nodes changes nothing
        const refusing = await load(text, {}, new GraphBuilder({ directed: true, addMissingNodes: false }));
        expect(ids(refusing.snapshot)).toEqual(["X:1", "X:99"]);
    });

    it("reads a placeholder through the default registry and a caller's sink alike", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:99\n`;
        const viaRegistry = await importGraph(text, { format: "obo" });
        expect(viaRegistry.snapshot.nodeCount).toBe(2);
        expect(codes(viaRegistry.report)).toEqual([OBO_ISSUE.DANGLING_REFERENCE]);
    });

    it("reports a relation, a subset and a synonym type with no declaration, once each", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nrelationship: part_of X:2\nrelationship: part_of X:3\nsubset: slim\nsynonym: "s" EXACT TYPO []\n\n[Term]\nid: X:2\n\n[Term]\nid: X:3\n`;
        const { snapshot, report } = await load(text);
        expect(snapshot.edgeCount).toBe(2);
        expect(codes(report)).toEqual([OBO_ISSUE.UNDECLARED, OBO_ISSUE.UNDECLARED, OBO_ISSUE.UNDECLARED]);
        expect(report.issues.map((i) => i.element)).toEqual(["slim", "TYPO", "part_of"]);
    });

    it("accepts a relation declared through a Typedef's xref (1.4 section 5.9.3) and the built-in ones", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nrelationship: BFO:0000050 X:2\n\n[Instance]\nid: I:1\ninstance_of: X:1\n\n[Term]\nid: X:2\n\n[Typedef]\nid: part_of\nxref: BFO:0000050\n`;
        const { report } = await load(text);
        expect(codes(report)).toEqual([]);
    });

    it("keeps the Term when a Typedef shares its id", async () => {
        const text = `${HEAD}[Term]\nid: R:1\n\n[Typedef]\nid: R:1\n`;
        const metadata = await load(text);
        expect(ids(metadata.snapshot)).toEqual(["R:1"]);
        expect(codes(metadata.report)).toEqual([OBO_ISSUE.ID_KIND_CLASH]);
        const nodes = await load(text, { typedefs: "nodes" });
        expect(ids(nodes.snapshot)).toEqual(["R:1"]);
        expect(cell(nodes.snapshot, "type", "R:1")).toBe("Term");
    });

    it("keeps ids as written: URLs, unprefixed, numeric-looking (ids: keep)", async () => {
        const text = `${HEAD}[Term]\nid: http://example.org/a\nis_a: https://example.org/b\n\n[Term]\nid: alpha\n\n[Term]\nid: 0001\n`;
        const { snapshot } = await load(text);
        expect(ids(snapshot)).toEqual(["http://example.org/a", "alpha", "0001", "https://example.org/b"]);
        const canonical = await load(`${HEAD}[Term]\nid: 12\n`, { ids: "canonical" });
        expect(ids(canonical.snapshot)).toEqual([12]);
    });
});

describe("oboImporter: the lexical rules on whole files (research 4.1, 6 rows 20-23, 38-39)", () => {
    it("unescapes values, \\W as a space, and keeps an escaped colon inside a URL id", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nname: a\\nb \\! c \\{d\\} \\W e\ndef: "q \\"x\\" y" []\nxref: http://ecoliwiki.net/x/Category\\:Cryptic.w\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(cell(snapshot, "name", "X:1")).toBe("a\nb ! c {d}   e");
        expect(cell(snapshot, "def", "X:1")).toBe('q "x" y');
        expect(cell(snapshot, "xref", "X:1")).toEqual(["http://ecoliwiki.net/x/Category:Cryptic.w"]);
    });

    it("ignores full-line comments anywhere and trims whitespace and tabs", async () => {
        const text = `! leading\n${HEAD}[Term]  \n! inside\nid:\tX:1   \nname:   a  \t\n  ! indented comment\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(cell(snapshot, "name", "X:1")).toBe("a");
    });

    it("reads CRLF, lone CR and form feed line ends, a BOM and frames without blank lines", async () => {
        const crlf = await load(`${HEAD}[Term]\r\nid: X:1\r\n[Term]\rid: X:2\fis_a: X:1\r\n`);
        expect(edges(crlf.snapshot)).toEqual(["X:2 is_a X:1"]);
        const bom = await load(new TextEncoder().encode(`\uFEFF${HEAD}[Term]\nid: X:1\n`));
        expect(bom.snapshot.meta.sourceVersion).toBe("1.4");
    });

    it("joins a backslash continuation and reports the deprecated syntax", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\nname: a \\\n b\n`);
        expect(cell(snapshot, "name", "X:1")).toBe("a  b");
        expect(codes(report)).toEqual([OBO_ISSUE.DEPRECATED_SYNTAX]);
    });

    it("reads a 1.2 unquoted qualifier and a brace mid-value as text with a warning", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:2 {source=PMID:1}\ncomment: see P{GawB} here\nname: set {a}\n\n[Term]\nid: X:2\n`;
        const { snapshot, report } = await load(text);
        expect(edgeCell(snapshot, "qualifiers", 0)).toEqual({ source: "PMID:1" });
        expect(cell(snapshot, "comment", "X:1")).toBe("see P{GawB} here");
        expect(cell(snapshot, "name", "X:1")).toBe("set {a}");
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX, OBO_ISSUE.SYNTAX]);
    });

    it("keeps the qualifiers of a clause that has no edge in obo.qualifiers", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nxref: A:1 {source="x"}\ndef: "d" [] {comment="c"}\nsynonym: "s" EXACT [] {source="y"}\nproperty_value: IAO:1 "v" xsd:string {q="1"}\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(cell(snapshot, "obo.qualifiers", "X:1")).toEqual({
            xref: [{ value: "A:1", qualifiers: { source: "x" } }],
            def: [{ value: "d", qualifiers: { comment: "c" } }],
        });
        expect(cell(snapshot, "synonym", "X:1")).toEqual([
            { text: "s", scope: "EXACT", type: null, xrefs: [], qualifiers: { source: "y" } },
        ]);
        expect(cell(snapshot, "property_value", "X:1")).toEqual([
            { relation: "IAO:1", value: "v", datatype: "xsd:string", qualifiers: { q: "1" } },
        ]);
    });

    it("keeps non-ASCII text and HTML entities verbatim", async () => {
        const name = `caf${String.fromCharCode(0xe9)} ${String.fromCharCode(0x3b1)} &#243`;
        const { snapshot } = await load(new TextEncoder().encode(`${HEAD}[Term]\nid: X:1\nname: ${name}\n`));
        expect(cell(snapshot, "name", "X:1")).toBe(name);
    });

    it("reads windows-1252 bytes with a warning and UTF-16 with a BOM (research 6 rows 3-4)", async () => {
        const latin1 = new Uint8Array([...new TextEncoder().encode(`${HEAD}[Term]\nid: X:1\nname: caf`), 0xe9, 0x0a]);
        const fallback = await load(latin1);
        expect(cell(fallback.snapshot, "name", "X:1")).toBe(`caf${String.fromCharCode(0xe9)}`);
        expect(codes(fallback.report)).toEqual([OBO_ISSUE.ENCODING_FALLBACK]);
        const text = `${HEAD}[Term]\nid: X:1\n`;
        const utf16 = new Uint8Array(2 + text.length * 2);
        utf16.set([0xff, 0xfe]);
        for (let i = 0; i < text.length; i++) {
            utf16[2 + i * 2] = text.charCodeAt(i);
        }
        expect(ids((await load(utf16)).snapshot)).toEqual(["X:1"]);
    });
});

describe("oboImporter: synonyms (research 4.4, 6 rows 15-17)", () => {
    it("defaults a missing scope to RELATED, silently in a 1.2 file and with a warning otherwise", async () => {
        const body = '[Term]\nid: X:1\nsynonym: "s3" []\n';
        const v12 = await load(`format-version: 1.2\n\n${body}`);
        expect(cell(v12.snapshot, "synonym", "X:1")).toEqual([{ text: "s3", scope: "RELATED", type: null, xrefs: [] }]);
        expect(codes(v12.report)).toEqual([]);
        const v14 = await load(`${HEAD}${body}`);
        expect(codes(v14.report)).toEqual([OBO_ISSUE.SYNONYM_SCOPE]);
    });

    it("keeps an invalid scope's word as the type, scope null, and warns", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\nsynonym: "s1" WRONG []\n`);
        expect(cell(snapshot, "synonym", "X:1")).toEqual([{ text: "s1", scope: null, type: "WRONG", xrefs: [] }]);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNONYM_SCOPE]);
    });

    it("reads a declared type without a scope, applying the type's default scope", async () => {
        const text = `format-version: 1.2\nsynonymtypedef: systematic "Systematic" EXACT\nsynonymtypedef: plain "Plain"\n\n[Term]\nid: X:1\nsynonym: "a" systematic []\nsynonym: "b" plain []\nsynonym: "c" NARROW systematic []\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([]);
        expect(cell(snapshot, "synonym", "X:1")).toEqual([
            { text: "a", scope: "EXACT", type: "systematic", xrefs: [] },
            { text: "b", scope: "RELATED", type: "plain", xrefs: [] },
            { text: "c", scope: "EXACT", type: "systematic", xrefs: [] },
        ]);
    });

    it("maps the 1.0 synonym and xref tags with one warning per tag", async () => {
        const text = `format-version: GO_1.0\n\n[Term]\nid: X:1\nis_obsolete: true\nexact_synonym: "e" [A:1]\nnarrow_synonym: "n" []\nbroad_synonym: "b" []\nrelated_synonym: "r" []\nxref_analog: B:1\nxref_unk: C:1\nxref_unknown: D:1\nuse_term: X:2\n`;
        const { snapshot, report } = await load(text);
        expect(cell(snapshot, "synonym", "X:1")).toEqual([
            { text: "e", scope: "EXACT", type: null, xrefs: ["A:1"] },
            { text: "n", scope: "NARROW", type: null, xrefs: [] },
            { text: "b", scope: "BROAD", type: null, xrefs: [] },
            { text: "r", scope: "RELATED", type: null, xrefs: [] },
        ]);
        expect(cell(snapshot, "xref", "X:1")).toEqual(["B:1", "C:1", "D:1"]);
        expect(cell(snapshot, "consider", "X:1")).toEqual(["X:2"]);
        expect(codes(report).every((c) => c === OBO_ISSUE.DEPRECATED_TAG)).toBe(true);
        expect(report.issues.map((i) => i.element)).toEqual([
            "exact_synonym",
            "narrow_synonym",
            "broad_synonym",
            "related_synonym",
            "xref_analog",
            "xref_unk",
            "xref_unknown",
            "use_term",
        ]);
    });
});

describe("oboImporter: errors and warnings (research 6, design 4.3)", () => {
    it("fails on an empty or whitespace-only input", async () => {
        for (const text of ["", "  \n\n\t"]) {
            const err = await fails(text);
            expect(codes(err.report)).toEqual([OBO_ISSUE.EMPTY_INPUT]);
        }
    });

    it("reads a header-only file as an empty graph", async () => {
        const { snapshot, report } = await load("format-version: 1.2\nremark: nothing here\n");
        expect(snapshot.nodeCount).toBe(0);
        expect(report.issues).toEqual([]);
        expect(snapshot.meta.extra.obo).toMatchObject({ header: { remark: ["nothing here"] } });
    });

    it("skips a frame without an id with E_MISSING_ID, and uses an id that is not first with a warning", async () => {
        const missing = await load(`${HEAD}[Term]\nname: a\n\n[Term]\nid: X:2\n`);
        expect(ids(missing.snapshot)).toEqual(["X:2"]);
        expect(codes(missing.report)).toEqual([OBO_ISSUE.MISSING_ID]);
        expect(missing.report.counts.skippedNodes).toBe(1);
        const late = await load(`${HEAD}[Term]\nname: a\nid: X:1\nid: X:3\n`);
        expect(ids(late.snapshot)).toEqual(["X:1"]);
        expect(cell(late.snapshot, "name", "X:1")).toBe("a");
        expect(codes(late.report)).toEqual([OBO_ISSUE.ID_NOT_FIRST, OBO_ISSUE.DUPLICATE_ATTRIBUTE]);
    });

    it("skips a clause whose value cannot be read with E_BAD_VALUE", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_obsolete: yes\nrelationship: part_of X:2 X:3\nrelationship: part_of\nis_a:\nintersection_of: a b c\n`;
        const { snapshot, report } = await load(text);
        expect(snapshot.edgeCount).toBe(0);
        expect(cell(snapshot, "is_obsolete", "X:1")).toBeUndefined();
        expect(codes(report)).toEqual([...Array<string>(5).fill(OBO_ISSUE.BAD_VALUE), OBO_ISSUE.CARDINALITY]);
        expect(report.issues[0]).toMatchObject({ severity: "error", line: 6, element: "X:1" });
    });

    it("keeps an unknown tag in obo.unrecognized and an unknown frame out of the graph, warning once each", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nfoo_bar: baz\nfoo_bar: qux\nformat-version: 1.2\n\n[Annotation]\nid: A:1\nname: skipped\n\n[Annotation]\nid: A:2\n`;
        const { snapshot, report } = await load(text);
        expect(ids(snapshot)).toEqual(["X:1"]);
        expect(cell(snapshot, "obo.unrecognized", "X:1")).toEqual({
            foo_bar: ["baz", "qux"],
            "format-version": ["1.2"],
        });
        expect(codes(report)).toEqual([
            OBO_ISSUE.UNKNOWN_ELEMENT,
            OBO_ISSUE.UNKNOWN_ELEMENT,
            OBO_ISSUE.UNKNOWN_ELEMENT,
        ]);
        expect(report.issues.map((i) => i.element)).toEqual(["foo_bar", "format-version", "[Annotation]"]);
        expect(snapshot.meta.extra.obo).toMatchObject({
            unknownFrames: [
                { type: "Annotation", clauses: { id: ["A:1"], name: ["skipped"] } },
                { type: "Annotation", clauses: { id: ["A:2"] } },
            ],
        });
    });

    it("keeps an unknown header tag silently (the BNF allows it)", async () => {
        const { snapshot, report } = await load("format-version: 1.4\nmy-tag: x\ncomment: y\n\n[Term]\nid: X:1\n");
        expect(report.issues).toEqual([]);
        expect(snapshot.meta.extra.obo).toMatchObject({ header: { "my-tag": ["x"], comment: ["y"] } });
    });

    it("reports a line without a colon, a def without xrefs and an unterminated quote as W_OBO_SYNTAX", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nthis line has no colon\ndef: "text"\n\n[Term]\nid: X:2\ndef: "text []\n\n[Term]\nid: X:3\ndef: plain words\n`;
        const { snapshot, report } = await load(text);
        expect(cell(snapshot, "def", "X:1")).toBe("text");
        expect(cell(snapshot, "def", "X:2")).toBe("text []");
        expect(cell(snapshot, "def", "X:3")).toBe("plain words");
        expect(codes(report)).toEqual(Array(4).fill(OBO_ISSUE.SYNTAX));
    });

    it("reports a single intersection_of / union_of (fewer than two)", async () => {
        const { report } = await load(`${HEAD}[Term]\nid: X:1\nintersection_of: X:2\nunion_of: X:3\n`);
        expect(codes(report)).toEqual([OBO_ISSUE.CARDINALITY, OBO_ISSUE.CARDINALITY]);
    });

    it("keeps but does not apply import, id-mapping and the treat-xrefs macros, once per tag", async () => {
        const text = `format-version: 1.4\nimport: http://purl.obolibrary.org/obo/bfo.owl\nimport: other.obo\ntreat-xrefs-as-is_a: CL\ntreat-xrefs-as-equivalent: UBERON\nid-mapping: part_of BFO:0000050\ndefault-relationship-id-prefix: OBO_REL\nowl-axioms: Prefix(:=<http://x/>)\n\n[Term]\nid: X:1\nxref: CL:0000001\n`;
        const { snapshot, report } = await load(text);
        expect(snapshot.edgeCount).toBe(0);
        expect(report.issues.map((i) => `${i.code} ${String(i.element)}`)).toEqual([
            `${OBO_ISSUE.HEADER_NOT_APPLIED} import`,
            `${OBO_ISSUE.HEADER_NOT_APPLIED} treat-xrefs-as-is_a`,
            `${OBO_ISSUE.HEADER_NOT_APPLIED} treat-xrefs-as-equivalent`,
            `${OBO_ISSUE.HEADER_NOT_APPLIED} id-mapping`,
            `${OBO_ISSUE.HEADER_NOT_APPLIED} default-relationship-id-prefix`,
            `${OBO_ISSUE.HEADER_NOT_APPLIED} owl-axioms`,
        ]);
        expect(snapshot.meta.extra.obo).toMatchObject({
            header: { import: ["http://purl.obolibrary.org/obo/bfo.owl", "other.obo"] },
        });
    });

    it("reads the header date dd:MM:yyyy HH:mm into created and keeps any other form only as text", async () => {
        const good = await load("format-version: 1.2\ndate: 17:04:2012 15:38\nsaved-by: someone\n\n[Term]\nid: X:1\n");
        expect(good.snapshot.meta).toMatchObject({ created: "2012-04-17T15:38", creator: "someone" });
        const iso = await load("format-version: 1.2\ndate: 2012-04-17\n\n[Term]\nid: X:1\n");
        expect(iso.snapshot.meta.created).toBeNull();
        expect(iso.snapshot.meta.extra.obo).toMatchObject({ header: { date: ["2012-04-17"] } });
        expect(iso.report.issues).toEqual([]);
    });

    it("reports the 1.0 typeref and version headers as deprecated", async () => {
        const { report } = await load("format-version: GO_1.0\nversion: 1\ntyperef: rel.obo\n\n[Term]\nid: X:1\n");
        expect(codes(report)).toEqual([
            OBO_ISSUE.DEPRECATED_TAG,
            OBO_ISSUE.DEPRECATED_TAG,
            OBO_ISSUE.HEADER_NOT_APPLIED,
        ]);
    });

    it("reports defaultDirected and weightFrom as options it has no use for", async () => {
        const { report } = await load(`${HEAD}[Term]\nid: X:1\n`, { defaultDirected: false, weightFrom: "w" });
        expect(codes(report)).toEqual([OBO_ISSUE.OPTION_IGNORED, OBO_ISSUE.OPTION_IGNORED]);
    });

    it("throws ImportError past the error limit", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_obsolete: no\nbuiltin: maybe\n`;
        const err = await fails(text, { errorLimit: 1 });
        expect(err.report.truncated).toBe(true);
    });

    it("rejects with the signal's reason when aborted", async () => {
        const controller = new AbortController();
        controller.abort(new Error("stop"));
        await expect(load(`${HEAD}[Term]\nid: X:1\n`, { signal: controller.signal })).rejects.toThrow("stop");
        const frames = Array.from({ length: 200 }, (_, i) => `[Term]\nid: X:${i}\n`).join("\n");
        const late = new AbortController();
        const sink = new GraphBuilder({ directed: true });
        const add = sink.addNode.bind(sink);
        sink.addNode = (id): number => {
            late.abort(new Error("late"));
            return add(id);
        };
        await expect(oboImporter.import(`${HEAD}${frames}`, sink, { signal: late.signal })).rejects.toThrow("late");
    });
});

describe("oboImporter: sniff (design 1.5)", () => {
    const sniff = (text: string): number => oboImporter.sniff?.(new TextEncoder().encode(text)) ?? -1;

    it("is sure of a format-version line or a frame header, after a BOM, blanks and comments", () => {
        expect(sniff("format-version: 1.2\n")).toBe(0.9);
        expect(sniff("\uFEFF\n! comment\n[Term]\nid: X:1\n")).toBe(0.9);
        expect(sniff("ontology: x\ndata-version: 1\n\n[Typedef]\nid: r\n")).toBe(0.9);
        expect(sniff("[Instance]\n")).toBe(0.9);
    });

    it("is unsure of a head of only tag: value lines and refuses anything else", () => {
        expect(sniff("ontology: x\nremark: y\n")).toBe(0.4);
        expect(sniff('{"nodes": []}')).toBe(0);
        expect(sniff("graph [\n node [ id 1 ]\n]")).toBe(0);
        expect(sniff("source,target\n1,2\n")).toBe(0);
        expect(sniff("[Term\n")).toBe(0);
        expect(sniff("! only a comment\n")).toBe(0);
    });
});

describe("oboImporter: the corpus", () => {
    for (const entry of corpusFiles("obo")) {
        it(`imports ${entry.path} with the manifest's counts from every input shape`, async () => {
            const bytes = readCorpusBytes("obo", entry.path);
            for (const shape of inputShapes(bytes)) {
                const { snapshot, report } = await load(shape.make(), entry.options as Options | undefined);
                expect(snapshot.nodeCount, shape.name).toBe(entry.expectedNodes);
                expect(snapshot.edgeCount, shape.name).toBe(entry.expectedEdges);
                expect(report.errorCount, shape.name).toBe(0);
            }
        });
    }
});

describe("oboImporter: the malformed corpus", () => {
    const fatal = new Set(["empty.obo", "invalid-utf16.obo"]);
    for (const name of malformedFiles("obo")) {
        it(`${name}: ${fatal.has(name) ? "fails" : "imports with issues"}, never crashes`, async () => {
            const bytes = readMalformedBytes("obo", name);
            if (fatal.has(name)) {
                await fails(bytes);
                return;
            }
            const { report } = await load(bytes);
            expect(report.issues.length, name).toBeGreaterThan(0);
            expect(report.truncated).toBe(false);
        });
    }
});
