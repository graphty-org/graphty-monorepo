import * as jmespath from "jmespath";
import { z } from "zod";

import type { RichTextLabelOptions } from "../meshes/RichTextLabel";
import { AdvancedColorStyle, ColorStyle, TextLocation } from "./common";

/** jmespath's parser, which its type declarations leave out (it is exported by jmespath 0.16). */
const { compile } = jmespath as unknown as { compile: (expression: string) => unknown };

/**
 * Whether a JMESPath expression parses (issue #6845). A label's `textPath` is checked once, when its style is set, so
 * a typo is refused there rather than drawing every label as its fallback.
 * @param expression - The expression.
 * @returns True when it parses.
 */
function compiles(expression: string): boolean {
    // an empty path names no path, as it always did
    if (expression === "") {
        return true;
    }
    try {
        compile(expression);
        return true;
    } catch {
        return false;
    }
}

/**
 * The colors a label's background gradient runs through when it is switched on and names none.
 * @internal
 */
export const DEFAULT_LABEL_GRADIENT_COLORS: readonly string[] = Object.freeze([
    "rgba(0, 0, 0, 0.8)",
    "rgba(50, 50, 50, 0.8)",
]);

// Position types
const Position3D = z.strictObject({
    /** The x coordinate, in the scene's units. */
    x: z.number(),
    /** The y coordinate, in the scene's units. */
    y: z.number(),
    /** The z coordinate, in the scene's units. */
    z: z.number(),
});

const AttachPosition = z.enum([
    "top",
    "top-left",
    "top-right",
    "left",
    "center",
    "right",
    "bottom",
    "bottom-left",
    "bottom-right",
    // Inside the target against that side or in that corner, as a group's header label.
    "inside-top",
    "inside-bottom",
    "inside-left",
    "inside-right",
    "inside-top-left",
    "inside-top-right",
    "inside-bottom-left",
    "inside-bottom-right",
]);

const TextAlign = z.enum(["left", "center", "right"]);
const AnimationType = z.enum(["none", "pulse", "bounce", "shake", "glow", "fill"]);
const BadgeType = z.enum([
    "notification",
    "label",
    "label-success",
    "label-warning",
    "label-danger",
    "count",
    "icon",
    "progress",
    "dot",
]);
const GradientType = z.enum(["linear", "radial"]);
const GradientDirection = z.enum(["vertical", "horizontal", "diagonal"]);
const CanvasLineJoin = z.enum(["round", "bevel", "miter"]);

// Border configuration
const BorderConfig = z.strictObject({
    /** The border's width, in texture pixels. */
    width: z.number(),
    /** The border's color. */
    color: ColorStyle,
    /** The gap between this border and the next one in, in texture pixels. */
    spacing: z.number(),
});

