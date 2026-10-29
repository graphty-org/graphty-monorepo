/**
 * @file A file's styles and its stored drawing are drawn in ONE unit (issue #2322): node sizes,
 * border widths, edge widths, label sizes and the stored positions all keep the proportions the
 * file gives them. The scene lengths each channel draws:
 *
 * - `node.size`, `node.borderWidth`: 1.5 scene units per unit (NodeMesh's NODE_EXTENT_PER_SIZE)
 * - `edge.width`: 1/40 scene unit per unit (a 2D line, EdgeMesh)
 * - a label's `sizePx` (the renderer's `fontSize`): its letters are sizePx^2 / (48 (1.33 sizePx + 10))
 *   scene units tall (RichTextLabel: one line's plane is sizePx / 48 tall, drawn from a canvas of the
 *   line box plus 10 px of margin)
 * - a position: the scene coordinate the session holds, the file's coordinate times the one file scale
 *   the load records with its styles (`LoadStyleReport.lengthScale`), read through `data/filePositions.ts`
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession, type NodeId } from "../../session";
import { buildExportSnapshot } from "../../src/data/export";
import { dispatcherOf } from "../../src/session/GraphSession";

/** A Cytoscape.js document: nodes 40 across with a border 2 wide and labels 20 high, edges 2 wide, nodes 400 apart. */
const DOC = JSON.stringify({
    elements: {
        nodes: [
            { data: { id: "a", name: "a" }, position: { x: 0, y: 0 } },
            { data: { id: "b", name: "b" }, position: { x: 400, y: 0 } },
            { data: { id: "c", name: "c" }, position: { x: 0, y: 300 } },
        ],
        edges: [{ data: { id: "ab", source: "a", target: "b" } }, { data: { id: "ac", source: "a", target: "c" } }],
    },
    style: [
        {
            selector: "node",
            style: {
                width: 40,
                height: 40,
                "border-width": 2,
                "border-color": "#000000",
                label: "data(name)",
                "font-size": 20,
            },
        },
        { selector: "edge", style: { width: 2, "font-size": 20, label: "data(id)" } },
    ],
});

/** File lengths. */
const FILE = { node: 40, border: 2, edge: 2, font: 20, ab: 400 } as const;

/**
 * What one element is drawn with on one channel.
 * @param session - The session.
 * @param target - The element.
 * @param channel - The channel.
 * @returns The value.
 */
function drawn(session: GraphSession, target: { node: NodeId } | { edge: string }, channel: string): unknown {
    return (session.styles.explain(target).merged as Record<string, unknown>)[channel];
}

/**
 * A number a channel draws.
 * @param session - The session.
 * @param target - The element.
 * @param channel - The channel.
 * @returns The number.
 */
function number(session: GraphSession, target: { node: NodeId } | { edge: string }, channel: string): number {
    const value = drawn(session, target, channel);
    assert.isNumber(value, `${channel} of ${JSON.stringify(target)}`);
    return value as number;
}

/**
 * A label's font size (`sizePx`).
 * @param session - The session.
 * @param target - The element.
 * @returns The size.
 */
function fontSize(session: GraphSession, target: { node: NodeId } | { edge: string }): number {
    const kind = "node" in target ? "node" : "edge";
    const style = drawn(session, target, `${kind}.labelStyle`) as { sizePx?: unknown } | undefined;
    assert.isNumber(style?.sizePx, `label size of ${JSON.stringify(target)}`);
    return style?.sizePx as number;
}

/**
 * How tall a label's letters are drawn in the scene.
 * @param sizePx - The label's size.
 * @returns Scene units.
 */
function letters(sizePx: number): number {
    return (sizePx * sizePx) / (48 * (1.33 * sizePx + 10));
}

