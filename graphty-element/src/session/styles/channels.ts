/**
 * @file The channels a style layer can paint, and the value each one accepts.
 *
 * A channel is one property of one drawn thing: the colour of a node, the width of an edge, the
 * pattern a line is drawn with. A layer writes channels and nothing else, which is what makes a
 * layer data rather than code.
 *
 * THE SET IS CLOSED, and closing it is the point. There is no escape hatch, so a name that is
 * not in {@link CHANNELS} is unreachable by any means: a registered scale maps a value onto a
 * channel that already exists and cannot invent one. A channel that is missing is a missing API,
 * added in a minor with an entry in this table; it is never a reason to reopen an evaluator that
 * builds JavaScript out of a string.
 *
 * THE SET IS CLOSED OVER WHAT THE ELEMENT CAN DRAW, which is a stronger claim and the reason
 * every entry below names the field of the parsed style it lands on. Several entries narrow that
 * claim, and every one of them says so in `caveat` rather than pretending:
 *
 * - `node.marker` draws nothing at all. `NodeStyle.texture.icon` is declared in the schema and
 *   no renderer reads it, and the badge vocabulary that does exist belongs to a label, not to a
 *   node. It is marked `renderable: false` and its value type is `never`, so writing it is a
 *   compile error rather than a silent no-op.
 * - `edge.curvature` is a switch, not an amount. The edge renderer offsets its control points by
 *   a fixed fraction of the edge length, so "curve this edge" is the only thing it can be told.
 * - `node.outline` is a colour and no width, for the same reason in the same shape: the stroke
 *   is drawn by a highlight LAYER whose blur size belongs to the layer, so every outline on
 *   screen is one width. This is the sentence the element's natural-language layer reads out
 *   when someone asks for an outline width, so it answers with a reason rather than a refusal.
 * - `edge.patternCount` counts the elements of a PATTERNED line. A solid line has none to count,
 *   and zigzag and sinewave ignore it because they always tile the whole edge.
 * - The four arrow caption channels draw words at ONE END of an edge, hanging from the cap
 *   there. An end with no cap carries no caption, and the words are what switch one on.
 * - The two node tooltip channels draw on HOVER and only on hover, so a graph at rest carries
 *   none however many layers write one -- and only a node has a tooltip. `edge.tooltip` was
 *   published through 1.x, drawn by nothing, and withdrawn in 2.0 because an edge cannot be
 *   hovered at all.
 *
 * WHAT A CAVEAT IS NOT. It is not a place to record that a capability has no channel at all. A
 * caveat says what the renderer can and cannot draw; a style field that IS declared and that no
 * channel reaches belongs in the reachability waiver list, `src/catalog/unreachable.ts`, where a
 * test can see it rather than only a reader. `node.glow` used to carry a note about the glow's
 * strength having no channel, and the strength has one now. The outline's width is the other
 * shape: `NodeStyle.effect.outline` declares no `width` at all any more, because a declared one
 * was accepted, validated and ignored -- so there is no field for the waiver list to name, and
 * the limit belongs here, beside the colour that IS drawn.
 *
 * The enumerated channels take their values from the element's own schemas -- the node shape
 * list, the line pattern list, the arrow list -- read out of the Zod enums rather than retyped.
 * A list retyped here would drift from the renderer the first time a shape is added, which is
 * the exact failure the node shape enum's own comment records.
 *
 * A COLOUR VALUE CARRIES ITS NUMBERS. {@link ColorValue} is an `Rgba` with the authored hex
 * string alongside it, because a repaint that parses a hex string once per element is paying for
 * a conversion the encoding already did. Authoring still accepts any colour the element
 * understands: {@link toColorValue} is where a string becomes numbers, once.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, EdgeLinePattern, LabelStyle, Rgba } from "../../catalog/types";
import { colorToHex } from "../../config/common";
import { EdgeStyle, type EdgeStyleConfig } from "../../config/EdgeStyle";
import { NodeShapes, type NodeStyleConfig } from "../../config/NodeStyle";

// ---------------------------------------------------------------------------------------------
// Colour: one string parse, kept
// ---------------------------------------------------------------------------------------------

/**
 * A colour on its way to the screen: the numbers a repaint reads, and the string a person wrote
 * or an export writes.
 *
 * It is an `Rgba`, so it is a {@link Channel} value like any other, and the `hex` beside it is
 * never re-derived. Components are 0-255 and `a` is 0-1.
 */
