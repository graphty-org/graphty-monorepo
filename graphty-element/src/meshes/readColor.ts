import { Color3 } from "@babylonjs/core";

import { toColorValue } from "../session/styles/channels";

/**
 * Read a color for the renderer: its red, green and blue as a Babylon color, and its alpha apart.
 *
 * WHY NOT `Color3.FromHexString`. Babylon's reader takes `#rrggbb` and nothing else; handed
 * `#rrggbbaa` it leaves the color at its starting black, so every channel that read a color that
 * way drew an alpha as black (issue #2071). This reads every spelling the element accepts, through
 * the one parser the style channels use, and hands the alpha back so the caller can multiply it
 * into whatever opacity the thing it draws has.
 * @param value - The color, in any spelling the element accepts.
 * @param fallback - The color to draw when `value` is missing or is not a color.
 * @returns The color without its alpha, and the alpha in 0-1.
 */
export function readColor(value: string | undefined, fallback: string): { rgb: Color3; alpha: number } {
    const color = toColorValue(value) ?? toColorValue(fallback);

    if (color === null) {
        return { rgb: Color3.Black(), alpha: 1 };
    }

    return { rgb: new Color3(color.r / 255, color.g / 255, color.b / 255), alpha: color.a };
}
