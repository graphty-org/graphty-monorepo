import { type ColumnDecl, GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { LOSS } from "../../../src/common/export.js";
import {
    INTERACTION_COLUMN,
    SIF_ISSUE,
    SIF_LOSS,
    sifExporter,
    type SifExportOptions,
    sifImporter,
} from "../../../src/formats/sif/index.js";
import { importGraph } from "../../../src/registry.js";
import { type CommonImportOptions } from "../../../src/types.js";
import { corpusFiles, malformedFiles, readCorpusBytes, readMalformedBytes } from "../../helpers/corpus.js";
import { expectImportError } from "../../helpers/import-error.js";
import { expectSameSnapshot, roundTrip } from "../../helpers/roundtrip.js";

async function read(text: string, options?: CommonImportOptions): Promise<GraphSnapshot> {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    await sifImporter.import(text, builder, options);
    return builder.freeze();
}

const codes = (snapshot: GraphSnapshot, options?: SifExportOptions): string[] =>
    sifExporter.check(snapshot, options).map((n) => n.code);

function interactions(snapshot: GraphSnapshot): unknown[] {
    const column = snapshot.edges.byRole("kind");
    return Array.from({ length: snapshot.edgeCount }, (_, e) => (column?.isSet(e) === true ? column.value(e) : null));
}

/** A snapshot from ids, edges and an optional edge kind column. */
function build(spec: {
    directed?: boolean;
    ids: readonly NodeId[];
    edges?: readonly (readonly [number, number])[];
    kind?: ColumnDecl & { values: readonly unknown[] };
}): GraphSnapshot {
    const b = new GraphBuilder({ directed: spec.directed ?? true, weightDtype: "f64" });
    b.addNodes(spec.ids);
    for (const [s, t] of spec.edges ?? []) {
        b.addEdge(spec.ids[s], spec.ids[t]);
    }
    if (spec.kind !== undefined) {
        const { values, ...decl } = spec.kind;
        b.declareEdgeColumn(decl);
        values.forEach((v, e) => {
            if (v !== undefined) {
                b.setEdgeValue(decl.name, e, v);
            }
        });
    }
    return b.freeze();
}

describe("SIF importer", () => {
    for (const file of corpusFiles("sif")) {
        it(`${file.path}: the node and edge counts Cytoscape reads`, async () => {
            const { snapshot, format } = await importGraph(readCorpusBytes("sif", file.path), { filename: file.path });
            expect(format).toBe("sif");
            expect(snapshot.nodeCount).toBe(file.expectedNodes);
            expect(snapshot.edgeCount).toBe(file.expectedEdges);
            expect(snapshot.directed).toBe(true);
        });
    }

    it("reads a line with several targets as one edge per target, with the interaction as the edge kind", async () => {
        const g = await read("a pd b c d\n");
        expect(g.edgeCount).toBe(3);
        expect([...g.ids]).toEqual(["a", "b", "c", "d"]);
        expect(g.edges.byRole("kind")?.meta.name).toBe(INTERACTION_COLUMN);
        expect(interactions(g)).toEqual(["pd", "pd", "pd"]);
    });

    it("splits on tabs only when the file holds a tab, so names may hold spaces", async () => {
        const tabbed = await read("IRAK Complex\tinteracts with\tTRAF6\nlone node\n");
        expect([...tabbed.ids]).toEqual(["IRAK Complex", "TRAF6", "lone node"]);
        expect(interactions(tabbed)).toEqual(["interacts with"]);
        const spaced = await read("a  pp   b\n");
        expect([...spaced.ids]).toEqual(["a", "b"]);
    });

    it("keeps a node on a line of its own and the multi-word name of the Cytoscape sample", async () => {
        const { snapshot } = await importGraph(readCorpusBytes("sif", "multiWordProteins.sif"), { format: "sif" });
        expect(snapshot.ids.indexOf("26S ubiquitin dependent proteasome")).not.toBe(-1);
        const degenerate = await read("YNL312W\nYNL314W\n");
        expect(degenerate.nodeCount).toBe(2);
        expect(degenerate.edgeCount).toBe(0);
    });

    it("warns about a line with an interaction but no target and keeps its node", async () => {
        const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
        const report = await sifImporter.import("a pp b\nc pp\n", builder);
        expect(report.issues.map((i) => i.code)).toEqual([SIF_ISSUE.NO_TARGET]);
        expect(builder.freeze().nodeCount).toBe(3);
    });

    it("reads undirected edges under defaultDirected false and canonical ids as numbers", async () => {
        const g = await read("1 pp 2\n", { defaultDirected: false });
        expect(g.directed).toBe(false);
        expect([...g.ids]).toEqual([1, 2]);
    });

    it("reports an option it does not use", async () => {
        const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
        const report = await sifImporter.import("a pp b\n", builder, { weightFrom: "w" });
        expect(report.issues.map((i) => i.code)).toEqual([SIF_ISSUE.OPTION_IGNORED]);
    });

    it("refuses a self-loop under selfLoops error", async () => {
        await expectImportError(() => importGraph("a pp a\n", { format: "sif", selfLoops: "error" }), {
            format: "sif",
            code: SIF_ISSUE.SELF_LOOP,
        });
    });

    for (const name of malformedFiles("sif")) {
        it(`malformed ${name}: ImportError with a report`, async () => {
            await expectImportError(() => importGraph(readMalformedBytes("sif", name), { format: "sif" }), {
                format: "sif",
            });
        });
    }
});

describe("SIF exporter", () => {
    it("round-trips every corpus file", async () => {
        for (const file of corpusFiles("sif")) {
            const { snapshot } = await importGraph(readCorpusBytes("sif", file.path), { format: "sif" });
            expect(sifExporter.check(snapshot)).toEqual([]);
            const back = await roundTrip(snapshot, sifExporter, sifImporter);
            expectSameSnapshot(snapshot, back.snapshot);
        }
    });

    it("keeps the node order and isolated nodes", async () => {
        const g = build({
            ids: ["z", "a", "m", "lone", "b"],
            edges: [
                [4, 2],
                [0, 1],
            ],
            kind: { name: INTERACTION_COLUMN, dtype: "dict", values: ["pp", "pd"], role: "kind" },
        });
        const back = await roundTrip(g, sifExporter, sifImporter);
        expect(back.text).toBe("z\na\nm\nlone\nb\nb\tpp\tm\nz\tpd\ta\n");
        expectSameSnapshot(g, back.snapshot);
    });

    it("writes a lone name with a space with a tab, so it reads back as one node", async () => {
        const g = build({ ids: ["New York", "b"] });
        const back = await roundTrip(g, sifExporter, sifImporter);
        expect(back.text).toBe("New York\t\nb\n");
        expectSameSnapshot(g, back.snapshot);
    });

    it("writes an edge without an interaction as `-` and says so", async () => {
        const g = build({ ids: ["a", "b"], edges: [[0, 1]] });
        expect(codes(g)).toEqual([SIF_LOSS.INTERACTION_ADDED]);
        expect(await sifExporter.exportToString(g)).toBe("a\t-\tb\n");
    });

    it("notes a text interaction column under another name, and drops other columns", () => {
        const g = build({
            ids: ["a", "b"],
            edges: [[0, 1]],
            kind: { name: "type", dtype: "string", values: ["pp"], role: "kind" },
        });
        expect(codes(g).sort()).toEqual([SIF_LOSS.COLUMN_NAME_CHANGED, SIF_LOSS.STORAGE_CLASS].sort());
        const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
        b.addEdge("a", "b", 2);
        b.declareNodeColumn({ name: "label", dtype: "string" });
        b.setNodeValue("label", 0, "A");
        expect(codes(b.freeze()).sort()).toEqual(
            [LOSS.COLUMN_DROPPED, LOSS.WEIGHTS_DROPPED, SIF_LOSS.INTERACTION_ADDED].sort(),
        );
    });

    it("notes an undirected graph, which reads back directed", () => {
        const g = build({
            directed: false,
            ids: ["a", "b"],
            edges: [[0, 1]],
            kind: { name: INTERACTION_COLUMN, dtype: "dict", values: ["pp"], role: "kind" },
        });
        expect(codes(g)).toEqual([SIF_LOSS.UNDIRECTED_AS_DIRECTED]);
    });

    it("refuses an id or interaction it cannot write", async () => {
        const g = build({
            ids: ["a\tb", " c"],
            edges: [[0, 1]],
            kind: { name: INTERACTION_COLUMN, dtype: "dict", values: ["p\np"], role: "kind" },
        });
        expect(codes(g)).toEqual([SIF_LOSS.TEXT, SIF_LOSS.TEXT]);
        await expect(sifExporter.exportToString(g)).rejects.toMatchObject({ code: "E_UNSUPPORTED" });
        expect(() => sifExporter.export(g)).toThrow();
    });

    it("refuses ids that share their text unless sanitizeIds is mangle", async () => {
        const g = build({ ids: [1, "1"] });
        expect(codes(g)).toContain(LOSS.ID_TEXT_COLLISION);
        expect(await sifExporter.exportToString(g, { sanitizeIds: "mangle" })).toBe("1\n1_2\n");
    });

    it("writes bytes", async () => {
        const g = build({ ids: ["a", "b"], edges: [[0, 1]] });
        const parts: Uint8Array[] = [];
        for await (const chunk of sifExporter.export(g)) {
            parts.push(chunk);
        }
        expect(new TextDecoder().decode(parts[0])).toBe("a\t-\tb\n");
    });
});
