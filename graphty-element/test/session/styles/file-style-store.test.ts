/**
 * The file-style store: per-element style values kept beside the data and read by layers at
 * `graphty.style.<namespace>.<kind>.<key>`, the live degree paths, where a style document's
 * layers land, and the typed facts of a layer made from a file.
 */
import { assert, describe, it } from "vitest";

import {
    createGraphSession,
    type FileStyleLoadValues,
    fileStyleOf,
    type GraphSession,
    type Layer,
    quotePath,
} from "../../../session";
import { dispatcherOf } from "../../../src/session/GraphSession";
import {
    computedOf,
    computedPath,
    fileStyleNamespace,
    fileStylePath,
    isFileStyleNamespace,
    parseFileStylePath,
} from "../../../src/session/styles/fileStyles/path";

const MEMBER = fileStylePath("gexf", "node", "member.3");

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
    const load: FileStyleLoadValues = {
        importId: "i1",
        namespace: "gexf",
        format: "gexf",
        columns: [
            { kind: "node", key: "member.3", ids: ["b", "d"], values: [true, true] },
            { kind: "edge", key: "width", ids: [first.id], values: [4] },
        ],
    };
    await session.execute({ op: "data.setFileStyles", loads: [load] });
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
        assert.strictEqual(MEMBER, "graphty.style.gexf.node.member.3");
        assert.deepEqual(parseFileStylePath(MEMBER), { namespace: "gexf", kind: "node", key: "member.3" });
        assert.isUndefined(parseFileStylePath("graphty.style.gexf.vertex.x"));
        assert.isUndefined(parseFileStylePath("graphty.style.gexf.node"));
        assert.isUndefined(parseFileStylePath("graphty.notes.count"));
        assert.strictEqual(computedPath("degree"), "graphty.degree");
        assert.strictEqual(computedOf("graphty.inDegree"), "indegree");
        assert.isUndefined(computedOf("graphty.degrees"));
    });

    it("give a second load of one format its own namespace", () => {
        assert.strictEqual(fileStyleNamespace("gexf", new Set()), "gexf");
        assert.strictEqual(fileStyleNamespace("gexf", new Set(["gexf"])), "gexf-2");
        assert.strictEqual(fileStyleNamespace("gexf", new Set(["gexf", "gexf-2"])), "gexf-3");
        assert.strictEqual(fileStyleNamespace("cytoscape-js", new Set(["gexf"])), "cytoscape-js");
    });

    it("turn any format id into a namespace the store accepts", () => {
        for (const format of ["", "_x", "-x", "__", "My Format!", "f".repeat(80)]) {
            const taken = new Set<string>();
            for (let i = 0; i < 3; i++) {
                const namespace = fileStyleNamespace(format, taken);
                assert.isTrue(isFileStyleNamespace(namespace), `${format} -> ${namespace}`);
                taken.add(namespace);
            }
        }

        assert.strictEqual(fileStyleNamespace("", new Set()), "file");
        assert.strictEqual(fileStyleNamespace("_x", new Set()), "x");
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
            selector: { match: "has", path: fileStylePath("gexf", "edge", "width") },
            encode: { "edge.width": { by: fileStylePath("gexf", "edge", "width"), scale: "passthrough" } },
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

    it("never puts its values in the data records, pages or attributes", async () => {
        const session = await loaded();
        const text = JSON.stringify([session.data.nodes(), session.data.edges(), session.data.nodePage().records]);

        assert.notInclude(text, "member");
        assert.notInclude(text, "graphty.style");
        assert.isFalse(session.data.attributes().some((attribute) => attribute.path.includes("graphty.style")));
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
            op: "data.setFileStyles",
            loads: [
                {
                    importId: "i1",
                    namespace: "gexf",
                    format: "gexf",
                    columns: [{ kind: "node", key: "member.3", ids: ["a"], values: [true] }],
                },
            ],
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
        for (const loads of [
            [{ importId: "x", namespace: "has.dot", format: "gexf", columns: [] }],
            [
                {
                    importId: "x",
                    namespace: "gexf",
                    format: "gexf",
                    columns: [{ kind: "vertex", key: "k", ids: [], values: [] }],
                },
            ],
            [
                {
                    importId: "x",
                    namespace: "gexf",
                    format: "gexf",
                    columns: [{ kind: "node", key: "k", ids: ["a"], values: [] }],
                },
            ],
            [
                { importId: "x", namespace: "gexf", format: "gexf", columns: [] },
                { importId: "y", namespace: "gexf", format: "gexf", columns: [] },
            ],
        ]) {
            let code: unknown;
            try {
                await session.execute({ op: "data.setFileStyles", loads: loads as never });
            } catch (error) {
                ({ code } = error as { code?: unknown });
            }

            assert.strictEqual(code, "E_BAD_COMMAND", JSON.stringify(loads));
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
        assert.isUndefined(dispatcherOf(session).state.graph.values.get("fileStyles"));
        session.dispose();
    });

    it("reads nothing at an unknown graphty. path, or a namespace no load holds", async () => {
        const session = await loaded();
        for (const path of ["graphty.unknown", "graphty.style.dot.node.member.3", "graphty.style.gexf.node.member.4"]) {
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
            selector: { match: "has", path: fileStylePath("gexf", "edge", "width") },
            encode: { "edge.width": { by: fileStylePath("gexf", "edge", "width"), scale: "passthrough" } },
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
        assert.notInclude(text, "fileStyles");

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepEqual(report.problems, []);
        assert.isUndefined(dispatcherOf(opened).state.graph.values.get("fileStyles"));
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
        const report = await session.styles.applyTemplate(document, { templateId: "file:i1", at: "aboveBase" });
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

describe("fileStyleOf", () => {
    it("reads the facts a layer carries, through a userData update and a saved document", async () => {
        const session = await loaded();
        const origin = {
            format: "gexf",
            importId: "i1",
            ruleId: "node.class.3",
            role: "group",
            origin: "inferred",
            column: MEMBER,
            meanings: [{ value: 3, name: "kinase" }],
            elements: 2,
            classes: 1,
            reason: "STYLE_CLASS",
        };
        const layer = await session.styles.add({
            name: "node.class.3",
            target: "node",
            selector: { match: "has", path: MEMBER },
            set: { "node.color": "#ff0000" },
            fileStyle: origin,
        });

        assert.deepEqual(fileStyleOf(layer), origin);
        // the consumer's own bag is the consumer's: replacing it keeps the facts
        const updated = await session.styles.update(layer.id, { userData: { mine: true } });
        assert.deepEqual(fileStyleOf(updated), origin);
        assert.deepEqual(updated.userData, { mine: true });
        const reread = JSON.parse(JSON.stringify(session.styles.toDocument())) as {
            layers: { fileStyle?: unknown }[];
        };
        assert.deepEqual(fileStyleOf(reread.layers.at(-1) ?? {}), origin);
        session.dispose();
    });

    it("answers null for a layer not made from a file, and drops a malformed optional fact", () => {
        assert.isNull(fileStyleOf({}));
        assert.isNull(fileStyleOf({ fileStyle: { format: "gexf" } }));
        assert.isNull(fileStyleOf({ userData: { "graphty.fileStyle": { format: "gexf" } } } as never));
        const read = fileStyleOf({
            fileStyle: {
                format: "gexf",
                importId: "i1",
                ruleId: "r",
                role: "defaults",
                origin: "tool",
                elements: -1,
                meanings: [{ value: {}, name: "x" }],
            },
        });
        assert.isNotNull(read);
        assert.notProperty(read, "elements");
        assert.notProperty(read, "meanings");
    });
});
