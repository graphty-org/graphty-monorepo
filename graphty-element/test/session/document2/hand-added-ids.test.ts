/**
 * @file Hand-added nodes and edges in version 2 save files, behind the `save-files-v2` experiment:
 * a node added by hand keeps its id (and its type) across a save and a reopen, exactly as a node a
 * file supplied does, and what names it (a note, a pin, a position) stays attached to that id.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type NoteTarget } from "../../../session";
import type { JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2"] };
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * A loaded file, then a node and an edge added by hand with a note, a pin and a position on them.
 * @param edgeIdPath - The edge-id column to configure, if any.
 * @returns The session.
 */
async function handAdded(edgeIdPath?: string): Promise<GraphSession> {
    const session = createGraphSession(ON);
    if (edgeIdPath !== undefined) {
        await session.config.set({ data: { knownFields: { edgeIdPath } } });
    }

    await session.data.import({
        type: "json",
        config: {
            data: JSON.stringify({ nodes: [{ id: "Ava" }, { id: "Ben" }], edges: [{ source: "Ava", target: "Ben" }] }),
        },
        name: "pets.json",
    });
    await session.data.addNodes([{ id: "Zed" }, { id: 9 }]);
    await session.data.addEdges([
        { source: "Zed", target: "Ava", ...(edgeIdPath === undefined ? {} : { [edgeIdPath]: "e9" }) },
    ]);
    const edge = session.data.edges().find((each) => each.source === "Zed");
    assert.isDefined(edge);
    session.notes.add({ text: "by hand", targets: [{ node: "Zed" }, { node: 9 }, { edge: edge.id }] });
    await session.positions.set([{ id: "Zed", x: 3, y: 4, z: 0 }]);
    await session.positions.pin(["Zed"]);
    return session;
}

/**
 * What a reopen must give back: ids with their types, the note's targets as ends, the pin and position.
 * @param session - The session.
 * @returns A comparable picture.
 */
function picture(session: GraphSession): unknown {
    const { ids } = session.data.snapshot();
    const point = { x: 0, y: 0, z: 0 };
    session.positions.read(ids.indexOf("Zed"), point);
    const named = (target: NoteTarget): unknown => {
        if ("node" in target) {
            return target.node;
        }

        // The ends as a pair: before a save, a live note reads a hand-added edge's ends reversed.
        return "edge" in target ? [target.edge.source, target.edge.target].map(String).sort().join("|") : target;
    };
    return {
        nodes: session.data
            .nodes()
            .map((node) => `${typeof node.id}:${String(node.id)}`)
            .sort(),
        notes: session.notes.list().map((note) => note.targets.map(named)),
        zed: { x: point.x, y: point.y },
        pinned: [...session.positions.pinned],
    };
}

/**
 * Save as a version 2 full file with results, so the coordinates are saved.
 * @param session - The session.
 * @returns The file's text and what the save left out.
 */
async function save(session: GraphSession): Promise<{ text: string; leftOut: readonly unknown[] }> {
    const saved = await session.project.save({ format: 2, results: true });
    return { text: saved.text, leftOut: saved.report.leftOut };
}

/**
 * Open a version 2 file in a new session, the saved coordinates restored rather than laid out.
 * @param text - The file.
 * @returns The session.
 */
async function open(text: string): Promise<GraphSession> {
    const opened = createGraphSession(ON);
    const report = await opened.project.open(text, { rerun: false });
    assert.deepEqual(
        report.problems.filter((problem) => problem.code !== "W_RECIPE_NOT_APPLIED"),
        [],
    );
    return opened;
}

/**
 * A saved file's sections (the file's own `modified` time changes on every save).
 * @param text - The file.
 * @returns The sections.
 */
function sections(text: string): unknown {
    return (JSON.parse(text) as JsonObject).sections;
}

/**
 * The reader source's operations in a saved file.
 * @param text - The file.
 * @returns The operations.
 */
function readerOperations(text: string): JsonObject[] {
    const { data } = (JSON.parse(text) as JsonObject).sections as Record<string, JsonObject>;
    const reader = (data.sources as JsonObject[]).find((source) => source.id === "reader");
    return ((reader?.copy as JsonObject).operations as JsonObject[]) ?? [];
}

describe("hand-added nodes and edges in version 2 save files", () => {
    it("keeps their ids and types, and what names them, across a save and a reopen", async () => {
        const session = await handAdded();
        const before = picture(session);
        const first = await save(session);
        session.dispose();
        assert.deepEqual(first.leftOut, []);

        const [zed, nine, edge] = readerOperations(first.text);
        assert.deepEqual(zed.node, { space: "source:reader", key: "Zed" });
        assert.deepEqual([zed.columns, zed.dtypes], [{ id: "Zed" }, { id: "string" }]);
        assert.strictEqual((nine.node as JsonObject).key, "9");
        assert.strictEqual(typeof (nine.columns as JsonObject).id, "number");
        assert.match(String((edge.edge as JsonObject).key), ULID);

        const opened = await open(first.text);
        assert.deepEqual(picture(opened), before);
        assert.deepInclude(picture(opened), { nodes: ["number:9", "string:Ava", "string:Ben", "string:Zed"] });

        // Saved again, the reopened session writes the same sections: the same keys, the same edge ULID.
        assert.deepEqual(sections((await save(opened)).text), sections(first.text));
        opened.dispose();
    });

    it("keys a hand-added edge by its edge-id cell, as a file edge is", async () => {
        const session = await handAdded("eid");
        const before = picture(session);
        const first = await save(session);
        session.dispose();
        assert.deepEqual(first.leftOut, []);
        assert.deepEqual(readerOperations(first.text)[2].edge, { load: "reader", key: "e9" });

        const opened = await open(first.text);
        assert.deepEqual(picture(opened), before);
        assert.deepEqual(sections((await save(opened)).text), sections(first.text));
        opened.dispose();
    });

    it("opens an older file whose reader add is keyed by a ULID under that ULID, and keeps it", async () => {
        const session = await handAdded();
        const { text } = await save(session);
        session.dispose();
        const old = "01JCBP1C9E2G4J6M8N0Q3S5V7Y";
        const older = text
            .replaceAll('"key":"Zed"', `"key":"${old}"`)
            .replace('"columns":{"id":"Zed"},"dtypes":{"id":"string"}', '"columns":{},"dtypes":{}');
        assert.notStrictEqual(older, text);

        const opened = await open(older);
        assert.include(
            opened.data.nodes().map((node) => node.id),
            old,
        );
        assert.include(
            readerOperations((await save(opened)).text).map((op) => (op.node as JsonObject | undefined)?.key),
            old,
        );
        opened.dispose();
    });
});
