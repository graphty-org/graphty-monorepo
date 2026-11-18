/**
 * What a Style sidebar control's tooltip says, as a reader reads it by hovering it: the words the sidebar
 * itself never draws as a line (#8739).
 */

import { assert } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";

/**
 * Hovers a control and reads its tooltip.
 * @param control - the control.
 * @returns the tooltip's words.
 */
export async function tooltipOf(control: HTMLElement): Promise<string> {
    await userEvent.hover(control);
    // Another control's tooltip may be open too (the one focus went back to shows its own), so the
    // one read is the tooltip drawn nearest the control hovered.
    const at = control.getBoundingClientRect();
    const words = await waitFor(() => {
        const tips = screen.getAllByRole("tooltip");
        const gap = (tip: HTMLElement): number => {
            const box = tip.getBoundingClientRect();
            return Math.hypot(
                box.x + box.width / 2 - (at.x + at.width / 2),
                box.y + box.height / 2 - (at.y + at.height / 2),
            );
        };
        const [nearest] = tips.toSorted((a, b) => gap(a) - gap(b));
        return nearest.textContent ?? "";
    });
    await userEvent.unhover(control);
    return words;
}

/**
 * Hovers the receipt's Undo under a property row and reads its tooltip.
 * @param row - the property row.
 * @returns the receipt's words, "Node size: 1 changed".
 */
export async function receiptSays(row: HTMLElement): Promise<string> {
    const receipt = await waitFor(() => {
        const found = row.querySelector<HTMLElement>("[data-receipt]");
        assert.isNotNull(found, "the receipt is drawn");
        return found;
    });
    return tooltipOf(within(receipt).getByRole("button", { name: /^Undo the / }));
}