/** The style of one rich-text block: a node's label or tooltip, or an edge's label or a caption at one of its ends. */
export const RichTextStyle = z.strictObject({
    /** Whether the block is drawn. Default false. */
    enabled: z.boolean().default(false).optional(),
    /**
     * A JMESPath expression read from the element's data to give the words, used when `text` is unset. Checked when
     * the style is set: an expression that does not parse is refused.
     */
    textPath: z.string().refine(compiles, { message: "textPath is not a JMESPath expression" }).optional(),
    /** Where the block sits against its node or edge. Default "top". */
    location: TextLocation.default("top").optional(),

    /** The words drawn; set, it is used in place of `textPath`. */
    text: z.string().optional(),

    /** The font family. Default "Verdana". */
    font: z.string().default("Verdana").optional(),
    /** The font size, in pixels of the label's texture. Default 48. */
    fontSize: z.number().default(48).optional(),
    /** How tall one line is drawn in the scene, in the units of a node's size; unset, fontSize / 48. */
    size: z.number().positive().optional(),
    /** How tall the letters (one font size) are drawn in the scene; set, it decides the label's size over `size`. */
    letterSize: z.number().min(0).optional(),
    /**
     * How wide one line may be drawn in the scene before the words wrap onto the next; unset, a line is as long as
     * its words.
     */
    wrapWidth: z.number().min(0).optional(),
    /** Whether a space after each word counts toward `wrapWidth`; unset, only the words do. */
    wrapTrailingSpace: z.boolean().optional(),
    /** With `wrapTrailingSpace`, whether a line's last word is measured without a space after it; unset, with one. */
    wrapSkipEndSpace: z.boolean().optional(),
    /** Whether a line wider than `wrapWidth` is cut to fit with an ellipsis after it, in place of wrapping. */
    wrapEllipsis: z.boolean().optional(),
    /** Whether a line may break between any two letters, not only at its spaces. */
    wrapAnywhere: z.boolean().optional(),
    /** How many blanks a blank between two words counts as against `wrapWidth`; unset, one. */
    wrapSpaceCount: z.number().min(0).optional(),
    /** The most lines drawn; the last one kept ends in an ellipsis when more were cut. Unset, every line. */
    maxLines: z.number().int().min(1).optional(),
    /** Whether the last line `maxLines` keeps runs on, cut with an ellipsis; false, the rest is dropped. Unset, true. */
    maxLinesEllipsis: z.boolean().optional(),
    /** Whether a blank line before or between lines of words is one line tall; unset, it takes no height. */
    keepBlankLines: z.boolean().optional(),
    /** Where runs of different sizes in one line meet: their alphabetic baselines, hanging baselines or middles. */
    runAlign: z.enum(["baseline", "hanging", "middle"]).optional(),
    /** How far the label is turned, in degrees clockwise on screen, about its own center. */
    rotation: z.number().optional(),
    /** The CSS font weight. Default "normal". */
    fontWeight: z.string().default("normal").optional(),
    /** The font style. Default "normal". */
    fontStyle: z.enum(["normal", "italic"]).default("normal").optional(),
    /** The height of one line, as a multiple of what `lineBox` measures. Default 1.2. */
    lineHeight: z.number().default(1.2).optional(),
    /**
     * What one line is as tall as before `lineHeight`: its font's ascent plus descent, its font size, or its letters'
     * ink.
     */
    lineBox: z.enum(["font", "size", "glyphs"]).optional(),
    /** Where the border is drawn: past the panel's edge, or centered on it. */
    borderAlign: z.enum(["outside", "center"]).optional(),
    /** The panel's shape: a rectangle, or a disc as wide as its shorter side. */
    backgroundShape: z.enum(["rectangle", "circle"]).optional(),
    /** Below how many screen pixels tall the letters are drawn the label is hidden; unset, never. */
    minScreenSize: z.number().min(0).optional(),
    /**
     * Whether this node label is hidden where it overlaps a label kept first, and which is kept first (the node of
     * higher degree or larger size); unset, only the graph's `labels.declutter` behavior hides labels.
     */
    declutter: z.enum(["degree", "size"]).optional(),
    /** Below how many screen pixels across its node is drawn this node label is hidden; unset, never. */
    minNodeScreenSize: z.number().min(0).optional(),

    /** The color of the words. Default "#000000". */
    textColor: ColorStyle.default("#000000").optional(),
    /** How opaque the words are, over their color's own alpha; unset, 1. */
    textOpacity: z.number().min(0).max(1).optional(),
    /** The panel's color: a color string, or a solid color or gradient object. Unset, no panel. */
    backgroundColor: AdvancedColorStyle.or(ColorStyle).optional(),
    /** How opaque the background is, over its color's own alpha; unset, 1. */
    backgroundOpacity: z.number().min(0).max(1).optional(),

    /** The width of a single border around the panel, in texture pixels. Default 0 (none). */
    borderWidth: z.number().default(0).optional(),
    /** The color of the single border. Default "#000000". */
    borderColor: ColorStyle.default("#000000").optional(),
    /** How opaque the border is, over its color's own alpha; unset, 1. */
    borderOpacity: z.number().min(0).max(1).optional(),

    /** Several borders drawn one inside the next, outermost first; set, used in place of `borderWidth`. */
    borders: z.array(BorderConfig).optional(),

    /**
     * The label laid out as a table of cells, as JSON (the `node.labelTable` value: see the `edge.labelTable`
     * channel). Set, the label is the table: its cells' fills, outlines, rules and lines are drawn in place of the
     * words, the panel is the table's size with no margin or padding, and its border stands for the table's outline.
     */
    table: z.string().optional(),

    /** Space above the words inside the panel, in texture pixels. Default 5. */
    marginTop: z.number().default(5).optional(),
    /** Space below the words inside the panel, in texture pixels. Default 5. */
    marginBottom: z.number().default(5).optional(),
    /** Space left of the words inside the panel, in texture pixels. Default 5. */
    marginLeft: z.number().default(5).optional(),
    /** Space right of the words inside the panel, in texture pixels. Default 5. */
    marginRight: z.number().default(5).optional(),

    /** How lines of different widths are aligned. Default "center". */
    textAlign: TextAlign.default("center").optional(),
    /** The radius of the panel's corners, in texture pixels. Default 0 (square). */
    cornerRadius: z.number().default(0).optional(),
    /** Whether the label's texture is sized to its words; false, it is `resolution` pixels wide. Default true. */
    autoSize: z.boolean().default(true).optional(),
    /** The texture's width in pixels when `autoSize` is false. Default 128. */
    resolution: z.number().default(128).optional(),
    /** The Babylon.js billboard mode the label's plane turns to the camera with. Default 7 (every axis). */
    billboardMode: z.number().default(7).optional(),

    /** A fixed position for the label in the scene, used in place of hanging it from its node or edge. */
    position: Position3D.optional(),
    /** The side or corner of its target the label hangs against. */
    attachPosition: AttachPosition.optional(),
    /** How far the label stands off its target, in the scene's units. Default 0. */
    attachOffset: z.number().default(0).optional(),
    /** How far the label is moved right of where `attachPosition` puts it, in the scene's units. */
    offsetX: z.number().optional(),
    /** How far the label is moved down of where `attachPosition` puts it, in the scene's units. */
    offsetY: z.number().optional(),
    /** How far it is moved right again, as a fraction of its own width. */
    shiftX: z.number().optional(),
    /** How far it is moved down again, as a fraction of its own height. */
    shiftY: z.number().optional(),
    /** What the shifts are fractions of: the whole box (margins and all) or the words alone. */
    shiftOf: z.enum(["box", "words"]).optional(),
    /** What a label outside its target is placed against it by: the whole box, or the words' own font box. */
    gapOf: z.enum(["box", "words"]).optional(),
    /** What its box is sized to, and whether a box larger than its target stays against the side it names. */
    box: z.enum(["words", "words-at-side", "target-width"]).optional(),

    /**
     * Whether the label's size is in the scene's units ("world") or held at a size on screen ("screen"); unset, as
     * "world".
     */
    sizeMode: z.enum(["world", "screen"]).optional(),
    /** Whether the label is moved to stay inside the view; unset, false. */
    keepInView: z.boolean().optional(),

    /** Whether the label fades out with its distance from the camera. Default false. */
    depthFadeEnabled: z.boolean().default(false).optional(),
    /** The camera distance at and under which a fading label is fully opaque. Default 10. */
    depthFadeNear: z.number().default(10).optional(),
    /** The camera distance at and past which a fading label is fully transparent. Default 50. */
    depthFadeFar: z.number().default(50).optional(),

    /**
     * Draw the text over the whole graph instead of sorting it by depth with the nodes and
     * edges. Off (unset) by default: a node or an edge nearer the camera passes in front of the
     * label. On, the label is never covered, so a name behind a sphere or under a selected
     * edge's band stays whole.
     */
    onTop: z.boolean().optional(),
    /**
     * Let a click on a node's label count as a click on that node. Off (unset) by default: the
     * label plane takes the pick and answers no node, so a click on a name selects nothing and a
     * label drawn over its sphere hides that part of it from the pointer. On, every pointer
     * handler and `elementAt` resolve the label to the node it labels. No effect on an edge's
     * label.
     */
    pickable: z.boolean().optional(),

    /** Whether the words are outlined. Default false. */
    textOutline: z.boolean().default(false).optional(),
    /** The outline's width, in texture pixels. Default 2. */
    textOutlineWidth: z.number().default(2).optional(),
    /** The outline's color. Default "#000000". */
    textOutlineColor: ColorStyle.default("#000000").optional(),
    /** How opaque the outline is, over its color's own alpha; unset, 1. */
    textOutlineOpacity: z.number().min(0).max(1).optional(),
    /** How the outline's corners are joined. Default "round". */
    textOutlineJoin: CanvasLineJoin.default("round").optional(),
    /** Whether the words cast a shadow. Default false. */
    textShadow: z.boolean().default(false).optional(),
    /** The words' shadow color. Default "#000000". */
    textShadowColor: ColorStyle.default("#000000").optional(),
    /** The words' shadow blur, in texture pixels. Default 4. */
    textShadowBlur: z.number().default(4).optional(),
    /** How far right the words' shadow falls, in texture pixels. Default 2. */
    textShadowOffsetX: z.number().default(2).optional(),
    /** How far down the words' shadow falls, in texture pixels. Default 2. */
    textShadowOffsetY: z.number().default(2).optional(),

    /** Extra space between the margins and the panel's edge on every side, in texture pixels. Default 0. */
    backgroundPadding: z.number().default(0).optional(),
    /**
     * How far the panel reaches past the words' line box on every side; set, it replaces the margins and
     * `backgroundPadding`.
     */
    boxPadding: z.number().min(0).optional(),
    /** Whether the panel casts a shadow. Default false. */
    panelShadow: z.boolean().default(false).optional(),
    /** The panel's shadow color. Default "rgba(0, 0, 0, 0.3)". */
    panelShadowColor: ColorStyle.default("rgba(0, 0, 0, 0.3)").optional(),
    /** The panel's shadow blur, in texture pixels. Default 16. */
    panelShadowBlur: z.number().min(0).default(16).optional(),
    /** How far right the panel's shadow falls, in texture pixels. Default 0. */
    panelShadowOffsetX: z.number().default(0).optional(),
    /** How far down the panel's shadow falls, in texture pixels. Default 6. */
    panelShadowOffsetY: z.number().default(6).optional(),
    /** Whether the panel is filled with a gradient through `backgroundGradientColors`. Default false. */
    backgroundGradient: z.boolean().default(false).optional(),
    /** The panel gradient's kind. Default "linear". */
    backgroundGradientType: GradientType.default("linear").optional(),
    /** The colors the panel gradient runs through; unset, a dark gray pair. */
    backgroundGradientColors: z.array(ColorStyle).optional(),
    /** The direction a linear panel gradient runs. Default "vertical". */
    backgroundGradientDirection: GradientDirection.default("vertical").optional(),

    /** Whether the panel has a speech-bubble pointer toward its target. Default false. */
    pointer: z.boolean().default(false).optional(),
    /** The side the pointer leaves the panel from; "auto" picks the side facing the target. Default "auto". */
    pointerDirection: z.enum(["top", "bottom", "left", "right", "auto"]).default("auto").optional(),
    /** The pointer's width at the panel, in texture pixels. Default 20. */
    pointerWidth: z.number().default(20).optional(),
    /** How far the pointer reaches from the panel, in texture pixels. Default 10. */
    pointerHeight: z.number().default(10).optional(),
    /** How far the pointer is moved along its side from the middle, in texture pixels. Default 0. */
    pointerOffset: z.number().default(0).optional(),
    /** Whether the pointer's sides are curved. Default false. */
    pointerCurve: z.boolean().default(false).optional(),

    /** The label's animation. Default "none". */
    animation: AnimationType.default("none").optional(),
    /** How fast the animation runs, as a multiple of its normal speed. Default 1. */
    animationSpeed: z.number().default(1).optional(),

    /** A preset badge look applied under the block's own settings. */
    badge: BadgeType.optional(),
    /** Text (an emoji or a symbol) drawn beside the words, or in place of them when there are none. */
    icon: z.string().optional(),
    /** Which side of the words `icon` is drawn on. Default "left". */
    iconPosition: z.enum(["left", "right"]).default("left").optional(),
    /** How full the progress bar a "progress" badge draws is, from 0 to 1. */
    progress: z.number().min(0).max(1).optional(),

    /** Whether a whole number above `maxNumber` is drawn as `maxNumber` followed by `overflowSuffix`. Default false. */
    smartOverflow: z.boolean().default(false).optional(),
    /** The largest number `smartOverflow` draws in full. Default 999. */
    maxNumber: z.number().default(999).optional(),
    /** What `smartOverflow` draws after a capped number. Default "+". */
    overflowSuffix: z.string().default("+").optional(),

    /** Whether an x is drawn in the panel's top-right corner that clears the selection when clicked. Default false. */
    closeButton: z.boolean().default(false).optional(),
});