export interface ColorValue extends Rgba {
    /** The same colour as `#rrggbb`, or `#rrggbbaa` when it is not fully opaque. */
    readonly hex: string;
}

/** Three, four, six or eight hex digits, with or without the leading hash. */
const HEX_PATTERN = /^#?(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/**
 * Round a channel to a whole number inside 0-255.
 * @param value - The channel as it arrived, which may be fractional or out of range.
 * @returns The channel as a byte.
 */
function toByte(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Write one byte as two hex digits.
 * @param value - A whole number in 0-255.
 * @returns The two digits, zero-padded.
 */
function hexDigits(value: number): string {
    return value.toString(16).padStart(2, "0");
}

/**
 * Split a hex colour into its four components.
 *
 * Three- and four-digit shorthand is doubled the way CSS doubles it, so `#f0c` is `#ff00cc`.
 * @param text - The hex colour, with or without the leading hash.
 * @returns The four components, alpha 0-1, or null when the text is not a hex colour.
 */
function parseHex(text: string): Rgba | null {
    if (!HEX_PATTERN.test(text)) {
        return null;
    }

    const digits = text.startsWith("#") ? text.slice(1) : text;
    const short = digits.length <= 4;
    const pair = (index: number): number => {
        const slice = short ? digits[index].repeat(2) : digits.slice(index * 2, index * 2 + 2);

        return parseInt(slice, 16);
    };
    const hasAlpha = digits.length === 4 || digits.length === 8;

    return {
        r: pair(0),
        g: pair(1),
        b: pair(2),
        a: hasAlpha ? pair(3) / 255 : 1,
    };
}

/**
 * Whether a value a repaint resolved for a channel is one of the colours it carries.
 *
 * ONE GUARD, BECAUSE TWO DISAGREED. A colour reaches a renderer as a {@link ColorValue} object
 * rather than as a string, and every reader of a resolved style has to recognise one. Both the
 * style painter and the mesh-key interner had to; only the painter did, so a colour that keys a
 * source mesh was folded into that key as "nothing painted this" and two edges whose arrow caps
 * differed only in colour shared one cap. See `pushMeshValue` in `./repaint`.
 * @param value - The value the repaint resolved, out of a column or a resolved style.
 * @returns The colour, or null when the value is not one.
 */
export function asColorValue(value: unknown): ColorValue | null {
    if (typeof value !== "object" || value === null || !("hex" in value)) {
        return null;
    }

    return value as ColorValue;
}

/**
 * Turn anything the element accepts as a colour into the form a repaint reads.
 *
 * TOTAL, deliberately. It is called from the encoding path that runs once per element, which has
 * no try/catch of its own: a colour it cannot read answers null, and the caller leaves the
 * element unpainted. It never throws, so one unreadable value cannot cost every later element
 * its style.
 *
 * A hex colour is read here. Anything else -- a CSS name, `rgb(...)`, `hsl(...)` -- goes through
 * the element's one colour normaliser so that a channel accepts exactly what the rest of the
 * element's styles accept, and no second colour dialect appears.
 * @param value - A hex colour, any CSS colour the element understands, or components already
 *   parsed. An `a` outside 0-1 is clamped, and components are rounded into 0-255.
 * @returns The colour with its numbers and its hex string, or null when the value is not a
 *   colour at all.
 */
export function toColorValue(value: string | Rgba | null | undefined): ColorValue | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "object") {
        return fromComponents(value);
    }

    const direct = parseHex(value);
    if (direct !== null) {
        return fromComponents(direct);
    }

    try {
        const normalised = colorToHex(value);

        return normalised === undefined ? null : toColorValue(normalised);
    } catch {
        // colorjs.io throws on a string it cannot parse. A colour nobody can read is a value
        // this function answers for, not a frame it takes down.
        return null;
    }
}

