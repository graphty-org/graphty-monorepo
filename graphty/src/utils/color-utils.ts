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
 *
 * @param alphaHex - Two-character hex string representing alpha (00-FF)
 * @returns Opacity as a percentage from 0 to 100
 *
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
 *
 * @param opacity - Opacity as a percentage from 0 to 100
 * @returns Two-character lowercase hex string representing alpha
 *
 * @example
 * opacityToAlphaHex(100) // returns "ff"
 * opacityToAlphaHex(50)  // returns "80"
 * opacityToAlphaHex(0)   // returns "00"
 */
export function opacityToAlphaHex(opacity: number): string {
    return Math.round((opacity / MAX_OPACITY_PERCENT) * MAX_ALPHA_HEX).toString(16).padStart(2, "0");
}