/**
 * Load the document with its styles, letting the element choose the layout.
 * @returns The session, settled.
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "json", config: { data: DOC } }, { styles: "file", layout: "recommended" });
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    return session;
}

describe("a file's lengths are drawn in one unit", () => {
    it("draws edge widths, border widths and label sizes in proportion to the node size", async () => {
        const session = await loaded();
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        const border = number(session, { node: "a" }, "node.borderWidth") * 1.5;
        const edgeId = session.data.edges()[0].id;
        const edge = number(session, { edge: edgeId }, "edge.width") / 40;
        const label = letters(fontSize(session, { node: "a" }));
        const edgeLabel = letters(fontSize(session, { edge: edgeId }));

        assert.approximately(border / node, FILE.border / FILE.node, 1e-6, "border to node");
        assert.approximately(edge / node, FILE.edge / FILE.node, 1e-6, "edge to node");
        assert.approximately(label / node, FILE.font / FILE.node, 1e-6, "node label to node");
        assert.approximately(edgeLabel / node, FILE.font / FILE.node, 1e-6, "edge label to node");
        session.dispose();
    });

    it('keeps the file\'s label sizes with labelSizes: "file", and scales the other lengths', async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "json", config: { data: DOC } },
            { styles: "file", layout: "recommended", styleOptions: { labelSizes: "file" } },
        );
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        const scale = session.data.lastImport()?.styles?.lengthScale as number;

        assert.strictEqual(fontSize(session, { node: "a" }), FILE.font);
        assert.approximately(number(session, { node: "a" }, "node.size") * 1.5, FILE.node * scale, 1e-6);
        session.dispose();
    });

    it("draws labels of different sizes each in proportion, not only the median one", async () => {
        const doc = JSON.stringify({
            elements: {
                nodes: [
                    { data: { id: "a", fs: 4 }, position: { x: 0, y: 0 } },
                    { data: { id: "b", fs: 20 }, position: { x: 100, y: 0 } },
                    { data: { id: "c", fs: 80 }, position: { x: 200, y: 0 } },
                ],
                edges: [],
            },
            style: [{ selector: "node", style: { width: 40, height: 40, label: "data(id)", "font-size": "data(fs)" } }],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file", layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        for (const [id, fs] of [
            ["a", 4],
            ["b", 20],
            ["c", 80],
        ] as const) {
            assert.approximately(letters(fontSize(session, { node: id })) / node, fs / 40, 1e-6, `label of ${id}`);
        }
        session.dispose();
    });

    it("draws the stored positions in the same unit as the node size", async () => {
        const session = await loaded();
        // A headless session runs no layout engine: its positions are the data's, read through the
        // position path, as the fixed layout the element runs reads them.
        assert.strictEqual(session.layout.id, "fixed");
        assert.notProperty(session.layout.options, "scale", "the fixed layout is told no scale");
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        const b = at(session, "b");

        assert.approximately((b.x - at(session, "a").x) / node, FILE.ab / FILE.node, 1e-4);
        session.dispose();
    });

    it("reports the one file scale the load drew every length and position with", async () => {
        const session = await loaded();
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        const scale = session.data.lastImport()?.styles?.lengthScale;

        assert.isNumber(scale);
        assert.approximately(scale as number, node / FILE.node, 1e-9, "a file unit of node size");
        assert.approximately(at(session, "b").x, FILE.ab * (scale as number), 1e-3, "a file unit of position");
        session.dispose();
    });

    it("divides the file scale back out of the positions written without styles", async () => {
        const session = await loaded();
        const { snapshot } = buildExportSnapshot(session);
        const column = snapshot.nodes.require("position");
        const row = snapshot.ids.requireIndex("b");

        assert.deepEqual(
            Array.from((column as unknown as { data: Float64Array }).data.subarray(3 * row, 3 * row + 2)),
            [FILE.ab, 0],
            "a file loaded and saved keeps its own coordinates",
        );
        session.dispose();
    });

    it("draws a file merged into the graph at the graph's scale", async () => {
        const session = await loaded();
        const scale = session.data.lastImport()?.styles?.lengthScale as number;
        // Nodes half as wide as the first file's, 200 units out.
        const merged = JSON.stringify({
            elements: {
                nodes: [{ data: { id: "m" }, position: { x: 200, y: 0 } }],
                edges: [],
            },
            style: [{ selector: "node", style: { width: 20, height: 20 } }],
        });
        await session.data.import({ type: "json", config: { data: merged } }, { styles: "file", mode: "merge" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });

        assert.strictEqual(session.data.lastImport()?.styles?.lengthScale, scale);
        assert.approximately(number(session, { node: "m" }, "node.size") * 1.5, 20 * scale, 1e-6);
        assert.approximately(at(session, "m").x, 200 * scale, 1e-3);
        session.dispose();
    });

    it("keeps the scale with the load's style values through undo and redo", async () => {
        const session = await loaded();
        const scale = session.data.lastImport()?.styles?.lengthScale;
        assert.isNumber(scale);
        const before = at(session, "b").x;
        assert.approximately(before, FILE.ab * (scale as number), 1e-3);
        await session.undo();
        assert.lengthOf(session.data.nodes(), 0);
        await session.redo();
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });

        assert.approximately(at(session, "b").x, before, 1e-3);
        assert.approximately(buildExportPosition(session, "b"), FILE.ab, 1e-3);
        session.dispose();
    });

    it('keeps the file\'s numbers with lengths: "file", and positions in file units', async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "json", config: { data: DOC } },
            { styles: "file", layout: "recommended", styleOptions: { lengths: "file" } },
        );
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        const edgeId = session.data.edges()[0].id;

        assert.strictEqual(number(session, { node: "a" }, "node.size"), FILE.node);
        assert.strictEqual(number(session, { edge: edgeId }, "edge.width"), FILE.edge);
        assert.strictEqual(fontSize(session, { node: "a" }), FILE.font);
        const snapshot = session.snapshot();
        const b = { x: 0, y: 0, z: 0 };
        session.positions.read(snapshot.ids.requireIndex("b"), b);
        assert.strictEqual(b.x, FILE.ab, "one file unit is one scene unit");
        assert.strictEqual(session.data.lastImport()?.styles?.lengthScale, 1);
        session.dispose();
    });

    it("leaves a load without file styles drawn at the file's positions", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: DOC } }, { layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        const snapshot = session.snapshot();
        const b = { x: 0, y: 0, z: 0 };
        session.positions.read(snapshot.ids.requireIndex("b"), b);

        assert.strictEqual(session.layout.id, "fixed");
        assert.strictEqual(b.x, FILE.ab, "one file unit is one scene unit");
        session.dispose();
    });
});

/**
 * Where a node is, in the scene.
 * @param session - The session.
 * @param id - The node.
 * @returns Its coordinates.
 */
