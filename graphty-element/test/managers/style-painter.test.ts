/**
 * The renderer's door onto the session's style stack.
 *
 * Two things are asserted here. WHAT the channels a pass resolved turn into, which is the parsed
 * style the mesh, the label and the effects are built from. And what an element is drawn from
 * BEFORE any pass has resolved anything for it -- the bootstrap paints, which fill the gap
 * between a Node being constructed and the store handing it the dense index a session's paint is
 * addressed by.
 *
 * The third thing, that two instances of one source mesh really are drawn in two colours, needs
 * pixels and lives in `test/browser/node-instance-color.test.ts`.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, Path } from "../../src/catalog/types";
import { defaultEdgeStyle, defaultNodeStyle } from "../../src/config";
import { bootstrapEdgePaint, bootstrapNodePaint, StylePainter } from "../../src/managers/StylePainter";
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
 * @returns The harness.
 */
function harness(): Harness {
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
    const painter = new StylePainter();
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

/**
 * Who paints an element.
 *
 * THERE IS ONE STACK NOW, so the question this answers is no longer "which of the two systems
 * owns this graph" but the much smaller "has a style pass been bound at all". The tests that
 * used to live here pinned the old rule -- that one 1.x template layer took the whole graph back
 * from every session layer on it -- and that rule is gone with the template. What replaces it is
 * unconditional and is pinned below: a bound session always paints, and the only thing that
 * paints when one is not bound is the element's own bootstrap.
 */
describe("StylePainter ownership", () => {
    it("paints nothing until a session is bound", () => {
        const painter = new StylePainter();

        assert.isFalse(painter.owns, "an unbound painter has nothing to say about any element");
        assert.isNull(painter.nodePaint(0));
        assert.isNull(painter.edgePaint(0));
    });

    it("paints as soon as a session is bound, whatever else the element is carrying", () => {
        assert.isTrue(harness().painter.owns);
    });

    it("stops painting when the session is unbound", () => {
        const { painter } = harness();
        painter.bind(null);

        assert.isFalse(painter.owns);
    });
});

/**
 * What an element is drawn from before the first style pass has reached it.
 *
 * A Node is constructed and only then does the store hand it the dense row index a session's
 * paint is addressed by, so for the length of that gap there is no index to ask the painter
 * about -- and a Node with no mesh cannot be positioned, picked or given an edge. These two are
 * what fill the gap.
 */
describe("StylePainter bootstrap paint", () => {
    it("keeps the node colour out of the material and beside it, exactly as a pass does", () => {
        const paint = bootstrapNodePaint();

        // The same split a resolved paint produces. A bootstrap built straight from the default
        // style would put the colour in the source mesh's material, which is a material the
        // session's own neutral one can never match -- so the first pass would rebuild every
        // node's mesh instead of writing one buffer value per node.
        assert.strictEqual(paint.style.texture?.color, "#FFFFFF");
        assert.deepStrictEqual(paint.color, { r: 99, g: 102, b: 241, a: 1 }, "#6366F1, the element's own default");
    });

    it("builds the node from the element's own default shape and size", () => {
        const paint = bootstrapNodePaint();

        assert.strictEqual(paint.style.shape?.type, defaultNodeStyle.shape?.type);
        assert.strictEqual(paint.style.shape?.size, defaultNodeStyle.shape?.size);
    });

    it("keeps the edge colour IN its style, because an edge has no per-instance state", () => {
        const paint = bootstrapEdgePaint();

        // The element's own default edge colour, as the schema normalises it: `defaultEdgeStyle`
        // writes the CSS name `darkgrey` and parsing turns every colour into hex -- and then as the
        // SESSION spells it, lowercase, because `Edge.paintFrom` decides whether the first pass has
        // to rebuild an edge by comparing the two styles, and `#A9A9A9` against `#a9a9a9` rebuilt
        // every edge of every load once at the size of the scene each (issue #388).
        assert.strictEqual(paint.style.line?.color, "#a9a9a9");
        assert.strictEqual(defaultEdgeStyle.line?.color, "darkgrey", "which is the same colour, unparsed");
    });

    it("is deep-equal to what a pass hands an edge no layer touched, so the first pass rebuilds nothing", async () => {
        const held = harness();
        await held.paintAll();

        // The key differs by design (the bootstrap's is reserved); the STYLE must not, because a
        // style that differs in any spelling is a placeholder mesh disposed and built again for
        // every edge of a load, and Babylon's dispose costs the size of the scene.
        const painted = held.painter.edgePaint(0);

        assert.isNotNull(painted);
        assert.deepStrictEqual(painted?.style, bootstrapEdgePaint().style);
    });

    it("reserves a mesh key the session's interner can never mint", async () => {
        // The interner's keys are `s0`, `s1` and so on in first-seen order, and they are
        // session-local: a bootstrap that borrowed `s0` would be handed back out of the mesh
        // cache under whatever style the session happened to intern first, which is a graph
        // silently drawn at the wrong size.
        const held = harness();
        await held.paintAll();

        const key = bootstrapNodePaint().meshKey;

        assert.strictEqual(key, bootstrapEdgePaint().meshKey, "one reserved key covers both halves");
        assert.notStrictEqual(held.painter.nodePaint(0)?.meshKey, key);
        assert.notMatch(key, /^s\d/, "and it is not spelled the way an interned key is");
    });

    it("hands back one shared object rather than a copy per element", () => {
        // An edge asks what it looks like on nearly every frame, so an allocation here would be
        // one per edge per frame. Nothing on the drawing path writes to a resolved style.
        assert.strictEqual(bootstrapNodePaint(), bootstrapNodePaint());
        assert.strictEqual(bootstrapEdgePaint(), bootstrapEdgePaint());
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

    it("switches an arrow caption on beside its words, not on the arrow the words hang from", async () => {
        // THE DEFECT THIS CLOSES, and it was silent. A layer that writes a text channel also
        // writes the `enabled` flag of the block the words land in, because text nobody switched
        // on is resolved, carried and never drawn. That flag used to be derived from the FIRST
        // segment of the channel's style path, which was right for every text channel published
        // before the arrow captions -- `label.text` and `tooltip.text` are two segments, so the
        // first segment and the words' own block are the same thing. A caption's words are three
        // segments deep, so the first segment named `arrowHead.enabled`, which is not a field of
        // an arrow style at all: the paint is merged into the defaults rather than re-parsed, so
        // nothing would have rejected it and the caption would simply never have been drawn.
        const held = harness();
        const spec: LayerSpec = {
            name: "captions",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHeadText": "callee" },
        };
        await held.styles.add(spec);
        await held.paintAll();

        const paint = held.painter.edgePaint(0);

        assert.strictEqual(paint?.style.arrowHead?.text?.text, "callee");
        assert.isTrue(paint?.style.arrowHead?.text?.enabled, "a caption nobody switched on is never drawn");
        assert.notProperty(
            paint?.style.arrowHead ?? {},
            "enabled",
            "and the flag goes beside the words rather than onto the arrow style, which has no such field",
        );
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
