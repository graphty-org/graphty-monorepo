/**
 * @file A file's styles as graphty-element layers: the rules graph-io read or recovered from the
 * file, turned into layers in rule order, with the per-element values those layers read.
 *
 * The translation is exact by construction wherever the element can draw what the file says.
 * Every binding it emits is checked, element by element, against graph-io's own reading of the
 * rule (`resolveStyles`); a binding that would paint anything else is replaced by the rule's
 * values kept per element, so a difference between the two vocabularies never reaches the
 * picture. What the element cannot draw is noted with a code, never drawn as something else.
 *
 * - One layer per rule, in rule order: every layer made from rule i sits below every layer made
 *   from rule i+1, whichever pass made it.
 * - Selectors are short (at most 8 terms). A wider group, or one the element's expression
 *   language would read differently, is written onto the elements as a membership value and
 *   selected with `has`.
 * - Values the layers read live in the load's file-style namespace,
 *   `graphty.style.<namespace>.<kind>.<key>`, never in the data records.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import {
    type ColumnRef,
    type ExtractedStyles,
    type Mapping,
    matchPredicate,
    planStyles,
    type Predicate,
    resolveStyles,
    type StyleArrowShape,
    type StyleNote,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
    type StyleTool,
    type StyleValue,
    type ToolArrowhead,
    toolDefaults,
} from "@graphty/graph-io/styles";

import type { Binding, BindingStop, Channel, LayerKind, LayerSpec, Path, Selector } from "../../../catalog/types";
import { EDGE_CONSTANTS } from "../../../constants/meshConstants";
import type { CodedFactParam } from "../../shared";
import { channelDescriptor, labelFieldOf, labelPatchOf, mergeLabelStyle, toColorValue } from "../channels";
import { quotePath } from "../predicate";
import { FILE_STYLE_TRANSLATION_ISSUE, type FileStyleNoteCode } from "./codes";
import { type FoldableLayer, foldToCap } from "./fold";
import type { FileStyleMeaning, FileStyleOrigin } from "./origin";
import { computedPath, fileStylePath, isFileStylePath, parseFileStylePath } from "./path";
import {
    ARROW_SHAPES,
    ARROW_SHAPES_NEAREST,
    BORDER_STYLES,
    BORDER_STYLES_NEAREST,
    FILE_STYLE_SHAPES,
    type FileStyleShapeTable,
    LINE_STYLES,
    LINE_STYLES_NEAREST,
    OUTLINE_STYLES,
} from "./shapes";
import type { FileStyleScalar } from "./store";

/** The most terms a selector made from a file holds; a wider group is written onto the elements. */
const MAX_TERMS = 8;

/** The key of the copy graph-io writes of a data column a format cannot keep, and the column it copies. */
const CARRIED_INPUT = /^input\.(?:[^.]+\.)?data\.(.+)$/;
/** A mapping table with more keys present than this is kept as values per element. */
const MAX_TABLE_KEYS = 256;
/** The key `ext` carries graphty-element's own layer under, in a file graphty wrote. */
export const LAYER_SPEC_EXT = "@graphty/graphty-element";

/** How a file's styles are turned into layers: choices another consumer may make differently. */
export interface FileStyleOptions {
    /**
     * How lengths are scaled: `"median"` (the default) scales every length by one factor, so the
     * file's median node size (by its larger side) is the element's default node size and node sizes, borders, edge
     * widths, label sizes and the stored positions a recommended layout keeps all keep the file's
     * proportions; `"file"` keeps the file's numbers as they are.
     */
    readonly lengths?: "median" | "file";
    /**
     * The element shape each 2D node shape of the file is drawn as; `FILE_STYLE_SHAPES` by default.
     * A shape the table leaves out is not drawn from the file, and the load notes it.
     */
    readonly shapes?: FileStyleShapeTable;
    /**
     * How many layers label positions may take when the file sets them per element. Label positions are
     * drawn by one layer whatever their number (`node.labelLocation`), so this caps nothing.
     * @deprecated Every label position the file sets is drawn; the value is ignored.
     */
    readonly labelLayers?: number;
    /**
     * Whether a property the file leaves to the program that wrote it gets that program's default
     * (Cytoscape's for CX and sessions, Graphviz's for DOT, Gephi's for GEXF ...), so the graph
     * looks as it does there. True by default.
     */
    readonly toolDefaults?: boolean;
}

/** One note of a translation: a code and the facts it is about. */
export interface FileStyleNote {
    /** What happened. */
    readonly code: FileStyleNoteCode;
    /**
     * The facts: `property` (the file's property or construct, or null), `target` (`node`,
     * `edge`, `graph`, or null), `count` (how many times), `samples` (up to 8 of the file's own
     * values) and, on `W_STYLE_LAYER_SPEC_IGNORED`, `reason`: why the layer was not rebuilt
     * (`INVALID`, `SELECTOR`, `SELECTOR_TERMS`, `PATH`, or `REFUSED` when the element refused it).
     */
    readonly params: Readonly<Record<string, CodedFactParam>>;
}

/** What the translation needs. */
export interface TranslateInput {
    /** The file's styles, as graph-io read them. */
    readonly extracted: ExtractedStyles;
    /** The graph the import built, which the styles' element indexes refer to. */
    readonly snapshot: GraphSnapshot;
    /** The load's file-style namespace. */
    readonly namespace: string;
    /** The graph-io format id or JSON dialect the file was read as. */
    readonly format: string;
    /** The load, as its layers' facts name it. */
    readonly importId: string;
    /** The load's choices. */
    readonly options: FileStyleOptions;
    /** What the element's own base layers paint, per kind, for a file graphty wrote. */
    readonly base: Readonly<Record<StyleTarget, Readonly<Partial<Record<Channel, unknown>>>>>;
    /** The path a layer reads one of the file's data columns at, or null when it cannot. */
    readonly dataPath: (kind: StyleTarget, column: string) => Path | null;
    /**
     * How many px of the file's label sizes one unit of its positions is, when its labels are drawn
     * in canvas px over positions fitted to the canvas (sigma.js); absent when its label sizes are in
     * the unit of its other lengths.
     */
    readonly labelPxPerUnit?: number;
}

/** One layer the translation made. */
export interface TranslatedLayer {
    /** The layer. */
    readonly spec: LayerSpec;
    /**
     * The neutral layers to use instead when the element refuses this one: set for a layer
     * rebuilt from a layer graphty wrote into the file.
     */
    readonly fallback?: readonly LayerSpec[];
}

/** What a translation made. */
export interface Translation {
    /** The layers, bottom first, in the order of the rules they stand for. */
    readonly layers: readonly TranslatedLayer[];
    /** The values the layers read, per kind and key, by the import's element index. */
    readonly columns: Readonly<Record<StyleTarget, ReadonlyMap<string, readonly (FileStyleScalar | null)[]>>>;
    /** Per kind, the key of the column marking the elements the file hides, and how many; null when it hides none. */
    readonly hidden: Readonly<Record<StyleTarget, { readonly key: string; readonly count: number } | null>>;
    /** The graph's background color, or null. */
    readonly background: string | null;
    /** What the file's reading and its translation met. */
    readonly notes: readonly FileStyleNote[];
    /**
     * What the layers paint, per kind and channel, by the import's element index (null where they
     * paint nothing), as the translation computed it from graph-io's own reading of the file: what
     * `styles.explain()` gives each element once the layers apply. A label's fields are merged into
     * `<kind>.labelStyle`, field by field. Null for a kind with a layer rebuilt from one graphty
     * wrote, whose painting the translation does not compute.
     */
    readonly predicted: Readonly<Record<StyleTarget, ReadonlyMap<Channel, readonly unknown[]> | null>>;
    /**
     * The scene units one unit of the file's lengths is drawn as, which the file's stored positions
     * take too so the drawing keeps the file's proportions; null when lengths are kept as the file
     * has them.
     */
    readonly sceneScale: number | null;
}

/** How a neutral value becomes a channel value; null where the channel has no counterpart. */
type Convert = (value: StyleValue) => unknown;

/** One channel a neutral property is drawn on. */
/** The CSS weight of each neutral glyph weight. */
const GLYPH_WEIGHTS: ReadonlyMap<string, number> = new Map([
    ["normal", 400],
    ["bold", 700],
]);

/**
 * The rule property `withCornerCap` writes the program's default cap under: drawn on `node.cornerRadius` alone, so
 * the corners stay capped at a quarter of the shorter side, where a radius the file gives is drawn as given.
 */
const CORNER_CAP = "graphty-internal:cornerRadiusCap";

interface ChannelPlan {
    readonly channel: Channel;
    readonly convert: Convert;
    /** True when the channel takes the neutral value unchanged. */
    readonly identity: boolean;
    /** Whether a value is drawn as the nearest one rather than exactly. */
    readonly nearest?: (value: StyleValue) => boolean;
    /**
     * True when `convert` is not in proportion to the value: a continuous mapping is then drawn
     * between its converted points, not as each element's own value converted.
     */
    readonly curved?: boolean;
}

/** A layer being built, with what it paints. */
interface Building extends FoldableLayer {
    readonly bucket: number;
    readonly spec: LayerSpec & { set: Record<string, unknown>; encode: Record<string, Binding> };
    readonly paint: Map<Channel, unknown[]> | null;
    /** What it paints per channel, kept even where `paint` is null to stop the fold; absent for a rebuilt layer. */
    drawn?: Map<Channel, unknown[]>;
    worth: number;
    fallback?: readonly LayerSpec[];
    /** A layer of an end label's own face, drawn over the rest of its rule's (`END_LABEL_FACE`). */
    ends?: true;
}

/**
 * An end label's own face, which wins over the label's at that end. Each is drawn in a layer of its own over the rest
 * of its rule's: in the rule's own layer it would take the end caption's channel from the label's, and leave the
 * edges without a face of their own to the layers under it (dot-specimen-edge-labels drew every other head label in
 * Graphviz's default 14 point Times once `labelfontsize` was read).
 */
const END_LABEL_FACE: ReadonlySet<string> = new Set([
    "sourceLabelSize",
    "targetLabelSize",
    "sourceLabelColor",
    "targetLabelColor",
    "sourceLabelFont",
    "targetLabelFont",
]);

/** Notes, one per code, kind and property. */
class Notes {
    readonly #held = new Map<
        string,
        {
            code: FileStyleNoteCode;
            property: string | null;
            target: string | null;
            count: number;
            samples: string[];
            reason?: string;
        }
    >();

    /**
     * Note something.
     * @param code - What happened.
     * @param target - The kind, or null.
     * @param property - The property, or null.
     * @param count - How many times.
     * @param sample - An example of the file's own values.
     * @param reason - Why, as a code (`SELECTOR`, `PATH`); the first one given is kept.
     */
    add(
        code: FileStyleNoteCode,
        target: string | null,
        property: string | null,
        count = 1,
        sample?: string,
        reason?: string,
    ): void {
        const key = `${code}\u0000${target ?? ""}\u0000${property ?? ""}`;
        let held = this.#held.get(key);
        if (held === undefined) {
            held = { code, property, target, count: 0, samples: [] };
            this.#held.set(key, held);
        }

        held.count += count;
        held.reason ??= reason;
        if (sample !== undefined && held.samples.length < 8 && !held.samples.includes(sample.slice(0, 80))) {
            held.samples.push(sample.slice(0, 80));
        }
    }

    /**
     * A note graph-io made while reading the file, as it stands.
     * @param note - The note.
     */
    keep(note: StyleNote): void {
        this.add(note.code, note.params.target, note.params.property, note.params.count);
        const held = [...this.#held.values()].at(-1);
        for (const sample of note.params.samples) {
            if (held !== undefined && held.samples.length < 8) {
                held.samples.push(sample);
            }
        }
    }

    /**
     * The notes, one per code, kind and property.
     * @returns The notes.
     */
    list(): FileStyleNote[] {
        return [...this.#held.values()].map((held) =>
            Object.freeze({
                code: held.code,
                params: Object.freeze({
                    property: held.property,
                    target: held.target,
                    count: held.count,
                    samples: Object.freeze([...held.samples]),
                    ...(held.reason === undefined ? {} : { reason: held.reason }),
                }),
            }),
        );
    }
}

/**
 * A plain value of a snapshot cell: 64-bit integers as numbers, list cells as arrays, unset as null.
 * @param value - The cell.
 * @returns The value.
 */
function plain(value: unknown): unknown {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === "bigint") {
        return Number(value);
    }

    if (ArrayBuffer.isView(value)) {
        return Array.from(value as unknown as ArrayLike<number>);
    }

    return value;
}

/**
 * What the element draws for a value on a channel, as the translation compares it: a color as
 * `#rrggbb`, and anything the channel would not take as null.
 * @param channel - The channel.
 * @param value - The value the layer reads.
 * @returns The drawn value, or null.
 */
function drawnAs(channel: Channel, value: unknown): unknown {
    const descriptor = channelDescriptor(channel);
    if (descriptor === undefined || value === null || value === undefined) {
        return null;
    }

    switch (descriptor.accepts) {
        case "color":
            return typeof value === "string" ? (toColorValue(value)?.hex.slice(0, 7).toLowerCase() ?? null) : null;
        case "number":
            return typeof value === "number" && Number.isFinite(value) ? value : null;
        case "text":
            return typeof value === "string" ? value : null;
        case "boolean":
            return typeof value === "boolean" ? value : null;
        case "enum":
            return typeof value === "string" && (descriptor.values ?? []).includes(value) ? value : null;
        default:
            return null;
    }
}

/**
 * Whether two drawn values are the same: numbers within a relative 1e-9.
 * @param a - One value.
 * @param b - The other.
 * @returns True when equal.
 */
function same(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    return (
        typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b))
    );
}

/**
 * The text an element's binding map is keyed by for a value: how the element spells a category.
 * @param value - The value.
 * @returns The key, or null for a value that is no category.
 */
function categoryOf(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
        return String(value);
    }

    return null;
}

/**
 * A literal of the element's expression language.
 * @param value - A string, number or boolean.
 * @returns The literal.
 */
function literal(value: unknown): string {
    if (typeof value === "string") {
        const escaped = value.replaceAll("\\", String.raw`\\`).replaceAll("'", String.raw`\'`);
        return `'${escaped}'`;
    }

    return `\`${JSON.stringify(value)}\``;
}

/**
 * The terms of a predicate: how many comparisons its selector would hold.
 * @param where - The predicate.
 * @returns The count, or Infinity for a predicate of a kind this version does not know.
 */
function termsOf(where: Predicate): number {
    if ("all" in where) {
        return 0;
    }

    if ("has" in where || "eq" in where) {
        return 1;
    }

    if ("in" in where) {
        return Array.isArray(where.in[1]) ? where.in[1].length : Infinity;
    }

    if ("not" in where) {
        return termsOf(where.not);
    }

    const list = listOf(where);
    if (!Array.isArray(list)) {
        return Infinity;
    }

    return list.reduce((sum: number, inner: Predicate) => sum + termsOf(inner), 0);
}

/**
 * How many comparisons an expression selector holds, outside its literals.
 * @param where - The expression.
 * @returns The count.
 */
export function expressionTerms(where: string): number {
    let terms = 0;
    let at = 0;
    while (at < where.length) {
        const character = where[at];
        const two = where.slice(at, at + 2);
        if (character === "'" || character === "`" || character === '"') {
            // Skip the literal or the quoted name, honouring its backslash escapes.
            at = closingQuote(where, at + 1, character) + 1;
        } else if (two === "==" || two === "!=" || two === "<=" || two === ">=") {
            terms++;
            at += 2;
        } else {
            terms += character === "<" || character === ">" ? 1 : 0;
            at++;
        }
    }

    return terms;
}

/**
 * Where a quoted literal or name closes: its quote, its backslash escapes honoured.
 * @param where - The expression.
 * @param from - The position after the opening quote.
 * @param quote - The quote.
 * @returns The closing quote's position, or the end of the expression.
 */
function closingQuote(where: string, from: number, quote: string): number {
    let at = from;
    while (at < where.length && where[at] !== quote) {
        at += where[at] === "\\" ? 2 : 1;
    }

    return at;
}

