import type React from "react";

/**
 * Escape in a text field. Outside a pop-out it redraws the value and leaves the field without
 * committing what was typed (flows.md 6). Inside a pop-out it closes the innermost layer
 * (flows.md 2): with an edit in progress, that is the edit, so the value is redrawn and focus
 * stays in the field; with nothing typed, the key is left alone and reaches the pop-out, which
 * closes and gives focus back to what opened it, instead of the field blurring to the page.
 *
 * `blur()` fires the blur handler synchronously, while its closure still holds the typed draft,
 * so the field is marked for the length of the blur and the blur handler skips its commit when
 * `isLeavingWithoutCommit` says so.
 * @param event - the Escape keydown
 * @param revert - redraws the committed value
 * @param dirty - whether the field holds something typed that differs from its value
 */
export function leaveWithoutCommit(
    event: React.KeyboardEvent<HTMLInputElement>,
    revert: () => void,
    dirty = true,
): void {
    const input = event.currentTarget;
    const inPopout = input.closest("[data-popout-id]") !== null;
    if (inPopout && !dirty) {
        return;
    }
    event.stopPropagation();
    revert();
    if (inPopout) {
        input.select();
        return;
    }
    input.dataset.cmReverting = "true";
    input.blur();
    delete input.dataset.cmReverting;
}

/**
 * Whether this blur is the one `leaveWithoutCommit` caused.
 * @param event - the blur
 * @returns true when the blur must not commit
 */
export function isLeavingWithoutCommit(event: React.FocusEvent<HTMLInputElement>): boolean {
    return event.currentTarget.dataset.cmReverting === "true";
}
