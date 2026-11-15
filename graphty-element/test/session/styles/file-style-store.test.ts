/**
 * The style value store: per-element style values kept beside the data in named sets and read by
 * layers at `graphty.style.<set>.<kind>.<key>`, the live degree paths, where a style document's
 * layers land, and older projects' format-named store read back in today's shape.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type Layer, quotePath, type StyleValueSet } from "../../../session";
import { dispatcherOf } from "../../../src/session/GraphSession";
import {
    computedOf,
    computedPath,
    fileStylePath,
    parseFileStylePath,
} from "../../../src/session/styles/fileStyles/path";
import { nextStyleValueSetName } from "../../../src/session/styles/fileStyles/store";
import { fileStylesOn } from "../../helpers/file-styles-on";

fileStylesOn();

const MEMBER = fileStylePath("values", "node", "member.3");

/**
 * A session over five nodes and two edges, with one load's values: nodes b and d are members of
 * class 3, edge a->b holds a copied width.
 * @returns The session.
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    const [first] = session.data.edges();
    const set: StyleValueSet = {
        name: "values",
        columns: [
            { kind: "node", key: "member.3", ids: ["b", "d"], values: [true, true] },
            { kind: "edge", key: "width", ids: [first.id], values: [4] },
        ],
    };
    await session.execute({ op: "data.setStyleValues", sets: [set] });
    return session;
}

/**
 * What one node is drawn with on one channel, read through `explain()`.
 * @param session - The session.
 * @param id - The node.
 * @param channel - The channel.
 * @returns The merged value, a color as its hex string.
 */
function drawn(session: GraphSession, id: string, channel: string): unknown {
    const value = (session.styles.explain({ node: id }).merged as Record<string, unknown>)[channel];
    return typeof value === "object" && value !== null && "hex" in value ? value.hex : value;
}

/**
 * The nodes one layer wins a channel on.
 * @param session - The session.
 * @param layer - The layer.
 * @param channel - The channel.
 * @returns Their ids.
 */
function painted(session: GraphSession, layer: Layer, channel: string): string[] {
    return session.data
        .nodes()
        .map((node) => String(node.id))
        .filter(
            (id) =>
                session.styles.explain({ node: id }).channels.find((entry) => entry.channel === channel)?.layerId ===
                layer.id,
        );
}

describe("the file-style paths", () => {
    it("are built and parsed by one helper each, with dots allowed in the key", () => {
        assert.strictEqual(MEMBER, "graphty.style.values.node.member.3");
        assert.deepEqual(parseFileStylePath(MEMBER), { namespace: "values", kind: "node", key: "member.3" });
        assert.isUndefined(parseFileStylePath("graphty.style.gexf.vertex.x"));
        assert.isUndefined(parseFileStylePath("graphty.style.gexf.node"));
        assert.isUndefined(parseFileStylePath("graphty.notes.count"));
        assert.strictEqual(computedPath("degree"), "graphty.degree");
        assert.strictEqual(computedOf("graphty.inDegree"), "indegree");
        assert.isUndefined(computedOf("graphty.degrees"));
    });

    it("go by their keys in a legend, never by their paths", async () => {
        const session = await loaded();
        await session.data.addEdges([{ source: "c", target: "a" }]);
        const copied = await session.styles.add({
            name: "Copied width",
            target: "edge",
            selector: { match: "has", path: fileStylePath("values", "edge", "width") },
            encode: { "edge.width": { by: fileStylePath("values", "edge", "width"), scale: "passthrough" } },
        });
        const degree = await session.styles.add({
            name: "By in-degree",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "graphty.inDegree", scale: "passthrough" } },
        });
        await session.styles.settled();
        const fieldOf = (id: string): string | undefined =>
            session.styles.legendOf(id).find((block) => block.field !== undefined)?.field?.plainName;

        assert.strictEqual(fieldOf(copied.id), "width");
        assert.strictEqual(fieldOf(degree.id), "In-degree");
        session.dispose();
    });

    it("name each new set by its place, never by where its values came from", () => {
        assert.strictEqual(nextStyleValueSetName(new Set()), "values");
        assert.strictEqual(nextStyleValueSetName(new Set(["values"])), "values-2");
        assert.strictEqual(nextStyleValueSetName(new Set(["values", "values-2"])), "values-3");
    });
});

