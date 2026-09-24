/**
 * Color interpolation utilities.
 *
 * Every function here is total over the values it is handed. A value that is missing,
 * null, NaN or infinite yields a colour; it never yields an exception and never yields
 * `undefined` wearing the `string` type. This matters because these functions run once
 * per node inside a repaint loop that has no try/catch: a single throw from one node
 * aborts the loop, and every node after it silently keeps its old style.
 *
 * The one thing that does throw is an empty palette -- see {@link interpolatePalette}.
 *
 * The module depends on nothing but the language: no Babylon, no Lit, no DOM. It runs in
 * Node, in a worker and in a legend drawn by a consumer who never loads a 3D engine.
 */

/**
 * The colour returned when a ramp is asked for a value that does not exist.
 *
 * It is the missing-texture magenta rather than a grey, and deliberately so. A grey reads
 * as a real low measurement, sits comfortably inside several of the palettes here, and so
 * turns "nothing was measured" into a picture that looks measured. Magenta appears in no
 * palette in this package, so a reader who sees it knows at a glance that the value was
 * absent rather than small.
 *
 * Seeing it on screen is a report, not a design: it means a style layer asked a ramp for
 * an element the algorithm never measured. The repair is to scope the layer so the
 * unmeasured element is never visited, not to pick a prettier colour here.
 */
export const MISSING_DATA_COLOR = "#ff00ff";

/**
 * The red, green and blue channels of a colour, each 0-255.
 */
export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Six hex digits, optionally preceded by a hash. Three-digit shorthand is not accepted,
 * because every palette in this package is written long-form.
 */
const HEX_COLOR_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/**
 * Parse a hex color string to RGB components.
 * @param hex - Hex color string (e.g., "#440154"), or a missing value.
 * @returns The three channels, or null if the input is not a six-digit hex colour.
 * @example
 * hexToRgb("#440154")  // { r: 68, g: 1, b: 84 }
 * hexToRgb("#fff")     // null
 * hexToRgb(undefined)  // null
 */
export function hexToRgb(hex: string | null | undefined): RgbColor | null {
    if (typeof hex !== "string") {
        return null;
    }

    const result = HEX_COLOR_PATTERN.exec(hex);
    if (result === null) {
        return null;
    }

    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    };
}

/**
 * Convert RGB components to hex color string.
 *
 * The channels are expected to be finite: the only caller mixes two parsed hex colours
 * with a finite factor, so they always are. A channel outside 0-255 is clamped, which is
 * what keeps a rounding overshoot from producing a seven-digit string.
 * @param r - Red component (0-255).
 * @param g - Green component (0-255).
 * @param b - Blue component (0-255).
 * @returns Hex color string (e.g., "#440154").
 */
function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (value: number): string => {
        const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolate between two colors.
 * @param color1 - First color (hex string).
 * @param color2 - Second color (hex string).
 * @param t - Interpolation factor (0-1), where 0 = color1, 1 = color2.
 * @returns The interpolated color as a hex string, or null if either endpoint is not a
 * hex colour or the factor is not a finite number.
 */
function interpolateColor(color1: string, color2: string, t: number): string | null {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (rgb1 === null || rgb2 === null || !Number.isFinite(t)) {
        return null;
    }

    const r = rgb1.r + (rgb2.r - rgb1.r) * t;
    const g = rgb1.g + (rgb2.g - rgb1.g) * t;
    const b = rgb1.b + (rgb2.b - rgb1.b) * t;

    return rgbToHex(r, g, b);
}

/**
 * Interpolate a value within a color palette.
 *
 * A value of 0 gives the first colour, 1 gives the last, and a value between them is
 * mixed from the two nearest anchors. A finite value outside 0-1 is clamped to the
 * nearest end, which is long-standing behaviour that callers such as the diverging ramps
 * rely on after they re-centre a value around a midpoint.
 *
 * A value that cannot be placed on the ramp at all -- undefined, null, NaN or an infinity
 * -- returns `missingColor`. That is the whole point of the function: it is called from a
 * repaint loop with no try/catch, so it must answer for a node the algorithm never
 * measured rather than abort the frame and leave every later node unstyled.
 *
 * A palette anchor that is not a hex colour also returns `missingColor`, because it is
 * only discovered when a value happens to sample that anchor: throwing there would take
 * down the repaint for some nodes and not others, which is exactly the failure this
 * function exists to prevent. An entire ramp band drawn in the missing colour is loud
 * enough to find the typo.
 *
 * An EMPTY palette does throw. It is a programmer error in the palette definition, not a
 * bad value: there is no colour in it to return for anybody, it is detected before a
 * single element is painted, and it therefore fails identically on the first call rather
 * than part way through a frame. Returning the missing colour instead would paint an
 * entire graph magenta and call it data.
 * @param value - Value to map (0-1); outside that range it clamps, and a value that is
 * not a finite number yields `missingColor`.
 * @param colors - Array of hex color strings; must not be empty.
 * @param missingColor - The colour to return for a value that cannot be placed on the
 * ramp. Defaults to {@link MISSING_DATA_COLOR}.
 * @returns Interpolated color (hex string).
 * @throws If `colors` is empty.
 * @example
 * interpolatePalette(0.5, VIRIDIS_COLORS)        // "#23908c"
 * interpolatePalette(undefined, VIRIDIS_COLORS)  // "#ff00ff", the missing colour
 */
export function interpolatePalette(
    value: number | null | undefined,
    colors: readonly string[],
    missingColor: string = MISSING_DATA_COLOR,
): string {
    if (colors.length === 0) {
        throw new Error("interpolatePalette was given an empty palette, which has no color to return");
    }

    // A value that is not a finite number has no place on the ramp. Answer with the
    // missing colour rather than clamping NaN into an index of NaN.
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return missingColor;
    }

    // Clamp value to [0, 1]
    const clampedValue = Math.max(0, Math.min(1, value));

    // Handle edge cases
    if (clampedValue === 0) {
        return colors[0];
    }

    if (clampedValue === 1) {
        return colors[colors.length - 1];
    }

    // Find the two colors to interpolate between
    const scaledValue = clampedValue * (colors.length - 1);
    const index1 = Math.floor(scaledValue);
    const index2 = Math.min(index1 + 1, colors.length - 1);
    const t = scaledValue - index1;

    return interpolateColor(colors[index1], colors[index2], t) ?? missingColor;
}
