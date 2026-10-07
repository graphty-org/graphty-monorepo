/**
 * Whether keyboard focus has fallen to the page itself, as it does when the control holding it
 * is removed (WCAG 2.4.3): the caller then hands it on to a stated target.
 * @returns true when no control has focus.
 */
export function focusIsLost(): boolean {
    return document.activeElement === null || document.activeElement === document.body;
}
