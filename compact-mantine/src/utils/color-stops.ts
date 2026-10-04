/**
 * Utilities for creating and managing gradient color stops.
 */

import type { ColorStop } from "../types";

/**
 * Generates a unique ID for color stops: 8 hex characters from crypto.getRandomValues.
 *
 * Not crypto.randomUUID: browsers expose that only in secure contexts, so a page served over
 * plain http from any host but localhost threw "crypto.randomUUID is not a function" the first
 * time it built a stop. getRandomValues is available everywhere.
 * @returns A unique 8-character ID string
 */
function generateStopId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates a new ColorStop with a unique ID.
 * @param offset - The position of the stop (0-1)
 * @param color - The color value in hex format
 * @returns A new ColorStop with a unique ID
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
 * @returns An array of two ColorStops (start and end)
 */
export function createDefaultGradientStops(): ColorStop[] {
    return [createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")];
}
