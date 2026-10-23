import { useEffect } from "react";

import type { WorkspaceValue } from "../state/WorkspaceContext";
import { firesWhileTyping, hasPendingEdit, isSingleKey, isTypingTarget, matchesKey, trackPendingEdits } from "./keys";

/**
 * An open menu, popover list or dialog keeps its own keys (Esc closes the innermost first). Only
 * a shown one counts: Mantine keeps a closed Select's options and a closed popover mounted with
 * `display: none`, and counting those would switch every single-key shortcut off while any
 * Select is on the page. An info circle's explanation bubble (compact-mantine's InfoCircle) is a
 * dialog too, but it opens on hover, never takes focus and holds no keys, so it does not count:
 * otherwise a pointer resting on a circled "i" switched every shortcut off.
 */
const OVERLAY = '[role="menu"], [role="dialog"]:not(:has(.cm-info-bubble)), [role="listbox"]';

/**
 * The overlays that keep Undo and Redo too: a menu, a list, a modal dialog. A non-modal panel
 * (`aria-modal="false"`, such as a binding's "Color by" panel) edits the page, so Control+Z there
 * takes back the page's last step, as it does in the inspector beside it.
 */
const HISTORY_OVERLAY = '[role="menu"], [role="dialog"]:not([aria-modal="false"]), [role="listbox"]';

/**
 * Whether a menu, popover list or dialog is showing.
 * @param selector - which overlays count.
 * @returns true when one is.
 */
function overlayShown(selector = OVERLAY): boolean {
    return [...document.querySelectorAll(selector)].some((overlay) => overlay.checkVisibility());
}

/**
 * A field: a control that holds a value the reader edits (a box, a list, a check box, a slider).
 * A button, a heading or a row is not one.
 */
const FIELD =
    'input, select, textarea, [contenteditable="true"], [role="combobox"], [role="textbox"], [role="spinbutton"], [role="slider"], [role="checkbox"], [role="switch"], [role="radio"], [role="listbox"]';

/**
 * Escape in one of the inspector's fields belongs to the field (close, revert, step back), never
 * to Clear selection, which would empty the very thing the reader is editing. Anywhere else in
 * the inspector -- its heading, its tabs, a button -- Escape clears the selection, as the canvas
 * menu's Clear selection says.
 * @param event - the key press.
 * @param key - the command key it matched.
 * @returns true for Escape in one of the inspector's fields.
 */
function inspectorEscape(event: KeyboardEvent, key: string): boolean {
    const { target } = event;
    return (
        key === "Escape" &&
        target instanceof Element &&
        target.closest(".ws-right") !== null &&
        target.closest(FIELD) !== null
    );
}

/**
 * Runs a built command when one of its keys is pressed anywhere in the window.
 * @param workspace - the workspace context value.
 */
export function useCommandKeys(workspace: WorkspaceValue): void {
    useEffect(() => {
        const stopTracking = trackPendingEdits();
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            const typing = isTypingTarget(event.target);
            const overlayOpen = overlayShown();
            const { singleKeyShortcuts } = workspace.store.get();
            for (const command of workspace.registry.live) {
                const key = command.keys?.find((combo) => matchesKey(event, combo));
                if (key === undefined) {
                    continue;
                }
                const pending = hasPendingEdit(event.target);
                const blocked =
                    (typing && !firesWhileTyping(key, pending)) ||
                    (overlayOpen && !firesWhileTyping(key, (typing && pending) || overlayShown(HISTORY_OVERLAY))) ||
                    (!singleKeyShortcuts && isSingleKey(key)) ||
                    inspectorEscape(event, key);
                if (blocked) {
                    return;
                }
                event.preventDefault();
                workspace.run(command.id);
                return;
            }
            // Select all is a text box's, or the graph's (the Select all command); never the page's,
            // which would highlight the workspace's own labels and panels as if they were a
            // document, and leave the text boxes it swept highlighted after the reader moves on.
            if (!typing && matchesKey(event, "Mod+A")) {
                event.preventDefault();
            }
        };
        globalThis.addEventListener("keydown", onKeyDown);
        return () => {
            stopTracking();
            globalThis.removeEventListener("keydown", onKeyDown);
        };
    }, [workspace]);
}
