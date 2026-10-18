import { useEffect } from "react";

import type { WorkspaceValue } from "../state/WorkspaceContext";
import { firesWhileTyping, hasPendingEdit, isSingleKey, isTypingTarget, matchesKey, trackPendingEdits } from "./keys";

/**
 * An open menu, popover list or dialog keeps its own keys (Esc closes the innermost first). Only
 * a shown one counts: Mantine keeps a closed Select's options and a closed popover mounted with
 * `display: none`, and counting those would switch every single-key shortcut off while any
 * Select is on the page.
 */
const OVERLAY = '[role="menu"], [role="dialog"], [role="listbox"]';

/**
 * Whether a menu, popover list or dialog is showing.
 * @returns true when one is.
 */
function overlayShown(): boolean {
    return [...document.querySelectorAll(OVERLAY)].some((overlay) => overlay.checkVisibility());
}

/**
 * The inspector's fields, where every control edits what is selected or inspected: Escape there
 * belongs to the field (close, revert, step back), never to Clear selection, which would empty the
 * very thing the reader is editing. The inspector's tabs are not fields: Escape there still clears.
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
        target.closest("[role='tablist']") === null
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
                const blocked =
                    (typing && !firesWhileTyping(key, hasPendingEdit(event.target))) ||
                    (overlayOpen && !firesWhileTyping(key)) ||
                    (!singleKeyShortcuts && isSingleKey(key)) ||
                    inspectorEscape(event, key);
                if (blocked) {
                    return;
                }
                event.preventDefault();
                workspace.run(command.id);
                return;
            }
            // Select all is a text box's; anywhere else it would highlight the workspace's own
            // labels and panels as if they were a document, and leave the text boxes it swept
            // highlighted after the reader moves on.
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
