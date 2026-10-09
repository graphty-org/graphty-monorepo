import type { Channel } from "@graphty/graphty-element/schema";
import { type RefObject, useEffect, useRef } from "react";

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
    pending = channel === null ? null : `[data-line="${channel}"]${bound ? "[data-bound]" : ""}`;
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
    const section = from.closest("[data-section]")?.getAttribute("data-section");
    pending =
        section === null || section === undefined
            ? null
            : `[data-section="${section}"]:not(:has([data-line="${channel}"] [aria-label^="Remove"]))`;
}

/**
 * Hands focus to the line `focusLineNext` asked for, on the first render that draws it.
 * @returns the ref for the element that holds the lines.
 */
export function useFocusLine<T extends HTMLElement>(): RefObject<T | null> {
    const scope = useRef<T>(null);
    // No dependency list: the line appears on whatever render the element's change causes.
    useEffect(() => {
        if (pending === null) {
            return;
        }
        const control = scope.current?.querySelector(pending)?.querySelector<HTMLElement>(CONTROL);
        if (control !== undefined && control !== null) {
            pending = null;
            control.focus();
        }
    });
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
