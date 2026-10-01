import type eruda from "eruda";

/** How far the entry button sits from the window's top and right edges, in CSS pixels. */
const INSET = { right: 60, top: 20 };

/**
 * Keeps eruda's entry button in the top-right corner, whatever size the window has been.
 *
 * Eruda remembers where its button is and re-checks that place on every `resize`. When the place
 * does not fit the window of that moment, eruda forgets it for good and remembers its own default,
 * the bottom-right corner, instead. A window that is briefly tiny therefore moves the button for
 * the rest of the page's life: Playwright's full-page screenshot resizes the page to 1 x 1 for an
 * instant whenever the page is taller than the viewport, so about one capture in sixteen of such
 * a story drew the button bottom-right instead of top-right. Placing it again after every resize
 * makes where it sits depend only on the window's current size.
 * @param tool - The eruda instance, already initialized.
 */
export function pinErudaTopRight(tool: typeof eruda): void {
    const place = (): void => {
        tool.position({ x: window.innerWidth - INSET.right, y: INSET.top });
    };

    place();
    // Registered after eruda's own resize listener, so it runs second and has the last word.
    window.addEventListener("resize", place);
}
