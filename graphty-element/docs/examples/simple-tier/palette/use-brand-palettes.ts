import type { DefaultPaletteControls } from "../../../../extend";

/**
 * The "use it" line of the palette guide, kept in a function so a test can hand it a real
 * element. The guide shows only the line between the region markers. A helper takes the element
 * as `DefaultPaletteControls`, the part of it that chooses default palettes, so it needs no
 * renderer types.
 * @param element - The graphty-element on the page.
 */
export function useBrandPalettes(element: DefaultPaletteControls): void {
    // #region use
    element.setDefaultPalettes({ categorical: "acme-brand", sequential: "acme-brand-ramp" });
    // #endregion use
}
