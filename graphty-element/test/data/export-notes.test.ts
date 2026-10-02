/**
 * @file Notes in exports (design/notes/notes-design.md section 7.8): off by default, the
 * `graphty.notes.count` and `graphty.notes.text` columns with `{ notes: true }`, and the
 * `W_GRAPHTY_NOTES` loss note on every export of a session holding notes.
 */

import "../../src/data/index";

import { assert, describe, it } from "vitest";

import { formatDescriptor } from "../../src/catalog/formats";
import { CSVDataSource } from "../../src/data/CSVDataSource";
import type { DataSource } from "../../src/data/DataSource";
import { exportSession } from "../../src/data/export";
import { GEXFDataSource } from "../../src/data/GEXFDataSource";
import { GraphMLDataSource } from "../../src/data/GraphMLDataSource";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../session/helpers";
import { notesHarness } from "../session/notes/harness";

const COUNT = "graphty.notes.count";
const TEXT = "graphty.notes.text";

/**
 * The harness graph with three notes: two on `a` (the older first), one on the edge `a -> b`
 * and on the graph.
 * @returns The harness.
 */
function noted(): Harness {
    const h = notesHarness();
    const { notes } = h.session;
    notes.add({ text: "older", targets: [{ node: "a" }] });
    notes.add({ text: "newer", targets: [{ node: "a" }, { node: "b" }] });
    notes.add({ text: "about the edge", targets: [{ edge: edgeBetween(h, "a", "b") }, { graph: true }] });
    return h;
}

/**
 * Every record a data source yields.
 * @param source - The source.
 * @returns Its nodes and edges.
 */
async function recordsOf(
    source: DataSource,
): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...(chunk.nodes as Record<string, unknown>[]));
        edges.push(...(chunk.edges as Record<string, unknown>[]));
    }

    return { nodes, edges };
}