/**
 * The neutral property each channel of a kind is drawn from, and how.
 * @param kind - Nodes or edges.
 * @param factors - What the file's lengths are multiplied by.
 * @param shapes - The 2D-to-3D shape table.
 * @param graphty - Whether graphty wrote the file.
 * @param arrowsSized - Whether arrow sizes are drawn in a pass of their own (`#arrowSizes`).
 * @param borderOnScreen - Whether the writing program draws a node's border width in screen pixels.
 * @returns The plans per property.
 */
function channelPlans(
    kind: StyleTarget,
    factors: LengthFactors,
    shapes: FileStyleShapeTable,
    graphty: boolean,
    arrowsSized: boolean,
    borderOnScreen = false,
): ReadonlyMap<string, readonly ChannelPlan[]> {
    const id = (channel: Channel): ChannelPlan => ({ channel, convert: (value) => value, identity: true });
    const table = (
        channel: Channel,
        entries: ReadonlyMap<string, string>,
        nearest?: ReadonlySet<string>,
    ): ChannelPlan => ({
        channel,
        convert: (value) => (typeof value === "string" ? (entries.get(value) ?? null) : null),
        identity: false,
        ...(nearest === undefined
            ? {}
            : { nearest: (value: StyleValue) => typeof value === "string" && nearest.has(value) }),
    });
    const label = (field: string): ChannelPlan => id(`${kind}.${field}` as Channel);
    // an edge's end captions are drawn in its label's face, color, weight and opacity, as every program draws its
    // source and target labels (Cytoscape.js, Graphviz's headlabel and taillabel); graphty writes its own captions
    const captions = (field: "Color" | "Font" | "Weight" | "Opacity"): ChannelPlan[] =>
        graphty ? [] : [id(`edge.arrowHeadText${field}`), id(`edge.arrowTailText${field}`)];
    // a label's place, one field of its label style, so each element keeps its own however many places the file uses
    const location = (target: StyleTarget): ChannelPlan => ({
        channel: `${target}.labelLocation`,
        convert: (value) => (typeof value === "string" && LOCATIONS.has(value) ? value : null),
        identity: false,
    });
    const length = (channel: Channel, factor = factors[kind]): ChannelPlan => ({
        channel,
        convert: (value) => (typeof value === "number" ? round(value * factor) : null),
        identity: factor === 1,
    });
    // Each size converted on its own: a label's letters are not in proportion to its `sizePx` (see LABEL).
    // The letters' height in the scene, besides the canvas size: `sizePx / 48` scene units is a line of the font's own
    // line height, which differs from one font to the next.
    const labelSize = (channel: Channel, letters: Channel): ChannelPlan[] => {
        const px = factors.label;
        const { letter } = factors;
        return px === null || letter === null
            ? [id(channel)]
            : [
                  {
                      channel,
                      convert: (value) => (typeof value === "number" ? round(px(value)) : null),
                      identity: false,
                      curved: true,
                  },
                  length(letters, letter),
              ];
    };
    // A label outline's width: the file's is the width of a stroke centered on the letters' edges (a canvas
    // `strokeText`), the element's how far the outline reaches out from them, half that, in the canvas pixels its
    // `sizePx` is drawn in. The file's width over its label size is kept, at vis-network's and Cytoscape.js's usual
    // 14 px (the size is not in proportion to `sizePx`, see LABEL, so one ratio stands for every label).
    // ponytail: one ratio for every label size; per element against its own label size if outlines of very different
    // sizes need it
    // A label box's border width is a whole stroke's width, so it is not halved.
    const labelLength = (channel: Channel, half = true): ChannelPlan => {
        const px = factors.label;
        const ratio = (px === null ? 1 : px(14) / 14) / (half ? 2 : 1);
        return {
            channel,
            convert: (value) => (typeof value === "number" ? round(value * ratio) : null),
            identity: ratio === 1,
        };
    };
    if (kind === "node") {
        const shapeTable = new Map(Object.entries(shapes));
        const nearShapes = new Set([...shapeTable].filter(([from, to]) => from !== to).map(([from]) => from));
        return new Map<string, readonly ChannelPlan[]>([
            ["fill", [id("node.color")]],
            ["fillGradient", [id("node.gradientColor")]],
            ["fillGradientAngle", [id("node.gradientDirection")]],
            ["fillGradientColors", [id("node.gradientColors")]],
            ["fillGradientStops", [id("node.gradientStops")]],
            ["fillGradientKind", [table("node.gradientKind", NODE_GRADIENT_KINDS)]],
            // graphty writes a consumer's `node.outline` as `borderColor`, so its own file reads it
            // back there. Another program's border is a ring sized with the node: drawn as the
            // outline's screen-space glow it covers the fill once the graph is framed (issue #2252).
            ["borderColor", [id(graphty ? "node.outline" : "node.borderColor")]],
            // Where the program draws it in screen pixels (vis-network), also as a screen width, never
            // scaled by the lengths, which is drawn in place of the length.
            [
                "borderWidth",
                borderOnScreen
                    ? [length("node.borderWidth"), id("node.borderScreenWidth")]
                    : [length("node.borderWidth")],
            ],
            ["borderOpacity", [id("node.borderOpacity")]],
            // A radius the file gives is drawn as given; the writing program's default cap (`withCornerCap`) is a cap.
            [
                "cornerRadius",
                [
                    length("node.cornerRadius"),
                    {
                        channel: "node.exactCornerRadius",
                        convert: (value) => (typeof value === "number" ? true : null),
                        identity: false,
                    },
                ],
            ],
            [CORNER_CAP, [length("node.cornerRadius")]],
            ["shapePoints", [id("node.shapePoints")]],
            ["shapePointsStretch", [id("node.shapeStretchPoints")]],
            ["shapeParts", [id("node.shapeParts")]],
            ["shapeLines", [id("node.shapeLines")]],
            ["shapeTexts", [id("node.shapeTexts")]],
            ["shapeLineWidth", [length("node.shapeLineWidth")]],
            // An image drawn at its own size draws each of its pixels one of the file's lengths across.
            [
                "image",
                [
                    id("node.image"),
                    { channel: "node.imagePixelSize", convert: () => round(factors.node), identity: false },
                ],
            ],
            ["imageFit", [id("node.imageFit")]],
            ["imageFallback", [id("node.imageFallback")]],
            ["imageWidth", [length("node.imageWidth")]],
            ["imageHeight", [length("node.imageHeight")]],
            ["imagePositionX", [id("node.imagePositionX")]],
            ["imagePositionY", [id("node.imagePositionY")]],
            ["imageOffsetX", [length("node.imageOffsetX")]],
            ["imageOffsetY", [length("node.imageOffsetY")]],
            ["imageRepeat", [id("node.imageRepeat")]],
            ["imageClip", [id("node.imageClip")]],
            ["imageSmoothing", [id("node.imageSmoothing")]],
            ["imageAutoSize", [id("node.imageAutoSize")]],
            ["imageOpacity", [id("node.imageOpacity")]],
            ["glyph", [id("node.glyph")]],
            ["glyphFont", [id("node.glyphFont")]],
            ["glyphSize", [length("node.glyphSize")]],
            ["glyphColor", [id("node.glyphColor")]],
            [
                "glyphWeight",
                [
                    {
                        channel: "node.glyphWeight",
                        convert: (value) => GLYPH_WEIGHTS.get(String(value)) ?? null,
                        identity: false,
                    },
                ],
            ],
            ["pieColors", [id("node.pieColors")]],
            ["pieSizes", [id("node.pieSizes")]],
            ["pieOpacities", [id("node.pieOpacities")]],
            ["pieRadius", [id("node.pieRadius")]],
            ["pieHole", [id("node.pieHole")]],
            ["pieRotation", [id("node.pieRotation")]],
            ["pieFitBox", [id("node.pieFitBox")]],
            ["pieOffsetX", [length("node.pieOffsetX")]],
            ["pieOffsetY", [length("node.pieOffsetY")]],
            ["stripeColors", [id("node.stripeColors")]],
            ["stripeSizes", [id("node.stripeSizes")]],
            ["stripeOpacities", [id("node.stripeOpacities")]],
            ["stripeDirection", [id("node.stripeDirection")]],
            ["stripeSize", [id("node.stripeSize")]],
            ["chartKind", [id("node.chartKind")]],
            ["chartValues", [id("node.chartValues")]],
            ["chartColors", [id("node.chartColors")]],
            ["chartMin", [id("node.chartMin")]],
            ["chartMax", [id("node.chartMax")]],
            ["chartHorizontal", [id("node.chartHorizontal")]],
            ["chartSize", [id("node.chartSize")]],
            ["chartMargin", [id("node.chartMargin")]],
            ["chartGap", [id("node.chartGap")]],
            ["chartLineWidth", [length("node.chartLineWidth")]],
            ["chartBorderColor", [id("node.chartBorderColor")]],
            ["chartBorderWidth", [length("node.chartBorderWidth")]],
            ["groupPadding", [length("node.groupPadding")]],
            ["groupPaddingRatio", [id("node.groupPaddingRatio")]],
            ["groupPaddingOf", [id("node.groupPaddingOf")]],
            ["groupMinWidth", [length("node.groupMinWidth")]],
            ["groupMinHeight", [length("node.groupMinHeight")]],
            ["groupMinWidthBiasLeft", [id("node.groupMinWidthBiasLeft")]],
            ["groupMinHeightBiasTop", [id("node.groupMinHeightBiasTop")]],
            ["groupIncludeLabels", [id("node.groupIncludeLabels")]],
            // Drawn in a pass of their own (`#extents`), only where some node's sides differ.
            ["width", [length("node.width")]],
            ["height", [length("node.height")]],
            ["borderStyle", [table("node.borderStyle", BORDER_STYLES, BORDER_STYLES_NEAREST)]],
            ["borderPosition", [id("node.borderPosition")]],
            ["borderWaveAmplitude", [length("node.borderWaveAmplitude")]],
            ["borderWavePeriod", [length("node.borderWavePeriod")]],
            ["outerBorderColor", [id("node.outerBorderColor")]],
            ["outerBorderWidth", [length("node.outerBorderWidth")]],
            ["outerBorderOpacity", [id("node.outerBorderOpacity")]],
            ["outerBorderStyle", [table("node.outerBorderStyle", BORDER_STYLES, BORDER_STYLES_NEAREST)]],
            ["outerBorderOffset", [length("node.outerBorderOffset")]],
            ["underlayColor", [id("node.underlayColor")]],
            ["underlayOpacity", [id("node.underlayOpacity")]],
            ["underlayPadding", [length("node.underlayPadding")]],
            ["underlayShape", [table("node.underlayShape", shapeTable, nearShapes)]],
            ["underlayCornerRadius", [length("node.underlayCornerRadius")]],
            ["overlayColor", [id("node.overlayColor")]],
            ["overlayOpacity", [id("node.overlayOpacity")]],
            ["overlayPadding", [length("node.overlayPadding")]],
            ["overlayShape", [table("node.overlayShape", shapeTable, nearShapes)]],
            ["overlayCornerRadius", [length("node.overlayCornerRadius")]],
            ["label", [id("node.label")]],
            ["tooltip", [id("node.tooltip")]],
            ["shape", [table("node.shape", shapeTable, nearShapes)]],
            ["labelColor", [label("labelColor")]],
            ["labelSize", labelSize("node.labelSize", "node.labelLetterSize")],
            // A label's wrap width is drawn in the scene's units, a node size's in its own.
            ["labelWrapWidth", [length("node.labelWrapWidth", factors.node * SCENE_PER_UNIT.node)]],
            ["labelWrapTrailingSpace", [id("node.labelWrapTrailingSpace")]],
            ["labelWrapEllipsis", [id("node.labelWrapEllipsis")]],
            ["labelWrapAnywhere", [id("node.labelWrapAnywhere")]],
            ["labelWrapSpaceCount", [id("node.labelWrapSpaceCount")]],
            ["labelRunAlign", [id("node.labelRunAlign")]],
            ["labelFont", [label("labelFont")]],
            ["labelWeight", [label("labelWeight")]],
            ["labelTextAlign", [label("labelTextAlign")]],
            ["labelPosition", [location("node")]],
            ["labelItalic", [label("labelItalic")]],
            ["labelRotation", [label("labelRotation")]],
            ["labelBackground", [label("labelBackground")]],
            ["labelOutlineColor", [label("labelOutline")]],
            ["labelOutlineWidth", [labelLength("node.labelOutlineWidth")]],
            ["labelBorderColor", [label("labelBorder")]],
            ["labelBorderWidth", [labelLength("node.labelBorderWidth", false)]],
            ["labelOpacity", [label("labelOpacity")]],
            ["labelBackgroundOpacity", [label("labelBackgroundOpacity")]],
            ["labelOutlineOpacity", [label("labelOutlineOpacity")]],
            ["labelBorderOpacity", [label("labelBorderOpacity")]],
            ["labelPadding", [labelLength("node.labelPadding", false)]],
            ["labelCornerRadius", [labelLength("node.labelCornerRadius", false)]],
            ["labelLineHeight", [label("labelLineHeight")]],
            // moved in the scene's units, as a wrap width is
            ["labelOffsetX", [length("node.labelOffsetX", factors.node * SCENE_PER_UNIT.node)]],
            ["labelOffsetY", [length("node.labelOffsetY", factors.node * SCENE_PER_UNIT.node)]],
            ["labelShiftX", [label("labelShiftX")]],
            ["labelShiftY", [label("labelShiftY")]],
            ["labelFit", [id("node.labelFit")]],
            ["labelPaddingX", [length("node.labelPaddingX")]],
            ["labelPaddingY", [length("node.labelPaddingY")]],
            ["labelFitSquare", [id("node.labelFitSquare")]],
            // Screen pixels, so never scaled by the file's lengths.
            ["labelMinScreenSize", [id("node.labelMinScreenSize")]],
            ["labelMinNodeScreenSize", [id("node.labelMinNodeScreenSize")]],
            ["labelOnTop", [id("node.labelOnTop")]],
            [
                "labelAvoidOverlap",
                [
                    {
                        channel: "node.labelDeclutter",
                        convert: (value) => (value === true ? "size" : null),
                        identity: false,
                    },
                ],
            ],
        ]);
    }

    return new Map<string, readonly ChannelPlan[]>([
        ["color", [id("edge.color")]],
        ["opacity", [id("edge.opacity")]],
        ["width", [length("edge.width")]],
        // Screen pixels, so never scaled by the file's lengths.
        ["minScreenWidth", [id("edge.minScreenWidth")]],
        // in the line's own width units, as its width is
        ["outlineWidth", [length("edge.outlineWidth")]],
        ["outlineColor", [id("edge.outlineColor")]],
        ["outlineOpacity", [id("edge.outlineOpacity")]],
        ["outlineStyle", [table("edge.outlineStyle", OUTLINE_STYLES, LINE_STYLES_NEAREST)]],
        ["underlayColor", [id("edge.underlayColor")]],
        ["underlayOpacity", [id("edge.underlayOpacity")]],
        // in the line's own width units, as its width is
        ["underlayPadding", [length("edge.underlayPadding")]],
        ["overlayColor", [id("edge.overlayColor")]],
        ["overlayOpacity", [id("edge.overlayOpacity")]],
        // in the line's own width units, as its width is
        ["overlayPadding", [length("edge.overlayPadding")]],
        ["gradientColors", [id("edge.gradientColors")]],
        ["gradientStops", [id("edge.gradientStops")]],
        ["gradientKind", [table("edge.gradientKind", GRADIENT_KINDS)]],
        ["lineStyle", [table("edge.style", LINE_STYLES, LINE_STYLES_NEAREST)]],
        // in the line's own width units, as its width is
        ["waveAmplitude", [length("edge.waveAmplitude")]],
        ["wavePeriod", [length("edge.wavePeriod")]],
        ["targetArrow", [table("edge.arrowHead", ARROW_SHAPES, ARROW_SHAPES_NEAREST)]],
        ["sourceArrow", [table("edge.arrowTail", ARROW_SHAPES, ARROW_SHAPES_NEAREST)]],
        ["targetArrowColor", [id("edge.arrowHeadColor")]],
        ["sourceArrowColor", [id("edge.arrowTailColor")]],
        ["midTargetArrow", [table("edge.arrowMiddleHead", ARROW_SHAPES, ARROW_SHAPES_NEAREST)]],
        ["midSourceArrow", [table("edge.arrowMiddleTail", ARROW_SHAPES, ARROW_SHAPES_NEAREST)]],
        ["midTargetArrowColor", [id("edge.arrowMiddleHeadColor")]],
        ["midSourceArrowColor", [id("edge.arrowMiddleTailColor")]],
        ["targetArrowImage", [id("edge.arrowHeadImage")]],
        ["sourceArrowImage", [id("edge.arrowTailImage")]],
        ["midTargetArrowImage", [id("edge.arrowMiddleHeadImage")]],
        [
            "arrowSize",
            arrowsSized
                ? []
                : [
                      id("edge.arrowHeadSize"),
                      id("edge.arrowTailSize"),
                      id("edge.arrowMiddleHeadSize"),
                      id("edge.arrowMiddleTailSize"),
                  ],
        ],
        // Drawn only in the writing program's proportions, by the arrow size pass
        ["sourceArrowSize", []],
        ["sourceArrowLength", []],
        ["targetArrowLength", []],
        ["sourceArrowWidth", []],
        ["targetArrowWidth", []],
        ["targetArrowImageWidth", []],
        ["targetArrowImageHeight", []],
        ["sourceArrowImageWidth", []],
        ["sourceArrowImageHeight", []],
        ["midTargetArrowImageWidth", []],
        ["midTargetArrowImageHeight", []],
        ["arrowPosition", [id("edge.arrowHeadPosition"), id("edge.arrowTailPosition")]],
        ["targetArrowGap", [id("edge.arrowHeadGap")]],
        ["sourceArrowGap", [id("edge.arrowTailGap")]],
        ["targetArrowSide", [id("edge.arrowHeadSide")]],
        ["sourceArrowSide", [id("edge.arrowTailSide")]],
        ["curved", [id("edge.curvature")]],
        ["bends", [id("edge.bends")]],
        // Drawn in the scene's units, in proportion to the nodes it spaces the edges by.
        ["fanSpacing", [length("edge.fanSpacing", factors.node * SCENE_PER_UNIT.node)]],
        ["fanned", [id("edge.fanned")]],
        ["bendCurve", [table("edge.bendCurve", BEND_CURVES)]],
        // a multiple of the distance between the nodes: no unit to convert
        ["arcRadius", [id("edge.arcRadius")]],
        // A support point's numbers are the file's, in its own units; the unit says how long one is in the scene.
        [
            "supportModel",
            [
                table("edge.supportModel", SUPPORT_MODELS),
                {
                    channel: "edge.supportUnit",
                    convert: (value) => (typeof value === "string" ? round(factors.scene ?? 1) : null),
                    identity: false,
                },
            ],
        ],
        ["supportSpringLength", [id("edge.supportSpringLength")]],
        ["supportSpringConstant", [id("edge.supportSpringConstant")]],
        ["supportRepulsion", [id("edge.supportRepulsion")]],
        ["supportCentralGravity", [id("edge.supportCentralGravity")]],
        ["supportScale", [table("edge.supportScale", SUPPORT_SCALES)]],
        ["nodeGap", [length("edge.nodeGap", factors.node * SCENE_PER_UNIT.node)]],
        ["sourceNodeGap", [length("edge.sourceNodeGap", factors.node * SCENE_PER_UNIT.node)]],
        ["targetNodeGap", [length("edge.targetNodeGap", factors.node * SCENE_PER_UNIT.node)]],
        ["sourcePort", [id("edge.sourcePort")]],
        ["targetPort", [id("edge.targetPort")]],
        ["label", [id("edge.label")]],
        ["targetLabel", [id("edge.arrowHeadText")]],
        ["sourceLabel", [id("edge.arrowTailText")]],
        // Along the line, in the scene's units, as a node's lengths are.
        ["targetLabelOffset", [length("edge.arrowHeadTextDistance", factors.node * SCENE_PER_UNIT.node)]],
        ["sourceLabelOffset", [length("edge.arrowTailTextDistance", factors.node * SCENE_PER_UNIT.node)]],
        ["targetLabelOffsetX", [length("edge.arrowHeadTextOffsetX", factors.node * SCENE_PER_UNIT.node)]],
        ["targetLabelOffsetY", [length("edge.arrowHeadTextOffsetY", factors.node * SCENE_PER_UNIT.node)]],
        ["sourceLabelOffsetX", [length("edge.arrowTailTextOffsetX", factors.node * SCENE_PER_UNIT.node)]],
        ["sourceLabelOffsetY", [length("edge.arrowTailTextOffsetY", factors.node * SCENE_PER_UNIT.node)]],
        ["targetLabelRotation", [id("edge.arrowHeadTextRotation")]],
        ["sourceLabelRotation", [id("edge.arrowTailTextRotation")]],
        // an end label's own face, where the file gives it one apart from the label's (Graphviz's labelfontsize,
        // labelfontcolor, labelfontname); written after the label's own, so it wins at that end
        ["targetLabelSize", labelSize("edge.arrowHeadTextSize", "edge.arrowHeadTextLetterSize")],
        ["sourceLabelSize", labelSize("edge.arrowTailTextSize", "edge.arrowTailTextLetterSize")],
        ["targetLabelColor", [id("edge.arrowHeadTextColor")]],
        ["sourceLabelColor", [id("edge.arrowTailTextColor")]],
        ["targetLabelFont", [id("edge.arrowHeadTextFont")]],
        ["sourceLabelFont", [id("edge.arrowTailTextFont")]],
        ["labelColor", [label("labelColor"), ...captions("Color")]],
        // Another program draws an edge's end labels in its label's font size (Cytoscape.js, Graphviz); graphty
        // writes its own captions' sizes apart.
        [
            "labelSize",
            [
                ...labelSize("edge.labelSize", "edge.labelLetterSize"),
                ...(graphty
                    ? []
                    : [
                          ...labelSize("edge.arrowHeadTextSize", "edge.arrowHeadTextLetterSize"),
                          ...labelSize("edge.arrowTailTextSize", "edge.arrowTailTextLetterSize"),
                      ]),
            ],
        ],
        ["labelFont", [label("labelFont"), ...captions("Font")]],
        ["labelWeight", [label("labelWeight"), ...captions("Weight")]],
        ["labelTextAlign", [label("labelTextAlign")]],
        ["labelPosition", [location("edge")]],
        ["labelItalic", [label("labelItalic")]],
        // in the scene's units, as a node label's wrap width is
        ["labelWrapWidth", [length("edge.labelWrapWidth", factors.node * SCENE_PER_UNIT.node)]],
        ["labelWrapEllipsis", [id("edge.labelWrapEllipsis")]],
        ["labelWrapAnywhere", [id("edge.labelWrapAnywhere")]],
        ["labelWrapSpaceCount", [id("edge.labelWrapSpaceCount")]],
        ["labelRunAlign", [id("edge.labelRunAlign")]],
        ["labelRotation", [label("labelRotation")]],
        ["labelBackground", [label("labelBackground")]],
        ["labelOutlineColor", [label("labelOutline")]],
        ["labelOutlineWidth", [labelLength("edge.labelOutlineWidth")]],
        ["labelBorderColor", [label("labelBorder")]],
        ["labelBorderWidth", [labelLength("edge.labelBorderWidth", false)]],
        ["labelOpacity", [label("labelOpacity"), ...captions("Opacity")]],
        ["labelBackgroundOpacity", [label("labelBackgroundOpacity")]],
        ["labelOutlineOpacity", [label("labelOutlineOpacity")]],
        ["labelBorderOpacity", [label("labelBorderOpacity")]],
        ["labelPadding", [labelLength("edge.labelPadding", false)]],
        ["labelCornerRadius", [labelLength("edge.labelCornerRadius", false)]],
        ["labelLineHeight", [label("labelLineHeight")]],
        // moved in the scene's units, as a wrap width is
        ["labelOffsetX", [length("edge.labelOffsetX", factors.node * SCENE_PER_UNIT.node)]],
        ["labelOffsetY", [length("edge.labelOffsetY", factors.node * SCENE_PER_UNIT.node)]],
        ["labelShiftX", [label("labelShiftX")]],
        ["labelShiftY", [label("labelShiftY")]],
        ["labelMinScreenSize", [id("edge.labelMinScreenSize")]],
        ["labelOnTop", [id("edge.labelOnTop")]],
    ]);
}

