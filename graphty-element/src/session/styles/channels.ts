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

import type { ShaderEffects, ShaderKind, ShaderParams, ShaderParamSets } from "../../catalog/shaders";
import type { Channel, EdgeLinePattern, LabelStyle, Rgba } from "../../catalog/types";
import { colorToHex } from "../../config/common";
import { defaultEdgeStyle, EdgeArrowTypes, EdgeLineTypes, type EdgeStyleConfig } from "../../config/EdgeStyle";
import { DEFAULT_SELECTION_STYLE } from "../../config/GraphStyle";
import {
    defaultNodeStyle,
    NodeBorderStyles,
    NodeShapes,
    NodeSizeModes,
    type NodeStyleConfig,
} from "../../config/NodeStyle";

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

        return Number.parseInt(slice, 16);
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

/** How heavy a label's letters are, as the `labelWeight` channels take it. */
export type LabelWeightValue = "normal" | "bold";

/** How a node's size is read: as a multiplier of the shape's own geometry, or as its largest extent. */
export type NodeSizeModeValue = NonNullable<NonNullable<NodeStyleConfig["shape"]>["sizeMode"]>;

/** Every node size mode, in schema order. */
const NODE_SIZE_MODE_VALUES: readonly NodeSizeModeValue[] = NodeSizeModes.options;

/** A line style a node border can be drawn in. */
export type NodeBorderStyleValue = NonNullable<NonNullable<NodeStyleConfig["border"]>["style"]>;

/** Every node shape, in schema order. */
const NODE_SHAPE_VALUES: readonly NodeShapeValue[] = NodeShapes.options;

/** Every line pattern, in schema order. */
const EDGE_LINE_VALUES: readonly EdgeLineValue[] = EdgeLineTypes.options;

/** Every arrow, in schema order. */
const ARROW_VALUES: readonly ArrowValue[] = EdgeArrowTypes.options;

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
    "node.sizeMode": NodeSizeModeValue;
    "node.shape": NodeShapeValue;
    "node.label": string;
    "node.labelStyle": LabelStyle;
    "node.labelColor": ColorValue;
    "node.labelSize": number;
    "node.labelFont": string;
    "node.labelWeight": LabelWeightValue;
    "node.labelItalic": boolean;
    "node.tooltip": string;
    "node.tooltipStyle": LabelStyle;
    "node.opacity": number;
    "node.outline": ColorValue;
    "node.glow": ColorValue;
    "node.glowStrength": number;
    "node.halo": boolean;
    "node.haloColor": ColorValue;
    "node.haloScale": number;
    "node.haloOpacity": number;
    "node.wireframe": boolean;
    "node.flat": boolean;
    "node.unlit": boolean;
    "node.marker": never;
    "node.width": number;
    "node.height": number;
    "node.depth": number;
    "node.planar": boolean;
    "node.zIndex": number;
    "node.drawOrder": number;
    "node.borderColor": ColorValue;
    "node.borderWidth": number;
    "node.borderStyle": NodeBorderStyleValue;
    "node.cornerRadius": number;
    "edge.color": ColorValue;
    "edge.width": number;
    "edge.opacity": number;
    "edge.bandColor": ColorValue;
    "edge.bandWidth": number;
    "edge.bandOpacity": number;
    "edge.style": EdgeLineValue;
    "edge.patternCount": number;
    "edge.curvature": boolean;
    "edge.bends": string;
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
    "node.visible": boolean;
    "node.labelBackground": ColorValue;
    "node.tooltipSize": number;
    "node.tooltipColor": ColorValue;
    "node.tooltipBackground": ColorValue;
    "edge.visible": boolean;
    "edge.labelSize": number;
    "edge.labelColor": ColorValue;
    "edge.labelBackground": ColorValue;
    "edge.arrowHeadTextSize": number;
    "edge.arrowHeadTextColor": ColorValue;
    "edge.arrowHeadTextBackground": ColorValue;
    "edge.arrowTailTextSize": number;
    "edge.arrowTailTextColor": ColorValue;
    "edge.arrowTailTextBackground": ColorValue;
    "edge.labelFont": string;
    "edge.labelWeight": LabelWeightValue;
    "edge.labelItalic": boolean;
    "node.shader": string;
    "node.shaderParams": ShaderParamSets;
    "node.effects": ShaderEffects;
    "edge.shader": string;
    "edge.shaderParams": ShaderParamSets;
    "edge.effects": ShaderEffects;
    "edge.taper": number;
    "edge.lift": number;
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
    | "node.haloColor"
    | "node.labelColor"
    | "node.labelBackground"
    | "node.borderColor"
    | "node.tooltipColor"
    | "node.tooltipBackground"
    | "edge.color"
    | "edge.bandColor"
    | "edge.arrowHeadColor"
    | "edge.arrowTailColor"
    | "edge.labelColor"
    | "edge.labelBackground"
    | "edge.arrowHeadTextColor"
    | "edge.arrowHeadTextBackground"
    | "edge.arrowTailTextColor"
    | "edge.arrowTailTextBackground";

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
export type ChannelValueKind =
    | "color"
    | "number"
    | "text"
    | "boolean"
    | "enum"
    | "labelStyle"
    | "nothing"
    /** A shader id from the catalog, of the kinds `shaderKinds` lists, or `"none"`. @since 3.36.0 */
    | "shader"
    /** Parameter values per shader id, merged by id then by parameter. @since 3.36.0 */
    | "shaderParams"
    /** Effects by id, merged by id then by parameter. @since 3.36.0 */
    | "shaderEffects";

