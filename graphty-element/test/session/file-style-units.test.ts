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

import { createGraphSession, type GraphSession } from "../../session";

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
function drawn(session: GraphSession, target: { node: string } | { edge: string }, channel: string): unknown {
    return (session.styles.explain(target).merged as Record<string, unknown>)[channel];
}

/**
 * A number a channel draws.
 * @param session - The session.
 * @param target - The element.
 * @param channel - The channel.
 * @returns The number.
 */
function number(session: GraphSession, target: { node: string } | { edge: string }, channel: string): number {
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
function fontSize(session: GraphSession, target: { node: string } | { edge: string }): number {
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
        assert.notProperty(session.layout.options, "scale");
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
        assert.notProperty(session.layout.options, "scale");
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
