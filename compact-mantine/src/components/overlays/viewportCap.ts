/**
 * The height cap every menu, list, popover and pop-out panel shares (design/rendering/shader-studio
 * /decisions.md 6.2): the visual viewport's height less 16px, so no dropdown is ever taller than the
 * part of the page the reader can see. The visual viewport, not the window, because an on-screen
 * keyboard (iPad, phone) shrinks only the visual viewport. Its contents scroll inside it.
 */

/** How much shorter than the visual viewport a dropdown is at most, in px (8 above, 8 below). */
export const VIEWPORT_CAP_MARGIN = 16;

/**
 * The cap as a CSS length: the custom property installViewportCap keeps current, or the dynamic
 * viewport height before it has run.
 */
export const VIEWPORT_CAP = `var(--cm-viewport-cap, calc(100dvh - ${String(VIEWPORT_CAP_MARGIN)}px))`;

/**
 * A max-height that is also never above the cap.
 * @param length - the height the caller would set, as a CSS length
 * @returns the smaller of the two, as CSS
 */
export function capped(length: string): string {
    return `min(${length}, ${VIEWPORT_CAP})`;
}

/**
 * The visual viewport's band in layout-viewport pixels (what getBoundingClientRect measures), or
 * the window's when the browser has no visualViewport.
 * @returns its top and bottom edges
 */
export function visualBand(): { top: number; bottom: number } {
    const view = globalThis.window?.visualViewport;
    if (!view) {
        return { top: 0, bottom: globalThis.window?.innerHeight ?? 0 };
    }
    return { top: view.offsetTop, bottom: view.offsetTop + view.height };
}

let installed = false;

/**
 * Keep `--cm-viewport-cap` on `<html>` current: the visual viewport's height less 16px, updated on
 * every resize of it (a keyboard opening, a pinch zoom) and of the window. Safe to call on every
 * render and during SSR.
 */
export function installViewportCap(): void {
    if (installed || globalThis.window === undefined || globalThis.document === undefined) {
        return;
    }
    installed = true;
    const update = (): void => {
        const { top, bottom } = visualBand();
        const cap = Math.max(0, Math.floor(bottom - top - VIEWPORT_CAP_MARGIN));
        document.documentElement.style.setProperty("--cm-viewport-cap", `${String(cap)}px`);
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
}