/** The parsed form of {@link RichTextStyle}: one label, tooltip or caption block's settings. */
export type RichTextStyleType = z.infer<typeof RichTextStyle>;

/**
 * Default values for RichTextStyle labels.
 * Parsed from the Zod schema to ensure defaults stay in sync.
 */
export const defaultRichTextLabelStyle: RichTextStyleType = RichTextStyle.parse({});

/**
 * The smallest font size that draws any text. A size under it (0, or a negative number, which
 * the schema accepts) draws no text at all, and a layer that writes one is told so with
 * `W_TEXT_TOO_SMALL`.
 */
export const MIN_DRAWN_FONT_SIZE = 1;

/**
 * Whether a resolved text block draws: switched on, and at a size that draws text.
 * @param block - The resolved label, tooltip or caption block.
 * @returns The block when it draws, else undefined.
 */
export function drawnText<T extends Pick<RichTextStyleType, "enabled" | "fontSize">>(
    block: T | undefined,
): T | undefined {
    return block?.enabled === true && (block.fontSize === undefined || block.fontSize >= MIN_DRAWN_FONT_SIZE)
        ? block
        : undefined;
}

/**
 * The words a label, tooltip or caption block draws for one element: its own `text`, or what its `textPath` reads from
 * the element's data.
 * @param data - The element's data.
 * @param block - The block.
 * @returns The words, or undefined when the block names none (the caller's fallback then applies).
 */
