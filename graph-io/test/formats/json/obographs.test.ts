import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { sniffJsonDialect } from "../../../src/formats/json/dialect.js";
import { JSON_ISSUE, jsonImporter, type JsonImportOptions } from "../../../src/formats/json/index.js";
import { oboImporter } from "../../../src/formats/obo/importer.js";
import { importAllGraphs, importGraph, listGraphs } from "../../../src/registry.js";
import { sniffJsonDialectHead } from "../../../src/sniff.js";
import { type CommonImportOptions, ImportError, type ImportReport } from "../../../src/types.js";

type Options = JsonImportOptions & CommonImportOptions;

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "conformance", "fixtures");
const PURL = "http://purl.obolibrary.org/obo/";
const OIO = "http://www.geneontology.org/formats/oboInOwl#";

async function load(doc: unknown, options?: Options): Promise<{ s: GraphSnapshot; report: ImportReport }> {
    const b = new GraphBuilder({ directed: true });
    const text = typeof doc === "string" ? doc : JSON.stringify(doc);
    const report = await jsonImporter.import(text, b, options);
    return { s: b.freeze(), report };
}

async function fails(doc: unknown, options?: Options): Promise<ImportError> {
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

const PART_OF = {
    id: `${PURL}BFO_0000050`,
    lbl: "part of",
    type: "PROPERTY",
    propertyType: "OBJECT",
    meta: { basicPropertyValues: [{ pred: `${OIO}shorthand`, val: "part_of" }] },
};

const DOC = {
    graphs: [
        {
            id: `${PURL}go/test.owl`,
            meta: { version: "v1" },
            nodes: [
                {
                    id: `${PURL}GO_0005575`,
                    lbl: "cellular_component",
                    type: "CLASS",
                    meta: {
                        definition: { val: "A part of a cell.", xrefs: ["GOC:go_curators"] },
                        comments: ["c1"],
                        subsets: [`${PURL}go#goslim_generic`],
                        xrefs: [{ val: "NIF_Subcellular:sao1337158144" }],
                        synonyms: [
                            { pred: "hasExactSynonym", val: "cell or subcellular entity", xrefs: [] },
                            { pred: "hasRelatedSynonym", val: "cc", synonymType: `${PURL}go#systematic_synonym` },
                        ],
                        basicPropertyValues: [
                            { pred: `${OIO}hasOBONamespace`, val: "cellular_component" },
                            { pred: `${OIO}hasAlternativeId`, val: "GO:0008372" },
                            { pred: `${OIO}created_by`, val: "someone" },
                            { pred: "http://purl.org/dc/terms/license", val: "CC-BY" },
                        ],
                    },
                },
                { id: `${PURL}GO_0005634`, lbl: "nucleus", type: "CLASS" },
                {
                    id: `${PURL}GO_0000001`,
                    lbl: "obsolete thing",
                    type: "CLASS",
                    meta: {
                        deprecated: true,
                        basicPropertyValues: [{ pred: `${PURL}IAO_0100001`, val: `${PURL}GO_0005634` }],
                    },
                },
                { id: `${PURL}T/Female`, type: "INDIVIDUAL" },
                PART_OF,
                { id: `${PURL}RO_0002131`, lbl: "overlaps", type: "PROPERTY" },
            ],
            edges: [
                { sub: `${PURL}GO_0005634`, pred: "is_a", obj: `${PURL}GO_0005575` },
                {
                    sub: `${PURL}GO_0005634`,
                    pred: `${PURL}BFO_0000050`,
                    obj: `${PURL}GO_0005575`,
                    meta: { comments: ["edge note"] },
                },
                { sub: `${PURL}T/Female`, pred: "type", obj: `${PURL}GO_0005575` },
                { sub: `${PURL}BFO_0000050`, pred: "subPropertyOf", obj: `${PURL}RO_0002131` },
            ],
            logicalDefinitionAxioms: [{ definedClassId: `${PURL}GO_0005634`, genusIds: [], restrictions: [] }],
        },
    ],
};

describe("sniffJsonDialect: OBO Graphs is not JGF (design 1.6)", () => {
    it("answers obographs for sub / pred / obj edges, lbl / meta nodes or an OWL node type", () => {
        expect(sniffJsonDialect(DOC)).toBe("obographs");
        expect(sniffJsonDialect({ graphs: [{ nodes: [], edges: [{ subj: "a", pred: "is_a", obj: "b" }] }] })).toBe(
            "obographs",
        );
        expect(sniffJsonDialect({ graphs: [{ nodes: [{ id: "a" }, { id: "b", lbl: "x" }] }] })).toBe("obographs");
        expect(sniffJsonDialect({ graphs: [{ nodes: [{ id: "a", meta: {} }] }] })).toBe("obographs");
        expect(sniffJsonDialect({ graphs: [{ nodes: [{ id: "a", type: "PROPERTY" }] }] })).toBe("obographs");
    });

    it("keeps JGF for source / target edges, a nodes object or an empty graph", () => {
        expect(sniffJsonDialect({ graphs: [{ nodes: [{ id: "a" }], edges: [{ source: "a", target: "a" }] }] })).toBe(
            "jgf",
        );
        expect(sniffJsonDialect({ graphs: [{ nodes: { a: { label: "x" } } }] })).toBe("jgf");
        expect(sniffJsonDialect({ graphs: [{}] })).toBe("jgf");
        expect(sniffJsonDialect({ graphs: [] })).toBe("jgf");
        expect(sniffJsonDialect({ graphs: [{ nodes: [{ id: "a", type: "person" }] }] })).toBe("jgf");
    });

    it("reads the dialect from a truncated head by the same keys", () => {
        const text = readFileSync(join(FIXTURES, "json", "obographs", "goslim_generic.json"), "utf-8");
        expect(sniffJsonDialectHead(text.slice(0, 1500))).toBe("obographs");
        const jgf = JSON.stringify({ graphs: [{ nodes: [{ id: "a" }], edges: [{ source: "a", target: "b" }] }] });
        expect(sniffJsonDialectHead(jgf.slice(0, jgf.length - 4))).toBe("jgf");
        const edgesFirst = '{"graphs":[{"edges":[{"sub":"a","pred":"is_a","obj":"b"},{"sub":"c"';
        expect(sniffJsonDialectHead(edgesFirst)).toBe("obographs");
    });
});

describe("jsonImporter: the obographs dialect (design 4.6)", () => {
    it("reads nodes and edges with the OBO column vocabulary and CURIE ids", async () => {
        const { s, report } = await load(DOC);
        expect(codes(report)).toEqual([]);
        expect(s.directed).toBe(true);
        expect(s.ids.toArray()).toEqual(["GO:0005575", "GO:0005634", "GO:0000001", `${PURL}T/Female`]);
        expect(edges(s)).toEqual([
            "GO:0005634 is_a GO:0005575",
            "GO:0005634 part_of GO:0005575",
            `${PURL}T/Female instance_of GO:0005575`,
        ]);
        expect(s.nodes.byRole("label")?.meta.name).toBe("name");
        expect(s.edges.byRole("kind")?.meta.name).toBe("relation");
        expect(cell(s, "name", "GO:0005575")).toBe("cellular_component");
        expect(cell(s, "type", "GO:0005575")).toBe("Term");
        expect(cell(s, "type", `${PURL}T/Female`)).toBe("Instance");
        expect(cell(s, "namespace", "GO:0005575")).toBe("cellular_component");
        expect(cell(s, "def", "GO:0005575")).toBe("A part of a cell.");
        expect(cell(s, "def.xrefs", "GO:0005575")).toEqual(["GOC:go_curators"]);
        expect(cell(s, "comment", "GO:0005575")).toBe("c1");
        expect(cell(s, "subset", "GO:0005575")).toEqual(["goslim_generic"]);
        expect(cell(s, "xref", "GO:0005575")).toEqual(["NIF_Subcellular:sao1337158144"]);
        expect(cell(s, "synonym", "GO:0005575")).toEqual([
            { text: "cell or subcellular entity", scope: "EXACT", type: null, xrefs: [] },
            { text: "cc", scope: "RELATED", type: "systematic_synonym", xrefs: [] },
        ]);
        expect(cell(s, "alt_id", "GO:0005575")).toEqual(["GO:0008372"]);
        expect(cell(s, "created_by", "GO:0005575")).toBe("someone");
        expect(cell(s, "property_value", "GO:0005575")).toEqual([
            { relation: "http://purl.org/dc/terms/license", value: "CC-BY", datatype: null },
        ]);
        expect(cell(s, "is_obsolete", "GO:0000001")).toBe(true);
        expect(cell(s, "replaced_by", "GO:0000001")).toEqual(["GO:0005634"]);
        const meta = s.edges.get("meta");
        expect(meta?.isSet(1)).toBe(true);
        expect(meta?.value(1)).toEqual({ comments: ["edge note"] });
        expect(s.meta.sourceFormat).toBe("json");
        expect(s.meta.name).toBe(`${PURL}go/test.owl`);
        expect(s.meta.extra.obographs).toMatchObject({
            ids: "curie",
            graph: {
                id: `${PURL}go/test.owl`,
                meta: { version: "v1" },
                logicalDefinitionAxioms: [{ definedClassId: `${PURL}GO_0005634` }],
            },
            properties: {
                [`${PURL}BFO_0000050`]: { lbl: "part of", shorthand: "part_of", propertyType: "OBJECT" },
                [`${PURL}RO_0002131`]: { lbl: "overlaps" },
            },
            propertyEdges: [{ sub: `${PURL}BFO_0000050`, pred: "subPropertyOf", obj: `${PURL}RO_0002131` }],
        });
    });

    it("keeps the IRIs under oboIds: iri, still naming a relation by its shorthand", async () => {
        const { s } = await load(DOC, { oboIds: "iri" });
        expect(s.ids.toArray()[0]).toBe(`${PURL}GO_0005575`);
        expect(edges(s)[1]).toBe(`${PURL}GO_0005634 part_of ${PURL}GO_0005575`);
        expect(cell(s, "subset", `${PURL}GO_0005575`)).toEqual([`${PURL}go#goslim_generic`]);
        expect(s.meta.extra.obographs).toMatchObject({ ids: "iri" });
    });

    it("makes the properties nodes under typedefs: nodes, named by their shorthand", async () => {
        const { s, report } = await load(DOC, { typedefs: "nodes" });
        expect(codes(report)).toEqual([]);
        expect(s.ids.toArray()).toEqual([
            "GO:0005575",
            "GO:0005634",
            "GO:0000001",
            `${PURL}T/Female`,
            "part_of",
            "RO:0002131",
        ]);
        expect(cell(s, "type", "part_of")).toBe("Typedef");
        expect(cell(s, "propertyType", "part_of")).toBe("OBJECT");
        expect(edges(s).at(-1)).toBe("part_of is_a RO:0002131");
    });

    it("makes a placeholder node for an endpoint missing from nodes, or drops the edge", async () => {
        const doc = { graphs: [{ nodes: [{ id: "a", lbl: "A" }], edges: [{ sub: "a", pred: "is_a", obj: "b" }] }] };
        const { s, report } = await load(doc);
        expect(s.ids.toArray()).toEqual(["a", "b"]);
        expect(cell(s, "graphty.placeholder", "b")).toBe(true);
        expect(codes(report)).toEqual([JSON_ISSUE.DANGLING_REFERENCE]);
        const dropped = await load(doc, { addMissingNodes: false });
        expect(dropped.s.edgeCount).toBe(0);
        expect(codes(dropped.report)).toEqual([JSON_ISSUE.DANGLING_REFERENCE]);
        expect(dropped.report.counts.skippedEdges).toBe(1);
    });

    it("reads the README's outdated subj key with a warning", async () => {
        const doc = { graphs: [{ nodes: [{ id: "a" }, { id: "b" }], edges: [{ subj: "a", pred: "is_a", obj: "b" }] }] };
        const { s, report } = await load(doc);
        expect(edges(s)).toEqual(["a is_a b"]);
        expect(codes(report)).toEqual([JSON_ISSUE.OBOGRAPHS_SUBJ]);
    });

    it("reports what does not fit the schema without dropping what does", async () => {
        const doc = {
            graphs: [
                {
                    nodes: [
                        { lbl: "no id" },
                        "not an object",
                        { id: "a", meta: "not an object", extra: 1 },
                        { id: "b", lbl: 7 },
                        { id: "a", lbl: "again" },
                    ],
                    edges: [{ sub: "a", pred: "is_a" }, 4, { sub: "a", obj: "b" }],
                },
            ],
        };
        const { s, report } = await load(doc);
        expect(s.ids.toArray()).toEqual(["a", "b"]);
        expect(codes(report)).toEqual([
            JSON_ISSUE.MISSING_ID,
            JSON_ISSUE.BAD_ELEMENT,
            JSON_ISSUE.BAD_VALUE,
            JSON_ISSUE.BAD_VALUE,
            JSON_ISSUE.DUPLICATE_NODE,
            JSON_ISSUE.MISSING_ENDPOINT,
            JSON_ISSUE.BAD_ELEMENT,
            JSON_ISSUE.BAD_VALUE,
        ]);
        expect(cell(s, "obo.unrecognized", "a")).toEqual({ extra: 1 });
        expect(cell(s, "name", "a")).toBe("again");
        expect(edges(s)).toEqual(["a ? b"]);
        await fails({ graphs: [{ nodes: "x", edges: [{ sub: "a", obj: "b" }] }] });
    });

    it("reads one graph of several, by index or by name, and lists them", async () => {
        const doc = {
            graphs: [
                { id: "g1", nodes: [{ id: "a", lbl: "A" }] },
                {
                    id: "g2",
                    nodes: [{ id: "b", lbl: "B" }, { id: "c" }],
                    edges: [{ sub: "b", pred: "is_a", obj: "c" }],
                },
            ],
        };
        const first = await load(doc);
        expect(first.s.ids.toArray()).toEqual(["a"]);
        expect(codes(first.report)).toEqual([JSON_ISSUE.MULTIPLE_GRAPHS]);
        expect((await load(doc, { graphIndex: 1 })).s.ids.toArray()).toEqual(["b", "c"]);
        expect((await load(doc, { graphName: "g2" })).s.ids.toArray()).toEqual(["b", "c"]);
        const missing = await fails(doc, { graphName: "nope" });
        expect(codes(missing.report)).toContain(JSON_ISSUE.GRAPH_NOT_FOUND);
        const text = JSON.stringify(doc);
        expect(await listGraphs(text, { format: "json" })).toEqual([
            { index: 0, name: "g1", nodes: 1, edges: 0 },
            { index: 1, name: "g2", nodes: 2, edges: 1 },
        ]);
        const all = await importAllGraphs(text, { format: "json" });
        expect(all.map((r) => r.snapshot.nodeCount)).toEqual([1, 2]);
    });

    it("fails with E_TOO_LARGE before joining a document longer than one JavaScript string", async () => {
        const piece = "x".repeat(2 ** 26);
        async function* huge(): AsyncGenerator<string> {
            yield '{"graphs":[';
            for (let i = 0; i < 9; i++) {
                await Promise.resolve();
                yield piece;
            }
        }
        const b = new GraphBuilder({ directed: true });
        let caught: unknown;
        try {
            await jsonImporter.import(huge(), b);
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(ImportError);
        const issue = (caught as ImportError).report.issues[0];
        expect(issue).toMatchObject({ code: JSON_ISSUE.TOO_LARGE, category: "unsupported" });
    });

    it("refuses an unknown oboIds or typedefs value", async () => {
        await expect(load(DOC, { oboIds: "urn" as "iri" })).rejects.toThrow(/oboIds/);
        await expect(load(DOC, { typedefs: "edges" as "nodes" })).rejects.toThrow(/typedefs/);
    });
});

describe("the .obo and the .json of one ontology (design 4.6, goslim_generic)", () => {
    it("give the same nodes, columns and values, and the same edges", async () => {
        const oboBytes = new Uint8Array(readFileSync(join(FIXTURES, "obo", "go", "goslim_generic.obo")));
        const jsonBytes = new Uint8Array(readFileSync(join(FIXTURES, "json", "obographs", "goslim_generic.json")));
        const fromObo = (await importGraph(oboBytes, { format: "obo" })).snapshot;
        const fromJson = (await importGraph(jsonBytes, { format: "json" })).snapshot;
        expect(fromJson.nodeCount).toBe(fromObo.nodeCount);
        expect(fromJson.edgeCount).toBe(fromObo.edgeCount);
        expect(new Set(fromJson.ids.toArray())).toEqual(new Set(fromObo.ids.toArray()));
        expect(new Set(edges(fromJson))).toEqual(new Set(edges(fromObo)));
        let compared = 0;
        for (const id of fromObo.ids.toArray() as string[]) {
            // list order is not kept by the OWL translation that writes OBO Graphs: compare as sets
            const value = (s: GraphSnapshot, column: string): unknown => {
                const v = cell(s, column, id);
                return Array.isArray(v) ? [...(v as string[])].sort() : v;
            };
            for (const column of ["name", "namespace", "def", "def.xrefs", "subset", "is_obsolete", "alt_id"]) {
                expect(value(fromJson, column), `${id} ${column}`).toEqual(value(fromObo, column));
                compared++;
            }
            const synonyms = (s: GraphSnapshot): unknown =>
                ((cell(s, "synonym", id) ?? []) as { text: string; scope: string }[])
                    .map((x) => `${x.scope} ${x.text}`)
                    .sort();
            expect(synonyms(fromJson), `${id} synonym`).toEqual(synonyms(fromObo));
        }
        expect(compared).toBe(140 * 7);
    });

    it("are both read by importGraph from their bytes alone", async () => {
        const json = readFileSync(join(FIXTURES, "json", "obographs", "goslim_generic.json"));
        const obo = readFileSync(join(FIXTURES, "obo", "go", "goslim_generic.obo"));
        expect((await importGraph(new Uint8Array(json))).report.format).toBe("json");
        expect((await importGraph(new Uint8Array(obo))).report.format).toBe("obo");
        expect(oboImporter.format).toBe("obo");
    });
});