/**
 * Build the carried form from four components.
 * @param rgba - The components, in any state a caller might hand over.
 * @returns The colour, clamped, rounded and with its hex string worked out once.
 */
function fromComponents(rgba: Rgba): ColorValue {
    const r = toByte(rgba.r);
    const g = toByte(rgba.g);
    const b = toByte(rgba.b);
    const a = Number.isFinite(rgba.a) ? Math.max(0, Math.min(1, rgba.a)) : 1;
    const base = `#${hexDigits(r)}${hexDigits(g)}${hexDigits(b)}`;

    return { r, g, b, a, hex: a === 1 ? base : `${base}${hexDigits(Math.round(a * 255))}` };
}

// ---------------------------------------------------------------------------------------------
// The enumerated values, read out of the element's own schemas
// ---------------------------------------------------------------------------------------------

/** A node shape the element can build a mesh for. */
export type NodeShapeValue = NonNullable<NonNullable<NodeStyleConfig["shape"]>["type"]>;

/**
 * A line pattern the edge renderer can draw.
 *
 * These are the nine the renderer ships. The catalogue's `EdgeLinePattern` is now this same type
 * rather than a second list beside it: it used to name nine patterns of which seven had never had
 * a mesh, while omitting seven that did, so a consumer who wrote a value the published type
 * accepted got a layer the element refused.
 */
export type EdgeLineValue = EdgeLinePattern;

/** An arrow the edge renderer can draw at either end. */
export type ArrowValue = NonNullable<NonNullable<EdgeStyleConfig["arrowHead"]>["type"]>;

/** Every node shape, in schema order. */
const NODE_SHAPE_VALUES: readonly NodeShapeValue[] = NodeShapes.options;

/** Every line pattern, in schema order. */
const EDGE_LINE_VALUES: readonly EdgeLineValue[] = EdgeStyle.shape.line.unwrap().shape.type.unwrap().options;

/** Every arrow, in schema order. */
const ARROW_VALUES: readonly ArrowValue[] = EdgeStyle.shape.arrowHead.unwrap().shape.type.unwrap().unwrap().options;

// ---------------------------------------------------------------------------------------------
// What each channel carries
// ---------------------------------------------------------------------------------------------

/**
 * The value each channel carries once it has been resolved, which is what a repaint reads.
 *
 * `node.marker` is `never` because the element draws nothing for it. That is not a placeholder:
 * a channel whose only possible value is "no value" cannot be written by accident, and the
 * compiler says so at the line that tried rather than at a frame that came out looking wrong.
 */
export interface ChannelValues {
    "node.color": ColorValue;
    "node.size": number;
    "node.shape": NodeShapeValue;
    "node.label": string;
    "node.labelStyle": LabelStyle;
    "node.tooltip": string;
    "node.tooltipStyle": LabelStyle;
    "node.opacity": number;
    "node.outline": ColorValue;
    "node.glow": ColorValue;
    "node.glowStrength": number;
    "node.wireframe": boolean;
    "node.flat": boolean;
    "node.marker": never;
    "edge.color": ColorValue;
    "edge.width": number;
    "edge.opacity": number;
    "edge.style": EdgeLineValue;
    "edge.patternCount": number;
    "edge.curvature": boolean;
    "edge.arrowHead": ArrowValue;
    "edge.arrowHeadSize": number;
    "edge.arrowHeadColor": ColorValue;
    "edge.arrowHeadOpacity": number;
    "edge.arrowHeadText": string;
    "edge.arrowHeadTextStyle": LabelStyle;
    "edge.arrowTail": ArrowValue;
    "edge.arrowTailSize": number;
    "edge.arrowTailColor": ColorValue;
    "edge.arrowTailOpacity": number;
    "edge.arrowTailText": string;
    "edge.arrowTailTextStyle": LabelStyle;
    "edge.animationSpeed": number;
    "edge.label": string;
    "edge.labelStyle": LabelStyle;
}

/**
 * The channels whose value is a colour, and which therefore accept a string when authored.
 *
 * Written out rather than derived, because `never` -- which is what `node.marker` carries --
 * extends every type and would quietly join any union derived by a conditional. The list is tied
 * to the table by {@link COLOR_CHANNELS} and asserted in the tests, so the two cannot drift.
 */
