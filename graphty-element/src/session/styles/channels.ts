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

import type { LabelDeclutterOrder } from "../../catalog/label-style";
import type { Channel, EdgeLinePattern, LabelStyle, Rgba } from "../../catalog/types";
import { colorToHex } from "../../config/common";
import { defaultEdgeStyle, EdgeArrowTypes, EdgeLineTypes, type EdgeStyleConfig } from "../../config/EdgeStyle";
import {
    defaultNodeStyle,
    NodeBorderPositions,
    NodeBorderStyles,
    NodeLabelFits,
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

/** How a node's size is read: as the common node extent, or as the shape's largest extent. */
export type NodeSizeModeValue = NonNullable<NonNullable<NodeStyleConfig["shape"]>["sizeMode"]>;

/** Every node size mode, in schema order. */
const NODE_SIZE_MODE_VALUES: readonly NodeSizeModeValue[] = NodeSizeModes.options;

/** How a node grows to hold its label: its padded label box inside its outline, or as its bounds. */
export type NodeLabelFitValue = NonNullable<NonNullable<NodeStyleConfig["shape"]>["labelFit"]>;

/** How an edge's gradient runs (`edge.gradientKind`): along the line, out from its middle, or none. */
/** How a node's image is sized against the node. */
export type NodeImageFitValue = NonNullable<NonNullable<NodeStyleConfig["image"]>["fit"]>;
/** Whether and which way a node's image is tiled. */
export type NodeImageRepeatValue = NonNullable<NonNullable<NodeStyleConfig["image"]>["repeat"]>;
/** Whether a node's image is kept inside the node's outline. */
export type NodeImageClipValue = NonNullable<NonNullable<NodeStyleConfig["image"]>["clip"]>;
/** Which way a node's stripes follow one another. */
export type NodeStripeDirectionValue = NonNullable<NonNullable<NodeStyleConfig["stripes"]>["direction"]>;
/** How a curved edge is drawn through its bends (`edge.bendCurve`): corners rounded, or through the midpoints. */
export type EdgeBendCurveValue = NonNullable<NonNullable<EdgeStyleConfig["line"]>["bendCurve"]>;
export type EdgeGradientKindValue = NonNullable<NonNullable<NonNullable<EdgeStyleConfig["line"]>["gradient"]>["kind"]>;

/** A line style a node border can be drawn in. */
export type NodeBorderStyleValue = NonNullable<NonNullable<NodeStyleConfig["border"]>["style"]>;

/** Where a node border sits against the node's size. @public */
export type NodeBorderPositionValue = NonNullable<NonNullable<NodeStyleConfig["border"]>["position"]>;

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
    "node.labelLetterSize": number;
    "node.labelFont": string;
    "node.labelWeight": LabelWeightValue;
    "node.labelItalic": boolean;
    "node.labelWrapWidth": number;
    "node.labelWrapTrailingSpace": boolean;
    "node.labelMinScreenSize": number;
    "node.labelOnTop": boolean;
    "node.labelDeclutter": LabelDeclutterOrder;
    "node.labelRotation": number;
    "node.labelBackground": ColorValue;
    "node.labelOutline": ColorValue;
    "node.labelOutlineWidth": number;
    "node.tooltip": string;
    "node.tooltipStyle": LabelStyle;
    "node.opacity": number;
    "node.outline": ColorValue;
    "node.glow": ColorValue;
    "node.glowStrength": number;
    "node.wireframe": boolean;
    "node.flat": boolean;
    "node.marker": never;
    "node.width": number;
    "node.height": number;
    "node.depth": number;
    "node.planar": boolean;
    "node.zIndex": number;
    "node.drawOrder": number;
    "node.borderColor": ColorValue;
    "node.borderWidth": number;
    "node.borderScreenWidth": number;
    "node.borderOpacity": number;
    "node.borderStyle": NodeBorderStyleValue;
    "node.borderPosition": NodeBorderPositionValue;
    "node.outerBorderColor": ColorValue;
    "node.outerBorderWidth": number;
    "node.outerBorderOpacity": number;
    "node.outerBorderStyle": NodeBorderStyleValue;
    "node.outerBorderOffset": number;
    "node.cornerRadius": number;
    "node.exactCornerRadius": boolean;
    "node.underlayColor": ColorValue;
    "node.underlayOpacity": number;
    "node.underlayPadding": number;
    "node.underlayShape": NodeShapeValue;
    "node.underlayCornerRadius": number;
    "node.overlayColor": ColorValue;
    "node.overlayOpacity": number;
    "node.overlayPadding": number;
    "node.overlayShape": NodeShapeValue;
    "node.overlayCornerRadius": number;
    "node.shapePoints": string;
    "node.shapeStretchPoints": boolean;
    "node.labelFit": NodeLabelFitValue;
    "node.labelPaddingX": number;
    "node.labelPaddingY": number;
    "node.labelFitSquare": boolean;
    "node.gradientColor": ColorValue;
    "node.gradientDirection": number;
    "node.image": string;
    "node.imageFallback": string;
    "node.imageFit": NodeImageFitValue;
    "node.imageWidth": number;
    "node.imageHeight": number;
    "node.imagePixelSize": number;
    "node.imagePositionX": number;
    "node.imagePositionY": number;
    "node.imageOffsetX": number;
    "node.imageOffsetY": number;
    "node.imageRepeat": NodeImageRepeatValue;
    "node.imageClip": NodeImageClipValue;
    "node.imageSmoothing": boolean;
    "node.imageOpacity": number;
    "node.glyph": string;
    "node.glyphFont": string;
    "node.glyphSize": number;
    "node.glyphWeight": number;
    "node.glyphColor": ColorValue;
    "node.pieColors": string;
    "node.pieSizes": string;
    "node.pieOpacities": string;
    "node.pieRadius": number;
    "node.pieHole": number;
    "node.pieRotation": number;
    "node.pieFitBox": boolean;
    "node.pieOffsetX": number;
    "node.pieOffsetY": number;
    "node.stripeColors": string;
    "node.stripeSizes": string;
    "node.stripeOpacities": string;
    "node.stripeDirection": NodeStripeDirectionValue;
    "node.stripeSize": number;
    "edge.color": ColorValue;
    "edge.width": number;
    "edge.opacity": number;
    "edge.outlineColor": ColorValue;
    "edge.outlineWidth": number;
    "edge.outlineOpacity": number;
    "edge.underlayColor": ColorValue;
    "edge.underlayOpacity": number;
    "edge.underlayPadding": number;
    "edge.overlayColor": ColorValue;
    "edge.overlayOpacity": number;
    "edge.overlayPadding": number;
    "edge.gradientColors": string;
    "edge.gradientStops": string;
    "edge.gradientKind": EdgeGradientKindValue;
    "edge.style": EdgeLineValue;
    "edge.patternCount": number;
    "edge.curvature": boolean;
    "edge.bends": string;
    "edge.fanSpacing": number;
    "edge.fanned": boolean;
    "edge.bendCurve": EdgeBendCurveValue;
    "edge.arcRadius": number;
    "edge.sourcePort": string;
    "edge.targetPort": string;
    "edge.arrowHead": ArrowValue;
    "edge.arrowHeadSize": number;
    "edge.arrowHeadWidth": number;
    "edge.arrowHeadPosition": number;
    "edge.arrowHeadColor": ColorValue;
    "edge.arrowHeadOpacity": number;
    "edge.arrowHeadImage": string;
    "edge.arrowHeadText": string;
    "edge.arrowHeadTextStyle": LabelStyle;
    "edge.arrowHeadTextSize": number;
    "edge.arrowHeadTextLetterSize": number;
    "edge.arrowHeadTextDistance": number;
    "edge.arrowTail": ArrowValue;
    "edge.arrowTailSize": number;
    "edge.arrowTailWidth": number;
    "edge.arrowTailPosition": number;
    "edge.arrowTailColor": ColorValue;
    "edge.arrowTailOpacity": number;
    "edge.arrowTailImage": string;
    "edge.arrowTailText": string;
    "edge.arrowTailTextStyle": LabelStyle;
    "edge.arrowTailTextSize": number;
    "edge.arrowTailTextLetterSize": number;
    "edge.arrowTailTextDistance": number;
    "edge.arrowMiddleHead": ArrowValue;
    "edge.arrowMiddleHeadSize": number;
    "edge.arrowMiddleHeadWidth": number;
    "edge.arrowMiddleHeadPosition": number;
    "edge.arrowMiddleHeadColor": ColorValue;
    "edge.arrowMiddleHeadOpacity": number;
    "edge.arrowMiddleHeadImage": string;
    "edge.arrowMiddleTail": ArrowValue;
    "edge.arrowMiddleTailSize": number;
    "edge.arrowMiddleTailWidth": number;
    "edge.arrowMiddleTailPosition": number;
    "edge.arrowMiddleTailColor": ColorValue;
    "edge.arrowMiddleTailOpacity": number;
    "edge.arrowMiddleTailImage": string;
    "edge.animationSpeed": number;
    "edge.label": string;
    "edge.labelStyle": LabelStyle;
    "edge.labelColor": ColorValue;
    "edge.labelSize": number;
    "edge.labelLetterSize": number;
    "edge.labelFont": string;
    "edge.labelWeight": LabelWeightValue;
    "edge.labelItalic": boolean;
    "edge.labelWrapWidth": number;
    "edge.labelWrapTrailingSpace": boolean;
    "edge.labelMinScreenSize": number;
    "edge.labelOnTop": boolean;
    "edge.labelRotation": number;
    "edge.labelBackground": ColorValue;
    "edge.labelOutline": ColorValue;
    "edge.labelOutlineWidth": number;
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
    | "node.labelColor"
    | "node.borderColor"
    | "node.gradientColor"
    | "node.outerBorderColor"
    | "node.underlayColor"
    | "node.overlayColor"
    | "node.glyphColor"
    | "node.labelBackground"
    | "node.labelOutline"
    | "edge.color"
    | "edge.arrowHeadColor"
    | "edge.arrowTailColor"
    | "edge.arrowMiddleHeadColor"
    | "edge.arrowMiddleTailColor"
    | "edge.outlineColor"
    | "edge.underlayColor"
    | "edge.overlayColor"
    | "edge.labelColor"
    | "edge.labelBackground"
    | "edge.labelOutline";

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
     * outline, no glow -- or when the renderer decides per element, as the pattern count does.
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
    /**
     * Why the channel cannot be set, as a sentence for a reader beside a disabled control.
     * Present exactly when `renderable` is false; `caveat` is the longer note for an
     * implementer. The same field name as `OptionDescriptor.unsupportedReason`.
     */
    readonly unsupportedReason?: string;
}