describe("notes in exports", () => {
    it("note-26: a default export writes no note column and reports the notes left out", async () => {
        const h = noted();
        for (const format of ["gexf", "graphml", "csv", "json"] as const) {
            const result = exportSession(h.session, format);
            const text = await result.text();
            assert.notInclude(text, "graphty.notes", format);
            assert.notInclude(text, "older", format);
            const loss = result.lossNotes.filter((note) => note.code === "W_GRAPHTY_NOTES");
            assert.lengthOf(loss, 1, format);
            assert.strictEqual(loss[0].count, 3, "the count is every note held");
        }

        h.session.dispose();
    });

    it("note-26b: { notes: true } writes both columns on noted elements and still reports the loss", async () => {
        const h = noted();
        const result = exportSession(h.session, "graphml", { notes: true });
        assert.strictEqual(result.lossNotes.find((note) => note.code === "W_GRAPHTY_NOTES")?.count, 3);
        const text = await result.text();
        assert.include(text, `attr.name="${COUNT}"`);
        assert.include(text, `attr.name="${TEXT}"`);
        assert.include(text, "newer\n\nolder", "newest first, joined by a blank line");

        const back = await recordsOf(new GraphMLDataSource({ data: text }));
        const byId = new Map(back.nodes.map((node) => [String(node.id), node]));
        assert.strictEqual(Number(byId.get("a")?.[COUNT]), 2);
        assert.strictEqual(Number(byId.get("b")?.[COUNT]), 1);
        assert.strictEqual(byId.get("b")?.[TEXT], "newer");
        assert.isUndefined(byId.get("c")?.[COUNT], "an element no note names has no value, not a zero");
        const edge = back.edges.find((record) => record.source === "a" && record.target === "b");
        assert.strictEqual(Number(edge?.[COUNT]), 1);
        assert.strictEqual(edge?.[TEXT], "about the edge");
        h.session.dispose();
    });

    it("note-27: a CSV cell of note text that a spreadsheet would run is neutralised and reported", async () => {
        const h = notesHarness();
        h.session.notes.add({ text: "=SUM(A1)", targets: [{ node: "a" }] });
        const result = exportSession(h.session, "csv", { table: "nodes", notes: true });
        const text = await result.text();
        assert.include(text, "'=SUM(A1)");
        assert.isAtLeast(result.lossNotes.find((note) => note.code === "W_GRAPHTY_CSV_NEUTRALIZED")?.count ?? 0, 1);
        h.session.dispose();
    });

    it("cuts a text cell to 64 KB and reports it", async () => {
        const h = notesHarness();
        // Two notes of 40,000 two-byte code points each: 160,000 bytes joined.
        h.session.notes.add({ text: "\u00e9".repeat(40_000), targets: [{ node: "a" }] });
        h.session.notes.add({ text: "\u00e8".repeat(40_000), targets: [{ node: "a" }] });
        const result = exportSession(h.session, "json", { notes: true });
        const truncated = result.lossNotes.find((note) => note.code === "W_GRAPHTY_TRUNCATED");
        assert.strictEqual(truncated?.count, 1);
        assert.strictEqual(truncated?.column, TEXT);
        const document = JSON.parse(await result.text()) as { nodes: Record<string, unknown>[] };
        const cell = document.nodes.find((node) => node.id === "a")?.[TEXT] as string;
        assert.isAtMost(new TextEncoder().encode(cell).length, 65_536);
        assert.isTrue(cell.startsWith("\u00e8"), "the newest note is kept first");
        assert.notInclude(cell, "\ufffd", "no code point is split");
        h.session.dispose();
    });

    it("reports nothing new for a session without notes", () => {
        const h = notesHarness();
        assert.deepEqual(exportSession(h.session, "graphml").lossNotes, []);
        assert.deepEqual(exportSession(h.session, "graphml", { notes: true }).lossNotes, []);
        h.session.dispose();
    });

    // Pajek is left out: it refuses any text holding a line break, and two notes are joined by one.
    it("every other built-in writer takes { notes: true }", async () => {
        const h = noted();
        const cases: [string, Record<string, unknown>][] = [
            ["json", {}],
            ["dot", {}],
            // GML keys hold no dot, as for a result column: the caller asks for them to be rewritten.
            ["gml", { sanitizeIds: "mangle", sanitizeKeys: "mangle" }],
            ["csv", { variant: "neo4j" }],
        ];
        for (const [format, options] of cases) {
            const result = exportSession(h.session, format, { ...options, notes: true });
            assert.isString(await result.text(), format);
            assert.strictEqual(result.lossNotes.find((note) => note.code === "W_GRAPHTY_NOTES")?.count, 3, format);
        }

        h.session.dispose();
    });

    it("reports a loaded column under the reserved graphty. root as left out, never silently", async () => {
        const h = makeSession({ directed: true });
        h.add([{ id: "a", "graphty.x": "keepme" }, { id: "b" }]);
        for (const format of ["gexf", "graphml", "csv", "json"] as const) {
            const result = exportSession(h.session, format);
            assert.notInclude(await result.text(), "keepme", format);
            const loss = result.lossNotes.filter((note) => note.code === "W_GRAPHTY_COLUMN_DROPPED");
            assert.deepEqual(
                loss.map((note) => [note.column, note.count]),
                [["graphty.x", 1]],
                format,
            );
        }

        h.session.dispose();
    });

    it("lists notes among every writer's options, off by default", () => {
        for (const format of ["gexf", "graphml", "csv", "json", "dot", "gml", "pajek"]) {
            const option = formatDescriptor(format)?.writerOptions?.find((entry) => entry.name === "notes");
            assert.strictEqual(option?.type, "boolean", format);
            assert.strictEqual(option?.default, false, format);
        }
    });

    describe("read back, the columns are ordinary data columns, never notes", () => {
        const cases: [string, Record<string, unknown>, (text: string) => DataSource][] = [
            ["gexf", {}, (text) => new GEXFDataSource({ data: text })],
            ["graphml", {}, (text) => new GraphMLDataSource({ data: text })],
            ["csv", {}, (text) => new CSVDataSource({ data: text })],
        ];
        for (const [format, options, read] of cases) {
            it(format, async () => {
                const h = noted();
                const text = await exportSession(h.session, format, { ...options, notes: true }).text();
                const back = await recordsOf(read(text));
                const edge = back.edges.find((record) => record.source === "a" && record.target === "b");
                assert.strictEqual(Number(edge?.[COUNT]), 1);
                assert.strictEqual(edge?.[TEXT], "about the edge");

                const reopened = makeSession();
                reopened.add(back.nodes as unknown as NodeRow[], back.edges as unknown as EdgeRow[]);
                assert.lengthOf(reopened.session.notes.list(), 0, "a column never becomes a note");
                const again = exportSession(reopened.session, format, { notes: true });
                assert.notInclude(await again.text(), "graphty.notes", "a loaded graphty. column is never exported");
                h.session.dispose();
                reopened.session.dispose();
            });
        }
    });
});
