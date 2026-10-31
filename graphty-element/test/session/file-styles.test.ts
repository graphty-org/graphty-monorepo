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
    type EdgeId,
    FILE_STYLE_CODES,
    FILE_STYLE_ISSUE,
    fileStyleOf,
    type GraphSession,
    type Layer,
    type NodeId,
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

    it("draws a node's opacity on its border too, times the border's own", async () => {
        const doc = JSON.stringify({
            elements: [
                { data: { id: "a" }, classes: "faint" },
                { data: { id: "b" }, classes: "half" },
                { data: { id: "c" } },
            ],
            style: [
                { selector: "node", style: { "border-width": 2 } },
                { selector: ".faint", style: { opacity: 0.15 } },
                { selector: ".half", style: { opacity: 0.5, "border-opacity": 0.5 } },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });

        assert.strictEqual(drawn(session, { node: "a" }, "node.borderOpacity"), 0.15);
        assert.strictEqual(drawn(session, { node: "b" }, "node.borderOpacity"), 0.25);
        assert.notStrictEqual(drawn(session, { node: "c" }, "node.borderOpacity"), 0.15);
        session.dispose();
    });

    it("draws a vis-network edge background in its own dashes: dotted, dashed or dash-dot", async () => {
        const edge = (id: string, dashes: number[]): object => ({
            id,
            from: "s",
            to: "t",
            smooth: { enabled: true, type: "curvedCW" },
            background: { enabled: true, dashes },
        });
        const doc = JSON.stringify({
            nodes: [
                { id: "s", x: 0, y: 0 },
                { id: "t", x: 100, y: 0 },
            ],
            edges: [edge("dot", [6, 4]), edge("dash", [30, 10]), edge("dash-dot", [30, 5, 6, 5])],
            options: { physics: false },
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });

        assert.deepEqual(
            session.data.edges().map((record) => drawn(session, { edge: record.id }, "edge.outlineStyle")),
            ["dot", "dash", "dash-dot"],
        );
        session.dispose();
    });

    it("draws each node's own opacity on its border when rules by id set them", async () => {
        const doc = JSON.stringify({
            elements: [{ data: { id: "p" } }, { data: { id: "q" } }, { data: { id: "r" } }],
            style: [
                { selector: "node", style: { "border-width": 1, "border-opacity": 1, opacity: 1 } },
                { selector: "#p", style: { opacity: 0.5 } },
                { selector: "#q", style: { opacity: 0.15 } },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });

        assert.strictEqual(drawn(session, { node: "p" }, "node.borderOpacity"), 0.5);
        assert.strictEqual(drawn(session, { node: "q" }, "node.borderOpacity"), 0.15);
        // a border at full strength is left at the element's default, 1
        assert.include([undefined, 1], drawn(session, { node: "r" }, "node.borderOpacity"));
        session.dispose();
    });

    it("draws every 2D shape as the flat shape of the same name, with no nearest note", async () => {
        const doc = JSON.stringify({
            elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "c" } }],
            style: [
                { selector: "#a", style: { shape: "round-rectangle" } },
                { selector: "#b", style: { shape: "rhomboid" } },
                { selector: "#c", style: { shape: "rectangle" } },
            ],
        });
        const session = createGraphSession();
        // Without Cytoscape's default ellipse beneath.
        await session.data.import(
            { type: "json", config: { data: doc } },
            { styles: "file", styleOptions: { toolDefaults: false } },
        );

        assert.strictEqual(drawn(session, { node: "a" }, "node.shape"), "round-rectangle");
        assert.strictEqual(drawn(session, { node: "b" }, "node.shape"), "parallelogram");
        assert.strictEqual(drawn(session, { node: "c" }, "node.shape"), "rectangle");
        const nearest = (session.data.lastImport()?.styles?.notes ?? []).filter(
            (note) => note.code === FILE_STYLE_ISSUE.DRAWN_NEAREST && note.params.property === "shape",
        );
        assert.deepEqual(nearest, []);
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

    it("paints a DOT file without bgcolor white, as Graphviz does", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: "digraph { a -> b }" } }, { styles: "file" });
        assert.strictEqual(session.config.background.backgroundType, "color");
        assert.strictEqual(String((session.config.background as { color?: string }).color).toLowerCase(), "#ffffff");
        session.dispose();
    });

    it("turns the view a quarter turn for a DOT file Graphviz draws landscape, and leaves an upright one alone", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: "digraph { a -> b }" } }, { styles: "file" });
        assert.isUndefined(session.config.viewRotation);
        for (const attrs of ["rotate=90;", "landscape=true;", "orientation=landscape;"]) {
            await session.undo();
            await session.data.import(
                { type: "dot", config: { data: `digraph { ${attrs} a -> b }` } },
                { styles: "file" },
            );
            assert.strictEqual(session.config.viewRotation, 90, attrs);
        }
        // One undo takes the import and its turn back together
        await session.undo();
        assert.isUndefined(session.config.viewRotation);
        session.dispose();
    });

    it("draws a Cytoscape font size mapped over a ramp as the whole number Cytoscape draws", async () => {
        const doc = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            { attributeDeclarations: [{ nodes: { w: { d: "double" } } }] },
            { nodes: [0, 1, 2, 3, 17].map((w) => ({ id: w, v: { w } })) },
            {
                visualProperties: [
                    {
                        default: { node: { NODE_LABEL_FONT_SIZE: 12 } },
                        nodeMapping: {
                            NODE_LABEL_FONT_SIZE: {
                                type: "CONTINUOUS",
                                definition: {
                                    attribute: "w",
                                    map: [
                                        { max: 0, maxVPValue: 10, includeMax: false },
                                        {
                                            min: 0,
                                            max: 17,
                                            minVPValue: 10,
                                            maxVPValue: 40,
                                            includeMin: true,
                                            includeMax: true,
                                        },
                                        { min: 17, minVPValue: 40, includeMin: false },
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
            { status: [{ success: true }] },
        ]);
        const session = createGraphSession();
        // lengths: "file" keeps the file's numbers, so the rounding is seen unscaled
        await session.data.import(
            { type: "cx2", config: { data: doc } },
            { styles: "file", styleOptions: { lengths: "file" } },
        );
        const sizes = ["0", "1", "2", "3", "17"].map((id) => {
            const label = (session.styles.explain({ node: id }).merged as Record<string, unknown>)["node.labelStyle"];
            return (label as { sizePx?: unknown } | undefined)?.sizePx;
        });
        assert.deepStrictEqual(sizes, [10, 12, 14, 15, 40]);
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

describe("a file's groups (compound nodes)", () => {
    const zIndex = (session: GraphSession, id: string): unknown => drawn(session, { node: id }, "node.zIndex");

    it("draws every Cytoscape.js compound behind what it holds, an outer one behind an inner one", async () => {
        const doc = JSON.stringify({
            elements: [
                { data: { id: "outer" } },
                { data: { id: "inner", parent: "outer" } },
                { data: { id: "a", parent: "inner" } },
                { data: { id: "b", parent: "inner" } },
                { data: { id: "c", parent: "outer" } },
                { data: { id: "free" } },
                { data: { id: "ab", source: "a", target: "b" } },
            ],
            style: [{ selector: "node", style: { "background-color": "#ff0000" } }],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });

        assert.strictEqual(zIndex(session, "outer"), -2);
        assert.strictEqual(zIndex(session, "inner"), -1);
        for (const id of ["a", "b", "c", "free"]) {
            assert.isUndefined(zIndex(session, id), id);
        }
        // Only the groups are painted: the layer that sets it is scoped to them.
        const layer = winner(session, "outer", "node.zIndex");
        assert.strictEqual(fileStyleOf(layer as Layer)?.ruleId, "node.groups");
        session.dispose();
    });

    it("caps a file's rounded corners at 8 file units, or at the radius the file gives", async () => {
        const voctomix = readFileSync(
            join(CORPUS, "graphml", "yed-shapenode", "voc__voctomix__schema.graphml"),
            "utf8",
        );
        const yed = createGraphSession();
        await yed.data.import({ type: "graphml", config: { data: voctomix } }, { styles: "file" });
        // Group n0 is 112 x 734 in the file: its corners are 8 of those units, not 28.
        const ratio = (session: GraphSession, id: string): number =>
            (drawn(session, { node: id }, "node.cornerRadius") as number) /
            (drawn(session, { node: id }, "node.width") as number);
        assert.approximately(ratio(yed, "n0"), 8 / 112, 1e-6);
        yed.dispose();

        const cy = createGraphSession();
        const doc = JSON.stringify({
            elements: { nodes: [{ data: { id: "a" } }, { data: { id: "b" } }] },
            style: [
                { selector: "node", style: { shape: "round-rectangle", width: 40, height: 20 } },
                { selector: "#a", style: { "corner-radius": 3 } },
            ],
        });
        await cy.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        assert.approximately(ratio(cy, "a"), 3 / 40, 1e-6);
        assert.approximately(ratio(cy, "b"), 8 / 40, 1e-6);
        cy.dispose();
    });

    it("draws every yEd group node behind its members, and nothing when the file's styles are not drawn", async () => {
        const voctomix = readFileSync(
            join(CORPUS, "graphml", "yed-shapenode", "voc__voctomix__schema.graphml"),
            "utf8",
        );
        const styled = createGraphSession();
        await styled.data.import({ type: "graphml", config: { data: voctomix } }, { styles: "file" });
        for (const group of ["n0", "n1", "n2", "n3"]) {
            assert.strictEqual(zIndex(styled, group), -1, group);
        }
        assert.isUndefined(zIndex(styled, "n2::n0"));

        const plain = createGraphSession();
        await plain.data.import({ type: "graphml", config: { data: voctomix } });
        assert.isUndefined(zIndex(plain, "n2"));
        styled.dispose();
        plain.dispose();
    });
});

describe("a file's arrowheads", () => {
    /**
     * How long an edge's head is drawn against its source node's width, both in the scene's units.
     * @param session - The session.
     * @param edge - The edge.
     * @param node - The node.
     * @returns The ratio.
     */
    const headPerNode = (session: GraphSession, edge: EdgeId, node: NodeId): number =>
        (0.5 * (drawn(session, { edge }, "edge.arrowHeadSize") as number)) /
        (1.5 * (drawn(session, { node: String(node) }, "node.size") as number));

    it("draws Graphviz's arrowheads ARROW_LENGTH 10 times arrowsize long, against its 54-wide nodes", async () => {
        const session = createGraphSession();
        const dot = "digraph { a -> b; b -> c [arrowsize=2]; }";
        await session.data.import({ type: "dot", config: { data: dot } }, { styles: "file" });
        const [plain, doubled] = session.data.edges();
        assert.approximately(headPerNode(session, plain.id, plain.source), 10 / 54, 1e-6);
        assert.approximately(headPerNode(session, doubled.id, doubled.source), 20 / 54, 1e-6);
        // Graphviz's normal arrow is 0.7 of its length wide, the element's 0.8
        assert.approximately(drawn(session, { edge: plain.id }, "edge.arrowHeadWidth") as number, 0.7 / 0.8, 1e-9);
        session.dispose();
    });

    it("draws Cytoscape's DELTA (6 + width) * 2 long and half as wide, so a wider line has a longer head", async () => {
        const session = createGraphSession();
        const cx2 = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            {
                nodes: [
                    { id: 1, x: 0, y: 0 },
                    { id: 2, x: 100, y: 0 },
                    { id: 3, x: 200, y: 0 },
                ],
            },
            {
                edges: [
                    { id: 10, s: 1, t: 2 },
                    { id: 11, s: 2, t: 3, v: { w: 4 } },
                ],
            },
            { attributeDeclarations: [{ edges: { w: { d: "double" } } }] },
            {
                visualProperties: [
                    {
                        default: {
                            node: { NODE_WIDTH: 75, NODE_HEIGHT: 35 },
                            edge: { EDGE_WIDTH: 1, EDGE_TARGET_ARROW_SHAPE: "triangle" },
                        },
                        edgeMapping: {
                            EDGE_WIDTH: { type: "PASSTHROUGH", definition: { attribute: "w", type: "double" } },
                        },
                    },
                ],
            },
            { status: [{ error: "", success: true }] },
        ]);
        await session.data.import({ type: "cx2", config: { data: cx2 } }, { styles: "file" });
        const [thin, wide] = session.data.edges();
        assert.approximately(headPerNode(session, thin.id, thin.source), 14 / 75, 1e-6);
        assert.approximately(headPerNode(session, wide.id, wide.source), 20 / 75, 1e-6);
        assert.approximately(drawn(session, { edge: thin.id }, "edge.arrowHeadWidth") as number, 0.5 / 0.8, 1e-9);
        session.dispose();
    });

    it("draws Cytoscape's source arrow at its own size, and a short delta half as long as a DELTA", async () => {
        const session = createGraphSession();
        const cx2 = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            {
                nodes: [
                    { id: 1, x: 0, y: 0 },
                    { id: 2, x: 100, y: 0 },
                ],
            },
            { edges: [{ id: 10, s: 1, t: 2 }] },
            {
                visualProperties: [
                    {
                        default: {
                            node: { NODE_WIDTH: 75, NODE_HEIGHT: 35 },
                            edge: {
                                EDGE_WIDTH: 1,
                                EDGE_TARGET_ARROW_SHAPE: "triangle",
                                EDGE_TARGET_ARROW_SIZE: 6,
                                EDGE_SOURCE_ARROW_SHAPE: "delta_short_1",
                                EDGE_SOURCE_ARROW_SIZE: 12,
                            },
                        },
                    },
                ],
            },
            { status: [{ error: "", success: true }] },
        ]);
        await session.data.import({ type: "cx2", config: { data: cx2 } }, { styles: "file" });
        const [edge] = session.data.edges();
        const tailPerNode =
            (0.5 * (drawn(session, { edge: edge.id }, "edge.arrowTailSize") as number)) /
            (1.5 * (drawn(session, { node: String(edge.source) }, "node.size") as number));
        // the head is a DELTA of size 6: (6 + 1) * 2 long
        assert.approximately(headPerNode(session, edge.id, edge.source), 14 / 75, 1e-6);
        // the tail is DELTA_SHORT_1 of size 12: (12 + 1) long, as wide as a DELTA of that size
        assert.approximately(tailPerNode, 13 / 75, 1e-6);
        assert.approximately(drawn(session, { edge: edge.id }, "edge.arrowTailWidth") as number, 1 / 0.8, 1e-9);
        session.dispose();
    });

    it("draws both of Cytoscape's arrows size times width when the source is a half arrow (DEdgeDetails.adjustArrowSize)", async () => {
        const session = createGraphSession();
        const cx2 = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            {
                nodes: [
                    { id: 1, x: 0, y: 0 },
                    { id: 2, x: 100, y: 0 },
                    { id: 3, x: 200, y: 0 },
                ],
            },
            {
                edges: [
                    { id: 10, s: 1, t: 2 },
                    { id: 11, s: 2, t: 3 },
                ],
            },
            {
                visualProperties: [
                    {
                        default: {
                            node: { NODE_WIDTH: 75, NODE_HEIGHT: 35 },
                            edge: {
                                EDGE_WIDTH: 1.5,
                                EDGE_TARGET_ARROW_SHAPE: "triangle",
                                EDGE_TARGET_ARROW_SIZE: 6,
                                EDGE_SOURCE_ARROW_SIZE: 10,
                            },
                        },
                    },
                ],
            },
            { edgeBypasses: [{ id: 10, v: { EDGE_SOURCE_ARROW_SHAPE: "half_top" } }] },
            { status: [{ error: "", success: true }] },
        ]);
        await session.data.import({ type: "cx2", config: { data: cx2 } }, { styles: "file" });
        const [half, plain] = session.data.edges();
        const tailPerNode =
            (0.5 * (drawn(session, { edge: half.id }, "edge.arrowTailSize") as number)) /
            (1.5 * (drawn(session, { node: String(half.source) }, "node.size") as number));
        // HALF_TOP's barb is 0.5675 of a DELTA 2 * (10 * 1.5) long, where a target half arrow is 2 * (10 + 1.5)
        assert.approximately(tailPerNode, (2 * 15 * 0.5675) / 75, 1e-3);
        // getTargetArrowSize reads the source's shape too: its DELTA is 2 * (6 * 1.5) long
        assert.approximately(headPerNode(session, half.id, half.source), 18 / 75, 1e-6);
        // an edge without a half arrow at its source keeps (6 + 1.5) * 2
        assert.approximately(headPerNode(session, plain.id, plain.source), 15 / 75, 1e-6);
        session.dispose();
    });

    it("draws vis-network's crow and inv_triangle 0.6 of their length wide, as its end-points draw them", async () => {
        const doc = JSON.stringify({
            nodes: [
                { id: "s", x: 0, y: 0 },
                { id: "t", x: 100, y: 0 },
            ],
            edges: [
                { id: "c", from: "s", to: "t", arrows: { to: { enabled: true, type: "crow" } } },
                { id: "i", from: "s", to: "t", arrows: { to: { enabled: true, type: "inv_triangle" } } },
            ],
            options: { physics: false },
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        // the element's crow and inverted triangle are 0.8 of their length wide
        for (const record of session.data.edges()) {
            assert.approximately(drawn(session, { edge: record.id }, "edge.arrowHeadWidth") as number, 0.6 / 0.8, 1e-9);
        }
        session.dispose();
    });

    it("draws Graphviz's crow 0.9 and its inv 0.7 of their length wide (arrows.c)", async () => {
        const session = createGraphSession();
        const dot = "digraph { a -> b [arrowhead=crow]; b -> c [arrowhead=inv]; }";
        await session.data.import({ type: "dot", config: { data: dot } }, { styles: "file" });
        const [crow, inv] = session.data.edges();
        assert.approximately(drawn(session, { edge: crow.id }, "edge.arrowHeadWidth") as number, 0.9 / 0.8, 1e-9);
        assert.approximately(drawn(session, { edge: inv.id }, "edge.arrowHeadWidth") as number, 0.7 / 0.8, 1e-9);
        session.dispose();
    });

    it("draws each shape of a Graphviz stacked arrowhead behind the first, each in its own proportions", async () => {
        const session = createGraphSession();
        const dot = "digraph { a -> b [arrowhead=boxdotnormal]; b -> c [arrowhead=lteeoldiamond]; c -> d }";
        await session.data.import({ type: "dot", config: { data: dot } }, { styles: "file" });
        const [bdn, tod, plain] = session.data.edges();
        const head = drawn(session, { edge: bdn.id }, "edge.arrowHeadSize") as number;
        assert.strictEqual(drawn(session, { edge: bdn.id }, "edge.arrowHead"), "box");
        // arrows.c: a box and a dot 0.8 of the arrow's length, a normal the whole of it, 0.7 of its length wide
        const parts = String(drawn(session, { edge: bdn.id }, "edge.arrowHeadStack")).split(" ");
        assert.deepEqual(
            parts.map((p) => p.replace(/[*x].*$/, "")),
            ["dot", "normal"],
        );
        const sizeOf = (part: string): number => Number(/\*([\d.]+)/.exec(part)?.[1]);
        assert.approximately(sizeOf(parts[0]), head, 1e-6);
        assert.approximately(sizeOf(parts[1]), head / 0.8, 1e-6);
        assert.match(parts[1], /x0\.875$/);
        assert.match(String(drawn(session, { edge: tod.id }, "edge.arrowHeadStack")), /^open-diamond:left\*/);
        assert.isUndefined(drawn(session, { edge: plain.id }, "edge.arrowHeadStack"));
        session.dispose();
    });

    it("draws Graphviz's obox as its box, 0.8 of the arrow's length (arrows.c arrow_type_box)", async () => {
        const session = createGraphSession();
        const dot = "digraph { a -> b [arrowhead=obox]; b -> c [arrowhead=box]; }";
        await session.data.import({ type: "dot", config: { data: dot } }, { styles: "file" });
        const [open, filled] = session.data.edges();
        assert.approximately(headPerNode(session, open.id, open.source), 8 / 54, 1e-6);
        assert.approximately(headPerNode(session, filled.id, filled.source), 8 / 54, 1e-6);
        session.dispose();
    });
});

describe("a file's drawing order", () => {
    const order = (session: GraphSession, id: string): unknown => drawn(session, { node: id }, "node.drawOrder");
    const doc = JSON.stringify({
        elements: ["first", "second", "third"].map((id) => ({ data: { id } })),
        style: [{ selector: "node", style: { "background-color": "#ff0000" } }],
    });

    it("draws a node later in the file on top of one before it", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });

        assert.strictEqual(order(session, "first"), 0);
        assert.strictEqual(order(session, "second"), 50);
        assert.strictEqual(order(session, "third"), 100);
        assert.strictEqual(fileStyleOf(winner(session, "third", "node.drawOrder") as Layer)?.ruleId, "node.drawOrder");
        session.dispose();
    });

    it("orders nothing when the file's styles are not drawn", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } });

        for (const id of ["first", "second", "third"]) {
            assert.isUndefined(order(session, id), id);
        }
        session.dispose();
    });
});

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
        // Two rules give node a a box wider than it is tall, which is drawn as one size (the
        // nearest): two nodes are drawn that way, not three.
        const doc = JSON.stringify({
            elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "c" } }],
            style: [
                { selector: "#a, #b", style: { width: 40, height: 20 } },
                { selector: "#a", style: { width: 60, height: 20 } },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        const notes = session.data.lastImport()?.styles?.notes ?? [];
        const nearest = notes.filter((note) => note.code === FILE_STYLE_ISSUE.DRAWN_NEAREST);
        assert.isAbove(nearest.length, 0);
        for (const note of nearest) {
            assert.isAtMost(Number(note.params.count), 2, JSON.stringify(note.params));
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
