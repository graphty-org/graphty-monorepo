/**
 * @file `attachKeymap`: the graph keys (Escape deselects, Mod+Z undoes, Shift+Mod+Z or Mod+Y
 * redoes) answered on a root the host chooses.
 *
 * Opt-in: nothing listens until a host calls it. The keys are `KEYMAP_DESCRIPTORS` in
 * `./catalog`. The root is only ever used through `addEventListener`, so this module needs no DOM.
 */

import { type KeymapAction, keymapAction } from "../catalog/keymap";
import type { GraphSession, HistoryOutcome } from "./types";

/** What `attachKeymap` needs of a session. */
export type KeymapSession = Pick<GraphSession, "selection" | "canUndo" | "canRedo" | "undo" | "redo">;

/** Where `attachKeymap` listens: an element, a shadow root, a document, the window, any `EventTarget`. */
export type KeymapRoot = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/**
 * What `attachKeymap` did, for a host that says so (a notice, an announcement). A deselect is
 * reported once the selection is cleared, with how many nodes and edges it held. An undo or redo
 * is reported just before it starts, so `session.history` still names the step it takes back;
 * `done` settles with what it did.
 */
export type KeymapReport =
    | { readonly action: "deselect"; readonly nodes: number; readonly edges: number }
    | { readonly action: "undo" | "redo"; readonly done: Promise<HistoryOutcome> };

/** How `attachKeymap` behaves; every field is optional. */
export interface KeymapOptions {
    /**
     * The host's rule for where the keys are its own (an open menu or dialog, a field): return
     * true to leave the press alone. It replaces the default rule, which leaves alone a press typed
     * into a text box, a list or editable text. A press already handled or made while an input
     * method composes is always left alone.
     */
    readonly ignore?: (event: KeyboardEvent, action: KeymapAction) => boolean;
    /** Told what the keymap did, as {@link KeymapReport} describes. */
    readonly onAction?: (report: KeymapReport) => void;
}

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
 * and marks them handled, so a root around the canvas never undoes twice. `options` takes the
 * host's own rule for where the keys are left alone and tells the host what was done.
 *
 * ```ts
 * const detach = attachKeymap(element.session, document);
 * // later
 * detach();
 * ```
 * @param session - The session the keys act on.
 * @param root - Where to listen.
 * @param options - The host's rule for where the keys are left alone, and what to tell it.
 * @returns A function that stops listening.
 */
export function attachKeymap(session: KeymapSession, root: KeymapRoot, options: KeymapOptions = {}): () => void {
    const { ignore = (event: KeyboardEvent) => isTyping(event.target), onAction } = options;
    const history = (undo: boolean): void => {
        let start = (): void => undefined;
        const done = new Promise<HistoryOutcome>((resolve, reject) => {
            start = () => {
                (undo ? session.undo() : session.redo()).then(resolve, reject);
            };
        });
        onAction?.({ action: undo ? "undo" : "redo", done });
        start();
    };
    const onKeyDown = (pressed: Event): void => {
        // Only keydown is listened to, so every event here is a KeyboardEvent.
        const event = pressed as KeyboardEvent;
        if (event.defaultPrevented || event.isComposing) {
            return;
        }
        const action = keymapAction(event);
        if (action === null || ignore(event, action)) {
            return;
        }
        if (action === "deselect" && session.selection.size > 0) {
            const { nodes, edges } = session.selection;
            session.selection.clear({ cause: "user" });
            onAction?.({ action, nodes: nodes.length, edges: edges.length });
        } else if (action === "undo" && session.canUndo) {
            history(true);
        } else if (action === "redo" && session.canRedo) {
            history(false);
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
