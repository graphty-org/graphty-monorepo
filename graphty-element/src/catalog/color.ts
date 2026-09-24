/**
 * @file One colour parse, for every place a palette anchor is read.
 *
 * WHY A PALETTE ANCHOR IS NORMALISED RATHER THAN STORED AS WRITTEN. The element's colour parser
 * accepts three, four, six or eight hex digits, CSS colour names, `rgb()`, `hsl()` and `oklch()`.
 * The interpolation path that builds a ramp reads six hex digits and nothing else, and answers
 * magenta for anything it cannot read. So a sequential palette written in named colours passes
 * every check, produces correct endpoints, and puts magenta in the middle of the ramp -- a
 * failure with no error attached to it, one repaint after the mistake.
 *
 * Normalising once, at registration, means an author may write `oklch(0.7 0.15 30)` and the
 * renderer, the legend, a saved document and every consumer all read the same six digits.
 *
 * TOTAL, deliberately: a colour nobody can read answers null, and the caller decides what that
 * means. `registerPalette` turns a null into `E_BAD_COMMAND` naming the palette and the colour,
 * at the door where the author can see it.
 */

import { colorToHex } from "../config/common";

/** Six hex digits behind a hash, which is the one spelling every reader of an anchor accepts. */
const SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/i;

/**
 * Read any colour the element accepts and answer the six-digit hex form of it.
 *
 * An alpha channel is dropped rather than refused. A palette anchor is a hue in a ramp; opacity
 * is a channel of its own that a binding owns, and an anchor carrying its own alpha would put
 * two owners on one property.
 * @param color - A colour in any spelling the element accepts.
 * @returns The colour as `#RRGGBB` in upper case, or null when the value is not a colour.
 */
export function normalizeHexAnchor(color: string): string | null {
    if (typeof color !== "string" || color.trim() === "") {
        return null;
    }

    try {
        const hex = colorToHex(color.trim());
        if (hex === undefined) {
            return null;
        }

        // colorjs.io answers eight digits for a colour that carried an alpha channel.
        const six = hex.length === 9 ? hex.slice(0, 7) : hex;

        return SIX_DIGIT_HEX.test(six) ? six.toUpperCase() : null;
    } catch {
        // The parser throws on a string it cannot read at all. That is an answer, not a frame
        // this function takes down.
        return null;
    }
}