export type ColorChannel =
    | "node.color"
    | "node.outline"
    | "node.glow"
    | "edge.color"
    | "edge.arrowHeadColor"
    | "edge.arrowTailColor";

/** What a repaint reads for one channel. */
export type PaintedValue<C extends Channel> = ChannelValues[C];

/**
 * What an author may write for one channel.
 *
 * The only difference from {@link PaintedValue} is colour: a person writes "#ff9900" or "orange"
 * and the element parses it once, at the edit, rather than once per element per frame.
 */
export type AuthoredValue<C extends Channel> = C extends ColorChannel ? string | Rgba : ChannelValues[C];

/** The kind of value a channel accepts, which is what a control for it has to offer. */
export type ChannelValueKind = "color" | "number" | "text" | "boolean" | "enum" | "labelStyle" | "nothing";

/** One channel: what it paints, what it accepts, and what the renderer really does with it. */
export interface ChannelDescriptor {
    /** The channel's name, which is its identity everywhere. */
    readonly channel: Channel;
    /** Whether it paints nodes or edges. */
    readonly target: "node" | "edge";
    /** The name a person reads. */
    readonly plainName: string;
    /** The kind of value it accepts. */
    readonly accepts: ChannelValueKind;
    /** Every value it accepts, when `accepts` is "enum". */
    readonly values?: readonly string[];
    /** The smallest value the renderer draws, when `accepts` is "number". */
    readonly min?: number;
    /** The largest value the renderer draws, when `accepts` is "number" and it is bounded. */
    readonly max?: number;
    /** Where the value lands in a parsed node or edge style, as a dotted path. */
    readonly stylePath: string;
    /** Whether the element draws this channel at all today. */
    readonly renderable: boolean;
    /**
     * What the renderer narrows or does not do -- why nothing is drawn when `renderable` is
     * false, and what is lost when it is true. Absent when the channel is drawn as declared.
     */
    readonly caveat?: string;
}

/**
 * Why an outline is a colour and nothing else, written once and read in two places.
 *
 * It is `node.outline`'s caveat. A caveat is not shelf decoration: `Layer.ts` and `encoding.ts`
 * quote the caveat of a channel when they refuse a value for it, so this is the sentence a
 * consumer gets back in the refusal rather than one they have to go looking for. The element's
 * natural-language layer now quotes the same sentence when someone asks for an outline WIDTH
 * (`src/ai/commands/StyleCommands.ts`), because a request the element cannot carry out deserves
 * the same explanation however it arrived -- and two copies of it would be two answers to one
 * question the day either is edited.
 */
export const NODE_OUTLINE_CAVEAT =
    "An outline has a colour and no width. Babylon draws it with a highlight LAYER, and the " +
    "stroke's blur size belongs to that layer rather than to a mesh, so every outline on screen " +
    "is drawn at one width whatever a style asks for -- which is why the node style declares no " +
    "outline width to ask with. The outline's COLOUR is per style; a width per style would need " +
    "one highlight layer per width, at a full-screen pass each.";

/**
 * What an arrow caption narrows, written once and read by all four caption channels.
 *
 * A caption is the words an edge carries at ONE END of itself -- what Graphviz calls a headlabel
 * and a taillabel -- as opposed to `edge.label`, which is the words at the middle of the line.
 * Two things about it are worth a consumer knowing before they write a layer:
 *
 * A caption hangs from the cap at its end, so an end drawn with no arrow carries none. Setting
 * `edge.arrowTailText` without also setting `edge.arrowTail` draws nothing, because an edge's
 * tail has no cap unless a layer asks for one; a head does, from the element's own defaults.
 *
 * And the words are what switch a caption on. Writing only the appearance -- the `...TextStyle`
 * channel with no words beneath it -- says how a caption should look without asking for one,
 * which is the same rule `node.labelStyle` follows beside `node.label`.
 */
const ARROW_CAPTION_CAVEAT =
    "A caption hangs from the cap at that end of the edge, so an end drawn with no arrow carries " +
    "none: a tail caption needs `edge.arrowTail` set to something other than \"none\". The words " +
    "are what switch a caption on, so a layer that writes only the caption's appearance and no " +
    "words draws nothing, exactly as `node.labelStyle` draws nothing without `node.label`.";