describe("the file-style store", () => {
    it("lets a layer select exactly the stored members", async () => {
        const session = await loaded();
        const layer = await session.styles.add({
            name: "Class 3",
            target: "node",
            selector: { match: "has", path: MEMBER },
            set: { "node.color": "#ff0000" },
        });

        assert.deepEqual(painted(session, layer, "node.color"), ["b", "d"]);
        assert.strictEqual(drawn(session, "b", "node.color"), "#ff0000");

        const expression = await session.styles.add({
            name: "Class 3 again",
            target: "node",
            selector: { match: "expression", where: `${quotePath(MEMBER)} == \`true\`` },
            set: { "node.color": "#00ff00" },
        });
        assert.deepEqual(painted(session, expression, "node.color"), ["b", "d"]);
        session.dispose();
    });

    it("binds an edge layer to an edge column, and a node path reads nothing on an edge", async () => {
        const session = await loaded();
        await session.styles.add({
            name: "Copied width",
            target: "edge",
            selector: { match: "has", path: fileStylePath("values", "edge", "width") },
            encode: { "edge.width": { by: fileStylePath("values", "edge", "width"), scale: "passthrough" } },
        });
        const crossed = await session.styles.add({
            name: "Node path on edges",
            target: "edge",
            selector: { match: "has", path: MEMBER },
            set: { "edge.color": "#ff0000" },
        });
        const [first, second] = session.data.edges();
        const widthOf = (id: string): unknown =>
            (session.styles.explain({ edge: id }).merged as Record<string, unknown>)["edge.width"];

        assert.strictEqual(widthOf(first.id), 4);
        assert.notStrictEqual(widthOf(second.id), 4);
        assert.strictEqual(session.styles.counts(crossed.id).matched, 0);
        session.dispose();
    });

    it("never puts its values in the data records or pages", async () => {
        const session = await loaded();
        const text = JSON.stringify([session.data.nodes(), session.data.edges(), session.data.nodePage().records]);

        assert.notInclude(text, "member");
        assert.notInclude(text, "graphty.style");
        session.dispose();
    });

    it("lists its columns as readable values, named by key, which a hand-made layer binds", async () => {
        const session = await loaded();
        const listed = session.data.readableValues().filter((value) => value.path.startsWith("graphty.style."));
        assert.deepEqual(
            listed.map((value) => [value.path, value.on, value.plainName]),
            [
                [MEMBER, "node", "member.3"],
                [fileStylePath("values", "edge", "width"), "edge", "width"],
            ],
        );

        const width = listed[1];
        const layer = await session.styles.add({
            name: "By width",
            target: "edge",
            selector: { match: "has", path: width.path },
            encode: { "edge.width": { by: width.path, scale: "passthrough" } },
        });
        assert.strictEqual(session.styles.counts(layer.id).matched, 1);
        session.dispose();
    });

    it("repaints a reader when the values change, and undo puts them back", async () => {
        const session = await loaded();
        const layer = await session.styles.add({
            name: "Class 3",
            target: "node",
            selector: { match: "has", path: MEMBER },
            set: { "node.color": "#ff0000" },
        });
        await session.execute({
            op: "data.setStyleValues",
            sets: [{ name: "values", columns: [{ kind: "node", key: "member.3", ids: ["a"], values: [true] }] }],
        });
        await session.styles.settled();
        assert.deepEqual(painted(session, layer, "node.color"), ["a"]);
        assert.strictEqual(session.styles.counts(layer.id).matched, 1);

        await session.undo();
        await session.styles.settled();
        assert.deepEqual(painted(session, layer, "node.color"), ["b", "d"]);
        assert.strictEqual(session.styles.counts(layer.id).matched, 2);
        session.dispose();
    });

    it("refuses malformed values before writing anything", async () => {
        const session = await loaded();
        for (const sets of [
            [{ name: "has.dot", columns: [] }],
            [{ name: "values", columns: [{ kind: "vertex", key: "k", ids: [], values: [] }] }],
            [{ name: "values", columns: [{ kind: "node", key: "k", ids: ["a"], values: [] }] }],
            [
                { name: "values", columns: [] },
                { name: "values", columns: [] },
            ],
        ]) {
            let code: unknown;
            try {
                await session.execute({ op: "data.setStyleValues", sets: sets as never });
            } catch (error) {
                ({ code } = error as { code?: unknown });
            }

            assert.strictEqual(code, "E_BAD_COMMAND", JSON.stringify(sets));
        }

        assert.strictEqual(drawn(session, "b", "node.color"), drawn(session, "a", "node.color"));
        const layer = await session.styles.add({
            name: "Class 3",
            target: "node",
            selector: { match: "has", path: MEMBER },
            set: { "node.color": "#ff0000" },
        });
        assert.deepEqual(painted(session, layer, "node.color"), ["b", "d"]);
        session.dispose();
    });

    it("is swept when the data is cleared", async () => {
        const session = await loaded();
        await session.data.clear();
        assert.isUndefined(dispatcherOf(session).state.graph.values.get("styleValues"));
        session.dispose();
    });

    it("reads nothing at an unknown graphty. path, or a namespace no load holds", async () => {
        const session = await loaded();
        for (const path of [
            "graphty.unknown",
            "graphty.style.other.node.member.3",
            "graphty.style.values.node.member.4",
        ]) {
            const layer = await session.styles.add({
                name: path,
                target: "node",
                selector: { match: "has", path },
                set: { "node.color": "#ff0000" },
            });
            assert.strictEqual(session.styles.counts(layer.id).matched, 0, path);
        }

        session.dispose();
    });
});

