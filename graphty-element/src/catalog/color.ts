/**
 * @file One color parse, for every place a palette anchor is read.
 *
 * WHY A PALETTE ANCHOR IS NORMALISED RATHER THAN STORED AS WRITTEN. The element's color parser
 * accepts three, four, six or eight hex digits, CSS color names, `rgb()`, `hsl()` and `oklch()`.
 * The interpolation path that builds a ramp reads six hex digits and nothing else, and answers
 * magenta for anything it cannot read. So a sequential palette written in named colors passes
 * every check, produces correct endpoints, and puts magenta in the middle of the ramp -- a
 * failure with no error attached to it, one repaint after the mistake.
 *
 * Normalizing once, at registration, means an author may write `oklch(0.7 0.15 30)` and the
 * renderer, the legend, a saved document and every consumer all read the same six digits.
 *
 * TOTAL, deliberately: a color nobody can read answers null, and the caller decides what that
 * means. `registerPalette` turns a null into `E_BAD_COMMAND` naming the palette and the color,
 * at the door where the author can see it.
 */

import { colorToHex } from "../config/common";

/** Six hex digits behind a hash, which is the one spelling every reader of an anchor accepts. */
const SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/i;

/**
 * Read any color the element accepts and answer the six-digit hex form of it.
 *
 * An alpha channel is dropped rather than refused. A palette anchor is a hue in a ramp; opacity
 * is a channel of its own that a binding owns, and an anchor carrying its own alpha would put
 * two owners on one property.
 * @param color - A color in any spelling the element accepts.
 * @returns The color as `#RRGGBB` in upper case, or null when the value is not a color.
 */
export function normalizeHexAnchor(color: string): string | null {
    if (typeof color !== "string" || color.trim() === "") {
        return null;
    }

    const hex = colorToHex(color.trim());
    if (hex === undefined) {
        return null;
    }

    // colorjs.io answers eight digits for a color that carried an alpha channel.
    const six = hex.length === 9 ? hex.slice(0, 7) : hex;

    return SIX_DIGIT_HEX.test(six) ? six.toUpperCase() : null;
}