/**
 * A node rule of the writing program's defaults with the corner radius it draws on a rounded
 * rectangle when the file gives none (graph-io's `roundedCornerRadius`, in the file's units), so a
 * 513 x 453 group keeps small corners instead of a quarter of its side. Every other rule, and a
 * file whose program has no such default, is unchanged.
 * @param rule - The rule.
 * @param tool - The program that wrote the file.
 * @returns The rule.
 */
function withCornerCap(rule: StyleRule, tool: StyleTool | null): StyleRule {
    const cap = tool === null ? undefined : toolDefaults(tool)?.roundedCornerRadius?.value;
    if (rule.origin !== "tool" || rule.target !== "node" || cap === undefined || rule.set?.cornerRadius !== undefined) {
        return rule;
    }
    // the key is the translation's own, not a neutral property: no other reader of the rule sees it
    return { ...rule, set: { ...rule.set, [CORNER_CAP]: cap } as StyleRule["set"] };
}

/** The element's curve through bends for each neutral one. */
const BEND_CURVES: ReadonlyMap<string, string> = new Map([
    ["corners", "corners"],
    ["midpoints", "midpoints"],
    ["bezier", "bezier"],
    ["arc", "arc"],
]);

/** The element's support force law for each neutral one. */
const SUPPORT_MODELS: ReadonlyMap<string, string> = new Map([
    ["barnesHut", "barnesHut"],
    ["forceAtlas2", "forceAtlas2"],
]);

/** The element's support scale for each neutral one: a file's own units, or the drawing's. */
const SUPPORT_SCALES: ReadonlyMap<string, string> = new Map([["drawing", "drawing"]]);

/** The element's node gradient kind for each neutral one. */
const NODE_GRADIENT_KINDS: ReadonlyMap<string, string> = new Map([
    ["linear", "linear"],
    ["radial", "radial"],
]);

/** The element's gradient kind for each neutral one. */
const GRADIENT_KINDS: ReadonlyMap<string, string> = new Map([
    ["linear", "linear"],
    ["radial", "radial"],
    ["none", "none"],
]);

/**
 * How deep along its line an element cap of a neutral arrow shape is, as a fraction of its size's
 * length, where it is not the whole length (FilledArrowRenderer: a tee is 0.5 deep).
 */
const CAP_DEPTH: ReadonlyMap<string, number> = new Map([["tee", 0.5]]);

/**
 * How wide an element cap of a neutral arrow shape is across its line, as a fraction of its depth
 * (FilledArrowRenderer). The triangle, the inverted triangle, the vee and the diamond are drawn in
 * the writing program's triangle proportions (`ToolArrowhead.aspect`), the others where the program
 * states theirs.
 */
