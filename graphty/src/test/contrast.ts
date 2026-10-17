/**
 * WCAG 2.x contrast measured on the page: the computed ink of an element against the computed
 * ground of its surface, so a token that resolves in a different color scheme from its surface
 * is caught where it is drawn.
 */

type Rgba = [number, number, number, number];

/** WCAG 2.x 1.4.3 minimum for body text. */
export const TEXT_MIN_CONTRAST = 4.5;

function parse(color: string): Rgba {
    const parts = /rgba?\(([^)]+)\)/
        .exec(color)?.[1]
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);
    if (parts === undefined || parts.length < 3) {
        throw new Error(`unparsed color "${color}"`);
    }
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function luminance([r, g, b]: Rgba): number {
    const lin = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * The contrast of `ink`'s computed text color, composited over `surface`'s computed background,
 * rounded to two places. `surface` must have an opaque background.
 * @param ink - the element whose text color is measured
 * @param surface - the element whose background the text sits on
 * @returns the contrast ratio, 1 to 21
 */
export function textContrast(ink: Element, surface: Element): number {
    const fg = parse(getComputedStyle(ink).color);
    const bg = parse(getComputedStyle(surface).backgroundColor);
    const a = fg[3];
    const mixed: Rgba = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)) as Rgba;
    const [hi, lo] = [luminance(mixed), luminance(bg)].sort((x, y) => y - x);
    return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}
