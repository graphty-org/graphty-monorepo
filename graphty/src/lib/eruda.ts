import type eruda from "eruda";

/** eruda's gap between its entry button and the window's edge, in CSS pixels. */
const GAP = 10;

/**
 * The entry button's width: eruda draws it inside its own shadow root, and its size differs by device.
 * @returns The width, or eruda's usual 40 before the button is drawn.
 */
function buttonWidth(): number {
    const button = document.getElementById("eruda")?.shadowRoot?.querySelector<HTMLElement>(".eruda-entry-btn");
    return button?.offsetWidth || 40;
}

/**
 * Keeps eruda's entry button in the top-right corner, whatever size the window has been.
 *
 * Eruda remembers where its button is and re-checks that place on every `resize`. A place further right than
 * its own default (the button's width plus 10 from the right edge) or below its default counts as out of
 * range, and eruda puts the button back in the bottom-right corner for good. So the button sits exactly at
 * eruda's default right edge, measured from the button itself, at the top; and is placed again after every
 * resize (a full-page screenshot shrinks the page to 1 x 1 for an instant), so where it sits depends only on
 * the window's current size.
 * @param tool - The eruda instance, already initialized.
 */
export function pinErudaTopRight(tool: typeof eruda): void {
    const place = (): void => {
        tool.position({ x: window.innerWidth - buttonWidth() - GAP, y: 0 });
    };

    place();
    // Registered after eruda's own resize listener, so it runs second and has the last word.
    window.addEventListener("resize", place);
}
