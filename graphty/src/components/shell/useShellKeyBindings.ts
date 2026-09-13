/**
 * The shell's single keydown dispatcher.
 *
 * Spec section 5.6 owns every binding and says they all render and fire from ONE
 * dispatcher in the shell (build spec 04 section 10). This hook is that dispatcher:
 * it reads the one table in `bindings.ts`, applies 5.6's preconditions, and calls the
 * handler a caller supplied for the matching action. A panel never installs a binding
 * of its own; it passes a handler here instead.
 *
 * Preconditions, verbatim from 5.6: bindings fire only when focus is OUTSIDE a text
 * field or contenteditable and no modal is open; Cmd and Ctrl are interchangeable;
 * browser shortcuts are never overridden except where a row says so.
 */

import { useEffect, useRef } from "react";

import { DISPATCHER_KEY_BINDINGS, ESCAPE_LADDER, type EscapeRungId, matchesChord,type ShellCommandId } from "./bindings";

/**
 * What a binding does. The event is passed through so a held binding can tell its
 * keydown from its keyup by reading `event.type`.
 *
 * The value type of {@link ShellKeyHandlerMap}, which a caller builds.
 * @public
 */
export type ShellKeyHandler = (event: KeyboardEvent) => void;

/**
 * Handlers by action id. An action with no handler is not claimed: the dispatcher
 * leaves the event alone rather than swallowing it.
 */
export type ShellKeyHandlerMap = Partial<Record<ShellCommandId, ShellKeyHandler>>;

/**
 * One rung of the Escape ladder. Returning true means this rung consumed the press,
 * and the ladder stops there -- one rung per press, first match wins.
 *
 * The value type of {@link EscapeLadderHandlers}, which a caller builds.
 * @public
 */
export type EscapeRungHandler = () => boolean;

/**
 * The Escape ladder's rungs. A missing rung is simply skipped.
 */
export type EscapeLadderHandlers = Partial<Record<EscapeRungId, EscapeRungHandler>>;

/**
 * Options of {@link useShellKeyBindings}.
 * @public
 */
export interface UseShellKeyBindingsOptions {
    /** What each action does. */
    readonly handlers: ShellKeyHandlerMap;
    /** The Escape ladder's rungs, tried in `ESCAPE_LADDER` order. */
    readonly escapeLadder?: EscapeLadderHandlers;
    /** Whether the dispatcher is listening at all. Defaults to true. */
    readonly enabled?: boolean;
    /**
     * Whether a modal (a tier 3b dialog) is open. While one is, 5.6 suppresses every
     * binding except Escape, which is how rung 2 of the ladder closes the dialog.
     */
    readonly modalOpen?: boolean;
    /** Where to listen. Defaults to `window`. */
    readonly target?: EventTarget | null;
}

const NON_TEXT_INPUT_TYPES = new Set<string>([
    "button",
    "checkbox",
    "color",
    "file",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
]);

const TEXT_ENTRY_ROLES = new Set<string>(["combobox", "searchbox", "textbox"]);

/**
 * Whether the event came from somewhere a keystroke is text rather than a command.
 *
 * The composed path is read rather than `event.target`, so an input inside a web
 * component's shadow root -- graphty-element's own controls, for instance -- is seen
 * for what it is instead of being reported as the host element.
 * @param event - the keyboard event to test.
 * @returns true when focus is in a text field, a select or a contenteditable region.
 */
export function isTextEntryTarget(event: Event): boolean {
    const path = event.composedPath();
    const element = path.find((node): node is HTMLElement => node instanceof HTMLElement) ?? null;

    if (element === null) {
        return false;
    }

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        return true;
    }

    if (element instanceof HTMLInputElement) {
        return !NON_TEXT_INPUT_TYPES.has(element.type);
    }

    const role = element.getAttribute("role");

    if (role !== null && TEXT_ENTRY_ROLES.has(role)) {
        return true;
    }

    return element.isContentEditable;
}

function runEscapeLadder(ladder: EscapeLadderHandlers): boolean {
    for (const rung of ESCAPE_LADDER) {
        const handler = ladder[rung];

        if (handler !== undefined && handler()) {
            return true;
        }
    }

    // Rung 6 of the ladder is "nothing", which is the absence of a handler.
    return false;
}

/**
 * Installs the shell's single keydown dispatcher.
 *
 * The listener is attached once and reads the current handlers through a ref, so a
 * caller may pass fresh closures on every render without re-binding the listener.
 * @param options - the handlers and preconditions the dispatcher works under.
 */
export function useShellKeyBindings(options: UseShellKeyBindingsOptions): void {
    const optionsRef = useRef<UseShellKeyBindingsOptions>(options);

    useEffect(() => {
        optionsRef.current = options;
    });

    const { target } = options;

    useEffect(() => {
        const node: EventTarget | null = target ?? (typeof window === "undefined" ? null : window);

        if (node === null) {
            return undefined;
        }

        const dispatch = (event: KeyboardEvent, phase: "keydown" | "keyup"): void => {
            const {current} = optionsRef;

            if (current.enabled === false || event.isComposing || event.defaultPrevented) {
                return;
            }

            const inTextEntry = isTextEntryTarget(event);

            for (const binding of DISPATCHER_KEY_BINDINGS) {
                if (phase === "keyup" && binding.held !== true) {
                    continue;
                }

                if (!binding.chords.some((chord) => matchesChord(chord, event))) {
                    continue;
                }

                // A chord matched. Whatever happens next, no later row may claim the
                // same press: the table is ordered and the first match owns it.
                if (inTextEntry) {
                    return;
                }

                if (current.modalOpen === true && binding.id !== "escape") {
                    return;
                }

                if (binding.held === true && phase === "keydown" && event.repeat) {
                    return;
                }

                if (binding.id === "escape") {
                    runEscapeLadder(current.escapeLadder ?? {});
                    return;
                }

                const handler = current.handlers[binding.id];

                if (handler === undefined) {
                    return;
                }

                if (binding.preventDefault) {
                    event.preventDefault();
                }

                handler(event);

                return;
            }
        };

        const onKeyDown = (event: Event): void => {
            if (event instanceof KeyboardEvent) {
                dispatch(event, "keydown");
            }
        };

        const onKeyUp = (event: Event): void => {
            if (event instanceof KeyboardEvent) {
                dispatch(event, "keyup");
            }
        };

        node.addEventListener("keydown", onKeyDown);
        node.addEventListener("keyup", onKeyUp);

        return () => {
            node.removeEventListener("keydown", onKeyDown);
            node.removeEventListener("keyup", onKeyUp);
        };
    }, [target]);
}
