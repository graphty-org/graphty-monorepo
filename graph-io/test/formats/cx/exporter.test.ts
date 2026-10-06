import { GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { CX_CAPABILITIES, CX_LOSS, cxExporter } from "../../../src/formats/cx/index.js";
import { importGraph } from "../../../src/registry.js";
import { corpusFiles, readCorpusInput } from "../../helpers/corpus.js";
import { expectSameSnapshot } from "../../helpers/roundtrip.js";

type Doc = Record<string, unknown[]>[];

const read = async (text: string, options: Record<string, unknown> = {}): Promise<GraphSnapshot> =>
    (await importGraph(text, { format: "cx", ...options })).snapshot;

const codes = (snapshot: GraphSnapshot, options = {}): string[] =>
    cxExporter.check(snapshot, options).map((n) => n.code);

const write = async (snapshot: GraphSnapshot, options = {}): Promise<Doc> =>
    JSON.parse(await cxExporter.exportToString(snapshot, options)) as Doc;

const aspect = (doc: Doc, name: string): unknown[] => doc.find((m) => name in m)?.[name] ?? [];

/** Export, re-import through the CX importer, and return both the notes and the re-import. */
async function roundTrip(snapshot: GraphSnapshot, options = {}): Promise<{ notes: string[]; back: GraphSnapshot }> {
    const notes = codes(snapshot, options);
    const back = await read(await cxExporter.exportToString(snapshot, options));
    return { notes, back };
}

const DOC = JSON.stringify([
    { numberVerification: [{ longNumber: 281474976710655 }] },
    {
        nodes: [{ "@id": 1, n: "A", r: "uniprot:P1" }, { "@id": 2, n: "B" }, { "@id": 9 }],
    },
    {
        edges: [
            { "@id": 3, s: 1, t: 2, i: "binds" },
            { "@id": 4, s: 2, t: 2 },
        ],
    },
    {
        nodeAttributes: [
            { po: 1, n: "score", v: "1.5", d: "double" },
            { po: 2, n: "score", v: "NaN", d: "double" },
            { po: 9, n: "score", v: "-Infinity", d: "double" },
            { po: 1, n: "count", v: "9007199254740991", d: "long" },
            { po: 1, n: "rank", v: "-2", d: "integer" },
            { po: 2, n: "ok", v: "true", d: "boolean" },
            { po: 1, n: "tags", v: ["", "null", "x"], d: "list_of_string" },
            { po: 2, n: "hits", v: ["1.5", "NaN", "-0"], d: "list_of_double" },
        ],
    },
    { edgeAttributes: [{ po: 3, n: "weight", v: "0.25", d: "double" }] },
    {
        networkAttributes: [
            { n: "name", v: "Net" },
            { n: "description", v: "A network" },
            { n: "version", v: "2", d: "integer" },
        ],
    },
    { cyTableColumn: [{ applies_to: "node_table", n: "never", d: "integer" }] },
    {
        cartesianLayout: [
            { node: 1, x: 10.5, y: 20, z: 3 },
            { node: 2, x: -1, y: -2 },
        ],
    },
    {
        cyVisualProperties: [
            { properties_of: "nodes:default", applies_to: 5, view: 5, properties: { NODE_SHAPE: "ELLIPSE" } },
            { properties_of: "nodes", applies_to: 2, properties: { NODE_FILL_COLOR: "#FF0000" } },
            { properties_of: "network", properties: { NETWORK_BACKGROUND_PAINT: "#FFFFFF" } },
        ],
    },
    { ndexStatus: [{ externalId: "abc" }] },
    { status: [{ error: "", success: true }] },
]);

describe("cxExporter", () => {
    it("writes a CX file that reads back as the same snapshot, as text and as bytes", async () => {
        const first = await read(DOC);
        expect(codes(first)).toEqual([]);
        const text = await cxExporter.exportToString(first);
        const back = await read(text);
        expectSameSnapshot(first, back);
        expect(back.meta.name).toBe("Net");
        expect(back.meta.description).toBe("A network");
        expect(back.nodes.get("never")?.dtype).toBe("i32");
        const chunks: number[] = [];
        for await (const chunk of cxExporter.export(first)) {
            chunks.push(...chunk);
        }
        expect(new TextDecoder().decode(new Uint8Array(chunks))).toBe(text);
    });

    it("writes the NDEx aspect order, metadata with idCounter, values as strings and screen coordinates", async () => {
        const doc = await write(await read(DOC));
        expect(doc[0]).toEqual({ numberVerification: [{ longNumber: 281474976710655 }] });
        expect(Object.keys(doc[doc.length - 1])).toEqual(["status"]);
        expect(doc.map((m) => Object.keys(m)[0])).toEqual([
            "numberVerification",
            "metaData",
            "nodes",
            "edges",
            "nodeAttributes",
            "edgeAttributes",
            "networkAttributes",
            "cyTableColumn",
            "cartesianLayout",
            "cyVisualProperties",
            "ndexStatus",
            "status",
        ]);
        expect(aspect(doc, "metaData")).toContainEqual({
            name: "nodes",
            version: "1.0",
            idCounter: 10,
            elementCount: 3,
            consistencyGroup: 1,
        });
        expect(aspect(doc, "nodes")[0]).toEqual({ "@id": 1, n: "A", r: "uniprot:P1" });
        expect(aspect(doc, "edges")[0]).toEqual({ "@id": 3, s: 1, t: 2, i: "binds" });
        expect(aspect(doc, "nodeAttributes")).toContainEqual({ po: 1, n: "score", v: "1.5", d: "double" });
        expect(aspect(doc, "nodeAttributes")).toContainEqual({
            po: 2,
            n: "hits",
            v: ["1.5", "NaN", "-0"],
            d: "list_of_double",
        });
        expect(aspect(doc, "nodeAttributes")).toContainEqual({ po: 1, n: "count", v: "9007199254740991", d: "long" });
        expect(aspect(doc, "nodeAttributes").some((a) => (a as { n: string }).n === "name")).toBe(false);
        expect(aspect(doc, "edgeAttributes")).toEqual([{ po: 3, n: "weight", v: "0.25", d: "double" }]);
        expect(aspect(doc, "cartesianLayout")[0]).toEqual({ node: 1, x: 10.5, y: 20, z: 3 });
        expect(aspect(doc, "cyVisualProperties")).toEqual([
            { properties_of: "network", properties: { NETWORK_BACKGROUND_PAINT: "#FFFFFF" } },
            { properties_of: "nodes:default", applies_to: 0, view: 0, properties: { NODE_SHAPE: "ELLIPSE" } },
            { properties_of: "nodes", applies_to: 2, properties: { NODE_FILL_COLOR: "#FF0000" } },
        ]);
        expect(aspect(doc, "cyTableColumn")).toContainEqual({ applies_to: "node_table", n: "never", d: "integer" });
    });

    it("writes the smallest file for one node", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode(0);
        expect(await cxExporter.exportToString(b.freeze())).toBe(
            [
                '[{"numberVerification":[{"longNumber":281474976710655}]},',
                '{"metaData":[{"name":"nodes","version":"1.0","idCounter":1,"elementCount":1,"consistencyGroup":1}]},',
                '{"nodes":[',
                '{"@id":0}]},',
                '{"status":[{"error":"","success":true}]}]',
                "",
            ].join("\n"),
        );
    });

    it("round-trips every CX corpus file", async () => {
        for (const file of corpusFiles("cx")) {
            const first = (await importGraph(readCorpusInput("cx", file.path), { format: "cx" })).snapshot;
            expect(codes(first), file.path).toEqual([]);
            expectSameSnapshot(first, await read(await cxExporter.exportToString(first)));
        }
    });

    it("refuses string ids by default, and keeps them through mangle and restoreMangledIds", async () => {
        const graphml = `<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">
            <key id="w" for="node" attr.name="weightless" attr.type="string"/>
            <graph edgedefault="directed"><node id="a"><data key="w">x</data></node><node id="b"/><node id="7"/>
            <edge source="a" target="b"/><edge source="b" target="7"/></graph></graphml>`;
        const first = (await importGraph(graphml, { format: "graphml" })).snapshot;
        expect(codes(first)).toContain(CX_LOSS.ID_CHARSET);
        await expect(cxExporter.exportToString(first)).rejects.toThrow(GraphFormatError);
        expect(codes(first, { sanitizeIds: "mangle" })).toContain(CX_LOSS.ID_MANGLED);
        const text = await cxExporter.exportToString(first, { sanitizeIds: "mangle" });
        const back = await read(text);
        expect(back.ids.toArray()).toEqual(first.ids.toArray());
        expect(back.nodes.get("graphty:originalId")).toBeNull();
        expectSameSnapshot(first, back, { ignoreRoles: ["id"] });
        const kept = await read(text, { restoreMangledIds: false });
        expect(kept.nodes.get("graphty:originalId")?.value(0)).toBe("a");
    });

    it("keeps integer ids beyond 2^53 as raw literals", async () => {
        const big = "90071992547409930";
        const first = await read(
            `[{"nodes":[{"@id":${big},"n":"big"},{"@id":1}]},{"edges":[{"@id":0,"s":${big},"t":1}]}]`,
        );
        const text = await cxExporter.exportToString(first);
        expect(text).toContain(`{"@id":${big},"n":"big"}`);
        expect(text).toContain(`"idCounter":${big.slice(0, -1)}1`);
        expectSameSnapshot(first, await read(text));
    });

    it("writes cyGroups from the parent columns with internal and external edges", async () => {
        const b = new GraphBuilder({ directed: true });
        for (const id of [1, 2, 3, 10]) {
            b.addNode(id);
        }
        b.addEdge(1, 2);
        b.addEdge(2, 3);
        b.declareNodeColumn({ name: "parent", dtype: "u32", role: "parent", refersTo: "node" });
        b.setNodeValue("parent", 0, 3);
        b.setNodeValue("parent", 1, 3);
        const first = b.freeze();
        expect(codes(first)).toEqual([CX_LOSS.EDGE_IDS_GENERATED]);
        const doc = await write(first);
        expect(aspect(doc, "cyGroups")).toEqual([
            { "@id": 10, nodes: [1, 2], internal_edges: [0], external_edges: [1] },
        ]);
        expectSameSnapshot(first, await read(JSON.stringify(doc)), { ignoreRoles: ["id"] });

        const several = new GraphBuilder({ directed: true });
        for (const id of [1, 2, 3]) {
            several.addNode(id);
        }
        several.declareNodeColumn({
            name: "parents",
            dtype: "list",
            itemDtype: "u32",
            role: "parents",
            refersTo: "node",
        });
        several.setNodeValue("parents", 0, [1, 2]);
        const multi = several.freeze();
        expect(codes(multi)).toEqual([]);
        expectSameSnapshot(multi, await read(await cxExporter.exportToString(multi)));

        const single = new GraphBuilder({ directed: true });
        single.addNode(1);
        single.addNode(2);
        single.declareNodeColumn({
            name: "parents",
            dtype: "list",
            itemDtype: "u32",
            role: "parents",
            refersTo: "node",
        });
        single.setNodeValue("parents", 0, [1]);
        const one = single.freeze();
        expect(codes(one)).toEqual([CX_LOSS.COLUMN_NAME_CHANGED]);
        const back = await read(await cxExporter.exportToString(one));
        expect(back.nodes.byRole("parent")?.value(0)).toBe(1);
    });

    it("writes the provenance aspects back", async () => {
        const text = JSON.stringify([
            { nodes: [{ "@id": 1 }, { "@id": 2 }] },
            { edges: [{ "@id": 5, s: 1, t: 2 }] },
            { citations: [{ "@id": 7, "dc:title": "A paper" }] },
            { supports: [{ "@id": 8, text: "evidence", citation: 7 }] },
            { nodeCitations: [{ po: [1, 2], citations: [7] }] },
            { edgeSupports: [{ po: [5], supports: [8] }] },
            { functionTerms: [{ po: 1, f: "bel:p", args: ["HGNC:A"] }] },
            { reifiedEdges: [{ node: 2, edge: 5 }] },
        ]);
        const first = await read(text);
        expect(codes(first)).toEqual([]);
        const doc = await write(first);
        expect(aspect(doc, "citations")).toEqual([{ "@id": 7, "dc:title": "A paper" }]);
        expect(aspect(doc, "nodeCitations")).toEqual([
            { po: [1], citations: [7] },
            { po: [2], citations: [7] },
        ]);
        expect(aspect(doc, "functionTerms")).toEqual([{ po: 1, f: "bel:p", args: ["HGNC:A"] }]);
        expect(aspect(doc, "reifiedEdges")).toEqual([{ node: 2, edge: 5 }]);
        expect(aspect(doc, "metaData")).toContainEqual({
            name: "citations",
            version: "1.0",
            idCounter: 8,
            elementCount: 1,
            consistencyGroup: 1,
        });
        expectSameSnapshot(first, await read(JSON.stringify(doc)));
    });

    it("writes back the style rules and unknown aspects of a collection's own subnetwork only", async () => {
        const collection = JSON.stringify([
            { nodes: [{ "@id": 1 }, { "@id": 2 }] },
            {
                cySubNetworks: [
                    { "@id": 50, nodes: [1] },
                    { "@id": 60, nodes: [2] },
                ],
            },
            {
                cyNetworkRelations: [
                    { c: 50, name: "first" },
                    { c: 60, name: "second" },
                    { p: 50, c: 51, r: "view" },
                    { p: 60, c: 61, r: "view" },
                ],
            },
            {
                cyVisualProperties: [
                    { properties_of: "nodes:default", applies_to: 51, view: 51, properties: { NODE_SIZE: "10" } },
                    { properties_of: "nodes:default", applies_to: 61, view: 61, properties: { NODE_SIZE: "99" } },
                ],
            },
            {
                cyHiddenAttributes: [
                    { n: "own", v: "x", s: 50 },
                    { n: "other", v: "y", s: 60 },
                    { n: "all", v: "z" },
                ],
            },
            { "CX Element ID": [{ "1": 1 }] },
        ]);
        const first = await read(collection, { graphIndex: 0 });
        const doc = await write(first);
        const names = doc.map((m) => Object.keys(m)[0]);
        expect(names).not.toContain("cySubNetworks");
        expect(names).not.toContain("cyNetworkRelations");
        expect(names).not.toContain("CX Element ID");
        expect(aspect(doc, "cyVisualProperties")).toEqual([
            { properties_of: "nodes:default", applies_to: 0, view: 0, properties: { NODE_SIZE: "10" } },
        ]);
        expect(aspect(doc, "cyHiddenAttributes")).toEqual([
            { n: "own", v: "x" },
            { n: "all", v: "z" },
        ]);
        expectSameSnapshot(first, await read(JSON.stringify(doc)));
    });

    it("announces undirected edges, mutual pairs and the refusal of mixed direction", async () => {
        const undirected = new GraphBuilder({ directed: false });
        undirected.addEdge(1, 2);
        const u = undirected.freeze();
        expect(codes(u)).toEqual([CX_LOSS.EDGE_IDS_GENERATED, CX_LOSS.UNDIRECTED_AS_DIRECTED]);
        expect((await read(await cxExporter.exportToString(u))).directed).toBe(true);

        const mixed = (
            await importGraph("graph [ directed 1 edge [ source 1 target 2 ] edge [ source 2 target 3 directed 0 ] ]", {
                format: "gml",
            })
        ).snapshot;
        expect(codes(mixed)).toContain("E_MIXED_DIRECTION");
        await expect(cxExporter.exportToString(mixed)).rejects.toThrow(GraphFormatError);
        expect(codes(mixed, { onMixedDirection: "directed" })).toContain(CX_LOSS.UNDIRECTED_AS_DIRECTED);
        const folded = await read(await cxExporter.exportToString(mixed, { onMixedDirection: "directed" }));
        expect(folded.edgeCount).toBe(2);

        const gexf = `<?xml version="1.0"?><gexf xmlns="http://gexf.net/1.3" version="1.3"><graph defaultedgetype="directed">
            <nodes><node id="1"/><node id="2"/></nodes><edges><edge id="0" source="1" target="2" type="mutual"/></edges>
            </graph></gexf>`;
        const mutual = (await importGraph(gexf, { format: "gexf" })).snapshot;
        expect(codes(mutual)).toContain(CX_LOSS.MUTUAL_EXPANDED);
        expect((await read(await cxExporter.exportToString(mutual))).edgeCount).toBe(2);
    });

    it("announces the weight clash and writes a plain numeric weight column as the weight", async () => {
        const plain = new GraphBuilder({ directed: true });
        plain.addEdge(1, 2);
        plain.declareEdgeColumn({ name: "weight", dtype: "f64" });
        plain.setEdgeValue("weight", 0, 2.5);
        const p = await roundTrip(plain.freeze());
        expect(p.notes).toContain(CX_LOSS.WEIGHT_KEY_CLASH);
        expect(p.back.flags.weighted).toBe(true);

        const text = new GraphBuilder({ directed: true });
        text.addEdge(1, 2);
        text.declareEdgeColumn({ name: "weight", dtype: "string" });
        text.setEdgeValue("weight", 0, "heavy");
        const t = await roundTrip(text.freeze());
        expect(t.notes).toContain(CX_LOSS.WEIGHT_KEY_CLASH);
        expect(t.back.edgeCount).toBe(1);
        expect(t.back.flags.weighted).toBe(false);

        const both = new GraphBuilder({ directed: true, weightDtype: "f64" });
        both.addEdge(1, 2, 3);
        both.declareEdgeColumn({ name: "weight", dtype: "string" });
        both.setEdgeValue("weight", 0, "heavy");
        const w = await roundTrip(both.freeze());
        expect(w.notes).toEqual([CX_LOSS.EDGE_IDS_GENERATED, CX_LOSS.WEIGHT_KEY_CLASH]);
        expect(w.back.edgeList().weights?.[0]).toBe(3);

        const nan = new GraphBuilder({ directed: true });
        nan.addEdge(1, 2);
        nan.addEdge(2, 1);
        nan.declareEdgeColumn({ name: "weight", dtype: "f64" });
        nan.setEdgeValue("weight", 0, NaN);
        nan.setEdgeValue("weight", 1, -Infinity);
        const n = await roundTrip(nan.freeze());
        expect(n.notes).toEqual([CX_LOSS.EDGE_IDS_GENERATED, CX_LOSS.WEIGHT_KEY_CLASH, CX_LOSS.NONFINITE_AS_NULL]);
        expect(n.back.edgeCount).toBe(2);
        expect(n.back.edges.byRole("weight")?.isSet(0)).toBe(false);
        expect(n.back.edges.byRole("weight")?.value(1)).toBe(-Infinity);
    });

    it("announces nested values, dtypes, defaults, extension tables, temporal and visual columns", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge(1, 2);
        b.declareNodeColumn({ name: "doc", dtype: "json" });
        b.setNodeValue("doc", 0, { a: [1] });
        b.declareNodeColumn({ name: "f", dtype: "f32" });
        b.setNodeValue("f", 0, 0.5);
        b.declareNodeColumn({ name: "big", dtype: "u32" });
        b.setNodeValue("big", 0, 7);
        b.declareNodeColumn({ name: "kind", dtype: "dict" });
        b.setNodeValue("kind", 0, "x");
        b.declareNodeColumn({ name: "d", dtype: "f64", default: 1 });
        b.declareNodeColumn({ name: "start", dtype: "f64", role: "start" });
        b.declareNodeColumn({ name: "color", dtype: "u8", components: 4, role: "color" });
        b.declareNodeColumn({ name: "vec", dtype: "f64", components: 2 });
        b.setNodeValue("vec", 0, [1, 2]);
        b.declareEdgeColumn({ name: "label", dtype: "string", role: "label" });
        b.setEdgeValue("label", 0, "e");
        b.addExtensionTable("notes", [{ name: "text", dtype: "string" }]);
        const snapshot = b.freeze();
        const notes = codes(snapshot);
        for (const code of [
            CX_LOSS.JSON_AS_STRING,
            CX_LOSS.DTYPE_UNSUPPORTED,
            CX_LOSS.DEFAULT_DROPPED,
            CX_LOSS.TEMPORAL_DROPPED,
            CX_LOSS.VIZ_DROPPED,
            CX_LOSS.COMPONENTS_FLATTENED,
            CX_LOSS.ROLE_DROPPED,
            CX_LOSS.EXTENSION_TABLE_DROPPED,
            CX_LOSS.EDGE_IDS_GENERATED,
        ]) {
            expect(notes, code).toContain(code);
        }
        const back = (await importGraph(await cxExporter.exportToString(snapshot), { format: "cx" })).snapshot;
        expect(back.nodes.get("doc")?.value(0)).toBe('{"a":[1]}');
        expect(back.nodes.get("f")?.dtype).toBe("f64");
        expect(back.nodes.get("kind")?.dtype).toBe("string");
        expect(Array.from(back.nodes.get("vec")?.value(0) as number[])).toEqual([1, 2]);
        expect(back.edges.get("label")?.meta.role).toBeNull();
        expect(back.extensions.has("notes")).toBe(false);
    });

    it("announces the columns the importer reads back under another name or role", async () => {
        const plainName = new GraphBuilder({ directed: true });
        plainName.addNode(1);
        plainName.declareNodeColumn({ name: "name", dtype: "string" });
        plainName.setNodeValue("name", 0, "one");
        plainName.setGraphValue("name", "graph name");
        const pn = await roundTrip(plainName.freeze());
        expect(pn.notes).toEqual([CX_LOSS.ROLE_ASSUMED, CX_LOSS.ROLE_ASSUMED]);
        expect(pn.back.nodes.get("name")?.meta.role).toBe("label");
        expect(pn.back.meta.name).toBe("graph name");

        const both = new GraphBuilder({ directed: true });
        both.addNode(1);
        both.declareNodeColumn({ name: "title", dtype: "i32", role: "label" });
        both.setNodeValue("title", 0, 5);
        both.declareNodeColumn({ name: "name", dtype: "string" });
        both.setNodeValue("name", 0, "plain");
        const bn = await roundTrip(both.freeze());
        expect(bn.notes).toEqual([CX_LOSS.COLUMN_NAME_CHANGED, CX_LOSS.DTYPE_UNSUPPORTED, CX_LOSS.COLUMN_NAME_CHANGED]);
        expect(bn.back.nodes.get("name")?.value(0)).toBe("5");
        expect(bn.back.nodes.get("name#2")?.value(0)).toBe("plain");
    });

    it("announces non-finite positions and keeps a z column that does not fit the layout as an attribute", async () => {
        const first = await read(
            JSON.stringify([
                { nodes: [{ "@id": 1 }, { "@id": 2 }] },
                { cartesianLayout: [{ node: 1, x: 1, y: 2, z: 5 }] },
                { nodeAttributes: [] },
            ]),
        );
        const z = first.nodes.get("z");
        expect(z?.isSet(0)).toBe(true);
        expectSameSnapshot(first, await read(await cxExporter.exportToString(first)));

        const loose = new GraphBuilder({ directed: true });
        loose.addNode(1);
        loose.declareNodeColumn({ name: "z", dtype: "f64", extra: { cytoscape: "z" } });
        loose.setNodeValue("z", 0, 4);
        const looseDoc = await write(loose.freeze());
        expect(aspect(looseDoc, "nodeAttributes")).toEqual([{ po: 1, n: "z", v: "4", d: "double" }]);
        expect((await read(JSON.stringify(looseDoc))).nodes.get("z")?.value(0)).toBe(4);

        const b = new GraphBuilder({ directed: true });
        b.addNode(1);
        b.declareNodeColumn({ name: "position", dtype: "f32", components: 3, role: "position" });
        b.setNodeValue("position", 0, [NaN, 1, 0]);
        const snapshot = b.freeze();
        expect(codes(snapshot)).toContain(CX_LOSS.NONFINITE_AS_NULL);

        const deep = new GraphBuilder({ directed: true });
        deep.addNode(1);
        deep.declareNodeColumn({ name: "position", dtype: "f32", components: 3, role: "position" });
        deep.setNodeValue("position", 0, [1, 2, 3]);
        const d = await roundTrip(deep.freeze());
        expect(d.notes).toEqual([CX_LOSS.COMPONENTS_FLATTENED]);
        expect(d.back.nodes.get("z")?.value(0)).toBe(3);
        const back = await read(await cxExporter.exportToString(snapshot));
        expect(back.nodes.byRole("position")).toBeNull();
    });

    it("declares what CX keeps", () => {
        expect(CX_CAPABILITIES).toMatchObject({
            mixedDirection: false,
            edgeIds: "required",
            idCharset: "integer",
            hierarchy: true,
            positions: true,
            defaults: false,
        });
        expect(Object.isFrozen(CX_CAPABILITIES)).toBe(true);
        expect(Object.isFrozen(CX_LOSS)).toBe(true);
    });
});
