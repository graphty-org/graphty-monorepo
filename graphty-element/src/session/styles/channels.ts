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

import type { LabelDeclutterOrder, LabelLocation, LabelTextAlign } from "../../catalog/label-style";
import type { Binding, Channel, EdgeLinePattern, LabelStyle, Rgba } from "../../catalog/types";
import { colorToHex } from "../../config/common";
import {
    defaultEdgeStyle,
    EdgeArrowTypes,
    EdgeLineTypes,
    EdgeOutlineTypes,
    type EdgeStyleConfig,
} from "../../config/EdgeStyle";
import { DEFAULT_SELECTION_STYLE } from "../../config/GraphStyle";
import {
    defaultNodeStyle,
    NodeBorderPositions,
    NodeBorderStyles,
    NodeLabelFits,
    NodeModelCenters,
    NodeModelFits,
    NodeModelUpAxes,
    NodeShapes,
    NodeSizeModes,
    type NodeStyleConfig,
} from "../../config/NodeStyle";
import { isAssetId } from "../assets/assetId";

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

/** A pattern an edge's outline band can be drawn in (`line.outline.type`). */
export type EdgeOutlineValue = NonNullable<NonNullable<NonNullable<EdgeStyleConfig["line"]>["outline"]>["type"]>;

/** An arrow the edge renderer can draw at either end. */
export type ArrowValue = NonNullable<NonNullable<EdgeStyleConfig["arrowHead"]>["type"]>;

/** How heavy a label's letters are, as the `labelWeight` channels take it. */
export type LabelWeightValue = "normal" | "bold";

/** Where a label's runs of different sizes meet on a line (`labelRunAlign`). */
export type LabelRunAlignValue = "baseline" | "hanging" | "middle";

/** How a node's size is read: as a multiplier of the shape's own geometry, or as its largest extent. */
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

/** How an image drawn at a size of its own fills a side left unset (`node.imageAutoSize`). */
export type NodeImageAutoSizeValue = NonNullable<NonNullable<NodeStyleConfig["image"]>["autoSize"]>;
/** Whether a node's image is kept inside the node's outline. */
export type NodeImageClipValue = NonNullable<NonNullable<NodeStyleConfig["image"]>["clip"]>;
/** Which way a node's stripes follow one another. */
export type NodeStripeDirectionValue = NonNullable<NonNullable<NodeStyleConfig["stripes"]>["direction"]>;
/** What a node's chart draws (`node.chartKind`). */
export type NodeChartKindValue = NonNullable<NonNullable<NodeStyleConfig["chart"]>["kind"]>;
/** How a curved edge is drawn through its bends (`edge.bendCurve`): corners rounded, or through the midpoints. */
export type EdgeBendCurveValue = NonNullable<NonNullable<EdgeStyleConfig["line"]>["bendCurve"]>;

/** A value of `edge.route`: the path a line takes between its nodes. */
export type EdgeRouteValue = NonNullable<NonNullable<EdgeStyleConfig["line"]>["route"]>;
export type EdgeGradientKindValue = NonNullable<NonNullable<NonNullable<EdgeStyleConfig["line"]>["gradient"]>["kind"]>;
/** How a node's gradient fill runs (`node.gradientKind`): straight across it, or out from its middle. */
export type NodeGradientKindValue = "linear" | "radial";
/** The axis that points up in a model's file, as `node.modelSourceUp` takes it. */
export type NodeModelUpValue = NonNullable<NonNullable<NodeStyleConfig["shape"]>["modelSourceUp"]>;

/** A line style a node border can be drawn in. */
export type NodeBorderStyleValue = NonNullable<NonNullable<NodeStyleConfig["border"]>["style"]>;

/** Where a node border sits against the node's size. @public */
export type NodeBorderPositionValue = NonNullable<NonNullable<NodeStyleConfig["border"]>["position"]>;

/** Every node shape, in schema order. */
const NODE_SHAPE_VALUES: readonly NodeShapeValue[] = NodeShapes.options;

/** Every line pattern, in schema order. */
const EDGE_LINE_VALUES: readonly EdgeLineValue[] = EdgeLineTypes.options;
const EDGE_OUTLINE_VALUES: readonly EdgeOutlineValue[] = EdgeOutlineTypes.options;

/** Every arrow, in schema order. */
const ARROW_VALUES: readonly ArrowValue[] = EdgeArrowTypes.options;

