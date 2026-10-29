import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

/** What can take keyboard focus inside a line. */
const CONTROL = "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** A box that takes typing: not a read-only select's box, a check box or a hidden value. */
const TYPED = "input:not([readonly], [disabled], [type=hidden], [type=checkbox], [type=radio])";

/**
 * Where the next keystroke belongs in a line or card just drawn: its first box that takes typing
 * (a color's text box, not the swatch before it), else its first control. A read-only select's box
 * is not selected, so it never draws its value highlighted as if typing would replace it.
 * @param controls - the line's or card's controls, in page order.
 * @returns the control, or undefined when there is none.
 */
export function keystrokeTarget(controls: readonly HTMLElement[]): HTMLElement | undefined {
    return controls.find((each) => each.matches(TYPED)) ?? controls[0];
}

/**
 * The control a line's keystroke goes to: in its field before its label column's settings button.
 * @param line - the line.
 * @returns the control, or null.
 */
export function lineTarget(line: Element | null | undefined): HTMLElement | null {
    const all = (selector: string): HTMLElement[] => [...(line?.querySelectorAll<HTMLElement>(selector) ?? [])];
    return keystrokeTarget(all(`.ws-field-control :is(${CONTROL})`)) ?? keystrokeTarget(all(CONTROL)) ?? null;
}

/** The line waiting for focus, as a selector; module state, so it outlives a remount of the tab. */
let pending: string | null = null;

/**
 * The lines each section of the last drawn tab listed, and which row of which session the tab was;
 * outlives a remount. A row's id is only unique within its session: another session (a project
 * opened again, a story rendered again in the same page) numbers its rows from the start, and its
 * new layer's tab must not be read as the old one's lines going away. Held weakly, so a closed
 * project's session is not kept alive by the last tab it drew.
 */
let drawn: {
    readonly session: WeakRef<GraphSession>;
    readonly panel: string;
    readonly lines: ReadonlyMap<string, readonly string[]>;
} | null = null;

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
    // Only sections drawn both times: a section that came or went whole is another tab (Node to
    // Edge), and the arrow key that switched it keeps focus on the tabs.
    for (const [section, lines] of now) {
        const before = was.get(section);
        if (before === undefined) {
            continue;
        }
        const came = lines.find((line) => !before.includes(line));
        if (came !== undefined) {
            return lineTarget(scope.querySelector(`[data-section="${section}"] [data-line="${came}"]`));
        }
    }
    for (const [section, lines] of was) {
        const after = now.get(section);
        if (after !== undefined && lines.some((line) => !after.includes(line))) {
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
 * Asks for keyboard focus on a section's "+" once a line removed from it is gone. The line's own
 * Remove button goes with it, so focus would fall to the page body (WCAG 2.4.3); never onto the
 * line that slides into its place, whose Remove a second Enter would press. Withdrawn with
 * `focusLineNext(null)`.
 * @param from - the Remove button, inside the section.
 * @param channel - the removed line's channel.
 */
export function focusSectionNext(from: Element, channel: Channel): void {
    const section = from.closest<HTMLElement>("[data-section]")?.dataset.section;
    pending =
        section === null || section === undefined
            ? null
            : `[data-section="${section}"]:not(:has([data-line="${channel}"] [aria-label^="Remove"])) [data-plus]`;
}

/**
 * Hands focus to the line `focusLineNext` asked for, on the first render that draws it. The line
 * can be drawn once by the tab that asked and again by the tab that replaces it (a selection's
 * first line makes its layer and the tab remounts on that row), so a tab that goes away with focus
 * still on the line it handed it to asks again, and the next tab hands it to its own copy of the line.
 * A line that comes or goes with nobody asking (an Undo or Redo) while focus is in the tab or has
 * fallen to the page takes focus itself: a line that came back, in its field; a line taken away, at
 * its section's "+".
 * @param session - the element's session the row belongs to.
 * @param panel - which row the tab shows, so a change of row is never read as lines coming or going.
 * @returns the ref for the element that holds the lines.
 */
export function useFocusLine<T extends HTMLElement>(session: GraphSession, panel: string): RefObject<T | null> {
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
        drawn = { session: new WeakRef(session), panel, lines: now };
        // Focus fell to the page, or stays in the tab (on a "+" an Undo did not take away).
        const active = document.activeElement;
        const free = active === null || active === document.body || node.contains(active);
        if (pending === null && free && was?.session.deref() === session && was.panel === panel) {
            controlForChange(node, was.lines, now)?.focus();
        }
        if (pending === null) {
            return;
        }
        const target = scope.current?.querySelector<HTMLElement>(pending);
        // The ask names a line, or a control itself (a section's "+").
        const control = target?.matches(CONTROL) === true ? target : lineTarget(target);
        if (control !== null) {
            handed.current = pending;
            pending = null;
            // The line already holds focus (its own copy took it back, on the control a Tab was
            // going to): the ask is answered.
            if (target?.contains(document.activeElement) === true) {
                return;
            }
            control.focus();
            // A line just added starts at a default: typing replaces it, as tabbing into a field does.
            if (control instanceof HTMLInputElement && !control.readOnly) {
                control.select();
            }
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

/**
 * The bottom of the app header, so a tall pop-out beside the panel starts below it and never
 * covers it.
 * @returns its bottom in viewport pixels, or 0 when there is no header.
 */
export function headerBottom(): number {
    return document.querySelector(".ws-header")?.getBoundingClientRect().bottom ?? 0;
}
