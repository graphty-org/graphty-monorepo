import { readFileSync } from "node:fs";

import { type ColumnDecl, GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { decodeChunks } from "../../../src/common/writer.js";
import { OBO_LOSS, oboExporter, type OboExportOptions, oboImporter } from "../../../src/formats/obo/index.js";
import { type CommonExportOptions, type CommonImportOptions } from "../../../src/types.js";
import { corpusFiles, corpusPath } from "../../helpers/corpus.js";
import { compareSnapshots, expectSameSnapshot } from "../../helpers/roundtrip.js";

type ExportOptions = OboExportOptions & CommonExportOptions;

async function read(text: string, options?: CommonImportOptions & { typedefs?: "nodes" }): Promise<GraphSnapshot> {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    await oboImporter.import(text, builder, options);
    return builder.freeze();
}

const codes = (snapshot: GraphSnapshot, options?: ExportOptions): string[] =>
    oboExporter.check(snapshot, options).map((n) => n.code);

/** A snapshot from a small description: ids, edges, and columns with their values by row. */
function build(spec: {
    directed?: boolean;
    ids: readonly NodeId[];
    edges?: readonly (readonly [number, number, number?])[];
    nodeColumns?: readonly (ColumnDecl & { values: readonly unknown[] })[];
    edgeColumns?: readonly (ColumnDecl & { values: readonly unknown[] })[];
    meta?: Parameters<GraphBuilder["setMeta"]>[0];
    graph?: Readonly<Record<string, unknown>>;
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
    if (spec.meta !== undefined) {
        b.setMeta(spec.meta);
    }
    return b.freeze();
}

describe("oboExporter: files read from OBO", () => {
    for (const file of corpusFiles("obo")) {
        it(`${file.path} reads back as the same snapshot, with no loss note, and re-exports the same text`, async () => {
            const first = await read(readFileSync(corpusPath("obo", file.path), "utf-8"));
            expect(codes(first)).toEqual([]);
            const text = await oboExporter.exportToString(first);
            const back = await read(text);
            expectSameSnapshot(first, back, { allowExtraColumns: false });
            expect(back.meta.extra.obo).toEqual(first.meta.extra.obo);
            expect(await oboExporter.exportToString(back)).toBe(text);
        });
    }

    it("writes the header, the frames in node order, the kept Typedefs and the placeholders' edges", async () => {
        const first = await read(readFileSync(corpusPath("obo", "basic.obo"), "utf-8"));
        const text = await oboExporter.exportToString(first);
        expect(text).toBe(
            [
                "ontology: test",
                "remark: test manus ontology",
                "",
                "[Term]",
                "id: UBERON:0002398",
                "name: manus",
                'def: "." []',
                "is_a: UBERON:0002470",
                "relationship: part_of UBERON:0002102",
                "",
                "[Term]",
                "id: UBERON:0002470",
                "name: autopod region",
                "relationship: part_of UBERON:0002101",
                "",
                "[Term]",
                "id: UBERON:0002102",
                "name: forelimb",
                "is_a: UBERON:0002101",
                "",
                "[Term]",
                "id: UBERON:0002101",
                "name: limb",
                "",
                "[Typedef]",
                "id: part_of",
                "xref: BFO:0000050",
                "",
            ].join("\n"),
        );
    });

    it("streams the same bytes as exportToString", async () => {
        const first = await read(readFileSync(corpusPath("obo", "nucleus.obo"), "utf-8"));
        expect(await decodeChunks(oboExporter.export(first))).toBe(await oboExporter.exportToString(first));
    });

    it("keeps Typedef nodes, which read back as nodes under typedefs: nodes", async () => {
        const text = readFileSync(corpusPath("obo", "nucleus.obo"), "utf-8");
        const first = await read(text, { typedefs: "nodes" });
        expect(codes(first)).toEqual([OBO_LOSS.TYPEDEF_NODES]);
        const out = await oboExporter.exportToString(first);
        expect(out).toContain("[Typedef]\nid: part_of");
        const back = await read(out, { typedefs: "nodes" });
        expect(new Set(back.ids.toArray())).toEqual(new Set(first.ids.toArray()));
        // by default they are metadata again
        expect((await read(out)).nodeCount).toBeLessThan(first.nodeCount);
    });

    it("writes every vocabulary tag back: qualifiers, descriptions, synonyms, unknown tags", async () => {
        const doc = [
            "format-version: 1.2",
            "synonymtypedef: ABBR \"abbreviation\" EXACT",
            "default-namespace: test",
            "",
            "[Term]",
            "id: T:1",
            "name: one {source=\"a\"}",
            'def: "first \\"term\\"" [X:1 "the source", X:2 {note="q"}]',
            'synonym: "uno" EXACT ABBR [X:3 "three"] {by="me"}',
            "xref: X:1",
            "alt_id: T:9",
            "is_obsolete: false",
            'property_value: seeAlso "a b" xsd:string {k="v"}',
            "property_value: IAO:1 T:2",
            "intersection_of: T:2",
            "intersection_of: part_of T:3",
            "is_a: T:2 {why=\"x\", why=\"y\"}",
            "my_tag: some value",
            "",
            "[Term]",
            "id: T:2",
            "",
            "[Instance]",
            "id: I:1",
            "instance_of: T:2",
        ].join("\n");
        const first = await read(doc);
        expect(codes(first)).toEqual([]);
        const text = await oboExporter.exportToString(first);
        expect(text).toContain('name: one {source="a"}');
        expect(text).toContain('def: "first \\"term\\"" [X:1 "the source", X:2 {note="q"}]');
        expect(text).toContain('synonym: "uno" EXACT ABBR [X:3 "three"] {by="me"}');
        expect(text).toContain("[Instance]\nid: I:1\nnamespace: test\ninstance_of: T:2");
        expect(text).toContain("my_tag: some value");
        expectSameSnapshot(first, await read(text), { allowExtraColumns: false });
    });

    it("drops the default namespace when a written frame has none, so no frame gains one", async () => {
        const first = await read("default-namespace: n\n\n[Term]\nid: A:1\n");
        const edited = build({
            ids: ["A:1", "A:2"],
            nodeColumns: [{ name: "namespace", dtype: "dict", values: ["n", undefined] }],
            meta: { extra: first.meta.extra },
        });
        const text = await oboExporter.exportToString(edited);
        expect(text).not.toContain("default-namespace");
        const back = await read(text);
        expect(back.nodes.get("namespace")?.isSet(1)).toBe(false);
    });
});

describe("oboExporter: any graph", () => {
    const graph = (): GraphSnapshot =>
        build({
            ids: ["a", "b", "c"],
            edges: [
                [0, 1, 2.5],
                [1, 2],
                [0, 2],
            ],
            nodeColumns: [
                { name: "label", dtype: "string", role: "label", values: ["Alpha", "Beta", undefined] },
                { name: "score", dtype: "f64", values: [1.5, Number.NaN, -0] },
                { name: "count", dtype: "i32", values: [3, undefined, -4] },
                { name: "tags", dtype: "list", itemDtype: "string", values: [["x", "y"], [], undefined] },
                { name: "data", dtype: "json", values: [{ k: [1, 2] }, undefined, undefined] },
                { name: "flag", dtype: "bool", values: [true, false, undefined] },
            ],
            edgeColumns: [
                { name: "kind", dtype: "dict", role: "kind", values: ["part_of", undefined, "is_a"] },
                { name: "note", dtype: "string", values: ["n 1", undefined, undefined] },
            ],
            graph: { version: "7" },
            meta: { name: "My graph", created: "2026-10-03T12:30:00Z", creator: "me" },
        });

    it("check() names every difference the re-import shows", () => {
        expect(new Set(codes(graph()))).toEqual(
            new Set([
                OBO_LOSS.COLUMN_AS_PROPERTY_VALUE,
                OBO_LOSS.EDGE_COLUMN_AS_QUALIFIER,
                OBO_LOSS.RELATION_ASSUMED,
                OBO_LOSS.COLUMN_NAME_CHANGED,
                OBO_LOSS.GRAPH_COLUMN_AS_METADATA,
                OBO_LOSS.ONTOLOGY_NAME,
                OBO_LOSS.EDGE_ORDER,
            ]),
        );
    });

    it("writes the extra columns as typed property values with declared relations, the edge columns as qualifiers", async () => {
        const text = await oboExporter.exportToString(graph());
        expect(text.startsWith("format-version: 1.4\ndate: 03:10:2026 12:30\nsaved-by: me\nontology: My_graph\nproperty_value: version \"7\" xsd:string\n")).toBe(true);
        expect(text).toContain(
            [
                "[Term]",
                "id: a",
                "name: Alpha",
                'property_value: score "1.5" xsd:double',
                'property_value: count "3" xsd:integer',
                'property_value: tags "x" xsd:string',
                'property_value: tags "y" xsd:string',
                'property_value: data "{\\"k\\":[1,2]}" xsd:string',
                'property_value: flag "true" xsd:boolean',
                'relationship: part_of b {note="n 1", weight="2.5"}',
                "is_a: c",
            ].join("\n"),
        );
        expect(text).toContain('property_value: score "NaN" xsd:double');
        expect(text).toContain('property_value: score "-0" xsd:double');
        expect(text).toContain("[Typedef]\nid: score\nname: score\nis_metadata_tag: true");
        expect(text).toContain("[Typedef]\nid: part_of\nname: part_of\n");
        const back = await read(text);
        expect(back.nodes.get("name")?.value(0)).toBe("Alpha");
        expect(back.nodes.get("property_value")?.value(2)).toEqual([
            { relation: "score", value: "-0", datatype: "xsd:double" },
            { relation: "count", value: "-4", datatype: "xsd:integer" },
        ]);
        expect(back.edges.get("relation")?.value(1)).toBe("is_a");
        expect(back.edges.get("qualifiers")?.value(0)).toEqual({ note: "n 1", weight: "2.5" });
        expect(back.meta.name).toBe("My_graph");
        expect(back.meta.created).toBe("2026-10-03T12:30");
    });

    it("writes an edge without a relation with the relation option", async () => {
        const g = build({ ids: ["a", "b"], edges: [[0, 1]] });
        expect(await oboExporter.exportToString(g, { relation: "part_of" })).toContain("relationship: part_of b");
        await expect(oboExporter.exportToString(g, { relation: "has part" })).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
        expect(() => oboExporter.check(g, { relation: "has part" })).toThrow(/OBO id/);
    });

    it("writes the ontology option, and refuses one that is not an ontology id", async () => {
        const g = build({ ids: ["a"], meta: { name: "x y" } });
        expect(await oboExporter.exportToString(g, { ontology: "go/slim" })).toBe("format-version: 1.4\nontology: go/slim\n\n[Term]\nid: a\n");
        expect(codes(g, { ontology: "go" })).toEqual([]);
        expect(codes(g)).toEqual([OBO_LOSS.ONTOLOGY_NAME]);
        expect(() => oboExporter.check(g, { ontology: "a b" })).toThrow(/ontology id/);
    });

    it("writes the smallest file", async () => {
        expect(await oboExporter.exportToString(build({ ids: ["X:1"], meta: { name: "x" } }))).toBe(
            "format-version: 1.4\nontology: x\n\n[Term]\nid: X:1\n",
        );
    });

    it("renames a relation that is not an OBO id", async () => {
        const g = build({
            ids: ["a", "b"],
            edges: [[0, 1]],
            edgeColumns: [{ name: "relation", dtype: "string", values: ["binds to"] }],
        });
        expect(new Set(codes(g))).toEqual(new Set([OBO_LOSS.ROLE_ASSUMED, OBO_LOSS.RELATION_RENAMED]));
        expect(await oboExporter.exportToString(g)).toContain("relationship: binds_to b");
    });

    it("reads an unchanged name role column as the label", async () => {
        const g = build({ ids: ["a"], nodeColumns: [{ name: "name", dtype: "string", values: ["A"] }] });
        expect(codes(g)).toEqual([OBO_LOSS.ROLE_ASSUMED]);
        expect((await read(await oboExporter.exportToString(g))).nodes.byRole("label")?.value(0)).toBe("A");
    });

    it("writes a name with surrounding space as a property value (the reader trims a tag value)", async () => {
        const g = build({ ids: ["a"], nodeColumns: [{ name: "label", dtype: "string", role: "label", values: [" A "] }] });
        expect(codes(g)).toEqual([OBO_LOSS.COLUMN_AS_PROPERTY_VALUE]);
        const back = await read(await oboExporter.exportToString(g));
        expect(back.nodes.get("property_value")?.value(0)).toEqual([{ relation: "label", value: " A ", datatype: "xsd:string" }]);
    });

    it("escapes what would end a value, and reports a carriage return", async () => {
        const name = 'a ! b {c} [d], "e" \\ f\tg\nh';
        const g = build({
            ids: ["a"],
            nodeColumns: [
                { name: "name", dtype: "string", values: [name] },
                { name: "note", dtype: "string", values: ["x\r\ny"] },
            ],
        });
        expect(codes(g)).toContain(OBO_LOSS.LINE_END);
        const text = await oboExporter.exportToString(g);
        expect(text).toContain('name: a \\! b \\{c\\} \\[d\\]\\, \\"e\\" \\\\ f\\tg\\nh');
        expect(text).not.toContain("\\W");
        const back = await read(text);
        expect(back.nodes.get("name")?.value(0)).toBe(name);
        expect(back.nodes.get("property_value")?.value(0)).toEqual([{ relation: "note", value: "x\ny", datatype: "xsd:string" }]);
    });

    it("refuses ids that are not OBO ids, and under mangle writes them with the originals restored on import", async () => {
        const g = build({ ids: ["a b", "a_b", "c{1}", 'd"', "[e"], edges: [[0, 2]] });
        expect(codes(g)).toContain(OBO_LOSS.ID_CHARSET);
        await expect(oboExporter.exportToString(g)).rejects.toMatchObject({ code: "E_INVALID_ID", details: { reason: "charset" } });
        expect(codes(g, { sanitizeIds: "mangle" })).toContain(OBO_LOSS.ID_MANGLED);
        const text = await oboExporter.exportToString(g, { sanitizeIds: "mangle" });
        expect(text).toContain("id: a_b_2\nproperty_value: graphty:originalId \"\\\"a b\\\"\" xsd:string\nis_a: c_1_");
        expect(text).toContain('id: d\\"');
        expect(text).toContain("id: \\[e");
        const back = await read(text);
        expect(back.ids.toArray()).toEqual(g.ids.toArray());
        expect(back.nodes.get("property_value")).toBeNull();
        const kept = await read(text, { restoreMangledIds: false });
        expect(kept.ids.toArray()).toEqual(["a_b_2", "a_b", "c_1_", 'd"', "[e"]);
    });

    it("reports numeric ids, and refuses two ids with one text", async () => {
        const numeric = build({ ids: [1, 2], edges: [[0, 1]] });
        expect(codes(numeric)).toEqual([OBO_LOSS.ID_TEXT_TYPE, OBO_LOSS.RELATION_ASSUMED]);
        expect((await read(await oboExporter.exportToString(numeric))).ids.toArray()).toEqual(["1", "2"]);
        const clash = build({ ids: [5, "5"] });
        expect(codes(clash)).toContain(OBO_LOSS.ID_TEXT_COLLISION);
        await expect(oboExporter.exportToString(clash)).rejects.toMatchObject({ code: "E_INVALID_ID" });
    });

    it("writes an undirected graph one way, and refuses a mixed graph under onMixedDirection error", async () => {
        const undirected = build({ directed: false, ids: ["a", "b"], edges: [[0, 1]] });
        expect(codes(undirected)).toContain(OBO_LOSS.UNDIRECTED_AS_DIRECTED);
        expect((await read(await oboExporter.exportToString(undirected))).directed).toBe(true);
        const mixed = build({
            ids: ["a", "b"],
            edges: [
                [0, 1],
                [1, 0],
            ],
            edgeColumns: [
                { name: "graphty.directed", dtype: "bool", role: "directed", values: [false, false] },
                { name: "graphty.pair", dtype: "u32", role: "pair", values: [1, 0] },
            ],
        });
        expect(codes(mixed)).toContain(OBO_LOSS.MIXED_DIRECTION_ERROR);
        await expect(oboExporter.exportToString(mixed)).rejects.toMatchObject({ code: "E_DIRECTED" });
        const folded = await oboExporter.exportToString(mixed, { onMixedDirection: "directed" });
        expect(folded.match(/is_a:/g)).toHaveLength(1);
        expect(codes(mixed, { onMixedDirection: "directed" })).toContain(OBO_LOSS.UNDIRECTED_AS_DIRECTED);
    });

    it("reports parallel edges that read back as one clause", async () => {
        const g = build({
            ids: ["a", "b"],
            edges: [
                [0, 1],
                [0, 1],
            ],
        });
        expect(codes(g)).toContain(OBO_LOSS.DUPLICATE_CLAUSE);
        expect((await read(await oboExporter.exportToString(g))).edgeCount).toBe(1);
    });

    it("writes a placeholder without a frame, and reports the node order a re-import gives it", async () => {
        const placeholder = { name: "graphty.placeholder", dtype: "bool" as const };
        const last = build({ ids: ["a", "p"], edges: [[0, 1]], nodeColumns: [{ ...placeholder, values: [undefined, true] }] });
        const text = await oboExporter.exportToString(last);
        expect(text).not.toContain("id: p");
        expect(codes(last)).toEqual([OBO_LOSS.RELATION_ASSUMED]);
        const back = await read(text);
        expect(compareSnapshots(last, back).filter((d) => !d.path.startsWith("edges.relation"))).toEqual([]);
        const first = build({ ids: ["p", "a"], edges: [[1, 0]], nodeColumns: [{ ...placeholder, values: [true, undefined] }] });
        expect(codes(first)).toContain(OBO_LOSS.NODE_ORDER);
        // a placeholder with an edge of its own needs its frame
        const source = build({ ids: ["p", "a"], edges: [[0, 1]], nodeColumns: [{ ...placeholder, values: [true, undefined] }] });
        expect(await oboExporter.exportToString(source)).toContain("id: p");
        expect(codes(source)).toContain(OBO_LOSS.COLUMN_AS_PROPERTY_VALUE);
    });

    it("reports a column without a value and the roles OBO has no slot for", () => {
        const g = build({
            ids: ["a", "b"],
            edges: [[0, 1]],
            nodeColumns: [
                { name: "empty", dtype: "string", values: [] },
                { name: "group", dtype: "string", role: "kind", values: ["g"] },
            ],
            edgeColumns: [{ name: "title", dtype: "string", role: "label", values: ["t"] }],
        });
        const found = codes(g);
        expect(found).toContain(OBO_LOSS.EMPTY_COLUMN_DROPPED);
        expect(found.filter((c) => c === OBO_LOSS.ROLE_DROPPED)).toHaveLength(2);
    });

    it("reports a vocabulary column of the other text dtype", () => {
        const g = build({ ids: ["a"], nodeColumns: [{ name: "namespace", dtype: "string", values: ["n"] }] });
        expect(codes(g)).toEqual([OBO_LOSS.DTYPE_UNSUPPORTED]);
    });
});