/** One channel: what it paints, what it accepts, and what the renderer really does with it. */
export interface ChannelDescriptor {
    /** The channel's name, which is its identity everywhere. */
    readonly channel: Channel;
    /** Whether it paints nodes or edges. */
    readonly target: "node" | "edge";
    /** The name a person reads. */
    readonly plainName: string;
    /**
     * The name a person reads once the target is already said, in sentence case: "Marker" where
     * {@link plainName} is "Node Marker". What a style editor writes beside the control, in a
     * panel that already says it is styling nodes.
     */
    readonly shortName: string;
    /** Which group of a style editor the channel sits in. */
    readonly group: ChannelGroup;
    /**
     * The value the element draws when no layer sets the channel: the element's own default
     * style where it states one, and otherwise what the renderer draws for an unset value. A
     * colour is `#RRGGBB`. Absent when an unset channel draws nothing at all -- no label, no
     * tooltip -- or when the renderer decides per element, as the pattern count does. An effect
     * that is off until a layer switches it on (the outline, the glow) states what it is drawn
     * with once on and its own value is unset: the renderer's built-in colour and strength.
     * An arrow cap's colour is the one channel that leans on another: unset, a cap is drawn in its
     * line's colour, so its default is the line's default and a layer that sets `edge.color`
     * moves it too.
     */
    readonly default?: string | number | boolean;
    /** The kind of value it accepts. */
    readonly accepts: ChannelValueKind;
    /** Every value it accepts, when `accepts` is "enum". */
    readonly values?: readonly string[];
    /** The smallest value the renderer draws, when `accepts` is "number". */
    readonly min?: number;
    /**
     * Whether `min` itself is refused, so a value must be above it: a node of size 0 draws nothing,
     * so a control that offers 0 lets a reader hide every node by accident. Absent when `min` is
     * a value the renderer draws.
     * @since 3.26.0
     */
    readonly exclusiveMin?: boolean;
    /** The largest value the renderer draws, when `accepts` is "number" and it is bounded. */
    readonly max?: number;
    /**
     * How many of this channel's numbers make one world unit, on a channel that is a length in the
     * scene rather than on screen: 48 for a label size, so a label of size 48 draws one line,
     * margins included, one world unit tall -- the diameter of a sphere node of size 1 -- and its
     * height on screen follows the zoom. Absent on a channel that is not such a length.
     * @since 3.26.0
     */
    readonly perWorldUnit?: number;
    /** Where the value lands in a parsed node or edge style, as a dotted path. */
    readonly stylePath: string;
    /** Whether the element draws this channel at all today. */
    readonly renderable: boolean;
    /**
     * What the renderer narrows or does not do -- why nothing is drawn when `renderable` is
     * false, and what is lost when it is true. Absent when the channel is drawn as declared.
     */
    readonly caveat?: string;
    /**
     * Why the channel cannot be set, as a sentence for a reader beside a disabled control.
     * Present exactly when `renderable` is false; `caveat` is the longer note for an
     * implementer. The same field name as `OptionDescriptor.unsupportedReason`.
     */
    readonly unsupportedReason?: string;
    /**
     * The value that draws nothing, on an effect that is off until a layer switches it on: the
     * outline's and the glow's `"none"`, the animation's 0, and a text background's `"none"` where
     * the text has no background color of its own. Written by a layer, it covers what the
     * layers beneath write for that channel, as `LabelStyle.enabled: false` does for a label.
     * Absent on a channel with no such value.
     * @since 3.26.0
     */
    readonly off?: string | number;
    /**
     * The channel whose value this one takes while no layer sets it: an arrowhead's colour is its
     * edge's colour until a layer gives it one of its own. Absent on a channel that takes only its
     * own `default`.
     * @since 3.26.0
     */
    readonly follows?: Channel;
    /**
     * How far one keyboard or scrub step moves the value, on a channel that carries a number: a
     * hundredth on a channel bounded by 1 (an opacity), 1 on a count or a label size, a tenth on
     * every other length. Absent on a channel that carries no number.
     * @since 3.26.0
     */
    readonly step?: number;
    /**
     * What {@link ChannelDescriptor.caveat} says, as a code an application words: see
     * {@link ChannelCaveatCode}. Absent on a channel whose caveat has no code yet.
     * @since 3.26.0
     */
    readonly caveatCode?: ChannelCaveatCode;
    /**
     * The channel whose drawn part this one adjusts, on a channel that is a sub-setting of
     * another: a band's width and opacity modify `edge.bandColor`, an arrowhead's size, colour and
     * opacity modify `edge.arrowHead`, a label's size, colour, background and style modify its
     * words (`node.label`). A style editor offers one item per drawn part -- the channels with no
     * `modifies` -- and the channels that modify it as that part's settings. Absent on a channel
     * that is a part of its own.
     * @since 3.26.0
     */
    readonly modifies?: Channel;
    /**
     * The kinds of shader the channel names, on a shader channel: what a picker offers for it.
     * Absent on every other channel.
     * @since 3.36.0
     */
    readonly shaderKinds?: readonly ShaderKind[];
}

/**
 * A caveat a channel carries, as a code.
 *
 * - `"outline.sharedWidth"`: every outline is drawn at one width, the graph's
 *   `layoutBehavior.node.outlineWidth`; a layer sets an outline's colour and not its width.
 *
 * More codes may be added in a minor release.
 * @since 3.26.0
 */
export type ChannelCaveatCode = "outline.sharedWidth";

/**
 * The groups a style editor sorts channels into. A node's channels sit in shape, color, effects
 * and text; an edge's in line, arrows and text.
 */
export type ChannelGroup = "shape" | "color" | "effects" | "text" | "line" | "arrows";

/** What `node.shader` takes to draw no shader: the plain shape, covering a shader beneath. */
export const SHADER_NONE = "none";

/** What an effect colour channel takes to draw nothing: see {@link ChannelDescriptor.off}. */
export const EFFECT_OFF = "none";

/**
 * The value a repaint carries for an effect written off: a colour whose hex is "none", known by
 * identity, so the painter writes nothing for it and no real colour (not even a transparent
 * black) is ever mistaken for it.
 */
export const OFF_COLOR: ColorValue = Object.freeze({ r: 0, g: 0, b: 0, a: 0, hex: EFFECT_OFF });

/** What an edge band is, read by `edge.bandColor`. */
const BAND_CAVEAT =
    "A wider line drawn behind the edge's own, so the line keeps its paint down the middle and " +
    "the band shows on both sides as a casing.";

/** The colour an outline is drawn in when a style switches one on without naming a colour. */
export const DEFAULT_OUTLINE_COLOR = "#FFFF00";

/**
 * The glow color to start from when switching a glow on: the `node.glow` channel's default. A glow
 * is drawn only when a style names a color (a strength alone draws nothing), so a consumer that
 * turns glow on writes this color. Cyan rather than white: the glow is drawn around the node over the element's light (#F5F5F5)
 * canvas, where a white glow would not be seen. A saturated cyan leaves a visible halo there.
 */
export const DEFAULT_GLOW_COLOR = "#00B4FF";

/**
 * What the four halo channels draw, written once and read by each of them.
 */
const NODE_HALO_CAVEAT =
    "The halo is the selection highlight -- the node's own shape, scaled about its center -- drawn " +
    "on any node a layer picks. Any of its color, scale or opacity switches it on; `node.halo` " +
    "alone switches it on in the selection's look, and false takes it off, even off a selected " +
    "node. A selected node a layer gives a halo shows one halo: each value the layer sets wins, " +
    "and the selection style (`selectionStyle`) gives the rest. Each distinct color and opacity " +
    "is its own source mesh; the scale is per node.";

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
    "An outline has a colour and no width. It is drawn as a ring around the node whose width is " +
    "a fixed share of the node's own size, so every outline is drawn at that width whatever a " +
    "style asks for -- which is why the node style declares no outline width to ask with. The " +
    "outline's COLOUR is per style.";

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
/**
 * What an edge animation speed can and cannot move.
 *
 * Only one of the element's line renderers carries a moving texture: the one that draws a
 * straight solid line in 3D. A two-dimensional line, a bezier and all eight patterned line types
 * are built by renderers that have nothing to run along them, so a speed set on one of those is
 * accepted and the line stays still.
 *
 * The number is a MULTIPLE of the element's own pace rather than a distance or a frequency. One
 * is that pace, two is twice it, a half is half, and zero is the value that switches the
 * animation off and draws a flat line.
 */
const EDGE_ANIMATION_CAVEAT =
    "An edge animates only where it is a straight solid line in 3D; a 2D line, a bezier and a " +
    "patterned line have no moving texture to run. The value is a multiple of the element's own " +
    "pace -- 1 is that pace, 2 is twice it -- and 0 draws a flat line.";

const ARROW_CAPTION_CAVEAT =
    "A caption hangs from the cap at that end of the edge, so an end drawn with no arrow carries " +
    'none: a tail caption needs `edge.arrowTail` set to something other than "none". The words ' +
    "are what switch a caption on, so a layer that writes only the caption's appearance and no " +
    "words draws nothing.";

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
    "on, so a layer that writes only the tooltip's appearance and no words draws nothing. " +
    "Only a NODE has a tooltip; `edge.tooltip` was withdrawn in 2.0 because an edge cannot be hovered.";

/**
 * The colour an edge's line is drawn in by default, which is also the colour of both arrow caps:
 * an unset cap colour follows the line it caps.
 */
const EDGE_LINE_DEFAULT_COLOR =
    typeof defaultEdgeStyle.line?.color === "string" ? colorToHex(defaultEdgeStyle.line.color) : undefined;

/** The six channels of one arrow end: `edge.arrowHead`, `edge.arrowHeadSize` and so on. */
type ArrowEndChannel<End extends "Head" | "Tail"> =
    `edge.arrow${End}${"" | "Size" | "Color" | "Opacity" | "Text" | "TextStyle"}`;