/**
 * The groups a style editor sorts channels into. A node's channels sit in shape, color, effects
 * and text; an edge's in line, arrows and text.
 */
export type ChannelGroup = "shape" | "color" | "effects" | "text" | "line" | "arrows";

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

const EDGE_GRADIENT_CAVEAT =
    "Paints the line in a gradient over its `edge.color`: `edge.gradientColors` are CSS colors separated " +
    "by spaces, `edge.gradientStops` where each sits from 0 to 1 (unset, or not one per color: evenly " +
    'spaced), and `edge.gradientKind` "linear" from the source end to the target end, "radial" out from ' +
    'the line\'s middle to both ends, or "none". Fewer than two colors draw none. Drawn on solid lines.';

/** How an edge's gradient runs, or that it has none. */
const EDGE_GRADIENT_KIND_VALUES: readonly EdgeGradientKindValue[] = ["linear", "radial", "none"];
const EDGE_BEND_CURVE_VALUES: readonly EdgeBendCurveValue[] = ["corners", "midpoints", "bezier"];

const EDGE_OUTLINE_CAVEAT =
    "A band drawn under the edge's line along its whole length, `edge.outlineWidth` wider than the " +
    "line (half of it each side, in the line's width units), as Cytoscape.js draws a line outline and " +
    "vis-network an edge background. Drawn only with a width above 0, and under solid lines: a dotted " +
    "or dashed line drawn as separate pieces has none.";

const NODE_IMAGE_CAVEAT =
    "A picture drawn over the node's face from `node.image`, its URL (a data: URL too). " +
    '`node.imageFit` sizes it: "contain" keeps its proportions inside the node, "cover" over the whole ' +
    'node, "fill" stretches it, "none" draws it at `node.imageWidth` x `node.imageHeight` or its own ' +
    "pixels at `node.imagePixelSize` each. `node.imagePositionX` / `-Y` place it across the room left " +
    "(0 to 1), `node.imageOffsetX` / `-Y` move it (y down), in the units of `node.size`. A node of " +
    'shape "none" with an image is drawn as the image.';

const NODE_GLYPH_CAVEAT =
    "A character or short text drawn over the node's face, centered on it (vis-network's icon nodes): " +
    "`node.glyph` in the CSS font family `node.glyphFont` at `node.glyphSize` (the font's size in the units " +
    "of `node.size`; unset, the node's shorter side), CSS weight `node.glyphWeight`, in `node.glyphColor`. " +
    'A node of shape "none" with a glyph is drawn as the glyph.';

