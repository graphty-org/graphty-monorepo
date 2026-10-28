import type React from "react";
import { flushSync } from "react-dom";

/**
 * Escape in a text field takes back what was typed and keeps focus in the field, so the reader
 * can type again at once; focus never falls to the page. Inside a pop-out with nothing typed, the
 * key is left alone and reaches the pop-out, which closes and gives focus back to what opened it
 * (Escape closes the innermost layer).
 * @param event - the Escape keydown
 * @param revert - redraws the committed value
 * @param dirty - whether the field holds something typed that differs from its value
 */
export function revertOnEscape(event: React.KeyboardEvent<HTMLInputElement>, revert: () => void, dirty = true): void {
    const input = event.currentTarget;
    if (!dirty && input.closest("[data-popout-id]") !== null) {
        return;
    }
    event.stopPropagation();
    // Redrawn before the select, so the whole value is selected and the next key replaces it.
    flushSync(revert);
    input.select();
}
