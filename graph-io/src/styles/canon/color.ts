/**
 * Canonical colors: lowercase `#rrggbb` plus an alpha from 0 to 1, read in the namespace of the file's dialect. The
 * alpha never stays in the color: `colorOpacity()` moves it into the property's opacity or drops it with a note.
 */

import { STYLE_ISSUE } from "../codes.js";
import type { StyleColor, StyleDialect } from "../types.js";
import { CSS_COLORS, DVIPS_COLORS, JAVA_COLORS } from "./color-tables.js";
import { graphvizColor, type GraphvizColorUse } from "./graphviz.js";
import { num6 } from "./number.js";
import { type CanonSite, noteAt, scalarText, spendAt } from "./site.js";

/**
 * A canonical color and the alpha the file gave it.
 * @category Styles
 */
export interface CanonColor {
    /** Lowercase `#rrggbb`. */
    readonly color: StyleColor;
    /** 0..1 at 6 significant digits; 1 when the file gave none. */
    readonly alpha: number;
}

/**
 * Options of `canonColor()`.
 * @category Styles
 */
export interface CanonColorOptions {
    /** Graphviz only: the object's `colorscheme`. */
    readonly scheme?: string | null;
    /**
     * Graphviz only: how the value is drawn, which decides how a color list is read (`line` for an outline or a
     * font color, `fill`, or `edge` for an edge's line); defaults to `line`.
     */
    readonly use?: GraphvizColorUse;
}

/**
 * A byte as two hex digits, clamped and rounded.
 * @param v - a channel 0..255
 * @returns two lowercase hex digits
 */
function hex2(v: number): string {
    return Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0");
}

/**
 * `#rrggbb` from channels 0..255.
 * @param r - red
 * @param g - green
 * @param b - blue
 * @returns the color
 */
function rgbHex(r: number, g: number, b: number): StyleColor {
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/**
 * An alpha clamped to 0..1 at 6 significant digits.
 * @param a - the alpha
 * @returns the canonical alpha
 */
function alpha01(a: number): number {
    return num6(Math.max(0, Math.min(1, a)));
}

// ------------------------------------------------------------ CSS Color 4 gamut mapping, as graphty-element draws

type Vec3 = readonly [number, number, number];

/**
 * A 3x3 matrix times a vector.
 * @param m - the matrix, row by row
 * @param v - the vector
 * @returns m * v
 */
function mul(m: readonly Vec3[], v: Vec3): Vec3 {
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ];
}

