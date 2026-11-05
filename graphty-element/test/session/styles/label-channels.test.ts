/**
 * Label styles stack field by field, and single label fields can be bound to a column.
 *
 * Three promises, each read back the way a consumer reads it:
 *
 * - `styles.explain()` reports the label style the canvas draws: two layers that set different
 *   label fields merge, exactly as the repaint merges them.
 * - A rule bound to a WHOLE label style (`encode: { "node.labelStyle": { by } }`) is still
 *   accepted, as it always was, and `validate()` says why it paints nothing.
 * - `node.labelSize` and the other label field channels take a rule, so a column of sizes draws
 *   one size per element.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, Path } from "../../../src/catalog/types";
import { EdgeStyle, NodeStyle } from "../../../src/config";
import { StylePainter } from "../../../src/managers/StylePainter";
import { labelFieldOf } from "../../../src/session/styles/channels";
import { createStylesApi, type RepaintContext, type SessionStylesApi } from "../../../src/session/styles/index";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createLayerRepaint, type RepaintEngine } from "../../../src/session/styles/repaint";

/** One element's columns, keyed by the path a selector or a binding names. */
type Row = Readonly<Record<Path, unknown>>;

const NODES: readonly Row[] = [
    { "data.id": "a", "data.fs": 12, "data.kind": "x", "data.look": { sizePx: 99 } },
    { "data.id": "b", "data.fs": 30, "data.kind": "y", "data.look": { sizePx: 99 } },
    { "data.id": "c", "data.fs": 7, "data.kind": "x", "data.look": { sizePx: 99 } },
];
const EDGES: readonly Row[] = [{ "data.id": "a->b", "data.kind": "y" }];

interface Harness {
    readonly styles: SessionStylesApi;
    readonly engine: RepaintEngine;
    readonly painter: StylePainter;
    paintAll(): Promise<void>;
}

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/**
 * Three nodes and one edge, with the repaint, the stack and the painter wired as a session wires them.
 * @returns The harness.
 */
