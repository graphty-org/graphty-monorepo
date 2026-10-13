/**
 * A file's own styles drawn as layers by the load that reads it (`styles: "file"`): one layer per
 * rule in rule order, values in the load's file-style namespace, one undo step, replace and merge,
 * a layer graphty wrote rebuilt or set aside, and the bound on layers per kind.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { exportGraphToString, importGraph } from "@graphty/graph-io";
import { type ExtractedStyles, resolveStyles, type StyleRule } from "@graphty/graph-io/styles";
import { afterEach, assert, describe, it, vi } from "vitest";

import {
    createGraphSession,
    FILE_STYLE_CODES,
    FILE_STYLE_ISSUE,
    fileStyleOf,
    type GraphSession,
    type Layer,
} from "../../session";
import { DataSource } from "../../src/data/DataSource";
import { dispatcherOf } from "../../src/session/GraphSession";
import { FILE_STYLE_LAYER_CAP } from "../../src/session/styles/fileStyles/fold";
import { asFileStyleStore, FILE_STYLES_VALUE } from "../../src/session/styles/fileStyles/store";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");
const MISERABLES = readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8");

/**
 * A small GEXF file whose nodes are colored by group.
 * @param prefix - What every node id starts with, so two files hold different nodes.
 * @param colors - The color of group x and of group y, as r,g,b.
 * @returns The file.
 */
function coloredGexf(prefix: string, colors: readonly [string, string]): string {
    const viz = (rgb: string): string => {
        const [r, g, b] = rgb.split(",");
        return `<viz:color r="${r}" g="${g}" b="${b}"/>`;
    };
    const nodes = Array.from({ length: 12 }, (_unused, i) => {
        const group = i % 3 === 0 ? "y" : "x";
        return `<node id="${prefix}${String(i)}" label="${prefix}${String(i)}"><attvalues><attvalue for="0" value="${group}"/></attvalues>${viz(group === "x" ? colors[0] : colors[1])}</node>`;
    }).join("\n");
    const edges = Array.from(
        { length: 11 },
        (_unused, i) => `<edge source="${prefix}${String(i)}" target="${prefix}${String(i + 1)}"/>`,
    ).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><attributes class="node"><attribute id="0" title="group" type="string"/></attributes>
<nodes>
${nodes}
</nodes><edges>
${edges}
</edges></graph></gexf>`;
}

/**
 * What one element is drawn with on one channel, through `explain()`.
 * @param session - The session.
 * @param target - The element.
 * @param channel - The channel.
 * @returns The value, a color as `#rrggbb`.
 */
function drawn(session: GraphSession, target: { node: string } | { edge: string }, channel: string): unknown {
    const value = (session.styles.explain(target).merged as Record<string, unknown>)[channel];
    if (typeof value === "object" && value !== null && "hex" in value) {
        return (value as { hex: string }).hex.slice(0, 7).toLowerCase();
    }

    return value;
}

/**
 * The layer that decides one channel on one node.
 * @param session - The session.
 * @param id - The node.
 * @param channel - The channel.
 * @returns The layer, or undefined.
 */
function winner(session: GraphSession, id: string, channel: string): Layer | undefined {
    const layerId = session.styles.explain({ node: id }).channels.find((entry) => entry.channel === channel)?.layerId;
    return session.styles.list().find((layer) => layer.id === layerId);
}

/**
 * The layers a file's styles made.
 * @param session - The session.
 * @returns Them, bottom first.
 */
function fileLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((layer) => fileStyleOf(layer) !== null);
}

/**
 * The namespaces the file-style store holds.
 * @param session - The session.
 * @returns Them.
 */
function namespaces(session: GraphSession): string[] {
    const store = asFileStyleStore(dispatcherOf(session).state.graph.values.get(FILE_STYLES_VALUE));
    return store.loads.map((load) => load.values.namespace);
}

/**
 * The styles graph-io reads from a file, with the graph they index.
 * @param text - The file.
 * @param format - Its format.
 * @returns The styles and the graph.
 */
