/**
 * Golden tests for how the Pajek exporter places each column: label, coordinates, shape,
 * interval, relation, parameter or dropped. Each case pins the exact check() notes and the exact
 * exported text (or the error export() raises), for node and edge tables, so a refactor of the
 * column planning cannot change either.
 */
import { type ColumnDecl, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { pajekExporter, type PajekExportOptions } from "../../../src/formats/pajek/exporter.js";

interface Golden {
    notes: { code: string; message: string; column: string | null; count: number | null }[];
    text: string | null;
    error: string | null;
}

async function golden(snapshot: GraphSnapshot, options?: PajekExportOptions): Promise<Golden> {
    const notes = pajekExporter.check(snapshot, options).map((n) => ({ ...n }));
    try {
        return { notes, text: await pajekExporter.exportToString(snapshot, options), error: null };
    } catch (error) {
        return { notes, text: null, error: (error as Error).message };
    }
}

function builderWith(directed: boolean, nodeDecls: ColumnDecl[] = [], edgeDecls: ColumnDecl[] = []): GraphBuilder {
    const builder = new GraphBuilder({ directed, weightDtype: "f64" });
    for (const decl of nodeDecls) {
        builder.declareNodeColumn(decl);
    }
    for (const decl of edgeDecls) {
        builder.declareEdgeColumn(decl);
    }
    return builder;
}

describe("pajekExporter golden: column placement", () => {
    it("an empty graph", async () => {
        expect(await golden(builderWith(true).freeze())).toMatchSnapshot();
        expect(await golden(builderWith(false).freeze())).toMatchSnapshot();
    });

    it("labels: text, numeric, and a label role on an edge", async () => {
        const builder = builderWith(
            false,
            [{ name: "name", dtype: "i32", role: "label" }],
            [{ name: "elabel", dtype: "string", role: "label" }],
        );
        builder.addNodeRecord(1, { name: 10 });
        builder.addNodeRecord(2, { name: 20 });
        builder.addNode(3);
        builder.addEdgeRecord(1, 2, { elabel: "x" });
        builder.addEdge(2, 3, 1.5);
        expect(await golden(builder.freeze())).toMatchSnapshot();
        const text = builderWith(true, [{ name: "label", dtype: "dict", role: "label" }]);
        text.addNodeRecord(1, { label: "a b" });
        text.addNodeRecord(2, { label: "c" });
        text.addEdge(1, 2);
        expect(await golden(text.freeze())).toMatchSnapshot();
    });

    it("positions: 2, 3 and 4 components, and on an edge", async () => {
        for (const components of [2, 3, 4]) {
            const builder = builderWith(true, [{ name: "position", dtype: "f64", components, role: "position" }]);
            const pos = [1.5, 2, 3, 4].slice(0, components);
            builder.addNodeRecord(1, { position: pos });
            builder.addNode(2);
            builder.addEdge(1, 2);
            expect(await golden(builder.freeze()), `components ${components}`).toMatchSnapshot();
        }
        const edge = builderWith(false, [], [{ name: "pos", dtype: "f32", components: 2, role: "position" }]);
        edge.addEdgeRecord(1, 2, { pos: [1, 2] });
        expect(await golden(edge.freeze())).toMatchSnapshot();
    });

    it("spells: number lists on nodes and edges, text lists dropped", async () => {
        for (const itemDtype of ["f64", "i32", "f32"] as const) {
            const builder = builderWith(
                true,
                [{ name: "spells", dtype: "list", itemDtype, role: "spells" }],
                [{ name: "espells", dtype: "list", itemDtype, role: "spells" }],
            );
            builder.addNodeRecord(1, { spells: [1, 3] });
            builder.addNodeRecord(2, { spells: [2, 4, 6, 8] });
            builder.addEdgeRecord(1, 2, { espells: [1, 2] });
            expect(await golden(builder.freeze()), itemDtype).toMatchSnapshot();
        }
        const text = builderWith(
            true,
            [{ name: "spells", dtype: "list", itemDtype: "string", role: "spells" }],
            [{ name: "espells", dtype: "list", itemDtype: "string", role: "spells" }],
        );
        text.addNodeRecord(1, { spells: ["a"] });
        text.addEdgeRecord(1, 2, { espells: ["b"] });
        expect(await golden(text.freeze())).toMatchSnapshot();
        const notList = builderWith(true, [{ name: "spells", dtype: "f64", role: "spells" }]);
        notList.addNodeRecord(1, { spells: 1 });
        expect(await golden(notList.freeze())).toMatchSnapshot();
    });

    it("temporal roles other than spells are dropped on both tables", async () => {
        const builder = builderWith(
            true,
            [
                { name: "start", dtype: "f64", role: "start" },
                { name: "end", dtype: "f64", role: "end" },
                { name: "timestamp", dtype: "f64", role: "timestamp" },
            ],
            [
                { name: "estart", dtype: "f64", role: "start" },
                { name: "estamps", dtype: "list", itemDtype: "f64", role: "timestamps" },
            ],
        );
        builder.addNodeRecord(1, { start: 1, end: 2, timestamp: 3 });
        builder.addEdgeRecord(1, 2, { estart: 4, estamps: [5] });
        expect(await golden(builder.freeze())).toMatchSnapshot();
    });

    it("structural, viz and hierarchy roles, edge ids, lists and json are not parameters", async () => {
        const builder = builderWith(
            false,
            [
                { name: "color", dtype: "string", role: "color" },
                { name: "size", dtype: "f64", role: "size" },
                { name: "parent", dtype: "u32", role: "parent", refersTo: "node" },
                { name: "tags", dtype: "list", itemDtype: "string" },
                { name: "blob", dtype: "json" },
                { name: "nid", dtype: "string", role: "id" },
            ],
            [
                { name: "eid", dtype: "string", role: "id", unique: true },
                { name: "thick", dtype: "f64", role: "thickness" },
                { name: "graphty.directed", dtype: "bool", role: "directed" },
                { name: "etags", dtype: "list", itemDtype: "f64" },
            ],
        );
        builder.addNodeRecord(1, { color: "red", size: 2, tags: ["t"], blob: { a: 1 }, nid: "n1" });
        builder.addNodeRecord(2, { parent: 0 });
        const e0 = builder.addEdgeRecord(1, 2, { eid: "e1", thick: 3, etags: [1] });
        builder.addEdgeRecord(2, 1, { eid: "e2" });
        builder.setEdgeValue("graphty.directed", e0, true);
        expect(await golden(builder.freeze())).toMatchSnapshot();
    });

    it("shape columns: keywords, a stray value in dict and string, and shape on an edge", async () => {
        for (const dtype of ["dict", "string"] as const) {
            const keywords = builderWith(true, [{ name: "shape", dtype }]);
            keywords.addNodeRecord(1, { shape: "box" });
            keywords.addNodeRecord(2, { shape: "ellipse" });
            keywords.addNode(3);
            keywords.addEdge(1, 3);
            expect(await golden(keywords.freeze()), `${dtype} keywords`).toMatchSnapshot();
            const stray = builderWith(true, [{ name: "shape", dtype }]);
            stray.addNodeRecord(1, { shape: "box" });
            stray.addNodeRecord(2, { shape: "star" });
            expect(await golden(stray.freeze()), `${dtype} stray`).toMatchSnapshot();
        }
        const numeric = builderWith(true, [{ name: "shape", dtype: "i32" }]);
        numeric.addNodeRecord(1, { shape: 3 });
        expect(await golden(numeric.freeze())).toMatchSnapshot();
        const edge = builderWith(true, [], [{ name: "shape", dtype: "string" }]);
        edge.addEdgeRecord(1, 2, { shape: "box" });
        expect(await golden(edge.freeze())).toMatchSnapshot();
    });

    it("relation columns on edges, and a relation column on nodes", async () => {
        for (const dtype of ["dict", "string"] as const) {
            const builder = builderWith(true, [{ name: "relation", dtype }], [{ name: "relation", dtype }]);
            builder.addNodeRecord(1, { relation: "n" });
            builder.addEdgeRecord(1, 2, { relation: "likes" });
            builder.addEdgeRecord(2, 1, { relation: "hates" });
            builder.addEdge(1, 1);
            expect(await golden(builder.freeze()), dtype).toMatchSnapshot();
        }
        const numeric = builderWith(true, [], [{ name: "relation", dtype: "i32" }]);
        numeric.addEdgeRecord(1, 2, { relation: 4 });
        expect(await golden(numeric.freeze())).toMatchSnapshot();
    });

    it("parameters of every dtype, and names that cannot be keys", async () => {
        const builder = builderWith(
            false,
            [
                { name: "flag", dtype: "bool" },
                { name: "score", dtype: "f64" },
                { name: "rank", dtype: "i32" },
                { name: "note", dtype: "string" },
                { name: "label", dtype: "string" },
                { name: "has space", dtype: "string" },
                { name: "box", dtype: "string" },
            ],
            [
                { name: "cost", dtype: "f64" },
                { name: "42", dtype: "i32" },
                { name: "ok", dtype: "bool" },
            ],
        );
        builder.addNodeRecord(1, { flag: true, score: 1.25, rank: 3, note: "hi there", label: "L", "has space": "x" });
        builder.addNodeRecord(2, { flag: false, score: NaN, note: "42", box: "y" });
        builder.addNode(3);
        builder.addEdgeRecord(1, 2, { cost: 2, 42: 1, ok: true });
        builder.addEdgeRecord(2, 3, { cost: Infinity });
        expect(await golden(builder.freeze())).toMatchSnapshot();
    });

    it("mixed directions with weights, a network header and mangled ids", async () => {
        const builder = builderWith(true, [{ name: "label", dtype: "string", role: "label" }]);
        builder.declareEdgeColumn({ name: "graphty.directed", dtype: "bool", role: "directed" });
        builder.addNodeRecord("a", { label: "A" });
        builder.addNodeRecord("b", { label: "B" });
        builder.addNode("c");
        const e0 = builder.addEdge("a", "b", 2);
        const e1 = builder.addEdge("b", "c");
        const e2 = builder.addEdge("c", "a", 0.5);
        builder.setEdgeValue("graphty.directed", e0, true);
        builder.setEdgeValue("graphty.directed", e1, false);
        builder.setEdgeValue("graphty.directed", e2, true);
        const snapshot = builder.freeze();
        expect(await golden(snapshot)).toMatchSnapshot();
        expect(await golden(snapshot, { name: "net", sanitizeIds: "mangle" })).toMatchSnapshot();
    });

    it("text Pajek cannot write fails the export", async () => {
        const builder = builderWith(
            true,
            [{ name: "label", dtype: "string", role: "label" }],
            [{ name: "why", dtype: "string" }],
        );
        builder.addNodeRecord(1, { label: 'say "hi"' });
        builder.addNodeRecord(2, { label: "line\nbreak" });
        builder.addEdgeRecord(1, 2, { why: 'a "b"' });
        expect(await golden(builder.freeze())).toMatchSnapshot();
    });
});
