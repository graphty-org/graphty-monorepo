/**
 * A band's or slice's paint as its color picker shows it (stripes design 3.3): graphty-element draws a part at its
 * color's own alpha times its opacity, so the picker shows that product as its Opacity, and any edit writes the color
 * without alpha and the opacity as the product. The color reading is graphty-element's (`toColorValue`).
 */

import { toColorValue } from "@graphty/graphty-element/catalog";

/** What a chip shows: the color without alpha, and the drawn opacity as a percent. */
export interface ShownPaint {
    readonly color: string;
    readonly percent: number;
}

/**
 * What a chip shows for a color and an opacity.
 * @param color - the color as written (may carry alpha).
 * @param opacity - the opacity, 0 to 1 (1 when unset).
 * @returns the color without alpha and the drawn opacity.
 */
export function shownPaint(color: string, opacity = 1): ShownPaint {
    const parsed = toColorValue(color);
    const alpha = parsed?.a ?? 1;
    return {
        color: parsed === null ? color : parsed.hex.slice(0, 7).toUpperCase(),
        percent: Math.round(alpha * opacity * 1000) / 10,
    };
}

/**
 * What one picker edit writes: the color without alpha and the opacity it draws at, 0 to 1.
 * @param color - the color the picker gives (a pasted 8-digit hex keeps its alpha here).
 * @param percent - the picker's opacity, 0 to 100.
 * @returns the color and the opacity to write.
 */
export function writtenPaint(color: string, percent: number): { readonly color: string; readonly opacity: number } {
    const shown = shownPaint(color, percent / 100);
    return { color: shown.color, opacity: Math.round(shown.percent * 10) / 1000 };
}