async function graphIo(
    text: string,
    format: string,
): Promise<{ styles: ExtractedStyles; snapshot: Awaited<ReturnType<typeof importGraph>>["snapshot"] }> {
    const result = await importGraph(new TextEncoder().encode(text), {
        styles: true,
        format,
        ...(format === "gexf" ? { addMissingNodes: true } : {}),
    });
    if (result.styles === null || result.styles === undefined) {
        assert.fail("the file carries styles");
    }

    return { styles: result.styles, snapshot: result.snapshot };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("a file's styles drawn by the load", () => {
    it("colors Les Miserables by Modularity Class with one discrete layer, as graph-io reads it", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "gexf", config: { data: MISERABLES } }, { styles: "file" });

        const layers = fileLayers(session);
        const discrete = layers.filter((layer) => fileStyleOf(layer)?.mapping === "discrete");
        assert.lengthOf(discrete, 1);
        assert.strictEqual(fileStyleOf(discrete[0])?.ruleId, "node.by.Modularity Class");
        assert.deepEqual(Object.keys(discrete[0].encode ?? {}), ["node.color"]);
        assert.deepEqual(namespaces(session), ["gexf"]);

        const { styles, snapshot } = await graphIo(MISERABLES, "gexf");
        const fill = resolveStyles(styles, "node", "fill", snapshot);
        const width = resolveStyles(styles, "node", "width", snapshot);
        const ratios: number[] = [];
        for (let i = 0; i < snapshot.nodeCount; i++) {
            const id = String(snapshot.ids.idOf(i));
            assert.strictEqual(drawn(session, { node: id }, "node.color"), fill[i], `node ${id} fill`);
            ratios.push((drawn(session, { node: id }, "node.size") as number) / (width[i] as number));
        }

        // Every node's size is the file's, scaled by one factor for the whole load (graph-io keeps
        // 6 significant digits of an interpolated size).
        for (const ratio of ratios) {
            assert.approximately(ratio, ratios[0], ratios[0] * 1e-5);
        }

        const color = resolveStyles(styles, "edge", "color", snapshot);
        const edges = session.data.edges();
        assert.strictEqual(edges.length, snapshot.edgeCount);
        edges.forEach((edge, row) => {
            assert.strictEqual(drawn(session, { edge: edge.id }, "edge.color"), color[row], `edge ${String(row)}`);
        });

        // The values the layers read never reach the data.
        assert.notProperty(session.data.nodes()[0], "graphty.style.gexf.node.class");
        session.dispose();
    });

    it("keeps the rule order: `node { width: 20 }` then `.big { width: 50 }` draws .big nodes at 50", async () => {
        const doc = JSON.stringify({
            elements: [
                { data: { id: "a" }, classes: "big" },
                { data: { id: "b" } },
                { data: { id: "c" }, classes: "big" },
                { data: { id: "d" } },
                { data: { id: "ab", source: "a", target: "b" } },
            ],
            style: [
                { selector: "node", style: { width: 20, height: 20 } },
                { selector: ".big", style: { width: 50, height: 50 } },
            ],
        });
        const session = createGraphSession();
        await session.data.import(
            { type: "json", config: { data: doc } },
            { styles: "file", styleOptions: { lengths: "file" } },
        );

        assert.strictEqual(drawn(session, { node: "a" }, "node.size"), 50);
        assert.strictEqual(drawn(session, { node: "c" }, "node.size"), 50);
        assert.strictEqual(drawn(session, { node: "b" }, "node.size"), 20);
        assert.deepEqual(namespaces(session), ["cytoscape-js"]);
        session.dispose();
    });

    it("follows the graph with a Cytoscape.js [[degree > 2]] rule: an added edge repaints the node", async () => {
        const doc = JSON.stringify({
            elements: [
                ...["a", "b", "c", "d", "e"].map((id) => ({ data: { id } })),
                { data: { id: "ab", source: "a", target: "b" } },
                { data: { id: "ac", source: "a", target: "c" } },
                { data: { id: "ad", source: "a", target: "d" } },
                { data: { id: "bd", source: "b", target: "d" } },
            ],
            style: [
                { selector: "node", style: { "background-color": "#ff0000" } },
                { selector: "node[[degree > 2]]", style: { "background-color": "#00ff00" } },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        assert.strictEqual(drawn(session, { node: "a" }, "node.color"), "#00ff00");
        assert.strictEqual(drawn(session, { node: "d" }, "node.color"), "#ff0000");

        await session.data.addEdges([{ source: "d", target: "e" }]);
        assert.strictEqual(drawn(session, { node: "d" }, "node.color"), "#00ff00");
        session.dispose();
    });

    it("leaves a load without the choice exactly as it was", async () => {
        const plain = createGraphSession();
        const asked = createGraphSession();
        await plain.data.import({ type: "gexf", config: { data: MISERABLES } });
        await asked.data.import({ type: "gexf", config: { data: MISERABLES } }, { styles: "none" });
        for (const session of [plain, asked]) {
            assert.lengthOf(fileLayers(session), 0);
            assert.deepEqual(namespaces(session), []);
            assert.notProperty(session.data.lastImport() ?? {}, "styles");
            assert.deepEqual(
                session.styles.list().map((layer) => layer.name),
                ["Node defaults", "Edge defaults"],
            );
        }

        assert.deepEqual(plain.data.nodes(), asked.data.nodes());
        plain.dispose();
        asked.dispose();
    });

    it("undoes the layers and the values with the load, in one step, and redoes them without reading again", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "kept" }]);
        await session.data.import(
            { type: "gexf", config: { data: coloredGexf("n", ["255,0,0", "0,0,255"]) } },
            { styles: "file" },
        );
        const made = fileLayers(session).map((layer) => layer.name);
        assert.isAbove(made.length, 0);
        const report = session.data.lastImport()?.styles;
        assert.deepEqual(
            report?.layers,
            fileLayers(session).map((layer) => layer.id),
        );

        await session.undo();
        assert.lengthOf(fileLayers(session), 0);
        assert.deepEqual(namespaces(session), []);
        assert.deepEqual(
            session.data.nodes().map((node) => node.id),
            ["kept"],
        );

        const read = vi.spyOn(DataSource.prototype, "fileStyles");
        await session.redo();
        assert.strictEqual(read.mock.calls.length, 0);
        assert.deepEqual(
            fileLayers(session).map((layer) => layer.name),
            made,
        );
        assert.deepEqual(namespaces(session), ["gexf"]);
        assert.strictEqual(drawn(session, { node: "n1" }, "node.color"), "#ff0000");
        session.dispose();
    });

    it("sweeps the previous file's layers when a load replaces the graph", async () => {
        const session = createGraphSession();
        const source = { type: "gexf", config: { data: coloredGexf("n", ["255,0,0", "0,0,255"]) } };
        await session.data.import(source, { styles: "file" });
        const once = fileLayers(session).length;
        await session.data.import(
            { type: "gexf", config: { data: coloredGexf("m", ["0,255,0", "0,0,255"]) } },
            { styles: "file" },
        );
        assert.strictEqual(fileLayers(session).length, once);
        assert.deepEqual(namespaces(session), ["gexf"]);
        assert.strictEqual(drawn(session, { node: "m1" }, "node.color"), "#00ff00");

        // A replacing load without styles sweeps them too.
        await session.data.import(source);
        assert.lengthOf(fileLayers(session), 0);
        session.dispose();
    });

    it("hides what the file hides through the visibility filter, and takes the file's background", async () => {
        const doc = JSON.stringify({
            elements: [
                ...["a", "b", "c"].map((id) => ({ data: { id } })),
                { data: { id: "ab", source: "a", target: "b" } },
            ],
            style: [{ selector: "#b", style: { display: "none" } }],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        assert.isTrue(session.visibility.isVisible("a"));
        assert.isFalse(session.visibility.isVisible("b"));

        await session.undo();
        await session.data.import(
            { type: "dot", config: { data: 'digraph { bgcolor="#336699"; a -> b }' } },
            { styles: "file" },
        );
        assert.strictEqual(session.config.background.backgroundType, "color");
        assert.strictEqual(String((session.config.background as { color?: string }).color).toLowerCase(), "#336699");
        session.dispose();
    });

    it("keeps each merged file's layers on its own nodes, under gexf and gexf-2", async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "gexf", config: { data: coloredGexf("a", ["255,0,0", "0,0,255"]) } },
            { styles: "file" },
        );
        await session.data.import(
            { type: "gexf", config: { data: coloredGexf("b", ["0,255,0", "255,255,0"]) } },
            { styles: "file", mode: "merge" },
        );

        assert.deepEqual(namespaces(session), ["gexf", "gexf-2"]);
        assert.strictEqual(drawn(session, { node: "a1" }, "node.color"), "#ff0000");
        assert.strictEqual(drawn(session, { node: "a0" }, "node.color"), "#0000ff");
        assert.strictEqual(drawn(session, { node: "b1" }, "node.color"), "#00ff00");
        assert.strictEqual(drawn(session, { node: "b0" }, "node.color"), "#ffff00");
        for (const id of ["a0", "a1", "a5"]) {
            assert.strictEqual(fileStyleOf(winner(session, id, "node.color") ?? {})?.importId, "gexf");
        }

        for (const id of ["b0", "b1", "b5"]) {
            assert.strictEqual(fileStyleOf(winner(session, id, "node.color") ?? {})?.importId, "gexf-2");
        }

        session.dispose();
    });
});

