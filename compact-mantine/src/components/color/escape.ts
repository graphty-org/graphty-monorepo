import type React from "react";

/**
 * Escape in a text field: redraw the value and leave the field without committing what was
 * typed (flows.md 6). `blur()` fires the blur handler synchronously, while its closure still
 * holds the typed draft, so the field is marked for the length of the blur and the blur handler
 * skips its commit when `isLeavingWithoutCommit` says so. The keypress stops here, so a popout
 * around the field stays open until a second Escape (flows.md 2: Escape closes the top-most
 * thing only).
 * @param event - the Escape keydown
 * @param revert - redraws the committed value
 */
export function leaveWithoutCommit(event: React.KeyboardEvent<HTMLInputElement>, revert: () => void): void {
    const input = event.currentTarget;
    event.stopPropagation();
    revert();
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
