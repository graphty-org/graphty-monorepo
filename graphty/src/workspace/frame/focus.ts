/**
 * Whether keyboard focus has fallen to the page itself, as it does when the control holding it
 * is removed (WCAG 2.4.3): the caller then hands it on to a stated target.
 * @returns true when no control has focus.
 */
export function focusIsLost(): boolean {
    return document.activeElement === null || document.activeElement === document.body;
}

/**
 * Puts focus on the rail button of the place the left panel shows: the control that names the
 * open panel. Used where a whole surface comes up or goes (a project opens, the Data page closes),
 * so focus lands on one control, not on the drawing's outline or on the page. Not a row of the
 * panel's list: a tree row takes printable keys for its type-to-find, so "/", "P" and the other
 * single-key shortcuts would stop working; nor the find box, which takes them as text.
 */
export function focusCurrentPlace(): void {
    document.querySelector<HTMLElement>('.ws-rail [aria-current="page"]')?.focus();
}