/**
 * A GEXF file graphty wrote: the file's own styles with graphty's layer for its color rule.
 * @param prefix - What every node id starts with.
 * @param where - The layer's selector.
 * @returns The file.
 */
async function graphtyWritten(prefix: string, where: string): Promise<string> {
    const text = coloredGexf(prefix, ["255,0,0", "0,0,255"]);
    const { styles, snapshot } = await graphIo(text, "gexf");
    const rules = styles.styles.rules.map((rule): StyleRule =>
        rule.target === "node" && rule.map?.fill !== undefined
            ? {
                  ...rule,
                  ext: {
                      "@graphty/graphty-element": {
                          name: `Group x of ${prefix}`,
                          target: "node",
                          selector: { match: "expression", where },
                          set: { "node.color": "#00ff00" },
                      },
                  },
              }
            : rule,
    );
    return exportGraphToString(snapshot, "gexf", { styles: { ...styles, styles: { ...styles.styles, rules } } });
}

describe("a file graphty wrote", () => {
    it("rebuilds graphty's own layers in each merged file's namespace, and sets aside one over 8 terms", async () => {
        const short = await graphtyWritten("a", "data.group == 'x'");
        const terms = Array.from({ length: 9 }, (_unused, i) => `data.label == 'b${String(i)}'`).join(" || ");
        const long = await graphtyWritten("b", terms);
        const session = createGraphSession();
        await session.data.import({ type: "gexf", config: { data: short } }, { styles: "file" });
        await session.data.import({ type: "gexf", config: { data: long } }, { styles: "file", mode: "merge" });

        // The short layer was rebuilt, and paints only the first file's group x.
        assert.strictEqual(drawn(session, { node: "a1" }, "node.color"), "#00ff00");
        assert.notStrictEqual(drawn(session, { node: "a0" }, "node.color"), "#00ff00");
        assert.strictEqual(fileStyleOf(winner(session, "a1", "node.color") ?? {})?.importId, "gexf");
        assert.notStrictEqual(drawn(session, { node: "b1" }, "node.color"), "#00ff00");
        // The long one fell back to the file's neutral rule: the file's own colors, on its own nodes.
        assert.strictEqual(drawn(session, { node: "b1" }, "node.color"), "#ff0000");
        assert.strictEqual(fileStyleOf(winner(session, "b1", "node.color") ?? {})?.importId, "gexf-2");
        const notes = session.data.lastImport()?.styles?.notes ?? [];
        assert.isTrue(notes.some((note) => note.code === FILE_STYLE_ISSUE.LAYER_SPEC_IGNORED));
        session.dispose();
    });
});

