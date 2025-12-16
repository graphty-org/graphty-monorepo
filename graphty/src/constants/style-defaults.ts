/**
 * Default values for all style properties.
 * Used by StyleNumberInput, StyleColorInput, and StyleSelect to:
 * 1. Show placeholder values when a property is not explicitly set
 * 2. Distinguish between default (muted) and explicit (normal) styling
 * 3. Provide reset functionality (reset to undefined, which shows default)
 */

/**
 * Node shape and size defaults.
 */
export const NODE_DEFAULTS = {
    shapeType: "sphere",
    size: 1.0,
} as const;

/**
 * Node color defaults.
 */
export const NODE_COLOR_DEFAULTS = {
    color: "#5B8FF9",
    opacity: 100,
    colorMode: "solid" as const,
} as const;

/**
 * Node effect defaults.
 */
export const NODE_EFFECT_DEFAULTS = {
    glowColor: "#FFFFFF",
    glowStrength: 0.5,
    outlineColor: "#000000",
    outlineWidth: 1,
    wireframe: false,
    flatShaded: false,
} as const;

/**
 * Edge line style defaults.
 */
export const EDGE_LINE_DEFAULTS = {
    lineType: "solid",
    width: 1,
    color: "#CCCCCC",
    opacity: 100,
    bezier: false,
    animationSpeed: 0,
} as const;

/**
 * Edge arrow defaults.
 */
export const EDGE_ARROW_DEFAULTS = {
    type: "none",
    size: 1,
    color: "#CCCCCC",
} as const;

/**
 * Text/label defaults.
 */
export const TEXT_DEFAULTS = {
    fontFamily: "Arial",
    fontSize: 12,
    fontWeight: 400,
    fontColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 70,
    backgroundPadding: 4,
    backgroundRadius: 2,
    position: "above" as const,
    offsetX: 0,
    offsetY: 0,
    billboard: true,
    resolution: 256,
    depthFade: true,
} as const;

/**
 * Text effect defaults.
 */
export const TEXT_EFFECT_DEFAULTS = {
    outlineColor: "#000000",
    outlineWidth: 0,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
} as const;

/**
 * Type helpers for accessing default values.
 */
export type NodeDefaults = typeof NODE_DEFAULTS;
export type NodeColorDefaults = typeof NODE_COLOR_DEFAULTS;
export type NodeEffectDefaults = typeof NODE_EFFECT_DEFAULTS;
export type EdgeLineDefaults = typeof EDGE_LINE_DEFAULTS;
export type EdgeArrowDefaults = typeof EDGE_ARROW_DEFAULTS;
export type TextDefaults = typeof TEXT_DEFAULTS;
export type TextEffectDefaults = typeof TEXT_EFFECT_DEFAULTS;

/**
 * All defaults combined for convenience.
 */
export const STYLE_DEFAULTS = {
    node: NODE_DEFAULTS,
    nodeColor: NODE_COLOR_DEFAULTS,
    nodeEffect: NODE_EFFECT_DEFAULTS,
    edgeLine: EDGE_LINE_DEFAULTS,
    edgeArrow: EDGE_ARROW_DEFAULTS,
    text: TEXT_DEFAULTS,
    textEffect: TEXT_EFFECT_DEFAULTS,
} as const;
