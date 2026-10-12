import { Color3 } from "@babylonjs/core";

import { toColorValue } from "../session/styles/channels";

/** A colour split the way Babylon draws it: the RGB a material takes, and the alpha written inside the colour. */
export interface DrawnColor {
    /** The colour without its alpha. */
    readonly rgb: Color3;
    /** The alpha the colour carried, 0-1; 1 when it carried none. The caller multiplies it into its own opacity. */
    readonly alpha: number;
}

/**
 * Read a style colour for a renderer, through the element's one colour parser.
 *
 * WHY NOT `Color3.FromHexString`. It reads exactly `#rrggbb` and answers black for anything else,
 * so a colour with an alpha inside it (`#rrggbbaa`, `rgba()`) -- which every channel accepts --
 * was drawn black by the glow, the outline and the selection halo (issue #2071). This reads every
 * colour {@link toColorValue} reads and hands the alpha back instead of dropping it.
 * @param value - The colour as a style holds it.
 * @param fallback - A colour to use when `value` is absent or unreadable.
 * @returns The colour's RGB and its alpha. Black, opaque, when neither colour can be read.
 */
export function readColor(value: string | null | undefined, fallback: string): DrawnColor {
    const parsed = toColorValue(value) ?? toColorValue(fallback);

    if (parsed === null) {
        return { rgb: Color3.Black(), alpha: 1 };
    }

    return { rgb: new Color3(parsed.r / 255, parsed.g / 255, parsed.b / 255), alpha: parsed.a };
}
