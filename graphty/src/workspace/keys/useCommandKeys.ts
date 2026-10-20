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

/** The inspector's views of the selection itself, as opposed to a row opened beside it. */
const SELECTION_KINDS = new Set(["node", "edge", "several", "neighborhood"]);

/**
 * Escape in the inspector (decided.md, "Escape in the inspector"). In one of its fields it belongs
 * to the field (close, revert, step back), never to Clear selection, which would empty the very
 * thing the reader is editing. On a node's or a selection's inspector, anywhere else -- its
 * heading, its tabs, a button, a value row -- it clears the selection, as the canvas menu's Clear
 * selection says. On any other row's inspector (a layer, a run, an attribute) it leaves the
 * selection alone: the reader is reading that row, not the selection, and nothing there says
 * Escape would take it away.
 * @param event - the key press.
 * @param key - the command key it matched.
 * @param inspected - the row the inspector shows, or null when it shows the selection.
 * @returns true for an Escape in the inspector that must not clear the selection.
 */
function inspectorEscape(event: KeyboardEvent, key: string, inspected: { readonly kind: string } | null): boolean {
    const { target } = event;
    if (key !== "Escape" || !(target instanceof Element) || target.closest(".ws-right") === null) {
        return false;
    }
    const showsSelection = inspected === null || SELECTION_KINDS.has(inspected.kind);
    return !showsSelection || target.closest(FIELD) !== null;
}

/**
 * Whether a tooltip is showing. A tooltip opens when its control takes focus, and Mantine's
 * Tooltip closes on Escape through floating-ui's dismiss handler on that control, which stops the
 * key's propagation, so it never reaches the window: Escape on a value row with a tooltip
 * ("Degree") cleared nothing. A tooltip is a hint, not something the reader opened, so it does
 * not take Escape's job.
 * @returns true when one is.
 */
function tooltipShown(): boolean {
    return [...document.querySelectorAll('[role="tooltip"]')].some((tip) => tip.checkVisibility());
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
            const { singleKeyShortcuts, inspected } = workspace.store.get();
            const typing = isTypingTarget(event.target);
            const overlayOpen = overlayShown();
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
                    inspectorEscape(event, key, inspected);
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
        // A showing tooltip stops Escape before it reaches the window (see tooltipShown). Such an
        // Escape is read again once every control has had it: one an inner control used up is
        // prevented, and one the window's listener ran is prevented by the run. A menu, list or
        // dialog showing as the key went down keeps it, though this Escape closed it since.
        let deferred: ReturnType<typeof setTimeout> | undefined;
        const throughTooltip = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && tooltipShown() && !overlayShown()) {
                deferred = setTimeout(() => {
                    onKeyDown(event);
                });
            }
        };
        globalThis.addEventListener("keydown", throughTooltip, true);
        globalThis.addEventListener("keydown", onKeyDown);
        return () => {
            stopTracking();
            clearTimeout(deferred);
            globalThis.removeEventListener("keydown", throughTooltip, true);
            globalThis.removeEventListener("keydown", onKeyDown);
        };
    }, [workspace]);
}
