/**
 * @file The palettes a colour binding that names none is painted through. Kept apart from
 * palettes.ts so the save-file clean-room test can stand in a build whose defaults differ: a
 * saved file writes the palette each such binding resolved to, so a changed default never
 * changes an old file's colours (design/architecture/self-contained-save-files.md).
 */

import type { PaletteId } from "../../catalog/types";

/**
 * The palette a colour binding uses when it does not name one and reads a measurement.
 *
 * Paul Tol's YlOrBr, one hue family from orange to dark brown, because a ramp inside one hue
 * family reads as "how much". Viridis, the default before it, sweeps from purple through green
 * to yellow, and a hue sweep makes a sparse set of nodes read as separate groups rather than as
 * amounts (Reda & Szafir 2021; Tseng et al. 2024). It is trimmed to the steps that stand off the
 * element's light background by at least 2:1, so the palest node is still visible. Viridis stays
 * in the catalogue for a binding that names it. `test/catalog/default-palette-quality.test.ts`
 * measures whatever this is.
 */
export const DEFAULT_PALETTE: PaletteId = "ylorbr";

/**
 * The palette a colour binding uses when it does not name one and reads groups.
 *
 * Okabe-Ito as published: eight distinct colours, safe for every form of colour blindness the
 * catalogue names, with yellow last because it barely shows on a light background. It is the
 * first choice rather than the only one: a partition with more groups than it has colours gets a
 * larger palette from `defaultPaletteFor` in palettes.ts, and every partition that fits keeps this one, so
 * a picture that is right today does not change colour because the rule grew a branch.
 */
export const DEFAULT_CATEGORICAL_PALETTE: PaletteId = "okabe-ito";

/**
 * The default palettes as a kind of built-in, for the catalog census: a save file never names a
 * default, because it writes the palette each binding resolved to, so there are no ids to scan for
 * (design/architecture/self-contained-save-files.md, section 2.3).
 * Exported, and so tagged public, because test/saved-format/builtInIds.ts finds and loads it by reading the source.
 * @returns The kind, with no ids.
 * @public
 */
export function builtInIdsForTesting(): { kind: string; ids: readonly string[] } {
    return { kind: "defaultPalettes", ids: [] };
}