describe("a graphty layer whose expression holds an escape JSON rejects", () => {
    it("is ignored with a note, and the file's own colors still load", async () => {
        // each holds one backslash before characters JSON does not accept as an escape
        for (const where of [`data.label == 'see data."\\q"'`, `graphty.style.gexf.node."\\u12" == 1`]) {
            const text = await graphtyWritten("a", where);
            const session = createGraphSession();
            await session.data.import({ type: "gexf", config: { data: text } }, { styles: "file" });
            assert.strictEqual(drawn(session, { node: "a1" }, "node.color"), "#ff0000", where);
            const notes = session.data.lastImport()?.styles?.notes ?? [];
            assert.isTrue(
                notes.some((note) => note.code === FILE_STYLE_ISSUE.LAYER_SPEC_IGNORED),
                where,
            );
            session.dispose();
        }
    });
});

describe("a load's notes", () => {
    it("count each element once, however many of the file's rules give it a value drawn as the nearest", async () => {
        // Gephi's default disc applies to all three nodes and the file's own square to one: both
        // are drawn as the nearest 3D shape, but only three nodes are drawn that way.
        const gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><nodes>
<node id="a"><viz:color r="255" g="0" b="0"/><viz:size value="20"/></node>
<node id="b"><viz:color r="0" g="128" b="255"/><viz:size value="10"/></node>
<node id="c"><viz:color r="0" g="200" b="0"/><viz:size value="5"/><viz:shape value="square"/></node>
</nodes><edges><edge source="a" target="b"/><edge source="b" target="c"/></edges></graph></gexf>`;
        const session = createGraphSession();
        await session.data.import({ type: "gexf", config: { data: gexf } }, { styles: "file" });
        const notes = session.data.lastImport()?.styles?.notes ?? [];
        const nearest = notes.filter((note) => note.code === FILE_STYLE_ISSUE.DRAWN_NEAREST);
        assert.isAbove(nearest.length, 0);
        for (const note of nearest) {
            assert.isAtMost(Number(note.params.count), 3, JSON.stringify(note.params));
        }

        session.dispose();
    });
});

describe("a layer the element refuses", () => {
    it("is left out with a note, and the rest apply", async () => {
        const original = DataSource.prototype.fileStyles;
        vi.spyOn(DataSource.prototype, "fileStyles").mockImplementation(async function (this: DataSource, options) {
            const read = await original.call(this, options);
            if (read === null) {
                return null;
            }

            const refused: StyleRule = {
                id: "node.too-small",
                target: "node",
                role: "group",
                origin: "declared",
                where: { all: true },
                set: { "graphty:node.size": -5 },
            };
            return {
                ...read,
                extracted: {
                    ...read.extracted,
                    styles: { ...read.extracted.styles, rules: [...read.extracted.styles.rules, refused] },
                },
            };
        });
        const session = createGraphSession();
        await session.data.import(
            { type: "gexf", config: { data: coloredGexf("n", ["255,0,0", "0,0,255"]) } },
            { styles: "file" },
        );

        const notes = session.data.lastImport()?.styles?.notes ?? [];
        assert.isTrue(
            notes.some(
                (note) => note.code === FILE_STYLE_ISSUE.LAYER_REFUSED && note.params.property === "node.too-small",
            ),
        );
        assert.isFalse(fileLayers(session).some((layer) => layer.name === "node.too-small"));
        assert.strictEqual(drawn(session, { node: "n1" }, "node.color"), "#ff0000");
        session.dispose();
    });
});

describe("the codes", () => {
    it("lists every graph-io style code and the translation's own, once each", () => {
        assert.include(FILE_STYLE_CODES, "W_STYLE_LAYER_CAP");
        assert.include(FILE_STYLE_CODES, "W_STYLE_LAYER_REFUSED");
        assert.include(FILE_STYLE_CODES, "W_STYLES_NOT_IMPORTED");
        assert.strictEqual(new Set(FILE_STYLE_CODES).size, FILE_STYLE_CODES.length);
    });
});

/** The element's reader for each corpus directory. */
const READERS: Readonly<Record<string, string>> = {
    cx: "cx",
    cx2: "cx2",
    cys: "cys",
    cyjs: "json",
    dot: "dot",
    gexf: "gexf",
    gml: "gml",
    graphml: "graphml",
    json: "json",
    pajek: "pajek",
    xgmml: "xgmml",
};

/**
 * Every graph file under a directory.
 * @param dir - The directory.
 * @returns The paths, sorted.
 */
function graphFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            out.push(...graphFiles(path));
        } else if (!name.endsWith(".md") && !name.endsWith(".cycss") && !name.endsWith(".json.gz")) {
            out.push(path);
        }
    }

    return out;
}

describe("the bound on layers", () => {
    const files = Object.entries(READERS).flatMap(([dir, type]) =>
        graphFiles(join(CORPUS, dir)).map((path) => ({ dir, type, path })),
    );

    it.each(files.map((file) => [file.path.slice(CORPUS.length + 1), file] as const))(
        "%s makes at most 16 layers per kind",
        async (_name, file) => {
            const raw = readFileSync(file.path);
            const data = new Uint8Array(file.path.endsWith(".gz") ? gunzipSync(raw) : raw);
            const session = createGraphSession();
            try {
                await session.data.import(
                    { type: file.type, config: { data, errorLimit: 1_000_000 } },
                    { styles: "file" },
                );
            } catch (error) {
                // A file the element cannot load at all has no layers to count, and the parity
                // test covers which files load; a file that loads without its styles must load
                // with them.
                session.dispose();
                const plain = createGraphSession();
                const loads = await plain.data
                    .import({ type: file.type, config: { data, errorLimit: 1_000_000 } })
                    .then(
                        () => true,
                        () => false,
                    );
                plain.dispose();
                if (loads) {
                    throw error;
                }

                return;
            }

            for (const kind of ["node", "edge"] as const) {
                const count = fileLayers(session).filter((layer) => layer.target === kind).length;
                assert.isAtMost(count, FILE_STYLE_LAYER_CAP, `${kind} layers`);
            }

            session.dispose();
        },
    );
});