/**
 * The six channels of one arrow end, in table order. The head's and the tail's differ only in
 * their names, their style paths and the tail's type default (an edge of a directed graph draws a
 * head and no tail),
 * so they are written once here and a change to one end cannot miss the other.
 * @param end - Which end of the edge.
 * @returns The end's channels: type, size, colour, opacity, caption and caption style.
 */
function arrowEndChannels<End extends "Head" | "Tail">(end: End): Record<ArrowEndChannel<End>, ChannelDescriptor> {
    const id = (suffix: string): { channel: Channel; target: "edge" } => ({
        channel: `edge.arrow${end}${suffix}` as Channel,
        target: "edge",
    });
    const rows: ChannelDescriptor[] = [
        {
            ...id(""),
            plainName: `Arrow ${end}`,
            shortName: end,
            group: "arrows",
            // The head's default is what a DIRECTED graph draws; an undirected graph draws no
            // head until a layer sets one (see `EDGE_BASE_DIRECTED` in StylePainter).
            default: end === "Tail" ? "none" : "normal",
            accepts: "enum",
            values: ARROW_VALUES,
            stylePath: `arrow${end}.type`,
            renderable: true,
        },
        {
            ...id("Size"),
            plainName: `Arrow ${end} Size`,
            shortName: `${end} size`,
            group: "arrows",
            default: 1,
            accepts: "number",
            min: 0,
            stylePath: `arrow${end}.size`,
            renderable: true,
        },
        {
            ...id("Color"),
            plainName: `Arrow ${end} Color`,
            shortName: `${end} color`,
            group: "arrows",
            default: EDGE_LINE_DEFAULT_COLOR,
            accepts: "color",
            // Edge.ts draws an arrow in `arrow<End>.color ?? line.color`.
            follows: "edge.color",
            stylePath: `arrow${end}.color`,
            renderable: true,
        },
        {
            ...id("Opacity"),
            plainName: `Arrow ${end} Opacity`,
            shortName: `${end} opacity`,
            group: "arrows",
            default: 1,
            accepts: "number",
            min: 0,
            max: 1,
            stylePath: `arrow${end}.opacity`,
            renderable: true,
        },
        {
            ...id("Text"),
            plainName: `Arrow ${end} Caption`,
            shortName: `${end} caption`,
            group: "arrows",
            accepts: "text",
            stylePath: `arrow${end}.text.text`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
        {
            ...id("TextStyle"),
            plainName: `Arrow ${end} Caption Style`,
            shortName: `${end} caption style`,
            group: "arrows",
            accepts: "labelStyle",
            stylePath: `arrow${end}.text`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
    ];

    return Object.fromEntries(rows.map((row) => [row.channel, row])) as Record<ArrowEndChannel<End>, ChannelDescriptor>;
}

/** The label channels that write one field of a label style. */
type LabelFieldChannel<Target extends "node" | "edge"> =
    `${Target}.label${"Color" | "Size" | "Font" | "Weight" | "Italic"}`;

/** The field of a label style each label field channel writes, by the channel's suffix. */
const LABEL_FIELD_OF_SUFFIX = {
    Color: "color",
    Size: "sizePx",
    Font: "font",
    Weight: "weight",
    Italic: "italic",
} as const satisfies Record<string, keyof LabelStyle>;

/** A label style field one channel writes on its own. */
export type LabelFieldName = (typeof LABEL_FIELD_OF_SUFFIX)[keyof typeof LABEL_FIELD_OF_SUFFIX];

/**
 * The five label field channels of one target: color, size, font, weight and italic.
 *
 * Each is ONE FIELD of the label style, which is what lets a rule drive it: a whole label style
 * is a bag of fields no scale produces, while a size is a number a column can be read into. The
 * value lands in the same label style `labelStyle` writes, field by field, so a layer that binds
 * `node.labelSize` above a layer that sets `node.labelStyle` changes the size and nothing else.
 * Like `labelStyle`, none carries a default: unset, a label is not drawn at all.
 * @param target - Nodes or edges.
 * @returns The channels.
 */
function labelFieldChannels<Target extends "node" | "edge">(
    target: Target,
): Record<LabelFieldChannel<Target>, ChannelDescriptor> {
    const Target = target === "node" ? "Node" : "Edge";
    const row = (
        suffix: keyof typeof LABEL_FIELD_OF_SUFFIX,
        words: string,
        rest: Pick<ChannelDescriptor, "accepts"> & Partial<ChannelDescriptor>,
    ): ChannelDescriptor => ({
        channel: `${target}.label${suffix}` as Channel,
        target,
        plainName: `${Target} Label ${words}`,
        shortName: `Label ${words.toLowerCase()}`,
        group: "text",
        stylePath: `label.${LABEL_STYLE_PATH_OF_SUFFIX[suffix]}`,
        renderable: true,
        ...rest,
    });
    const rows = [
        row("Color", "Color", { accepts: "color" }),
        // No minimum: a channel takes exactly the numbers its schema path (`label.fontSize`) takes.
        row("Size", "Size", { accepts: "number" }),
        row("Font", "Font", { accepts: "text" }),
        row("Weight", "Weight", { accepts: "enum", values: LABEL_WEIGHT_VALUES }),
        row("Italic", "Italic", { accepts: "boolean" }),
    ];

    return Object.fromEntries(rows.map((entry) => [entry.channel, entry])) as Record<
        LabelFieldChannel<Target>,
        ChannelDescriptor
    >;
}

/** Where each label field lands in a parsed style's label block, in the renderer's spelling. */
const LABEL_STYLE_PATH_OF_SUFFIX: Readonly<Record<keyof typeof LABEL_FIELD_OF_SUFFIX, string>> = {
    Color: "textColor",
    Size: "fontSize",
    Font: "font",
    Weight: "fontWeight",
    Italic: "fontStyle",
};

/** Every weight the `labelWeight` channels take. */
const LABEL_WEIGHT_VALUES: readonly LabelWeightValue[] = ["normal", "bold"];

/**
 * Where a label field channel writes: the label style channel it lands in and the field.
 * @param channel - Any channel.
 * @returns The style channel and the field, or undefined for a channel that is not a label field.
 */
export function labelFieldOf(channel: Channel): { readonly into: Channel; readonly field: LabelFieldName } | undefined {
    const match = /^(node|edge)\.label(Color|Size|Font|Weight|Italic)$/.exec(channel);

    if (match === null) {
        return undefined;
    }

    const suffix = match[2] as keyof typeof LABEL_FIELD_OF_SUFFIX;

    return { into: `${match[1]}.labelStyle` as Channel, field: LABEL_FIELD_OF_SUFFIX[suffix] };
}

/**
 * The label style one painted label field stands for: `{ sizePx: 12 }` for a size of 12.
 * @param field - The field.
 * @param painted - What the field's channel painted; a color arrives resolved.
 * @returns The one-field label style.
 */
export function labelPatchOf(field: LabelFieldName, painted: unknown): LabelStyle {
    const color = field === "color" ? asColorValue(painted) : null;

    return { [field]: color === null ? painted : color.hex };
}

/**
 * Stack one label style over another, field by field, the way the repaint does.
 *
 * A layer that names one field has said nothing about the others: `{color}` stacked over
 * `{sizePx: 24}` is a red label at 24 px, not a red label at the default size. A field set to
 * undefined says nothing either. The result is a new object whenever there is something beneath,
 * because a painted value is shared by every element its layer painted.
 * @param held - What the layers beneath painted, or undefined.
 * @param over - What this layer paints.
 * @returns The merged label style.
 */
export function mergeLabelStyle(held: unknown, over: object): object {
    if (typeof held !== "object" || held === null) {
        return over;
    }

    const merged: Record<string, unknown> = { ...held };

    for (const [field, value] of Object.entries(over)) {
        if (value !== undefined) {
            merged[field] = value;
        }
    }

    return merged;
}

/**
 * What a node border is, written once and read by its three channels.
 */
const NODE_BORDER_CAVEAT =
    "A border is a ring drawn OUTSIDE the node's outline, so it never covers the fill, and an edge " +
    "stops at its outer edge. Its width is in the units of `node.size` and is drawn only when it is " +
    "above 0. A flat shape's border follows its outline in every view; a solid's follows the " +
    "outline it shows from the front and turns to face the camera in a 3D view. Unlike " +
    "`node.outline`, which is a screen-space glow of one fixed width, a border scales with the node.";

/** How a reader says a node measures along each axis. */
const EXTENT_ADJECTIVE = { width: "wide", height: "tall", depth: "deep" } as const;

/**
 * One of the three channels that set a node's drawn extent along an axis.
 * @param name - The channel's last word: width, height or depth.
 * @param axis - The axis it measures along.
 * @returns The descriptor.
 */
function extentChannel(name: "width" | "height" | "depth", axis: "x" | "y" | "z"): ChannelDescriptor {
    const title = `${name[0].toUpperCase()}${name.slice(1)}`;

    return {
        channel: `node.${name}`,
        target: "node",
        plainName: `Node ${title}`,
        shortName: title,
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: `shape.${name}`,
        renderable: true,
        caveat:
            `The node's drawn extent along ${axis}, in the units of \`node.size\`: a node of ${name} 4 ` +
            `is as ${EXTENT_ADJECTIVE[name]} as a node of size 4 is across. ` +
            "Unset, the node keeps its shape's own proportions at its size.",
    };
}

/**
 * What hiding an element by style does and does not do, read by both `visible` channels.
 *
 * A style can take an element off the picture and nothing more. The element stays in the graph:
 * it is counted, laid out, kept in the selection and measured by every run, unlike an element a
 * visibility filter removes. Only its drawing (and so its picking) stops.
 */
const VISIBLE_CAVEAT =
    "Hiding by style stops the drawing only: the element is still counted, laid out, selectable " +
    "and measured, and a hidden element cannot be clicked because nothing is drawn to click. A " +
    "visibility filter is what takes an element out of the graph on screen.";

/**
 * A label's size per world unit: the label plane is `size / 48` world units tall per line
 * (`RichTextLabel`), so the default 48 draws a line as tall as a size-1 sphere node.
 */
const LABEL_SIZE_PER_WORLD_UNIT = 48;

/**
 * The three looks of one block of words that vary per element: size, text colour and background.
 *
 * The same three fields sit in the block's label style; these channels exist so a layer can bind
 * them to a value (label size by degree), which a label style -- one shared bag of fields -- cannot.
 * Written after the block's label style, so a bound size wins over a size the style names.
 * @param base - The block's channel, such as `node.label` or `edge.arrowHeadText`.
 * @param target - What the block belongs to.
 * @param block - Where the block's style sits, such as `label` or `arrowHead.text`.
 * @param plainName - The block's name a person reads, such as "Node Label".
 * @param shortName - The same, once the target is said, in sentence case, such as "Label".
 * @param caveat - The block's own caveat, when it has one.
 * @param background - The panel the block is drawn on by default, when it has one (a tooltip's white).
 * @returns The three descriptors.
 */
function textLookChannels<Base extends string>(
    base: Base,
    target: "node" | "edge",
    block: string,
    plainName: string,
    shortName: string,
    caveat?: string,
    background?: string,
): Record<`${Base}${"Size" | "Color" | "Background"}`, ChannelDescriptor> {
    const shared = { target, group: "text" as const, renderable: true, ...(caveat === undefined ? {} : { caveat }) };
    const rows: ChannelDescriptor[] = [
        {
            ...shared,
            channel: `${base}Size` as Channel,
            plainName: `${plainName} Size`,
            shortName: `${shortName} size`,
            default: LABEL_SIZE_PER_WORLD_UNIT,
            accepts: "number",
            // No min: the channel takes every number its style schema takes. A size under 1 draws
            // no text (MIN_DRAWN_FONT_SIZE), and a layer that writes one is told W_TEXT_TOO_SMALL.
            perWorldUnit: LABEL_SIZE_PER_WORLD_UNIT,
            stylePath: `${block}.fontSize`,
        },
        {
            ...shared,
            channel: `${base}Color` as Channel,
            plainName: `${plainName} Text Color`,
            shortName: `${shortName} text color`,
            default: "#000000",
            accepts: "color",
            stylePath: `${block}.textColor`,
        },
        {
            ...shared,
            channel: `${base}Background` as Channel,
            plainName: `${plainName} Background`,
            shortName: `${shortName} background`,
            // With no background color of its own, the text is drawn on nothing: "none" says so.
            ...(background === undefined ? { off: EFFECT_OFF } : { default: background }),
            accepts: "color",
            stylePath: `${block}.backgroundColor`,
        },
    ];

    return Object.fromEntries(rows.map((row) => [row.channel, row])) as Record<
        `${Base}${"Size" | "Color" | "Background"}`,
        ChannelDescriptor
    >;
}

/** The two `visible` channels and the bindable text looks, keyed by channel. */
const LOOK_AND_VISIBILITY = {
    "node.visible": {
        channel: "node.visible",
        target: "node",
        plainName: "Node Visible",
        shortName: "Shown",
        group: "shape",
        default: true,
        accepts: "boolean",
        stylePath: "visible",
        renderable: true,
        caveat: VISIBLE_CAVEAT,
    } satisfies ChannelDescriptor,
    ...textLookChannels("node.label", "node", "label", "Node Label", "Label"),
    ...textLookChannels("node.tooltip", "node", "tooltip", "Node Tooltip", "Tooltip", NODE_TOOLTIP_CAVEAT, "#FFFFFF"),
    "edge.visible": {
        channel: "edge.visible",
        target: "edge",
        plainName: "Edge Visible",
        shortName: "Shown",
        group: "line",
        default: true,
        accepts: "boolean",
        stylePath: "visible",
        renderable: true,
        caveat: VISIBLE_CAVEAT,
    } satisfies ChannelDescriptor,
    ...textLookChannels("edge.label", "edge", "label", "Edge Label", "Label"),
    ...textLookChannels(
        "edge.arrowHeadText",
        "edge",
        "arrowHead.text",
        "Arrow Head Caption",
        "Head caption",
        ARROW_CAPTION_CAVEAT,
    ),
    ...textLookChannels(
        "edge.arrowTailText",
        "edge",
        "arrowTail.text",
        "Arrow Tail Caption",
        "Tail caption",
        ARROW_CAPTION_CAVEAT,
    ),
};

/** What the shader channels draw, written once and read by all six. */
const SHADER_CAVEAT =
    "A shader decides the color of each pixel of what it is drawn on. `shader` names the surface " +
    'or sprite drawn (the highest layer wins; "none" draws the plain shape), `shaderParams` the ' +
    "parameters per shader id (only the drawn shader's set applies), and `effects` the effects by " +
    "id, which stack instead of replacing each other, at most four per element.";

/** Where each shader channel lands in a parsed style's `shader` block. */
const SHADER_STYLE_FIELD = { shader: "id", shaderParams: "params", effects: "effects" } as const;

/**
 * The three shader channels of one target.
 * @param target - Nodes or edges.
 * @param drawn - The kinds `shader` and `shaderParams` name.
 * @param effects - The kinds `effects` names.
 * @returns The channels, keyed by name.
 */
function shaderChannels<T extends "node" | "edge">(
    target: T,
    drawn: readonly ShaderKind[],
    effects: readonly ShaderKind[],
): Record<`${T}.${"shader" | "shaderParams" | "effects"}`, ChannelDescriptor> {
    const title = target === "node" ? "Node" : "Edge";
    const row = (
        name: "shader" | "shaderParams" | "effects",
        accepts: ChannelValueKind,
        plainName: string,
        kinds: readonly ShaderKind[],
    ): ChannelDescriptor => ({
        channel: `${target}.${name}` as Channel,
        target,
        plainName: `${title} ${plainName}`,
        shortName: plainName,
        // An edge's look sits in its line group: the surface is the line's pattern, an effect
        // runs along the line.
        group: target === "node" ? "effects" : "line",
        accepts,
        stylePath: `shader.${SHADER_STYLE_FIELD[name]}`,
        renderable: true,
        caveat: SHADER_CAVEAT,
        shaderKinds: kinds,
        ...(name === "shader" ? { off: SHADER_NONE, default: SHADER_NONE } : {}),
    });

    return {
        [`${target}.shader`]: row("shader", "shader", "Shader", drawn),
        [`${target}.shaderParams`]: row("shaderParams", "shaderParams", "Shader parameters", drawn),
        [`${target}.effects`]: row("effects", "shaderEffects", "Effects", effects),
    } as Record<`${T}.${"shader" | "shaderParams" | "effects"}`, ChannelDescriptor>;
}

/**
 * Every channel as declared, before the defaults the element's default styles state are read in.
 *
 * The table is keyed by channel, so a channel added to the union without an entry here is a
 * compile error rather than a channel nothing knows how to paint.
 */
const DECLARED: Readonly<Record<Channel, ChannelDescriptor>> = {
    "node.color": {
        channel: "node.color",
        target: "node",
        plainName: "Node Color",
        shortName: "Color",
        group: "color",
        accepts: "color",
        stylePath: "texture.color",
        renderable: true,
    },
    "node.size": {
        channel: "node.size",
        target: "node",
        plainName: "Node Size",
        shortName: "Size",
        group: "shape",
        accepts: "number",
        min: 0,
        exclusiveMin: true,
        stylePath: "shape.size",
        renderable: true,
    },
    "node.sizeMode": {
        channel: "node.sizeMode",
        target: "node",
        plainName: "Node Size Mode",
        shortName: "Size mode",
        group: "shape",
        default: "scale",
        accepts: "enum",
        values: NODE_SIZE_MODE_VALUES,
        stylePath: "shape.sizeMode",
        renderable: true,
    },
    "node.shape": {
        channel: "node.shape",
        target: "node",
        plainName: "Node Shape",
        shortName: "Type",
        group: "shape",
        accepts: "enum",
        values: NODE_SHAPE_VALUES,
        stylePath: "shape.type",
        renderable: true,
    },
    "node.label": {
        channel: "node.label",
        target: "node",
        plainName: "Node Label",
        shortName: "Label",
        group: "text",
        accepts: "text",
        stylePath: "label.text",
        renderable: true,
    },
    "node.labelStyle": {
        channel: "node.labelStyle",
        target: "node",
        plainName: "Node Label Style",
        shortName: "Label style",
        group: "text",
        accepts: "labelStyle",
        stylePath: "label",
        renderable: true,
    },
    ...labelFieldChannels("node"),
    "node.tooltip": {
        channel: "node.tooltip",
        target: "node",
        plainName: "Node Tooltip",
        shortName: "Tooltip",
        group: "text",
        accepts: "text",
        stylePath: "tooltip.text",
        renderable: true,
        caveat: NODE_TOOLTIP_CAVEAT,
    },
    "node.tooltipStyle": {
        channel: "node.tooltipStyle",
        target: "node",
        plainName: "Node Tooltip Style",
        shortName: "Tooltip style",
        group: "text",
        accepts: "labelStyle",
        stylePath: "tooltip",
        renderable: true,
        caveat: NODE_TOOLTIP_CAVEAT,
    },
    "node.opacity": {
        channel: "node.opacity",
        target: "node",
        plainName: "Node Opacity",
        shortName: "Opacity",
        group: "color",
        default: 1,
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
        shortName: "Outline",
        group: "effects",
        // The colour an outline is drawn in when a style switches one on without naming one.
        default: DEFAULT_OUTLINE_COLOR,
        accepts: "color",
        stylePath: "effect.outline.color",
        off: EFFECT_OFF,
        renderable: true,
        caveat: NODE_OUTLINE_CAVEAT,
        caveatCode: "outline.sharedWidth",
    },
    "node.glow": {
        channel: "node.glow",
        target: "node",
        plainName: "Node Glow",
        shortName: "Glow",
        group: "effects",
        // The color to start a glow with. A glow is drawn only once a style names a color.
        default: DEFAULT_GLOW_COLOR,
        accepts: "color",
        stylePath: "effect.glow.color",
        off: EFFECT_OFF,
        renderable: true,
    },
    "node.glowStrength": {
        channel: "node.glowStrength",
        target: "node",
        plainName: "Node Glow Strength",
        shortName: "Glow strength",
        group: "effects",
        // What a glow with no strength is drawn at (NodeEffects). A strength of 0 draws no glow.
        default: 1,
        accepts: "number",
        min: 0,
        stylePath: "effect.glow.strength",
        renderable: true,
    },
    "node.halo": {
        channel: "node.halo",
        target: "node",
        plainName: "Node Halo",
        shortName: "Halo",
        group: "effects",
        accepts: "boolean",
        stylePath: "effect.halo.enabled",
        renderable: true,
        caveat: NODE_HALO_CAVEAT,
    },
    "node.haloColor": {
        channel: "node.haloColor",
        target: "node",
        plainName: "Node Halo Color",
        shortName: "Halo color",
        group: "effects",
        default: DEFAULT_SELECTION_STYLE.color,
        accepts: "color",
        stylePath: "effect.halo.color",
        renderable: true,
        caveat: NODE_HALO_CAVEAT,
    },
    "node.haloScale": {
        channel: "node.haloScale",
        target: "node",
        plainName: "Node Halo Scale",
        shortName: "Halo scale",
        group: "effects",
        default: DEFAULT_SELECTION_STYLE.scale,
        accepts: "number",
        min: 0,
        stylePath: "effect.halo.scale",
        renderable: true,
        caveat: NODE_HALO_CAVEAT,
    },
    "node.haloOpacity": {
        channel: "node.haloOpacity",
        target: "node",
        plainName: "Node Halo Opacity",
        shortName: "Halo opacity",
        group: "effects",
        default: DEFAULT_SELECTION_STYLE.opacity,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "effect.halo.opacity",
        renderable: true,
        caveat: NODE_HALO_CAVEAT,
    },
    "node.wireframe": {
        channel: "node.wireframe",
        target: "node",
        plainName: "Node Wireframe",
        shortName: "Wireframe",
        group: "effects",
        default: false,
        accepts: "boolean",
        stylePath: "effect.wireframe",
        renderable: true,
    },
    "node.flat": {
        channel: "node.flat",
        target: "node",
        plainName: "Node Flat Shading",
        shortName: "Flat shaded",
        group: "effects",
        default: false,
        accepts: "boolean",
        stylePath: "effect.flatShaded",
        renderable: true,
        caveat:
            "Flat shading gives every triangle one normal, so a curved shape (sphere, cylinder, " +
            "cone, capsule, torus) is lit as visible facets; on a sphere they are a few pixels wide " +
            "until a node is drawn large. A shape already drawn with flat faces " +
            "(box, the polyhedra, icosphere, goldberg, geodesic) looks the same either way, and in " +
            "2D nodes are drawn unlit, so it changes nothing there.",
    },
    "node.unlit": {
        channel: "node.unlit",
        target: "node",
        plainName: "Node Unlit",
        shortName: "Unlit",
        group: "effects",
        default: false,
        accepts: "boolean",
        stylePath: "effect.unlit",
        renderable: true,
        caveat:
            "An unlit node is drawn in its own color everywhere, with no light and no shade, so a " +
            "sphere reads as a flat dot. In 2D every node is drawn unlit already, so it changes " +
            "nothing there.",
    },
    "node.marker": {
        channel: "node.marker",
        target: "node",
        plainName: "Node Marker",
        shortName: "Marker",
        group: "effects",
        unsupportedReason: "The element draws no marker yet",
        accepts: "nothing",
        stylePath: "texture.icon",
        renderable: false,
        caveat:
            "The element draws no marker. texture.icon is in the node schema and no renderer " +
            "reads it, and the badge vocabulary belongs to a label rather than to a node.",
    },
    "node.width": extentChannel("width", "x"),
    "node.height": extentChannel("height", "y"),
    "node.depth": extentChannel("depth", "z"),
    "node.planar": {
        channel: "node.planar",
        target: "node",
        plainName: "Node Planar",
        shortName: "Planar",
        group: "shape",
        default: false,
        accepts: "boolean",
        stylePath: "shape.planar",
        renderable: true,
        caveat:
            "A planar node is drawn thin along z, as a flat shape facing a 2D camera, even in a 3D " +
            "view. The flat shapes (rectangle, ellipse, diamond and the rest) are always drawn thin, " +
            "in 2D and 3D views alike; this makes a solid shape thin too.",
    },
    "node.zIndex": {
        channel: "node.zIndex",
        target: "node",
        plainName: "Node Z-Index",
        shortName: "Z-index",
        group: "shape",
        default: 0,
        accepts: "number",
        min: -1000,
        max: 0,
        stylePath: "shape.zIndex",
        renderable: true,
        caveat:
            "Drawing order in a 2D view, from -1000 to 0. A node below 0 is drawn " +
            "behind every edge and every node with a higher z-index, so a group (compound) node " +
            "drawn at -1 never hides its members. 3D views draw by real depth and ignore it.",
    },
    "node.drawOrder": {
        channel: "node.drawOrder",
        target: "node",
        plainName: "Node Draw Order",
        shortName: "Draw order",
        group: "shape",
        accepts: "number",
        min: 0,
        max: 100,
        stylePath: "shape.drawOrder",
        renderable: true,
        caveat:
            "Which of two overlapping nodes is drawn on top in a 2D view, from 0 to 100: the higher " +
            "one. Every node with a draw order is drawn in front of the edges, and in front of every " +
            "node with none; a node with none is drawn as it always was. Only nodes at z-index 0 " +
            "are ordered, and 3D views draw by real depth and ignore it. Each distinct value is its " +
            "own source mesh, so a few levels keep instancing cheap.",
    },
    "node.borderColor": {
        channel: "node.borderColor",
        target: "node",
        plainName: "Node Border Color",
        shortName: "Border color",
        group: "shape",
        default: "#000000",
        accepts: "color",
        stylePath: "border.color",
        renderable: true,
        caveat: NODE_BORDER_CAVEAT,
    },
    "node.borderWidth": {
        channel: "node.borderWidth",
        target: "node",
        plainName: "Node Border Width",
        shortName: "Border width",
        group: "shape",
        default: 0,
        accepts: "number",
        min: 0,
        stylePath: "border.width",
        renderable: true,
        caveat: NODE_BORDER_CAVEAT,
    },
    "node.borderStyle": {
        channel: "node.borderStyle",
        target: "node",
        plainName: "Node Border Style",
        shortName: "Border style",
        group: "shape",
        default: "solid",
        accepts: "enum",
        values: NodeBorderStyles.options,
        stylePath: "border.style",
        renderable: true,
        caveat: NODE_BORDER_CAVEAT,
    },
    "node.cornerRadius": {
        channel: "node.cornerRadius",
        target: "node",
        plainName: "Node Corner Radius",
        shortName: "Corner radius",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "shape.cornerRadius",
        renderable: true,
        caveat:
            "The largest radius of a round-rectangle's corners, in the units of `node.size`. Unset, " +
            "the corners are a quarter of the shorter side; set, they are never larger than that, so " +
            "a large box keeps small corners. Other shapes ignore it.",
    },
    "edge.color": {
        channel: "edge.color",
        target: "edge",
        plainName: "Edge Color",
        shortName: "Color",
        group: "line",
        accepts: "color",
        stylePath: "line.color",
        renderable: true,
    },
    "edge.width": {
        channel: "edge.width",
        target: "edge",
        plainName: "Edge Width",
        shortName: "Width",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.width",
        renderable: true,
    },
    "edge.opacity": {
        channel: "edge.opacity",
        target: "edge",
        plainName: "Edge Opacity",
        shortName: "Opacity",
        group: "line",
        default: 1,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "line.opacity",
        renderable: true,
    },
    "edge.bandColor": {
        channel: "edge.bandColor",
        target: "edge",
        plainName: "Edge Band Color",
        shortName: "Band",
        group: "line",
        // The selection look's blue: a band is drawn only once a layer names a colour.
        default: "#0077BB",
        accepts: "color",
        stylePath: "band.color",
        off: EFFECT_OFF,
        renderable: true,
        caveat: BAND_CAVEAT,
    },
    "edge.bandWidth": {
        channel: "edge.bandWidth",
        target: "edge",
        plainName: "Edge Band Width",
        shortName: "Band width",
        group: "line",
        // A multiple of twice the line's own width, as the selection look's edgeScale.
        default: 2.5,
        accepts: "number",
        min: 0,
        stylePath: "band.scale",
        renderable: true,
    },
    "edge.bandOpacity": {
        channel: "edge.bandOpacity",
        target: "edge",
        plainName: "Edge Band Opacity",
        shortName: "Band opacity",
        group: "line",
        default: 1,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "band.opacity",
        renderable: true,
    },
    "edge.style": {
        channel: "edge.style",
        target: "edge",
        plainName: "Edge Line Pattern",
        shortName: "Line",
        group: "line",
        accepts: "enum",
        values: EDGE_LINE_VALUES,
        stylePath: "line.type",
        renderable: true,
    },
    "edge.patternCount": {
        channel: "edge.patternCount",
        target: "edge",
        plainName: "Edge Pattern Count",
        shortName: "Pattern count",
        group: "line",
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
        shortName: "Curved",
        group: "line",
        default: false,
        accepts: "boolean",
        stylePath: "line.bezier",
        renderable: true,
        caveat:
            "A switch, not an amount: the renderer offsets its control points by a fixed " +
            "fraction of the edge's length, so how far an edge bows cannot be set.",
    },
    "edge.bends": {
        channel: "edge.bends",
        target: "edge",
        plainName: "Edge Bends",
        shortName: "Bends",
        group: "line",
        accepts: "text",
        stylePath: "line.bends",
        renderable: true,
        caveat:
            "The points the edge's route passes through, as `along,across` pairs separated by spaces: " +
            "`along` is the fraction of the way from the source node's center to the target's, " +
            "`across` the distance to the left of that line as a fraction of its length. The edge is " +
            "drawn as straight segments through them, with rounded corners when it is also curved.",
    },
    ...arrowEndChannels("Head"),
    ...arrowEndChannels("Tail"),
    "edge.animationSpeed": {
        channel: "edge.animationSpeed",
        target: "edge",
        plainName: "Edge Animation Speed",
        shortName: "Animation",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.animationSpeed",
        off: 0,
        renderable: true,
        caveat: EDGE_ANIMATION_CAVEAT,
    },
    "edge.label": {
        channel: "edge.label",
        target: "edge",
        plainName: "Edge Label",
        shortName: "Label",
        group: "text",
        accepts: "text",
        stylePath: "label.text",
        renderable: true,
    },
    "edge.labelStyle": {
        channel: "edge.labelStyle",
        target: "edge",
        plainName: "Edge Label Style",
        shortName: "Label style",
        group: "text",
        accepts: "labelStyle",
        stylePath: "label",
        renderable: true,
    },
    ...LOOK_AND_VISIBILITY,
    ...labelFieldChannels("node"),
    ...labelFieldChannels("edge"),
    // A label's size and color are declared twice: as label field channels (which land in the
    // label style field by field) and as text look channels. The look rows win, because they state
    // the size and color an unset label is drawn with, and the size's unit; the field routing
    // (`labelFieldOf`) goes by the channel's name and holds either way.
    "node.labelSize": LOOK_AND_VISIBILITY["node.labelSize"],
    "node.labelColor": LOOK_AND_VISIBILITY["node.labelColor"],
    "edge.labelSize": LOOK_AND_VISIBILITY["edge.labelSize"],
    "edge.labelColor": LOOK_AND_VISIBILITY["edge.labelColor"],
    ...shaderChannels("node", ["node-surface", "node-sprite"], ["node-effect"]),
    ...shaderChannels("edge", ["edge-surface"], ["edge-effect"]),
    "edge.taper": {
        channel: "edge.taper",
        target: "edge",
        plainName: "Edge Taper",
        shortName: "Taper",
        group: "line",
        default: 1,
        accepts: "number",
        min: 0,
        max: 4,
        stylePath: "line.taper",
        renderable: true,
        caveat:
            "The width at the target as a multiple of the width at the source: 1 draws the line " +
            "the same width all along, below 1 narrows it toward the target, above 1 widens it. " +
            "The arrowhead sits at the target, where the line arrives at its tapered width. A patterned " +
            "line drawn as separate elements (star, diamond, box, dash-dot, zigzag, sinewave) does " +
            "not taper.",
    },
    "edge.lift": {
        channel: "edge.lift",
        target: "edge",
        plainName: "Edge Lift",
        shortName: "Lift",
        group: "line",
        default: 0,
        accepts: "number",
        stylePath: "line.lift",
        renderable: true,
        caveat:
            "How far the middle of the edge's route rises out of the layout plane, in world units, " +
            "as an arc. Drawn only for a flat layout in the 3D view; anywhere else the edge is drawn " +
            "flat and the layer reports `edge.lift-needs-flat-layout` as drawing nothing.",
    },
};

/**
 * Read what sits at one dotted path of a style object.
 * @param style - The style, or anything at all.
 * @param path - The dotted path a channel declares, such as `texture.color`.
 * @returns What sits there, or undefined when any step of the path is missing.
 */
export function atStylePath(style: unknown, path: string): unknown {
    let held = style;

    for (const segment of path.split(".")) {
        if (typeof held !== "object" || held === null) {
            return undefined;
        }

        held = (held as Record<string, unknown>)[segment];
    }

    return held;
}

/**
 * What the element's own default style says for one channel, as a descriptor default.
 *
 * READ, NOT RESTATED, which is the same rule the element's base layers follow: the default node
 * colour lives in `defaultNodeStyle`, and a second copy of it here would go on describing the old
 * colour the day that one changes. Only a channel the default style says nothing about carries a
 * `default` in the table above -- what the renderer draws when nothing is set.
 * @param descriptor - The declared descriptor.
 * @returns The default, or undefined when the default style says nothing for this channel.
 */
function shippedDefault(descriptor: ChannelDescriptor): string | number | boolean | undefined {
    if (!descriptor.renderable) {
        return undefined;
    }

    const value = atStylePath(descriptor.target === "node" ? defaultNodeStyle : defaultEdgeStyle, descriptor.stylePath);

    if (descriptor.accepts === "color") {
        return typeof value === "string" ? colorToHex(value) : undefined;
    }

    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : undefined;
}

/** Which drawn part each sub-setting channel adjusts: see {@link ChannelDescriptor.modifies}. */
const MODIFIES: ReadonlyMap<string, Channel> = new Map<string, Channel>([
    ["node.glowStrength", "node.glow"],
    ["node.haloScale", "node.haloColor"],
    ["node.haloOpacity", "node.haloColor"],
    ["edge.bandWidth", "edge.bandColor"],
    ["edge.bandOpacity", "edge.bandColor"],
    ["edge.patternCount", "edge.style"],
    ...(["Head", "Tail"] as const).flatMap((end) => [
        ...["Size", "Color", "Opacity"].map((suffix): [string, Channel] => [
            `edge.arrow${end}${suffix}`,
            `edge.arrow${end}` as Channel,
        ]),
        ...["TextStyle", "TextSize", "TextColor", "TextBackground"].map((suffix): [string, Channel] => [
            `edge.arrow${end}${suffix}`,
            `edge.arrow${end}Text` as Channel,
        ]),
    ]),
    ...(["node.label", "node.tooltip", "edge.label"] as const).flatMap((base) =>
        ["Style", "Size", "Color", "Background"].map((suffix): [string, Channel] => [`${base}${suffix}`, base]),
    ),
]);

/**
 * How far one step moves a number channel: see {@link ChannelDescriptor.step}.
 * @param descriptor - The declared descriptor.
 * @returns The step, or undefined for a channel that carries no number.
 */
function stepOf(descriptor: ChannelDescriptor): number | undefined {
    if (descriptor.accepts !== "number") {
        return undefined;
    }

    if (descriptor.max === 1) {
        return 0.01;
    }

    return descriptor.perWorldUnit !== undefined || descriptor.channel === "edge.patternCount" ? 1 : 0.1;
}

/**
 * Every channel, with what the element actually does with it and what a style editor needs to
 * draw a row for it: a short name, a group, the default it opens on, and why it cannot be set.
 *
 * The defaults are read from the element's default styles once, when this module loads.
 */
export const CHANNEL_DESCRIPTORS: Readonly<Record<Channel, ChannelDescriptor>> = Object.fromEntries(
    Object.values(DECLARED).map((descriptor): [Channel, ChannelDescriptor] => {
        const value = shippedDefault(descriptor) ?? descriptor.default;
        const step = descriptor.step ?? stepOf(descriptor);
        const modifies = MODIFIES.get(descriptor.channel);

        return [
            descriptor.channel,
            {
                ...descriptor,
                ...(value === undefined ? {} : { default: value }),
                ...(step === undefined ? {} : { step }),
                ...(modifies === undefined ? {} : { modifies }),
            },
        ];
    }),
) as Record<Channel, ChannelDescriptor>;

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
    return CHANNELS.map((channel) => CHANNEL_DESCRIPTORS[channel]).filter((descriptor) => descriptor.target === target);
}

/**
 * Channels an earlier build saved under another name, by old name. Only a document being read
 * consults this: the channel set, `channelDescriptor` and every document the element writes use
 * the new name.
 */
const RENAMED_CHANNELS: Readonly<Record<string, Channel>> = {
    // Same drawn part and units (`effect.halo.scale`, times the node's radius): only the name moved.
    "node.haloSize": "node.haloScale",
};

/**
 * A saved layer with any renamed channel read under its current name, so a document an earlier
 * build wrote opens with the look it was saved with. Where a layer names both, the current name wins.
 * @param spec - A layer as a document holds it.
 * @returns The same layer when it names no old channel, otherwise a copy that names the new ones.
 */
export function readRenamedChannels<T extends { readonly set?: object; readonly encode?: object }>(spec: T): T {
    const rename = (entries: object | undefined): object | undefined => {
        if (entries === undefined || !Object.keys(entries).some((key) => key in RENAMED_CHANNELS)) {
            return entries;
        }

        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(entries)) {
            const current = RENAMED_CHANNELS[key] ?? key;
            if (current === key || !(current in entries)) {
                out[current] = value;
            }
        }

        return out;
    };
    const set = rename(spec.set);
    const encode = rename(spec.encode);

    return set === spec.set && encode === spec.encode
        ? spec
        : { ...spec, ...(set === undefined ? {} : { set }), ...(encode === undefined ? {} : { encode }) };
}

