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
 * every entry below names the field of the parsed style it lands on. Two entries do not make
 * that claim, and both say so in `caveat` rather than pretending:
 *
 * - `node.marker` draws nothing at all. `NodeStyle.texture.icon` is declared in the schema and
 *   no renderer reads it, and the badge vocabulary that does exist belongs to a label, not to a
 *   node. It is marked `renderable: false` and its value type is `never`, so writing it is a
 *   compile error rather than a silent no-op.
 * - `edge.curvature` is a switch, not an amount. The edge renderer offsets its control points by
 *   a fixed fraction of the edge length, so "curve this edge" is the only thing it can be told.
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

import type { Channel, LabelStyle, Rgba } from "../../catalog/types";
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
 * These are the nine the renderer ships, taken from the schema. They are NOT the nine names
 * `EdgeLinePattern` carries in the catalogue: that list says "dashed", "dotted", "long-dash" and
 * five more the renderer has never had a mesh for, and omits seven it does.
 */
export type EdgeLineValue = NonNullable<NonNullable<EdgeStyleConfig["line"]>["type"]>;

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
    "node.opacity": number;
    "node.outline": ColorValue;
    "node.glow": ColorValue;
    "node.wireframe": boolean;
    "node.flat": boolean;
    "node.marker": never;
    "edge.color": ColorValue;
    "edge.width": number;
    "edge.opacity": number;
    "edge.style": EdgeLineValue;
    "edge.curvature": boolean;
    "edge.arrowHead": ArrowValue;
    "edge.arrowTail": ArrowValue;
    "edge.animationSpeed": number;
    "edge.label": string;
    "edge.labelStyle": LabelStyle;
    "edge.tooltip": string;
}

/**
 * The channels whose value is a colour, and which therefore accept a string when authored.
 *
 * Written out rather than derived, because `never` -- which is what `node.marker` carries --
 * extends every type and would quietly join any union derived by a conditional. The list is tied
 * to the table by {@link COLOR_CHANNELS} and asserted in the tests, so the two cannot drift.
 */
export type ColorChannel = "node.color" | "node.outline" | "node.glow" | "edge.color";

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
        caveat: "The renderer sizes a label to its text, so maxWidth and wrap are not drawn.",
    },
    "node.tooltip": {
        channel: "node.tooltip",
        target: "node",
        plainName: "Node Tooltip",
        accepts: "text",
        stylePath: "tooltip.text",
        renderable: true,
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
        caveat: "The outline's width is not a channel, so every outline is drawn at one width.",
    },
    "node.glow": {
        channel: "node.glow",
        target: "node",
        plainName: "Node Glow",
        accepts: "color",
        stylePath: "effect.glow.color",
        renderable: true,
        caveat: "The glow's strength is not a channel, so every glow is drawn at one strength.",
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
    "edge.arrowTail": {
        channel: "edge.arrowTail",
        target: "edge",
        plainName: "Arrow Tail",
        accepts: "enum",
        values: ARROW_VALUES,
        stylePath: "arrowTail.type",
        renderable: true,
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
        caveat: "The renderer sizes a label to its text, so maxWidth and wrap are not drawn.",
    },
    "edge.tooltip": {
        channel: "edge.tooltip",
        target: "edge",
        plainName: "Edge Tooltip",
        accepts: "text",
        stylePath: "tooltip.text",
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
