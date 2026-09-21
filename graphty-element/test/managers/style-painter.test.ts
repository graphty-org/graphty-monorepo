/**
 * The renderer's door onto the session's style stack.
 *
 * Two things are asserted here and they are the two that decide whether the migration is safe:
 * WHO paints an element -- exactly one of the two style systems, never both -- and WHAT the
 * channels a pass resolved turn into, which is the parsed style the mesh, the label and the
 * effects are built from.
 *
 * The third thing, that two instances of one source mesh really are drawn in two colours, needs
 * pixels and lives in `test/browser/node-instance-color.test.ts`.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, Path } from "../../src/catalog/types";
import { defaultNodeStyle } from "../../src/config";
import { StylePainter } from "../../src/managers/StylePainter";
import {
    createStylesApi,
    type ElementLayerSpec,
    type RepaintContext,
    type SessionStylesApi,
} from "../../src/session/styles/index";
import type { SelectorSource } from "../../src/session/styles/predicate";
import { createLayerRepaint, type RepaintEngine } from "../../src/session/styles/repaint";

/** One element's columns, keyed by the path a selector or a binding names. */
type Row = Readonly<Record<Path, unknown>>;

/** Four nodes carrying one metric, so a continuous encoding has something to ramp over. */
const NODES: readonly Row[] = [
    { "data.kind": "host", "results.degree.value": 0 },
    { "data.kind": "host", "results.degree.value": 1 },
    { "data.kind": "switch", "results.degree.value": 2 },
    { "data.kind": "switch", "results.degree.value": 3 },
];

/** Two edges, enough to tell an edge's key from a node's. */
const EDGES: readonly Row[] = [{ "data.kind": "wire" }, { "data.kind": "wire" }];

/** The elements the degree run measured, which is every node here. */
const MEASURED: Readonly<Record<Path, readonly number[]>> = { "results.degree.value": [0, 1, 2, 3] };

/**
 * The element's default node colour, as a string.
 *
 * `texture.color` accepts an advanced colour object as well as a string, and only the string form
 * is a channel value -- so the default is read through a check rather than stringified blind.
 */
const NODE_DEFAULT_COLOR =
    typeof defaultNodeStyle.texture?.color === "string" ? defaultNodeStyle.texture.color : "#6366F1";

/**
 * The element's own layer, written the way `elementBaseLayers` derives it from the defaults.
 *
 * The three channels are exactly the ones `defaultNodeStyle` settles: a shape, a size and a
 * colour. Taken from the default object rather than retyped, so a change to the element's default
 * appearance moves this test with it.
 */
const NODE_BASE: ElementLayerSpec = {
    name: "Node defaults",
    kind: "base",
    source: { by: "element", reason: "default" },
    target: "node",
    selector: { match: "everything" },
    set: {
        "node.shape": defaultNodeStyle.shape?.type ?? "icosphere",
        "node.size": defaultNodeStyle.shape?.size ?? 1,
        "node.color": NODE_DEFAULT_COLOR,
    },
};

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/** What a test drives: the stack, the engine behind it, and the painter over both. */
interface Harness {
    /** The stack to edit. */
    readonly styles: SessionStylesApi;
    /** The engine the painter reads. */
    readonly engine: RepaintEngine;
    /** The painter under test. */
    readonly painter: StylePainter;
    /** Paint every element from the whole stack, as a first draw does. */
    paintAll(): Promise<void>;
}

/**
 * Build a stack, an engine and a painter over four nodes and two edges.
 * @param legacyLayers - How many layers the legacy stack is pretending to hold.
 * @returns The harness.
 */
function harness(legacyLayers = 1): Harness {
    const elements: SelectorSource = {
        nodeValue: (index, path) => NODES[index]?.[path],
        edgeValue: (index, path) => EDGES[index]?.[path],
    };
    const engine = createLayerRepaint({
        nodeCount: () => NODES.length,
        edgeCount: () => EDGES.length,
        elements,
        measured: (path, target) => (target === "node" ? MEASURED[path] : undefined),
    });
    const styles = createStylesApi({
        elements,
        base: [NODE_BASE],
        repaint: engine.repaint,
    });
    const painter = new StylePainter(
        () => legacyLayers,
        () => 1,
    );
    painter.bind(engine);

    return {
        styles,
        engine,
        painter,
        paintAll: async (): Promise<void> => {
            await engine.repaintAll(styles.compiled(), quietContext());
            painter.markPainted();
        },
    };
}

describe("StylePainter ownership", () => {
    it("owns nothing until a session is bound", () => {
        const painter = new StylePainter(
            () => 1,
            () => 1,
        );

        assert.isFalse(painter.owns, "an unbound painter cannot be the owner");
    });

    it("owns the paint while the legacy stack holds only the element's own layer", () => {
        assert.isTrue(harness(1).painter.owns);
    });

    it("hands the paint back the moment a legacy layer is added", () => {
        assert.isFalse(harness(2).painter.owns, "a style template takes the graph back");
    });

    it("stops owning when the session is unbound", () => {
        const { painter } = harness(1);
        painter.bind(null);

        assert.isFalse(painter.owns);
    });
});