/** The sides of its line `arrowHeadSide` and the other side channels keep a cap's half on. */
const ARROW_SIDE_VALUES: readonly ("left" | "right")[] = ["left", "right"];

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
    "node.labelTextAlign": LabelTextAlign;
    "node.labelLocation": LabelLocation;
    "node.labelWrapWidth": number;
    "node.labelWrapTrailingSpace": boolean;
    "node.labelWrapEllipsis": boolean;
    "node.labelWrapAnywhere": boolean;
    "node.labelWrapSpaceCount": number;
    "node.labelRunAlign": LabelRunAlignValue;
    "node.labelMinScreenSize": number;
    "node.labelOnTop": boolean;
    "node.labelDeclutter": LabelDeclutterOrder;
    "node.labelMinNodeScreenSize": number;
    "node.labelRotation": number;
    "node.labelBackground": ColorValue;
    "node.labelOutline": ColorValue;
    "node.labelOutlineWidth": number;
    "node.labelBorder": ColorValue;
    "node.labelBorderWidth": number;
    "node.labelOpacity": number;
    "node.labelBackgroundOpacity": number;
    "node.labelOutlineOpacity": number;
    "node.labelBorderOpacity": number;
    "node.labelPadding": number;
    "node.labelCornerRadius": number;
    "node.labelLineHeight": number;
    "node.labelOffsetX": number;
    "node.labelOffsetY": number;
    "node.labelShiftX": number;
    "node.labelShiftY": number;
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
    "node.borderScreenWidth": number;
    "node.borderOpacity": number;
    "node.borderStyle": NodeBorderStyleValue;
    "node.borderPosition": NodeBorderPositionValue;
    "node.borderWaveAmplitude": number;
    "node.borderWavePeriod": number;
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
    "node.shapeParts": string;
    "node.shapeLines": string;
    "node.shapeTexts": string;
    "node.shapeLineWidth": number;
    "node.labelFit": NodeLabelFitValue;
    "node.labelPaddingX": number;
    "node.labelPaddingY": number;
    "node.labelFitSquare": boolean;
    "node.gradientColor": ColorValue;
    "node.gradientDirection": number;
    "node.gradientColors": string;
    "node.gradientStops": string;
    "node.gradientKind": NodeGradientKindValue;
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
    "node.imageAutoSize": NodeImageAutoSizeValue;
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
    "node.chartKind": NodeChartKindValue;
    "node.chartValues": string;
    "node.chartColors": string;
    "node.chartMin": number;
    "node.chartMax": number;
    "node.chartHorizontal": boolean;
    "node.chartSize": number;
    "node.chartMargin": number;
    "node.chartGap": number;
    "node.chartLineWidth": number;
    "node.chartBorderColor": ColorValue;
    "node.chartBorderWidth": number;
    "node.model": string;
    "node.modelSourceUp": NodeModelUpValue;
    "node.modelTurn": number;
    "node.modelTint": boolean | "replace";
    "node.modelFit": "contain" | "stretch";
    "node.modelCenter": "bounds" | "origin";
    "node.texture": string;
    "edge.color": ColorValue;
    "edge.width": number;
    "edge.minScreenWidth": number;
    "edge.opacity": number;
    "edge.bandColor": ColorValue;
    "edge.bandWidth": number;
    "edge.bandOpacity": number;
    "edge.outlineColor": ColorValue;
    "edge.outlineWidth": number;
    "edge.outlineOpacity": number;
    "edge.outlineStyle": EdgeOutlineValue;
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
    "edge.waveAmplitude": number;
    "edge.wavePeriod": number;
    "edge.curvature": boolean;
    "edge.bends": string;
    "edge.fanSpacing": number;
    "edge.fanned": boolean;
    "edge.bendCurve": EdgeBendCurveValue;
    "edge.arcRadius": number;
    "edge.route": EdgeRouteValue;
    "edge.arcHeight": number;
    "edge.nodeGap": number;
    "edge.sourcePort": string;
    "edge.targetPort": string;
    "edge.arrowHead": ArrowValue;
    "edge.arrowHeadSize": number;
    "edge.arrowHeadWidth": number;
    "edge.arrowHeadSide": "left" | "right";
    "edge.arrowHeadPosition": number;
    "edge.arrowHeadGap": number;
    "edge.arrowHeadColor": ColorValue;
    "edge.arrowHeadOpacity": number;
    "edge.arrowHeadImage": string;
    "edge.arrowHeadText": string;
    "edge.arrowHeadTextStyle": LabelStyle;
    "edge.arrowHeadTextSize": number;
    "edge.arrowHeadTextLetterSize": number;
    "edge.arrowHeadTextFont": string;
    "edge.arrowHeadTextColor": ColorValue;
    "edge.arrowHeadTextWeight": LabelWeightValue;
    "edge.arrowHeadTextOpacity": number;
    "edge.arrowHeadTextDistance": number;
    "edge.arrowHeadTextRotation": number;
    "edge.arrowHeadTextOffsetX": number;
    "edge.arrowHeadTextOffsetY": number;
    "edge.arrowTail": ArrowValue;
    "edge.arrowTailSize": number;
    "edge.arrowTailWidth": number;
    "edge.arrowTailSide": "left" | "right";
    "edge.arrowTailPosition": number;
    "edge.arrowTailGap": number;
    "edge.arrowTailColor": ColorValue;
    "edge.arrowTailOpacity": number;
    "edge.arrowTailImage": string;
    "edge.arrowTailText": string;
    "edge.arrowTailTextStyle": LabelStyle;
    "edge.arrowTailTextSize": number;
    "edge.arrowTailTextLetterSize": number;
    "edge.arrowTailTextFont": string;
    "edge.arrowTailTextColor": ColorValue;
    "edge.arrowTailTextWeight": LabelWeightValue;
    "edge.arrowTailTextOpacity": number;
    "edge.arrowTailTextDistance": number;
    "edge.arrowTailTextRotation": number;
    "edge.arrowTailTextOffsetX": number;
    "edge.arrowTailTextOffsetY": number;
    "edge.arrowMiddleHead": ArrowValue;
    "edge.arrowMiddleHeadSize": number;
    "edge.arrowMiddleHeadWidth": number;
    "edge.arrowMiddleHeadSide": "left" | "right";
    "edge.arrowMiddleHeadPosition": number;
    "edge.arrowMiddleHeadColor": ColorValue;
    "edge.arrowMiddleHeadOpacity": number;
    "edge.arrowMiddleHeadImage": string;
    "edge.arrowMiddleTail": ArrowValue;
    "edge.arrowMiddleTailSize": number;
    "edge.arrowMiddleTailWidth": number;
    "edge.arrowMiddleTailSide": "left" | "right";
    "edge.arrowMiddleTailPosition": number;
    "edge.arrowMiddleTailColor": ColorValue;
    "edge.arrowMiddleTailOpacity": number;
    "edge.arrowMiddleTailImage": string;
    "edge.animationSpeed": number;
    "edge.label": string;
    "edge.labelStyle": LabelStyle;
    "node.visible": boolean;
    "node.tooltipSize": number;
    "node.tooltipColor": ColorValue;
    "node.tooltipBackground": ColorValue;
    "edge.visible": boolean;
    "edge.labelSize": number;
    "edge.labelColor": ColorValue;
    "edge.labelBackground": ColorValue;
    "edge.arrowHeadTextBackground": ColorValue;
    "edge.arrowTailTextBackground": ColorValue;
    "edge.labelLetterSize": number;
    "edge.labelFont": string;
    "edge.labelWeight": LabelWeightValue;
    "edge.labelItalic": boolean;
    "edge.labelTextAlign": LabelTextAlign;
    "edge.labelLocation": LabelLocation;
    "edge.labelWrapWidth": number;
    "edge.labelWrapTrailingSpace": boolean;
    "edge.labelWrapEllipsis": boolean;
    "edge.labelWrapAnywhere": boolean;
    "edge.labelWrapSpaceCount": number;
    "edge.labelRunAlign": LabelRunAlignValue;
    "edge.labelMinScreenSize": number;
    "edge.labelOnTop": boolean;
    "edge.labelRotation": number;
    "edge.labelOutline": ColorValue;
    "edge.labelOutlineWidth": number;
    "edge.labelBorder": ColorValue;
    "edge.labelBorderWidth": number;
    "edge.labelOpacity": number;
    "edge.labelBackgroundOpacity": number;
    "edge.labelOutlineOpacity": number;
    "edge.labelBorderOpacity": number;
    "edge.labelPadding": number;
    "edge.labelCornerRadius": number;
    "edge.labelLineHeight": number;
    "edge.labelOffsetX": number;
    "edge.labelOffsetY": number;
    "edge.labelShiftX": number;
    "edge.labelShiftY": number;
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
    | "node.gradientColor"
    | "node.outerBorderColor"
    | "node.underlayColor"
    | "node.overlayColor"
    | "node.glyphColor"
    | "node.chartBorderColor"
    | "node.labelOutline"
    | "node.labelBorder"
    | "edge.color"
    | "edge.bandColor"
    | "edge.arrowHeadColor"
    | "edge.arrowTailColor"
    | "edge.labelColor"
    | "edge.labelBackground"
    | "edge.arrowHeadTextColor"
    | "edge.arrowHeadTextBackground"
    | "edge.arrowTailTextColor"
    | "edge.arrowTailTextBackground"
    | "edge.arrowMiddleHeadColor"
    | "edge.arrowMiddleTailColor"
    | "edge.outlineColor"
    | "edge.underlayColor"
    | "edge.overlayColor"
    | "edge.labelOutline"
    | "edge.labelBorder";

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

