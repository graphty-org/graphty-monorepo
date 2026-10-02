import { GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { CX2_LOSS, cx2Exporter, cx2Importer } from "../../../src/formats/cx2/index.js";
import { importGraph } from "../../../src/registry.js";
import { expectSameSnapshot } from "../../helpers/roundtrip.js";

const DOC = JSON.stringify([
    { CXVersion: "2.0", hasFragments: false },
    {
        attributeDeclarations: [
            {
                networkAttributes: { name: { d: "string" }, tags: { d: "list_of_string" } },
                nodes: {
                    name: { d: "string", a: "n" },
                    score: { d: "double", v: 1.5 },
                    count: { d: "long" },
                    rank: { d: "integer" },
                    ok: { d: "boolean" },
                    hits: { d: "list_of_double" },
                },
                edges: { interaction: { d: "string", a: "i" } },
            },
        ],
    },
    { networkAttributes: [{ name: "Net", tags: ["a", "b"] }] },
    {
        nodes: [
            { id: 0, x: 10.5, y: 20, z: 3, v: { n: "A", count: 5, rank: -2, ok: false, hits: [1.5, 2] } },
            { id: 5, x: -1, y: -2, v: { n: "B", score: 0 } },
            { id: 9 },
        ],
    },
    {
        edges: [
            { id: 3, s: 0, t: 5, v: { i: "binds", weight: 0.25 } },
            { id: 4, s: 5, t: 5 },
            { id: 8, s: 0, t: 5, v: { i: "binds" } },
        ],
    },
    { nodeBypasses: [{ id: 5, v: { NODE_LABEL_POSITION: { HORIZONTAL_ALIGN: "left" }, NODE_SIZE: 30 } }] },
    { edgeBypasses: [{ id: 4, v: { EDGE_WIDTH: 2 } }] },
    { visualProperties: [{ default: { node: { NODE_SHAPE: "ellipse" } }, nodeMapping: {}, edgeMapping: {} }] },
    { visualEditorProperties: [{ properties: { nodeSizeLocked: true } }] },
    { cyTableColumn: [{ applies_to: "node_table", n: "name", d: "string" }] },
    { status: [{ error: "", success: true }] },
]);

async function read(text: string): Promise<GraphSnapshot> {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    await cx2Importer.import(text, builder);
    return builder.freeze();
}

const codes = (snapshot: GraphSnapshot, options = {}): string[] =>
    cx2Exporter.check(snapshot, options).map((n) => n.code);

describe("cx2Exporter", () => {
    it("writes a CX2 file that reads back as the same snapshot", async () => {
        const first = await read(DOC);
        expect(codes(first)).toEqual([]);
        const text = await cx2Exporter.exportToString(first);
        const second = await read(text);
        expectSameSnapshot(first, second);
        const bytes = [];
        for await (const chunk of cx2Exporter.export(first)) {
            bytes.push(...chunk);
        }
        expect(new TextDecoder().decode(new Uint8Array(bytes))).toBe(text);
    });

    it("writes the descriptor, metadata, declarations with aliases and defaults, and screen coordinates", async () => {
        const text = await cx2Exporter.exportToString(await read(DOC));
        const doc = JSON.parse(text) as Record<string, unknown[]>[];
        expect(doc[0]).toEqual({ CXVersion: "2.0", hasFragments: false });
        expect(Object.keys(doc[doc.length - 1])).toEqual(["status"]);
        const aspect = (name: string): unknown[] => doc.find((m) => name in m)?.[name] ?? [];
        const decls = aspect("attributeDeclarations")[0] as Record<string, Record<string, unknown>>;
        expect(decls.nodes.name).toEqual({ d: "string", a: "n" });
        expect(decls.nodes.score).toEqual({ d: "double", v: 1.5 });
        expect(decls.nodes.count).toEqual({ d: "long" });
        expect(decls.edges.weight).toEqual({ d: "double" });
        expect(decls.networkAttributes.tags).toEqual({ d: "list_of_string" });
        const nodes = aspect("nodes") as Record<string, unknown>[];
        expect(nodes[0]).toEqual({
            id: 0,
            x: 10.5,
            y: 20,
            z: 3,
            v: { n: "A", count: 5, rank: -2, ok: false, hits: [1.5, 2] },
        });
        expect(nodes[2]).toEqual({ id: 9 });
        expect(aspect("edges")[0]).toEqual({ id: 3, s: 0, t: 5, v: { i: "binds", weight: 0.25 } });
        expect(aspect("nodeBypasses")).toEqual([
            { id: 5, v: { NODE_LABEL_POSITION: { HORIZONTAL_ALIGN: "left" }, NODE_SIZE: 30 } },
        ]);
        expect(aspect("visualEditorProperties")).toEqual([{ properties: { nodeSizeLocked: true } }]);
        expect(aspect("metaData")).toContainEqual({ name: "nodes", elementCount: 3 });
    });

    it("refuses string ids by default and keeps them through mangle and restoreMangledIds", async () => {
        const builder = new GraphBuilder({ directed: true });
        builder.addEdge("a", "b");
        builder.addNode(7);
        const snapshot = builder.freeze();
        expect(codes(snapshot)).toContain(CX2_LOSS.ID_CHARSET);
        await expect(cx2Exporter.exportToString(snapshot)).rejects.toThrow(GraphFormatError);
        expect(codes(snapshot, { sanitizeIds: "mangle" })).toContain(CX2_LOSS.ID_MANGLED);
        const text = await cx2Exporter.exportToString(snapshot, { sanitizeIds: "mangle" });
        const back = await importGraph(text, { format: "cx2" });
        expect(back.snapshot.ids.toArray()).toEqual(["a", "b", 7]);
        expect(back.snapshot.nodes.get("graphty:originalId")).toBeNull();
    });

    it("announces undirected edges, mutual pairs, nested values, non-finite numbers and the weight clash", async () => {
        const undirected = new GraphBuilder({ directed: false });
        undirected.addEdge(1, 2);
        expect(codes(undirected.freeze())).toEqual([CX2_LOSS.EDGE_IDS_GENERATED, CX2_LOSS.UNDIRECTED_AS_DIRECTED]);

        const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
        b.addEdge(1, 2, Infinity);
        b.declareNodeColumn({ name: "doc", dtype: "json" });
        b.setNodeValue("doc", 0, { a: [1] });
        b.declareNodeColumn({ name: "real", dtype: "f64" });
        b.setNodeValue("real", 1, NaN);
        b.declareEdgeColumn({ name: "weight", dtype: "string" });
        b.setEdgeValue("weight", 0, "heavy");
        const snapshot = b.freeze();
        expect(codes(snapshot)).toEqual([
            CX2_LOSS.EDGE_IDS_GENERATED,
            CX2_LOSS.JSON_AS_STRING,
            CX2_LOSS.WEIGHT_KEY_CLASH,
            CX2_LOSS.NONFINITE_AS_NULL,
        ]);
        const back = (await importGraph(await cx2Exporter.exportToString(snapshot), { format: "cx2" })).snapshot;
        expect(back.nodes.get("doc")?.value(0)).toBe('{"a":[1]}');
        expect(back.nodes.get("real")?.isSet(1)).toBe(false);
        expect(back.flags.weighted).toBe(false);
    });

    it("keeps -0, notes f32 and dict columns, and generates edge ids that are not integers", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge(1, 2);
        b.addEdge(2, 1);
        b.declareNodeColumn({ name: "neg", dtype: "f64" });
        b.setNodeValue("neg", 0, -0);
        b.declareNodeColumn({ name: "f", dtype: "f32" });
        b.setNodeValue("f", 0, 0.5);
        b.declareNodeColumn({ name: "kind", dtype: "dict" });
        b.setNodeValue("kind", 0, "x");
        b.declareEdgeColumn({ name: "id", dtype: "string", role: "id" });
        b.setEdgeValue("id", 0, "e-1");
        b.setEdgeValue("id", 1, "3");
        const snapshot = b.freeze();
        expect(codes(snapshot)).toEqual([
            "W_DTYPE_UNSUPPORTED",
            "W_DTYPE_UNSUPPORTED",
            CX2_LOSS.EDGE_IDS_GENERATED,
            "W_DTYPE_UNSUPPORTED",
        ]);
        const text = await cx2Exporter.exportToString(snapshot);
        expect(text).toContain('"neg":-0');
        const back = (await importGraph(text, { format: "cx2" })).snapshot;
        expect(Object.is(back.nodes.get("neg")?.value(0), -0)).toBe(true);
        const ids = back.edges.byRole("id");
        expect([ids?.value(0), ids?.value(1)]).toEqual([0, 3]);
    });

    it("folds the undirected pairs of a mixed snapshot under onMixedDirection, and refuses it by default", async () => {
        const mixed = (
            await importGraph("graph [ directed 1 edge [ source 1 target 2 ] edge [ source 2 target 3 directed 0 ] ]", {
                format: "gml",
            })
        ).snapshot;
        expect(codes(mixed)).toContain("E_MIXED_DIRECTION");
        await expect(cx2Exporter.exportToString(mixed)).rejects.toThrow(/undirected/);
        const notes = codes(mixed, { onMixedDirection: "directed" });
        expect(notes).toContain(CX2_LOSS.UNDIRECTED_AS_DIRECTED);
        const back = (
            await importGraph(await cx2Exporter.exportToString(mixed, { onMixedDirection: "directed" }), {
                format: "cx2",
            })
        ).snapshot;
        expect(back.edgeCount).toBe(2);
    });
});
