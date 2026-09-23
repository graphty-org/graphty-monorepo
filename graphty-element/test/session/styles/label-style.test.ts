/**
 * What a layer can say about a label, and whether the renderer is ever told.
 *
 * A layer writes `node.labelStyle` (or `edge.labelStyle`) and the painter translates that value
 * into the rich-text block `RichTextLabel` is built from. Everything asserted here is one of the
 * subjects the package's own Label stories are named after -- a corner radius, a pointer, a
 * badge, a text shadow -- and each assertion asks the only question that matters: did the field
 * a reader wrote reach the key the renderer reads?
 *
 * THE TRANSLATION IS THE POINT. `LabelStyle` is named for what a reader sees and `RichTextStyle`
 * is named for what the canvas code does, and the two disagree on nearly every field. When they
 * stopped being mapped, seventeen stories could no longer ask for their own subject and were
 * deleted rather than migrated. These tests are the floor under that: a field that stops being
 * carried fails here, in Node, in under a second, before any story is rendered.
 */

import { assert, describe, it } from "vitest";

import { LABEL_STYLE_FIELDS } from "../../../src/catalog/label-style";
import type { LabelStyle, Path } from "../../../src/catalog/types";
import { NodeStyle } from "../../../src/config";
import { StylePainter } from "../../../src/managers/StylePainter";
import { createStylesApi, type RepaintContext, type SessionStylesApi } from "../../../src/session/styles/index";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createLayerRepaint, type RepaintEngine } from "../../../src/session/styles/repaint";

/** One element's columns, keyed by the path a selector or a binding names. */
type Row = Readonly<Record<Path, unknown>>;

/** Two nodes and one edge: enough for a layer to paint and for a paint to be read back. */
const NODES: readonly Row[] = [{ "data.id": "alpha" }, { "data.id": "beta" }];
const EDGES: readonly Row[] = [{ "data.id": "alpha->beta" }];

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/** What a test drives: the stack, the engine behind it and the painter over both. */
interface Harness {
    readonly styles: SessionStylesApi;
    readonly engine: RepaintEngine;
    readonly painter: StylePainter;
    paintAll(): Promise<void>;
}

/**
 * A session of two nodes and one edge with a painter bound to it.
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
        measured: () => undefined,
    });
    const styles = createStylesApi({ elements, base: [], repaint: engine.repaint });
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
 * Paint every node with one label style and read the label block back.
 * @param style - What the layer says about the label.
 * @param text - The words, written through `node.label` as a story does.
 * @returns The rich-text block the renderer would be built from.
 */
async function labelBlock(style: LabelStyle, text = "Label"): Promise<Record<string, unknown>> {
    const held = harness();
    await held.styles.add({
        name: "label",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": text, "node.labelStyle": style },
    });
    await held.paintAll();

    const paint = held.painter.nodePaint(0);

    assert.isNotNull(paint, "the painter painted no node at all");

    // Parsed rather than trusted: `RichTextStyle` is a strict object, so a field translated to a
    // key the renderer does not have would sail through `defaultsDeep` and be dropped in silence
    // on the way to the canvas. Parsing turns that into a failure with the key's name in it.
    const parsed = NodeStyle.parse(paint?.style);

    return (parsed.label ?? {}) as Record<string, unknown>;
}

describe("a layer says where a label sits", () => {
    it("carries the location", async () => {
        const label = await labelBlock({ location: "bottom" });

        assert.strictEqual(label.location, "bottom");
    });

    it("carries the attach offset", async () => {
        const label = await labelBlock({ attachOffset: 2 });

        assert.strictEqual(label.attachOffset, 2);
    });

    it("carries all four margins", async () => {
        const label = await labelBlock({ marginTop: 10, marginBottom: 11, marginLeft: 12, marginRight: 13 });

        assert.strictEqual(label.marginTop, 10);
        assert.strictEqual(label.marginBottom, 11);
        assert.strictEqual(label.marginLeft, 12);
        assert.strictEqual(label.marginRight, 13);
    });

    it("carries the text alignment and the line height", async () => {
        const label = await labelBlock({ textAlign: "left", lineHeight: 1.5 });

        assert.strictEqual(label.textAlign, "left");
        assert.strictEqual(label.lineHeight, 1.5);
    });
});

