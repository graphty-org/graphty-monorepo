/**
 * @file The colors and sizes a file gives its elements, saved in a version 2 file: a load keeps
 * them as ordinary columns of its source, so a save writes them as it writes any column, embedded
 * or by reference, and a reader's edit of one survives as any edited column does.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import { elementRefsOf } from "../../../src/session/document2/codecs/dataRefs";
import type {
    DocumentProblem,
    DocumentSection,
    JsonObject,
    ReadContext,
    WriteContext,
} from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2", "file-styles"] };
const URL_OF_RING = "https://example.org/ring.gexf";

/** Six nodes in a ring, each with its own color and size. */
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><nodes>
${["200,30,30", "30,200,30", "30,30,200", "200,200,30", "30,200,200", "200,30,200"]
    .map((rgb, i) => {
        const [r, g, b] = rgb.split(",");
        return `<node id="n${String(i)}" label="n${String(i)}"><viz:color r="${r}" g="${g}" b="${b}"/><viz:size value="${String(i + 2)}"/></node>`;
    })
    .join("\n")}
</nodes><edges>
${Array.from({ length: 6 }, (_unused, i) => `<edge source="n${String(i)}" target="n${String((i + 1) % 6)}"/>`).join("\n")}
</edges></graph></gexf>`;

/**
 * What every node is drawn with, color and size.
 * @param session - The session.
 * @returns The values, by node.
 */
function drawn(session: GraphSession): Record<string, { color?: string; size?: unknown }> {
    const out: Record<string, { color?: string; size?: unknown }> = {};
    for (const node of session.data.nodes()) {
        const { merged } = session.styles.explain({ node: node.id });
        const color = merged["node.color"] as { hex?: string } | undefined;
        out[String(node.id)] = { color: color?.hex, size: merged["node.size"] };
    }

    return out;
}

/**
 * The ring loaded with its looks, from its text or from its URL.
 * @param from - Where the file comes from.
 * @returns The session.
 */
async function ring(from: "text" | "url" = "text"): Promise<GraphSession> {
    const session = createGraphSession(ON);
    const config = from === "url" ? { url: URL_OF_RING } : { data: GEXF };
    await session.data.import({ type: "gexf", config }, { styles: "file" });
    return session;
}

/**
 * The column the file's fill color is held in: the node column whose value on `n0` is the color
 * `n0` is drawn with.
 * @param session - The session.
 * @returns The column.
 */
function fillColumn(session: GraphSession): string {
    const color = drawn(session).n0.color?.toLowerCase();
    const n0: Record<string, unknown> = session.data.node("n0") ?? {};
    const name = Object.keys(n0).find((key) => String(n0[key]).toLowerCase() === color);
    assert.isDefined(name, "a column holds the fill the file gave");
    return name;
}

/**
 * The data section's body as the codec writes it.
 * @param session - The session.
 * @param embed - Embedded or referenced per source.
 * @returns The body and what the write reported.
 */
async function writeData(
    session: GraphSession,
    embed: WriteContext["embed"] = {},
): Promise<{ body: JsonObject; problems: DocumentProblem[] }> {
    const problems: DocumentProblem[] = [];
    const { body } = await dataCodec.write({
        session,
        problems,
        refs: () => elementRefsOf(session),
        dataId: () => "data-1",
        sections: new Set<DocumentSection>(["data"]),
        embed,
        isDerived: () => false,
        bindsTo: () => Promise.resolve(undefined),
    });
    return { body, problems };
}

/**
 * Read a data body into a new session through the codec.
 * @param body - The body.
 * @returns The session and what the read reported.
 */
async function readData(body: JsonObject): Promise<{ session: GraphSession; problems: DocumentProblem[] }> {
    const session = createGraphSession(ON);
    const problems: DocumentProblem[] = [];
    await session.transaction("Open data", async (tx) => {
        const context: ReadContext = {
            session,
            problems,
            refs: () => elementRefsOf(session),
            dataId: () => "data-1",
            sections: new Set<DocumentSection>(["data"]),
            tx,
            rerun: true,
            dataMode: "replace",
            restored: new Set(),
            other: () => undefined,
            canned: new Map(),
            restoreDerived: () => undefined,
        };
        await dataCodec.read({ header: { kind: "graphty-data", version: 2 }, body, pointer: "" }, context);
    });
    return { session, problems };
}

/**
 * The source the ring was loaded into, as a data body writes it.
 * @param body - The body.
 * @returns Its record.
 */
function ringSource(body: JsonObject): JsonObject {
    return (body.sources as JsonObject[]).find((each) => each.kind !== "reader") as JsonObject;
}

describe("a file's looks in a version 2 save file", () => {
    it("saves an embedded GEXF's viz colors as columns of its source, and reopens drawing the same", async () => {
        const session = await ring();
        const before = drawn(session);
        // The file's own values are drawn: each node has its own color and size.
        assert.isDefined(before.n0.color);
        assert.notStrictEqual(before.n0.color, before.n1.color);
        assert.notStrictEqual(before.n0.size, before.n1.size);
        const fill = fillColumn(session);

        const saved = await session.project.save({ format: 2 });
        assert.notInclude(saved.text, "graphty.style");
        assert.notInclude(saved.text, "fileStyle");
        assert.deepEqual(saved.report.leftOut, []);

        // The fill is a column of the source's copy and of the graph, and a layer reads it as data.
        const file = JSON.parse(saved.text) as { sections: Record<string, JsonObject> };
        const { data, style } = file.sections;
        const copy = (ringSource(data).copy as { nodes: JsonObject }).nodes;
        assert.property(copy, fill);
        assert.property((data.graph as { nodes: JsonObject[] }).nodes[0], fill);
        assert.include(JSON.stringify(style.layers), `data.${fill}`);

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.deepEqual(drawn(reopened), before);
        session.dispose();
        reopened.dispose();
    });

    it("keeps each of two loads' looks painting its own nodes through a reopen", async () => {
        const session = await ring();
        const second = GEXF.replaceAll('id="n', 'id="m')
            .replaceAll('source="n', 'source="m')
            .replaceAll('target="n', 'target="m')
            .replaceAll('"200"', '"90"');
        await session.data.import({ type: "gexf", config: { data: second } }, { styles: "file", mode: "merge" });
        const before = drawn(session);
        assert.notStrictEqual(before.n0.color, before.m0.color, "the two files give different colors");

        const saved = await session.project.save({ format: 2 });
        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.deepEqual(drawn(reopened), before);
        session.dispose();
        reopened.dispose();
    });

    it("names the columns the layers read, with their types, in the style's dependencies", async () => {
        const session = await ring();
        const saved = await session.project.save({ format: 2 });
        const file = JSON.parse(saved.text) as { sections: Record<string, JsonObject> };
        const copy = (ringSource(file.sections.data).copy as { nodes: JsonObject }).nodes;
        const { columns } = file.sections.style.dependencies as {
            columns: { kind: string; name: string; schema: JsonObject }[];
        };
        const nodeColumns = columns.filter((each) => each.kind === "node");
        assert.include(
            nodeColumns.map((each) => each.name),
            fillColumn(session),
        );
        for (const column of nodeColumns) {
            assert.property(copy, column.name, `${column.name} is a column of the source`);
            assert.isNotEmpty(Object.keys(column.schema), `${column.name} carries its type`);
        }

        session.dispose();
    });

    it("keeps a reader's edit of a look column through a reopen", async () => {
        const session = await ring();
        const fill = fillColumn(session);
        await session.data.updateNodes([{ id: "n0", values: { [fill]: "#123456" } }]);
        const before = drawn(session);
        assert.strictEqual(before.n0.color?.toLowerCase(), "#123456");

        const saved = await session.project.save({ format: 2 });
        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.strictEqual(reopened.data.node("n0")?.[fill], "#123456");
        assert.deepEqual(drawn(reopened), before);
        session.dispose();
        reopened.dispose();
    });
});

describe("a file's looks in a source saved as a reference", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("writes a referenced GEXF as its reference alone, reporting no look column left out", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(GEXF)));
        const session = await ring("url");
        const fill = fillColumn(session);
        const embedded = await writeData(session);
        const id = String(ringSource(embedded.body).id);
        assert.property((ringSource(embedded.body).copy as { nodes: JsonObject }).nodes, fill);
        assert.deepEqual(embedded.problems, []);

        // The looks are columns of the rows the file gives, so the reference stands for them as it
        // stands for every other column.
        const referenced = await writeData(session, { [id]: "referenced" });
        const record = ringSource(referenced.body);
        assert.notProperty(record, "copy");
        assert.strictEqual((record.origin as JsonObject).url, URL_OF_RING);
        assert.deepEqual(referenced.problems, []);
        session.dispose();
    });

    it("embeds a referenced GEXF whose look column the reader edited, and keeps the edit through a reopen", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(GEXF)));
        const session = await ring("url");
        const fill = fillColumn(session);
        const id = String(ringSource((await writeData(session)).body).id);
        await session.data.updateNodes([{ id: "n0", values: { [fill]: "#123456" } }]);

        const { body, problems } = await writeData(session, { [id]: "referenced" });
        // An edited source is embedded whatever was asked, as any edited column makes it, and said.
        assert.property(ringSource(body), "copy");
        assert.deepInclude(problems, { code: "W_SOURCE_EMBEDDED", params: { source: id, reason: "edited" } });
        assert.notDeepInclude(
            problems.map((problem) => problem.params.pointer),
            `/sources/${id}`,
        );

        const reopened = await readData(body);
        assert.deepEqual(reopened.problems, []);
        assert.strictEqual(reopened.session.data.node("n0")?.[fill], "#123456");
        assert.strictEqual(reopened.session.data.node("n1")?.[fill], session.data.node("n1")?.[fill]);
        session.dispose();
        reopened.session.dispose();
    });

    it("reads a referenced GEXF again on open with its style choices, its looks back under the same names", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(GEXF)));
        const session = await ring("url");
        const fill = fillColumn(session);
        const before = drawn(session);
        const { text, id } = await savedByReference(session);
        const record = ringSource(dataOf(text));
        assert.notProperty(record, "copy");
        assert.strictEqual((record.options as JsonObject).styles, "file");

        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, {
            location: "https://example.org/projects/ring.graphty.json",
        });
        assert.deepEqual(
            report.problems.filter((problem) => problem.code !== "W_RECIPE_NOT_APPLIED"),
            [],
        );
        assert.strictEqual(reopened.data.node("n3")?.[fill], session.data.node("n3")?.[fill]);
        assert.deepEqual(drawn(reopened), before);
        assert.strictEqual(String(ringSource(dataOf((await reopened.project.save({ format: 2 })).text)).id), id);
        session.dispose();
        reopened.dispose();
    });

    it("keeps the name a look column was saved under when the load took a suffix beside other data", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(GEXF)));
        const fill = fillColumn(await ring());
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "x", [fill]: "red" }], edges: [] }) },
        });
        await session.data.import({ type: "gexf", config: { url: URL_OF_RING } }, { styles: "file", mode: "merge" });
        const suffixed = Object.keys(session.data.node("n0") ?? {}).find((key) => key.startsWith(`${fill} (`));
        assert.isDefined(suffixed, "the load named its column beside the one the graph held");
        const before = drawn(session);
        const { text } = await savedByReference(session);

        const reopened = createGraphSession(ON);
        await reopened.project.open(text, { location: "https://example.org/projects/ring.graphty.json" });
        assert.strictEqual(reopened.data.node("n0")?.[suffixed], session.data.node("n0")?.[suffixed]);
        assert.notProperty(reopened.data.node("n0"), fill);
        assert.deepEqual(drawn(reopened), before);
        session.dispose();
        reopened.dispose();
    });

    it("reports a referenced file that changed since the save, binds what it still holds and keeps the rest", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(GEXF)));
        const session = await ring("url");
        session.notes.add({ text: "the last one", targets: [{ node: "n5" }] });
        const { text, id } = await savedByReference(session);
        const data = dataOf(text);
        const expected = String((ringSource(data).origin as JsonObject).copy);

        // The file now lacks n5 and its edges.
        const changed = GEXF.replace(/<node id="n5"[^\n]*\n/, "").replaceAll(/<edge [^>]*"n5"[^>]*\/>\n?/g, "");
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(changed)));
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, {
            location: "https://example.org/projects/ring.graphty.json",
        });
        const found = report.problems.find((problem) => problem.code === "W_SOURCE_CHANGED");
        assert.deepInclude(found?.params, { source: id, expected });
        assert.notStrictEqual(found?.params.found, expected);
        assert.include(
            report.problems.map((problem) => problem.code),
            "W_REFERENCE_UNBOUND",
        );
        assert.isUndefined(reopened.data.node("n5"));
        assert.isDefined(reopened.data.node("n4"));

        const again = dataOf((await reopened.project.save({ format: 2 })).text);
        assert.notStrictEqual(again.build, data.build, "a changed source is a new build");
        assert.strictEqual(reopened.notes.list().length, 1, "the note naming what the file lost is kept");
        session.dispose();
        reopened.dispose();
    });
});

/**
 * A saved file's data section.
 * @param text - The file.
 * @returns The section.
 */
function dataOf(text: string): JsonObject {
    return (JSON.parse(text) as { sections: { data: JsonObject } }).sections.data;
}

/**
 * Save a session with the GEXF's source referenced.
 * @param session - The session.
 * @returns The file and the source id.
 */
async function savedByReference(session: GraphSession): Promise<{ text: string; id: string }> {
    const gexf = (dataOf((await session.project.save({ format: 2 })).text).sources as JsonObject[]).find(
        (each) => each.kind === "url",
    ) as JsonObject;
    const id = String(gexf.id);
    const saved = await session.project.save({ format: 2, embed: { [id]: "referenced" } });
    assert.deepEqual(saved.report.leftOut, []);
    return { text: saved.text, id };
}
