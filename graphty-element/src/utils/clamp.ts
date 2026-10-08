/**
 * Hold a number inside an interval. NaN stays NaN; an infinity moves to the nearest bound.
 *
 * A leaf module with no imports, so a Node-safe entry point that reaches it (./schema reaches the
 * color interpolation helpers) pays for this function and nothing else.
 * @param value - The number.
 * @param low - The lower bound.
 * @param high - The upper bound.
 * @returns The number, moved to the nearest bound when it was outside.
 */
export function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value));
}