const EDGE_GRADIENT_CAVEAT =
    "Paints the line in a gradient over its `edge.color`: `edge.gradientColors` are CSS colors separated " +
    "by spaces, `edge.gradientStops` where each sits from 0 to 1 (unset, or not one per color: evenly " +
    'spaced), and `edge.gradientKind` "linear" from the source end to the target end, "radial" out from ' +
    'the line\'s middle to both ends, or "none". Fewer than two colors draw none. Drawn on solid lines.';

/** How an edge's gradient runs, or that it has none. */
const EDGE_GRADIENT_KIND_VALUES: readonly EdgeGradientKindValue[] = ["linear", "radial", "none"];

const NODE_GRADIENT_CAVEAT =
    "Fills the node with a gradient through `node.gradientColors`, CSS colors separated by spaces from " +
    "its start to its end (unset: from `node.color` into `node.gradientColor`), placed by " +
    "`node.gradientStops`, fractions from 0 to 1 (unset, or not one per color: evenly spaced). " +
    '`node.gradientKind` "linear" runs it the way `node.gradientDirection` says; "radial" runs it out ' +
    "from the node's middle to its edge. Each distinct gradient is its own source mesh and ramp texture.";

/** How a node's gradient fill runs. */
const NODE_GRADIENT_KIND_VALUES: readonly NodeGradientKindValue[] = ["linear", "radial"];
const EDGE_BEND_CURVE_VALUES: readonly EdgeBendCurveValue[] = ["corners", "midpoints", "bezier", "arc"];
const EDGE_ROUTE_VALUES: readonly EdgeRouteValue[] = ["straight", "arc", "great-circle"];

const EDGE_OUTLINE_CAVEAT =
    "A band drawn under the edge's line along its whole length, `edge.outlineWidth` wider than the " +
    "line (half of it each side, in the line's width units), as Cytoscape.js draws a line outline and " +
    "vis-network an edge background, in `edge.outlineStyle`'s pattern (solid, dash, dot or dash-dot). Drawn only " +
    "with a width above 0, and under solid lines: a dotted " +
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

/** Every way `node.imageAutoSize` fills an unset side. */
const NODE_IMAGE_AUTO_SIZE_VALUES: readonly NodeImageAutoSizeValue[] = ["proportional", "natural"];
/** Whether a node's image is clipped to the node. */
const NODE_IMAGE_CLIP_VALUES: readonly NodeImageClipValue[] = ["node", "none"];
/** Which way a node's stripes run. */
const NODE_STRIPE_DIRECTION_VALUES: readonly NodeStripeDirectionValue[] = ["down", "right"];

/** What a node's chart draws. */
const NODE_CHART_KIND_VALUES: readonly NodeChartKindValue[] = ["bar", "stacked-bar", "line", "box", "cells"];

const NODE_CHART_CAVEAT =
    "A chart over the node's face, drawn when `node.chartValues` (numbers separated by spaces) and " +
    "`node.chartColors` (CSS colors separated by spaces, item i in color i, the last for the rest) are set: " +
    '`node.chartKind` "bar" (bars side by side), "stacked-bar" (the values piled into one bar), "line", "box" ' +
    "(the values are the low whisker, the quartiles and median, the high whisker; its median in the second " +
    'color, else black) or "cells" (a row of colored cells). The plot is a box `node.chartSize` times the ' +
    "node's; the values run from `node.chartMin` to `node.chartMax` bottom to top (left to right with " +
    "`node.chartHorizontal`), the categories along the other side after `node.chartMargin` at each end and " +
    "`node.chartGap` between them, both shares of that side. `node.chartLineWidth` is a line's and a " +
    "whisker's width, `node.chartBorderWidth` and `node.chartBorderColor` a bar's and a box's outline.";

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
    `edge.arrow${End}${"" | "Size" | "Width" | "Side" | "Position" | "Gap" | "Color" | "Opacity" | "Image" | "Text" | "TextStyle" | "TextSize" | "TextLetterSize" | "TextFont" | "TextColor" | "TextWeight" | "TextOpacity" | "TextDistance" | "TextRotation" | "TextOffsetX" | "TextOffsetY"}`;