describe("StylePainter channels", () => {
    it("turns the element's own base layer into the element's own default style", async () => {
        const held = harness();
        await held.paintAll();

        const paint = held.painter.nodePaint(0);

        assert.isNotNull(paint);
        assert.strictEqual(paint?.style.shape?.type, defaultNodeStyle.shape?.type);
        assert.strictEqual(paint?.style.shape?.size, defaultNodeStyle.shape?.size);
    });

    it("keeps the colour out of the material and beside it", async () => {
        const held = harness();
        await held.paintAll();

        const paint = held.painter.nodePaint(0);

        // Neutral, so that what shows is the instance's own colour rather than the material's.
        assert.strictEqual(paint?.style.texture?.color, "#FFFFFF");
        assert.deepStrictEqual(paint?.color, { r: 99, g: 102, b: 241, a: 1 }, "#6366F1, parsed once");
    });

    it("gives two colours of one shape ONE source mesh", async () => {
        const held = harness();
        await held.paintAll();

        const flat = held.painter.meshCount("node");

        const spec: LayerSpec = {
            name: "degree ramp",
            target: "node",
            selector: { match: "has", path: "results.degree.value" },
            encode: { "node.color": { by: "results.degree.value", scale: "linear", palette: "viridis" } },
        };
        await held.styles.add(spec);
        await held.paintAll();

        const first = held.painter.nodePaint(0);
        const last = held.painter.nodePaint(3);

        assert.notDeepEqual(first?.color, last?.color, "the ramp painted two different colours");
        assert.strictEqual(first?.meshKey, last?.meshKey, "and both nodes are drawn from one mesh");
        assert.strictEqual(held.painter.meshCount("node"), flat, "a ramp mints no new source meshes");
    });

    it("puts a size change in the mesh key, because a size is geometry", async () => {
        const held = harness();
        const before = (await held.paintAll(), held.painter.nodePaint(0));

        const spec: LayerSpec = {
            name: "bigger",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 9 },
        };
        await held.styles.add(spec);
        held.painter.markPainted();

        const after = held.painter.nodePaint(0);

        assert.strictEqual(after?.style.shape?.size, 9);
        assert.notStrictEqual(after?.meshKey, before?.meshKey);
    });

    it("switches a label on when a layer paints its words", async () => {
        const held = harness();
        const spec: LayerSpec = {
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "hello" },
        };
        await held.styles.add(spec);
        await held.paintAll();

        const paint = held.painter.nodePaint(0);

        assert.strictEqual(paint?.style.label?.text, "hello");
        assert.isTrue(paint?.style.label?.enabled, "a label nobody switched on is never drawn");
    });

    it("keeps an edge's colour in its style, because an edge has no per-instance state", async () => {
        const held = harness();
        const spec: LayerSpec = {
            name: "edge colour",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#FF0000" },
        };
        await held.styles.add(spec);
        await held.paintAll();

        const paint = held.painter.edgePaint(0);

        // Lower case, because a channel's colour carries the hex the encoding produced rather
        // than the string an author typed.
        assert.strictEqual(paint?.style.line?.color, "#ff0000");
        assert.include(paint?.meshKey ?? "", "#ff0000", "the colour has to key the mesh, so it is in the key");
    });
});

describe("StylePainter dirty set", () => {
    it("queues what a pass painted and empties when it is taken", async () => {
        const held = harness();
        await held.paintAll();

        assert.isTrue(held.painter.hasPending);
        assert.deepStrictEqual([...held.painter.takeNodes()].sort(), [0, 1, 2, 3]);
        assert.deepStrictEqual([...held.painter.takeEdges()].sort(), [0, 1]);
        assert.isFalse(held.painter.hasPending);
    });

    it("queues ONLY the elements one edit touched", async () => {
        const held = harness();
        await held.paintAll();
        held.painter.takeNodes();
        held.painter.takeEdges();

        const spec: LayerSpec = {
            name: "switches only",
            target: "node",
            selector: { match: "expression", where: 'data.kind == `"switch"`' },
            set: { "node.size": 4 },
        };
        await held.styles.add(spec);
        held.painter.markPainted();

        assert.deepStrictEqual([...held.painter.takeNodes()].sort(), [2, 3]);
        assert.deepStrictEqual([...held.painter.takeEdges()], [], "a node layer repaints no edges");
    });

    it("puts every element back when the render objects have changed under it", () => {
        const { painter } = harness();
        painter.invalidate(4, 2);

        assert.deepStrictEqual([...painter.takeNodes()].sort(), [0, 1, 2, 3]);
        assert.deepStrictEqual([...painter.takeEdges()].sort(), [0, 1]);
    });
});
