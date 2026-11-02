/**
 * Measures a focus ring as a reader sees it: its color, width and offset, and its contrast with
 * what it is drawn on (WCAG 2.4.7 and 1.4.11 ask 3:1).
 */

/** Red, green, blue (0-255) and alpha (0-1). */
export type Rgba = readonly [number, number, number, number];

/**
 * Any CSS color as the browser paints it, through a canvas, so light-dark(), color-mix() and
 * color() resolve.
 * @param css - the color.
 * @returns the color.
 */
export function rgba(css: string): Rgba {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (ctx === null) {
        throw new Error("no 2d context");
    }
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
}

/**
 * WCAG relative luminance.
 * @param color - the color.
 * @returns its luminance.
 */
function luminance([r, g, b]: Rgba): number {
    const lin = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio of two opaque colors.
 * @param a - one color.
 * @param b - the other.
 * @returns the ratio, 1 to 21.
 */
export function contrast(a: Rgba, b: Rgba): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * The first opaque background at or above an element: what an inset ring is drawn on.
 * @param from - the element.
 * @returns the color.
 */
export function groundOf(from: Element): Rgba {
    for (let at: Element | null = from; at !== null; at = at.parentElement) {
        const bg = rgba(getComputedStyle(at).backgroundColor);
        if (bg[3] > 0.99) {
            return bg;
        }
    }
    return rgba(getComputedStyle(document.body).backgroundColor);
}

/**
 * The ring a focused element draws inside its own box, and its contrast with the ground it is
 * drawn on there.
 * @param el - the focused element.
 * @returns the ring's width and offset, and its contrast (0 when it draws no ring).
 */
export function insetRing(el: Element): { width: number; offset: number; contrast: number } {
    const style = getComputedStyle(el);
    const color = rgba(style.outlineColor);
    const width = style.outlineStyle === "none" || color[3] === 0 ? 0 : Number.parseFloat(style.outlineWidth);
    return {
        width,
        offset: Number.parseFloat(style.outlineOffset),
        contrast: width === 0 ? 0 : contrast(color, groundOf(el)),
    };
}

/**
 * Runs a measurement once in each color scheme the app offers, by Mantine's own attribute.
 * @param measure - what to measure.
 * @returns the measurement in dark and in light.
 */
export function inBothSchemes<T>(measure: () => T): { dark: T; light: T } {
    const root = document.documentElement;
    const was = root.getAttribute("data-mantine-color-scheme");
    try {
        root.setAttribute("data-mantine-color-scheme", "dark");
        const dark = measure();
        root.setAttribute("data-mantine-color-scheme", "light");
        return { dark, light: measure() };
    } finally {
        if (was === null) {
            root.removeAttribute("data-mantine-color-scheme");
        } else {
            root.setAttribute("data-mantine-color-scheme", was);
        }
    }
}
