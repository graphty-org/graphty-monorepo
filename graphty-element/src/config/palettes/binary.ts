/**
 * Binary color palettes for highlighted vs normal states
 * All colors are colorblind-safe
 */

/**
 * Blue Highlight - universal safe hue
 * ✅ Blue is universally safe ✅ 4.5:1 contrast (WCAG AAA)
 * Uses Okabe-Ito blue for highlighted state
 */
export const BLUE_HIGHLIGHT = {
    /** The color of a highlighted element: Okabe-Ito blue. */
    highlighted: "#0072B2",
    /** The color of every other element: light gray. */
    muted: "#CCCCCC",
} as const;

/**
 * Green Success - for correct/successful states
 * Uses Okabe-Ito green
 */
export const GREEN_SUCCESS = {
    /** The color of a highlighted element: Okabe-Ito bluish green. */
    highlighted: "#009E73",
    /** The color of every other element: medium gray. */
    muted: "#999999",
} as const;

/**
 * Orange Warning - for attention/warning states
 * Uses Okabe-Ito orange
 */
export const ORANGE_WARNING = {
    /** The color of a highlighted element: Okabe-Ito orange. */
    highlighted: "#E69F00",
    /** The color of every other element: light gray. */
    muted: "#CCCCCC",
} as const;