describe("the live degree paths", () => {
    it("follow an added edge", async () => {
        const session = await loaded();
        await session.styles.add({
            name: "By degree",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: computedPath("degree"), scale: "passthrough" } },
        });
        assert.strictEqual(drawn(session, "a", "node.size"), 1);
        assert.strictEqual(drawn(session, "b", "node.size"), 2);

        await session.data.addEdges([
            { source: "a", target: "c" },
            { source: "d", target: "a" },
        ]);
        await session.styles.settled();
        assert.strictEqual(drawn(session, "a", "node.size"), 3);
        session.dispose();
    });

    it("read in- and out-degree, and select with an expression", async () => {
        const session = await loaded();
        await session.data.addEdges([{ source: "a", target: "c" }]);
        const hubs = await session.styles.add({
            name: "Two out",
            target: "node",
            selector: { match: "expression", where: "graphty.outDegree >= `2`" },
            set: { "node.color": "#ff0000" },
        });
        const sinks = await session.styles.add({
            name: "Two in",
            target: "node",
            selector: { match: "expression", where: "graphty.inDegree >= `2`" },
            set: { "node.color": "#0000ff" },
        });

        assert.deepEqual(painted(session, hubs, "node.color"), ["a"]);
        assert.deepEqual(painted(session, sinks, "node.color"), ["c"]);
        session.dispose();
    });
});

describe("the file styles in a project file", () => {
    it("are saved and restored, and every element explains the same", async () => {
        const saved = await loaded();
        await saved.styles.add({
            name: "Class 3",
            target: "node",
            selector: { match: "has", path: MEMBER },
            set: { "node.color": "#ff0000" },
        });
        await saved.styles.add({
            name: "Copied width",
            target: "edge",
            selector: { match: "has", path: fileStylePath("values", "edge", "width") },
            encode: { "edge.width": { by: fileStylePath("values", "edge", "width"), scale: "passthrough" } },
        });
        const { text } = await saved.project.save();

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepEqual(report.problems, []);
        await opened.styles.settled();

        const explained = (session: GraphSession): unknown => [
            ...session.data.nodes().map((node) => session.styles.explain({ node: node.id }).merged),
            ...session.data.edges().map((_edge, at) => {
                const { id } = session.data.edges()[at];
                return session.styles.explain({ edge: id }).merged;
            }),
        ];
        assert.deepEqual(explained(opened), explained(saved));
        assert.strictEqual(drawn(opened, "d", "node.color"), "#ff0000");
        saved.dispose();
        opened.dispose();
    });

    it("opens a file written before file styles unchanged", async () => {
        const saved = createGraphSession();
        await saved.data.addNodes([{ id: "a" }]);
        const { text } = await saved.project.save();
        assert.notInclude(text, "styleValues");

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepEqual(report.problems, []);
        assert.isUndefined(dispatcherOf(opened).state.graph.values.get("styleValues"));
        saved.dispose();
        opened.dispose();
    });
});

describe("where applyTemplate puts a document's layers", () => {
    const document = {
        version: 1 as const,
        layers: [
            {
                name: "From the file",
                target: "node" as const,
                selector: { match: "everything" as const },
                set: { "node.color": "#00ff00" },
            },
        ],
    };

    it("lands directly above the base layers with at: aboveBase", async () => {
        const session = await loaded();
        const mine = await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#123456" },
        });
        const report = await session.styles.applyTemplate(document, { at: "aboveBase" });
        const ids = session.styles.list().map((layer) => layer.id);
        const bases = session.styles.list().filter((layer) => layer.locked).length;

        assert.strictEqual(ids.indexOf(report.applied[0]), bases);
        assert.strictEqual(ids.at(-1), mine.id);
        assert.strictEqual(drawn(session, "a", "node.color"), "#123456");
        session.dispose();
    });

    it("lands on top by default, and beneath a named layer with before", async () => {
        const session = await loaded();
        const mine = await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#123456" },
        });
        const top = await session.styles.applyTemplate(document);
        assert.strictEqual(session.styles.list().at(-1)?.id, top.applied[0]);

        const before = await session.styles.applyTemplate(document, { at: { before: mine.id } });
        const ids = session.styles.list().map((layer) => layer.id);
        assert.strictEqual(ids.indexOf(before.applied[0]) + 1, ids.indexOf(mine.id));

        let code: unknown;
        try {
            await session.styles.applyTemplate(document, { at: "middle" as never });
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_BAD_COMMAND");
        session.dispose();
    });
});

