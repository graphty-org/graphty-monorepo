/**
 * Keeps a pointer drag from selecting the page's text.
 *
 * Calling `preventDefault` on the pointerdown is not enough: a touch drag in WebKit (iPad)
 * still starts a selection, and a drag that leaves its handle selects whatever it passes over.
 * So for the length of the drag the shield cancels every `selectstart`, sets `user-select: none`
 * on the document root, and drops any selection already made. It lifts itself on the drag's
 * pointerup, pointercancel or lostpointercapture (listened for on the window in the capture
 * phase, so a handler that stops propagation cannot strand it), or when the returned function
 * is called (a component unmounted mid-drag).
 *
 * Internal: not exported from the package.
 */

/** The lift of the shield that is up, if one is. */
let active: (() => void) | null = null;

const cancel = (event: Event): void => {
    event.preventDefault();
};

const END_EVENTS = ["pointerup", "pointercancel", "lostpointercapture"] as const;

/**
 * Raise the shield for one drag. A second call while one is up replaces it.
 * @returns a function that lifts the shield; calling it again does nothing
 */
export function shieldDragSelection(): () => void {
    active?.();
    const root = document.documentElement.style;
    const before = {
        userSelect: root.userSelect,
        webkitUserSelect: root.getPropertyValue("-webkit-user-select"),
    };

    const lift = (): void => {
        if (active !== lift) {
            return;
        }
        active = null;
        document.removeEventListener("selectstart", cancel, true);
        for (const type of END_EVENTS) {
            window.removeEventListener(type, lift, true);
        }
        root.userSelect = before.userSelect;
        root.setProperty("-webkit-user-select", before.webkitUserSelect);
    };

    active = lift;
    document.addEventListener("selectstart", cancel, true);
    for (const type of END_EVENTS) {
        window.addEventListener(type, lift, true);
    }
    root.userSelect = "none";
    root.setProperty("-webkit-user-select", "none");
    window.getSelection()?.removeAllRanges();
    return lift;
}