// ---------------------------------------------------------------------------------------------
// Shader maps: merged by id, then by parameter
// ---------------------------------------------------------------------------------------------

/** The most effects drawn on one element. */
export const EFFECT_CAP = 4;

/** Where each merged effects map keeps how high each of its effects was last written. */
const EFFECT_HEIGHTS = Symbol("graphty.effectHeights");

/** A merged effects map, carrying the heights of its entries out of sight of `Object.entries`. */
type HeightedEffects = Record<string, ShaderParams | boolean> & { [EFFECT_HEIGHTS]?: Map<string, number> };

/**
 * Whether a channel's values are maps merged by id: `shaderParams` and `effects`.
 * @param channel - The channel.
 * @returns True for the four map channels.
 */
export function isShaderMapChannel(channel: string): boolean {
    return /^(?:node|edge)\.(?:shaderParams|effects)$/.test(channel);
}

/**
 * Stack one parameter set over another, the higher winning per parameter, into a fresh object
 * with no prototype.
 * @param held - The parameters beneath, or undefined.
 * @param over - The parameters this layer writes.
 * @returns The merged parameters.
 */
function mergeParams(held: unknown, over: object): Record<string, unknown> {
    const merged = Object.create(null) as Record<string, unknown>;
    if (typeof held === "object" && held !== null) {
        Object.assign(merged, held);
    }

    for (const [name, value] of Object.entries(over)) {
        if (value !== undefined) {
            merged[name] = value;
        }
    }

    return merged;
}