/**
 * The eight channels of one arrow end, in table order. The head's and the tail's differ only in
 * their names, their style paths and the tail's type default (an edge of a directed graph draws a head and no tail),
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
            ...id("Side"),
            plainName: `Arrow ${end} Side`,
            shortName: `${end} side`,
            group: "arrows",
            accepts: "enum",
            values: ARROW_SIDE_VALUES,
            stylePath: `arrow${end}.side`,
            renderable: true,
            caveat:
                "Draws only the half of the cap on one side of its line, cut along the line: left or right " +
                "looking along the line toward the cap's tip. Unset, the whole cap.",
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
            ...id("Gap"),
            plainName: `Arrow ${end} Gap`,
            shortName: `${end} gap`,
            group: "arrows",
            default: 0,
            accepts: "number",
            min: 0,
            stylePath: `arrow${end}.gap`,
            renderable: true,
            caveat:
                "How far from its node the cap is drawn, as a multiple of the cap's own length along its line; the " +
                "line stops there too. 0 puts the cap against the node.",
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
            ...id("TextFont"),
            plainName: `Arrow ${end} Caption Font`,
            shortName: `${end} caption font`,
            group: "arrows",
            accepts: "text",
            stylePath: `arrow${end}.text.font`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
        {
            ...id("TextColor"),
            plainName: `Arrow ${end} Caption Color`,
            shortName: `${end} caption color`,
            group: "arrows",
            accepts: "color",
            stylePath: `arrow${end}.text.textColor`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
        {
            ...id("TextWeight"),
            plainName: `Arrow ${end} Caption Weight`,
            shortName: `${end} caption weight`,
            group: "arrows",
            accepts: "enum",
            values: LABEL_WEIGHT_VALUES,
            stylePath: `arrow${end}.text.fontWeight`,
            renderable: true,
            caveat: ARROW_CAPTION_CAVEAT,
        },
        {
            ...id("TextOpacity"),
            plainName: `Arrow ${end} Caption Opacity`,
            shortName: `${end} caption opacity`,
            group: "arrows",
            accepts: "number",
            min: 0,
            max: 1,
            stylePath: `arrow${end}.text.textOpacity`,
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
        {
            ...id("TextRotation"),
            plainName: `Arrow ${end} Caption Rotation`,
            shortName: `${end} caption rotation`,
            group: "arrows",
            accepts: "number",
            stylePath: `arrow${end}.text.rotation`,
            renderable: true,
            caveat: "How far the caption is turned, in degrees clockwise on screen about its own middle; unset, level.",
        },
        {
            ...id("TextOffsetX"),
            plainName: `Arrow ${end} Caption Offset X`,
            shortName: `${end} caption offset x`,
            group: "arrows",
            accepts: "number",
            stylePath: `arrow${end}.text.offsetX`,
            renderable: true,
            caveat: "How far the caption is moved right of where it sits, in scene units, on screen.",
        },
        {
            ...id("TextOffsetY"),
            plainName: `Arrow ${end} Caption Offset Y`,
            shortName: `${end} caption offset y`,
            group: "arrows",
            accepts: "number",
            stylePath: `arrow${end}.text.offsetY`,
            renderable: true,
            caveat: "How far the caption is moved down from where it sits, in scene units, on screen.",
        },
    ];

    return Object.fromEntries(rows.map((row) => [row.channel, row])) as Record<ArrowEndChannel<End>, ChannelDescriptor>;
}

/** The six channels of a cap drawn part-way along the line: `edge.arrowMiddleHead`, `edge.arrowMiddleHeadSize` and so on. */
type ArrowMidChannel<End extends "MiddleHead" | "MiddleTail"> =
    `edge.arrow${End}${"" | "Size" | "Width" | "Side" | "Position" | "Color" | "Opacity" | "Image"}`;

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
        // a middle cap has no caption, and no gap from a node it does not touch
        .filter((row) => {
            const suffix = row.channel.slice(`edge.arrow${from}`.length);
            return !suffix.startsWith("Text") && suffix !== "Gap";
        })
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
    `${Target}.label${"Color" | "Size" | "LetterSize" | "Font" | "Weight" | "Italic" | "WrapWidth" | "WrapTrailingSpace" | "WrapEllipsis" | "WrapAnywhere" | "WrapSpaceCount" | "RunAlign" | "MinScreenSize" | "OnTop" | "Rotation" | "Background" | "Outline" | "OutlineWidth" | "Border" | "BorderWidth" | "Opacity" | "BackgroundOpacity" | "OutlineOpacity" | "BorderOpacity" | "Padding" | "CornerRadius" | "LineHeight" | "OffsetX" | "OffsetY" | "ShiftX" | "ShiftY"}`;

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
    WrapEllipsis: "wrapEllipsis",
    WrapAnywhere: "wrapAnywhere",
    WrapSpaceCount: "wrapSpaceCount",
    RunAlign: "runAlign",
    MinScreenSize: "minScreenSize",
    OnTop: "onTop",
    Rotation: "rotation",
    Background: "background",
    Outline: "outline",
    OutlineWidth: "outlineWidth",
    Border: "borderColor",
    BorderWidth: "borderWidth",
    Opacity: "opacity",
    BackgroundOpacity: "backgroundOpacity",
    OutlineOpacity: "outlineOpacity",
    BorderOpacity: "borderOpacity",
    Padding: "boxPadding",
    CornerRadius: "cornerRadius",
    LineHeight: "lineHeight",
    OffsetX: "offsetX",
    OffsetY: "offsetY",
    ShiftX: "shiftX",
    ShiftY: "shiftY",
} as const satisfies Record<string, keyof LabelStyle>;

/** A label style field one channel writes on its own. */
export type LabelFieldName =
    | (typeof LABEL_FIELD_OF_SUFFIX)[keyof typeof LABEL_FIELD_OF_SUFFIX]
    | "declutter"
    | "minNodeScreenSize"
    | "textAlign"
    | "location";

/** Every way `labelTextAlign` lines up a label's lines. */
const LABEL_TEXT_ALIGN_VALUES: readonly LabelTextAlign[] = ["left", "center", "right"];

/**
 * How a label's lines line up with one another, one field of the label style like the label field channels.
 * @param target - Nodes or edges.
 * @returns The channel.
 */
function labelTextAlignChannel(target: "node" | "edge"): ChannelDescriptor {
    const Target = target === "node" ? "Node" : "Edge";
    return {
        channel: `${target}.labelTextAlign`,
        target,
        plainName: `${Target} Label Text Align`,
        shortName: "Label text align",
        group: "text",
        stylePath: "label.textAlign",
        renderable: true,
        accepts: "enum",
        values: LABEL_TEXT_ALIGN_VALUES,
        caveat:
            "Lines up the lines of a label of more than one line with one another: their left edges, their " +
            "middles or their right edges. The label's place against its node or edge is `labelStyle`'s location.",
    };
}

/** Every place `labelLocation` puts a label. */
const LABEL_LOCATION_VALUES: readonly LabelLocation[] = [
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
    "automatic",
];

/**
 * Where a label sits against its node or edge, one field of the label style like the label field channels, so a
 * layer can bind it to a column and give each element its own place.
 * @param target - Nodes or edges.
 * @returns The channel.
 */