function at(session: GraphSession, id: NodeId): { x: number; y: number; z: number } {
    const out = { x: 0, y: 0, z: 0 };
    session.positions.read(session.snapshot().ids.requireIndex(id), out);
    return out;
}

/**
 * A node's x as an export without styles writes it.
 * @param session - The session.
 * @param id - The node.
 * @returns The coordinate.
 */
function buildExportPosition(session: GraphSession, id: NodeId): number {
    const { snapshot } = buildExportSnapshot(session);
    const column = snapshot.nodes.require("position") as unknown as { data: Float64Array };
    return column.data[3 * snapshot.ids.requireIndex(id)];
}

/** Load a DOT document with its styles, letting the element choose the layout. */
async function loadedDot(text: string): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "dot", config: { data: text } }, { styles: "file", layout: "recommended" });
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    return session;
}

/**
 * How far apart two nodes are drawn, over a node's drawn size.
 * @param session - The session, laid out by the fixed layout.
 * @returns The ratio for nodes a and b.
 */
function spacingOverSize(session: GraphSession): number {
    assert.strictEqual(session.layout.id, "fixed");
    const node = number(session, { node: "a" }, "node.size") * 1.5;
    const a = at(session, "a");
    const b = at(session, "b");
    return Math.hypot(b.x - a.x, b.y - a.y) / node;
}

