/**
 * Standard color swatches for color pickers throughout the application.
 * Used by CompactColorInput, StyleColorInput, and GradientEditor.
 */
export const SWATCH_COLORS = ["#5B8FF9", "#FF6B6B", "#61D095", "#F7B731", "#9B59B6"] as const;

/**
 * Swatches with alpha channel for HEXA color pickers.
 * Includes both fully opaque (FF) and semi-transparent (80) variants.
 */
export const SWATCH_COLORS_HEXA = [
    "#5B8FF9FF",
    "#FF6B6BFF",
    "#61D095FF",
    "#F7B731FF",
    "#9B59B6FF",
    "#5B8FF980",
    "#FF6B6B80",
    "#61D09580",
    "#F7B73180",
    "#9B59B680",
] as const;

/**
 * Default color for new gradient stops.
 */
export const DEFAULT_GRADIENT_STOP_COLOR = "#888888";

/**
 * Default color for graph nodes when no color is specified.
 * Used as a fallback in color configuration functions.
 */
export const DEFAULT_GRAPH_NODE_COLOR = "#5B8FF9";