export function labelTextOf(data: unknown, block: Record<string, unknown> | undefined): string | undefined {
    const text = block?.text;
    if (text !== undefined && text !== null) {
        return typeof text === "string" || typeof text === "number" || typeof text === "boolean"
            ? String(text)
            : undefined;
    }
    const path = block?.textPath;
    if (typeof path !== "string" || path === "") {
        return undefined;
    }
    // The expression parsed when the style was set (`RichTextStyle`). What can still throw is a function given a value
    // of the wrong type by this element's own data (`length(@)` on a number), which is this element having no value
    // for the path, as a missing key is.
    try {
        const found: unknown = jmespath.search(data, path);
        if (found === null || found === undefined) {
            return undefined;
        }
        return typeof found === "string" ? found : JSON.stringify(found);
    } catch {
        return undefined;
    }
}

/**
 * A label's background color in the form the label renderer draws: a color string, an advanced
 * color style's solid value, or a gradient (linear or radial, with its stops) as it is, which the
 * renderer paints itself.
 * @param color - The block's background color.
 * @returns The color, or undefined for none.
 */
function labelBackgroundColor(
    color: RichTextStyleType["backgroundColor"],
): RichTextStyleType["backgroundColor"] | undefined {
    if (typeof color === "object" && color.colorType === "solid") {
        return color.value;
    }
    return color;
}

