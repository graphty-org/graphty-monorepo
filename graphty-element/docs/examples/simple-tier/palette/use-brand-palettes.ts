/**
 * The "use it" line of the palette guide, kept in a function so a test can hand it a real
 * element. The guide shows only the line between the region markers.
 * @param element - The graphty-element on the page.
 */
export function useBrandPalettes(element: HTMLElementTagNameMap["graphty-element"]): void {
    // #region use
    element.setDefaultPalettes({ categorical: "acme-brand", sequential: "acme-brand-ramp" });
    // #endregion use
}
