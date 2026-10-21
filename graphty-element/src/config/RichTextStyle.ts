import { z } from "zod";

import { AdvancedColorStyle, ColorStyle, TextLocation } from "./common";

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
    textPath: z.string().optional(),
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