/**
 * What a node tooltip narrows, written once and read by both of its channels.
 *
 * A tooltip is not part of the picture: it is drawn when the pointer arrives over a node and
 * taken down when the pointer leaves, so a graph at rest carries none however many layers write
 * one. That is the whole difference between a tooltip and a label, and it is the first thing a
 * consumer needs to know, because a layer that writes a tooltip and changes nothing on screen
 * looks exactly like a layer that did not land.
 *
 * The words are what switch a tooltip on, on the same terms as a label: `node.tooltipStyle`
 * written with no `node.tooltip` beneath it says how a tooltip should look without asking for
 * one, and nothing is drawn.
 *
 * AN EDGE HAS NO TOOLTIP. `edge.tooltip` was published through 1.x, drawn by nothing in any
 * released version, and withdrawn in 2.0 -- an edge cannot be hovered at all, which is the same
 * fact that leaves the element with no `edge-click` event. The record is `WITHDRAWN_CAPABILITIES`
 * in `src/catalog/unreachable.ts`.
 */
const NODE_TOOLTIP_CAVEAT =
    "A tooltip is drawn on hover and only on hover, so a graph at rest shows none: a layer that " +
    "writes one changes nothing until a reader points at the node. The words are what switch it " +
    "on, so a layer that writes only the tooltip's appearance and no words draws nothing, " +
    "exactly as `node.labelStyle` draws nothing without `node.label`. Only a NODE has a " +
    "tooltip; `edge.tooltip` was withdrawn in 2.0 because an edge cannot be hovered.";

/**
 * Every channel, with what the element actually does with it.
 *
 * The table is keyed by channel, so a channel added to the union without an entry here is a
 * compile error rather than a channel nothing knows how to paint.
 */