describe("a layer says how a label's panel is drawn", () => {
    it("carries the corner radius", async () => {
        const label = await labelBlock({ cornerRadius: 12, background: "#DCDCDC" });

        assert.strictEqual(label.cornerRadius, 12);
        assert.strictEqual(label.backgroundColor, "#DCDCDC");
    });

    it("carries a border", async () => {
        const label = await labelBlock({ borderWidth: 2, borderColor: "#6366F1" });

        assert.strictEqual(label.borderWidth, 2);
        assert.strictEqual(label.borderColor, "#6366F1");
    });

    it("carries a background gradient", async () => {
        const label = await labelBlock({
            gradient: true,
            gradientType: "linear",
            gradientDirection: "horizontal",
            gradientColors: ["#6366F1", "#10B981"],
        });

        assert.strictEqual(label.backgroundGradient, true);
        assert.strictEqual(label.backgroundGradientType, "linear");
        assert.strictEqual(label.backgroundGradientDirection, "horizontal");
        assert.deepStrictEqual(label.backgroundGradientColors, ["#6366F1", "#10B981"]);
    });

    it("carries a speech-bubble pointer", async () => {
        const label = await labelBlock({
            pointer: true,
            pointerDirection: "bottom",
            pointerWidth: 20,
            pointerHeight: 15,
            pointerOffset: 3,
            pointerCurve: false,
        });

        assert.strictEqual(label.pointer, true);
        assert.strictEqual(label.pointerDirection, "bottom");
        assert.strictEqual(label.pointerWidth, 20);
        assert.strictEqual(label.pointerHeight, 15);
        assert.strictEqual(label.pointerOffset, 3);
        assert.strictEqual(label.pointerCurve, false);
    });
});

describe("a layer says how a label's letters are drawn", () => {
    it("carries a text shadow", async () => {
        const label = await labelBlock({
            shadow: true,
            shadowColor: "#000000",
            shadowBlur: 4,
            shadowOffsetX: 3,
            shadowOffsetY: 3,
        });

        assert.strictEqual(label.textShadow, true);
        assert.strictEqual(label.textShadowColor, "#000000");
        assert.strictEqual(label.textShadowBlur, 4);
        assert.strictEqual(label.textShadowOffsetX, 3);
        assert.strictEqual(label.textShadowOffsetY, 3);
    });

    it("carries the outline's width beside its colour", async () => {
        const label = await labelBlock({ outline: "#FF0000", outlineWidth: 6 });

        assert.strictEqual(label.textOutline, true);
        assert.strictEqual(label.textOutlineColor, "#FF0000");
        assert.strictEqual(label.textOutlineWidth, 6);
    });

    it("carries an animation and its speed", async () => {
        const label = await labelBlock({ animation: "pulse", animationSpeed: 2 });

        assert.strictEqual(label.animation, "pulse");
        assert.strictEqual(label.animationSpeed, 2);
    });

    it("carries depth fading and its two distances", async () => {
        const label = await labelBlock({ depthFade: true, depthFadeNear: 50, depthFadeFar: 200 });

        assert.strictEqual(label.depthFadeEnabled, true);
        assert.strictEqual(label.depthFadeNear, 50);
        assert.strictEqual(label.depthFadeFar, 200);
    });
});

describe("a layer says what a label does with more than it can show", () => {
    it("carries a badge, its icon and its progress", async () => {
        const label = await labelBlock({ badge: "notification", icon: "star", iconPosition: "right", progress: 0.4 });

        assert.strictEqual(label.badge, "notification");
        assert.strictEqual(label.icon, "star");
        assert.strictEqual(label.iconPosition, "right");
        assert.strictEqual(label.progress, 0.4);
    });

    it("carries the three overflow rules", async () => {
        const label = await labelBlock({ smartOverflow: true, maxNumber: 99, overflowSuffix: "++" }, "1500");

        assert.strictEqual(label.smartOverflow, true);
        assert.strictEqual(label.maxNumber, 99);
        assert.strictEqual(label.overflowSuffix, "++");
    });
});

describe("a layer can switch a label off without taking its words away", () => {
    it("draws the label when only the words were written", async () => {
        const label = await labelBlock({});

        assert.strictEqual(label.enabled, true, "writing the words is what switches a label on");
        assert.strictEqual(label.text, "Label");
    });

    it("leaves the words in place and switches the label off", async () => {
        const label = await labelBlock({ enabled: false });

        assert.strictEqual(label.text, "Label", "the words are still resolved");
        assert.strictEqual(label.enabled, false, "and the label is not drawn");
    });

    it("switches a label off whichever order the two channels are resolved in", async () => {
        // The two channels land in one object, and which of them the painter's loop reaches
        // first is the order the resolved columns happen to be in. A label that can only be
        // switched off when the keys arrive in one particular order is switched off by luck.
        const held = harness();
        await held.styles.add({
            name: "words",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "Label" },
        });
        await held.styles.add({
            name: "off",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelStyle": { enabled: false } },
        });
        await held.paintAll();

        assert.strictEqual(held.painter.nodePaint(0)?.style.label?.enabled, false);
    });
});

/**
 * Every field the vocabulary publishes, written at once, with a value nothing else would produce.
 *
 * TYPED `Required<LabelStyle>` ON PURPOSE. Adding a field to the interface and forgetting to
 * translate it is the exact failure that cost seventeen stories, and it is silent: the painter
 * drops an unknown key without a word and the label draws its default. With this annotation the
 * compiler refuses the file until the new field is listed here, and the assertion below refuses
 * it until the field reaches the renderer.
 */
