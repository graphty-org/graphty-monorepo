import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type ColumnDecl, GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { decodeChunks } from "../../../src/common/writer.js";
import { JSON_LOSS, jsonExporter, type JsonExportOptions } from "../../../src/formats/json/index.js";
import { importGraph } from "../../../src/registry.js";
import { type CommonExportOptions } from "../../../src/types.js";
import { expectSameSnapshot } from "../../helpers/roundtrip.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "conformance", "fixtures");
const PURL = "http://purl.obolibrary.org/obo/";
const OBO_GRAPHS = { dialect: "obographs" } as const;

type Options = JsonExportOptions & CommonExportOptions;

async function load(bytes: Uint8Array | string, format: string, options = {}): Promise<GraphSnapshot> {
    const input = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
    return (await importGraph(input, { format, ...options })).snapshot;
}

const codes = (snapshot: GraphSnapshot, options: Options = OBO_GRAPHS): string[] =>
    jsonExporter.check(snapshot, options).map((n) => n.code);

async function roundTrip(snapshot: GraphSnapshot, options: Options = OBO_GRAPHS): Promise<{ text: string; back: GraphSnapshot }> {
    const text = await jsonExporter.exportToString(snapshot, options);
    return { text, back: await load(text, "json") };
}

function build(spec: {
    directed?: boolean;
    ids: readonly NodeId[];
    edges?: readonly (readonly [number, number, number?])[];
    nodeColumns?: readonly (ColumnDecl & { values: readonly unknown[] })[];
    edgeColumns?: readonly (ColumnDecl & { values: readonly unknown[] })[];
    graph?: Readonly<Record<string, unknown>>;
    name?: string;
}): GraphSnapshot {
    const b = new GraphBuilder({ directed: spec.directed ?? true, weightDtype: "f64" });
    b.addNodes(spec.ids);
    for (const { values, ...decl } of spec.nodeColumns ?? []) {
        b.declareNodeColumn(decl);
        values.forEach((v, i) => {
            if (v !== undefined) {
                b.setNodeValue(decl.name, i, v);
            }
        });
    }
    for (const [s, t, w] of spec.edges ?? []) {
        b.addEdge(spec.ids[s], spec.ids[t], w);
    }
    for (const { values, ...decl } of spec.edgeColumns ?? []) {
        b.declareEdgeColumn(decl);
        values.forEach((v, e) => {
            if (v !== undefined) {
                b.setEdgeValue(decl.name, e, v);
            }
        });
    }
    for (const [name, value] of Object.entries(spec.graph ?? {})) {
        b.setGraphValue(name, value);
    }
    if (spec.name !== undefined) {
        b.setMeta({ name: spec.name });
    }
    return b.freeze();
}

describe("the obographs dialect: files read from OBO Graphs", () => {
    const dir = join(FIXTURES, "json", "obographs");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        it(`${file} reads back as the same snapshot, with no loss note`, async () => {
            const first = await load(new Uint8Array(readFileSync(join(dir, file))), "json");
            // the dialect the file was read as is the default
            expect(codes(first, {})).toEqual([]);
            const text = await jsonExporter.exportToString(first);
            const back = await load(text, "json");
            expectSameSnapshot(first, back, { allowExtraColumns: false });
            expect(back.meta.extra.obographs).toEqual(first.meta.extra.obographs);
            expect(await jsonExporter.exportToString(back)).toBe(text);
        });
    }

    it("writes ids and relations as the IRIs the file had", async () => {
        const first = await load(new Uint8Array(readFileSync(join(dir, "basic.json"))), "json");
        const doc = JSON.parse(await jsonExporter.exportToString(first)) as {
            graphs: { id: string; nodes: { id: string }[]; edges: { sub: string; pred: string; obj: string }[] }[];
        };
        const [graph] = doc.graphs;
        expect(graph.id).toBe(`${PURL}test.owl`);
        expect(graph.nodes.map((n) => n.id)).toContain(`${PURL}UBERON_0002398`);
        expect(graph.edges).toContainEqual({ sub: `${PURL}UBERON_0002398`, pred: `${PURL}BFO_0000050`, obj: `${PURL}UBERON_0002102` });
        expect(graph.edges).toContainEqual({ sub: `${PURL}UBERON_0002398`, pred: "is_a", obj: `${PURL}UBERON_0002470` });
    });

    it("streams the same bytes as exportToString, and indents on request", async () => {
        const first = await load(new Uint8Array(readFileSync(join(dir, "nucleus.json"))), "json");
        expect(await decodeChunks(jsonExporter.export(first, OBO_GRAPHS))).toBe(await jsonExporter.exportToString(first, OBO_GRAPHS));
        const indented = await jsonExporter.exportToString(first, { ...OBO_GRAPHS, indent: 2 });
        expect(indented).toContain('\n  {"id":');
        expectSameSnapshot(first, await load(indented, "json"));
    });

    it("reports ids that the importer's default oboIds reads back otherwise", async () => {
        const iri = await load(new Uint8Array(readFileSync(join(dir, "basic.json"))), "json", { oboIds: "iri" });
        expect(codes(iri)).toContain(JSON_LOSS.OBOGRAPHS_ID_CHANGED);
        const { back } = await roundTrip(iri);
        expect(back.ids.toArray()).toContain("UBERON:0002398");
        expectSameSnapshot(iri, await load(await jsonExporter.exportToString(iri, OBO_GRAPHS), "json", { oboIds: "iri" }));
    });
});

