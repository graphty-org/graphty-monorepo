/**
 * Robustness of the OBO Graphs JSON reader (the `obographs` dialect of the JSON importer): damaged,
 * truncated and schema-violating documents. Every test pins one condition: the import recovers
 * with the named issue codes and the recoverable data kept, or rejects with ImportError carrying
 * the named code. Conditions already pinned by test/formats/json/obographs.test.ts are not
 * repeated here.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DUPLICATE_EDGE_CODE } from "../../src/common/codes.js";
import { sniffJsonDialect } from "../../src/formats/json/dialect.js";
import { JSON_ISSUE, jsonImporter, type JsonImportOptions } from "../../src/formats/json/index.js";
import { importGraph } from "../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportReport } from "../../src/types.js";

type Options = JsonImportOptions & CommonImportOptions;

const PURL = "http://purl.obolibrary.org/obo/";
const OIO = "http://www.geneontology.org/formats/oboInOwl#";

async function load(
    doc: unknown,
    options?: Options,
    builder?: GraphBuilder,
): Promise<{ s: GraphSnapshot; report: ImportReport }> {
    const b = builder ?? new GraphBuilder({ directed: true });
    const text = typeof doc === "string" ? doc : JSON.stringify(doc);
    const report = await jsonImporter.import(text, b, { dialect: "obographs", ...options });
    return { s: b.freeze(), report };
}

async function fails(doc: string, options?: Options): Promise<ImportError> {
    try {
        await load(doc, options);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return err as ImportError;
    }
    throw new Error("expected ImportError");
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function cell(s: GraphSnapshot, column: string, id: string): unknown {
    const col = s.nodes.get(column);
    const index = s.ids.indexOf(id);
    if (col === null || index < 0 || !col.isSet(index)) {
        return undefined;
    }
    const value = col.value(index);
    return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<unknown>) : value;
}

function edges(s: GraphSnapshot): string[] {
    const list = s.edgeList();
    const relation = s.edges.get("relation");
    return Array.from({ length: s.edgeCount }, (_, e) => {
        const r = relation?.isSet(e) === true ? String(relation.value(e)) : "?";
        return `${String(s.ids.idOf(list.src[e]))} ${r} ${String(s.ids.idOf(list.dst[e]))}`;
    });
}

function graph(nodes: unknown[], edgeList: unknown[] = [], extra: Record<string, unknown> = {}): unknown {
    return { graphs: [{ id: "g", nodes, edges: edgeList, ...extra }] };
}

function obographsExtra(s: GraphSnapshot): Record<string, unknown> {
    return s.meta.extra.obographs as Record<string, unknown>;
}

describe("robustness: OBO Graphs documents that are not whole", () => {
    it.each([
        ["mid-array", '{"graphs":[{"nodes":[{"id":"a"},{"id":"b"'],
        ["mid-string", '{"graphs":[{"nodes":[{"id":"a","lbl":"cell'],
        ["mid-number", '{"graphs":[{"nodes":[{"id":"a","meta":{"version":12'],
        ["mid-escape", '{"graphs":[{"nodes":[{"id":"a","lbl":"x\\u00'],
    ])("rejects a document cut %s (og-truncated-json)", async (_where, text) => {
        const err = await fails(text);
        expect(codes(err.report)).toEqual([JSON_ISSUE.SYNTAX]);
    });
});

describe("robustness: OBO Graphs meta that does not fit the schema", () => {
    it("reports each list item that is not a string or a { val } record (og-nonstring-list-items)", async () => {
        const doc = graph([
            {
                id: "a",
                meta: {
                    xrefs: [{ val: "X:1" }, { val: 1 }, null, "X:2"],
                    comments: ["c", 5],
                    subsets: [{}],
                    definition: { val: "d", xrefs: ["R:1", 3] },
                },
            },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "xref", "a")).toEqual(["X:1", "X:2"]);
        expect(cell(s, "comment", "a")).toBe("c");
        expect(cell(s, "subset", "a")).toBeUndefined();
        expect(cell(s, "def.xrefs", "a")).toEqual(["R:1"]);
        expect(codes(report)).toEqual(Array(5).fill(JSON_ISSUE.BAD_VALUE));
        expect(report.issues.map((i) => i.element)).toEqual([
            "nodes[0].meta.definition.xrefs[1]",
            "nodes[0].meta.comments[1]",
            "nodes[0].meta.subsets[0]",
            "nodes[0].meta.xrefs[1]",
            "nodes[0].meta.xrefs[2]",
        ]);
    });

    it("reports a meta field that is not an array (og-meta-field-wrong-container)", async () => {
        const doc = graph([
            {
                id: "a",
                meta: {
                    synonyms: { val: "x" },
                    xrefs: "A:1",
                    comments: "c",
                    subsets: "s",
                    definition: { val: "d", xrefs: "A:1" },
                },
            },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "def", "a")).toBe("d");
        expect(cell(s, "synonym", "a")).toBeUndefined();
        expect(codes(report)).toEqual(Array(5).fill(JSON_ISSUE.BAD_VALUE));
        expect(report.issues.map((i) => i.element)).toEqual([
            "nodes[0].meta.definition.xrefs",
            "nodes[0].meta.comments",
            "nodes[0].meta.subsets",
            "nodes[0].meta.xrefs",
            "nodes[0].meta.synonyms",
        ]);
    });

    it("reports a synonym that is not an object or has no val, and warns about an unknown pred (og-bad-synonyms)", async () => {
        const doc = graph([
            {
                id: "a",
                meta: {
                    synonyms: [
                        "bare",
                        { pred: "hasExactSynonym" },
                        { pred: "hasWeirdSynonym", val: "w" },
                        { pred: "hasBroadSynonym", val: "b" },
                    ],
                },
            },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "synonym", "a")).toEqual([
            { text: "w", scope: null, type: null, xrefs: [] },
            { text: "b", scope: "BROAD", type: null, xrefs: [] },
        ]);
        expect(codes(report)).toEqual([JSON_ISSUE.BAD_VALUE, JSON_ISSUE.BAD_VALUE, JSON_ISSUE.UNKNOWN_ELEMENT]);
        expect(report.issues.map((i) => i.element)).toEqual([
            "nodes[0].meta.synonyms[0]",
            "nodes[0].meta.synonyms[1].val",
            "hasWeirdSynonym",
        ]);
    });

    it("reports a basicPropertyValues entry without a string pred and val (og-bad-property-values)", async () => {
        const doc = graph([
            {
                id: "a",
                meta: {
                    basicPropertyValues: [
                        { pred: "http://x.org/p", val: 5 },
                        { val: "v" },
                        "bare",
                        { pred: "http://x.org/q", val: "ok" },
                    ],
                },
            },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "property_value", "a")).toEqual([{ relation: "http://x.org/q", value: "ok", datatype: null }]);
        expect(codes(report)).toEqual(Array(3).fill(JSON_ISSUE.BAD_VALUE));
        expect(report.issues.map((i) => i.element)).toEqual([
            "nodes[0].meta.basicPropertyValues[0]",
            "nodes[0].meta.basicPropertyValues[1]",
            "nodes[0].meta.basicPropertyValues[2]",
        ]);
    });

    it("reports a definition that is a string or has no val, and a deprecated that is not a boolean (og-bad-definition-and-deprecated)", async () => {
        const doc = graph([
            { id: "a", meta: { definition: "plain", deprecated: "true" } },
            { id: "b", meta: { definition: { xrefs: ["X:1"] } } },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "def", "a")).toBeUndefined();
        expect(cell(s, "is_obsolete", "a")).toBeUndefined();
        expect(codes(report)).toEqual(Array(3).fill(JSON_ISSUE.BAD_VALUE));
        expect(report.issues.map((i) => i.element)).toEqual([
            "nodes[0].meta.definition",
            "nodes[0].meta.deprecated",
            "nodes[1].meta.definition.val",
        ]);
    });

    it("reports wrong field types inside a synonym and keeps the nested meta of a synonym and a definition (og-synonym-definition-nested-keys)", async () => {
        const doc = graph([
            {
                id: "a",
                meta: {
                    definition: { val: "d", meta: { comments: ["dm"] } },
                    synonyms: [
                        { pred: "hasExactSynonym", val: "s", synonymType: 5, xrefs: "X", meta: { comments: ["sm"] } },
                    ],
                    basicPropertyValues: [
                        { pred: `${OIO}hasOBONamespace`, val: "n", meta: { comments: ["pm"] } },
                        { pred: "http://x.org/q", val: "v", meta: { comments: ["qm"] } },
                    ],
                },
            },
        ]);
        const { s, report } = await load(doc);
        expect(codes(report)).toEqual([JSON_ISSUE.BAD_VALUE, JSON_ISSUE.BAD_VALUE]);
        expect(report.issues.map((i) => i.element)).toEqual([
            "nodes[0].meta.synonyms[0].xrefs",
            "nodes[0].meta.synonyms[0].synonymType",
        ]);
        expect(cell(s, "synonym", "a")).toEqual([
            { text: "s", scope: "EXACT", type: null, xrefs: [], meta: { comments: ["sm"] } },
        ]);
        expect(cell(s, "property_value", "a")).toEqual([
            { relation: "http://x.org/q", value: "v", datatype: null, meta: { comments: ["qm"] } },
        ]);
        expect(cell(s, "namespace", "a")).toBe("n");
        expect(cell(s, "obo.unrecognized", "a")).toEqual({
            "meta.definition.meta": { comments: ["dm"] },
            "meta.basicPropertyValues[0].meta": { comments: ["pm"] },
        });
    });

    it("keeps the first of two values of a single-valued tag, warning, as the .obo importer does (og-repeated-single-valued-property)", async () => {
        const doc = graph([
            {
                id: "a",
                meta: {
                    basicPropertyValues: [
                        { pred: `${OIO}hasOBONamespace`, val: "n1" },
                        { pred: `${OIO}hasOBONamespace`, val: "n2" },
                        { pred: `${OIO}created_by`, val: "x" },
                        { pred: `${OIO}created_by`, val: "x" },
                    ],
                },
            },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "namespace", "a")).toBe("n1");
        expect(cell(s, "created_by", "a")).toBe("x");
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(report.issues[0].element).toBe("namespace");
    });
});

describe("robustness: OBO Graphs nodes", () => {
    it("refuses an empty id like a missing one (og-empty-string-id)", async () => {
        const doc = graph([{ id: "" }, { id: "a" }], [{ sub: "", pred: "is_a", obj: "a" }]);
        const { s, report } = await load(doc);
        expect(s.ids.toArray()).toEqual(["a"]);
        expect(s.edgeCount).toBe(0);
        expect(codes(report)).toEqual([JSON_ISSUE.MISSING_ID, JSON_ISSUE.MISSING_ENDPOINT]);
        expect(report.counts).toMatchObject({ skippedNodes: 1, skippedEdges: 1 });
    });

    it("keeps an unknown node type, warning once per type (og-unknown-node-type)", async () => {
        const doc = graph([
            { id: "a", type: "WIDGET" },
            { id: "b", type: "WIDGET" },
            { id: "c", type: "CLASS" },
        ]);
        const { s, report } = await load(doc);
        expect(cell(s, "type", "a")).toBe("WIDGET");
        expect(cell(s, "type", "c")).toBe("Term");
        expect(codes(report)).toEqual([JSON_ISSUE.UNKNOWN_ELEMENT]);
        expect(report.issues[0].message).toContain("WIDGET");
    });

    it("keeps the first of two PROPERTY nodes with one id, warning (og-duplicate-property)", async () => {
        const doc = graph([
            { id: "p", type: "PROPERTY", lbl: "first" },
            { id: "p", type: "PROPERTY", lbl: "second" },
        ]);
        const { s, report } = await load(doc);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_NODE]);
        expect(report.issues[0].message).toContain("first");
        expect(obographsExtra(s).properties).toEqual({ p: { lbl: "first" } });
    });

    it("keeps a PROPERTY node whose id is __proto__ (og-property-id-proto)", async () => {
        const { s, report } = await load(graph([{ id: "__proto__", type: "PROPERTY", lbl: "p" }]));
        expect(report.issues).toEqual([]);
        const properties = obographsExtra(s).properties as object;
        expect(Object.keys(properties)).toEqual(["__proto__"]);
        expect(Object.getOwnPropertyDescriptor(properties, "__proto__")?.value).toEqual({ lbl: "p" });
    });

    it("says that two ids met only after IRI compaction (og-id-collision-after-compaction)", async () => {
        const doc = graph([
            { id: `${PURL}GO_1`, lbl: "iri" },
            { id: "GO:1", lbl: "curie" },
        ]);
        const { s, report } = await load(doc);
        expect(s.ids.toArray()).toEqual(["GO:1"]);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_NODE]);
        expect(report.issues[0].message).toMatch(/compact/);
        const apart = await load(doc, { oboIds: "iri" });
        expect(apart.s.ids.toArray()).toEqual([`${PURL}GO_1`, "GO:1"]);
        expect(apart.report.issues).toEqual([]);
    });

    it("compacts https OBO PURLs like http ones (og-https-obo-purl)", async () => {
        const https = "https://purl.obolibrary.org/obo/";
        const doc = graph(
            [{ id: `${https}GO_1` }, { id: `${https}GO_2` }],
            [{ sub: `${https}GO_1`, pred: "is_a", obj: `${https}GO_2` }],
        );
        const { s, report } = await load(doc);
        expect(report.issues).toEqual([]);
        expect(s.ids.toArray()).toEqual(["GO:1", "GO:2"]);
        expect(edges(s)).toEqual(["GO:1 is_a GO:2"]);
    });
});

describe("robustness: OBO Graphs edges", () => {
    it("warns about edge keys outside the schema and a meta that is not an object (og-edge-extra-keys)", async () => {
        const doc = graph(
            [{ id: "a" }, { id: "b" }],
            [
                { sub: "a", pred: "is_a", obj: "b", lbl: "x", vendor: 1 },
                { sub: "b", pred: "is_a", obj: "a", meta: "note", lbl: "y" },
            ],
        );
        const { s, report } = await load(doc);
        expect(edges(s)).toEqual(["a is_a b", "b is_a a"]);
        expect(codes(report)).toEqual([JSON_ISSUE.UNREAD_KEY, JSON_ISSUE.UNREAD_KEY, JSON_ISSUE.BAD_VALUE]);
        expect(report.issues.map((i) => i.element)).toEqual(["edges[0].lbl", "edges[0].vendor", "edges[1].meta"]);
    });

    it("uses sub and warns when an edge also carries a different subj (og-sub-and-subj)", async () => {
        const doc = graph([{ id: "a" }, { id: "b" }, { id: "c" }], [{ sub: "a", subj: "c", pred: "is_a", obj: "b" }]);
        const { s, report } = await load(doc);
        expect(edges(s)).toEqual(["a is_a b"]);
        expect(codes(report)).toEqual([JSON_ISSUE.OBOGRAPHS_SUBJ]);
        expect(report.issues[0].message).toMatch(/ignored/);
    });

    it("leaves an identical repeated edge to the duplicateEdges policy (og-duplicate-edges)", async () => {
        const doc = graph(
            [{ id: "a" }, { id: "b" }],
            [
                { sub: "a", pred: "is_a", obj: "b" },
                { sub: "a", pred: "is_a", obj: "b" },
            ],
        );
        const kept = await load(doc);
        expect(edges(kept.s)).toEqual(["a is_a b", "a is_a b"]);
        expect(kept.report.counts.edges).toBe(2);
        const refused = importGraph(JSON.stringify(doc), { format: "json", duplicateEdges: "error" });
        await expect(refused).rejects.toBeInstanceOf(ImportError);
        const err = (await refused.catch((e: unknown) => e)) as ImportError;
        expect(err.report.issues.map((i) => i.code)).toEqual([DUPLICATE_EDGE_CODE]);
    });

    it("moves only property-to-property edges to the metadata (og-class-edge-moved-to-metadata)", async () => {
        const doc = graph(
            [
                { id: "a", type: "CLASS" },
                { id: "b", type: "CLASS" },
                { id: "p", type: "PROPERTY" },
                { id: "q", type: "PROPERTY" },
                { id: "both", type: "CLASS" },
                { id: "both", type: "PROPERTY" },
            ],
            [
                { sub: "a", pred: "is_a", obj: "p" },
                { sub: "a", pred: "subPropertyOf", obj: "b" },
                { sub: "a", pred: "is_a", obj: "both" },
                { sub: "p", pred: "subPropertyOf", obj: "q" },
            ],
        );
        const { s, report } = await load(doc);
        // p is property metadata, not a node: the class's edge keeps it as a placeholder
        expect(report.issues.map((i) => [i.code, i.element])).toEqual([[JSON_ISSUE.DANGLING_REFERENCE, "p"]]);
        expect(edges(s)).toEqual(["a is_a p", "a is_a b", "a is_a both"]);
        expect(obographsExtra(s).propertyEdges).toEqual([{ sub: "p", pred: "subPropertyOf", obj: "q" }]);
    });
});

describe("robustness: OBO Graphs documents", () => {
    it("detects the dialect from any graph, so an empty first graph is not JGF (og-multiple-graphs)", async () => {
        const doc = { graphs: [{ id: "g0" }, { id: "g1", nodes: [{ id: "a", lbl: "A" }] }] };
        expect(sniffJsonDialect(doc)).toBe("obographs");
        const b = new GraphBuilder({ directed: true });
        const report = await jsonImporter.import(JSON.stringify(doc), b, { graphIndex: 1 });
        const s = b.freeze();
        expect(codes(report)).toEqual([JSON_ISSUE.MULTIPLE_GRAPHS]);
        expect(cell(s, "name", "a")).toBe("A");
        expect((s.meta.extra.json as Record<string, unknown>).dialect).toBe("obographs");
    });

    it("reports an axiom section that is not an array, keeping it verbatim (og-axioms-dangling)", async () => {
        const doc = graph([{ id: "a" }], [], {
            logicalDefinitionAxioms: "broken",
            equivalentNodesSets: [{ nodeIds: ["a", "missing"] }],
        });
        const { s, report } = await load(doc);
        expect(codes(report)).toEqual([JSON_ISSUE.BAD_VALUE]);
        expect(report.issues[0].element).toBe("logicalDefinitionAxioms");
        const kept = obographsExtra(s).graph as Record<string, unknown>;
        expect(kept.logicalDefinitionAxioms).toBe("broken");
        expect(kept.equivalentNodesSets).toEqual([{ nodeIds: ["a", "missing"] }]);
    });

    // JSON.parse keeps the last of a repeated key; the JSON reader reports the dropped value
    it("uses the last of a repeated key, as JSON.parse does, and reports it (og-json-duplicate-keys)", async () => {
        const { s, report } = await load('{"graphs":[{"nodes":[{"id":"a","id":"b","lbl":"x"}]}]}');
        expect(s.ids.toArray()).toEqual(["b"]);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_ATTRIBUTE]);
    });

    it("warns about NaN, Infinity and integers beyond 2^53 in meta (og-nonstandard-numbers)", async () => {
        const text = '{"graphs":[{"nodes":[{"id":"a","meta":{"version":NaN,"n":Infinity,"big":9007199254740993}}]}]}';
        const { s, report } = await load(text);
        expect(s.ids.toArray()).toEqual(["a"]);
        expect(codes(report).sort()).toEqual([JSON_ISSUE.BIG_INTEGER, JSON_ISSUE.NONSTANDARD_NUMBER].sort());
    });

    it("renames a vocabulary column the caller's sink already holds (sink-column-collisions, obographs)", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({ name: "name", dtype: "f64", nullable: true });
        const { s, report } = await load(graph([{ id: "a", lbl: "A" }]), undefined, b);
        expect(codes(report)).toEqual([JSON_ISSUE.COLUMN_RENAMED]);
        expect(cell(s, "name#name", "a")).toBe("A");
    });
});
