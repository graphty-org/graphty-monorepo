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
 * - a position: the scene coordinate the session holds
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession, type NodeId } from "../../session";
import { NGRAPH_SETTLED_SPACING } from "../../src/constants/layoutConstants";
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
        // A headless session runs no layout engine: its positions are the data's. The fixed layout
        // the element runs multiplies them by the `scale` the load chose (FixedLayoutEngine).
        assert.strictEqual(session.layout.id, "fixed");
        const { scale } = session.layout.options;
        assert.isNumber(scale);
        const node = number(session, { node: "a" }, "node.size") * 1.5;
        const snapshot = session.snapshot();
        const a = { x: 0, y: 0, z: 0 };
        const b = { x: 0, y: 0, z: 0 };
        session.positions.read(snapshot.ids.requireIndex("a"), a);
        session.positions.read(snapshot.ids.requireIndex("b"), b);

        const drawn = Math.hypot(b.x - a.x, b.y - a.y) * (scale as number);
        assert.approximately(drawn / node, FILE.ab / FILE.node, 1e-4);
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
        assert.strictEqual(b.x, FILE.ab);
        assert.strictEqual(session.layout.options.scale ?? 1, 1, "one file unit is one scene unit");
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
        assert.strictEqual(b.x, FILE.ab);
        assert.strictEqual(session.layout.options.scale ?? 1, 1, "one file unit is one scene unit");
        session.dispose();
    });
});

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
    const { scale } = session.layout.options;
    assert.isNumber(scale);
    const node = number(session, { node: "a" }, "node.size") * 1.5;
    const snapshot = session.snapshot();
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    session.positions.read(snapshot.ids.requireIndex("a"), a);
    session.positions.read(snapshot.ids.requireIndex("b"), b);
    return (Math.hypot(b.x - a.x, b.y - a.y) * (scale as number)) / node;
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
    styleOptions?: { readonly lengths?: "median" | "file" | "spacing"; readonly toolDefaults?: boolean },
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
    const scale = session.layout.options.scale ?? 1;
    assert.isNumber(scale);
    const snapshot = session.snapshot();
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const [first, second] = session.data.nodes().map((n) => n.id);
    session.positions.read(snapshot.ids.requireIndex(first), a);
    session.positions.read(snapshot.ids.requireIndex(second), b);
    return Math.hypot(b.x - a.x, b.y - a.y) * (scale as number);
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