describe("the obographs dialect: files read from OBO", () => {
    it("goslim_generic.obo written as OBO Graphs reads back like goslim_generic.json", async () => {
        const fromObo = await load(new Uint8Array(readFileSync(join(FIXTURES, "obo", "go", "goslim_generic.obo"))), "obo");
        const fromJson = await load(new Uint8Array(readFileSync(join(FIXTURES, "json", "obographs", "goslim_generic.json"))), "json");
        const notes = codes(fromObo);
        expect(new Set(notes)).toEqual(new Set([JSON_LOSS.COLUMN_AS_PROPERTY_VALUE, JSON_LOSS.OBOGRAPHS_DATATYPE_DROPPED]));
        const { back } = await roundTrip(fromObo);
        expect(back.ids.toArray()).toEqual(fromObo.ids.toArray());
        expect(back.edgeCount).toBe(fromObo.edgeCount);
        const cell = (s: GraphSnapshot, column: string, id: string): unknown => {
            const c = s.nodes.get(column);
            const i = s.ids.indexOf(id);
            const v = c?.isSet(i) === true ? c.value(i) : undefined;
            return Array.isArray(v) ? [...(v as string[])].sort() : v;
        };
        for (const id of fromObo.ids.toArray() as string[]) {
            for (const column of ["name", "namespace", "def", "def.xrefs", "subset", "is_obsolete", "alt_id", "synonym"]) {
                expect(cell(back, column, id), `${id} ${column}`).toEqual(cell(fromObo, column, id));
                if (column !== "synonym") {
                    expect(cell(back, column, id), `${id} ${column}`).toEqual(cell(fromJson, column, id));
                }
            }
        }
    });

    it("writes Typedef nodes as PROPERTY nodes with their shorthand", async () => {
        const first = await load(new Uint8Array(readFileSync(join(FIXTURES, "obo", "obographs", "basic.obo"))), "obo", { typedefs: "nodes" });
        expect(codes(first)).toContain(JSON_LOSS.TYPEDEF_NODES);
        const { text } = await roundTrip(first);
        expect(text).toContain('"type":"PROPERTY"');
        const back = await load(text, "json", { typedefs: "nodes" });
        expect(new Set(back.ids.toArray())).toEqual(new Set(first.ids.toArray()));
    });
});

