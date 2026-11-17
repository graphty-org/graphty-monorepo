/**
 * @file `attachKeymap`: the graph keys (Escape deselects, Mod+Z undoes, Shift+Mod+Z or Mod+Y
 * redoes) answered on a root the host chooses.
 *
 * Opt-in: nothing listens until a host calls it. The keys are `KEYMAP_DESCRIPTORS` in
 * `./catalog`. The root is only ever used through `addEventListener`, so this module needs no DOM.
 */

import { keymapAction } from "../catalog/keymap";
import type { GraphSession } from "./types";

/** What `attachKeymap` needs of a session. */
export type KeymapSession = Pick<GraphSession, "selection" | "canUndo" | "canRedo" | "undo" | "redo">;

/** Where `attachKeymap` listens: an element, a shadow root, a document, the window, any `EventTarget`. */
export type KeymapRoot = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/**
 * Whether a key press is typing: its target is a text box, a list or editable text, whose own
 * keys Escape and Mod+Z are.
 * @param target - The key press's target.
 * @returns true when it is.
 */
function isTyping(target: EventTarget | null): boolean {
    const element = target as { tagName?: unknown; isContentEditable?: unknown } | null;
    return (
        element !== null &&
        (element.isContentEditable === true ||
            (typeof element.tagName === "string" && ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)))
    );
}

/**
 * Answer the graph keys on `root`: Escape clears a non-empty selection (as a reader's change),
 * Mod+Z undoes and Shift+Mod+Z or Mod+Y redoes when there is something to take back or redo.
 * A press the keymap acts on has its default prevented; a press it leaves alone (an empty
 * selection, nothing to undo) passes on untouched, so Escape still closes whatever the host has
 * open. Presses already handled (`defaultPrevented`), typed into a field, or made while an input
 * method is composing are left alone too. The focused canvas already answers the undo keys itself
 * and marks them handled, so a root around the canvas never undoes twice.
 *
 * ```ts
 * const detach = attachKeymap(element.session, document);
 * // later
 * detach();
 * ```
 * @param session - The session the keys act on.
 * @param root - Where to listen.
 * @returns A function that stops listening.
 */
export function attachKeymap(session: KeymapSession, root: KeymapRoot): () => void {
    const onKeyDown = (pressed: Event): void => {
        // Only keydown is listened to, so every event here is a KeyboardEvent.
        const event = pressed as KeyboardEvent;
        if (event.defaultPrevented || event.isComposing || isTyping(event.target)) {
            return;
        }
        const action = keymapAction(event);
        if (action === "deselect" && session.selection.size > 0) {
            session.selection.clear({ cause: "user" });
        } else if (action === "undo" && session.canUndo) {
            void session.undo();
        } else if (action === "redo" && session.canRedo) {
            void session.redo();
        } else {
            return;
        }
        event.preventDefault();
    };
    root.addEventListener("keydown", onKeyDown);
    return () => {
        root.removeEventListener("keydown", onKeyDown);
    };
}
