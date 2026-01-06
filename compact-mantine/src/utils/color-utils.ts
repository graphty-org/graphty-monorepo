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
