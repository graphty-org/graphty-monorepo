import type eruda from "eruda";

/** eruda's gap between its entry button and the window's edge, in CSS pixels. */
const GAP = 10;

/**
 * eruda's entry button, drawn inside eruda's own shadow root.
 * @returns The button, or undefined before eruda draws it.
 */
function button(): HTMLElement | undefined {
    return document.getElementById("eruda")?.shadowRoot?.querySelector<HTMLElement>(".eruda-entry-btn") ?? undefined;
}

/**
 * Keeps eruda's entry button in the top-right corner, whatever size the window has been.
 *
 * eruda puts the button back at its default, the bottom-right corner, in three cases: a place further right
 * than its default (the button's width plus 10 from the right edge) or below it counts as out of range on a
 * `resize`; a full-page screenshot shrinks the page to 1 x 1 for an instant; and 200 ms after an
 * `orientationchange` (which iPad Safari fires when the reader switches apps) it resets unconditionally.
 * So the button sits exactly at eruda's default right edge, measured from the button, at the top; it is
 * placed again after every `resize`, and whenever eruda moves it to its default corner. A drag the reader
 * makes elsewhere is left alone.
 * @param tool - The eruda instance, already initialized.
 */
export function pinErudaTopRight(tool: typeof eruda): void {
    const width = (): number => button()?.offsetWidth || 40;
    const place = (): void => {
        // eruda destroyed takes its button with it: nothing to place.
        if (button() === undefined) {
            return;
        }
        tool.position({ x: window.innerWidth - width() - GAP, y: 0 });
    };

    place();
    // Registered after eruda's own resize listener, so it runs second and has the last word.
    window.addEventListener("resize", place);
    // eruda moves a box around the button, not the button: watch every style change in eruda's shadow root.
    const root = document.getElementById("eruda")?.shadowRoot;
    if (root === null || root === undefined) {
        return;
    }
    new MutationObserver(() => {
        if (button() === undefined) {
            return;
        }
        const corner = width() + GAP;
        // A window too small for the button refuses every place but its corner: moving it then would only
        // be put back again, forever.
        if (window.innerWidth < corner || window.innerHeight < corner) {
            return;
        }
        const { x, y } = tool.position();
        if (Math.abs(x - (window.innerWidth - corner)) <= 1 && Math.abs(y - (window.innerHeight - corner)) <= 1) {
            place();
        }
    }).observe(root, { attributes: true, attributeFilter: ["style"], subtree: true });
}
