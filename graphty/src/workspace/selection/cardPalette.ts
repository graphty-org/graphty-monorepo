import type { PaletteDescriptor } from "@graphty/graphty-element/catalog";
import { DEFAULT_BRANCH_PALETTE } from "@graphty/graphty-element/session";

/** The categorical palette graphty-element publishes with the most colors: where cards past six take theirs. */
const MORE_CARD_COLORS = "kelly";

/** How far apart (in RGB) two card colors must be to read as different at a glance. */
const DISTINCT = 64;

/**
 * The distance between two colors in RGB.
 * @param a - "#rrggbb"
 * @param b - "#rrggbb"
 * @returns the distance, 0 to about 441
 */
function apart(a: string, b: string): number {
    const at = (hex: string, i: number): number => Number.parseInt(hex.slice(i, i + 2), 16);
    return Math.hypot(at(a, 1) - at(b, 1), at(a, 3) - at(b, 3), at(a, 5) - at(b, 5));
}

/**
 * The selection workspace's card colors: graphty-element's six branch colors, then every color of
 * its largest categorical palette not among them -- first those that stand apart from every color
 * before them, then the rest. graphty-element never wraps a branch palette, so this sets how many
 * cards a selection can hold.
 * @param palettes - the element's palettes, `session.catalog.palettes()`
 * @returns the palette for `session.scope.setOptions({ branchPalette })`
 */
export function cardPalette(palettes: readonly PaletteDescriptor[]): readonly string[] {
    const chosen = [...DEFAULT_BRANCH_PALETTE];
    const taken = (color: string): boolean => chosen.some((each) => each.toUpperCase() === color.toUpperCase());
    const distinct = (color: string): boolean => chosen.every((each) => apart(each, color) >= DISTINCT);
    const more = palettes.find((palette) => palette.id === MORE_CARD_COLORS)?.colors ?? [];
    for (const fits of [distinct, () => true]) {
        for (const color of more) {
            if (!taken(color) && fits(color)) {
                chosen.push(color);
            }
        }
    }
    return chosen;
}
