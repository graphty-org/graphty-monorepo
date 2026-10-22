import { normalizeHexa } from "../../utils/color-utils";

/** Where the alpha pair starts in `#RRGGBBAA`. */
const HEXA_ALPHA_START = 7;

/**
 * The color typed into a color box, as `#RRGGBB`: three or six hex digits, with or without "#",
 * or any color the browser's CSS knows by name, in any case and with or without spaces between
 * its words ("blue", "Dark Green", "rebeccapurple"); undefined for words
 * that name no opaque color. The paint field's hex box and the picker's value box both read
 * through this, so they take the same entries.
 * @param typed - what was typed
 * @returns the color, upper case, or undefined
 */
export function typedColor(typed: string): string | undefined {
    // A keyword said as words ("dark green") is the keyword written together ("darkgreen").
    const trimmed = typed.trim();
    const text = /^[a-z]+(\s+[a-z]+)+$/i.test(trimmed) ? trimmed.split(/\s+/).join("") : trimmed;
    const digits = trimmed.replace("#", "");
    if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(digits)) {
        return normalizeHexa(digits)?.slice(0, HEXA_ALPHA_START).toUpperCase();
    }
    // A host without CSS.supports (a DOM emulation) reads names as no color rather than throwing.
    if (
        text === "" ||
        typeof CSS === "undefined" ||
        typeof CSS.supports !== "function" ||
        !CSS.supports("color", text)
    ) {
        return undefined;
    }
    // The browser spells a parsed opaque color as "#rrggbb" when a canvas reads it back.
    const context = document.createElement("canvas").getContext("2d");
    if (context === null) {
        return undefined;
    }
    context.fillStyle = "#000000";
    context.fillStyle = text;
    const read = context.fillStyle;
    return /^#[0-9a-f]{6}$/i.test(read) ? read.toUpperCase() : undefined;
}