export const CHANNEL_DESCRIPTORS: Readonly<Record<Channel, ChannelDescriptor>> = {
    "node.color": {
        channel: "node.color",
        target: "node",
        plainName: "Node Colour",
        accepts: "color",
        stylePath: "texture.color",
        renderable: true,
    },
    "node.size": {
        channel: "node.size",
        target: "node",
        plainName: "Node Size",
        accepts: "number",
        min: 0,
        stylePath: "shape.size",
        renderable: true,
    },
    "node.shape": {
        channel: "node.shape",
        target: "node",
        plainName: "Node Shape",
        accepts: "enum",
        values: NODE_SHAPE_VALUES,
        stylePath: "shape.type",
        renderable: true,
    },
    "node.label": {
        channel: "node.label",
        target: "node",
        plainName: "Node Label",
        accepts: "text",
        stylePath: "label.text",
        renderable: true,
    },
    "node.labelStyle": {
        channel: "node.labelStyle",
        target: "node",
        plainName: "Node Label Style",
        accepts: "labelStyle",
        stylePath: "label",
        renderable: true,
    },
    "node.tooltip": {
        channel: "node.tooltip",
        target: "node",
        plainName: "Node Tooltip",
        accepts: "text",
        stylePath: "tooltip.text",
        renderable: true,
        caveat: NODE_TOOLTIP_CAVEAT,
    },
    "node.tooltipStyle": {
        channel: "node.tooltipStyle",
        target: "node",
        plainName: "Node Tooltip Style",
        accepts: "labelStyle",
        stylePath: "tooltip",
        renderable: true,
        caveat: NODE_TOOLTIP_CAVEAT,
    },
    "node.opacity": {
        channel: "node.opacity",
        target: "node",
        plainName: "Node Opacity",
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "texture.color.opacity",
        renderable: true,
    },
    "node.outline": {
        channel: "node.outline",
        target: "node",
        plainName: "Node Outline",
        accepts: "color",
        stylePath: "effect.outline.color",
        renderable: true,
        caveat: NODE_OUTLINE_CAVEAT,
    },
    "node.glow": {
        channel: "node.glow",
        target: "node",
        plainName: "Node Glow",
        accepts: "color",
        stylePath: "effect.glow.color",
        renderable: true,
    },
    "node.glowStrength": {
        channel: "node.glowStrength",
        target: "node",
        plainName: "Node Glow Strength",
        accepts: "number",
        min: 0,
        stylePath: "effect.glow.strength",
        renderable: true,
    },
    "node.wireframe": {
        channel: "node.wireframe",
        target: "node",
        plainName: "Node Wireframe",
        accepts: "boolean",
        stylePath: "effect.wireframe",
        renderable: true,
    },
    "node.flat": {
        channel: "node.flat",
        target: "node",
        plainName: "Node Flat Shading",
        accepts: "boolean",
        stylePath: "effect.flatShaded",
        renderable: true,
    },
    "node.marker": {
        channel: "node.marker",
        target: "node",
        plainName: "Node Marker",
        accepts: "nothing",
        stylePath: "texture.icon",
        renderable: false,
        caveat:
            "The element draws no marker. texture.icon is in the node schema and no renderer " +
            "reads it, and the badge vocabulary belongs to a label rather than to a node.",
    },
    "edge.color": {
        channel: "edge.color",
        target: "edge",
        plainName: "Edge Colour",
        accepts: "color",
        stylePath: "line.color",
        renderable: true,
    },
    "edge.width": {
        channel: "edge.width",
        target: "edge",
        plainName: "Edge Width",
        accepts: "number",
        min: 0,
        stylePath: "line.width",
        renderable: true,
    },
    "edge.opacity": {
        channel: "edge.opacity",
        target: "edge",
        plainName: "Edge Opacity",
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "line.opacity",
        renderable: true,
    },
    "edge.style": {
        channel: "edge.style",
        target: "edge",
        plainName: "Edge Line Pattern",
        accepts: "enum",
        values: EDGE_LINE_VALUES,
        stylePath: "line.type",
        renderable: true,
    },
    "edge.patternCount": {
        channel: "edge.patternCount",
        target: "edge",
        plainName: "Edge Pattern Count",
        accepts: "number",
        min: 2,
        stylePath: "line.patternCount",
        renderable: true,
        caveat:
            "A cap on how many dots or dashes a patterned edge draws, and it applies to a " +
            "patterned line only: a solid line has no elements to count, and zigzag and " +
            "sinewave always tile the whole edge, so they ignore it. Left unset, the spacing " +
            "rule decides, so a long edge or a thin one draws more of them.",
    },
    "edge.curvature": {
        channel: "edge.curvature",
        target: "edge",
        plainName: "Edge Curve",
        accepts: "boolean",
        stylePath: "line.bezier",
        renderable: true,
        caveat:
            "A switch, not an amount: the renderer offsets its control points by a fixed " +
            "fraction of the edge's length, so how far an edge bows cannot be set.",
    },
    "edge.arrowHead": {
        channel: "edge.arrowHead",
        target: "edge",
        plainName: "Arrow Head",
        accepts: "enum",
        values: ARROW_VALUES,
        stylePath: "arrowHead.type",
        renderable: true,
    },
    "edge.arrowHeadSize": {
        channel: "edge.arrowHeadSize",
        target: "edge",
        plainName: "Arrow Head Size",
        accepts: "number",
        min: 0,
        stylePath: "arrowHead.size",
        renderable: true,
    },
    "edge.arrowHeadColor": {
        channel: "edge.arrowHeadColor",
        target: "edge",
        plainName: "Arrow Head Colour",
        accepts: "color",
        stylePath: "arrowHead.color",
        renderable: true,
    },
    "edge.arrowHeadOpacity": {
        channel: "edge.arrowHeadOpacity",
        target: "edge",
        plainName: "Arrow Head Opacity",
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "arrowHead.opacity",
        renderable: true,
    },
    "edge.arrowHeadText": {
        channel: "edge.arrowHeadText",
        target: "edge",
        plainName: "Arrow Head Caption",
        accepts: "text",
        stylePath: "arrowHead.text.text",
        renderable: true,
        caveat: ARROW_CAPTION_CAVEAT,
    },
    "edge.arrowHeadTextStyle": {
        channel: "edge.arrowHeadTextStyle",
        target: "edge",
        plainName: "Arrow Head Caption Style",
        accepts: "labelStyle",
        stylePath: "arrowHead.text",
        renderable: true,
        caveat: ARROW_CAPTION_CAVEAT,
    },
    "edge.arrowTail": {
        channel: "edge.arrowTail",
        target: "edge",
        plainName: "Arrow Tail",
        accepts: "enum",
        values: ARROW_VALUES,
        stylePath: "arrowTail.type",
        renderable: true,
    },
    "edge.arrowTailSize": {
        channel: "edge.arrowTailSize",
        target: "edge",
        plainName: "Arrow Tail Size",
        accepts: "number",
        min: 0,
        stylePath: "arrowTail.size",
        renderable: true,
    },
    "edge.arrowTailColor": {
        channel: "edge.arrowTailColor",
        target: "edge",
        plainName: "Arrow Tail Colour",
        accepts: "color",
        stylePath: "arrowTail.color",
        renderable: true,
    },
    "edge.arrowTailOpacity": {
        channel: "edge.arrowTailOpacity",
        target: "edge",
        plainName: "Arrow Tail Opacity",
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "arrowTail.opacity",
        renderable: true,
    },
    "edge.arrowTailText": {
        channel: "edge.arrowTailText",
        target: "edge",
        plainName: "Arrow Tail Caption",
        accepts: "text",
        stylePath: "arrowTail.text.text",
        renderable: true,
        caveat: ARROW_CAPTION_CAVEAT,
    },
    "edge.arrowTailTextStyle": {
        channel: "edge.arrowTailTextStyle",
        target: "edge",
        plainName: "Arrow Tail Caption Style",
        accepts: "labelStyle",
        stylePath: "arrowTail.text",
        renderable: true,
        caveat: ARROW_CAPTION_CAVEAT,
    },
    "edge.animationSpeed": {
        channel: "edge.animationSpeed",
        target: "edge",
        plainName: "Edge Animation Speed",
        accepts: "number",
        min: 0,
        stylePath: "line.animationSpeed",
        renderable: true,
    },
    "edge.label": {
        channel: "edge.label",
        target: "edge",
        plainName: "Edge Label",
        accepts: "text",
        stylePath: "label.text",
        renderable: true,
    },
    "edge.labelStyle": {
        channel: "edge.labelStyle",
        target: "edge",
        plainName: "Edge Label Style",
        accepts: "labelStyle",
        stylePath: "label",
        renderable: true,
    },
};

