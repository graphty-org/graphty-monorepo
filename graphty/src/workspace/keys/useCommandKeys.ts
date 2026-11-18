import { KEYMAP_DESCRIPTORS, type KeymapAction } from "@graphty/graphty-element/catalog";
import { attachKeymap, type GraphSession, type KeymapReport } from "@graphty/graphty-element/session";
import { useEffect } from "react";

import { switchedOff } from "../commands/registry";
import { historyNotice } from "../frame/historyWords";
import { selectionClearedWords } from "../inspector/words";
import { errorWords } from "../project/words";
import type { WorkspaceStore } from "../state/store";
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
 * A modal dialog (Settings, a confirmation): the page behind it is inert, so no command key reaches
 * it -- Mod+I does not take focus out of the dialog to the composer.
 */
const MODAL = '[role="dialog"][aria-modal="true"]';

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
 * Whether the press belonged to an overlay that may already be gone: its target sits in one, or
 * left the page while the press was on its way here. Mantine's Modal closes on a window capture
 * listener, so an Esc that closes Settings reaches this listener with the dialog already
 * unmounting, and counting only the overlays still showing let that Esc clear the selection too.
 * @param target - the key press's target.
 * @param selector - which overlays count.
 * @returns true when the press was the overlay's.
 */
function pressedInOverlay(target: EventTarget | null, selector: string): boolean {
    return target instanceof Element && (!target.isConnected || target.closest(selector) !== null);
}

/**
 * Escape on the Assistant panel, outside a field, leaves the selection: the selection is the next
 * message's scope and has no undo, and Esc closes the innermost thing first.
 * @param event - the key press.
 * @param key - the command key it matched.
 * @returns true for Escape on the Assistant panel.
 */
function assistantEscape(event: KeyboardEvent, key: string): boolean {
    return key === "Escape" && event.target instanceof Element && event.target.closest(".ws-assistant") !== null;
}

/** The keys graphty-element's keymap answers (Escape, Undo, Redo): never dispatched as commands here. */
const GRAPH_KEYS = new Set(KEYMAP_DESCRIPTORS.flatMap((entry) => entry.keys));

/**
 * Whether a key press stays where it was pressed rather than running the key's command or graph
 * action: a modal dialog is open, the reader types in a field, a menu or list is open, single keys
 * are switched off, or it is Escape in an inspector field or on the Assistant panel.
 * @param event - the key press.
 * @param key - the key string it matched.
 * @param workspace - the workspace context value.
 * @returns true when it stays.
 */
function keptFromWorkspace(event: KeyboardEvent, key: string, workspace: WorkspaceValue): boolean {
    const typing = isTypingTarget(event.target);
    const overlayOpen = overlayShown() || pressedInOverlay(event.target, OVERLAY);
    const modalOpen = overlayShown(MODAL) || pressedInOverlay(event.target, MODAL);
    const pending = hasPendingEdit(event.target);
    return (
        modalOpen ||
        (typing && !firesWhileTyping(key, pending)) ||
        (overlayOpen && !firesWhileTyping(key, (typing && pending) || overlayShown(HISTORY_OVERLAY))) ||
        (!workspace.store.get().singleKeyShortcuts && isSingleKey(key)) ||
        inspectorEscape(event, key) ||
        assistantEscape(event, key)
    );
}

/**
 * Says what graphty-element's keymap did on the status line: "Selection cleared", "Undid Size by
 * PageRank", or the failure, as the Clear selection, Undo and Redo commands do.
 * @param session - the element's session.
 * @param store - the workspace store the words are posted to.
 * @returns the keymap's report handler.
 */
function sayKeymapAction(session: GraphSession, store: WorkspaceStore): (report: KeymapReport) => void {
    return (report) => {
        if (report.action === "deselect") {
            // Says what went, so an Escape pressed for something else is not silent; a rule in the
            // find box stays there, so Enter brings the selection back.
            store.set({
                notice: { message: selectionClearedWords(report.nodes, report.edges), endsWithSelection: true },
            });
            return;
        }
        const undo = report.action === "undo";
        const say = historyNotice(session, undo, store);
        report.done.then(say, (error: unknown) => {
            store.set({ notice: { message: errorWords(`${undo ? "Undo" : "Redo"} failed`, error) } });
        });
    };
}

/**
 * Runs a built command when one of its keys is pressed anywhere in the window, and answers
 * graphty-element's graph keys (Escape, Undo, Redo) through its keymap under the same rules.
 * @param workspace - the workspace context value.
 */
export function useCommandKeys(workspace: WorkspaceValue): void {
    useEffect(() => {
        const stopTracking = trackPendingEdits();
        const { session } = workspace;
        const detachKeymap =
            session === null
                ? () => undefined
                : attachKeymap(session, globalThis, {
                      ignore: (event: KeyboardEvent, action: KeymapAction) => {
                          const keys = KEYMAP_DESCRIPTORS.find((entry) => entry.action === action)?.keys ?? [];
                          const key = keys.find((combo) => matchesKey(event, combo));
                          return key === undefined || keptFromWorkspace(event, key, workspace);
                      },
                      onAction: sayKeymapAction(session, workspace.store),
                  });
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            const typing = isTypingTarget(event.target);
            for (const command of workspace.registry.live) {
                const key = command.keys?.find((combo) => matchesKey(event, combo));
                if (key === undefined || GRAPH_KEYS.has(key) || switchedOff(command, workspace)) {
                    continue;
                }
                if (keptFromWorkspace(event, key, workspace)) {
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
            detachKeymap();
            stopTracking();
            globalThis.removeEventListener("keydown", onKeyDown);
        };
    }, [workspace]);
}