const CAP_ASPECT: ReadonlyMap<string, number> = new Map([
    ["triangle", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    ["triangle-open", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    ["vee", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    ["inverted", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    ["diamond", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    // the crow's three prongs, as wide as the triangle (FilledArrowRenderer.createCrow)
    ["crow", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    ["diamond-open", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    ["tee", 3],
    ["square", 1],
    ["circle", 1],
    ["circle-open", 1],
    // one arm of a vee, to one side of its line
    ["half", 0.4],
    ["other:half-bottom", 0.4],
    ["other:open-square", 1],
    // a half disc or its arc, twice as wide as it is deep
    ["other:half-circle", 2],
    ["other:open-half-circle", 2],
    ["other:curve", 2],
    ["other:inv-curve", 2],
    ["other:triangle-tee", 0.6],
    ["other:triangle-cross", 0.75],
    ["other:circle-triangle", 0.5],
    // a delta and a bar 1.5 across, 3 long
    ["other:cross-delta", 0.5],
    ["other:cross-open-delta", 0.5],
    ["other:chevron", EDGE_CONSTANTS.NORMAL_ARROW_ASPECT],
    // a picture on a square, stretched to its own width and length
    ["other:image", 1],
]);
const TRIANGLE_PROPORTIONS: ReadonlySet<string> = new Set([
    "triangle",
    "triangle-open",
    "vee",
    // the triangle turned round (Graphviz inv, vis-network inv_triangle)
    "inverted",
    "diamond",
    "diamond-open",
]);

/** One end's arrow values per edge, as the arrow size pass reads them. */
interface ArrowEnd {
    readonly shapes: readonly (StyleValue | null)[];
    /** Its size factor at an edge. */
    readonly size: (i: number) => number;
    /** The edge's source arrow shapes, which some programs size every arrow of an edge by. */
    readonly sources: readonly (StyleValue | null)[];
    /** Its length and width against its shape's, per edge. */
    readonly length: readonly (StyleValue | null)[];
    readonly breadth: readonly (StyleValue | null)[];
    /** An image arrow's size across and along its line, in the program's units, where the file gives it. */
    readonly imageWidth: readonly (StyleValue | null)[];
    readonly imageHeight: readonly (StyleValue | null)[];
}

/**
 * A number of a column, or a fallback.
 * @param values - The column.
 * @param i - The element.
 * @param fallback - The value where it holds none.
 * @returns The number.
 */
function factor(values: readonly (StyleValue | null)[], i: number, fallback = 1): number {
    const value = values[i];
    return typeof value === "number" ? value : fallback;
}

/**
 * The size an image arrow is drawn at, where the file gives one: its width across the line and its
 * height along it, a side the file leaves out taken as the other (a square picture).
 * @param end - The end.
 * @param i - The edge.
 * @returns The size in the program's units, or null for an arrow that is not a sized picture.
 */
function imageSizeOf(end: ArrowEnd, i: number): { width: number; height: number } | null {
    const w = end.imageWidth[i];
    const h = end.imageHeight[i];
    if (end.shapes[i] !== "other:image" || (typeof w !== "number" && typeof h !== "number")) {
        return null;
    }

    const width = typeof w === "number" ? w : (h as number);
    const height = typeof h === "number" ? h : width;
    return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * An edge's source arrow shape, as the program's arrowhead sizing reads it.
 * @param value - The edge's source arrow value.
 * @returns The shape, or undefined where it holds none.
 */
function sourceShapeOf(value: StyleValue | null | undefined): StyleArrowShape | undefined {
    return typeof value === "string" ? (value as StyleArrowShape) : undefined;
}

/**
 * An end's arrow size in the program's proportions, as the element's size factor.
 * @param geometry - How the program sizes its arrowheads.
 * @param scene - Scene units per program unit.
 * @param end - The end.
 * @param width - The edge's line width.
 * @param i - The edge.
 * @returns The size, or null where the element draws no cap.
 */
function arrowLengthOf(geometry: ToolArrowhead, scene: number, end: ArrowEnd, width: number, i: number): number | null {
    const shape = end.shapes[i];
    // An end the element draws no cap at (none, or a shape it has no arrow for) is left unsized.
    if (typeof shape !== "string" || (ARROW_SHAPES.get(shape) ?? "none") === "none") {
        return null;
    }

    // a picture is drawn at the size the file gives it, whatever the arrow size
    const picture = imageSizeOf(end, i);
    const length =
        picture?.height ??
        geometry.length(end.size(i), width, sourceShapeOf(end.sources[i])) *
            (geometry.shapes?.[shape as StyleArrowShape]?.length ?? 1) *
            factor(end.length, i);
    return round((length * scene) / (EDGE_CONSTANTS.DEFAULT_ARROW_LENGTH * (CAP_DEPTH.get(shape) ?? 1)));
}

/**
 * An end's arrow width as a multiple of the element cap's own: the program's caps may be narrower or
 * wider than the element's (Cytoscape's DELTA is half as wide as it is long, the element's 0.8), and
 * one of its arrows narrower or wider than its shape.
 * @param geometry - How the program sizes its arrowheads.
 * @param end - The end.
 * @param i - The edge.
 * @returns The multiple, or null for the cap's own.
 */
function arrowBreadthOf(geometry: ToolArrowhead, end: ArrowEnd, i: number): number | null {
    const picture = imageSizeOf(end, i);
    if (picture !== null) {
        const across = round(picture.width / picture.height);
        return across === 1 ? null : across;
    }

    const shape = end.shapes[i];
    const own = typeof shape === "string" ? CAP_ASPECT.get(shape) : undefined;
    const theirs =
        geometry.shapes?.[shape as StyleArrowShape]?.aspect ??
        (typeof shape === "string" && TRIANGLE_PROPORTIONS.has(shape) ? geometry.aspect : undefined);
    const aspect = own === undefined || theirs === undefined ? 1 : theirs / own;
    const breadth = round((aspect * factor(end.breadth, i)) / factor(end.length, i));
    return breadth === 1 ? null : breadth;
}

/** The properties the element draws nothing for, per kind. */
const NOT_DRAWN: Readonly<Record<StyleTarget, ReadonlySet<string>>> = {
    node: new Set(),
    edge: new Set(["tooltip"]),
};

/** The properties the translation draws in passes of their own, per kind. */
const COMPOSITE: Readonly<Record<StyleTarget, ReadonlySet<string>>> = {
    node: new Set(["width", "height", "fillOpacity", "opacity", "visible", "labelRuns"]),
    edge: new Set(["visible", "labelRuns"]),
};

/**
 * The label markup tags a run's fields are drawn with (the label's own markup: `<bold>`, `<italic>`, `<font>`,
 * `<color>`), each with its value ("" for none).
 * @param run - the run
 * @returns the tags
 */
function runTags(run: Record<string, unknown>): [string, string][] {
    const tags: [string, string][] = [];
    if (run.weight === "bold") {
        tags.push(["bold", ""]);
    }
    if (run.italic === true) {
        tags.push(["italic", ""]);
    }
    if (typeof run.font === "string" && !/['<>]/.test(run.font)) {
        tags.push(["font", run.font]);
    }
    if (typeof run.color === "string" && /^#[0-9a-f]{6}$/i.test(run.color)) {
        tags.push(["color", run.color]);
    }
    return tags;
}

/**
 * A label drawn in runs of styles of their own (the neutral `labelRuns`, a JSON array of runs) as the label markup
 * the element draws: each run's words in the tags of its weight, slant, face and color, every line of a run tagged
 * on its own (the markup does not carry across a line break), and its size and its `shift` (how far below the line it
 * is drawn, in the units of its size) as shares of the label's.
 * @param runs - the runs, as JSON
 * @param size - the label's own size, in the runs' unit, or null when it has none
 * @returns the label with its markup, or null when the runs cannot be read
 */
export function labelRunsMarkup(runs: unknown, size: unknown = null): string | null {
    let parsed: unknown;
    try {
        parsed = typeof runs === "string" ? JSON.parse(runs) : null;
    } catch {
        return null;
    }
    if (!Array.isArray(parsed)) {
        return null;
    }
    return parsed
        .map((run: unknown) => {
            if (typeof run !== "object" || run === null || typeof (run as { text?: unknown }).text !== "string") {
                return "";
            }
            const r = run as Record<string, unknown>;
            const tags = runTags(r);
            // a run's size, and how far below the line it is drawn, as shares of the label's own size
            const share = (v: number): string => `${String(Math.round((v / (size as number)) * 1e4) / 100)}%`;
            if (typeof r.size === "number" && typeof size === "number" && size > 0 && r.size !== size) {
                tags.push(["size", share(r.size)]);
            }
            if (typeof r.shift === "number" && r.shift !== 0 && typeof size === "number" && size > 0) {
                tags.push(["shift", share(r.shift)]);
            }
            const open = tags.map(([tag, v]) => (v === "" ? `<${tag}>` : `<${tag}='${v}'>`)).join("");
            const close = tags
                .map(([tag]) => `</${tag}>`)
                .reverse()
                .join("");
            return (r.text as string)
                .split("\n")
                .map((line) => (line === "" || tags.length === 0 ? line : `${open}${line}${close}`))
                .join("\n");
        })
        .join("");
}

/**
 * A number at 12 significant digits, so a length scaled by a factor compares as the same value
 * however it was computed.
 * @param value - The number.
 * @returns It, rounded.
 */
function round(value: number): number {
    return Number(value.toPrecision(12));
}

/**
 * The median of positive numbers.
 * @param values - The numbers, nulls among them.
 * @returns The median, or null when there is none.
 */
function median(values: readonly unknown[]): number | null {
    const kept = values
        .filter((value): value is number => typeof value === "number" && value > 0)
        .sort((a, b) => a - b);
    if (kept.length === 0) {
        return null;
    }

    const middle = Math.floor(kept.length / 2);
    return kept.length % 2 === 1 ? kept[middle] : (kept[middle - 1] + kept[middle]) / 2;
}

/**
 * Turn a file's styles into layers.
 * @param input - The styles, the graph and the load's choices.
 * @returns The layers, the values they read and what the translation met.
 */
export function translateFileStyles(input: TranslateInput): Translation {
    const { extracted } = input;
    const notes = new Notes();
    for (const note of extracted.styles.notes) {
        notes.keep(note);
    }

    const columns: Record<StyleTarget, Map<string, (FileStyleScalar | null)[]>> = { node: new Map(), edge: new Map() };
    const hidden: Record<StyleTarget, { key: string; count: number } | null> = { node: null, edge: null };
    const byKind: Record<StyleTarget, TranslatedLayer[]> = { node: [], edge: [] };
    const predicted: Record<StyleTarget, ReadonlyMap<Channel, readonly unknown[]> | null> = { node: null, edge: null };
    const factors = lengthFactors(input);
    for (const kind of ["node", "edge"] as const) {
        const translation = new KindTranslation(input, kind, factors, notes, columns[kind]);
        byKind[kind].push(...translation.run());
        hidden[kind] = translation.hidden;
        predicted[kind] = translation.predicted;
    }

    const layers = inRuleOrder(byKind, extracted.styles.rules);

    const { background } = extracted.styles.graph;
    return {
        layers,
        columns,
        hidden,
        background: typeof background === "string" ? background : null,
        notes: notes.list(),
        predicted,
        sceneScale: factors.scene,
    };
}

/**
 * The layers of both kinds in the order of the rules they stand for, across both kinds: an edge rule
 * below a node rule stays below it. Each kind keeps its own order.
 * @param byKind - The layers of each kind, in their order.
 * @param rules - The file's rules, bottom first.
 * @returns The layers, bottom first.
 */
function inRuleOrder(
    byKind: Record<StyleTarget, readonly TranslatedLayer[]>,
    rules: readonly StyleRule[],
): TranslatedLayer[] {
    const at = new Map(rules.map((rule, index) => [`${rule.target}\u0000${rule.id}`, index]));
    // A layer made from no one rule sits where the layer before it does.
    const ranks = (kind: StyleTarget): number[] => {
        let last = -1;
        return byKind[kind].map((layer) => {
            const key = layer.spec.fileStyle?.ruleId;
            last = (typeof key === "string" ? at.get(`${kind}\u0000${key}`) : undefined) ?? last;
            return last;
        });
    };
    const node = ranks("node");
    const edge = ranks("edge");
    const out: TranslatedLayer[] = [];
    let i = 0;
    let j = 0;
    while (i < node.length || j < edge.length) {
        if (j >= edge.length || (i < node.length && node[i] <= edge[j])) {
            out.push(byKind.node[i++]);
        } else {
            out.push(byKind.edge[j++]);
        }
    }

    return out;
}

/**
 * The scene units one unit of each kind of length channel is drawn as in 2D, so every length of a
 * file can be put in one unit.
 */
export const SCENE_PER_UNIT = {
    /** `node.size`, its width and height and `node.borderWidth`: NODE_EXTENT_PER_SIZE (meshes/NodeMesh.ts). */
    node: 1.5,
    /** `edge.width`: a 2D line is `width / 40` scene units wide (meshes/EdgeMesh.ts). */
    edge: 1 / 40,
} as const;

/**
 * How a label is drawn (meshes/RichTextLabel.ts): one line's plane is `sizePx / 48` scene units
 * tall, and the canvas it is drawn on is a line box of LINE x `sizePx` (the line height, 1.2, times
 * the font's ascent and descent, about 1.11 em) plus MARGIN pixels of margin. So the letters are
 * `sizePx^2 / (48 (LINE sizePx + MARGIN))` scene units tall, which is not in proportion to `sizePx`.
 */
const LABEL = { perScene: 48, line: 1.33, margin: 10 } as const;

/** The element's own label size (`sizePx`) when the base styles give none (RichTextStyle's `fontSize`). */
const DEFAULT_LABEL_PX = 48;

/**
 * How tall a label of a `sizePx` draws its letters, in scene units: the inverse of `labelSizePx`.
 * @param sizePx - The label's `sizePx`.
 * @returns The height of its letters (one font size) in the scene.
 */
export function labelLetterHeight(sizePx: number): number {
    return (sizePx * sizePx) / (LABEL.perScene * (LABEL.line * sizePx + LABEL.margin));
}

/**
 * The `sizePx` that draws a label's letters a given height in the scene: the root of
 * `sizePx^2 = perScene * em * (line * sizePx + margin)`.
 * @param em - How tall the letters are to be, in scene units.
 * @returns The size.
 */
function labelSizePx(em: number): number {
    const a = LABEL.perScene * LABEL.line * em;
    return (a + Math.sqrt(a * a + 4 * LABEL.perScene * LABEL.margin * em)) / 2;
}

/** The channels that decide how big a node of a file is drawn. */
const NODE_EXTENT_CHANNELS: readonly Channel[] = ["node.size", "node.shape", "node.width", "node.height"];

/**
 * Make a node layer of another program's file draw every shape at one size the same extent across,
 * as the program drew it (`sizeMode: "uniform"`). The element's own default, "scale",
 * keeps each shape's own proportions (a box of size 1 is 1 across, an octahedron 2.8), which
 * would draw a file's diamond nearly three times the size of its ellipse beside it (#2495).
 *
 * The mode is set, so it reaches every element the layer selects: those its set channels paint,
 * or, for a layer that only binds columns, every element of the load when it selects them all.
 * @param layer - A node layer the translation built.
 * @param scope - The path of the column marking the load's own elements, if any.
 */
function sizeUniformly(layer: Building, scope: Path | null): void {
    const { set, encode, selector } = layer.spec;
    if (!NODE_EXTENT_CHANNELS.some((channel) => channel in set || channel in encode)) {
        return;
    }

    const all = scope !== null && selector.match === "has" && selector.path === scope;
    const setChannels = Object.keys(set) as Channel[];
    set["node.sizeMode"] = "uniform";
    for (const map of [layer.paint, layer.drawn]) {
        if (map === null || map === undefined) {
            continue;
        }

        const columns = [...(all ? [] : setChannels), ...NODE_EXTENT_CHANNELS].map((channel) => map.get(channel));
        const length = columns.find((column) => column !== undefined)?.length;
        if (length !== undefined) {
            map.set(
                "node.sizeMode",
                Array.from({ length }, (_unused, i) =>
                    all || columns.some((column) => column?.[i] !== null && column?.[i] !== undefined)
                        ? "uniform"
                        : null,
                ),
            );
        }
    }
}

/** What the file's lengths are multiplied by, per kind of channel, and the scene units one file unit is. */
interface LengthFactors {
    /** Node sizes, widths, heights and border widths. */
    readonly node: number;
    /** Edge widths. */
    readonly edge: number;
    /**
     * The `sizePx` that draws a label of a file size as tall as the file draws it beside its nodes,
     * of nodes and of edges; null when sizes are kept. Not one factor: a label's letters are not in
     * proportion to its `sizePx` (see LABEL), so each size, and each point of a mapping, is
     * converted on its own.
     */
    readonly label: ((size: number) => number) | null;
    /**
     * The scene units one file unit of label size is drawn as, for `labelLetterSize`: the letters' own height, whatever
     * the font's line height; null when sizes are kept.
     */
    readonly letter: number | null;
    /** The scene units one file unit is drawn as; null when lengths are kept as the file has them. */
    readonly scene: number | null;
}

/** The factors that keep every length as the file has it. */
const KEPT: LengthFactors = { node: 1, edge: 1, label: null, letter: null, scene: null };

/**
 * What the file's lengths are multiplied by: ONE scale for every length (issue #2322), chosen so
 * the file's median node, by its larger side, is drawn at the element's own node size (or, when the file sizes no node,
 * its median edge at the element's edge width), and converted to each channel's unit.
 * @param input - The translation's input.
 * @returns The factors: all 1 when lengths are kept as the file has them.
 */
function lengthFactors(input: TranslateInput): LengthFactors {
    // A file graphty wrote is in graphty's own units already.
    if (input.options.lengths === "file" || input.extracted.styles.source.tool === "graphty") {
        return KEPT;
    }

    const { extracted, snapshot, base } = input;
    const resolved = (kind: StyleTarget, property: StyleProperty): readonly unknown[] =>
        extracted.styles.rules.some(
            (rule) =>
                rule.target === kind && (rule.set?.[property] !== undefined || rule.map?.[property] !== undefined),
        )
            ? resolveStyles(extracted, kind, property, snapshot)
            : [];
    // Each node's larger side, so a file of wide boxes is scaled by their width rather than by a
    // median that falls between the widths and the heights.
    const widths = resolved("node", "width");
    const heights = resolved("node", "height");
    const sides = (widths.length > 0 ? widths : heights).map((_, i) => {
        const sizes = [widths[i], heights[i]].filter((value): value is number => typeof value === "number");
        return sizes.length === 0 ? null : Math.max(...sizes);
    });
    const nodeMedian = median(sides);
    const nodeBase = typeof base.node["node.size"] === "number" ? base.node["node.size"] : 1;
    const edgeBase = typeof base.edge["edge.width"] === "number" ? base.edge["edge.width"] : 1;
    // Nodes sized by their labels alone (vis-network's box, ellipse and circle; Cytoscape.js's width: label) give
    // no side: their median label is drawn at the element's own label size, so such a node comes out about the
    // size of the element's own node with its label, as a file that sizes its nodes does.
    const labelMedian = nodeMedian === null ? median(resolved("node", "labelSize")) : null;
    const labelBase = typeof base.node["node.labelSize"] === "number" ? base.node["node.labelSize"] : DEFAULT_LABEL_PX;
    let scene: number;
    if (nodeMedian !== null) {
        scene = (nodeBase * SCENE_PER_UNIT.node) / nodeMedian;
    } else if (labelMedian !== null && sides.includes(0)) {
        scene = labelLetterHeight(labelBase) / labelMedian;
    } else {
        scene = (edgeBase * SCENE_PER_UNIT.edge) / (median(resolved("edge", "width")) ?? Number.NaN);
    }
    // No length to scale by, or a degenerate median (1e-320, 1e308): the file's units are kept.
    if (!(Number.isFinite(scene) && scene > 0)) {
        return KEPT;
    }

    // Labels in canvas px over fitted positions are that many px per unit of the positions.
    const perLabelUnit = scene / (input.labelPxPerUnit ?? 1);
    return {
        node: scene / SCENE_PER_UNIT.node,
        edge: scene / SCENE_PER_UNIT.edge,
        label: (size) => labelSizePx(perLabelUnit * size),
        letter: perLabelUnit,
        scene,
    };
}

/** The translation of one kind's rules. */
class KindTranslation {
    readonly #input: TranslateInput;
    readonly #kind: StyleTarget;
    readonly #notes: Notes;
    /** Per code and property, the elements a conversion note already counted, so an element counts once. */
    readonly #counted = new Map<string, Set<number>>();
    readonly #columns: Map<string, (FileStyleScalar | null)[]>;
    readonly #factor: number;
    /** How the writing program sizes its arrowheads, when they are drawn in its proportions; else null. */
    readonly #arrowhead: { readonly geometry: ToolArrowhead; readonly scene: number } | null;
    readonly #n: number;
    readonly #rules: readonly StyleRule[];
    readonly #plans: ReadonlyMap<string, readonly ChannelPlan[]>;
    readonly #built: Building[] = [];
    readonly #keys: Set<string>;
    readonly #matchCache = new Map<string, readonly boolean[]>();
    /** The layers rebuilt from layers graphty wrote, by the rule they stand for. */
    readonly #rebuilt = new Map<StyleRule, Building>();
    /** The kind a layer graphty wrote had, by rule id, where its rule is drawn by the neutral rule. */
    readonly #kinds = new Map<string, LayerKind>();
    #scopeKey: string | null = null;
    /** The path of the column marking the load's own elements, once a layer is scoped to it. */
    #scopePath: Path | null = null;
    /** The column marking the elements the file hides, once the visibility pass has run. */
    hidden: { key: string; count: number } | null = null;
    /** The `data.` paths the reader put a column of the file at; undefined until first asked. */
    #heldPaths: ReadonlySet<string> | undefined = undefined;
    /** The `data.` paths whose column any rule of this kind reads from graph-io's copy; undefined until first asked. */
    #copiedPaths: ReadonlySet<string> | undefined = undefined;
    /** What the layers paint, once `run()` has run; null when a rebuilt layer's painting is unknown. */
    predicted: ReadonlyMap<Channel, readonly unknown[]> | null = null;

    /**
     * Set up the translation of one kind.
     * @param input - The translation's input.
     * @param kind - The kind translated.
     * @param factors - What the file's lengths are multiplied by.
     * @param notes - Where notes go.
     * @param columns - Where the values the layers read go.
     */
    constructor(
        input: TranslateInput,
        kind: StyleTarget,
        factors: LengthFactors,
        notes: Notes,
        columns: Map<string, (FileStyleScalar | null)[]>,
    ) {
        this.#input = input;
        this.#kind = kind;
        this.#factor = factors[kind];
        this.#notes = notes;
        this.#columns = columns;
        this.#n = kind === "node" ? input.snapshot.nodeCount : input.snapshot.edgeCount;
        const { tool } = input.extracted.styles.source;
        const geometry = tool === null || kind !== "edge" ? undefined : toolDefaults(tool)?.arrowhead;
        this.#arrowhead = geometry === undefined || factors.scene === null ? null : { geometry, scene: factors.scene };
        this.#plans = channelPlans(
            kind,
            factors,
            input.options.shapes ?? FILE_STYLE_SHAPES,
            tool === "graphty",
            this.#arrowhead !== null,
            tool !== null && toolDefaults(tool)?.nodeBorderOnScreen?.value === true,
        );
        this.#keys = new Set(input.extracted.columns[kind].keys());
        this.#rules = input.extracted.styles.rules
            .filter((rule) => rule.target === kind && (input.options.toolDefaults !== false || rule.origin !== "tool"))
            .map((rule) => withCornerCap(rule, input.extracted.styles.source.tool));
    }

    /**
     * Translate, fold to the bound and return the layers.
     * @returns The layers, bottom first.
     */
    run(): TranslatedLayer[] {
        this.#rules.forEach((rule, bucket) => {
            this.#rule(rule, bucket);
        });
        this.#composites();
        this.#visibility();
        this.#nesting();
        this.#drawOrder();

        const ordered = [...this.#built].filter(
            (layer) => Object.keys(layer.spec.set).length + Object.keys(layer.spec.encode).length > 0,
        );
        // Stable by bucket: a later pass's layer of rule i still sits below every layer of rule i+1.
        ordered.sort((a, b) => a.bucket - b.bucket);
        if (this.#kind === "node" && this.#input.extracted.styles.source.tool !== "graphty") {
            ordered.forEach((layer) => {
                sizeUniformly(layer, this.#scopePath);
            });
        }

        const { layers, folded } = foldToCap(ordered, this.#n, (run, paint) => this.#folded(run, paint));
        if (folded > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.LAYERS_FOLDED, this.#kind, null, folded);
        }

        this.predicted = this.#predict(layers as readonly Building[]);
        return layers.map((layer) => {
            const { spec } = layer;
            const out: Record<string, unknown> = { ...spec };
            if (spec.set !== undefined && Object.keys(spec.set).length === 0) {
                delete out.set;
            }

            if (spec.encode !== undefined && Object.keys(spec.encode).length === 0) {
                delete out.encode;
            }

            const { fallback } = layer as Building;
            return { spec: out as unknown as LayerSpec, ...(fallback === undefined ? {} : { fallback }) };
        });
    }

    /**
     * What a stack of layers paints per channel and element: the topmost layer that paints wins,
     * and a label's fields merge into its label style, field by field, as the repaint stacks them.
     * @param layers - The layers, bottom first.
     * @returns The values, or null when a layer's painting is unknown.
     */
    #predict(layers: readonly Building[]): Map<Channel, unknown[]> | null {
        const out = new Map<Channel, unknown[]>();
        const column = (channel: Channel): unknown[] => {
            let held = out.get(channel);
            if (held === undefined) {
                held = new Array<unknown>(this.#n).fill(null);
                out.set(channel, held);
            }

            return held;
        };
        for (const layer of layers) {
            const drawn = layer.drawn ?? layer.paint;
            if (drawn === null || drawn === undefined) {
                return null;
            }

            for (const [channel, values] of drawn) {
                const field = labelFieldOf(channel);
                const into = field?.into ?? channel;
                const whole = field === undefined && channelDescriptor(channel)?.accepts === "labelStyle";
                const held = column(into);
                values.forEach((value, i) => {
                    if (value === null || value === undefined) {
                        return;
                    }

                    if (field !== undefined) {
                        held[i] = mergeLabelStyle(held[i], labelPatchOf(field.field, value));
                    } else if (whole) {
                        held[i] = mergeLabelStyle(held[i], value);
                    } else {
                        held[i] = value;
                    }
                });
            }
        }

        return out;
    }

    // -----------------------------------------------------------------------------------------
    // Columns and paths
    // -----------------------------------------------------------------------------------------

    /**
     * A key no column of the load holds yet.
     * @param base - What the key says.
     * @returns The key, `el.<base>` with a number after it when that is taken.
     */
    #freshKey(base: string): string {
        let key = `el.${base}`;
        let n = 2;
        while (this.#keys.has(key)) {
            key = `el.${base}.${String(n)}`;
            n++;
        }

        this.#keys.add(key);
        return key;
    }

    /**
     * Keep a column of values and give the path a layer reads it at.
     * @param key - The key.
     * @param values - The values by element index.
     * @returns The path.
     */
    #keep(key: string, values: readonly unknown[]): Path {
        if (!this.#columns.has(key)) {
            this.#columns.set(
                key,
                Array.from({ length: this.#n }, (_unused, i) => {
                    const value = values[i];
                    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                        ? value
                        : null;
                }),
            );
        }

        return fileStylePath(this.#input.namespace, this.#kind, key);
    }

    /**
     * Keep values under a new key.
     * @param base - What the key says.
     * @param values - The values by element index.
     * @returns The path.
     */
    #keepNew(base: string, values: readonly unknown[]): Path {
        return this.#keep(this.#freshKey(base), values);
    }

    /**
     * The values of a column reference, by element index, as graph-io reads them.
     * @param ref - The reference.
     * @param source - The styles the reference belongs to.
     * @returns The values, or null when nothing holds the column.
     */
    #values(ref: ColumnRef, source: ExtractedStyles): readonly unknown[] | null {
        const { snapshot } = this.#input;
        if ("style" in ref) {
            return source.columns[this.#kind].get(ref.style) ?? null;
        }

        if ("computed" in ref) {
            if (this.#kind !== "node") {
                return null;
            }

            if (ref.computed === "indegree") {
                return Array.from(snapshot.inDegree());
            }

            return Array.from(ref.computed === "outdegree" ? snapshot.outDegree() : snapshot.degree());
        }

        if (!("data" in ref)) {
            return null;
        }

        const table = this.#kind === "node" ? snapshot.nodes : snapshot.edges;
        if (!table.has(ref.data)) {
            return null;
        }

        return Array.from({ length: this.#n }, (_unused, i) => plain(table.value(ref.data, i)));
    }

    /**
     * The path a layer reads a column reference at, exactly as graph-io reads it.
     * @param ref - The reference.
     * @param source - The styles the reference belongs to.
     * @param tag - What a copied column's key says.
     * @returns The path, or null when the column holds nothing.
     */
    #pathOf(ref: ColumnRef, source: ExtractedStyles, tag: string): Path | null {
        if ("style" in ref) {
            const values = source.columns[this.#kind].get(ref.style);
            if (values === undefined) {
                return null;
            }

            return source === this.#input.extracted
                ? this.#keep(ref.style, values)
                : this.#keepNew(`${tag}.${ref.style}`, values);
        }

        if ("computed" in ref) {
            return this.#kind === "node" ? computedPath(ref.computed) : null;
        }

        if (!("data" in ref)) {
            return null;
        }

        const path = this.#input.dataPath(this.#kind, ref.data);
        if (path !== null) {
            return path;
        }

        // The reader left the column out, nested it or changed it: its values, kept per element.
        const values = this.#values(ref, source);
        return values === null ? null : this.#keepNew(`data.${String(this.#columns.size)}`, values);
    }

    // -----------------------------------------------------------------------------------------
    // Selectors
    // -----------------------------------------------------------------------------------------

    /**
     * Which elements a predicate matches, as graph-io reads it.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @returns Per element, whether it matches.
     */
    #matches(where: Predicate, source: ExtractedStyles): readonly boolean[] {
        const key = `${source === this.#input.extracted ? "" : "sub:"}${JSON.stringify(where)}`;
        const held = this.#matchCache.get(key);
        if (held !== undefined) {
            return held;
        }

        const out = matchPredicate(source, this.#kind, where, this.#input.snapshot);
        this.#matchCache.set(key, out);
        return out;
    }

    /**
     * The selector of a predicate: short, and exactly what graph-io matches, or a membership
     * value written onto the elements.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @param id - The rule, for the membership key.
     * @returns The selector.
     */
    #selectorOf(where: Predicate, source: ExtractedStyles, id: string): Selector {
        if ("all" in where && where.all) {
            return this.#scoped({ match: "everything" });
        }

        const match = this.#matches(where, source);
        if (termsOf(where) <= MAX_TERMS) {
            const built = this.#expression(where, source);
            if (built?.test.every((value, i) => value === match[i])) {
                return this.#scoped(built.selector);
            }
        }

        const path = this.#keepNew(
            `where.${id}`,
            match.map((value) => (value ? true : null)),
        );
        return this.#scoped({ match: "has", path });
    }

    /**
     * A predicate as the element's expression language, with what that expression matches.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @returns The selector and its matches, or null when the predicate cannot be written.
     */
    #expression(where: Predicate, source: ExtractedStyles): { selector: Selector; test: boolean[] } | null {
        if ("has" in where && !("data" in where.has)) {
            const path = this.#pathOf(where.has, source, "has");
            const values = this.#values(where.has, source);
            if (path === null || values === null) {
                return null;
            }

            return {
                selector: { match: "has", path },
                test: values.map((value) => value !== null && value !== undefined),
            };
        }

        const built = this.#clause(where, source);
        return built === null ? null : { selector: { match: "expression", where: built.text }, test: built.test };
    }

    /**
     * One clause of an expression and what it matches per element.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @returns The text and the matches, or null.
     */
    #clause(where: Predicate, source: ExtractedStyles): { text: string; test: boolean[] } | null {
        const read = (ref: ColumnRef): { path: string; values: readonly unknown[] } | null => {
            const path = this.#pathOf(ref, source, "where");
            const values = this.#values(ref, source);
            return path === null || values === null ? null : { path: quotePath(path), values };
        };

        if ("has" in where) {
            const column = read(where.has);
            return column === null
                ? null
                : {
                      text: `(${column.path} != \`null\` && ${column.path} != \`false\`)`,
                      test: column.values.map((value) => value !== null && value !== undefined && value !== false),
                  };
        }

        if ("eq" in where) {
            const column = read(where.eq[0]);
            const wanted = where.eq[1];
            return column === null
                ? null
                : {
                      text: `${column.path} == ${literal(wanted)}`,
                      test: column.values.map((value) => value === wanted),
                  };
        }

        if ("in" in where) {
            const column = read(where.in[0]);
            const wanted = where.in[1];
            if (column === null || wanted.length === 0) {
                return null;
            }

            const tests = wanted.map((value) => `${column.path} == ${literal(value)}`);
            return {
                text: `(${tests.join(" || ")})`,
                test: column.values.map((value) => (wanted as readonly unknown[]).includes(value)),
            };
        }

        if ("not" in where) {
            const inner = this.#clause(where.not, source);
            return inner === null ? null : { text: `!(${inner.text})`, test: inner.test.map((value) => !value) };
        }

        const list = listOf(where);
        if (!Array.isArray(list) || list.length === 0) {
            return null;
        }

        const parts = list.map((inner: Predicate) => this.#clause(inner, source));
        if (parts.includes(null)) {
            return null;
        }

        const kept = parts as { text: string; test: boolean[] }[];
        const all = "and" in where;
        return {
            text: `(${kept.map((part) => part.text).join(all ? " && " : " || ")})`,
            test: Array.from({ length: this.#n }, (_unused, i) =>
                all ? kept.every((part) => part.test[i]) : kept.some((part) => part.test[i]),
            ),
        };
    }

    /**
     * A selector narrowed to the load's own elements, so a file's layers never paint the elements
     * of another file loaded beside it, or ones added by hand.
     * @param selector - The selector.
     * @returns It and the load's membership.
     */
    #scoped(selector: Selector): Selector {
        this.#scopeKey ??= this.#freshKey("load");
        const scope = this.#keep(this.#scopeKey, new Array<boolean>(this.#n).fill(true));
        this.#scopePath = scope;
        if (selector.match === "everything") {
            return { match: "has", path: scope };
        }

        let inner: string;
        if (selector.match === "has") {
            inner = `${quotePath(selector.path)} != \`null\``;
        } else if (selector.match === "expression") {
            inner = selector.where;
        } else {
            return selector;
        }

        return { match: "expression", where: `(${inner}) && ${quotePath(scope)} != \`null\`` };
    }

    // -----------------------------------------------------------------------------------------
    // Rules
    // -----------------------------------------------------------------------------------------

    /**
     * The layer of a rule in a bucket, made on first use.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     * @param selector - What the layer selects.
     * @param ends - Whether it is the rule's layer of end label faces (`END_LABEL_FACE`).
     * @returns The layer.
     */
    #layerFor(rule: StyleRule, bucket: number, selector: Selector, ends = false): Building {
        const key = JSON.stringify(selector);
        // A layer rebuilt from one graphty wrote is never painted into by a later pass.
        const same = this.#built.filter(
            (layer) =>
                layer.bucket === bucket &&
                layer.spec.fileStyle?.ruleId === rule.id &&
                this.#rebuilt.get(rule) !== layer,
        );
        const found = same.find(
            (layer) => JSON.stringify(layer.spec.selector) === key && (layer.ends ?? false) === ends,
        );
        if (found !== undefined) {
            return found;
        }

        const kind = this.#kinds.get(rule.id) ?? layerKindOf(rule);
        const origin: FileStyleOrigin = {
            format: this.#input.format,
            importId: this.#input.importId,
            ruleId: rule.id,
            role: rule.role,
            origin: rule.origin,
            ...factsOf(rule),
        };
        const layer: Building = {
            bucket,
            spec: {
                name: same.length === 0 ? rule.id : `${rule.id}#${String(same.length + 1)}`,
                target: this.#kind,
                kind,
                selector,
                set: {},
                encode: {},
                fileStyle: origin,
            },
            paint: new Map(),
            worth: kind === "custom" ? 0 : 1000,
            ...(ends ? { ends: true as const } : {}),
        };
        this.#built.push(layer);
        return layer;
    }

    /**
     * Translate one rule of the file.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     */
    #rule(rule: StyleRule, bucket: number): void {
        const spec = this.#rebuiltSpec(rule);
        const neutral = (): void => {
            this.#neutralRule(rule, bucket, this.#input.extracted);
        };
        if (spec === null) {
            neutral();
            return;
        }

        // The neutral layers of the rule, kept beside the rebuilt one for when the element refuses it.
        const before = this.#built.length;
        neutral();
        const made = this.#built.splice(before);
        const origin: FileStyleOrigin = {
            format: this.#input.format,
            importId: this.#input.importId,
            ruleId: rule.id,
            role: rule.role,
            origin: rule.origin,
            ...factsOf(rule),
        };
        const rebuilt: Building = {
            bucket,
            spec: {
                ...spec,
                set: { ...spec.set },
                encode: { ...spec.encode },
                fileStyle: origin,
            },
            paint: null,
            worth: 1000,
            fallback: made.map((layer) => layer.spec),
        };
        this.#built.push(rebuilt);
        this.#rebuilt.set(rule, rebuilt);
    }

    /**
     * Emit a rule's layers in a later pass. For a rule rebuilt from a layer graphty wrote, they are
     * kept as that layer's fallback, never drawn beside it.
     * @param rule - The rule.
     * @param emit - What emits them.
     */
    #emitFor(rule: StyleRule, emit: () => void): void {
        const rebuilt = this.#rebuilt.get(rule);
        const before = this.#built.length;
        emit();
        if (rebuilt !== undefined) {
            const made = this.#built.splice(before);
            rebuilt.fallback = [...(rebuilt.fallback ?? []), ...made.map((layer) => layer.spec)];
        }
    }

    /**
     * The layer graphty wrote into the file for a rule, rebuilt into this load: its file-style
     * paths moved into this load's namespace and its selector scoped to the load. Null, with a
     * note, when there is none or it cannot be used as it stands.
     * @param rule - The rule.
     * @returns The layer, or null for the neutral rule.
     */
    #rebuiltSpec(rule: StyleRule): LayerSpec | null {
        const raw = rule.ext?.[LAYER_SPEC_EXT];
        if (raw === undefined) {
            return null;
        }

        const ignored = (reason: string): null => {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.LAYER_SPEC_IGNORED, this.#kind, rule.id, 1, undefined, reason);
            return null;
        };
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return ignored("INVALID");
        }

        const given = raw as Partial<LayerSpec>;
        const { selector } = given;
        if (
            typeof selector !== "object" ||
            selector === null ||
            (given.target !== undefined && given.target !== this.#kind)
        ) {
            return ignored("INVALID");
        }

        const held = this.#input.extracted.columns[this.#kind];
        let missing = false;
        const move = (path: unknown): unknown => {
            if (typeof path !== "string" || !isFileStylePath(path)) {
                return path;
            }

            const parts = parseFileStylePath(path);
            const values = parts?.kind === this.#kind ? held.get(parts.key) : undefined;
            if (parts === undefined || values === undefined) {
                missing = true;
                return path;
            }

            return this.#keep(parts.key, values);
        };
        const moved = this.#movedSelector(selector, move, () => (missing = true));
        if (moved === "MEMBERS") {
            // The file's membership values select instead, as the same kind.
            if (given.kind === "encoding" || given.kind === "highlight" || given.kind === "custom") {
                this.#kinds.set(rule.id, given.kind);
            }

            return ignored("SELECTOR");
        }

        if (typeof moved === "string") {
            return ignored(moved);
        }

        const encode = Object.fromEntries(
            Object.entries(given.encode ?? {}).map(([channel, binding]) => [
                channel,
                typeof binding === "object" && binding !== null && "by" in binding
                    ? { ...binding, by: move(binding.by) }
                    : binding,
            ]),
        );

        if (missing || !this.#readsHeldData(given)) {
            return ignored("PATH");
        }

        return {
            name: typeof given.name === "string" ? given.name : rule.id,
            target: this.#kind,
            ...(given.kind === undefined ? {} : { kind: given.kind }),
            selector: this.#scoped(moved),
            ...(given.set === undefined ? {} : { set: given.set }),
            ...(given.encode === undefined ? {} : { encode: encode as LayerSpec["encode"] }),
            ...(given.userData === undefined ? {} : { userData: given.userData }),
        };
    }

    /**
     * A layer's selector with its file-style paths moved into this load's namespace. A few node ids stay a selector
     * by id; edge ids, more ids and a set's members do not reach this load, so the file's membership values select
     * instead.
     * @param selector - The selector graphty wrote.
     * @param move - Moves one path.
     * @param missing - Called for a path naming a value the file does not hold.
     * @returns The selector; "MEMBERS" when membership values select instead; else the reason it cannot be used.
     */
    #movedSelector(
        selector: Selector,
        move: (path: unknown) => unknown,
        missing: () => void,
    ): Selector | "MEMBERS" | "SELECTOR" | "SELECTOR_TERMS" {
        switch (selector.match) {
            case "ids": {
                const ids = selector.nodes;
                const few = selector.edges === undefined && ids !== undefined && ids.length <= MAX_TERMS;
                return few ? selector : "MEMBERS";
            }
            case "member":
                return "MEMBERS";
            case "has":
            case "top":
                return { ...selector, path: move(selector.path) as Path };
            case "expression":
                if (typeof selector.where !== "string" || expressionTerms(selector.where) > MAX_TERMS) {
                    return "SELECTOR_TERMS";
                }

                return { match: "expression", where: this.#moveExpression(selector.where, missing) };
            case "everything":
                return selector;
            default:
                return "SELECTOR";
        }
    }

    /**
     * Whether every data column a layer graphty wrote reads is where this load's reader put it: a
     * reader that nests a column (a graphology attribute arrives under `attributes`) or leaves it
     * out gives the layer nothing at the path it names, so the neutral rule is drawn instead.
     * @param spec - The layer.
     * @returns True when each `data.` path it reads is where the reader put a column of the file.
     */
    #readsHeldData(spec: Partial<LayerSpec>): boolean {
        const paths = pathsRead(spec);
        if (paths === null) {
            return false;
        }

        if (this.#heldPaths === undefined) {
            const table = this.#kind === "node" ? this.#input.snapshot.nodes : this.#input.snapshot.edges;
            this.#heldPaths = new Set(
                table.names().flatMap((column) => this.#input.dataPath(this.#kind, column) ?? []),
            );
        }

        // A column the format could not keep is read by the rules from the copy graph-io writes beside
        // the block (`input.data.<column>`, `input.<property>.data.<column>`): what the file holds in
        // the column itself is not what was written, so no layer reading it is rebuilt, whichever
        // rule of the block carries the copy.
        this.#copiedPaths ??= this.#copiedPathsOf();
        const copied = this.#copiedPaths;
        const held = this.#heldPaths;
        return paths.filter((path) => path.startsWith("data.")).every((path) => held.has(path) && !copied.has(path));
    }

    /**
     * The data paths of the columns the block's rules read from graph-io's copies.
     * @returns The paths.
     */
    #copiedPathsOf(): Set<string> {
        const copied = new Set<string>();
        for (const each of this.#input.extracted.styles.rules.filter((rule) => rule.target === this.#kind)) {
            const { ext: _ext, ...neutral } = each;
            JSON.stringify(neutral, (_key, value: unknown) => {
                const path = this.#carriedPath(value);
                if (path !== null) {
                    copied.add(path);
                }

                return value;
            });
        }

        return copied;
    }

    /**
     * The data path of the column a style column reference copies, if it is one of graph-io's copies.
     * @param value - A value of a rule.
     * @returns The path, or null.
     */
    #carriedPath(value: unknown): string | null {
        if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).length !== 1) {
            return null;
        }

        const { style } = value as { style?: unknown };
        const column = typeof style === "string" ? CARRIED_INPUT.exec(style)?.[1] : undefined;
        return column === undefined ? null : this.#input.dataPath(this.#kind, column);
    }

    /**
     * An expression with every file-style path moved into this load's namespace.
     * @param where - The expression.
     * @param missing - Called for a path naming a value the file does not hold.
     * @returns The expression.
     */
    #moveExpression(where: string, missing: () => void): string {
        const held = this.#input.extracted.columns[this.#kind];
        // A path is `graphty.style.<namespace>.<kind>.<key>`, each segment bare or a quoted name.
        const segment = String.raw`(?:"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_]*|\d+)`;
        const pattern = new RegExp(String.raw`graphty\.style\.${segment}\.(node|edge)((?:\.${segment})+)`, "g");
        return where.replaceAll(pattern, (whole: string, kind: string, rest: string) => {
            const key = splitSegments(rest.slice(1))?.join(".");
            const values = kind === this.#kind && key !== undefined ? held.get(key) : undefined;
            if (values === undefined) {
                missing();
                return whole;
            }

            return quotePath(this.#keep(key as string, values));
        });
    }

    /**
     * Translate a rule into neutral layers.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     * @param source - The styles it belongs to.
     * @param only - The properties to translate, every one when absent.
     */
    #neutralRule(rule: StyleRule, bucket: number, source: ExtractedStyles, only?: ReadonlySet<string>): void {
        // an end label's own face last, so its layer is made over the rule's own
        const props = [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})].sort(
            (a, b) => Number(END_LABEL_FACE.has(a)) - Number(END_LABEL_FACE.has(b)),
        );
        for (const property of props) {
            if (only !== undefined ? !only.has(property) : COMPOSITE[this.#kind].has(property)) {
                continue;
            }

            if (NOT_DRAWN[this.#kind].has(property)) {
                this.#noteNotDrawn(rule, property, source);
                continue;
            }

            for (const plan of this.#plansOf(property)) {
                if (!this.#drawnByBase(rule, property, plan)) {
                    this.#emit(rule, bucket, property, plan, source);
                }
            }
        }
    }

    /**
     * Whether a default graphty recorded in a file it wrote is what the element's own base layers
     * already draw, so it needs no layer.
     * @param rule - The rule.
     * @param property - The property.
     * @param plan - The channel it is drawn on.
     * @returns True for a graphty default the base layers draw.
     */
    #drawnByBase(rule: StyleRule, property: string, plan: ChannelPlan): boolean {
        const set = rule.set?.[property as StyleProperty];
        return (
            rule.origin === "tool" &&
            this.#input.extracted.styles.source.tool === "graphty" &&
            set !== undefined &&
            same(
                drawnAs(plan.channel, plan.convert(set)),
                drawnAs(plan.channel, this.#input.base[this.#kind][plan.channel]),
            )
        );
    }

    /**
     * The channels a property is drawn on: its plan, or the channel a `graphty:` property names.
     * @param property - The property.
     * @returns The plans; empty for a property the element has no channel for.
     */
    #plansOf(property: string): readonly ChannelPlan[] {
        const plans = this.#plans.get(property);
        if (plans !== undefined) {
            return plans;
        }

        if (property.startsWith("graphty:")) {
            const channel = property.slice("graphty:".length) as Channel;
            const descriptor = channelDescriptor(channel);
            if (
                descriptor?.target === this.#kind &&
                descriptor.accepts !== "labelStyle" &&
                descriptor.accepts !== "nothing"
            ) {
                return [{ channel, convert: (value) => value, identity: true }];
            }
        }

        this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.NOT_UNDERSTOOD, this.#kind, property, 1);
        return [];
    }

    /**
     * Note a property the element does not draw, with how many elements the file gives it on.
     * @param rule - The rule.
     * @param property - The property.
     * @param source - The styles the rule belongs to.
     */
    #noteNotDrawn(rule: StyleRule, property: string, source: ExtractedStyles): void {
        const values = this.#evaluate(rule, property, source);
        const count = values.filter((value) => value !== null).length;
        if (count > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.NOT_DRAWN, this.#kind, property, count);
        }
    }

    /**
     * What one rule gives each element for one property, as graph-io reads it: the rule's value
     * where its predicate matches and its mapping gives one, null elsewhere.
     * @param rule - The rule.
     * @param property - The property.
     * @param source - The styles the rule belongs to.
     * @returns The values by element index.
     */
    #evaluate(rule: StyleRule, property: string, source: ExtractedStyles): readonly (StyleValue | null)[] {
        const one: StyleRule = {
            id: rule.id,
            target: this.#kind,
            role: rule.role,
            origin: rule.origin,
            where: rule.where,
            ...(rule.set?.[property as StyleProperty] === undefined
                ? {}
                : { set: { [property]: rule.set[property as StyleProperty] } }),
            ...(rule.map?.[property as StyleProperty] === undefined
                ? {}
                : { map: { [property]: rule.map[property as StyleProperty] } }),
        };
        return resolveStyles(
            { ...source, styles: { ...source.styles, rules: [one] } },
            this.#kind,
            property as StyleProperty,
            this.#input.snapshot,
        );
    }

    /**
     * What a channel draws for one rule's values: each value converted, except that a curved
     * conversion of a continuous mapping is drawn between its converted points.
     * @param rule - The rule.
     * @param property - The property.
     * @param plan - The channel and how values become its values.
     * @param truth - The rule's values by element.
     * @param source - The styles the rule belongs to.
     * @returns The drawn values by element.
     */
    #drawnOf(
        rule: StyleRule,
        property: string,
        plan: ChannelPlan,
        truth: readonly (StyleValue | null)[],
        source: ExtractedStyles,
    ): readonly unknown[] {
        const mapping = rule.map?.[property as StyleProperty];
        if (plan.curved !== true || mapping?.kind !== "continuous") {
            return truth.map((value) => (value === null ? null : plan.convert(value)));
        }

        const convert = (value: StyleValue): StyleValue => {
            const converted = plan.convert(value);
            return typeof converted === "number" ? converted : value;
        };
        const points = mapping.points.map((point) => ({
            ...point,
            below: convert(point.below),
            value: convert(point.value),
            above: convert(point.above),
        }));
        const { set: _set, ...rest } = rule;
        return this.#evaluate({ ...rest, map: { [property]: { ...mapping, points } } }, property, source);
    }

    /**
     * Emit one property of one rule on one channel.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     * @param property - The property.
     * @param plan - The channel and how values become its values.
     * @param source - The styles the rule belongs to.
     */
    #emit(rule: StyleRule, bucket: number, property: string, plan: ChannelPlan, source: ExtractedStyles): void {
        const truth = this.#evaluate(rule, property, source);
        const drawn = this.#drawnOf(rule, property, plan, truth, source);
        this.#noteConversion(property, plan, truth, drawn);
        if (!drawn.some((value) => value !== null)) {
            // A rule that gives no value and selects nothing in this graph says nothing; one that selects
            // elements reads a column the file does not hold.
            const empty = !truth.some((value) => value !== null);
            if (empty && this.#matches(rule.where, source).some(Boolean)) {
                this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.COLUMN_ABSENT, this.#kind, rule.id, 1, property);
            }

            return;
        }

        const selector = this.#selectorOf(rule.where, source, rule.id);
        const layer = this.#layerFor(rule, bucket, selector, END_LABEL_FACE.has(property));
        recordPaint(layer, plan.channel, drawn);
        const set = rule.set?.[property as StyleProperty];
        if (set !== undefined) {
            const value = plan.convert(set);
            if (value !== null) {
                layer.spec.set[plan.channel] = value;
                return;
            }
        }

        const mapping = rule.map?.[property as StyleProperty];
        const binding = mapping === undefined ? null : this.#binding(mapping, plan, truth, drawn, source, rule);
        if (binding !== null) {
            layer.spec.encode[plan.channel] = binding.binding;
            layer.worth += binding.worth;
            setFacts(layer, binding.facts);
            return;
        }

        // Nothing shorter is exact: the rule's values, kept per element.
        const path = this.#keepNew(`${property}.${rule.id}`, drawn);
        layer.spec.encode[plan.channel] = { by: path, scale: "passthrough" };
        layer.worth = 0;
        setFacts(layer, {
            column: path,
            mapping: "passthrough",
            distinctValues: new Set(drawn.filter((value) => value !== null)).size,
        });
    }

    /**
     * Note what a channel draws differently from the file: values with no counterpart, and
     * values drawn as the nearest one.
     * @param property - The property.
     * @param plan - The channel.
     * @param truth - The file's values.
     * @param drawn - The channel's values.
     */
    #noteConversion(
        property: string,
        plan: ChannelPlan,
        truth: readonly (StyleValue | null)[],
        drawn: readonly unknown[],
    ): void {
        let none = 0;
        let nearest = 0;
        let sample: string | undefined;
        // Several rules can give one element a value for the property; the element counts once.
        const first = (code: string, i: number): boolean => {
            const key = `${code}\u0000${property}`;
            let seen = this.#counted.get(key);
            if (seen === undefined) {
                seen = new Set();
                this.#counted.set(key, seen);
            }

            if (seen.has(i)) {
                return false;
            }

            seen.add(i);
            return true;
        };
        truth.forEach((value, i) => {
            if (value === null) {
                return;
            }

            if (drawn[i] === null || drawnAs(plan.channel, drawn[i]) === null) {
                if (first("none", i)) {
                    none++;
                }

                sample ??= String(value);
            } else if (plan.nearest?.(value) === true && first("nearest", i)) {
                nearest++;
            }
        });
        if (none > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.NO_COUNTERPART, this.#kind, property, none, sample);
        }

        if (nearest > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.DRAWN_NEAREST, this.#kind, property, nearest);
        }
    }

    /**
     * The binding of a mapping, when one draws exactly what the rule gives every element.
     * @param mapping - The mapping.
     * @param plan - The channel.
     * @param truth - The rule's values per element.
     * @param drawn - The channel's values per element.
     * @param source - The styles the rule belongs to.
     * @param rule - The rule, for its facts.
     * @returns The binding, how readable it is and its facts, or null.
     */
    #binding(
        mapping: Mapping,
        plan: ChannelPlan,
        truth: readonly (StyleValue | null)[],
        drawn: readonly unknown[],
        source: ExtractedStyles,
        rule: StyleRule,
    ): { binding: Binding; worth: number; facts: Partial<FileStyleOrigin> } | null {
        const raw = this.#values(mapping.by, source);
        if (raw === null) {
            return null;
        }

        const match = this.#matches(rule.where, source);
        const path = (): Path | null => this.#pathOf(mapping.by, source, "by");
        if (mapping.kind === "passthrough") {
            // The column, read as the channel reads it, must give what the file gives.
            const exact = raw.every(
                (value, i) => !match[i] || same(drawnAs(plan.channel, value), drawnAs(plan.channel, drawn[i])),
            );
            const at = exact ? path() : null;
            return at === null
                ? null
                : {
                      binding: { by: at, scale: "passthrough" },
                      worth: 0,
                      facts: {
                          column: at,
                          mapping: "passthrough",
                          distinctValues: new Set(raw.filter((value) => value !== null)).size,
                      },
                  };
        }

        if (mapping.kind === "discrete") {
            return this.#discrete(plan, raw, drawn, match, path, mapping.table.length);
        }

        if (mapping.kind === "continuous") {
            return this.#continuous(mapping, plan, path);
        }

        return null;
    }

    /**
     * A discrete mapping as a table keyed by the values present, the rest left to the layers
     * beneath, when that draws exactly what the file gives.
     * @param plan - The channel.
     * @param raw - The column's values.
     * @param drawn - The channel's values.
     * @param match - Which elements the rule selects.
     * @param path - Gives the column's path.
     * @param entries - How many entries the file's table holds.
     * @returns The binding, or null.
     */
    #discrete(
        plan: ChannelPlan,
        raw: readonly unknown[],
        drawn: readonly unknown[],
        match: readonly boolean[],
        path: () => Path | null,
        entries: number,
    ): { binding: Binding; worth: number; facts: Partial<FileStyleOrigin> } | null {
        const read = discreteTable(raw, drawn, match);
        if (read === null) {
            return null;
        }

        const { map, unmapped } = read;
        if (map.size === 0 || map.size > MAX_TABLE_KEYS || [...unmapped].some((key) => map.has(key))) {
            if (map.size > MAX_TABLE_KEYS) {
                this.#notes.add(
                    FILE_STYLE_TRANSLATION_ISSUE.TABLE_AS_VALUES,
                    this.#kind,
                    plan.channel,
                    1,
                    `${String(map.size)} keys`,
                );
            }

            return null;
        }

        const at = path();
        if (at === null) {
            return null;
        }

        const table: Record<string, string | number> = {};
        for (const [key, value] of map) {
            Object.defineProperty(table, key, { value, enumerable: true, writable: true, configurable: true });
        }

        return {
            binding: { by: at, scale: "passthrough", map: table, unmapped: "skip" },
            worth: map.size,
            facts: { column: at, mapping: "discrete", entries: Math.max(entries, map.size) },
        };
    }

    /**
     * A continuous mapping as a `stops` binding: the file's points, its values converted.
     * @param mapping - The mapping.
     * @param mapping.points - Its points.
     * @param mapping.step - What a value is rounded to; a stops binding cannot round, so none is made.
     * @param plan - The channel.
     * @param path - Gives the column's path.
     * @returns The binding, or null when a value has no counterpart.
     */
    #continuous(
        mapping: Extract<Mapping, { kind: "continuous" }>,
        plan: ChannelPlan,
        path: () => Path | null,
    ): { binding: Binding; worth: number; facts: Partial<FileStyleOrigin> } | null {
        const descriptor = channelDescriptor(plan.channel);
        // a stops binding interpolates without rounding, so a mapping the tool rounds (step) is kept per element
        if ((descriptor?.accepts !== "number" && descriptor?.accepts !== "color") || mapping.step !== undefined) {
            return null;
        }

        const stops: BindingStop[] = [];
        for (const point of mapping.points) {
            const [below, value, above] = [point.below, point.value, point.above].map((one) => plan.convert(one));
            const ok = (one: unknown): one is string | number => typeof one === "string" || typeof one === "number";
            if (!ok(below) || !ok(value) || !ok(above) || !Number.isFinite(point.at)) {
                return null;
            }

            stops.push({
                at: point.at,
                value,
                ...(below === value ? {} : { below }),
                ...(above === value ? {} : { above }),
            });
        }

        const at = path();
        return at === null || stops.length === 0
            ? null
            : {
                  binding: { by: at, stops },
                  worth: stops.length,
                  facts: { column: at, mapping: "continuous", entries: stops.length },
              };
    }

    // -----------------------------------------------------------------------------------------
    // Passes of their own
    // -----------------------------------------------------------------------------------------

    /** Node size from width and height, node opacity from two opacities, and arrow sizes. */
    #composites(): void {
        this.#labelRuns();
        if (this.#kind !== "node") {
            this.#arrowSizes();
            return;
        }

        this.#composite(
            ["width", "height"],
            "width",
            (w, h) => {
                const a = typeof w === "number" ? w : null;
                const b = typeof h === "number" ? h : null;
                if (a === null && b === null) {
                    return null;
                }

                return round(Math.max(a ?? (b as number), b ?? (a as number)) * this.#factor);
            },
            "node.size",
        );
        this.#extents();
        this.#composite(
            ["fillOpacity", "opacity"],
            "opacity",
            (fill, whole) => {
                if (typeof fill !== "number" && typeof whole !== "number") {
                    return null;
                }

                return round((typeof fill === "number" ? fill : 1) * (typeof whole === "number" ? whole : 1));
            },
            "node.opacity",
        );
    }

    /**
     * A label drawn in runs of styles of their own (`labelRuns`): where a rule writes runs, each element's label as
     * its runs' markup (its plain `label` where it has none) is planned again with graph-io's planner and drawn above
     * the topmost rule that writes either.
     */
    #labelRuns(): void {
        const writes = (rule: StyleRule, property: string): boolean =>
            rule.set?.[property as StyleProperty] !== undefined || rule.map?.[property as StyleProperty] !== undefined;
        const writers = this.#rules
            .map((rule, bucket) => ({ rule, bucket }))
            .filter(({ rule }) => writes(rule, "labelRuns") || writes(rule, "label"));
        if (!writers.some(({ rule }) => writes(rule, "labelRuns"))) {
            return;
        }

        const { extracted, snapshot } = this.#input;
        const labels = resolveStyles(extracted, this.#kind, "label", snapshot);
        const runs = resolveStyles(extracted, this.#kind, "labelRuns", snapshot);
        const sizes = resolveStyles(extracted, this.#kind, "labelSize", snapshot);
        const values = labels.map((label, i) => labelRunsMarkup(runs[i], sizes[i]) ?? label);
        const sub = planStyles(
            {
                format: extracted.styles.source.format,
                units: "px",
                [this.#kind]: { values: { label: values } },
                fingerprint: extracted.fingerprint,
            },
            {
                node: this.#kind === "node" ? extracted.features.node : [],
                edge: this.#kind === "edge" ? extracted.features.edge : [],
            },
            { toolDefaults: false },
        );
        const channel: Channel = this.#kind === "node" ? "node.label" : "edge.label";
        const identity: ChannelPlan = { channel, convert: (value) => value, identity: true };
        const top = writers.at(-1)?.bucket ?? 0;
        for (const rule of sub.styles.rules) {
            if (rule.target === this.#kind) {
                this.#emitWith({ ...rule, id: `${rule.id}.labelRuns` }, top, "label", identity, sub);
            }
        }
    }

    /**
     * Arrow sizes in the writing program's proportions: each program sizes its arrowheads from the
     * line width and its own size setting (graph-io's `ToolDefaults.arrowhead`), so each end's size
     * is worked out per edge from its width, `arrowSize` and arrow shape, in the scene's units, and
     * drawn above the topmost rule that writes any of them.
     */
    #arrowSizes(): void {
        if (this.#arrowhead === null) {
            return;
        }

        const { geometry, scene } = this.#arrowhead;
        const props = [
            "width",
            "arrowSize",
            "targetArrow",
            "sourceArrow",
            "sourceArrowSize",
            "targetArrowLength",
            "sourceArrowLength",
            "targetArrowWidth",
            "sourceArrowWidth",
            "midTargetArrow",
            "midSourceArrow",
            "targetArrowImageWidth",
            "targetArrowImageHeight",
            "sourceArrowImageWidth",
            "sourceArrowImageHeight",
            "midTargetArrowImageWidth",
            "midTargetArrowImageHeight",
        ] as const;
        const writers = this.#rules
            .map((rule, bucket) => ({ rule, bucket }))
            .filter(({ rule }) => props.some((p) => rule.set?.[p] !== undefined || rule.map?.[p] !== undefined));
        const last = writers.at(-1);
        if (last === undefined || writers.every(({ rule }) => this.#rebuilt.has(rule))) {
            return;
        }

        const { extracted, snapshot } = this.#input;
        const [
            width,
            size,
            head,
            tail,
            tailSize,
            headLength,
            tailLength,
            headWidth,
            tailWidth,
            midHead,
            midTail,
            headImageWidth,
            headImageHeight,
            tailImageWidth,
            tailImageHeight,
            midImageWidth,
            midImageHeight,
        ] = props.map((p) => resolveStyles(extracted, "edge", p, snapshot));
        const none: readonly (StyleValue | null)[] = [];
        // a middle arrow is sized as the target's is, in its own shape's proportions
        const ends: Record<"Head" | "Tail" | "MiddleHead" | "MiddleTail", ArrowEnd> = {
            Head: {
                shapes: head,
                size: (i) => factor(size, i),
                sources: tail,
                length: headLength,
                breadth: headWidth,
                imageWidth: headImageWidth,
                imageHeight: headImageHeight,
            },
            Tail: {
                shapes: tail,
                size: (i) => factor(tailSize, i, factor(size, i)),
                sources: tail,
                length: tailLength,
                breadth: tailWidth,
                imageWidth: tailImageWidth,
                imageHeight: tailImageHeight,
            },
            MiddleHead: {
                shapes: midHead,
                size: (i) => factor(size, i),
                sources: tail,
                length: none,
                breadth: none,
                imageWidth: midImageWidth,
                imageHeight: midImageHeight,
            },
            MiddleTail: {
                shapes: midTail,
                size: (i) => factor(size, i),
                sources: tail,
                length: none,
                breadth: none,
                imageWidth: none,
                imageHeight: none,
            },
        };
        const { rule, bucket } = last;
        const layer = this.#layerFor(
            { ...rule, id: `${rule.id}.arrowSizes` },
            bucket,
            this.#scoped({ match: "everything" }),
        );
        layer.spec.name = `${rule.id}.arrowSizes`;
        layer.worth = 0;
        for (const [end, sides] of Object.entries(ends) as [
            "Head" | "Tail" | "MiddleHead" | "MiddleTail",
            ArrowEnd,
        ][]) {
            // Each edge's own value, read back per element: exact whatever the widths are.
            const encode = (channel: Channel, values: readonly (number | null)[]): void => {
                if (values.some((value) => value !== null)) {
                    const path = this.#keepNew(`${channel.slice(5)}.sized`, values);
                    layer.spec.encode[channel] = { by: path, scale: "passthrough" };
                    recordPaint(layer, channel, values);
                }
            };
            encode(
                `edge.arrow${end}Size`,
                sides.shapes.map((_shape, i) => arrowLengthOf(geometry, scene, sides, factor(width, i, 0), i)),
            );
            encode(
                `edge.arrow${end}Width`,
                sides.shapes.map((_shape, i) => arrowBreadthOf(geometry, sides, i)),
            );
        }
    }

    /**
     * Node width and height, where the file draws some node wider than it is tall or taller than
     * wide; `node.size` alone draws a node whose sides are equal.
     */
    #extents(): void {
        const { extracted, snapshot } = this.#input;
        const only = new Set(["width", "height"]);
        const writes = (rule: StyleRule): boolean =>
            [...only].some(
                (p) => rule.set?.[p as StyleProperty] !== undefined || rule.map?.[p as StyleProperty] !== undefined,
            );
        const writers = this.#rules.map((rule, bucket) => ({ rule, bucket })).filter(({ rule }) => writes(rule));
        if (writers.length === 0) {
            return;
        }

        const width = resolveStyles(extracted, "node", "width", snapshot);
        const height = resolveStyles(extracted, "node", "height", snapshot);
        const uneven = width.some((w, i) => typeof w === "number" && typeof height[i] === "number" && w !== height[i]);
        if (!uneven) {
            return;
        }

        for (const { rule, bucket } of writers) {
            this.#emitFor(rule, () => {
                this.#neutralRule(rule, bucket, extracted, only);
            });
        }
    }

    /**
     * One channel drawn from two properties. When the rules write only one of them, or write both
     * the same way, each rule is translated on its own; otherwise the combined values are planned
     * again with graph-io's planner and drawn above the topmost rule that writes either.
     * @param props - The two properties.
     * @param planned - The property name the combined values are planned under.
     * @param combine - The combined value of an element.
     * @param channel - The channel drawn.
     */
    #composite(
        props: readonly [string, string],
        planned: string,
        combine: (a: StyleValue | null, b: StyleValue | null) => number | null,
        channel: Channel,
    ): void {
        const writes = (rule: StyleRule, property: string): boolean =>
            rule.set?.[property as StyleProperty] !== undefined || rule.map?.[property as StyleProperty] !== undefined;
        const writers = this.#rules
            .map((rule, bucket) => ({ rule, bucket }))
            .filter(({ rule }) => props.some((p) => writes(rule, p)));
        if (writers.length === 0) {
            return;
        }

        const scale = channel === "node.size" ? this.#factor : 1;
        const convert: Convert = (value) => (typeof value === "number" ? round(value * scale) : null);
        const plan: ChannelPlan = { channel, convert, identity: channel !== "node.size" || this.#factor === 1 };
        const [first, second] = props;
        const used = props.filter((p) => writers.some(({ rule }) => writes(rule, p)));
        const signature = (rule: StyleRule, property: string): string =>
            JSON.stringify([
                rule.set?.[property as StyleProperty] ?? null,
                rule.map?.[property as StyleProperty] ?? null,
            ]);
        const twin =
            used.length === 2 &&
            channel === "node.size" &&
            writers.every(({ rule }) => signature(rule, first) === signature(rule, second));
        if (used.length === 1 || twin) {
            this.#compositeEach(writers, used[0], plan);
        } else if (!writers.every(({ rule }) => this.#rebuilt.has(rule))) {
            // Unless every rule is drawn by the layer graphty wrote for it.
            this.#compositeCombined(props, planned, combine, channel, writers.at(-1)?.bucket ?? 0);
        }
    }

    /**
     * A two-property channel whose rules write only one property, or both the same way: each rule translated on
     * its own.
     * @param writers - The rules that write either property, with their buckets.
     * @param property - The property translated.
     * @param plan - The channel.
     */
    #compositeEach(writers: readonly { rule: StyleRule; bucket: number }[], property: string, plan: ChannelPlan): void {
        const { extracted } = this.#input;
        for (const { rule, bucket } of writers) {
            const written =
                rule.set?.[property as StyleProperty] !== undefined ||
                rule.map?.[property as StyleProperty] !== undefined;
            if (written && !this.#drawnByBase(rule, property, plan)) {
                this.#emitFor(rule, () => {
                    this.#emit(rule, bucket, property, plan, extracted);
                });
            }
        }

        if (property === "fillOpacity") {
            this.#noteFadedFill();
        }
    }

    /**
     * A two-property channel drawn from the combined values, planned again with graph-io's planner.
     * @param props - The two properties.
     * @param planned - The property name the combined values are planned under.
     * @param combine - The combined value of an element.
     * @param channel - The channel drawn.
     * @param top - The bucket of the topmost rule that writes either property.
     */
    #compositeCombined(
        props: readonly [string, string],
        planned: string,
        combine: (a: StyleValue | null, b: StyleValue | null) => number | null,
        channel: Channel,
        top: number,
    ): void {
        const { extracted, snapshot } = this.#input;
        const [first, second] = props;
        const a = resolveStyles(extracted, this.#kind, first as StyleProperty, snapshot);
        const b = resolveStyles(extracted, this.#kind, second as StyleProperty, snapshot);
        const values = a.map((value, i) => combine(value, b[i]));
        const differ = a.filter((value, i) => value !== null && b[i] !== null && value !== b[i]).length;
        if (differ > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.DRAWN_NEAREST, this.#kind, `${first},${second}`, differ);
        }

        if (channel === "node.opacity") {
            this.#noteFadedFill();
        }

        // Planned in the element's own units, so each rule of the plan is drawn as it is.
        const sub = planStyles(
            {
                format: extracted.styles.source.format,
                units: "px",
                node: { values: { [planned]: values } },
                fingerprint: extracted.fingerprint,
            },
            { node: extracted.features.node, edge: [] },
            { toolDefaults: false },
        );
        const identity: ChannelPlan = { channel, convert: (value) => value, identity: true };
        // The replanned rules are named apart from the file's: under the file's own id
        // (`node.exceptions`) a rule would paint into that rule's layer, below the replanned rules
        // emitted after it, and a per-node size would be painted over (cx2-syn-bypass).
        const suffix = channel.slice(channel.indexOf(".") + 1);
        for (const rule of sub.styles.rules) {
            if (rule.target === "node") {
                this.#emitWith({ ...rule, id: `${rule.id}.${suffix}` }, top, planned, identity, sub);
            }
        }
    }

    /**
     * Emit one property of a planned rule in a bucket of another rule.
     * @param rule - The planned rule.
     * @param bucket - The bucket.
     * @param property - The property.
     * @param plan - The channel.
     * @param source - The planned styles.
     */
    #emitWith(rule: StyleRule, bucket: number, property: string, plan: ChannelPlan, source: ExtractedStyles): void {
        if (
            rule.set?.[property as StyleProperty] !== undefined ||
            rule.map?.[property as StyleProperty] !== undefined
        ) {
            this.#emit(rule, bucket, property, plan, source);
        }
    }

    /** Note that a translucent fill fades the whole node, label and outline with it. */
    #noteFadedFill(): void {
        const { extracted, snapshot } = this.#input;
        const fill = resolveStyles(extracted, "node", "fillOpacity", snapshot);
        const faded = fill.filter((value) => typeof value === "number" && value < 1).length;
        if (faded > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.DRAWN_NEAREST, this.#kind, "fillOpacity", faded);
        }
    }

    /** The elements the file hides, for the session's visibility. */
    #visibility(): void {
        if (!this.#rules.some((rule) => rule.set?.visible !== undefined || rule.map?.visible !== undefined)) {
            return;
        }

        const values = resolveStyles(this.#input.extracted, this.#kind, "visible", this.#input.snapshot);
        const marks = values.map((value) => (value === false ? true : null));
        const count = marks.filter(Boolean).length;
        if (count > 0) {
            const key = this.#freshKey("hidden");
            this.#keep(key, marks);
            this.hidden = { key, count };
        }
    }

    /**
     * Groups behind their members, as every program that draws them does (yEd, Cytoscape): each
     * node the file nests others in (graph-io's `parent` or `parents` column) is drawn at a
     * `node.zIndex` below 0, one step lower per level of groups inside it, so an outer group sits
     * behind an inner one and both behind every member and edge. Only group nodes are painted.
     */
    #nesting(): void {
        if (this.#kind !== "node") {
            return;
        }

        const children = childrenOf(this.#input.snapshot);
        if (children.size === 0) {
            return;
        }

        // Levels of groups below each node, computed bottom up; a cycle counts as no further level.
        const levels = new Map<number, number>();
        const levelOf = (node: number, seen: Set<number>): number => {
            const held = levels.get(node);
            if (held !== undefined) {
                return held;
            }

            seen.add(node);
            let level = 0;
            for (const child of children.get(node) ?? []) {
                if (!seen.has(child)) {
                    level = Math.max(level, 1 + levelOf(child, seen));
                }
            }

            seen.delete(node);
            levels.set(node, level);
            return level;
        };
        const values = Array.from({ length: this.#n }, (_unused, i) =>
            children.has(i) ? -Math.max(1, levelOf(i, new Set())) : null,
        );
        const path = this.#keepNew("zIndex", values);
        this.#built.push({
            bucket: this.#rules.length,
            spec: {
                name: "node.groups",
                target: "node",
                kind: "encoding",
                selector: this.#scoped({ match: "has", path }),
                set: {},
                encode: { "node.zIndex": { by: path, scale: "passthrough" } },
                fileStyle: {
                    format: this.#input.format,
                    importId: this.#input.importId,
                    ruleId: "node.groups",
                    role: "group",
                    origin: "inferred",
                    column: path,
                    mapping: "passthrough",
                    elements: children.size,
                },
            },
            paint: new Map([["node.zIndex", values]]),
            worth: 0,
        });
    }

    /**
     * Overlapping nodes in the file's own order, as every program that draws them does
     * (Cytoscape, Pajek, yEd, Graphviz): a node later in the file is drawn on top of one before
     * it. Each node gets a `node.drawOrder` level from its place in the file, 0 for the first and
     * 100 for the last. A file graphty wrote is left alone: graphty drew it with no order, and its
     * own layers come back as they were.
     */
    #drawOrder(): void {
        if (this.#kind !== "node" || this.#n < 2 || this.#input.extracted.styles.source.tool === "graphty") {
            return;
        }

        const last = this.#n - 1;
        const values = Array.from({ length: this.#n }, (_unused, i) => Math.round((i * 100) / last));
        const path = this.#keepNew("drawOrder", values);
        this.#built.push({
            bucket: this.#rules.length,
            spec: {
                name: "node.drawOrder",
                target: "node",
                kind: "encoding",
                selector: this.#scoped({ match: "has", path }),
                set: {},
                encode: { "node.drawOrder": { by: path, scale: "passthrough" } },
                fileStyle: {
                    format: this.#input.format,
                    importId: this.#input.importId,
                    ruleId: "node.drawOrder",
                    role: "passthrough",
                    origin: "inferred",
                    column: path,
                    mapping: "passthrough",
                    elements: this.#n,
                },
            },
            paint: new Map([["node.drawOrder", values]]),
            worth: 0,
        });
    }

    /**
     * The layer standing for a folded run: what the run painted, kept per element.
     * @param run - The run.
     * @param paint - What it painted per channel.
     * @returns The layer.
     */
    #folded(run: readonly FoldableLayer[], paint: ReadonlyMap<Channel, readonly unknown[]>): Building {
        const encode: Record<string, Binding> = {};
        for (const [channel, values] of paint) {
            encode[channel] = { by: this.#keepNew(`fold.${channel}`, values), scale: "passthrough" };
        }

        const origin: FileStyleOrigin = {
            format: this.#input.format,
            importId: this.#input.importId,
            ruleId: `${this.#kind}.folded`,
            role: "passthrough",
            origin: "inferred",
            reason: "LAYER_CAP",
            elements: this.#n,
        };
        return {
            bucket: 0,
            spec: {
                name: `${this.#kind}.folded`,
                target: this.#kind,
                kind: "custom",
                selector: this.#scoped({ match: "everything" }),
                set: {},
                encode,
                fileStyle: origin,
            },
            paint: new Map(paint as Map<Channel, unknown[]>),
            worth: 0,
        };
    }
}