const LIN_TO_XYZ: readonly Vec3[] = [
    [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
    [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
    [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];
const XYZ_TO_LIN: readonly Vec3[] = [
    [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
    [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
    [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];
const XYZ_TO_LMS: readonly Vec3[] = [
    [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
    [0.0329836539323885, 0.929286861586343, 0.0361446663506424],
    [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];
const LMS_TO_XYZ: readonly Vec3[] = [
    [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
    [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
    [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
];
const LMS_TO_LAB: readonly Vec3[] = [
    [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
    [1.9779985324311684, -2.42859224204858, 0.450593709617411],
    [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];
const LAB_TO_LMS: readonly Vec3[] = [
    [1, 0.3963377773761749, 0.2158037573099136],
    [1, -0.1055613458156586, -0.0638541728258133],
    [1, -0.0894841775298119, -1.2914855480194092],
];

/**
 * sRGB (0..1, possibly out of range) to OKLab.
 * @param rgb - the channels
 * @returns L, a, b
 */
function srgbToOklab(rgb: Vec3): Vec3 {
    const lin = rgb.map((c) => {
        const a = Math.abs(c);
        return Math.sign(c) * (a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4);
    }) as unknown as Vec3;
    const lms = mul(XYZ_TO_LMS, mul(LIN_TO_XYZ, lin));
    return mul(LMS_TO_LAB, lms.map(Math.cbrt) as unknown as Vec3);
}

/**
 * OKLab to sRGB (0..1, possibly out of range).
 * @param lab - L, a, b
 * @returns the channels
 */
function oklabToSrgb(lab: Vec3): Vec3 {
    const lms = mul(LAB_TO_LMS, lab).map((c) => c ** 3) as unknown as Vec3;
    return mul(XYZ_TO_LIN, mul(LMS_TO_XYZ, lms)).map((c) => {
        const a = Math.abs(c);
        return Math.sign(c) * (a > 0.0031308 ? 1.055 * a ** (1 / 2.4) - 0.055 : 12.92 * a);
    }) as unknown as Vec3;
}

/**
 * Whether sRGB channels are within 0..1.
 * @param rgb - the channels
 * @returns true when every channel is in range
 */
function inGamut(rgb: Vec3): boolean {
    return rgb.every((c) => c >= 0 && c <= 1);
}

/**
 * Clamps sRGB channels to 0..1.
 * @param rgb - the channels
 * @returns the clamped channels
 */
function clip(rgb: Vec3): Vec3 {
    return rgb.map((c) => Math.max(0, Math.min(1, c))) as unknown as Vec3;
}

/**
 * Distance in OKLab.
 * @param p - one color
 * @param q - the other
 * @returns delta E OK
 */
function deltaEOK(p: Vec3, q: Vec3): number {
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * CSS Color 4's gamut mapping into sRGB: chroma is reduced in OKLCh until clipping changes the color by less than
 * a just noticeable difference. It is what graphty-element's color parser does with an out-of-range `rgb()` or
 * `hsl()`, so a canonical color equals the color graphty-element draws for the same text.
 * @param rgb - sRGB channels 0..1, possibly out of range
 * @returns channels within 0..1
 */
function toGamut(rgb: Vec3): Vec3 {
    if (inGamut(rgb)) {
        return rgb;
    }
    const JND = 0.02;
    const EPSILON = 0.0001;
    const [l, a, b] = srgbToOklab(rgb);
    if (l >= 1) {
        return [1, 1, 1];
    }
    if (l <= 0) {
        return [0, 0, 0];
    }
    // The hue in degrees and back, as graphty-element's OKLCh does, so channels on a rounding edge round the same way.
    const achromatic = Math.abs(a) < 0.0002 && Math.abs(b) < 0.0002;
    const degrees = ((((Math.atan2(b, a) * 180) / Math.PI) % 360) + 360) % 360;
    const at = (chroma: number): Vec3 =>
        achromatic
            ? [l, 0, 0]
            : [l, chroma * Math.cos((degrees * Math.PI) / 180), chroma * Math.sin((degrees * Math.PI) / 180)];
    const chroma0 = Math.sqrt(a ** 2 + b ** 2);
    const first = oklabToSrgb(at(chroma0));
    if (inGamut(first)) {
        return first;
    }
    let clipped = clip(first);
    if (deltaEOK(srgbToOklab(clipped), at(chroma0)) < JND) {
        // Clipping is close enough: clip the channels as given, without the round trip's rounding noise.
        return clip(rgb);
    }
    let min = 0;
    let max = chroma0;
    let minInGamut = true;
    // A bisection: log2(chroma / EPSILON) rounds, about 30 for the most extreme finite input.
    while (max - min > EPSILON) {
        const chroma = (min + max) / 2;
        const current = at(chroma);
        const rgbNow = oklabToSrgb(current);
        if (minInGamut && inGamut(rgbNow)) {
            min = chroma;
            continue;
        }
        clipped = clip(rgbNow);
        const e = deltaEOK(srgbToOklab(clipped), current);
        if (e < JND) {
            if (JND - e < EPSILON) {
                break;
            }
            minInGamut = false;
            min = chroma;
        } else {
            max = chroma;
        }
    }
    return clipped;
}

/**
 * sRGB channels 0..1 (after gamut mapping) as `#rrggbb`.
 * @param rgb - the channels
 * @returns the color
 */
function srgbHex(rgb: Vec3): StyleColor {
    const [r, g, b] = toGamut(rgb);
    return rgbHex(r * 255, g * 255, b * 255);
}

// ------------------------------------------------------------ CSS functional notation

/** One CSS number, optionally a percentage or an angle unit. */
const CSS_NUMBER = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(%|deg|grad|rad|turn)?$/i;

/**
 * Splits a functional color's arguments: commas or blanks, with an optional `/` before the alpha.
 * @param body - the text between the parentheses
 * @returns the arguments and the alpha argument, or null when malformed
 */
function cssArgs(body: string): { parts: string[]; alpha: string | undefined } | null {
    const slash = body.split("/");
    if (slash.length > 2) {
        return null;
    }
    const parts = slash[0].split(/[\s,]+/).filter((p) => p !== "");
    let alpha = slash.length === 2 ? slash[1].trim() : undefined;
    if (alpha === undefined && parts.length === 4) {
        alpha = parts.pop();
    }
    return parts.length === 3 && alpha !== "" ? { parts, alpha } : null;
}

/**
 * Reads one CSS number.
 * @param text - the argument
 * @returns the value and its unit (lowercase, "" for none), or null
 */
function cssNumber(text: string): { value: number; unit: string } | null {
    const m = CSS_NUMBER.exec(text);
    if (m === null) {
        return null;
    }
    const value = Number(m[1]);
    return Number.isFinite(value) ? { value, unit: (m[2] ?? "").toLowerCase() } : null;
}

/**
 * Reads a CSS alpha: a number 0..1 or a percentage, clamped.
 * @param text - the argument, or undefined for none
 * @returns the alpha, or null when malformed
 */
function cssAlpha(text: string | undefined): number | null {
    if (text === undefined) {
        return 1;
    }
    const n = cssNumber(text);
    if (n === null || (n.unit !== "" && n.unit !== "%")) {
        return null;
    }
    return alpha01(n.unit === "%" ? n.value / 100 : n.value);
}

/**
 * `rgb()`, `rgba()`, `hsl()` and `hsla()` as graphty-element reads them: channels and lightness out of range are
 * gamut mapped, not refused.
 * @param text - the value, trimmed
 * @returns the color, or null when it is not one
 */
function cssFunction(text: string): { hex: StyleColor; alpha: number } | null {
    const m = /^(rgba?|hsla?)\(([^()]*)\)$/i.exec(text);
    if (m === null) {
        return null;
    }
    const args = cssArgs(m[2]);
    if (args === null) {
        return null;
    }
    const nums = args.parts.map(cssNumber);
    const alpha = cssAlpha(args.alpha);
    if (nums.some((n) => n === null) || alpha === null) {
        return null;
    }
    const [x, y, z] = nums as { value: number; unit: string }[];
    if (m[1].toLowerCase().startsWith("rgb")) {
        if ([x, y, z].some((n) => n.unit !== "" && n.unit !== "%")) {
            return null;
        }
        const ch = [x, y, z].map((n) => (n.unit === "%" ? n.value / 100 : n.value / 255)) as unknown as Vec3;
        return { hex: srgbHex(ch), alpha };
    }
    const turns: Readonly<Record<string, number>> = { "": 360, deg: 360, grad: 400, rad: 2 * Math.PI, turn: 1 };
    if (x.unit === "%" || !Object.hasOwn(turns, x.unit) || [y, z].some((n) => n.unit !== "" && n.unit !== "%")) {
        return null;
    }
    const h = ((((x.value / turns[x.unit]) * 360) % 360) + 360) % 360;
    const s = y.value / 100;
    const l = z.value / 100;
    const f = (n: number): number => {
        const k = (n + h / 30) % 12;
        return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return { hex: srgbHex([f(0), f(8), f(4)]), alpha };
}

// ------------------------------------------------------------ hex and names

/**
 * A `#` hex color of 3, 4, 6 or 8 digits. Eight digits put the alpha last, except in yFiles 3, which puts it first.
 * @param text - the value, trimmed
 * @param alphaFirst - whether 8 digits are `#AARRGGBB`
 * @returns the color, or null
 */
function hexColor(text: string, alphaFirst: boolean): { hex: StyleColor; alpha: number } | null {
    const m = /^#([0-9a-f]+)$/i.exec(text);
    if (m === null) {
        return null;
    }
    const h = m[1];
    const byte = (i: number): number => Number.parseInt(h.slice(i, i + 2), 16);
    switch (h.length) {
        case 3:
        case 4: {
            const v = Array.from(h, (c) => Number.parseInt(c + c, 16));
            return { hex: rgbHex(v[0], v[1], v[2]), alpha: h.length === 4 ? alpha01(v[3] / 255) : 1 };
        }
        case 6:
            return { hex: `#${h.toLowerCase()}`, alpha: 1 };
        case 8:
            return alphaFirst
                ? { hex: rgbHex(byte(2), byte(4), byte(6)), alpha: alpha01(byte(0) / 255) }
                : { hex: rgbHex(byte(0), byte(2), byte(4)), alpha: alpha01(byte(6) / 255) };
        default:
            return null;
    }
}

/**
 * A CSS color as graphty-element reads it: hex, `rgb()`/`hsl()` and their alpha forms, a CSS name or
 * `transparent`.
 * @param text - the value, trimmed
 * @returns the color, or null
 */
function cssColor(text: string): { hex: StyleColor; alpha: number } | null {
    const lower = text.toLowerCase();
    if (lower === "transparent") {
        return { hex: "#000000", alpha: 0 };
    }
    const named = CSS_COLORS.get(lower);
    if (named !== undefined) {
        return { hex: named as StyleColor, alpha: 1 };
    }
    return hexColor(text, false) ?? cssFunction(text);
}

/** One of Pajek's decimal color channels in `RGB(1,0.8,0)`: 0..1, no spaces (Pajek 6.02 manual p. 76). */
const PAJEK_CHANNEL = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Pajek's color names: the dvips names as written, `GrayNN` (NN percent black), `RGBrrggbb`, `RGB(r,g,b)` with
 * channels 0..1, `CMYKccmmyykk` and `CMYK(c,m,y,k)` (CMYK converted as dvips converts its names: each channel is
 * 1 - min(1, c + k)).
 * @param text - the value, trimmed
 * @returns the color, or null
 */
function pajekColor(text: string): { hex: StyleColor; alpha: number } | null {
    const named = DVIPS_COLORS.get(text);
    if (named !== undefined) {
        return { hex: named as StyleColor, alpha: 1 };
    }
    const gray = /^Gray(\d\d)$/.exec(text);
    if (gray !== null) {
        const v = 255 * (1 - Number(gray[1]) / 100);
        return { hex: rgbHex(v, v, v), alpha: 1 };
    }
    const rgb = /^RGB([0-9A-Fa-f]{6})$/.exec(text);
    if (rgb !== null) {
        return { hex: `#${rgb[1].toLowerCase()}`, alpha: 1 };
    }
    const cmyk = /^CMYK([0-9A-Fa-f]{8})$/.exec(text);
    let parts: number[] | null = null;
    let model = "";
    if (cmyk === null) {
        const fn = /^(RGB|CMYK)\(([^()]*)\)$/.exec(text);
        const channels = fn === null ? [] : fn[2].split(",");
        if (fn !== null && channels.every((c) => PAJEK_CHANNEL.test(c))) {
            model = fn[1];
            parts = channels.map(Number);
        }
    } else {
        model = "CMYK";
        parts = [0, 2, 4, 6].map((i) => Number.parseInt(cmyk[1].slice(i, i + 2), 16) / 255);
    }
    if (parts === null || parts.some((p) => p > 1) || parts.length !== (model === "RGB" ? 3 : 4)) {
        return hexColor(text, false);
    }
    if (model === "RGB") {
        return { hex: rgbHex(parts[0] * 255, parts[1] * 255, parts[2] * 255), alpha: 1 };
    }
    const [c, m, y, k] = parts;
    const ch = (v: number): number => 255 * (1 - Math.min(1, v + k));
    return { hex: rgbHex(ch(c), ch(m), ch(y)), alpha: 1 };
}

/**
 * A color given as separate channels (`{ r, g, b, a? }`, GEXF's `viz:color` and Gephi's keys): r, g and b 0..255,
 * a 0..1.
 * @param raw - the object
 * @returns the color, or null when a channel is missing or out of range
 */
function channels(raw: object): { hex: StyleColor; alpha: number } | null {
    if (!Object.hasOwn(raw, "r") || !Object.hasOwn(raw, "g") || !Object.hasOwn(raw, "b")) {
        return null;
    }
    const o = raw as { r: unknown; g: unknown; b: unknown; a?: unknown };
    const [r, g, b] = [o.r, o.g, o.b].map((v) => (typeof v === "number" || typeof v === "string" ? Number(v) : NaN));
    if (![r, g, b].every((v) => Number.isFinite(v) && v >= 0 && v <= 255)) {
        return null;
    }
    const a = Object.hasOwn(raw, "a") && o.a !== undefined && o.a !== null ? Number(o.a) : 1;
    return Number.isFinite(a) ? { hex: rgbHex(r, g, b), alpha: alpha01(a) } : null;
}

/**
 * A canonical color in the file's dialect, or null with a note.
 *
 * - CSS (`css`, `vis`, `graphology`, `cytoscape-js`, `graphty` and any dialect not listed): `#rgb`, `#rgba`,
 *   `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, CSS names and `transparent`, resolved as
 *   graphty-element resolves them (out-of-range channels are gamut mapped).
 * - `graphviz`: Graphviz's own rules (see `graphvizColor`); an unknown color is BLACK, with a note, because that is
 *   what Graphviz draws. `x11`: the same names, and an unknown one is null.
 * - `java`, `gephi`, `cytoscape`: the `java.awt.Color` names first, then CSS; a `java` integer is an RGB value.
 * - `dvips`: Pajek's names.
 * - `yed`: `#RRGGBBAA` with the alpha last; `yfiles3`: `#AARRGGBB` with the alpha first and constants such as
 *   `DARK_ORANGE`.
 * - `gexf` and `gephi` also take `{ r, g, b, a }` objects.
 *
 * A Graphviz color list is read as `options.use` says and noted (`W_STYLE_GRADIENT`, `W_STYLE_COLOR_LIST`).
 * @param raw - the file's value
 * @param dialect - the file's dialect
 * @param site - where it was read
 * @param options - Graphviz's scheme and use
 * @returns the color and its alpha, or null
 * @category Styles
 */
export function canonColor(
    raw: unknown,
    dialect: StyleDialect,
    site: CanonSite,
    options: CanonColorOptions = {},
): CanonColor | null {
    if (raw !== null && typeof raw === "object") {
        spendAt(site, 1);
        const c = dialect === "gexf" || dialect === "gephi" ? channels(raw) : null;
        if (c === null) {
            noteAt(site, STYLE_ISSUE.BAD_VALUE, raw);
            return null;
        }
        return { color: c.hex, alpha: c.alpha };
    }
    if (typeof raw === "number" && dialect === "java" && Number.isInteger(raw) && Math.abs(raw) <= 0xffffffff) {
        spendAt(site, 1);
        const v = raw >>> 0;
        return { color: rgbHex((v >>> 16) & 255, (v >>> 8) & 255, v & 255), alpha: 1 };
    }
    const text = scalarText(raw, site);
    if (text === null) {
        return null;
    }
    if (dialect === "graphviz" || dialect === "x11") {
        const g = graphvizColor(text, dialect === "x11" ? null : (options.scheme ?? null), options.use ?? "line");
        if (g.unknown) {
            noteAt(site, STYLE_ISSUE.BAD_VALUE, text);
            // Graphviz draws an unknown color black; a plain X11 name that is unknown is no color at all.
            if (dialect === "x11") {
                return null;
            }
        }
        if (g.list !== null) {
            noteAt(site, g.list === "gradient" ? STYLE_ISSUE.GRADIENT : STYLE_ISSUE.COLOR_LIST, text);
        }
        return { color: g.hex as StyleColor, alpha: alpha01(g.alpha) };
    }
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    let c: { hex: StyleColor; alpha: number } | null;
    switch (dialect) {
        case "dvips":
            c = pajekColor(trimmed);
            break;
        case "yfiles3":
            c = hexColor(trimmed, true) ?? cssColor(lower.replace(/_/g, ""));
            break;
        case "java":
        case "gephi":
        case "cytoscape": {
            const java = JAVA_COLORS.get(lower);
            c = java === undefined ? cssColor(trimmed) : { hex: java as StyleColor, alpha: 1 };
            break;
        }
        default:
            c = cssColor(trimmed);
    }
    if (c === null) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, text);
        return null;
    }
    return { color: c.hex, alpha: c.alpha };
}

/**
 * Moves a color's alpha into the property's opacity. When the property has an opacity (`fill` has `fillOpacity`,
 * an edge's `color` has `opacity`) the alpha is multiplied with any opacity the file also states; when it has none
 * (an outline, a label color) an alpha below 1 is dropped and noted as `W_STYLE_ALPHA_DROPPED`.
 * @param color - the canonical color
 * @param stated - the opacity the file states for the same element, or null
 * @param site - where the color was read
 * @param carried - whether the property has an opacity to carry the alpha
 * @returns the opacity to write, or null when there is none to write
 * @category Styles
 */
export function colorOpacity(
    color: CanonColor,
    stated: number | null,
    site: CanonSite,
    carried: boolean,
): number | null {
    if (!carried) {
        if (color.alpha < 1) {
            noteAt(site, STYLE_ISSUE.ALPHA_DROPPED, color.color);
        }
        return stated;
    }
    if (color.alpha === 1) {
        return stated;
    }
    return num6((stated ?? 1) * color.alpha);
}
