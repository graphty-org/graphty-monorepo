/**
 * Utilities for creating and managing gradient color stops.
 */

import type {ColorStop} from "../types/style-layer";

/**
 * Generates a unique ID for color stops.
 * Uses crypto.randomUUID() for cryptographically secure unique identifiers.
 */
function generateStopId(): string {
    return crypto.randomUUID().slice(0, 8);
}

/**
 * Creates a new ColorStop with a unique ID.
 *
 * @param offset - The position of the stop (0-1)
 * @param color - The color value in hex format
 * @returns A new ColorStop with a unique ID
 *
 * @example
 * const stop = createColorStop(0.5, '#ff0000');
 * // { id: 'abc12345', offset: 0.5, color: '#ff0000' }
 */
export function createColorStop(offset: number, color: string): ColorStop {
    return {
        id: generateStopId(),
        offset,
        color,
    };
}

/**
 * Creates default gradient stops for a new gradient configuration.
 *
 * @returns An array of two ColorStops (start and end)
 */
export function createDefaultGradientStops(): ColorStop[] {
    return [
        createColorStop(0, "#6366F1"),
        createColorStop(1, "#06B6D4"),
    ];
}
