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
    x: z.number(),
    y: z.number(),
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
    width: z.number(),
    color: ColorStyle,
    spacing: z.number(),
});

// Main RichTextStyle schema
export const RichTextStyle = z.strictObject({
    // Basic properties from original TextBlockStyle
    enabled: z.boolean().default(false).optional(),
    textPath: z.string().refine(compiles, { message: "textPath is not a JMESPath expression" }).optional(),
    location: TextLocation.default("top").optional(),

    // Text content
    text: z.string().optional(),

    // Font settings
    font: z.string().default("Verdana").optional(),
    fontSize: z.number().default(48).optional(),
    // How tall one line is drawn in the scene, in the units of a node's size; unset, fontSize / 48.
    size: z.number().positive().optional(),
    // How tall the letters (one font size) are drawn in the scene; set, it decides the label's size over size.
    letterSize: z.number().min(0).optional(),
    // How wide one line may be drawn in the scene before the words wrap onto the next; unset, a
    // line is as long as its words.
    wrapWidth: z.number().min(0).optional(),
    // Whether a space after each word counts toward wrapWidth; unset, only the words do.
    wrapTrailingSpace: z.boolean().optional(),
    // Whether a line wider than wrapWidth is cut to fit with an ellipsis after it, in place of wrapping.
    wrapEllipsis: z.boolean().optional(),
    // Whether a line may break between any two letters, not only at its spaces.
    wrapAnywhere: z.boolean().optional(),
    // How many blanks a blank between two words counts as against wrapWidth; unset, one.
    wrapSpaceCount: z.number().min(0).optional(),
    // The most lines drawn; the last one kept ends in an ellipsis when more were cut. Unset, every line.
    maxLines: z.number().int().min(1).optional(),
    // Whether a blank line before or between lines of words is one line tall; unset, it takes no height.
    keepBlankLines: z.boolean().optional(),
    // Where runs of different sizes in one line meet: their alphabetic baselines, hanging baselines or middles.
    runAlign: z.enum(["baseline", "hanging", "middle"]).optional(),
    // How far the label is turned, in degrees clockwise on screen, about its own center.
    rotation: z.number().optional(),
    fontWeight: z.string().default("normal").optional(),
    fontStyle: z.enum(["normal", "italic"]).default("normal").optional(),
    lineHeight: z.number().default(1.2).optional(),
    // Below how many screen pixels tall the letters are drawn the label is hidden; unset, never.
    minScreenSize: z.number().min(0).optional(),
    // Whether this node label is hidden where it overlaps a label kept first, and which is kept
    // first; unset, only the graph's `labels.declutter` behavior hides labels.
    declutter: z.enum(["degree", "size"]).optional(),
    // Below how many screen pixels across its node is drawn this node label is hidden; unset, never.
    minNodeScreenSize: z.number().min(0).optional(),

    // Colors
    textColor: ColorStyle.default("#000000").optional(),
    // How opaque the words are, over their color's own alpha; unset, 1.
    textOpacity: z.number().min(0).max(1).optional(),
    backgroundColor: AdvancedColorStyle.or(ColorStyle).optional(),
    // How opaque the background is, over its color's own alpha; unset, 1.
    backgroundOpacity: z.number().min(0).max(1).optional(),

    // Single border (legacy)
    borderWidth: z.number().default(0).optional(),
    borderColor: ColorStyle.default("#000000").optional(),
    // How opaque the border is, over its color's own alpha; unset, 1.
    borderOpacity: z.number().min(0).max(1).optional(),

    // Multiple borders
    borders: z.array(BorderConfig).optional(),

    // The label laid out as a table of cells, as JSON (the `node.labelTable` value: see the `edge.labelTable`
    // channel). Set, the label is the table: its cells' fills, outlines, rules and lines are drawn in place of the
    // words, the panel is the table's size with no margin or padding, and its border stands for the table's outline.
    table: z.string().optional(),

    // Margins
    marginTop: z.number().default(5).optional(),
    marginBottom: z.number().default(5).optional(),
    marginLeft: z.number().default(5).optional(),
    marginRight: z.number().default(5).optional(),

    // Layout
    textAlign: TextAlign.default("center").optional(),
    cornerRadius: z.number().default(0).optional(),
    autoSize: z.boolean().default(true).optional(),
    resolution: z.number().default(128).optional(),
    billboardMode: z.number().default(7).optional(), // BABYLON.Mesh.BILLBOARDMODE_ALL

    // Position
    position: Position3D.optional(),
    attachPosition: AttachPosition.optional(),
    attachOffset: z.number().default(0).optional(),
    // How far the label is moved right and down of where attachPosition puts it, in the scene's units.
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    // How far it is moved right and down again, as fractions of its own width and height.
    shiftX: z.number().optional(),
    shiftY: z.number().optional(),
    // What the shifts are fractions of: the whole box (margins and all) or the words alone.
    shiftOf: z.enum(["box", "words"]).optional(),
    // What a label outside its target is placed against it by: the whole box, or the words' own font box.
    gapOf: z.enum(["box", "words"]).optional(),
    // What its box is sized to, and whether a box larger than its target stays against the side it names.
    box: z.enum(["words", "words-at-side", "target-width"]).optional(),

    // Screen fit (labelScreenFit.ts). No defaults, so a label that names neither is painted
    // exactly as before.
    sizeMode: z.enum(["world", "screen"]).optional(),
    keepInView: z.boolean().optional(),

    // Depth fading
    depthFadeEnabled: z.boolean().default(false).optional(),
    depthFadeNear: z.number().default(10).optional(),
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

    // Text effects
    textOutline: z.boolean().default(false).optional(),
    textOutlineWidth: z.number().default(2).optional(),
    textOutlineColor: ColorStyle.default("#000000").optional(),
    // How opaque the outline is, over its color's own alpha; unset, 1.
    textOutlineOpacity: z.number().min(0).max(1).optional(),
    textOutlineJoin: CanvasLineJoin.default("round").optional(),
    textShadow: z.boolean().default(false).optional(),
    textShadowColor: ColorStyle.default("#000000").optional(),
    textShadowBlur: z.number().default(4).optional(),
    textShadowOffsetX: z.number().default(2).optional(),
    textShadowOffsetY: z.number().default(2).optional(),

    // Background effects
    backgroundPadding: z.number().default(0).optional(),
    // How far the panel reaches past the words' line box on every side; set, it replaces the
    // margins and backgroundPadding.
    boxPadding: z.number().min(0).optional(),
    panelShadow: z.boolean().default(false).optional(),
    panelShadowColor: ColorStyle.default("rgba(0, 0, 0, 0.3)").optional(),
    panelShadowBlur: z.number().min(0).default(16).optional(),
    panelShadowOffsetX: z.number().default(0).optional(),
    panelShadowOffsetY: z.number().default(6).optional(),
    backgroundGradient: z.boolean().default(false).optional(),
    backgroundGradientType: GradientType.default("linear").optional(),
    backgroundGradientColors: z.array(ColorStyle).optional(),
    backgroundGradientDirection: GradientDirection.default("vertical").optional(),

    // Pointer/Arrow
    pointer: z.boolean().default(false).optional(),
    pointerDirection: z.enum(["top", "bottom", "left", "right", "auto"]).default("auto").optional(),
    pointerWidth: z.number().default(20).optional(),
    pointerHeight: z.number().default(10).optional(),
    pointerOffset: z.number().default(0).optional(),
    pointerCurve: z.boolean().default(false).optional(),

    // Animation
    animation: AnimationType.default("none").optional(),
    animationSpeed: z.number().default(1).optional(),

    // Badge
    badge: BadgeType.optional(),
    icon: z.string().optional(),
    iconPosition: z.enum(["left", "right"]).default("left").optional(),
    progress: z.number().min(0).max(1).optional(),

    // Smart overflow
    smartOverflow: z.boolean().default(false).optional(),
    maxNumber: z.number().default(999).optional(),
    overflowSuffix: z.string().default("+").optional(),

    // An x in the panel's top-right corner that clears the selection when clicked
    closeButton: z.boolean().default(false).optional(),
});

// Type export for convenience
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
 * A label's background color as the one string the label renderer takes: an advanced color style's solid value,
 * or a gradient's first color as a fallback.
 * @param color - The block's background color.
 * @returns The color, or undefined for none.
 */
function labelBackgroundColor(color: RichTextStyleType["backgroundColor"]): string | undefined {
    if (!color) {
        return undefined;
    }
    if (typeof color === "string") {
        return color;
    }
    if (color.colorType === "solid") {
        return color.value;
    }
    if (color.colorType === "gradient") {
        return color.colors[0];
    }
    return undefined;
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
