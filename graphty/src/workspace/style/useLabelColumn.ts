import { type RefObject, useLayoutEffect, useRef } from "react";

/** The label column's bounds: never narrower, and never wider (a longer name ends in "..."). */
const NARROWEST = 40;
const WIDEST = 80;

/**
 * Sizes the tab's label column to the longest name it shows, between 40 and 80 px, so the fields
 * get every pixel the names do not need: a shape's "Icosphere", a pattern's "Solid" and a bound
 * value's source fit whole. Every field still starts at one left edge. Measured after each render,
 * with each label at its own width first. A text entry's kind (glyph and word) is not measured: it
 * takes its own width, so adding a label narrows no field. Reading each label's width forces a
 * layout, so with a `key` it is measured only when the key changes (#9423).
 * @param scope - the tab.
 * @param key - what the names are drawn from; left out, they are measured after every render.
 */
export function useLabelColumn(scope: RefObject<HTMLElement | null>, key?: string): void {
    const measured = useRef<{ node: HTMLElement; key: string } | null>(null);
    // No dependency list: the names change on whatever render a layer's change causes.
    useLayoutEffect(() => {
        const node = scope.current;
        if (node === null) {
            return;
        }
        if (key !== undefined && measured.current?.node === node && measured.current.key === key) {
            return;
        }
        measured.current = key === undefined ? null : { node, key };
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
