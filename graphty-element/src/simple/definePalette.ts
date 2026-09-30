/**
 * @file `definePalette`: the simple tier's palette verb.
 *
 * It builds an ordinary palette registration and hands it to `registerPalette`, so there is one
 * validation path and one registry: a palette defined here and the same palette registered
 * through the advanced tier are the same catalogue entry. What the element fills in is the plain
 * name (from `name`, else the id in sentence case); `registerPalette` already derives the
 * capacity, normalises every colour to six-digit hex and turns a missing colour-vision claim into
 * no claim.
 *
 * The checks made HERE, before `registerPalette` sees the definition, are the ones whose message
 * a beginner needs worded for the call they wrote: every refusal starts `definePalette("id"): `,
 * and a `var(...)` colour or an empty string (a design token read before its stylesheet loaded)
 * is refused with the line that reads the token first.
 */

import { normalizeHexAnchor } from "../catalog/color";
import { registerPalette } from "../catalog/paletteRegistry";
import type { RegisterOptions } from "../catalog/pluginRegistry";
import type { PaletteDescriptor, PaletteRegistration } from "../catalog/types";
import { badDefinition, checkDefinition, describeValue, displayName } from "./definition";
import type { PaletteDefinition } from "./types";

const KINDS: readonly string[] = ["sequential", "diverging", "categorical"];

/** How to turn a design token into a colour, for the two refusals that need it. */
const READ_THE_TOKEN =
    'Read the token first with getComputedStyle(document.documentElement).getPropertyValue("--brand-navy").trim(), ' +
    "after the stylesheet that defines it has loaded, and pass the colour that returns.";

/**
 * Register a palette from a kind and a list of colours.
 * @param definition - The id, the kind, the colours, and optionally a name, a description and a
 *   colour-vision claim.
 * @param options - Whether a collision with an existing registration throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault, or with
 *   `E_DUPLICATE_PLUGIN` when the id is one of the element's own palettes.
 */
export function definePalette(definition: PaletteDefinition, options?: RegisterOptions): void {
    const checked = checkDefinition("definePalette", definition);
    const { id } = checked;

    if (!KINDS.includes(checked.kind as string)) {
        throw badDefinition(
            "definePalette",
            id,
            "kind",
            `"kind" must be "categorical", "sequential" or "diverging"; got ${describeValue(checked.kind)}.`,
        );
    }

    const { colors } = checked;
    if (!Array.isArray(colors) || colors.length === 0) {
        throw badDefinition(
            "definePalette",
            id,
            "colors",
            `"colors" must be a non-empty list of colours such as ["#0B1D51", "#1B7F79"]; got ${describeValue(colors)}.`,
        );
    }

    for (const color of colors as unknown[]) {
        if (typeof color === "string" && color.trim() === "") {
            throw badDefinition(
                "definePalette",
                id,
                "colors",
                `a colour is an empty string, which is what a design token reads as before its stylesheet has loaded. ${READ_THE_TOKEN}`,
            );
        }

        if (typeof color === "string" && /var\s*\(/i.test(color)) {
            throw badDefinition(
                "definePalette",
                id,
                "colors",
                `${JSON.stringify(color)} is a CSS variable, which a palette cannot hold. ${READ_THE_TOKEN}`,
            );
        }

        if (typeof color !== "string" || normalizeHexAnchor(color) === null) {
            throw badDefinition(
                "definePalette",
                id,
                "colors",
                `${typeof color === "string" ? JSON.stringify(color) : describeValue(color)} is not a colour. ` +
                    'Write any CSS colour: "#0B1D51", "rgb(27, 127, 121)", "oklch(0.7 0.15 30)" or a colour name.',
            );
        }
    }

    const claims: unknown = checked.colorblindSafe ?? [];
    if (
        !Array.isArray(claims) ||
        claims.some((claim) => !["deuteranopia", "protanopia", "tritanopia"].includes(claim as string))
    ) {
        throw badDefinition(
            "definePalette",
            id,
            "colorblindSafe",
            `"colorblindSafe" lists "deuteranopia", "protanopia" or "tritanopia"; got ${describeValue(claims)}.`,
        );
    }

    const registration: PaletteRegistration = {
        id,
        plainName: displayName(checked),
        kind: checked.kind as PaletteDescriptor["kind"],
        colors: colors as readonly string[],
        ...(checked.colorblindSafe === undefined
            ? {}
            : { colorblindSafe: checked.colorblindSafe as PaletteDescriptor["colorblindSafe"] }),
    };

    registerPalette(registration, options);
}