/** How a node's image is sized. */
const NODE_IMAGE_FIT_VALUES: readonly NodeImageFitValue[] = ["contain", "cover", "fill", "none"];
/** How a node's image is tiled. */
const NODE_IMAGE_REPEAT_VALUES: readonly NodeImageRepeatValue[] = ["no-repeat", "repeat", "repeat-x", "repeat-y"];
/** Whether a node's image is clipped to the node. */
const NODE_IMAGE_CLIP_VALUES: readonly NodeImageClipValue[] = ["node", "none"];
/** Which way a node's stripes run. */
const NODE_STRIPE_DIRECTION_VALUES: readonly NodeStripeDirectionValue[] = ["down", "right"];

const NODE_PIE_CAVEAT =
    "A pie chart over the node's face: `node.pieColors` are CSS colors separated by spaces, one slice " +
    "each, `node.pieSizes` each slice's share of the turn (fractions separated by spaces; a slice with " +
    "none shares what is left), `node.pieOpacities` each one's opacity. The disc is `node.pieRadius` " +
    "times half the node's shorter side (the ellipse filling the node with `node.pieFitBox`), " +
    "`node.pieHole` cuts out that fraction of the radius, and the slices run clockwise from " +
    "`node.pieRotation` degrees clockwise from 12 o'clock; `node.pieOffsetX` / `-Y` move its center (y down).";

const NODE_STRIPES_CAVEAT =
    "Bands of color over the node's face, inside its outline: `node.stripeColors`, `node.stripeSizes` " +
    'and `node.stripeOpacities` as a pie\'s, following one another top to bottom ("down") or left to ' +
    'right ("right", `node.stripeDirection`), over a box `node.stripeSize` times the node\'s.';

const NODE_OUTER_BORDER_CAVEAT =
    "A second ring outside the node's border, `node.outerBorderOffset` beyond the border's outer edge " +
    "(Cytoscape.js's outline): drawn only with a width above 0. Widths and the offset are in the units " +
    "of `node.borderWidth`. It is not `node.outline`, which is a highlight drawn over the node's rim.";

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

/** The eight channels of one arrow end: `edge.arrowHead`, `edge.arrowHeadSize` and so on. */
type ArrowEndChannel<End extends "Head" | "Tail"> =
    `edge.arrow${End}${"" | "Size" | "Width" | "Position" | "Color" | "Opacity" | "Image" | "Text" | "TextStyle" | "TextSize" | "TextLetterSize" | "TextDistance"}`;

/**
 * The eight channels of one arrow end, in table order. The head's and the tail's differ only in
 * their names, their style paths and the tail's type default (an edge draws a head and no tail),
 * so they are written once here and a change to one end cannot miss the other.
 * @param end - Which end of the edge.
 * @returns The end's channels: type, size, position, colour, opacity, caption and caption style.
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
            ...(end === "Tail" ? { default: "none" } : {}),
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
            ...id("Width"),
            plainName: `Arrow ${end} Width`,
            shortName: `${end} width`,
            group: "arrows",
            default: 1,
            accepts: "number",
            min: 0,
            stylePath: `arrow${end}.width`,
            renderable: true,
        },
        {
            ...id("Position"),
            plainName: `Arrow ${end} Position`,
            shortName: `${end} position`,
            group: "arrows",
            default: 0,
            accepts: "number",
            min: 0,
            max: 1,
            stylePath: `arrow${end}.position`,
            renderable: true,
        },
        {
            ...id("Color"),
            plainName: `Arrow ${end} Color`,
            shortName: `${end} color`,
            group: "arrows",
            default: EDGE_LINE_DEFAULT_COLOR,
            accepts: "color",
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
            ...id("Image"),
            plainName: `Arrow ${end} Image`,
            shortName: `${end} image`,
            group: "arrows",
            accepts: "text",
            stylePath: `arrow${end}.image`,
            renderable: true,
            caveat:
                "The picture an `image` cap draws, a URL or a data URL, standing on the line with its top " +
                "edge across the tip; a cap of another type ignores it.",
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
        {
            ...id("TextSize"),
            plainName: `Arrow ${end} Caption Size`,
            shortName: `${end} caption size`,
            group: "arrows",
            accepts: "number",
            stylePath: `arrow${end}.text.fontSize`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
        {
            ...id("TextLetterSize"),
            plainName: `Arrow ${end} Caption Letter Size`,
            shortName: `${end} caption letter size`,
            group: "arrows",
            accepts: "number",
            min: 0,
            stylePath: `arrow${end}.text.letterSize`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
        {
            ...id("TextDistance"),
            plainName: `Arrow ${end} Caption Distance`,
            shortName: `${end} caption distance`,
            group: "arrows",
            accepts: "number",
            stylePath: `arrow${end}.textDistance`,
            renderable: true,
            caveat:
                "Unset, the caption hangs beside the cap at this end. Set, it is centered on the line this " +
                "far from where the line leaves this end's node, in scene units, as Cytoscape.js draws its " +
                "source and target labels.",
        },
    ];

    return Object.fromEntries(rows.map((row) => [row.channel, row])) as Record<ArrowEndChannel<End>, ChannelDescriptor>;
}

/** The six channels of a cap drawn part-way along the line: `edge.arrowMiddleHead`, `edge.arrowMiddleHeadSize` and so on. */
type ArrowMidChannel<End extends "MiddleHead" | "MiddleTail"> =
    `edge.arrow${End}${"" | "Size" | "Width" | "Position" | "Color" | "Opacity" | "Image"}`;

/**
 * The channels of a cap drawn part-way along the line, pointing toward the target (`MiddleHead`) or the source
 * (`MiddleTail`): the end cap's own, less its caption, with no cap and the middle of the line by default.
 * @param end - Which of the two.
 * @returns Its channels: type, size, width, position, colour and opacity.
 */
function arrowMidChannels<End extends "MiddleHead" | "MiddleTail">(
    end: End,
): Record<ArrowMidChannel<End>, ChannelDescriptor> {
    const from = end === "MiddleHead" ? "Head" : "Tail";
    const plain = end === "MiddleHead" ? "Middle Head" : "Middle Tail";
    const rows = Object.values(arrowEndChannels(from))
        .filter((row) => !row.channel.slice(`edge.arrow${from}`.length).startsWith("Text"))
        .map((row): ChannelDescriptor => {
            const suffix = row.channel.slice(`edge.arrow${from}`.length);
            return {
                ...row,
                channel: `edge.arrow${end}${suffix}` as Channel,
                plainName: row.plainName.replace(`Arrow ${from}`, `Arrow ${plain}`),
                shortName: row.shortName.replace(from, plain),
                stylePath: row.stylePath?.replace(`arrow${from}`, `arrow${end}`),
                ...(suffix === "" ? { default: "none" } : {}),
                ...(suffix === "Position" ? { default: 0.5 } : {}),
            };
        });

    return Object.fromEntries(rows.map((row) => [row.channel, row])) as Record<ArrowMidChannel<End>, ChannelDescriptor>;
}