function labelLocationChannel(target: "node" | "edge"): ChannelDescriptor {
    const Target = target === "node" ? "Node" : "Edge";
    return {
        channel: `${target}.labelLocation`,
        target,
        plainName: `${Target} Label Location`,
        shortName: "Label location",
        group: "text",
        stylePath: "label.location",
        renderable: true,
        accepts: "enum",
        values: LABEL_LOCATION_VALUES,
        caveat:
            "Where the label sits against its node or edge: beyond a side or a corner, in the middle, or inside " +
            "a node against a side or in a corner. The same field as `labelStyle`'s location.",
    };
}

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
        row("WrapEllipsis", "Wrap Ellipsis", {
            accepts: "boolean",
            caveat: "A line wider than the wrap width is cut to fit, with an ellipsis after it, in place of wrapping.",
        }),
        row("WrapAnywhere", "Wrap Anywhere", {
            accepts: "boolean",
            caveat: "A line may break between any two letters, filling each line to the wrap width.",
        }),
        row("WrapSpaceCount", "Wrap Space Count", {
            accepts: "number",
            min: 0,
            caveat:
                "How many blanks one blank between two words counts as against the wrap width; it is still " +
                "drawn once. Unset, one.",
        }),
        row("RunAlign", "Run Align", {
            accepts: "enum",
            values: LABEL_RUN_ALIGN_VALUES,
            caveat:
                'Where runs of different sizes in one line of label markup meet: "baseline" puts their ' +
                'alphabetic baselines on one line, "hanging" their hanging baselines, so their tops line ' +
                'up (vis-network\'s labels below a node), "middle" their middles. Unset, "baseline".',
        }),
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
        row("Border", "Border", {
            accepts: "color",
            caveat: "The color of a line drawn round the panel behind the label's words; `labelBorderWidth` sets how thick.",
        }),
        // No minimum: a channel takes exactly the numbers its schema path (`label.borderWidth`) takes.
        row("BorderWidth", "Border Width", {
            accepts: "number",
            caveat:
                "How thick the line round the panel behind the label's words is, in pixels of the label drawn at " +
                "its own size (`labelSize`). 0 draws none.",
        }),
        row("Opacity", "Opacity", {
            accepts: "number",
            min: 0,
            max: 1,
            caveat: "How opaque the label's words are, over their color's own alpha: 0 draws none.",
        }),
        row("BackgroundOpacity", "Background Opacity", {
            accepts: "number",
            min: 0,
            max: 1,
            caveat: "How opaque the panel behind the label's words is, over its color's own alpha: 0 draws none.",
        }),
        row("OutlineOpacity", "Outline Opacity", {
            accepts: "number",
            min: 0,
            max: 1,
            caveat: "How opaque the outline round the label's letters is, over its color's own alpha: 0 draws none.",
        }),
        row("BorderOpacity", "Border Opacity", {
            accepts: "number",
            min: 0,
            max: 1,
            caveat:
                "How opaque the line round the panel behind the label's words is, over its color's own alpha: 0 " +
                "draws none.",
        }),
        row("Padding", "Padding", {
            accepts: "number",
            min: 0,
            caveat:
                "How far the panel behind the label's words (its background and border) reaches past the words' " +
                "line box on every side, in pixels of the label drawn at its own size (`labelSize`); 0 puts the " +
                "border against the words. Unset, the label style's margins and padding decide.",
        }),
        row("CornerRadius", "Corner Radius", {
            accepts: "number",
            caveat:
                "How far the corners of the panel behind the label's words are rounded, in pixels of the label " +
                "drawn at its own size (`labelSize`). Unset, square corners.",
        }),
        row("LineHeight", "Line Height", {
            accepts: "number",
            caveat:
                "How tall one line of the label is, as a multiple of its font's ascent plus descent: 1 is a line " +
                "box exactly as tall as the font. Unset, 1.2.",
        }),
        row("OffsetX", "Offset X", {
            accepts: "number",
            caveat: "How far the label is moved to the right of where its location puts it, in the scene's units.",
        }),
        row("OffsetY", "Offset Y", {
            accepts: "number",
            caveat: "How far the label is moved down from where its location puts it, in the scene's units.",
        }),
        row("ShiftX", "Shift X", {
            accepts: "number",
            caveat:
                "How far the label is moved to the right again, as a fraction of its own width: -0.5 puts its " +
                "right edge where its middle was.",
        }),
        row("ShiftY", "Shift Y", {
            accepts: "number",
            caveat: "How far the label is moved down again, as a fraction of its own height.",
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
    WrapEllipsis: "wrapEllipsis",
    WrapAnywhere: "wrapAnywhere",
    WrapSpaceCount: "wrapSpaceCount",
    RunAlign: "runAlign",
    MinScreenSize: "minScreenSize",
    OnTop: "onTop",
    Rotation: "rotation",
    Background: "backgroundColor",
    Outline: "textOutlineColor",
    OutlineWidth: "textOutlineWidth",
    Border: "borderColor",
    BorderWidth: "borderWidth",
    Opacity: "textOpacity",
    BackgroundOpacity: "backgroundOpacity",
    OutlineOpacity: "textOutlineOpacity",
    BorderOpacity: "borderOpacity",
    Padding: "boxPadding",
    CornerRadius: "cornerRadius",
    LineHeight: "lineHeight",
    OffsetX: "offsetX",
    OffsetY: "offsetY",
    ShiftX: "shiftX",
    ShiftY: "shiftY",
};

/** Every weight the `labelWeight` channels take. */
const LABEL_WEIGHT_VALUES: readonly LabelWeightValue[] = ["normal", "bold"];

/** Every place the `labelRunAlign` channels take. */
const LABEL_RUN_ALIGN_VALUES: readonly LabelRunAlignValue[] = ["baseline", "hanging", "middle"];

/**
 * A node label field channel: an edge label belongs to no node, so an
 * `edge.labelMinNodeScreenSize` would paint nothing.
 */
const NODE_LABEL_MIN_NODE_SCREEN_SIZE: ChannelDescriptor = {
    channel: "node.labelMinNodeScreenSize",
    target: "node",
    plainName: "Node Label Min Node Screen Size",
    default: 0,
    shortName: "Label min node screen size",
    group: "text",
    stylePath: "label.minNodeScreenSize",
    renderable: true,
    accepts: "number",
    min: 0,
    caveat:
        "Hides the label while its node is drawn smaller than this many screen pixels across (the smaller of " +
        "its width and height), as sigma.js hides the label of a node drawn under its " +
        "`labelRenderedSizeThreshold`. Decided again whenever the camera moves. Unset or 0, the node's size " +
        "never hides its label.",
};

/**
 * Where a label field channel writes: the label style channel it lands in and the field.
 * @param channel - Any channel.
 * @returns The style channel and the field, or undefined for a channel that is not a label field.
 */
export function labelFieldOf(channel: Channel): { readonly into: Channel; readonly field: LabelFieldName } | undefined {
    if (channel === "node.labelDeclutter") {
        return { into: "node.labelStyle", field: "declutter" };
    }

    if (channel === "node.labelMinNodeScreenSize") {
        return { into: "node.labelStyle", field: "minNodeScreenSize" };
    }

    if (channel === "node.labelLocation" || channel === "edge.labelLocation") {
        return { into: channel === "node.labelLocation" ? "node.labelStyle" : "edge.labelStyle", field: "location" };
    }

    if (channel === "node.labelTextAlign" || channel === "edge.labelTextAlign") {
        return { into: channel === "node.labelTextAlign" ? "node.labelStyle" : "edge.labelStyle", field: "textAlign" };
    }

    const match =
        /^(node|edge)\.label(Color|Size|LetterSize|Font|Weight|Italic|WrapWidth|WrapTrailingSpace|WrapEllipsis|WrapAnywhere|WrapSpaceCount|RunAlign|MinScreenSize|OnTop|Rotation|Background|Outline|OutlineWidth|Border|BorderWidth|Opacity|BackgroundOpacity|OutlineOpacity|BorderOpacity|Padding|CornerRadius|LineHeight|OffsetX|OffsetY|ShiftX|ShiftY)$/.exec(
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
    const color =
        field === "color" || field === "background" || field === "outline" || field === "borderColor"
            ? asColorValue(painted)
            : null;

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
 * What a model node is, read by `node.model`.
 */
const NODE_MODEL_CAVEAT =
    "Draws the node as a 3D model: an asset id from `session.assets` or a URL. The model is fitted " +
    "to the box a node of the same size would fill, centered and lit; `node.shape` is drawn while it " +
    "loads and if it fails. A URL a layer added or updated by the page's code names is fetched at " +
    "once; a URL from a project file, an AI command, a template, an encoding or an expression waits " +
    "for the reader (`session.network`) unless its host is allowed. `node.color` applies only with " +
    "`node.modelTint`.";

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
            plainName: `${target === "node" ? "Node" : "Edge"} ${Kind} ${suffix.replaceAll(/([a-z])([A-Z])/g, "$1 $2")}`,
            shortName: `${Kind} ${suffix.replaceAll(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}`,
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
    "node.labelDeclutter": NODE_LABEL_DECLUTTER,
    "node.labelMinNodeScreenSize": NODE_LABEL_MIN_NODE_SCREEN_SIZE,
    "node.labelTextAlign": labelTextAlignChannel("node"),
    "node.labelLocation": labelLocationChannel("node"),
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
    "node.borderWaveAmplitude": {
        channel: "node.borderWaveAmplitude",
        target: "node",
        plainName: "Node Border Wave Amplitude",
        shortName: "Border wave amplitude",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "border.waveAmplitude",
        renderable: true,
        caveat:
            "How far a zigzag or sinewave border swings to either side of the ring's middle, in the units of " +
            "`node.borderWidth`. Set, the border's width is the thickness of the waving line and " +
            "`node.borderWavePeriod` how often it repeats; unset, the wave is drawn within the ring. A sine " +
            "wave's periods are each drawn straight from where they start, so on a small node they loop out " +
            "past it, as Cytoscape desktop draws them.",
    },
    "node.borderWavePeriod": {
        channel: "node.borderWavePeriod",
        target: "node",
        plainName: "Node Border Wave Period",
        shortName: "Border wave period",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "border.wavePeriod",
        renderable: true,
        caveat:
            "How far round the node a zigzag or sinewave border runs before it repeats, in the units of " +
            "`node.borderWidth`. Used with `node.borderWaveAmplitude`; unset or 0, it is four times the amplitude.",
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
    "node.imageAutoSize": {
        channel: "node.imageAutoSize",
        target: "node",
        plainName: "Node Image Auto Size",
        shortName: "Image auto size",
        group: "shape",
        default: "proportional",
        accepts: "enum",
        values: NODE_IMAGE_AUTO_SIZE_VALUES,
        stylePath: "image.autoSize",
        renderable: true,
        caveat:
            'How an image drawn at a size of its own (`node.imageFit` "none") fills the side `node.imageWidth` or ' +
            '`node.imageHeight` leaves unset: "proportional" keeps the picture\'s proportions to the side given, ' +
            '"natural" draws it at the picture\'s own pixels times `node.imagePixelSize`, as Cytoscape.js draws ' +
            "a `background-width` with an `auto` height.",
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
    "node.chartKind": {
        channel: "node.chartKind",
        target: "node",
        plainName: "Node Chart Kind",
        shortName: "Chart kind",
        group: "shape",
        default: "bar",
        accepts: "enum",
        values: NODE_CHART_KIND_VALUES,
        stylePath: "chart.kind",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartValues": {
        channel: "node.chartValues",
        target: "node",
        plainName: "Node Chart Values",
        shortName: "Chart values",
        group: "shape",
        accepts: "text",
        stylePath: "chart.values",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartColors": {
        channel: "node.chartColors",
        target: "node",
        plainName: "Node Chart Colors",
        shortName: "Chart colors",
        group: "shape",
        accepts: "text",
        stylePath: "chart.colors",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartMin": {
        channel: "node.chartMin",
        target: "node",
        plainName: "Node Chart Min",
        shortName: "Chart min",
        group: "shape",
        accepts: "number",
        stylePath: "chart.min",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartMax": {
        channel: "node.chartMax",
        target: "node",
        plainName: "Node Chart Max",
        shortName: "Chart max",
        group: "shape",
        accepts: "number",
        stylePath: "chart.max",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartHorizontal": {
        channel: "node.chartHorizontal",
        target: "node",
        plainName: "Node Chart Horizontal",
        shortName: "Chart horizontal",
        group: "shape",
        default: false,
        accepts: "boolean",
        stylePath: "chart.horizontal",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartSize": {
        channel: "node.chartSize",
        target: "node",
        plainName: "Node Chart Size",
        shortName: "Chart size",
        group: "shape",
        default: 1,
        accepts: "number",
        min: 0,
        stylePath: "chart.size",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartMargin": {
        channel: "node.chartMargin",
        target: "node",
        plainName: "Node Chart Margin",
        shortName: "Chart margin",
        group: "shape",
        default: 0,
        accepts: "number",
        stylePath: "chart.margin",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartGap": {
        channel: "node.chartGap",
        target: "node",
        plainName: "Node Chart Gap",
        shortName: "Chart gap",
        group: "shape",
        default: 0,
        accepts: "number",
        min: 0,
        max: 1,
        stylePath: "chart.gap",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartLineWidth": {
        channel: "node.chartLineWidth",
        target: "node",
        plainName: "Node Chart Line Width",
        shortName: "Chart line width",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "chart.lineWidth",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartBorderColor": {
        channel: "node.chartBorderColor",
        target: "node",
        plainName: "Node Chart Border Color",
        shortName: "Chart border color",
        group: "shape",
        accepts: "color",
        stylePath: "chart.borderColor",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
    },
    "node.chartBorderWidth": {
        channel: "node.chartBorderWidth",
        target: "node",
        plainName: "Node Chart Border Width",
        shortName: "Chart border width",
        group: "shape",
        default: 0,
        accepts: "number",
        min: 0,
        stylePath: "chart.borderWidth",
        renderable: true,
        caveat: NODE_CHART_CAVEAT,
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
    "node.shapeParts": {
        channel: "node.shapeParts",
        target: "node",
        plainName: "Node Shape Parts",
        shortName: "Shape parts",
        group: "shape",
        accepts: "text",
        stylePath: "shape.parts",
        renderable: true,
        caveat:
            "Further closed pieces of a flat node's body beside its outline: polygons as `x,y` pairs separated " +
            'by spaces, one after another separated by ";", each point relative to the node\'s center as ' +
            "fractions of its half width and half height, y up, drawn where they say (never stretched). Each is " +
            "filled in the node's color and outlined in its border's color and width, centered on it: " +
            '`-1,0.1 1,0.1 1,0.5 -1,0.5; -1,-0.1 1,-0.1 1,-0.5 -1,-0.5` beside a "polygon" node is two bars. ' +
            "Solid shapes ignore it.",
    },
    "node.shapeLines": {
        channel: "node.shapeLines",
        target: "node",
        plainName: "Node Shape Lines",
        shortName: "Shape lines",
        group: "shape",
        accepts: "text",
        stylePath: "shape.lines",
        renderable: true,
        caveat:
            "Lines drawn over a flat node in its border's color: polylines as `x,y` pairs separated by spaces, " +
            'one after another separated by ";", in the frame `node.shapeParts` uses; a polyline that ends ' +
            "where it starts is closed. Each is centered on its points, `node.shapeLineWidth` wide: " +
            "`-1,0 1,0` is a line across the node's middle, as Graphviz draws a promoter's baseline. Solid " +
            "shapes ignore it.",
    },
    "node.shapeTexts": {
        channel: "node.shapeTexts",
        target: "node",
        plainName: "Node Shape Texts",
        shortName: "Shape texts",
        group: "shape",
        accepts: "text",
        stylePath: "shape.texts",
        renderable: true,
        caveat:
            "Further texts drawn over a node in its label's font, size and color, each one line centered on its " +
            "point: a JSON list of `[x, y, text]`, the point in the frame `node.shapeParts` uses " +
            '(`[[-0.5, 0, "a"], [0.5, 0, "b"]]` is two words side by side, as Graphviz draws a record\'s ' +
            "fields). A fourth item gives what differs from the label: " +
            '`{ "size": 0.2, "color": "#404040", "font": "Arial", "rotation": 45 }`, the size a share of the ' +
            "node's height, the rotation in degrees clockwise (a chart's item labels). Drawn beside the node's " +
            "label, whatever it says.",
    },
    "node.shapeLineWidth": {
        channel: "node.shapeLineWidth",
        target: "node",
        plainName: "Node Shape Line Width",
        shortName: "Line width",
        group: "shape",
        accepts: "number",
        min: 0,
        stylePath: "shape.lineWidth",
        renderable: true,
        caveat:
            "How wide `node.shapeLines` are drawn, in the units of `node.borderWidth`. Unset, the border's " +
            "width, so a node with no border draws no lines unless this is set.",
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
    "node.gradientColors": {
        channel: "node.gradientColors",
        target: "node",
        plainName: "Node Gradient Colors",
        shortName: "Gradient colors",
        group: "color",
        accepts: "text",
        stylePath: "texture.color.colors",
        renderable: true,
        caveat: NODE_GRADIENT_CAVEAT,
    },
    "node.gradientStops": {
        channel: "node.gradientStops",
        target: "node",
        plainName: "Node Gradient Stops",
        shortName: "Gradient stops",
        group: "color",
        accepts: "text",
        stylePath: "texture.color.stops",
        renderable: true,
        caveat: NODE_GRADIENT_CAVEAT,
    },
    "node.gradientKind": {
        channel: "node.gradientKind",
        target: "node",
        plainName: "Node Gradient Kind",
        shortName: "Gradient kind",
        group: "color",
        default: "linear",
        accepts: "enum",
        values: NODE_GRADIENT_KIND_VALUES,
        stylePath: "texture.color.colorType",
        renderable: true,
        caveat: NODE_GRADIENT_CAVEAT,
    },
    "node.model": {
        channel: "node.model",
        target: "node",
        plainName: "Node Model",
        shortName: "Model",
        group: "shape",
        accepts: "text",
        stylePath: "shape.model",
        renderable: true,
        caveat: NODE_MODEL_CAVEAT,
    },
    "node.modelSourceUp": {
        channel: "node.modelSourceUp",
        target: "node",
        plainName: "Node Model Up Axis",
        shortName: "Model up axis",
        group: "shape",
        default: "detected",
        accepts: "enum",
        values: NodeModelUpAxes.options,
        stylePath: "shape.modelSourceUp",
        renderable: true,
        caveat:
            "The axis that points up in the model's file; the element turns the model so it points " +
            'up on screen. "detected": glTF and GLB are Y up by their specification, STL is taken ' +
            "as Z up and OBJ and PLY as Y up.",
    },
    "node.modelTurn": {
        channel: "node.modelTurn",
        target: "node",
        plainName: "Node Model Turn",
        shortName: "Model turn",
        group: "shape",
        default: 0,
        accepts: "number",
        min: -360,
        max: 360,
        stylePath: "shape.modelTurn",
        renderable: true,
        caveat: "A turn about the up axis, in degrees, after the up axis is applied.",
    },
    "node.modelTint": {
        channel: "node.modelTint",
        target: "node",
        plainName: "Node Model Tint",
        shortName: "Model tint",
        group: "color",
        default: "false",
        accepts: "enum",
        values: ["false", "true", "replace"],
        stylePath: "shape.modelTint",
        renderable: true,
        caveat:
            "A model keeps its own colors unless this is set: true multiplies the model's base " +
            'color by `node.color`, and "replace" paints every material in `node.color`. Takes ' +
            'true, false or "replace".',
    },
    "node.modelFit": {
        channel: "node.modelFit",
        target: "node",
        plainName: "Node Model Fit",
        shortName: "Model fit",
        group: "shape",
        default: "contain",
        accepts: "enum",
        values: NodeModelFits.options,
        stylePath: "shape.modelFit",
        renderable: true,
        caveat:
            '"contain" keeps the model\'s proportions; "stretch" fills `node.width`, `node.height` ' +
            "and `node.depth` separately.",
    },
    "node.modelCenter": {
        channel: "node.modelCenter",
        target: "node",
        plainName: "Node Model Center",
        shortName: "Model center",
        group: "shape",
        default: "bounds",
        accepts: "enum",
        values: NodeModelCenters.options,
        stylePath: "shape.modelCenter",
        renderable: true,
        caveat: '"bounds" centers the model\'s bounding box on the node; "origin" keeps the file\'s own pivot.',
    },
    "node.texture": {
        channel: "node.texture",
        target: "node",
        plainName: "Node Texture",
        shortName: "Texture",
        group: "color",
        accepts: "text",
        stylePath: "texture.image",
        renderable: true,
        caveat:
            "An image (PNG, JPEG or WebP) drawn on the node: an asset id from `session.assets` or a URL. " +
            "On a model it replaces the base color texture of every material; on a built-in shape it " +
            "is the shape's surface. The node's color then multiplies it only with `node.modelTint`. " +
            "A URL waits for the reader as a model's does (`session.network`).",
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
    "edge.minScreenWidth": {
        channel: "edge.minScreenWidth",
        target: "edge",
        plainName: "Edge Min Screen Width",
        default: 0,
        shortName: "Min screen width",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.minScreenWidth",
        renderable: true,
        caveat:
            "The fewest screen pixels wide the line is drawn, at any zoom: a line whose `edge.width` comes to " +
            "less on screen, a width of 0 included, is drawn this wide, as sigma.js draws every edge at least " +
            "its `minEdgeThickness`. Unset or 0, the line is drawn at its width alone.",
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
    "edge.outlineStyle": {
        channel: "edge.outlineStyle",
        target: "edge",
        plainName: "Edge Outline Pattern",
        shortName: "Outline pattern",
        group: "line",
        default: "solid",
        accepts: "enum",
        values: EDGE_OUTLINE_VALUES,
        stylePath: "line.outline.type",
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
    "edge.waveAmplitude": {
        channel: "edge.waveAmplitude",
        target: "edge",
        plainName: "Edge Wave Amplitude",
        shortName: "Wave amplitude",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.waveAmplitude",
        renderable: true,
        caveat:
            "How far a sinewave or zigzag line swings to either side of its path, in the units of " +
            "`edge.width`. Set, the edge's width is the thickness of the waving line and `edge.wavePeriod` " +
            "how often it repeats; unset, the wave is drawn within the edge's width.",
    },
    "edge.wavePeriod": {
        channel: "edge.wavePeriod",
        target: "edge",
        plainName: "Edge Wave Period",
        shortName: "Wave period",
        group: "line",
        accepts: "number",
        min: 0,
        stylePath: "line.wavePeriod",
        renderable: true,
        caveat:
            "How far along its path a sinewave or zigzag line runs before it repeats, in the units of " +
            "`edge.width`. Used with `edge.waveAmplitude`; unset or 0, it is four times the amplitude.",
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
            'control points are the bends (one: quadratic, two: cubic); "arc" draws the arc of the circle ' +
            "through both ends and the one bend. A straight edge or one without bends ignores it.",
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
    "edge.route": {
        channel: "edge.route",
        target: "edge",
        plainName: "Edge Route",
        shortName: "Route",
        group: "line",
        accepts: "enum",
        values: EDGE_ROUTE_VALUES,
        stylePath: "line.route",
        renderable: true,
        caveat:
            'The path an edge takes between its nodes: "straight"; "arc", raised toward the viewer in the ' +
            'vertical plane through both ends; "great-circle", along the great circle about the scene\'s ' +
            "origin, lifted at its middle. Left unset, the layout decides: the location map raises arcs " +
            "over its flat map in 3D and draws great circles on its globe; every other layout draws straight.",
    },
    "edge.arcHeight": {
        channel: "edge.arcHeight",
        target: "edge",
        plainName: "Edge Arc Height",
        shortName: "Arc height",
        group: "line",
        default: 0.25,
        accepts: "number",
        min: 0,
        stylePath: "line.arcHeight",
        renderable: true,
        caveat:
            "How high a raised route rises at its middle, as a share of the distance between its ends: " +
            "0.25 for an arc unset, 0.1 for a great circle. A straight route ignores it.",
    },
    "edge.nodeGap": {
        channel: "edge.nodeGap",
        target: "edge",
        plainName: "Edge Node Gap",
        shortName: "Node gap",
        group: "line",
        default: 0,
        accepts: "number",
        min: 0,
        stylePath: "line.nodeGap",
        renderable: true,
        caveat:
            "How far from each of its nodes' outlines the line stops, in the scene's units, leaving that " +
            "much empty between the node and the line's end; an arrow cap there moves out with it. A " +
            "self-loop ignores it.",
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
    "edge.labelTextAlign": labelTextAlignChannel("edge"),
    "edge.labelLocation": labelLocationChannel("edge"),
    ...LOOK_AND_VISIBILITY,
    ...labelFieldChannels("node"),
    ...labelFieldChannels("edge"),
    // A label's size, color and background are declared twice: as label field channels (which
    // land in the label style field by field) and as text look channels. The look rows win, because
    // they state the size and color an unset label is drawn with, the size's unit and the
    // background's "none"; the field routing (`labelFieldOf`) goes by the channel's name and holds
    // either way. The background keeps the field row's caveat.
    "node.labelSize": LOOK_AND_VISIBILITY["node.labelSize"],
    "node.labelColor": LOOK_AND_VISIBILITY["node.labelColor"],
    "node.labelBackground": {
        ...labelFieldChannels("node")["node.labelBackground"],
        ...LOOK_AND_VISIBILITY["node.labelBackground"],
    },
    "edge.labelSize": LOOK_AND_VISIBILITY["edge.labelSize"],
    "edge.labelColor": LOOK_AND_VISIBILITY["edge.labelColor"],
    "edge.labelBackground": {
        ...labelFieldChannels("edge")["edge.labelBackground"],
        ...LOOK_AND_VISIBILITY["edge.labelBackground"],
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
 * Why a binding may not write `node.model`, or null when it may (design/rendering/node-models.md,
 * section 2.2).
 *
 * An encoded or computed `node.model` -- a value map, a column of URLs, a template -- may name asset
 * ids and `http`/`https` URLs. A URL read from the data is never fetched on the binding's say-so:
 * its host must be allowed by the page or the reader (`session.network`), each distinct URL is
 * fetched once, and private addresses are refused. The values a binding lists itself (`map`,
 * `other.value`, `missing.value`) must each be one of the two; anything else could not name a model.
 * @param binding - The binding written to `node.model`.
 * @param path - Where in the specification it sits, such as `encode.node.model`.
 * @returns The `E_MODEL_URL_BLOCKED` problem, or null.
 */
export function modelBindingProblem(
    binding: Binding,
    path: string,
): { readonly code: "E_MODEL_URL_BLOCKED"; readonly message: string; readonly path: string } | null {
    if ("value" in binding || !("by" in binding)) {
        return null;
    }

    const listed: [string, unknown][] = [
        ...Object.entries(binding.map ?? {}).map(([name, value]): [string, unknown] => [`.map.${name}`, value]),
        ...(binding.other === undefined ? [] : [[".other.value", binding.other.value] as [string, unknown]]),
        ...(typeof binding.missing === "object"
            ? [[".missing.value", binding.missing.value] as [string, unknown]]
            : []),
    ];
    const bad = listed.find(
        ([, value]) => !isAssetId(value) && !(typeof value === "string" && /^https?:\/\//i.test(value)),
    );

    return bad === undefined
        ? null
        : {
              code: "E_MODEL_URL_BLOCKED",
              message:
                  `An encoded node.model names asset ids or http(s) URLs: ${JSON.stringify(bad[1])} is neither. ` +
                  "Add the file with session.assets.add and map the category to the id it returns.",
              path: `${path}${bad[0]}`,
          };
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