/**
 * Stack one `shaderParams` map over another: by shader id, then by parameter.
 * @param held - What the layers beneath painted, or undefined.
 * @param over - What this layer paints.
 * @returns The merged map, a fresh object with no prototype.
 */
export function mergeShaderParams(held: unknown, over: object): ShaderParamSets {
    if (typeof held !== "object" || held === null) {
        // Nothing beneath: the layer's own map, which preparation already made prototype-free.
        return over as ShaderParamSets;
    }

    const merged = Object.create(null) as Record<string, ShaderParams>;
    Object.assign(merged, held);

    for (const [id, params] of Object.entries(over)) {
        if (typeof params === "object" && params !== null) {
            merged[id] = mergeParams(merged[id], params) as ShaderParams;
        }
    }

    return merged;
}

/**
 * The height each entry of an effects map was last written at.
 * @param map - The map.
 * @returns The heights; an entry never stacked over sits at 0.
 */
function heightsOf(map: unknown): Map<string, number> {
    return (map as HeightedEffects | undefined)?.[EFFECT_HEIGHTS] ?? new Map<string, number>();
}

/**
 * Stack one `effects` map over another: by effect id, then by parameter. `false` switches an
 * effect off, `true` turns it on keeping the parameters beneath, an object turns it on and merges
 * its parameters. Each entry keeps the place its id first appeared (bottom layer first) and
 * records the height it was last turned on at, which decides which effects draw past the cap.
 * @param held - What the layers beneath painted, or undefined.
 * @param over - What this layer paints.
 * @returns The merged map, a fresh object with no prototype.
 */