const EVERY_FIELD: Required<LabelStyle> = {
    enabled: true,
    font: "'JetBrains Mono', monospace",
    sizePx: 64,
    weight: "bold",
    color: "#111111",
    lineHeight: 1.7,
    textAlign: "right",
    background: "#222222",
    padding: 7,
    cornerRadius: 9,
    borderWidth: 3,
    borderColor: "#333333",
    gradient: true,
    gradientType: "radial",
    gradientColors: ["#444444", "#555555"],
    gradientDirection: "diagonal",
    location: "bottom-left",
    attachOffset: 2.5,
    marginTop: 11,
    marginBottom: 12,
    marginLeft: 13,
    marginRight: 14,
    pointer: true,
    pointerDirection: "left",
    pointerWidth: 21,
    pointerHeight: 16,
    pointerOffset: 4,
    pointerCurve: false,
    outline: "#666666",
    outlineWidth: 5,
    shadow: true,
    shadowColor: "#777777",
    shadowBlur: 6,
    shadowOffsetX: 8,
    shadowOffsetY: 9,
    animation: "bounce",
    animationSpeed: 3,
    depthFade: true,
    depthFadeNear: 33,
    depthFadeFar: 77,
    badge: "count",
    icon: "star",
    iconPosition: "right",
    progress: 0.6,
    smartOverflow: true,
    maxNumber: 42,
    overflowSuffix: "...",
};

/** Where each of those fields must land in the block `RichTextLabel` is built from. */
const EVERY_KEY: Readonly<Record<string, unknown>> = {
    enabled: true,
    font: "'JetBrains Mono', monospace",
    fontSize: 64,
    fontWeight: "bold",
    textColor: "#111111",
    lineHeight: 1.7,
    textAlign: "right",
    backgroundColor: "#222222",
    backgroundPadding: 7,
    cornerRadius: 9,
    borderWidth: 3,
    borderColor: "#333333",
    backgroundGradient: true,
    backgroundGradientType: "radial",
    backgroundGradientColors: ["#444444", "#555555"],
    backgroundGradientDirection: "diagonal",
    location: "bottom-left",
    attachOffset: 2.5,
    marginTop: 11,
    marginBottom: 12,
    marginLeft: 13,
    marginRight: 14,
    pointer: true,
    pointerDirection: "left",
    pointerWidth: 21,
    pointerHeight: 16,
    pointerOffset: 4,
    pointerCurve: false,
    textOutline: true,
    textOutlineColor: "#666666",
    textOutlineWidth: 5,
    textShadow: true,
    textShadowColor: "#777777",
    textShadowBlur: 6,
    textShadowOffsetX: 8,
    textShadowOffsetY: 9,
    animation: "bounce",
    animationSpeed: 3,
    depthFadeEnabled: true,
    depthFadeNear: 33,
    depthFadeFar: 77,
    badge: "count",
    icon: "star",
    iconPosition: "right",
    progress: 0.6,
    smartOverflow: true,
    maxNumber: 42,
    overflowSuffix: "...",
};

describe("the whole vocabulary reaches the renderer", () => {
    it("translates every published field into the key the renderer reads", async () => {
        const label = await labelBlock(EVERY_FIELD, "Label");
        const reached: Record<string, unknown> = {};

        for (const key of Object.keys(EVERY_KEY)) {
            reached[key] = label[key];
        }

        assert.deepStrictEqual(reached, EVERY_KEY);
    });

    it("lists every published field, so a settings panel can offer them all", () => {
        // `LABEL_STYLE_FIELDS` is what the Storybook controls and any settings UI iterate. It is
        // built from an object the compiler checks against `keyof LabelStyle`, so the only way it
        // can be wrong is by being out of step with what is actually written above.
        assert.deepStrictEqual([...LABEL_STYLE_FIELDS].sort(), Object.keys(EVERY_FIELD).sort());
    });
});

describe("a badge brings its own appearance", () => {
    it("fills in what the layer did not ask for", async () => {
        const label = await labelBlock({ badge: "notification" }, "3");

        // A notification badge is a red pill in bold white lettering. Every one of these was
        // declared by the renderer and lost before it got there, because a painted label arrives
        // with the schema's own default already sitting in each of these fields.
        assert.strictEqual(label.backgroundColor, "#FF3B30");
        assert.strictEqual(label.textColor, "#FFFFFF");
        assert.strictEqual(label.fontWeight, "bold");
        assert.strictEqual(label.cornerRadius, 999);
    });

    it("leaves alone what the layer did ask for", async () => {
        const label = await labelBlock({ badge: "notification", background: "#10B981", animation: "none" }, "3");

        assert.strictEqual(label.backgroundColor, "#10B981", "a green notification badge stays green");
        assert.strictEqual(label.animation, "none", "and a still one stays still");
        assert.strictEqual(label.textColor, "#FFFFFF", "while the rest of the badge still arrives");
    });

    it("writes nothing the renderer's own schema does not hold", async () => {
        // The badge table carries the renderer's private bookkeeping beside its appearance, and
        // the label schema is strict: a `_paddingRatio` written into a style makes the parse in
        // `labelBlock` throw rather than reach the canvas.
        const label = await labelBlock({ badge: "progress", progress: 0.5 }, "5");

        assert.isUndefined(label._paddingRatio);
        assert.isUndefined(label._badgeType);
        assert.strictEqual(label.progress, 0.5);
    });
});
