/**
 * Color utility constants and functions for converting between
 * opacity percentages (0-100) and hex alpha values (00-FF).
 */

/** Maximum value for hex alpha channel (0xFF = 255) */
export const MAX_ALPHA_HEX = 255;

/** Maximum opacity percentage value */
export const MAX_OPACITY_PERCENT = 100;

/**
 * Converts a hex alpha string (00-FF) to an opacity percentage (0-100).
 * @param alphaHex - Two-character hex string representing alpha (00-FF)
 * @returns Opacity as a percentage from 0 to 100
 * @example
 * parseAlphaFromHexa("FF") // returns 100
 * parseAlphaFromHexa("80") // returns ~50
 * parseAlphaFromHexa("00") // returns 0
 */
export function parseAlphaFromHexa(alphaHex: string): number {
    return Math.round((parseInt(alphaHex, 16) / MAX_ALPHA_HEX) * MAX_OPACITY_PERCENT);
}

/**
 * Converts an opacity percentage (0-100) to a hex alpha string (00-ff).
 * @param opacity - Opacity as a percentage from 0 to 100
 * @returns Two-character lowercase hex string representing alpha
 * @example
 * opacityToAlphaHex(100) // returns "ff"
 * opacityToAlphaHex(50)  // returns "80"
 * opacityToAlphaHex(0)   // returns "00"
 */
export function opacityToAlphaHex(opacity: number): string {
    return Math.round((opacity / MAX_OPACITY_PERCENT) * MAX_ALPHA_HEX)
        .toString(16)
        .padStart(2, "0");
}

/**
 * Parse HEXA color string (#RRGGBBAA) and extract RGB and opacity.
 * @param hexa - Color string in hex or hexa format
 * @returns Object with hex color and opacity percentage
 */
export function parseHexaColor(hexa: string): { hex: string; opacity: number } {
    // Normalize to 8-character HEXA
    let normalized = hexa.replace("#", "");

    if (normalized.length === 3) {
        normalized = `${normalized
            .split("")
            .map((c) => c + c)
            .join("")}ff`;
    } else if (normalized.length === 4) {
        normalized = normalized
            .split("")
            .map((c) => c + c)
            .join("");
    } else if (normalized.length === 6) {
        normalized = `${normalized}ff`;
    }

    const hex = `#${normalized.slice(0, 6)}`;
    const alphaHex = normalized.slice(6, 8);
    const opacity = parseAlphaFromHexa(alphaHex);

    return { hex, opacity };
}

/**
 * Convert RGB hex and opacity to HEXA format.
 * @param hex - Color in hex format (#RRGGBB)
 * @param opacity - Opacity percentage (0-100)
 * @returns Color in HEXA format (#RRGGBBAA)
 */
export function toHexaColor(hex: string, opacity: number): string {
    const normalized = hex.replace("#", "");
    const alpha = opacityToAlphaHex(opacity);
    return `#${normalized}${alpha}`;
}

/**
 * Check if a color string is valid hex format.
 * @param color - Color string to validate
 * @returns true if valid hex format (3, 4, 6, or 8 characters with optional #)
 */
export function isValidHex(color: string): boolean {
    return /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
}

/**
 * The lowest channel value (0-255) at which Figma rings a swatch so that it
 * stays visible on a white surface. Measured on the picker's document swatches:
 * #E6E6E6, #F5F5F5, #FFFFE5 and #EBEBF7 carry the ring; #D9D9D9 and #D9E5FF do not.
 */
const LIGHT_CHANNEL_FLOOR = 0xe0;

/**
 * Expand a 3-, 4-, 6- or 8-digit hex color into `#RRGGBBAA`, upper case.
 * @param color - a hex color, with or without `#`
 * @returns the 8-digit form, or `undefined` when the text is not a hex color
 */
export function normalizeHexa(color: string): string | undefined {
    if (!isValidHex(color)) {
        return undefined;
    }
    let digits = color.replace("#", "");
    if (digits.length <= 4) {
        digits = digits.replace(/./g, "$&$&");
    }
    if (digits.length === 6) {
        digits += "ff";
    }
    return `#${digits.toUpperCase()}`;
}

/**
 * Whether a color is light enough to need the swatch ring Figma draws on
 * near-white colors (every channel at or above 0xE0).
 * @param color - a hex color
 * @returns true for near-white colors
 */
export function isLightColor(color: string): boolean {
    const hexa = normalizeHexa(color);
    if (hexa === undefined) {
        return false;
    }
    return [1, 3, 5].every((i) => parseInt(hexa.slice(i, i + 2), 16) >= LIGHT_CHANNEL_FLOOR);
}

/**
 * The color a fraction of the way between two hex colors, channel by channel.
 * Used when a click on a gradient bar adds a stop between two others.
 * @param from - the color at 0
 * @param to - the color at 1
 * @param t - how far along, 0 to 1
 * @returns `#RRGGBB`, upper case
 */
export function mixHex(from: string, to: string, t: number): string {
    const a = normalizeHexa(from) ?? "#000000FF";
    const b = normalizeHexa(to) ?? "#000000FF";
    const channel = (i: number): string => {
        const x = parseInt(a.slice(i, i + 2), 16);
        const y = parseInt(b.slice(i, i + 2), 16);
        return Math.round(x + (y - x) * t)
            .toString(16)
            .padStart(2, "0");
    };
    return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}