describe("a layer's specification", () => {
    it("keeps no facts about where a layer came from: a fileStyle field is dropped", async () => {
        const session = await loaded();
        const layer = await session.styles.add({
            name: "Class 3",
            target: "node",
            selector: { match: "has", path: MEMBER },
            set: { "node.color": "#ff0000" },
            fileStyle: { format: "gexf", importId: "i1", ruleId: "r", role: "group", origin: "inferred" },
        } as never);

        assert.notProperty(layer, "fileStyle");
        assert.notInclude(JSON.stringify(session.styles.toDocument()), "fileStyle");
        session.dispose();
    });
});

/**
 * Walk a parsed project file, calling `visit` on every object in it.
 * @param value - The value.
 * @param visit - What to call.
 */
function walk(value: unknown, visit: (node: Record<string, unknown>) => void): void {
    if (Array.isArray(value)) {
        for (const each of value) {
            walk(each, visit);
        }
    } else if (typeof value === "object" && value !== null) {
        visit(value as Record<string, unknown>);
        for (const each of Object.values(value)) {
            walk(each, visit);
        }
    }
}

describe("an older project's format-named store", () => {
    it("opens, draws the same, and is saved again with no trace of the format", async () => {
        const saved = await loaded();
        await saved.styles.add({
            name: "Class 3",
            target: "node",
            selector: { match: "expression", where: `${quotePath(MEMBER)} == \`true\`` },
            set: { "node.color": "#ff0000" },
        });
        await saved.styles.add({
            name: "Copied width",
            target: "edge",
            selector: { match: "has", path: fileStylePath("values", "edge", "width") },
            encode: { "edge.width": { by: fileStylePath("values", "edge", "width"), scale: "passthrough" } },
        });
        const today = (await saved.project.save()).text;

        // The same project as an older element wrote it: the store under `fileStyles`, one load per
        // format, paths named by the format, and facts and a `file:` template on its layers.
        const older = JSON.parse(
            today.replaceAll("graphty.style.values.", 'graphty.style.\\"cytoscape-js\\".'),
        ) as unknown;
        walk(older, (node) => {
            if (Array.isArray(node.styleValues)) {
                node.fileStyles = (node.styleValues as { columns: unknown }[]).map((set) => ({
                    importId: "i1",
                    namespace: "cytoscape-js",
                    format: "cytoscape-js",
                    columns: set.columns,
                }));
                delete node.styleValues;
            }

            if (typeof node.selector === "object" && typeof node.name === "string" && node.name !== "") {
                node.fileStyle = {
                    format: "cytoscape-js",
                    importId: "i1",
                    ruleId: "r",
                    role: "group",
                    origin: "inferred",
                };
                node.source = { by: "template", templateId: "file:i1" };
            }

            for (const key of ["by", "path"]) {
                if (typeof node[key] === "string") {
                    node[key] = node[key].replaceAll('"cytoscape-js"', "cytoscape-js");
                }
            }
        });
        const olderText = JSON.stringify(older);
        assert.include(olderText, "fileStyles");
        assert.include(olderText, "file:i1");

        const opened = createGraphSession();
        const report = await opened.project.open(olderText);
        assert.deepEqual(report.problems, []);
        await opened.styles.settled();
        assert.strictEqual(drawn(opened, "d", "node.color"), "#ff0000");
        assert.strictEqual(drawn(opened, "a", "node.color"), drawn(saved, "a", "node.color"));
        const [first] = opened.data.edges();
        assert.strictEqual(
            (opened.styles.explain({ edge: first.id }).merged as Record<string, unknown>)["edge.width"],
            4,
        );

        const again = (await opened.project.save()).text;
        for (const trace of ["cytoscape-js", "fileStyles", "fileStyle", "file:i1", "importId"]) {
            assert.notInclude(again, trace);
        }
        assert.include(again, "styleValues");
        saved.dispose();
        opened.dispose();
    });
});