/** The label channels that write one field of a label style. */
type LabelFieldChannel<Target extends "node" | "edge"> =
    `${Target}.label${"Color" | "Size" | "LetterSize" | "Font" | "Weight" | "Italic" | "WrapWidth" | "WrapTrailingSpace" | "MinScreenSize" | "OnTop" | "Rotation" | "Background" | "Outline" | "OutlineWidth"}`;

/** The field of a label style each label field channel writes, by the channel's suffix. */
const LABEL_FIELD_OF_SUFFIX = {
    Color: "color",
    Size: "sizePx",
    LetterSize: "letterSize",
    Font: "font",
    Weight: "weight",
    Italic: "italic",
    WrapWidth: "wrapWidth",
    WrapTrailingSpace: "wrapTrailingSpace",
    MinScreenSize: "minScreenSize",
    OnTop: "onTop",
    Rotation: "rotation",
    Background: "background",
    Outline: "outline",
    OutlineWidth: "outlineWidth",
} as const satisfies Record<string, keyof LabelStyle>;

/** A label style field one channel writes on its own. */
export type LabelFieldName = (typeof LABEL_FIELD_OF_SUFFIX)[keyof typeof LABEL_FIELD_OF_SUFFIX] | "declutter";

/** Every order `node.labelDeclutter` takes. */
const LABEL_DECLUTTER_VALUES: readonly LabelDeclutterOrder[] = ["degree", "size"];

/**
 * The one label field channel of nodes alone: edge labels are never decluttered, so an
 * `edge.labelDeclutter` would paint nothing.
 */
const NODE_LABEL_DECLUTTER: ChannelDescriptor = {
    channel: "node.labelDeclutter",
    target: "node",
    plainName: "Node Label Declutter",
    shortName: "Label declutter",
    group: "text",
    stylePath: "label.declutter",
    renderable: true,
    accepts: "enum",
    values: LABEL_DECLUTTER_VALUES,
    caveat:
        "Hides the label where its words would overlap a node label kept before it: a selected " +
        "node's first, then the node with more edges (`degree`) or the larger label and then the " +
        "larger node (`size`). Decided again whenever the camera, a label or a node moves.",
};

/**
 * The six label field channels of one target: color, size, font, weight, italic and wrap width.
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
        row("LetterSize", "Letter Size", { accepts: "number", min: 0 }),
        row("Font", "Font", { accepts: "text" }),
        row("Weight", "Weight", { accepts: "enum", values: LABEL_WEIGHT_VALUES }),
        row("Italic", "Italic", { accepts: "boolean" }),
        row("WrapWidth", "Wrap Width", { accepts: "number", min: 0 }),
        row("WrapTrailingSpace", "Wrap Trailing Space", { accepts: "boolean" }),
        // Screen pixels, never scaled with the graph: a size below which the label is not drawn.
        row("MinScreenSize", "Min Screen Size", { accepts: "number", min: 0 }),
        row("OnTop", "On Top", { accepts: "boolean" }),
        row("Rotation", "Rotation", { accepts: "number" }),
        row("Background", "Background", {
            accepts: "color",
            caveat: "The color of a panel drawn behind the label's words, as a program's label background is.",
        }),
        // The outline's color switches it on; a width of 0 switches it off.
        row("Outline", "Outline", { accepts: "color" }),
        // No minimum: a channel takes exactly the numbers its schema path (`label.textOutlineWidth`) takes.
        row("OutlineWidth", "Outline Width", {
            accepts: "number",
            caveat:
                "How far the outline reaches out from each letter's edge, in pixels of the label drawn at its " +
                "own size (`labelSize`). 0 draws none.",
        }),
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
    LetterSize: "letterSize",
    Font: "font",
    Weight: "fontWeight",
    Italic: "fontStyle",
    WrapWidth: "wrapWidth",
    WrapTrailingSpace: "wrapTrailingSpace",
    MinScreenSize: "minScreenSize",
    OnTop: "onTop",
    Rotation: "rotation",
    Background: "backgroundColor",
    Outline: "textOutlineColor",
    OutlineWidth: "textOutlineWidth",
};

/** Every weight the `labelWeight` channels take. */
const LABEL_WEIGHT_VALUES: readonly LabelWeightValue[] = ["normal", "bold"];

/**
 * Where a label field channel writes: the label style channel it lands in and the field.
 * @param channel - Any channel.
 * @returns The style channel and the field, or undefined for a channel that is not a label field.
 */
