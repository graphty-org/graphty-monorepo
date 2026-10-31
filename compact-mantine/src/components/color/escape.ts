import type React from "react";
import { useState } from "react";
import { flushSync } from "react-dom";

import { useLabels } from "../../i18n";

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

/** What Escape last took back in a box, for its DiscardNote, and the Escape that says so. */
export interface DiscardedEdit {
    /** "Edit discarded; this stays 40.", or "" when there is nothing to say. */
    readonly text: string;
    /** Empties the note: the reader typed or left the box. */
    readonly clear: () => void;
    /**
     * {@link revertOnEscape}, and, when it took typing back, the note naming what the box keeps.
     * @param event - the Escape keydown
     * @param revert - redraws the committed value
     * @param dirty - whether the field holds something typed that differs from its value
     * @param kept - the value the box goes back to, as the box shows it
     */
    readonly revert: (
        event: React.KeyboardEvent<HTMLInputElement>,
        revert: () => void,
        dirty: boolean,
        kept: string,
    ) => void;
}

/**
 * Escape that says what it discarded, the same way in every box (a pop-out's included): render
 * `<DiscardNote text={discarded.text} />` beside the box, so its live region is on the page before
 * the words are written.
 * @returns the note's words and the Escape handler
 */
export function useDiscardedEdit(): DiscardedEdit {
    const labels = useLabels();
    const [text, setText] = useState("");
    return {
        text,
        clear: () => {
            setText("");
        },
        revert: (event, revert, dirty, kept) => {
            setText(dirty ? labels.colorEditDiscarded(kept) : "");
            revertOnEscape(event, revert, dirty);
        },
    };
}
