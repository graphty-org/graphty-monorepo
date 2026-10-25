import { type RefObject, useLayoutEffect } from "react";

/** The label column's bounds: never narrower, and never wider (a longer name ends in "..."). */
const NARROWEST = 40;
const WIDEST = 80;

/**
 * Sizes the tab's label column to the longest name it shows, between 40 and 80 px, so the fields
 * get every pixel the names do not need: a shape's "Icosphere", a pattern's "Solid" and a bound
 * value's source fit whole. Every field still starts at one left edge. Measured after each render,
 * with each label at its own width first. A text entry's kind (glyph and word) is not measured: it
 * takes its own width, so adding a label narrows no field.
 * @param scope - the tab.
 */
export function useLabelColumn(scope: RefObject<HTMLElement | null>): void {
    // No dependency list: the names change on whatever render a layer's change causes.
    useLayoutEffect(() => {
        const node = scope.current;
        if (node === null) {
            return;
        }
        const was = node.style.getPropertyValue("--ws-label");
        node.style.setProperty("--ws-label", "max-content");
        const widest = Math.max(
            0,
            ...[...node.querySelectorAll<HTMLElement>(".ws-field[data-named] > .ws-field-label")].map(
                (label) => label.getBoundingClientRect().width,
            ),
        );
        const width = `${String(Math.min(WIDEST, Math.max(NARROWEST, Math.ceil(widest))))}px`;
        // With no field to measure (a layer holding only a label), the narrowest column, so a text
        // entry's source box is as wide as it is beside fields.
        node.style.setProperty("--ws-label", widest === 0 ? was || `${String(NARROWEST)}px` : width);
    });
}