describe("the obographs dialect: any graph", () => {
    const graph = (): GraphSnapshot =>
        build({
            ids: [1, "b", "c"],
            edges: [
                [0, 1, 2.5],
                [1, 2],
            ],
            nodeColumns: [
                { name: "label", dtype: "string", role: "label", values: ["A", "B", undefined] },
                { name: "score", dtype: "f64", values: [1.5, Number.POSITIVE_INFINITY, undefined] },
            ],
            edgeColumns: [
                { name: "kind", dtype: "dict", role: "kind", values: ["part_of", undefined] },
                { name: "n", dtype: "i32", values: [4, undefined] },
            ],
            graph: { version: "7" },
            name: "g",
        });

    it("check() names every difference the re-import shows", () => {
        expect(new Set(codes(graph()))).toEqual(
            new Set([
                JSON_LOSS.ID_TEXT_TYPE,
                JSON_LOSS.COLUMN_AS_PROPERTY_VALUE,
                JSON_LOSS.OBOGRAPHS_EDGE_COLUMN_AS_META,
                JSON_LOSS.RELATION_ASSUMED,
                JSON_LOSS.COLUMN_NAME_CHANGED,
                JSON_LOSS.GRAPH_COLUMN_AS_METADATA,
            ]),
        );
    });

    it("writes ids under the ontology IRI, extra columns as basicPropertyValues, edge columns in meta", async () => {
        const { text, back } = await roundTrip(graph());
        const doc = JSON.parse(text) as {
            graphs: { id: string; lbl: string; meta: unknown; nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }[];
        };
        const [g] = doc.graphs;
        expect(g.id).toBe(`${PURL}g.owl`);
        expect(g.meta).toEqual({ basicPropertyValues: [{ pred: "version", val: "7" }] });
        expect(g.nodes[0]).toEqual({
            id: `${PURL}g.owl#1`,
            lbl: "A",
            type: "CLASS",
            meta: { basicPropertyValues: [{ pred: "score", val: "1.5" }] },
        });
        expect(g.edges[0]).toEqual({ sub: `${PURL}g.owl#1`, pred: `${PURL}g.owl#part_of`, obj: `${PURL}g.owl#b`, meta: { n: 4, weight: 2.5 } });
        expect(g.edges[1]).toEqual({ sub: `${PURL}g.owl#b`, pred: "is_a", obj: `${PURL}g.owl#c` });
        expect(back.ids.toArray()).toEqual(["1", "b", "c"]);
        expect(back.edges.get("relation")?.value(0)).toBe("part_of");
        expect(back.nodes.get("name")?.value(1)).toBe("B");
        expect(back.edges.get("meta")?.value(0)).toEqual({ n: 4, weight: 2.5 });
    });

    it("takes the ontology IRI option, and writes an id as it is where the IRI would not read back as the id", async () => {
        const purl = await roundTrip(graph(), { ...OBO_GRAPHS, ontologyIri: `${PURL}other.owl` });
        expect(purl.text).toContain(`"id":"${PURL}other.owl#b"`);
        expect(purl.back.ids.toArray()).toEqual(["1", "b", "c"]);
        // an IRI outside the OBO PURLs is not compacted on import, so the plain id is written
        const other = await roundTrip(graph(), { ...OBO_GRAPHS, ontologyIri: "http://example.org/onto" });
        expect(other.text).toContain('"id":"b"');
        expect(other.back.ids.toArray()).toEqual(["1", "b", "c"]);
        expect(codes(graph(), { ...OBO_GRAPHS, ontologyIri: "http://example.org/onto" })).not.toContain(JSON_LOSS.OBOGRAPHS_ID_CHANGED);
    });

    it("writes CURIEs as OBO PURLs", async () => {
        const g = build({ ids: ["GO:1", "my_x:2"], edges: [[0, 1]], edgeColumns: [{ name: "relation", dtype: "string", values: ["BFO:0000050"] }] });
        const { text, back } = await roundTrip(g);
        expect(text).toContain(`"id":"${PURL}GO_1"`);
        expect(text).toContain(`"pred":"${PURL}BFO_0000050"`);
        expect(back.ids.toArray()).toEqual(["GO:1", "my_x:2"]);
        expect(codes(g)).toEqual([JSON_LOSS.ROLE_ASSUMED]);
    });

    it("reports non-finite values written as null, and an undirected graph read back directed", async () => {
        const g = build({
            directed: false,
            ids: ["a", "b"],
            edges: [[0, 1]],
            edgeColumns: [{ name: "x", dtype: "f64", values: [Number.NaN] }],
        });
        const found = codes(g);
        expect(found).toContain(JSON_LOSS.NONFINITE_AS_NULL);
        expect(found).toContain(JSON_LOSS.DIRECTION_DROPPED);
        expect((await roundTrip(g)).back.directed).toBe(true);
    });
});