/**
 * The nodes each node nests, by row, from graph-io's `parent` (one parent) and `parents` (a list)
 * node columns.
 * @param snapshot - The imported graph.
 * @returns The children of every node that has any.
 */
export function childrenOf(snapshot: GraphSnapshot): Map<number, number[]> {
    const out = new Map<number, number[]>();
    for (const role of ["parent", "parents"] as const) {
        const column = snapshot.nodes.byRole(role);
        if (column === null) {
            continue;
        }

        for (let row = 0; row < snapshot.nodeCount; row++) {
            const value = column.isSet(row) ? plain(column.value(row)) : null;
            for (const parent of parentRows(value, row, snapshot.nodeCount)) {
                const held = out.get(parent) ?? [];
                held.push(row);
                out.set(parent, held);
            }
        }
    }

    return out;
}

/**
 * The parent rows one node's `parent` or `parents` value names: valid rows other than its own.
 * @param value - The column's value for the node: a row, a list of rows or nothing.
 * @param row - The node's own row.
 * @param nodeCount - How many nodes the graph has.
 * @returns The parent rows.
 */
function parentRows(value: unknown, row: number, nodeCount: number): number[] {
    const list: unknown[] = Array.isArray(value) ? value : [value];
    return list.filter((p): p is number => typeof p === "number" && p !== row && p >= 0 && p < nodeCount);
}