export function mergeEffects(held: unknown, over: object): ShaderEffects {
    if (typeof held !== "object" || held === null) {
        // Nothing beneath: the layer's own map, every entry at the first height.
        return over as ShaderEffects;
    }

    const merged = Object.create(null) as HeightedEffects;
    const before = heightsOf(held);
    const heights = new Map(before);
    const height = Math.max(0, ...before.values()) + 1;
    Object.assign(merged, held);

    for (const [id, value] of Object.entries(over)) {
        const beneath = merged[id];
        if (value === false) {
            merged[id] = false;
            continue;
        }

        if (value === true) {
            merged[id] = typeof beneath === "object" ? beneath : true;
        } else if (typeof value === "object" && value !== null) {
            merged[id] = mergeParams(typeof beneath === "object" ? beneath : undefined, value) as ShaderParams;
        }

        heights.set(id, height);
    }

    Object.defineProperty(merged, EFFECT_HEIGHTS, { value: heights, enumerable: false });

    return merged;
}

/**
 * The effects an element draws from its merged map: every entry that is on and not hidden by
 * `visible: false`, at most {@link EFFECT_CAP}, the highest-written kept, in the order their ids
 * first appeared.
 * @param effects - The merged map, or undefined.
 * @returns The drawn effects with their parameters, and how many were left out by the cap.
 */