describe("a file of nodes wider than they are tall", () => {
    it("draws the median node's larger side at the element's node size", async () => {
        // Boxes 145 x 40: a median over widths and heights together falls between the two (92.5)
        // and draws every box 1.57 node sizes wide; by each node's larger side it is 1.
        const doc = JSON.stringify({
            elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "c" } }],
            style: [{ selector: "node", style: { shape: "rectangle", width: 145, height: 40 } }],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        assert.closeTo(number(session, { node: "a" }, "node.width"), 1, 1e-9);
        assert.closeTo(number(session, { node: "a" }, "node.height"), 40 / 145, 1e-9);
        session.dispose();
    });
});

describe("a label's wrap width", () => {
    it("is drawn in the scene's units, in proportion to the node size", async () => {
        // Nodes 40 across wrap their labels at 80: twice a node's width, which is 1.5 scene units.
        const doc = JSON.stringify({
            elements: [{ data: { id: "a", name: "a long label" } }, { data: { id: "b", name: "b" } }],
            style: [
                {
                    selector: "node",
                    style: { width: 40, height: 40, label: "data(name)", "text-wrap": "wrap", "text-max-width": 80 },
                },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        const label = drawn(session, { node: "a" }, "node.labelStyle") as { wrapWidth?: unknown } | undefined;
        assert.closeTo(Number(label?.wrapWidth), 2 * 1.5, 1e-9);
        session.dispose();
    });
});

describe("a DOT file's lengths are drawn in one unit", () => {
    it("draws neato input positions (inches) in proportion to the node size (points)", async () => {
        // Nodes half an inch across (36 points), 4 inches apart (288 points): Graphviz draws them 8 node widths apart.
        const session = await loadedDot(
            'graph G { node [shape=circle, width=0.5, fixedsize=true]; a [pos="0,0"]; b [pos="4,0"]; a -- b; }',
        );
        assert.approximately(spacingOverSize(session), 288 / 36, 1e-4);
        session.dispose();
    });

    it("draws positions laid out by Graphviz (points) in proportion to the node size", async () => {
        const session = await loadedDot(
            'graph G { graph [bb="0,0,324,36"]; node [shape=circle, width=0.5, fixedsize=true]; a [pos="18,18"]; b [pos="306,18"]; a -- b; }',
        );
        assert.approximately(spacingOverSize(session), 288 / 36, 1e-4);
        session.dispose();
    });
});

/**
 * Load a Pajek document with its styles, letting the element choose the layout.
 * @param text - The document.
 * @param styleOptions - The style options of the load.
 * @returns The session, settled.
 */
async function loadedPajek(
    text: string,
    styleOptions?: { readonly lengths?: "median" | "file"; readonly toolDefaults?: boolean },
): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import(
        { type: "pajek", config: { data: text } },
        { styles: "file", layout: "recommended", ...(styleOptions === undefined ? {} : { styleOptions }) },
    );
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    return session;
}

/**
 * How far apart nodes a and b are drawn, in scene units.
 * @param session - The session, laid out by the fixed layout.
 * @returns The distance.
 */
function spacing(session: GraphSession): number {
    assert.strictEqual(session.layout.id, "fixed");
    const [first, second] = session.data.nodes().map((n) => n.id);
    const a = at(session, first);
    const b = at(session, second);
    return Math.hypot(b.x - a.x, b.y - a.y);
}

describe("a Pajek file's lengths are drawn in one unit", () => {
    // Pajek draws the [0,1] square as 500 points, and a vertex 20 points times x_fact (measured in Pajek 6.02's own SVG
    // export): 0.8 apart is 400 points.
    const pair = (params: string): string =>
        `*Vertices 2\n1 "a" 0.1 0.5 0.5 ${params}\n2 "b" 0.9 0.5 0.5 ${params}\n*Edges\n1 2\n`;

    it("draws vertices of Pajek's normal size 20 vertex widths apart", async () => {
        const session = await loadedPajek(pair(""));
        const node = number(session, { node: session.data.nodes()[0].id }, "node.size") * 1.5;
        assert.approximately(spacing(session) / node, 400 / 20, 1e-4);
        session.dispose();
    });

    it("draws vertices of x_fact 4 a quarter as many widths apart", async () => {
        const session = await loadedPajek(pair("x_fact 4 y_fact 4"));
        const node = number(session, { node: session.data.nodes()[0].id }, "node.size") * 1.5;
        assert.approximately(spacing(session) / node, 400 / 80, 1e-4);
        session.dispose();
    });

    it('draws the coordinates in points with lengths: "file", as the vertex sizes are', async () => {
        const session = await loadedPajek(pair(""), { lengths: "file" });
        assert.strictEqual(number(session, { node: session.data.nodes()[0].id }, "node.size"), 20);
        // positions are float32
        assert.approximately(spacing(session), 400, 1e-3);
        session.dispose();
    });

    it("draws the coordinates in points when the file sizes nothing and no defaults apply", async () => {
        const session = await loadedPajek(pair(""), { toolDefaults: false });
        // positions are float32
        assert.approximately(spacing(session), 400, 1e-3);
        session.dispose();
    });
});

describe("a sigma.js (graphology) file's labels are canvas px over positions fitted to the canvas", () => {
    // Nodes 10 across (size 5 is a radius) in a 90 x 90 box. sigma 4 fits the box 540 px tall in an
    // 800 x 600 canvas (600 less its 30 px stagePadding at each end): 6 px a unit, so a 12 px label
    // is 2 units tall, a fifth of a node.
    const doc = JSON.stringify({
        options: { type: "undirected", multi: false, allowSelfLoops: true },
        nodes: [
            { key: "a", attributes: { x: 0, y: 0, size: 5, label: "a" } },
            { key: "b", attributes: { x: 90, y: 0, size: 5, label: "b" } },
            { key: "c", attributes: { x: 0, y: 90, size: 5, label: "c" } },
        ],
        edges: [],
    });

    /**
     * Load the document into a session drawing on a canvas of the given size.
     * @param viewport - The canvas, or null for a session with none.
     * @returns The session, settled.
     */
    async function loadedSigma(viewport: { width: number; height: number } | null): Promise<GraphSession> {
        const session = createGraphSession();
        dispatcherOf(session).services.viewport = () => viewport;
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file", layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        return session;
    }

    it("draws a 12 px label as sigma does on the element's canvas, beside nodes in proportion to their spacing", async () => {
        const session = await loadedSigma({ width: 800, height: 600 });
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        assert.approximately(letters(fontSize(session, { node: "a" })) / node, 2 / 10, 1e-6);
        assert.approximately(spacing(session) / node, 90 / 10, 1e-4);
        session.dispose();
    });

    it("draws the label smaller against the graph on a larger canvas, as sigma does", async () => {
        // 1200 x 900: the box is 840 px tall, 840 / 90 px a unit
        const session = await loadedSigma({ width: 1200, height: 900 });
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        assert.approximately(letters(fontSize(session, { node: "a" })) / node, 12 / (840 / 90) / 10, 1e-6);
        session.dispose();
    });

    it("keeps the label in the unit of the node sizes without a canvas to fit to", async () => {
        const session = await loadedSigma(null);
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        assert.approximately(letters(fontSize(session, { node: "a" })) / node, 12 / 10, 1e-6);
        session.dispose();
    });
});

describe("a sigma.js (graphology) file's labels are thinned by sigma's 100 px label grid", () => {
    // The 90 x 90 box in an 800 x 600 canvas is 6 px a unit. "big" (0, 0) and "small" (2, 0) are
    // drawn 12 px apart, both in the cell 100 to 200 px across and 500 to 600 px down, so sigma shows
    // only the larger node's label until the view zooms in; "far" has a cell of its own.
    const doc = JSON.stringify({
        options: { type: "undirected", multi: false, allowSelfLoops: true },
        nodes: [
            { key: "big", attributes: { x: 0, y: 0, size: 8, label: "big" } },
            { key: "small", attributes: { x: 2, y: 0, size: 5, label: "small" } },
            { key: "far", attributes: { x: 90, y: 90, size: 5, label: "far" } },
        ],
        edges: [],
    });

    /**
     * Load the document into a session drawing on a canvas of the given size.
     * @param viewport - The canvas, or null for a session with none.
     * @returns The session, settled.
     */
    async function loadedGrid(viewport: { width: number; height: number } | null): Promise<GraphSession> {
        const session = createGraphSession();
        dispatcherOf(session).services.viewport = () => viewport;
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file", layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        return session;
    }

    /**
     * A field of a node's label style.
     * @param session - The session.
     * @param node - The node.
     * @param field - The field.
     * @returns Its value.
     */
    function labelField(session: GraphSession, node: string, field: string): unknown {
        return (drawn(session, { node }, "node.labelStyle") as Record<string, unknown> | undefined)?.[field];
    }

    it("hides the second label of a cell until its node is drawn larger than at sigma's framing", async () => {
        const session = await loadedGrid({ width: 800, height: 600 });
        // "small" is 10 units, 60 px across at sigma's framing: its label shows once the node is drawn
        // sqrt(1) times that, as sigma shows two labels a cell from 1x the framing's zoom on
        assert.approximately(labelField(session, "small", "minNodeScreenSize") as number, 60, 1e-6);
        // the cell's largest node, and a node alone in its cell, keep sigma's own 12 px threshold
        assert.strictEqual(labelField(session, "big", "minNodeScreenSize"), 12);
        assert.strictEqual(labelField(session, "far", "minNodeScreenSize"), 12);
        // sigma's grid avoids no overlap
        assert.notStrictEqual(labelField(session, "small", "declutter"), "size");
        session.dispose();
    });

    it("thins nothing without a canvas to frame the positions in", async () => {
        const session = await loadedGrid(null);
        assert.strictEqual(labelField(session, "small", "minNodeScreenSize"), 12);
        session.dispose();
    });
});

describe("a vis-network file's border widths", () => {
    it("are drawn in screen pixels, as vis-network draws them, never scaled with the lengths", async () => {
        const doc = JSON.stringify({
            nodes: [
                { id: "a", x: 0, y: 0, borderWidth: 3 },
                { id: "b", x: 400, y: 0 },
            ],
            edges: [{ from: "a", to: "b" }],
            options: { nodes: { shape: "dot", size: 40 } },
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file", layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        assert.strictEqual(drawn(session, { node: "a" }, "node.borderScreenWidth"), 3);
        // vis-network's own default, 1
        assert.strictEqual(drawn(session, { node: "b" }, "node.borderScreenWidth"), 1);
        // and as a length, for a reader of the layers that draws no screen width
        assert.isNumber(drawn(session, { node: "a" }, "node.borderWidth"));
        session.dispose();
    });
});

describe("a file whose nodes are sized by their labels alone", () => {
    it("draws its median label at the element's own label size, not its edges at the element's edge width", async () => {
        // vis-network's default nodes: ellipses grown to hold their 14 px labels, with no size of their own
        const doc = JSON.stringify({
            nodes: [
                { id: "a", label: "alpha" },
                { id: "b", label: "beta" },
                { id: "c", label: "gamma" },
            ],
            edges: [
                { from: "a", to: "b" },
                { from: "b", to: "c" },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file", layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        // the element's own label is 48 px
        assert.approximately(fontSize(session, { node: "a" }), 48, 0.5);
        session.dispose();
    });
});