describe("a sigma.js (graphology) file's labels are drawn in screen px, as sigma draws them at every zoom", () => {
    // Nodes 10 across (size 5 is a radius) in a 90 x 90 box. sigma draws a 12 px label 12 px tall on
    // screen however the view is zoomed or the canvas sized (issue #3106).
    const doc = JSON.stringify({
        options: { type: "directed", multi: false, allowSelfLoops: true },
        nodes: [
            { key: "a", attributes: { x: 0, y: 0, size: 5, label: "a" } },
            { key: "b", attributes: { x: 90, y: 0, size: 8, label: "b" } },
            { key: "c", attributes: { x: 0, y: 90, size: 5, label: "c" } },
        ],
        edges: [{ key: "ab", source: "a", target: "b", attributes: { label: "ab" } }],
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

    /**
     * An element's label style.
     * @param session - The session.
     * @param target - The element.
     * @returns The style.
     */
    function labelStyle(session: GraphSession, target: { node: NodeId } | { edge: string }): Record<string, unknown> {
        const kind = "node" in target ? "node" : "edge";
        return (drawn(session, target, `${kind}.labelStyle`) ?? {}) as Record<string, unknown>;
    }

    for (const viewport of [{ width: 800, height: 600 }, { width: 1200, height: 900 }, null]) {
        it(`draws every node label at sigma's 12 px on screen, whatever the canvas (${JSON.stringify(viewport)})`, async () => {
            const session = await loadedSigma(viewport);
            for (const node of ["a", "b"]) {
                const style = labelStyle(session, { node });
                assert.strictEqual(style.sizeMode, "screen", `${node}'s label size mode`);
                assert.strictEqual(style.sizePx, 12, `${node}'s label size`);
                // never sized in the scene, which would override the screen size
                assert.isUndefined(style.letterSize, `${node}'s letter size`);
            }
            session.dispose();
        });
    }

    it("draws an edge label at sigma's 12 px on screen", async () => {
        const session = await loadedSigma({ width: 800, height: 600 });
        const [edge] = session.data.edges();
        const style = labelStyle(session, { edge: edge.id });
        assert.strictEqual(style.sizeMode, "screen");
        assert.strictEqual(style.sizePx, 12);
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

describe('lengths: "spacing" (issues #3168, #3103)', () => {
    // vis-network, no positions: 40 px dots, which vis-network's layout leaves 87 px apart once it settles
    const doc = JSON.stringify({
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
        edges: [
            { from: "a", to: "b" },
            { from: "b", to: "c" },
        ],
        options: { nodes: { shape: "dot", size: 20 } },
    });

    /**
     * The drawn extent of node a, loaded with these style options.
     * @param data - The document.
     * @param styleOptions - The style options of the load.
     * @param type - The format of the document.
     * @param id - The node measured.
     * @returns Scene units.
     */
    async function extent(
        data: string,
        styleOptions?: { readonly lengths: "median" | "file" | "spacing" },
        type = "json",
        id: NodeId = "a",
    ): Promise<number> {
        const session = createGraphSession();
        await session.data.import(
            { type, config: { data } },
            { styles: "file", layout: "recommended", ...(styleOptions === undefined ? {} : { styleOptions }) },
        );
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        assert.strictEqual(session.layout.id, "force");
        const size = number(session, { node: id }, "node.size") * 1.5;
        session.dispose();
        return size;
    }

    it("draws a node as large beside the force layout's settled spacing as the program draws it beside its own", async () => {
        const inFile = await extent(doc, { lengths: "file" });
        const spaced = await extent(doc, { lengths: "spacing" });
        // one file unit is one scene unit with lengths: "file", so the file's node over vis-network's settled spacing
        assert.approximately(spaced / NGRAPH_SETTLED_SPACING, inFile / 1.5 / 87, 1e-6);
    });

    it("leaves the default unchanged: the median node is the element's node size", async () => {
        assert.approximately(await extent(doc), 1.5, 1e-6);
    });

    it("leaves the default unchanged for a Cytoscape desktop file with no positions (#5508)", async () => {
        // Cytoscape desktop states a 50 px spacing; only lengths: "spacing" reads it, so the default load of a file
        // such as cx-radiation-bibliography still draws its median node at the element's node size
        const cx2 = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            { nodes: [{ id: 0 }, { id: 1 }, { id: 2 }] },
            {
                edges: [
                    { id: 3, s: 0, t: 1 },
                    { id: 4, s: 1, t: 2 },
                ],
            },
            { visualProperties: [{ default: { node: { NODE_WIDTH: 60, NODE_HEIGHT: 60 } } }] },
            { status: [{ success: true }] },
        ]);
        assert.approximately(await extent(cx2, undefined, "cx2", "0"), 1.5, 1e-6);
        const inFile = await extent(cx2, { lengths: "file" }, "cx2", "0");
        const spaced = await extent(cx2, { lengths: "spacing" }, "cx2", "0");
        assert.approximately(spaced / NGRAPH_SPRING_LENGTH, inFile / 1.5 / 50, 1e-6);
    });

    it("scales as the median does for a program that states no spacing", async () => {
        const cyjs = JSON.stringify({
            elements: {
                nodes: [{ data: { id: "a" } }, { data: { id: "b" } }],
                edges: [{ data: { id: "ab", source: "a", target: "b" } }],
            },
            style: [{ selector: "node", style: { width: 40, height: 40 } }],
        });
        assert.approximately(await extent(cyjs, { lengths: "spacing" }), await extent(cyjs), 1e-6);
    });
});
