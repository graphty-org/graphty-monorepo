/**
 * Default styles derived from graphty-element.
 *
 * These values are based on the defaultNodeStyle, defaultEdgeStyle, and
 * defaultRichTextLabelStyle exported from graphty-element. They are hardcoded
 * here because TypeScript has trouble resolving the re-exports in bundler mode.
 *
 * Source values from graphty-element:
 * - Node: shape=icosphere, size=1, color=#6366F1
 * - Edge: line type=solid, width=8, color=darkgrey (#A9A9A9)
 * - Arrow: type=normal, size=1, color=darkgrey (#A9A9A9), opacity=1
 * - Label: font=Verdana, fontSize=48, textColor=#000000 (plain black text)
 *
 * Key differences from graphty-element:
 * - Opacity: graphty-element uses 0-1, UI uses 0-100
 * - Colors: converted to uppercase hex format
 * - RichTextStyle: graphty-element uses flat structure, UI uses nested font object
 *
 * To keep in sync with graphty-element, see:
 * - graphty-element/src/config/RichTextStyle.ts (defaultRichTextLabelStyle)
 */

import type {ArrowConfig, EdgeLineConfig, GlowConfig, NodeEffectsConfig, OutlineConfig, RichTextStyle, ShapeConfig, SolidColorConfig, TextBackgroundStyle, TextOutlineStyle, TextShadowStyle} from "../types/style-layer";

/**
 * Default shape configuration derived from graphty-element defaults.
 * Source: defaultNodeStyle.shape = { type: "icosphere", size: 1 }
 */
export const DEFAULT_SHAPE: ShapeConfig = {
    type: "icosphere",
    size: 1,
};

/**
 * Default color configuration derived from graphty-element defaults.
 * Source: defaultNodeStyle.texture.color = "#6366F1"
 * Typed as SolidColorConfig specifically since default is always solid.
 */
export const DEFAULT_COLOR: SolidColorConfig = {
    mode: "solid",
    color: "#6366F1",
    opacity: 1.0,
};

/**
 * Default edge line configuration derived from graphty-element defaults.
 * Source: defaultEdgeStyle.line = { type: "solid", width: 8, color: "darkgrey" }
 * Note: "darkgrey" → #A9A9A9 (CSS named color to hex)
 * Note: graphty-element uses opacity 0-1, UI uses 0-100
 */
export const DEFAULT_EDGE_LINE: EdgeLineConfig = {
    type: "solid",
    width: 8,
    color: "#A9A9A9",
    opacity: 100,
};

/**
 * Default arrow head configuration derived from graphty-element defaults.
 * Source: defaultEdgeStyle.arrowHead = { type: "normal", color: "darkgrey" }
 * Note: size defaults to 1, opacity defaults to 1 in graphty-element schema
 * Note: graphty-element uses opacity 0-1, UI uses 0-100
 */
export const DEFAULT_ARROW_HEAD: ArrowConfig = {
    type: "normal",
    size: 1,
    color: "#A9A9A9",
    opacity: 100,
};

/**
 * Default arrow tail configuration.
 * Note: graphty-element doesn't specify arrowTail in defaults, so it's "none".
 * Color matches arrow head for consistency when user changes tail type.
 */
export const DEFAULT_ARROW_TAIL: ArrowConfig = {
    type: "none",
    size: 1,
    color: "#A9A9A9",
    opacity: 100,
};

/**
 * Default glow effect configuration.
 * Uses a subtle cyan/white glow by default.
 */
export const DEFAULT_GLOW: GlowConfig = {
    enabled: true,
    color: "#FFFFFF",
    strength: 0.5,
};

/**
 * Default outline effect configuration.
 * Uses a white outline with medium width.
 */
export const DEFAULT_OUTLINE: OutlineConfig = {
    enabled: true,
    color: "#FFFFFF",
    width: 1,
};

/**
 * Default node effects configuration.
 * All effects disabled by default.
 */
export const DEFAULT_NODE_EFFECTS: NodeEffectsConfig = {
    glow: undefined,
    outline: undefined,
    wireframe: false,
    flatShaded: false,
};

/**
 * Default text outline style configuration.
 * Source: defaultRichTextLabelStyle.textOutline = false
 */
export const DEFAULT_TEXT_OUTLINE: TextOutlineStyle = {
    enabled: false,
    color: "#000000",
    width: 2,
};

/**
 * Default text shadow style configuration.
 * Source: defaultRichTextLabelStyle.textShadow = false
 */
export const DEFAULT_TEXT_SHADOW: TextShadowStyle = {
    enabled: false,
    color: "#000000",
    blur: 4,
    offsetX: 2,
    offsetY: 2,
};

/**
 * Default text background style configuration.
 * Source: defaultRichTextLabelStyle.backgroundPadding = 0
 */
export const DEFAULT_TEXT_BACKGROUND: TextBackgroundStyle = {
    enabled: false,
    color: "#000000",
    padding: 0,
    borderRadius: 0,
};

/**
 * Default rich text style configuration for labels and tooltips.
 * Source: defaultRichTextLabelStyle from graphty-element
 * - font = "Verdana", fontSize = 48, fontWeight = "normal"
 * - textColor = "#000000" (plain black text, no outline)
 * Note: graphty-element uses flat structure, UI uses nested font object.
 */
export const DEFAULT_RICH_TEXT_STYLE: RichTextStyle = {
    enabled: false,
    text: "",
    location: "static",
    font: {
        family: "Verdana",
        size: 48,
        weight: 400,
        color: "#000000",
    },
    background: undefined,
    position: {
        attachPosition: "above",
        offset: 0,
        billboard: true,
    },
    effects: undefined,
    animation: undefined,
    advanced: {
        resolution: 128,
        depthFade: false,
    },
};