/** Every channel name, in table order. */
export const CHANNELS: readonly Channel[] = Object.keys(CHANNEL_DESCRIPTORS) as Channel[];

/** Every channel that carries a colour, which is the set {@link ColorChannel} names. */
export const COLOR_CHANNELS: readonly ColorChannel[] = CHANNELS.filter(
    (channel): channel is ColorChannel => CHANNEL_DESCRIPTORS[channel].accepts === "color",
);

/**
 * Whether a name is a channel.
 *
 * A misspelled channel must never be a silent no-op, so every door that takes a channel name
 * from outside the element goes through this and reports `E_UNKNOWN_CHANNEL` when it answers
 * false.
 * @param name - The name to check, from anywhere at all.
 * @returns True when the element has a channel by that name.
 */
export function isChannel(name: unknown): name is Channel {
    return typeof name === "string" && Object.hasOwn(CHANNEL_DESCRIPTORS, name);
}

/**
 * Look one channel up.
 * @param channel - The channel name.
 * @returns Its descriptor, or undefined when the element has no channel by that name.
 */
export function channelDescriptor(channel: string): ChannelDescriptor | undefined {
    return isChannel(channel) ? CHANNEL_DESCRIPTORS[channel] : undefined;
}

/**
 * The channels that paint one kind of element, which is what a channel picker offers once the
 * layer has said whether it paints nodes or edges.
 * @param target - Nodes or edges.
 * @returns Every channel for that target, in table order.
 */
export function channelsFor(target: "node" | "edge"): readonly ChannelDescriptor[] {
    return CHANNELS.map((channel) => CHANNEL_DESCRIPTORS[channel]).filter(
        (descriptor) => descriptor.target === target,
    );
}