export function labelFieldOf(channel: Channel): { readonly into: Channel; readonly field: LabelFieldName } | undefined {
    if (channel === "node.labelDeclutter") {
        return { into: "node.labelStyle", field: "declutter" };
    }

    const match =
        /^(node|edge)\.label(Color|Size|LetterSize|Font|Weight|Italic|WrapWidth|WrapTrailingSpace|MinScreenSize|OnTop|Rotation|Background|Outline|OutlineWidth)$/.exec(
            channel,
        );

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
    const color = field === "color" || field === "background" || field === "outline" ? asColorValue(painted) : null;

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
    "A border is a ring drawn OUTSIDE the node's fill, so it never covers it, and an edge " +
    "stops at its outer edge; `node.borderPosition` sets whether the fill is the node's size or shrinks inside it. Its width is in the units of `node.size` and is drawn only when it is " +
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
 * A label padding channel of a node that grows to hold its label.
 * @param axis - Which padding: "X" or "Y".
 * @param sides - The sides it is added on, in words.
 * @returns The descriptor.
 */
function labelPaddingChannel(axis: "X" | "Y", sides: string): ChannelDescriptor {
    return {
        channel: `node.labelPadding${axis}`,
        target: "node",
        plainName: `Node Label Padding ${axis}`,
        shortName: `Label padding ${axis}`,
        group: "shape",
        default: 0,
        accepts: "number",
        min: 0,
        stylePath: `shape.labelPadding${axis}`,
        renderable: true,
        caveat:
            `The space ${sides} the label's box, each, in the units of \`node.size\`, when the node ` +
            "grows to hold its label (`node.labelFit`). Without `node.labelFit` it changes nothing.",
    };
}

/** A node's or an edge's underlay (drawn beneath it) or overlay (drawn over it). */
type HaloKind = "underlay" | "overlay";

/** The channels of a node's underlay or overlay: `node.underlayColor` and so on. */
type NodeHaloChannel<K extends HaloKind> = `node.${K}${"Color" | "Opacity" | "Padding" | "Shape" | "CornerRadius"}`;

/** The channels of an edge's underlay or overlay: `edge.underlayColor` and so on. */
type EdgeHaloChannel<K extends HaloKind> = `edge.${K}${"Color" | "Opacity" | "Padding"}`;

/**
 * The channels of an underlay (a filled band or shape drawn beneath a node or an edge, Cytoscape.js
 * `underlay-*`) or an overlay (the same drawn over it, `overlay-*`): its color, its opacity, how far
 * it reaches past the element, and for a node its shape and corner radius.
 * @param target - Nodes or edges.
 * @param kind - Beneath or over.
 * @returns The channels, in table order.
 */
function haloChannels(target: "node" | "edge", kind: HaloKind): ChannelDescriptor[] {
    const Kind = kind === "underlay" ? "Underlay" : "Overlay";
    const where = kind === "underlay" ? "beneath" : "over";
    const at = target === "node" ? kind : `line.${kind}`;
    const caveat =
        target === "node"
            ? `A filled shape drawn ${where} the node, \`node.${kind}Padding\` beyond its box on every side ` +
              `(in the units of \`node.size\`), as Cytoscape.js draws its ${kind}. Drawn only with an ` +
              "opacity above 0; unset, its shape is the node's own."
            : `A band drawn ${where} the edge's line along its whole length, twice \`edge.${kind}Padding\` ` +
              `wide (in the line's width units) whatever the line's own width, as Cytoscape.js draws its ` +
              `${kind}. Drawn only with an opacity above 0.`;
    const row = (suffix: string, rest: Partial<ChannelDescriptor>): ChannelDescriptor =>
        ({
            channel: `${target}.${kind}${suffix}` as Channel,
            target,
            plainName: `${target === "node" ? "Node" : "Edge"} ${Kind} ${suffix.replace(/([a-z])([A-Z])/g, "$1 $2")}`,
            shortName: `${Kind} ${suffix.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}`,
            group: target === "node" ? "shape" : "line",
            stylePath: `${at}.${suffix.charAt(0).toLowerCase()}${suffix.slice(1)}`,
            renderable: true,
            caveat,
            ...rest,
        }) as ChannelDescriptor;
    const rows = [
        row("Color", { default: "#000000", accepts: "color" }),
        row("Opacity", { default: 0, accepts: "number", min: 0, max: 1 }),
        row("Padding", { default: 0, accepts: "number", min: 0 }),
    ];
    if (target === "node") {
        rows.push(
            row("Shape", { accepts: "enum", values: NODE_SHAPE_VALUES }),
            row("CornerRadius", { accepts: "number", min: 0 }),
        );
    }
    return rows;
}

/**
 * The halo channels keyed by name, for the table.
 * @param target - Nodes or edges.
 * @param kind - Beneath or over.
 * @returns The descriptors by channel.
 */
function haloRows<K extends HaloKind>(
    target: "node" | "edge",
    kind: K,
): Record<NodeHaloChannel<K> | EdgeHaloChannel<K>, ChannelDescriptor> {
    return Object.fromEntries(haloChannels(target, kind).map((row) => [row.channel, row])) as Record<
        NodeHaloChannel<K> | EdgeHaloChannel<K>,
        ChannelDescriptor
    >;
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
    "node.labelDeclutter": NODE_LABEL_DECLUTTER,
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
        accepts: "color",
        stylePath: "effect.outline.color",
        renderable: true,
        caveat: NODE_OUTLINE_CAVEAT,
    },
    "node.glow": {
        channel: "node.glow",
        target: "node",
        plainName: "Node Glow",
        shortName: "Glow",
        group: "effects",
        accepts: "color",
        stylePath: "effect.glow.color",
        renderable: true,
    },
    "node.glowStrength": {
        channel: "node.glowStrength",
        target: "node",
        plainName: "Node Glow Strength",
        shortName: "Glow strength",
        group: "effects",
        accepts: "number",
        min: 0,
        stylePath: "effect.glow.strength",
        renderable: true,
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
    "node.borderScreenWidth": {
        channel: "node.borderScreenWidth",
        target: "node",
        plainName: "Node Border Screen Width",
        shortName: "Border screen width",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "border.screenWidth",
        renderable: true,
        caveat:
            "A border width in screen pixels, the same at every zoom, as vis-network draws its " +
            "borders: set, it is drawn in place of `node.borderWidth`, and never wider than the node. " +
            "The ring is rebuilt when a zoom changes its width on screen by more than a few percent.",
    },
    "node.borderOpacity": {
        channel: "node.borderOpacity",
        target: "node",
        plainName: "Node Border Opacity",
        shortName: "Border opacity",
        group: "shape",
        default: 1,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "border.opacity",
        renderable: true,
        caveat: `${NODE_BORDER_CAVEAT} At opacity 0 no border is drawn.`,
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
    "node.borderPosition": {
        channel: "node.borderPosition",
        target: "node",
        plainName: "Node Border Position",
        shortName: "Border position",
        group: "shape",
        default: "outside",
        accepts: "enum",
        values: NodeBorderPositions.options,
        stylePath: "border.position",
        renderable: true,
        caveat:
            'Where the border sits against the node\'s size. "outside": the fill is the size and the ' +
            'ring is drawn beyond it. "center": the ring\'s middle runs along the size, as an SVG or ' +
            'canvas stroke does. "inside": the ring\'s outer edge is the size, so the node is drawn no ' +
            "larger than its size, as Cytoscape desktop draws it.",
    },
    "node.outerBorderColor": {
        channel: "node.outerBorderColor",
        target: "node",
        plainName: "Node Outer Border Color",
        shortName: "Outer border color",
        group: "shape",
        default: "#000000",
        accepts: "color",
        stylePath: "outerBorder.color",
        renderable: true,
        caveat: NODE_OUTER_BORDER_CAVEAT,
    },
    "node.outerBorderWidth": {
        channel: "node.outerBorderWidth",
        target: "node",
        plainName: "Node Outer Border Width",
        shortName: "Outer border width",
        group: "shape",
        default: 0,
        accepts: "number",
        min: 0,
        stylePath: "outerBorder.width",
        renderable: true,
        caveat: NODE_OUTER_BORDER_CAVEAT,
    },
    "node.outerBorderOpacity": {
        channel: "node.outerBorderOpacity",
        target: "node",
        plainName: "Node Outer Border Opacity",
        shortName: "Outer border opacity",
        group: "shape",
        default: 1,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "outerBorder.opacity",
        renderable: true,
        caveat: NODE_OUTER_BORDER_CAVEAT,
    },
    "node.outerBorderStyle": {
        channel: "node.outerBorderStyle",
        target: "node",
        plainName: "Node Outer Border Style",
        shortName: "Outer border style",
        group: "shape",
        default: "solid",
        accepts: "enum",
        values: NodeBorderStyles.options,
        stylePath: "outerBorder.style",
        renderable: true,
        caveat: NODE_OUTER_BORDER_CAVEAT,
    },
    "node.outerBorderOffset": {
        channel: "node.outerBorderOffset",
        target: "node",
        plainName: "Node Outer Border Offset",
        shortName: "Outer border offset",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "outerBorder.offset",
        renderable: true,
        caveat: NODE_OUTER_BORDER_CAVEAT,
    },
    ...haloRows("node", "underlay"),
    ...haloRows("node", "overlay"),
    "node.image": {
        channel: "node.image",
        target: "node",
        plainName: "Node Image",
        shortName: "Image",
        group: "shape",
        accepts: "text",
        stylePath: "image.src",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageFallback": {
        channel: "node.imageFallback",
        target: "node",
        plainName: "Node Image Fallback",
        shortName: "Image fallback",
        group: "shape",
        accepts: "text",
        stylePath: "image.fallback",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageFit": {
        channel: "node.imageFit",
        target: "node",
        plainName: "Node Image Fit",
        shortName: "Image fit",
        group: "shape",
        default: "contain",
        accepts: "enum",
        values: NODE_IMAGE_FIT_VALUES,
        stylePath: "image.fit",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageWidth": {
        channel: "node.imageWidth",
        target: "node",
        plainName: "Node Image Width",
        shortName: "Image width",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "image.width",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageHeight": {
        channel: "node.imageHeight",
        target: "node",
        plainName: "Node Image Height",
        shortName: "Image height",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "image.height",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imagePixelSize": {
        channel: "node.imagePixelSize",
        target: "node",
        plainName: "Node Image Pixel Size",
        shortName: "Image pixel size",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "image.pixelSize",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imagePositionX": {
        channel: "node.imagePositionX",
        target: "node",
        plainName: "Node Image Position X",
        shortName: "Image position x",
        group: "shape",
        default: 0.5,
        accepts: "number",
        stylePath: "image.positionX",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imagePositionY": {
        channel: "node.imagePositionY",
        target: "node",
        plainName: "Node Image Position Y",
        shortName: "Image position y",
        group: "shape",
        default: 0.5,
        accepts: "number",
        stylePath: "image.positionY",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageOffsetX": {
        channel: "node.imageOffsetX",
        target: "node",
        plainName: "Node Image Offset X",
        shortName: "Image offset x",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "image.offsetX",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageOffsetY": {
        channel: "node.imageOffsetY",
        target: "node",
        plainName: "Node Image Offset Y",
        shortName: "Image offset y",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "image.offsetY",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageRepeat": {
        channel: "node.imageRepeat",
        target: "node",
        plainName: "Node Image Repeat",
        shortName: "Image repeat",
        group: "shape",
        default: "no-repeat",
        accepts: "enum",
        values: NODE_IMAGE_REPEAT_VALUES,
        stylePath: "image.repeat",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageClip": {
        channel: "node.imageClip",
        target: "node",
        plainName: "Node Image Clip",
        shortName: "Image clip",
        group: "shape",
        default: "node",
        accepts: "enum",
        values: NODE_IMAGE_CLIP_VALUES,
        stylePath: "image.clip",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageSmoothing": {
        channel: "node.imageSmoothing",
        target: "node",
        plainName: "Node Image Smoothing",
        shortName: "Image smoothing",
        group: "shape",
        default: true,
        accepts: "boolean",
        stylePath: "image.smoothing",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.imageOpacity": {
        channel: "node.imageOpacity",
        target: "node",
        plainName: "Node Image Opacity",
        shortName: "Image opacity",
        group: "shape",
        default: 1,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "image.opacity",
        renderable: true,
        caveat: NODE_IMAGE_CAVEAT,
    },
    "node.glyph": {
        channel: "node.glyph",
        target: "node",
        plainName: "Node Glyph",
        shortName: "Glyph",
        group: "shape",
        accepts: "text",
        stylePath: "glyph.text",
        renderable: true,
        caveat: NODE_GLYPH_CAVEAT,
    },
    "node.glyphFont": {
        channel: "node.glyphFont",
        target: "node",
        plainName: "Node Glyph Font",
        shortName: "Glyph font",
        group: "shape",
        accepts: "text",
        stylePath: "glyph.font",
        renderable: true,
        caveat: NODE_GLYPH_CAVEAT,
    },
    "node.glyphSize": {
        channel: "node.glyphSize",
        target: "node",
        plainName: "Node Glyph Size",
        shortName: "Glyph size",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "glyph.size",
        renderable: true,
        caveat: NODE_GLYPH_CAVEAT,
    },
    "node.glyphWeight": {
        channel: "node.glyphWeight",
        target: "node",
        plainName: "Node Glyph Weight",
        shortName: "Glyph weight",
        group: "shape",
        default: 400,
        accepts: "number",
        min: 1,
        max: 1000,
        stylePath: "glyph.weight",
        renderable: true,
        caveat: NODE_GLYPH_CAVEAT,
    },
    "node.glyphColor": {
        channel: "node.glyphColor",
        target: "node",
        plainName: "Node Glyph Color",
        shortName: "Glyph color",
        group: "shape",
        default: "#000000",
        accepts: "color",
        stylePath: "glyph.color",
        renderable: true,
        caveat: NODE_GLYPH_CAVEAT,
    },
    "node.pieColors": {
        channel: "node.pieColors",
        target: "node",
        plainName: "Node Pie Colors",
        shortName: "Pie colors",
        group: "shape",
        accepts: "text",
        stylePath: "pie.colors",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieSizes": {
        channel: "node.pieSizes",
        target: "node",
        plainName: "Node Pie Sizes",
        shortName: "Pie sizes",
        group: "shape",
        accepts: "text",
        stylePath: "pie.sizes",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieOpacities": {
        channel: "node.pieOpacities",
        target: "node",
        plainName: "Node Pie Opacities",
        shortName: "Pie opacities",
        group: "shape",
        accepts: "text",
        stylePath: "pie.opacities",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieRadius": {
        channel: "node.pieRadius",
        target: "node",
        plainName: "Node Pie Radius",
        shortName: "Pie radius",
        group: "shape",
        default: 1,
        accepts: "number",
        min: 0,
        stylePath: "pie.radius",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieHole": {
        channel: "node.pieHole",
        target: "node",
        plainName: "Node Pie Hole",
        shortName: "Pie hole",
        group: "shape",
        default: 0,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "pie.hole",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieRotation": {
        channel: "node.pieRotation",
        target: "node",
        plainName: "Node Pie Rotation",
        shortName: "Pie rotation",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "pie.rotation",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieFitBox": {
        channel: "node.pieFitBox",
        target: "node",
        plainName: "Node Pie Fit Box",
        shortName: "Pie fit box",
        group: "shape",
        default: false,
        accepts: "boolean",
        stylePath: "pie.fitBox",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieOffsetX": {
        channel: "node.pieOffsetX",
        target: "node",
        plainName: "Node Pie Offset X",
        shortName: "Pie offset x",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "pie.offsetX",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.pieOffsetY": {
        channel: "node.pieOffsetY",
        target: "node",
        plainName: "Node Pie Offset Y",
        shortName: "Pie offset y",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "pie.offsetY",
        renderable: true,
        caveat: NODE_PIE_CAVEAT,
    },
    "node.stripeColors": {
        channel: "node.stripeColors",
        target: "node",
        plainName: "Node Stripe Colors",
        shortName: "Stripe colors",
        group: "shape",
        accepts: "text",
        stylePath: "stripes.colors",
        renderable: true,
        caveat: NODE_STRIPES_CAVEAT,
    },
    "node.stripeSizes": {
        channel: "node.stripeSizes",
        target: "node",
        plainName: "Node Stripe Sizes",
        shortName: "Stripe sizes",
        group: "shape",
        accepts: "text",
        stylePath: "stripes.sizes",
        renderable: true,
        caveat: NODE_STRIPES_CAVEAT,
    },
    "node.stripeOpacities": {
        channel: "node.stripeOpacities",
        target: "node",
        plainName: "Node Stripe Opacities",
        shortName: "Stripe opacities",
        group: "shape",
        accepts: "text",
        stylePath: "stripes.opacities",
        renderable: true,
        caveat: NODE_STRIPES_CAVEAT,
    },
    "node.stripeDirection": {
        channel: "node.stripeDirection",
        target: "node",
        plainName: "Node Stripe Direction",
        shortName: "Stripe direction",
        group: "shape",
        default: "down",
        accepts: "enum",
        values: NODE_STRIPE_DIRECTION_VALUES,
        stylePath: "stripes.direction",
        renderable: true,
        caveat: NODE_STRIPES_CAVEAT,
    },
    "node.stripeSize": {
        channel: "node.stripeSize",
        target: "node",
        plainName: "Node Stripe Size",
        shortName: "Stripe size",
        group: "shape",
        default: 1,
        accepts: "number",
        min: 0,
        stylePath: "stripes.size",
        renderable: true,
        caveat: NODE_STRIPES_CAVEAT,
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
    "node.exactCornerRadius": {
        channel: "node.exactCornerRadius",
        target: "node",
        plainName: "Node Exact Corner Radius",
        shortName: "Exact corner radius",
        group: "shape",
        default: false,
        accepts: "boolean",
        stylePath: "shape.exactCornerRadius",
        renderable: true,
        caveat:
            "Whether `node.cornerRadius` is drawn as given, up to half the shorter side, so a large radius " +
            "draws a pill (true), or capped at a quarter of the shorter side on a round-rectangle and a " +
            "tenth on the round-* polygons (false). Other shapes ignore it.",
    },
    "node.shapePoints": {
        channel: "node.shapePoints",
        target: "node",
        plainName: "Node Polygon Points",
        shortName: "Polygon points",
        group: "shape",
        accepts: "text",
        stylePath: "shape.points",
        renderable: true,
        caveat:
            'The corners of a "polygon" node, as `x,y` pairs separated by spaces, each relative to the ' +
            "node's center as fractions of its half width and half height, y up: `0,1 1,-1 -1,-1` is a " +
            "triangle. The outline is stretched so its farthest corners reach the node's sides. A node that " +
            "grows to hold its label (`node.labelFit`) grows by as far as its corners reach past 1. Other " +
            "shapes ignore it.",
    },
    "node.shapeStretchPoints": {
        channel: "node.shapeStretchPoints",
        target: "node",
        plainName: "Node Polygon Stretch",
        shortName: "Stretch points",
        group: "shape",
        default: true,
        accepts: "boolean",
        stylePath: "shape.stretchPoints",
        renderable: true,
        caveat:
            'Whether a "polygon" node\'s corners (`node.shapePoints`) are stretched so the farthest reach ' +
            "the node's sides (true), or drawn exactly where they say, as fractions of its half width and " +
            "half height (false), so a regular polygon inside the ellipse of the node's box keeps its size. " +
            "Other shapes ignore it.",
    },
    "node.labelFit": {
        channel: "node.labelFit",
        target: "node",
        plainName: "Node Label Fit",
        shortName: "Fit label",
        group: "shape",
        accepts: "enum",
        values: NodeLabelFits.options,
        stylePath: "shape.labelFit",
        renderable: true,
        caveat:
            "Grows the node to hold its label: its width and height (or size) become its least size. " +
            '"inside" fits the label\'s box, padded by `node.labelPaddingX` and `node.labelPaddingY`, ' +
            "inside the node's outline, so an ellipse or a diamond reaches past the box's corners; \"bounds\" " +
            "makes the padded box the node's width and height whatever its shape. The box is as wide as the " +
            "label's widest line and as tall as its lines at one font size each. Unset, the node is the size " +
            "it states. Each distinct label is its own source mesh, so instancing is lost on these nodes.",
    },
    "node.labelPaddingX": labelPaddingChannel("X", "left and right"),
    "node.labelPaddingY": labelPaddingChannel("Y", "above and below"),
    "node.labelFitSquare": {
        channel: "node.labelFitSquare",
        target: "node",
        plainName: "Node Label Fit Square",
        shortName: "Fit square",
        group: "shape",
        default: false,
        accepts: "boolean",
        stylePath: "shape.labelFitSquare",
        renderable: true,
        caveat:
            "A node that grows to hold its label (`node.labelFit`) stays as wide as it is tall, as a " +
            "circle or a square does. Without `node.labelFit` it changes nothing.",
    },
    "node.gradientColor": {
        channel: "node.gradientColor",
        target: "node",
        plainName: "Node Gradient Color",
        shortName: "Gradient color",
        group: "color",
        accepts: "color",
        stylePath: "texture.color.colors",
        renderable: true,
        caveat:
            "Fills the node with a linear gradient from its `node.color` into this colour, running " +
            "the way `node.gradientDirection` says. A gradient is part of the node's mesh rather " +
            "than of its instance, so each distinct gradient is its own source mesh and its own ramp " +
            "texture; past 32 distinct ramps in a scene a node is filled flat with its `node.color`.",
    },
    "node.gradientDirection": {
        channel: "node.gradientDirection",
        target: "node",
        plainName: "Node Gradient Direction",
        shortName: "Gradient direction",
        group: "color",
        default: 0,
        accepts: "number",
        min: 0,
        max: 360,
        stylePath: "texture.color.direction",
        renderable: true,
        caveat:
            "Which way a gradient fill (`node.gradientColor`) runs, in degrees on the screen: 0 from " +
            "left to right, 90 from top to bottom, 45 from the top-left corner to the bottom-right one. " +
            "Without `node.gradientColor` the node is filled flat with its `node.color`.",
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
    "edge.outlineColor": {
        channel: "edge.outlineColor",
        target: "edge",
        plainName: "Edge Outline Color",
        shortName: "Outline color",
        group: "line",
        default: "#000000",
        accepts: "color",
        stylePath: "line.outline.color",
        renderable: true,
        caveat: EDGE_OUTLINE_CAVEAT,
    },
    "edge.outlineWidth": {
        channel: "edge.outlineWidth",
        target: "edge",
        plainName: "Edge Outline Width",
        shortName: "Outline width",
        group: "line",
        default: 0,
        accepts: "number",
        min: 0,
        stylePath: "line.outline.width",
        renderable: true,
        caveat: EDGE_OUTLINE_CAVEAT,
    },
    "edge.outlineOpacity": {
        channel: "edge.outlineOpacity",
        target: "edge",
        plainName: "Edge Outline Opacity",
        shortName: "Outline opacity",
        group: "line",
        default: 1,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "line.outline.opacity",
        renderable: true,
        caveat: EDGE_OUTLINE_CAVEAT,
    },
    ...haloRows("edge", "underlay"),
    ...haloRows("edge", "overlay"),
    "edge.gradientColors": {
        channel: "edge.gradientColors",
        target: "edge",
        plainName: "Edge Gradient Colors",
        shortName: "Gradient colors",
        group: "line",
        accepts: "text",
        stylePath: "line.gradient.colors",
        renderable: true,
        caveat: EDGE_GRADIENT_CAVEAT,
    },
    "edge.gradientStops": {
        channel: "edge.gradientStops",
        target: "edge",
        plainName: "Edge Gradient Stops",
        shortName: "Gradient stops",
        group: "line",
        accepts: "text",
        stylePath: "line.gradient.stops",
        renderable: true,
        caveat: EDGE_GRADIENT_CAVEAT,
    },
    "edge.gradientKind": {
        channel: "edge.gradientKind",
        target: "edge",
        plainName: "Edge Gradient Kind",
        shortName: "Gradient kind",
        group: "line",
        default: "linear",
        accepts: "enum",
        values: EDGE_GRADIENT_KIND_VALUES,
        stylePath: "line.gradient.kind",
        renderable: true,
        caveat: EDGE_GRADIENT_CAVEAT,
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
    "edge.fanSpacing": {
        channel: "edge.fanSpacing",
        target: "edge",
        plainName: "Edge Fan Spacing",
        shortName: "Fan spacing",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.fanSpacing",
        renderable: true,
        caveat:
            "How far apart, at their middle, neighboring curved edges between the same two nodes " +
            "are drawn, in the scene's units. Left unset, they are two radii of the larger node " +
            "apart, closer when the nodes are close. A straight edge keeps the line between its nodes.",
    },
    "edge.fanned": {
        channel: "edge.fanned",
        target: "edge",
        plainName: "Edge Fanned",
        shortName: "Fanned",
        group: "line",
        accepts: "boolean",
        stylePath: "line.fanned",
        renderable: true,
        caveat:
            "Whether a curved edge spreads apart from the other curved edges between the same two " +
            "nodes. Left unset, it does; false draws it as its own curve, bowing to the left of its " +
            "direction, so two edges joined either way round bow apart.",
    },
    "edge.bendCurve": {
        channel: "edge.bendCurve",
        target: "edge",
        plainName: "Edge Bend Curve",
        shortName: "Bend curve",
        group: "line",
        default: "corners",
        accepts: "enum",
        values: EDGE_BEND_CURVE_VALUES,
        stylePath: "line.bendCurve",
        renderable: true,
        caveat:
            'How a curved edge is drawn through its bends: "corners" runs straight through each bend ' +
            'and rounds its corner; "midpoints" draws one smooth curve that uses the bends as control ' +
            'points, from the middle of each segment to the next; "bezier" draws one Bezier curve whose ' +
            "control points are the bends (one: quadratic, two: cubic). A straight edge or one without bends " +
            "ignores it.",
    },
    "edge.arcRadius": {
        channel: "edge.arcRadius",
        target: "edge",
        plainName: "Edge Arc Radius",
        shortName: "Arc radius",
        group: "line",
        accepts: "number",
        min: 0.5,
        stylePath: "line.arcRadius",
        renderable: true,
        caveat:
            "Draws a curved edge that does not fan out of a bundle as an arc of the circle through both " +
            "node centers, with this many times the distance between them as its radius (0.5 is a half " +
            "circle; larger is flatter). Left unset, the edge keeps the element's own bow. A straight " +
            "edge ignores it.",
    },
    "edge.sourcePort": {
        channel: "edge.sourcePort",
        target: "edge",
        plainName: "Edge Source Port",
        shortName: "Source port",
        group: "line",
        accepts: "text",
        stylePath: "line.sourcePort",
        renderable: true,
        caveat:
            "Where the line attaches to its source node, when not where the line from the node's center " +
            "crosses its outline: `x,y` from the node's center as fractions of its half width and half " +
            "height, y up (`1,0` is the middle of its right side, `0,1` the middle of its top).",
    },
    "edge.targetPort": {
        channel: "edge.targetPort",
        target: "edge",
        plainName: "Edge Target Port",
        shortName: "Target port",
        group: "line",
        accepts: "text",
        stylePath: "line.targetPort",
        renderable: true,
        caveat:
            "Where the line attaches to its target node, when not where the line from the node's center " +
            "crosses its outline: `x,y` from the node's center as fractions of its half width and half " +
            "height, y up (`1,0` is the middle of its right side, `0,1` the middle of its top).",
    },
    ...arrowEndChannels("Head"),
    ...arrowEndChannels("Tail"),
    ...arrowMidChannels("MiddleHead"),
    ...arrowMidChannels("MiddleTail"),
    "edge.animationSpeed": {
        channel: "edge.animationSpeed",
        target: "edge",
        plainName: "Edge Animation Speed",
        shortName: "Animation",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.animationSpeed",
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
    ...labelFieldChannels("edge"),
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

/**
 * Every channel, with what the element actually does with it and what a style editor needs to
 * draw a row for it: a short name, a group, the default it opens on, and why it cannot be set.
 *
 * The defaults are read from the element's default styles once, when this module loads.
 */
export const CHANNEL_DESCRIPTORS: Readonly<Record<Channel, ChannelDescriptor>> = Object.fromEntries(
    Object.values(DECLARED).map((descriptor): [Channel, ChannelDescriptor] => {
        const value = shippedDefault(descriptor) ?? descriptor.default;

        return [descriptor.channel, value === undefined ? descriptor : { ...descriptor, default: value }];
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
