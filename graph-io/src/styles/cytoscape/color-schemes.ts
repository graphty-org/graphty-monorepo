/**
 * Cytoscape desktop's chart color schemes (`cy_colorScheme`), which give a chart its colors when `cy_colors` names
 * none, ported from Cytoscape 3.10's `ColorScheme` and `ColorGradient` (custom-graphics-internal): the generated
 * RAINBOW, MODULATED and CONTRASTING colors, and the named three-color gradients. RANDOM, CUSTOM and a palette from a
 * palette provider are not read (no colors: the chart is not drawn).
 */

/** Java's `Color.RED` and its other named colors, as `#rrggbb`. */
const JAVA = {
    red: "#ff0000",
    green: "#00ff00",
    blue: "#0000ff",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    yellow: "#ffff00",
    orange: "#ffc800",
    white: "#ffffff",
    black: "#000000",
} as const;

/** `ColorGradient`'s gradients as `[down, zero, up]` (zero null where it has none), keyed by their normalized name. */
const GRADIENTS: Readonly<Record<string, readonly [string, string | null, string]>> = {
    CYANYELLOW: [JAVA.cyan, null, JAVA.yellow],
    CYANWHITEYELLOW: [JAVA.cyan, JAVA.white, JAVA.yellow],
    CYANBLACKYELLOW: [JAVA.cyan, JAVA.black, JAVA.yellow],
    BLUERED: [JAVA.blue, null, JAVA.red],
    BLUEBLACKRED: [JAVA.blue, JAVA.black, JAVA.red],
    BLUEYELLOW: [JAVA.blue, null, JAVA.yellow],
    BLUEGREENYELLOW: [JAVA.blue, JAVA.green, JAVA.yellow],
    GREENPURPLE: [JAVA.green, null, JAVA.magenta],
    GREENBLACKPURPLE: [JAVA.green, JAVA.black, JAVA.magenta],
    ORANGEPURPLE: [JAVA.orange, null, JAVA.magenta],
    PURPLEYELLOW: [JAVA.magenta, null, JAVA.yellow],
    PURPLEBLACKYELLOW: [JAVA.magenta, JAVA.black, JAVA.yellow],
    REDYELLOW: [JAVA.red, null, JAVA.yellow],
    REDBLACKYELLOW: [JAVA.red, JAVA.black, JAVA.yellow],
    YLGN: ["#31a354", "#addd8e", "#f7fcb9"],
    YLGNB: ["#2c7fb8", "#7fcdbb", "#edf8b1"],
    YLORBR: ["#d95f0e", "#fec44f", "#fff7bc"],
    YLORRD: ["#f03b20", "#feb24c", "#ffeda0"],
    BRBG: ["#5ab4ac", null, "#d8b365"],
    PIYG: ["#a1d76a", null, "#e9a3c9"],
    PRGN: ["#7fbf7b", null, "#af8dc3"],
    PUOR: ["#998ec3", null, "#f1a340"],
    RDBU: ["#67a9cf", null, "#ef8a62"],
};

/**
 * Java's `Color.HSBtoRGB` in single precision, as `#rrggbb`.
 * @param hue - the hue, any number (its fraction is used)
 * @param saturation - 0..1
 * @param brightness - 0..1
 * @returns the color
 */
function hsbToHex(hue: number, saturation: number, brightness: number): string {
    const f32 = Math.fround;
    const [s, b] = [f32(saturation), f32(brightness)];
    const byte = (v: number): number => Math.trunc(f32(f32(v) * 255) + 0.5);
    let rgb: number[];
    if (s === 0) {
        rgb = [b, b, b];
    } else {
        const h = f32(f32(hue - Math.floor(hue)) * 6);
        const f = f32(h - Math.floor(h));
        const p = f32(b * f32(1 - s));
        const q = f32(b * f32(1 - f32(s * f)));
        const t = f32(b * f32(1 - f32(s * f32(1 - f))));
        rgb = [
            [b, t, p],
            [q, b, p],
            [p, b, t],
            [p, q, b],
            [t, p, b],
            [b, p, q],
        ][Math.trunc(h) % 6];
    }
    return `#${rgb.map((v) => byte(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * `ColorScheme.generateContrastingColors`: around the hue wheel, every second color from its opposite side.
 * @param n - how many
 * @returns the colors
 */
function contrasting(n: number): string[] {
    if (n === 2) {
        return [hsbToHex(0, 1, 1), hsbToHex(0.5, 1, 1)];
    }
    const out: string[] = [];
    for (let i = 0; i < n; i += 2) {
        out.push(hsbToHex(Math.fround(i / n), 1, 1));
        if (i + 1 < n) {
            const hue = Math.fround(Math.fround((i + 1) / n) + 0.5);
            out.push(hsbToHex(hue >= 1 ? hue - 1 : hue, 1, 1));
        }
    }
    return out;
}

/**
 * The colors a chart's `cy_colorScheme` gives `n` values, as Cytoscape's `ColorScheme.getColors(n)`; empty for a
 * scheme it reads no colors from.
 * @param scheme - the scheme's name
 * @param n - how many values the chart has
 * @returns the colors, lower case
 */
export function colorSchemeColors(scheme: unknown, n: number): string[] {
    if (typeof scheme !== "string" || n <= 0) {
        return [];
    }
    const key = scheme.toUpperCase();
    const hues = Array.from({ length: n }, (_, i) => Math.fround(i / n));
    switch (key) {
        case "RAINBOW":
            return hues.map((h) => hsbToHex(h, 1, 1));
        case "MODULATED":
            return hues.map((h, i) =>
                hsbToHex(
                    h,
                    Math.fround(Math.abs(Math.fround(Math.cos((8 * i) / (2 * Math.PI)))) * 0.7) + 0.3,
                    Math.fround(Math.abs(Math.fround(Math.sin(i / (2 * Math.PI) + Math.PI / 2))) * 0.7) + 0.3,
                ),
            );
        case "CONTRASTING":
            return contrasting(n);
        default:
            break;
    }
    const gradient = GRADIENTS[key.replaceAll(/[-_]/g, "")];
    if (gradient === undefined) {
        return [];
    }
    // `ColorGradient.getColors()` is up, zero (when it has one), down; more than asked for are thinned out
    const [down, zero, up] = gradient;
    const colors = zero === null ? [up, down] : [up, zero, down];
    if (colors.length <= n) {
        return colors;
    }
    if (n === 1) {
        return [colors[0]];
    }
    // three colors asked for two: the first and the last
    return [colors[0], colors[2]];
}
