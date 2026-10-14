import type { Channel } from "@graphty/graphty-element/schema";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

/** What can take keyboard focus inside a line. */
const CONTROL = "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** The line waiting for focus, as a selector; module state, so it outlives a remount of the tab. */
let pending: string | null = null;

/** The lines each section of the last drawn tab listed, and which row the tab was; outlives a remount. */
let drawn: { readonly panel: string; readonly lines: ReadonlyMap<string, readonly string[]> } | null = null;

/**
 * The lines each section of a tab lists.
 * @param scope - the tab.
 * @returns section id to its lines' channels.
 */
function linesOf(scope: HTMLElement): Map<string, string[]> {
    const lines = new Map<string, string[]>();
    for (const section of scope.querySelectorAll<HTMLElement>("[data-section]")) {
        const id = section.dataset.section ?? "";
        lines.set(
            id,
            [...section.querySelectorAll<HTMLElement>("[data-line]")].map((line) => line.dataset.line ?? ""),
        );
    }
    return lines;
}

/**
 * The control focus goes to when a change nobody asked focus for (an Undo or Redo) adds or takes
 * away a line: the field of a line that appeared, else the "+" of a section that lost one.
 * @param scope - the tab.
 * @param was - the lines before.
 * @param now - the lines after.
 * @returns the control, or null when no line came or went.
 */
function controlForChange(
    scope: HTMLElement,
    was: ReadonlyMap<string, readonly string[]>,
    now: ReadonlyMap<string, readonly string[]>,
): HTMLElement | null {
    for (const [section, lines] of now) {
        const before = was.get(section) ?? [];
        const came = lines.find((line) => !before.includes(line));
        if (came !== undefined) {
            const line = scope.querySelector(`[data-section="${section}"] [data-line="${came}"]`);
            return (
                line?.querySelector<HTMLElement>(`.ws-field-control :is(${CONTROL})`) ??
                line?.querySelector<HTMLElement>(CONTROL) ??
                null
            );
        }
    }
    for (const [section, lines] of was) {
        if (lines.some((line) => !(now.get(section) ?? []).includes(line))) {
            return scope.querySelector<HTMLElement>(`[data-section="${section}"] [data-plus]`);
        }
    }
    return null;
}

/**
 * Asks for keyboard focus on a style line's first control once the line is drawn. A pick that
 * adds or binds a line closes the menu or list it was made in, and often removes that menu's own
 * trigger ("+" with nothing left to add, the bind icon of a now-bound line), so focus would fall
 * to the page body (WCAG 2.4.3). The line appears only after the element applies the write, and
 * the first line a row sets makes a new layer, which remounts the tab.
 * @param channel - the line's channel, or null to withdraw the ask (the write failed).
 * @param bound - wait until the line is bound (its pill drawn, not its old value), or with
 *   "fixed" until it holds one value again (a detach).
 */
export function focusLineNext(channel: Channel | null, bound: boolean | "fixed" = false): void {
    let state = "";
    if (bound === "fixed") {
        state = ":not([data-bound])";
    } else if (bound) {
        state = "[data-bound]";
    }
    pending = channel === null ? null : `[data-line="${channel}"]${state}`;
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
 * A line that comes or goes with nobody asking (an Undo or Redo) while focus is in the tab or has
 * fallen to the page takes focus itself: a line that came back, in its field; a line taken away, at
 * its section's "+".
 * @param panel - which row the tab shows, so a change of row is never read as lines coming or going.
 * @returns the ref for the element that holds the lines.
 */
export function useFocusLine<T extends HTMLElement>(panel: string): RefObject<T | null> {
    const scope = useRef<T>(null);
    const handed = useRef<string | null>(null);
    // No dependency list: the line appears on whatever render the element's change causes.
    useEffect(() => {
        const node = scope.current;
        if (node === null) {
            return;
        }
        const was = drawn;
        const now = linesOf(node);
        drawn = { panel, lines: now };
        // Focus fell to the page, or stays in the tab (on a "+" an Undo did not take away).
        const active = document.activeElement;
        const free = active === null || active === document.body || node.contains(active);
        if (pending === null && free && was?.panel === panel) {
            controlForChange(node, was.lines, now)?.focus();
        }
        if (pending === null) {
            return;
        }
        const line = scope.current?.querySelector(pending);
        // A property row's field before its label column's settings button.
        const control =
            line?.querySelector<HTMLElement>(`.ws-field-control :is(${CONTROL})`) ??
            line?.querySelector<HTMLElement>(CONTROL);
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
                const asked = handed.current;
                pending = asked;
                // The ask is for the tab that replaces this one now; one nothing takes (the row
                // itself went, as an Undo of its first line does) must not steal focus later.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (pending === asked) {
                            pending = null;
                        }
                    });
                });
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
