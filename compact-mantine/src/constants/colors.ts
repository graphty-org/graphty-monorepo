/**
 * Swatches with alpha channel for HEXA color pickers.
 * Includes both fully opaque (FF) and semi-transparent (80) variants.
 * Used by CompactColorInput for color picker swatches.
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