/**
 * A label's borders with a color each, the only ones the label renderer can draw.
 * @param borders - The block's borders.
 * @returns The borders, or undefined when none has a color, so the renderer's default empty list is used.
 */
function labelBorders(
    borders: RichTextStyleType["borders"],
): { width: number; color: string; spacing: number }[] | undefined {
    const valid = (borders ?? [])
        .filter((border): border is typeof border & { color: string } => border.color !== undefined)
        .map((border) => ({ width: border.width, color: border.color, spacing: border.spacing }));
    return valid.length > 0 ? valid : undefined;
}

/**
 * The options the label renderer takes for one rich-text block, shared by a node's label and tooltip and an edge's
 * label and captions: the block, with what its owner works out (the words, where it hangs) over it, its colors and
 * borders in the forms the renderer draws, and without the fields only the style reads.
 * @param block - The resolved rich-text block.
 * @param set - What the owner works out: the words, and where and against what the label hangs.
 * @returns The options.
 */
export function richTextLabelOptions(
    block: RichTextStyleType,
    set: Partial<RichTextLabelOptions>,
): RichTextLabelOptions {
    let backgroundGradientColors = block.backgroundGradientColors?.filter(
        (color): color is string => color !== undefined,
    );
    if (backgroundGradientColors?.length === 0) {
        backgroundGradientColors = undefined;
    }
    const borders = labelBorders(block.borders);
    const backgroundColor = labelBackgroundColor(block.backgroundColor);
    const {
        location: _location,
        textPath: _textPath,
        enabled: _enabled,
        ...options
    }: RichTextLabelOptions = {
        ...block,
        ...set,
        // a transparent panel is no panel
        backgroundColor: backgroundColor === "transparent" ? undefined : backgroundColor,
        backgroundGradientColors,
        ...(borders !== undefined && { borders }),
    };
    return options;
}