export function drawnEffects(effects: ShaderEffects | undefined): {
    readonly drawn: readonly (readonly [string, ShaderParams])[];
    readonly left: number;
} {
    if (effects === undefined) {
        return { drawn: [], left: 0 };
    }

    const heights = heightsOf(effects);
    const on = Object.entries(effects).filter(
        ([, value]) => value !== false && !(typeof value === "object" && value.visible === false),
    );
    const kept = new Set(
        [...on]
            .map(([id], order) => ({ id, order, height: heights.get(id) ?? 0 }))
            .sort((a, b) => b.height - a.height || b.order - a.order)
            .slice(0, EFFECT_CAP)
            .map((entry) => entry.id),
    );
    const drawn = on
        .filter(([id]) => kept.has(id))
        .map(([id, value]): readonly [string, ShaderParams] => [id, value === true ? {} : (value as ShaderParams)]);

    return { drawn, left: on.length - drawn.length };
}

/**
 * Stack a value over what lies beneath on a channel whose values merge field by field: a label
 * style, a parameter map or an effects map.
 * @param channel - The channel.
 * @param held - What the layers beneath painted, or undefined.
 * @param over - What this layer paints.
 * @returns The merged value.
 */
export function mergeChannelValue(channel: string, held: unknown, over: object): object {
    if (channel.endsWith(".shaderParams")) {
        return mergeShaderParams(held, over);
    }

    return channel.endsWith(".effects") ? mergeEffects(held, over) : mergeLabelStyle(held, over);
}