/** The first segment after `data.` in an expression, bare or quoted. */
/**
 * The table of a discrete mapping: each category of the column with the one value the channel draws for it, and the
 * categories it draws nothing for.
 * @param raw - The column's values.
 * @param drawn - The channel's values.
 * @param match - Which elements the rule selects.
 * @returns The table, or null when no table draws exactly what the file gives.
 */
function discreteTable(
    raw: readonly unknown[],
    drawn: readonly unknown[],
    match: readonly boolean[],
): { map: Map<string, unknown>; unmapped: Set<string> } | null {
    const map = new Map<string, unknown>();
    const unmapped = new Set<string>();
    for (let i = 0; i < raw.length; i++) {
        const absent = !match[i] || raw[i] === null || raw[i] === undefined;
        if (absent && match[i] && drawn[i] !== null) {
            return null;
        }

        const key = absent ? undefined : categoryOf(raw[i]);
        if (key === null) {
            return null;
        }

        const value = drawn[i];
        if (key === undefined) {
            continue;
        }

        if (value === null) {
            unmapped.add(key);
        } else if (!tableValue(map, key, value)) {
            return null;
        }
    }

    return { map, unmapped };
}

/**
 * Puts one category's value in a table. A map value is a string or a number: a boolean channel keeps its values per
 * element.
 * @param map - The table, added to.
 * @param key - The category.
 * @param value - The value drawn for it.
 * @returns False when the value cannot be a table value or another value was drawn for the category.
 */