function harness(): Harness {
    const elements: SelectorSource = {
        nodeValue: (index, path) => NODES[index]?.[path],
        edgeValue: (index, path) => EDGES[index]?.[path],
        nodeIdOf: (index) => String(NODES[index]?.["data.id"]),
        edgeIdOf: (index) => String(EDGES[index]?.["data.id"]),
    };
    const engine = createLayerRepaint({
        nodeCount: () => NODES.length,
        edgeCount: () => EDGES.length,
        elements,
        measured: () => undefined,
    });
    const styles = createStylesApi({
        elements,
        base: [],
        repaint: engine.repaint,
        encoding: engine.encoding,
        nodeIndex: (id) => {
            const index = NODES.findIndex((row) => row["data.id"] === id);

            return index < 0 ? undefined : index;
        },
        edgeIndex: (id) => (id === "a->b" ? 0 : undefined),
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
 * The label block the renderer is built from for one node.
 * @param held - The harness.
 * @param index - The node.
 * @returns The parsed label block.
 */
function drawnLabel(held: Harness, index: number): Record<string, unknown> {
    const paint = held.painter.nodePaint(index);
    assert.isNotNull(paint, "the painter painted no node");

    return NodeStyle.parse(paint?.style).label ?? {};
}

/**
 * Add a layer painting every node.
 * @param held - The harness.
 * @param name - The layer's name.
 * @param rest - What it paints.
 */
async function everyNode(held: Harness, name: string, rest: Pick<LayerSpec, "set" | "encode">): Promise<void> {
    await held.styles.add({ name, target: "node", selector: { match: "everything" }, ...rest });
}

describe("explain() merges label styles field by field", () => {
    it("reports the merged label style the repaint resolved, not the top layer's alone", async () => {
        const held = harness();
        await everyNode(held, "size", {
            set: { "node.label": "hi", "node.labelStyle": { sizePx: 24, font: "Arial" } },
        });
        await everyNode(held, "color", { set: { "node.labelStyle": { color: "#ff0000", font: "Courier" } } });
        await held.paintAll();

        const merged = held.styles.explain({ node: "a" }).merged["node.labelStyle"];
        assert.deepEqual(merged, { sizePx: 24, color: "#ff0000", font: "Courier" });
        assert.deepEqual(merged, held.engine.styleOf("node", 0)["node.labelStyle"]);
    });

    it("merges a label field channel into the label style, in layer order", async () => {
        const held = harness();
        await everyNode(held, "style", {
            set: { "node.label": "hi", "node.labelStyle": { sizePx: 24, weight: "bold" } },
        });
        await everyNode(held, "size", { set: { "node.labelSize": 10, "node.labelItalic": true } });
        await everyNode(held, "top", { set: { "node.labelStyle": { sizePx: 40 } } });
        await held.paintAll();

        const explained = held.styles.explain({ node: "b" });
        const resolved = held.engine.styleOf("node", 1);
        assert.deepEqual(explained.merged["node.labelStyle"], { sizePx: 40, weight: "bold", italic: true });
        assert.deepEqual(explained.merged["node.labelStyle"], resolved["node.labelStyle"]);
        assert.isUndefined(resolved["node.labelSize"], "a label field lands in the label style, not beside it");
        assert.include(
            explained.channels.map((entry) => entry.channel),
            "node.labelItalic",
        );

        const label = drawnLabel(held, 1);
        assert.strictEqual(label.fontSize, 40);
        assert.strictEqual(label.fontWeight, "bold");
        assert.strictEqual(label.fontStyle, "italic");
    });
});

describe("a rule bound to a whole label style", () => {
    const bound: LayerSpec = {
        name: "look",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.labelStyle": { by: "data.look" } },
    };

    it("gets a coded warning from validate(), and validate() stays ok", () => {
        const held = harness();
        const result = held.styles.validate(bound);

        assert.isTrue(result.ok);
        assert.deepEqual(result.warnings, [
            {
                code: "W_LABEL_STYLE_BOUND",
                params: {
                    channel: "node.labelStyle",
                    path: "encode.node.labelStyle",
                    fieldChannels: [
                        "node.labelColor",
                        "node.labelSize",
                        "node.labelLetterSize",
                        "node.labelFont",
                        "node.labelWeight",
                        "node.labelItalic",
                        "node.labelWrapWidth",
                        "node.labelWrapTrailingSpace",
                        "node.labelWrapEllipsis",
                        "node.labelWrapAnywhere",
                        "node.labelWrapSpaceCount",
                        "node.labelRunAlign",
                        "node.labelMinScreenSize",
                        "node.labelOnTop",
                        "node.labelRotation",
                        "node.labelBackground",
                        "node.labelOutline",
                        "node.labelOutlineWidth",
                        "node.labelBorder",
                        "node.labelBorderWidth",
                        "node.labelOpacity",
                        "node.labelBackgroundOpacity",
                        "node.labelOutlineOpacity",
                        "node.labelBorderOpacity",
                        "node.labelPadding",
                        "node.labelCornerRadius",
                        "node.labelLineHeight",
                        "node.labelOffsetX",
                        "node.labelOffsetY",
                        "node.labelShiftX",
                        "node.labelShiftY",
                        "node.labelShiftOf",
                        "node.labelDeclutter",
                        "node.labelMinNodeScreenSize",
                        "node.labelTextAlign",
                        "node.labelLocation",
                    ],
                },
            },
        ]);
    });

    it("gives a fixed label style no warning", () => {
        const held = harness();
        const result = held.styles.validate({
            name: "fixed",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.labelStyle": { value: { color: "#00ff00" } } },
        });

        assert.isTrue(result.ok);
        assert.deepEqual(result.warnings, []);
    });

    it("is still added, and paints what it painted before: nothing", async () => {
        const held = harness();
        await everyNode(held, "base", { set: { "node.label": "hi", "node.labelStyle": { sizePx: 20 } } });
        const layer = await held.styles.add(bound);
        await held.paintAll();

        assert.include(
            held.styles.list().map((entry) => entry.id),
            layer.id,
        );
        assert.deepEqual(held.engine.styleOf("node", 0)["node.labelStyle"], { sizePx: 20 });
        assert.deepEqual(held.styles.explain({ node: "a" }).merged["node.labelStyle"], { sizePx: 20 });
        assert.strictEqual(drawnLabel(held, 0).fontSize, 20);
    });
});

describe("label field channels take a rule", () => {
    it("draws one label size per node from a column", async () => {
        const held = harness();
        await everyNode(held, "label", { set: { "node.label": "hi" } });
        await everyNode(held, "size", { encode: { "node.labelSize": { by: "data.fs", scale: "passthrough" } } });
        await held.paintAll();

        for (const [index, id] of ["a", "b", "c"].entries()) {
            const expected = NODES[index]?.["data.fs"] as number | undefined;
            const merged = held.styles.explain({ node: id }).merged["node.labelStyle"];

            assert.deepEqual(merged, { sizePx: expected }, id);
            assert.strictEqual(drawnLabel(held, index).fontSize, expected, id);
        }
    });

    it("maps a category to a label color, weight and font, on nodes and on edges", async () => {
        const held = harness();
        await everyNode(held, "by kind", {
            set: { "node.label": "hi" },
            encode: {
                "node.labelColor": { by: "data.kind", scale: "passthrough", map: { x: "red", y: "#0000ff" } },
                "node.labelWeight": { by: "data.kind", scale: "passthrough", map: { x: "bold", y: "normal" } },
                "node.labelFont": { by: "data.kind", scale: "passthrough", map: { x: "Courier", y: "Arial" } },
            },
        });
        await held.styles.add({
            name: "edge",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.label": "e" },
            encode: { "edge.labelColor": { by: "data.kind", scale: "passthrough", map: { y: "#00ff00" } } },
        });
        await held.paintAll();

        const first = held.styles.explain({ node: "a" }).merged["node.labelStyle"];
        assert.deepEqual(
            { ...first, color: first?.color?.toLowerCase() },
            {
                color: "#ff0000",
                weight: "bold",
                font: "Courier",
            },
        );
        const drawn = drawnLabel(held, 1);
        assert.strictEqual(String(drawn.textColor).toLowerCase(), "#0000ff");
        assert.strictEqual(drawn.fontWeight, "normal");
        assert.strictEqual(drawn.font, "Arial");
        assert.strictEqual(
            held.styles.explain({ edge: "a->b" }).merged["edge.labelStyle"]?.color?.toLowerCase(),
            "#00ff00",
        );
        assert.strictEqual(String(held.painter.edgePaint(0)?.style.label?.textColor).toLowerCase(), "#00ff00");
    });

    it("names the label style each field lands in", () => {
        assert.deepEqual(labelFieldOf("node.labelSize"), { into: "node.labelStyle", field: "sizePx" });
        assert.deepEqual(labelFieldOf("edge.labelColor"), { into: "edge.labelStyle", field: "color" });
        assert.isUndefined(labelFieldOf("node.labelStyle"));
        assert.isUndefined(labelFieldOf("node.label"));
        assert.deepEqual(labelFieldOf("edge.labelTextAlign"), { into: "edge.labelStyle", field: "textAlign" });
    });

    it("lines up a label's lines as labelTextAlign says, beside the other fields", async () => {
        const held = harness();
        await everyNode(held, "style", {
            set: { "node.label": "one\ntwo", "node.labelStyle": { sizePx: 24 }, "node.labelTextAlign": "left" },
        });
        await held.paintAll();

        assert.deepEqual(held.styles.explain({ node: "a" }).merged["node.labelStyle"], {
            sizePx: 24,
            textAlign: "left",
        });
        assert.strictEqual(drawnLabel(held, 0).textAlign, "left");
    });

    it("gives each node its own label place from a column through labelLocation, however many places", async () => {
        const held = harness();
        await everyNode(held, "style", {
            set: { "node.label": "hi", "node.labelStyle": { sizePx: 24 } },
            encode: {
                "node.labelLocation": {
                    by: "data.id",
                    scale: "passthrough",
                    map: { a: "inside-top-left", b: "bottom-right", c: "top" },
                },
            },
        });
        await held.paintAll();

        assert.deepEqual(labelFieldOf("node.labelLocation"), { into: "node.labelStyle", field: "location" });
        assert.deepEqual(held.styles.explain({ node: "a" }).merged["node.labelStyle"], {
            sizePx: 24,
            location: "inside-top-left",
        });
        assert.deepEqual(
            [0, 1, 2].map((i) => drawnLabel(held, i).location),
            ["inside-top-left", "bottom-right", "top"],
        );
    });

    it("draws an end caption in its own face, color, weight and opacity", async () => {
        const held = harness();
        await held.styles.add({
            name: "captions",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.arrowHeadText": "T",
                "edge.arrowHeadTextFont": "DejaVu Sans",
                "edge.arrowHeadTextColor": "#ff0000",
                "edge.arrowHeadTextWeight": "bold",
                "edge.arrowHeadTextOpacity": 0.5,
            },
        });
        await held.paintAll();

        const text = EdgeStyle.parse(held.painter.edgePaint(0)?.style).arrowHead?.text;
        assert.strictEqual(text?.text, "T");
        assert.strictEqual(text?.font, "DejaVu Sans");
        assert.strictEqual(String(text?.textColor).toLowerCase(), "#ff0000");
        assert.strictEqual(text?.fontWeight, "bold");
        assert.strictEqual(text?.textOpacity, 0.5);
    });

    it("draws a line round the label's box as labelBorder and labelBorderWidth say", async () => {
        const held = harness();
        await everyNode(held, "style", {
            set: {
                "node.label": "hi",
                "node.labelBackground": "#b7c9e3",
                "node.labelBorder": "#25537a",
                "node.labelBorderWidth": 2,
            },
        });
        await held.paintAll();

        assert.deepEqual(labelFieldOf("edge.labelBorderWidth"), { into: "edge.labelStyle", field: "borderWidth" });
        const drawn = drawnLabel(held, 0);
        assert.strictEqual(drawn.borderColor, "#25537A");
        assert.strictEqual(drawn.borderWidth, 2);
    });

    it("draws the words and their box translucent, and moves the label, as the new label fields say", async () => {
        const held = harness();
        await everyNode(held, "style", {
            set: {
                "node.label": "hi",
                "node.labelBackground": "#b7c9e3",
                "node.labelOpacity": 0.25,
                "node.labelBackgroundOpacity": 0.5,
                "node.labelOffsetX": 1.5,
                "node.labelOffsetY": -2,
                "node.labelShiftX": -0.5,
                "node.labelShiftY": 0.5,
                "node.labelShiftOf": "words",
            },
        });
        await held.paintAll();

        assert.deepEqual(labelFieldOf("edge.labelOffsetY"), { into: "edge.labelStyle", field: "offsetY" });
        const drawn = drawnLabel(held, 0);
        assert.strictEqual(drawn.textOpacity, 0.25);
        assert.strictEqual(drawn.backgroundOpacity, 0.5);
        assert.strictEqual(drawn.offsetX, 1.5);
        assert.strictEqual(drawn.offsetY, -2);
        assert.strictEqual(drawn.shiftX, -0.5);
        assert.strictEqual(drawn.shiftY, 0.5);
        assert.strictEqual(drawn.shiftOf, "words");
    });
});
