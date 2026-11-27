/**
 * WCAG 2.x contrast for the tests: one sRGB linearization and one alpha composite, so every test
 * scores a translucent color the same way.
 */

/** Red, green and blue (0-255) and alpha (0-1). */
export type Rgba = [number, number, number, number];

/** A color as `#rrggbb[aa]`, `rgb()`, `rgba()`, `color(srgb ...)` or already as channels. */
export type Color = string | Rgba;

/**
 * The channels of a color.
 * @param color - a hex token, a computed color or channels
 * @returns red, green, blue (0-255) and alpha (0-1)
 */
export function rgba(color: Color): Rgba {
    if (typeof color !== "string") {
        return color;
    }
    if (color.startsWith("#")) {
        const h = color.slice(1);
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        return [r, g, b, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    }
    const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return color.startsWith("color(") ? [r * 255, g * 255, b * 255, a] : [r, g, b, a];
}

/**
 * A (possibly translucent) color laid over an opaque ground; the ground's own alpha is ignored.
 * @param top - the color on top
 * @param ground - the opaque color under it
 * @returns the result, opaque
 */
export function over(top: Color, ground: Color): Rgba {
    const t = rgba(top);
    const g = rgba(ground);
    const a = t[3];
    return [t[0] * a + g[0] * (1 - a), t[1] * a + g[1] * (1 - a), t[2] * a + g[2] * (1 - a), 1];
}

/**
 * WCAG relative luminance of an opaque color (its alpha is ignored).
 * @param color - the color
 * @returns 0 (black) to 1 (white)
 */
function luminance(color: Color): number {
    const [r, g, b] = rgba(color)
        .slice(0, 3)
        .map((c) => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The WCAG contrast ratio of a (possibly translucent) color drawn over an opaque ground.
 * @param fg - the color on top, composited over `bg` first
 * @param bg - the opaque ground
 * @returns the ratio, 1 to 21
 */
export function contrast(fg: Color, bg: Color): number {
    const [hi, lo] = [luminance(over(fg, bg)), luminance(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}