function tableValue(map: Map<string, unknown>, key: string, value: unknown): boolean {
    if (typeof value !== "string" && typeof value !== "number") {
        return false;
    }

    if (map.has(key) && !same(map.get(key), value)) {
        return false;
    }

    map.set(key, value);
    return true;
}

/**
 * Records what a layer paints on a channel, for folding and for the export back. A whole label style is no scalar:
 * its layers are never folded.
 * @param layer - The layer being built.
 * @param channel - The channel.
 * @param drawn - What it paints, by row.
 */
function recordPaint(layer: Building, channel: Channel, drawn: readonly unknown[]): void {
    const whole = channelDescriptor(channel)?.accepts === "labelStyle";
    const paint = whole
        ? drawn.map((value) => (typeof value === "object" && value !== null ? value : null))
        : drawn.map((value) => drawnAs(channel, value));
    layer.drawn ??= new Map(layer.paint ?? []);
    layer.drawn.set(channel, paint);
    if (whole) {
        (layer as { paint: Building["paint"] }).paint = null;
    } else {
        layer.paint?.set(channel, paint);
    }
}

/**
 * The paths a layer graphty wrote reads: its selector's and its bindings'.
 * @param spec - The layer.
 * @returns The paths, or null when its expression names a quoted column JSON cannot read (no column this load holds)
 */