/** Where a parameter address points: the map channel, the shader and the parameter. */
export interface ShaderParamTarget {
    /** The map channel the value lands in. */
    readonly channel: Channel;
    /** The shader or effect id. */
    readonly shader: string;
    /** The parameter id. */
    readonly param: string;
}

/**
 * Read an `encode` key that addresses one shader parameter:
 * `"<target>.<shaderParams|effects>.<shader id>.<parameter id>"`.
 * @param name - The key.
 * @returns Where it points, or null when it is not a parameter address.
 */
export function parseShaderParamAddress(name: string): ShaderParamTarget | null {
    const match = /^(node|edge)\.(shaderParams|effects)\.(.+)\.([^./]+)$/.exec(name);
    if (match === null) {
        return null;
    }

    return { channel: `${match[1]}.${match[2]}` as Channel, shader: match[3], param: match[4] };
}

/**
 * A shader map as the repaint holds it: a deep copy with no prototype anywhere, so no key can
 * reach `Object.prototype` however it is spelled.
 * @param value - A map a layer wrote, already checked.
 * @returns The copy.
 */
export function prototypeFreeMap(value: object): Record<string, unknown> {
    const copy = Object.create(null) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(value)) {
        copy[key] = typeof entry === "object" && entry !== null ? prototypeFreeMap(entry) : entry;
    }

    return copy;
}
