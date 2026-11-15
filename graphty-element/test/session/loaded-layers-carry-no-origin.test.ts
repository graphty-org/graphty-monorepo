/**
 * After a load, nothing the element keeps says which program, format or load produced it: no
 * layer, graph value or saved field names the format, no layer carries a `file:` template or a
 * `fileStyle`, a replacing load removes only the previous load's layers the reader left alone, and
 * annotations are an ordinary graph feature any caller writes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession, type DrawnAnnotation, type GraphSession } from "../../session";
import { dispatcherOf } from "../../src/session/GraphSession";
import { fileStylesOn } from "../helpers/file-styles-on";
import { loadedLayers } from "../helpers/loaded-layers";

fileStylesOn();

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");
const MISERABLES = readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8");

const CYTOSCAPE = JSON.stringify({
    elements: [
        { data: { id: "a" }, classes: "big" },
        { data: { id: "b" } },
        { data: { id: "ab", source: "a", target: "b" } },
    ],
    style: [
        { selector: "node", style: { "background-color": "#ff0000", width: 20, height: 20 } },
        { selector: ".big", style: { "background-color": "#0000ff", width: 50, height: 50 } },
        { selector: "edge", style: { "line-color": "#00ff00", "target-arrow-shape": "triangle" } },
    ],
});

/** A text annotation. */
const NOTE: DrawnAnnotation = {
    id: "n1",
    kind: "text",
    layer: "foreground",
    z: 0,
    rotation: 0,
    text: "hello",
    at: { x: 1, y: 2 },
    anchor: "center",
    fontSize: 12,
    fontFamily: "sans-serif",
    bold: false,
    italic: false,
    color: "#000000",
    opacity: 1,
};

/**
 * Where the data came from, which the reader chose and the session reports as such: the load's
 * source, its record and its one-time report. Everything else is kept state.
 */
const SOURCE_FACTS: ReadonlySet<string> = new Set(["source", "sources", "provenance", "importReport"]);

/**
 * Everything the session keeps after a load that is not a record of where the data came from, as
 * text: its layers, its graph values, and its saved session and style members.
 * @param session - The session.
 * @returns The text.
 */
async function kept(session: GraphSession): Promise<string> {
    const values = Object.fromEntries(
        [...dispatcherOf(session).state.graph.values].filter(([key]) => !SOURCE_FACTS.has(key)),
    );
    const { text } = await session.project.save();
    const members = (JSON.parse(text) as { members: { kind: string }[] }).members.filter(
        (member) => member.kind === "graphty-session" || member.kind === "graphty-style",
    );
    return JSON.stringify([session.styles.list(), values, members]);
}

describe("a loaded file's layers and values", () => {
    for (const [format, type, data, traces] of [
        ["gexf", "gexf", MISERABLES, ['"gexf"', "graphty.style.gexf", "gexf-"]],
        ["cytoscape-js", "json", CYTOSCAPE, ["cytoscape", "cytoscape-js"]],
    ] as const) {
        it(`name nothing about the ${format} file they came from, and survive a save`, async () => {
            const session = createGraphSession();
            await session.data.import({ type, config: { data } }, { styles: "file" });
            const layers = loadedLayers(session);
            assert.isNotEmpty(layers);
            for (const layer of layers) {
                assert.notProperty(layer, "fileStyle");
                assert.deepEqual(layer.source, { by: "user" });
            }

            const text = await kept(session);
            for (const trace of [...traces, "file:", "fileStyle", "importId", '"format"']) {
                assert.notInclude(text, trace, trace);
            }

            session.dispose();
        });
    }
});

describe("a replacing load", () => {
    it("removes the previous load's untouched layers and keeps the one the reader edited", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: CYTOSCAPE } }, { styles: "file" });
        const first = loadedLayers(session);
        assert.isAbove(first.length, 1);
        await session.styles.update(first[0].id, { name: "Mine now" });

        await session.data.import({ type: "json", config: { data: CYTOSCAPE } }, { styles: "file" });
        const names = session.styles.list().map((layer) => `${layer.target} ${layer.name}`);
        assert.include(names, `${first[0].target} Mine now`);
        // Each untouched layer went: the second load's copy of it is the only one left.
        for (const layer of first.slice(1)) {
            const key = `${layer.target} ${layer.name}`;
            assert.lengthOf(
                names.filter((name) => name === key),
                1,
                key,
            );
        }

        assert.isNotEmpty(loadedLayers(session));
        session.dispose();
    });

    it("is undone in one step, putting the previous layers back", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: CYTOSCAPE } }, { styles: "file" });
        const before = session.styles.list().map((layer) => layer.id);
        await session.data.import({ type: "json", config: { data: CYTOSCAPE } }, { styles: "file" });
        await session.undo();
        assert.deepEqual(
            session.styles.list().map((layer) => layer.id),
            before,
        );
        session.dispose();
    });
});

describe("annotations", () => {
    it("are added, changed and removed through the public commands, undone, and saved", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.annotations.add(NOTE);
        assert.deepEqual(session.annotations.list(), [NOTE]);

        await session.annotations.update("n1", { text: "changed" });
        assert.strictEqual((session.annotations.list()[0] as { text: string }).text, "changed");
        await session.undo();
        assert.strictEqual((session.annotations.list()[0] as { text: string }).text, "hello");

        const { text } = await session.project.save();
        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepEqual(report.problems, []);
        assert.deepEqual(opened.annotations.list(), [NOTE]);

        await opened.annotations.remove("n1");
        assert.deepEqual(opened.annotations.list(), []);
        await opened.annotations.add(NOTE);
        await opened.annotations.clear();
        assert.deepEqual(opened.annotations.list(), []);
        session.dispose();
        opened.dispose();
    });

    it("refuse a repeated id and an unknown one", async () => {
        const session = createGraphSession();
        await session.annotations.add(NOTE);
        const codeOf = async (work: () => Promise<void>): Promise<unknown> => {
            try {
                await work();
            } catch (error) {
                return (error as { code?: unknown }).code;
            }
            return undefined;
        };

        assert.strictEqual(await codeOf(() => session.annotations.add(NOTE)), "E_BAD_COMMAND");
        assert.strictEqual(await codeOf(() => session.annotations.remove("nope")), "E_BAD_COMMAND");
        assert.deepEqual(session.annotations.list(), [NOTE]);
        session.dispose();
    });

    it("a loaded file draws come back through session.annotations.list()", async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "dot", config: { data: 'digraph { label="A title"; a -> b }' } },
            { styles: "file" },
        );
        const texts = session.annotations.list().map((each) => (each as { text?: string }).text);
        assert.include(texts, "A title");
        session.dispose();
    });
});