function pathsRead(spec: Partial<LayerSpec>): string[] | null {
    const paths: string[] = [];
    const { selector } = spec;
    if (selector?.match === "has" || selector?.match === "top") {
        paths.push(selector.path);
    } else if (selector?.match === "expression" && typeof selector.where === "string") {
        for (const match of selector.where.matchAll(DATA_SEGMENT)) {
            const name = match[1].startsWith('"') ? quotedName(match[1]) : match[1];
            if (name === undefined) {
                return null;
            }

            paths.push(`data.${name}`);
        }
    }

    for (const binding of Object.values(spec.encode ?? {})) {
        if (typeof binding === "object" && binding !== null && "by" in binding && typeof binding.by === "string") {
            paths.push(binding.by);
        }
    }

    return paths;
}

const DATA_SEGMENT = /(?<![\w."])data\.("(?:[^"\\]|\\.)*"|[A-Za-z_]\w*)/g;

/** The label positions the element draws. */
const LOCATIONS: ReadonlySet<string> = new Set([
    "top",
    "top-right",
    "top-left",
    "left",
    "center",
    "right",
    "bottom",
    "bottom-left",
    "bottom-right",
    "inside-top",
    "inside-bottom",
    "inside-left",
    "inside-right",
    "inside-top-left",
    "inside-top-right",
    "inside-bottom-left",
    "inside-bottom-right",
]);

/**
 * A quoted name read back as its text.
 * @param quoted - The name with its quotes, escaped as JSON.
 * @returns The text, or undefined when it holds an escape JSON rejects.
 */
function quotedName(quoted: string): string | undefined {
    try {
        const text: unknown = JSON.parse(quoted);
        return typeof text === "string" ? text : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The segments of a dotted path, each quoted name read back as its text.
 * @param text - The path's segments, joined with dots.
 * @returns The segments, or undefined when a quoted name holds an escape JSON rejects.
 */
function splitSegments(text: string): string[] | undefined {
    const out: string[] = [];
    let at = 0;
    while (at < text.length) {
        if (text[at] === '"') {
            const end = closingQuote(text, at + 1, '"');
            const name = quotedName(text.slice(at, end + 1));
            if (name === undefined) {
                return undefined;
            }

            out.push(name);
            at = end + 2;
        } else {
            const dot = text.indexOf(".", at);
            const end = dot === -1 ? text.length : dot;
            out.push(text.slice(at, end));
            at = end + 1;
        }
    }

    return out;
}

/**
 * The predicates an `and` or an `or` combines.
 * @param where - The predicate.
 * @returns Them, or null for any other predicate.
 */
function listOf(where: Predicate): readonly Predicate[] | null {
    if ("and" in where) {
        return where.and;
    }

    return "or" in where ? where.or : null;
}

/**
 * The kind of layer a rule makes: its defaults are a base, a mapping or a group an encoding, and
 * per-element copies custom.
 * @param rule - The rule.
 * @returns The kind.
 */
function layerKindOf(rule: StyleRule): LayerKind {
    if (rule.role === "defaults") {
        return "base";
    }

    return rule.role === "mapping" || rule.role === "group" ? "encoding" : "custom";
}

/**
 * The facts of a rule a layer carries.
 * @param rule - The rule.
 * @returns The facts.
 */
function factsOf(rule: StyleRule): Partial<FileStyleOrigin> {
    const facts = rule.facts ?? {};
    const meanings: FileStyleMeaning[] | undefined = facts.names?.map(([value, name]) => ({ value, name }));
    return {
        ...(facts.elements === undefined ? {} : { elements: facts.elements }),
        ...(facts.classes === undefined ? {} : { classes: facts.classes }),
        ...(facts.distinctValues === undefined ? {} : { distinctValues: facts.distinctValues }),
        ...(facts.reason === undefined ? {} : { reason: facts.reason }),
        ...(meanings === undefined ? {} : { meanings }),
    };
}

/**
 * Add facts to a layer's origin.
 * @param layer - The layer.
 * @param facts - The facts.
 */
function setFacts(layer: Building, facts: Partial<FileStyleOrigin>): void {
    layer.spec.fileStyle = { ...(layer.spec.fileStyle as FileStyleOrigin), ...facts };
}
