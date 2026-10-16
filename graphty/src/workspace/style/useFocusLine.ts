import type { Channel } from "@graphty/graphty-element/schema";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

/** What can take keyboard focus inside a line. */
const CONTROL = "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** The line waiting for focus, as a selector; module state, so it outlives a remount of the tab. */
let pending: string | null = null;

/**
 * Asks for keyboard focus on a style line's first control once the line is drawn. A pick that
 * adds or binds a line closes the menu or list it was made in, and often removes that menu's own
 * trigger ("+" with nothing left to add, the bind icon of a now-bound line), so focus would fall
 * to the page body (WCAG 2.4.3). The line appears only after the element applies the write, and
 * the first line a row sets makes a new layer, which remounts the tab.
 * @param channel - the line's channel, or null to withdraw the ask (the write failed).
 * @param bound - wait until the line is bound (its pill drawn, not its old value).
 */
export function focusLineNext(channel: Channel | null, bound = false): void {
    const boundOnly = bound ? "[data-bound]" : "";
    pending = channel === null ? null : `[data-line="${channel}"]${boundOnly}`;
}

/**
 * Asks for keyboard focus on a section's first control once a line removed from it is gone: its
 * add control in the header, or the line now drawn in its place. The line's own Remove button
 * goes with it, so focus would fall to the page body (WCAG 2.4.3). Withdrawn with
 * `focusLineNext(null)`.
 * @param from - the Remove button, inside the section.
 * @param channel - the removed line's channel.
 */
export function focusSectionNext(from: Element, channel: Channel): void {
    const section = from.closest<HTMLElement>("[data-section]")?.dataset.section;
    pending =
        section === null || section === undefined
            ? null
            : `[data-section="${section}"]:not(:has([data-line="${channel}"] [aria-label^="Remove"]))`;
}

/**
 * Hands focus to the line `focusLineNext` asked for, on the first render that draws it. The line
 * can be drawn once by the tab that asked and again by the tab that replaces it (a selection's
 * first line makes its layer and the tab remounts on that row), so a tab that goes away with focus
 * still on the line it handed it to asks again, and the next tab hands it to its own copy of the line.
 * @returns the ref for the element that holds the lines.
 */
export function useFocusLine<T extends HTMLElement>(): RefObject<T | null> {
    const scope = useRef<T>(null);
    const handed = useRef<string | null>(null);
    // No dependency list: the line appears on whatever render the element's change causes.
    useEffect(() => {
        if (pending === null) {
            return;
        }
        const control = scope.current?.querySelector(pending)?.querySelector<HTMLElement>(CONTROL);
        if (control !== undefined && control !== null) {
            handed.current = pending;
            pending = null;
            control.focus();
        }
    });
    // A layout cleanup runs before the tab's nodes leave the page, while focus is still in them.
    useLayoutEffect(() => {
        const node = scope.current;
        return () => {
            const line = handed.current === null ? null : node?.querySelector(handed.current);
            if (pending === null && line?.contains(document.activeElement) === true) {
                pending = handed.current;
            }
        };
    }, []);
    return scope;
}

/** The line whose from-data list opens when it is drawn; module state, so it outlives a remount of the tab. */
let listNext: Channel | null = null;

/**
 * Opens the from-data list of a line once it is drawn: adding a Size line asks which value the
 * sizes follow at once, with "Fixed size" first. The line appears only after the element applies
 * the write, and the first line a row sets makes a new layer, which remounts the tab.
 * @param channel - the line's channel, or null to withdraw the ask (the write failed).
 */
export function openListNext(channel: Channel | null): void {
    listNext = channel;
}

/**
 * Whether a line's from-data list should open as it is drawn.
 * @param channel - the line's channel.
 * @returns true when `openListNext` asked for it.
 */
export function listOpensNext(channel: Channel): boolean {
    return listNext === channel;
}
