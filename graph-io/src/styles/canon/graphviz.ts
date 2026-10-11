/**
 * Graphviz's own color resolution, measured against `dot` 2.43 with `-Txdot`:
 *
 * - Leading blanks are skipped and trailing ones are not (`"red  "` is unknown); names match without regard to case
 *   and keep their inner spaces (`Light Grey` is unknown).
 * - `#rrggbb` and `#rrggbbaa` only, with anything after the digits ignored; there is no 3-digit form.
 * - Three numbers starting with a digit or a point (`.5 .5 .5`, `0.5,0.5,0.5`) are hue, saturation and value, each
 *   clamped to 0..1 and truncated to a byte; a fourth number and anything after it are ignored. A leading sign makes
 *   the value a name, so `-0.5 0.5 0.5` is unknown.
 * - `/scheme/name` names a scheme for one value and `//name` means the object's scheme; scheme names ignore case. A
 *   scheme other than `x11` is searched INSTEAD of X11: `colorscheme=blues9` makes `red` unknown, and an unknown
 *   scheme knows no names at all.
 * - `transparent`, `none` and `invis` are `#fffffe` with alpha 0, whatever the scheme.
 * - An unknown color is drawn BLACK.
 * - A color list (`red:blue`, `red;0.3:blue`): an outline or a font color draws the text before the first `:` as one
 *   color, so `red:blue` is red and `red;0.3:blue` is black (`red;0.3` is not a color). A fill draws a gradient and
 *   an edge draws one line per color; both start with the first entry's color, its `;fraction` dropped. A value
 *   with a `;` and no `:` is not a list: it is one unknown color, drawn black.
 */

import { BREWER_SCHEMES, CSS_COLORS, X11_COLORS } from "./color-tables.js";

/**
 * How Graphviz draws a color value, which decides how a color list is read.
 * @category Styles
 */
export type GraphvizColorUse = "line" | "fill" | "edge";

/**
 * A resolved Graphviz color, with how it was read.
 * @category Styles
 */
export interface GraphvizColor {
    /** `#rrggbb`. */
    readonly hex: string;
    /** 0..1. */
    readonly alpha: number;
    /** The value did not resolve, so Graphviz draws black. */
    readonly unknown: boolean;
    /** The value is a list read as its first color: a gradient for a fill, parallel lines for an edge. */
    readonly list: "gradient" | "lines" | null;
}

const TRANSPARENT = new Set(["transparent", "none", "invis"]);
const HSV_PART = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * A byte as two hex digits.
 * @param v - 0..255
 * @returns two lowercase hex digits
 */
function hex2(v: number): string {
    return v.toString(16).padStart(2, "0");
}

/**
 * Graphviz's HSV to RGB, channels truncated to bytes.
 * @param h - hue 0..1
 * @param s - saturation 0..1
 * @param v - value 0..1
 * @returns `#rrggbb`
 */
function hsvHex(h: number, s: number, v: number): string {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const rgb = [
        [v, t, p],
        [q, v, p],
        [p, v, t],
        [p, q, v],
        [t, p, v],
        [v, p, q],
    ][i % 6];
    return `#${rgb.map((c) => hex2(Math.trunc(c * 255))).join("")}`;
}

/**
 * Resolves one Graphviz color (no list), or null when Graphviz does not know it.
 * @param text - the color, leading blanks already skipped
 * @param scheme - the object's color scheme, lowercase, `x11` when unset
 * @returns hex and alpha, or null
 */
function resolveOne(text: string, scheme: string): { hex: string; alpha: number } | null {
    if (text.startsWith("#")) {
        const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{1,2})?/.exec(text);
        if (m === null) {
            return null;
        }
        return {
            hex: `#${m[1]}${m[2]}${m[3]}`.toLowerCase(),
            alpha: m[4] === undefined ? 1 : Number.parseInt(m[4], 16) / 255,
        };
    }
    if (/^[.\d]/.test(text)) {
        const parts = text.split(/[ ,]+/);
        if (parts.length >= 3 && parts.slice(0, 3).every((p) => HSV_PART.test(p))) {
            const [h, s, v] = parts.slice(0, 3).map((p) => Math.min(1, Math.max(0, Number(p))));
            return { hex: hsvHex(h, s, v), alpha: 1 };
        }
    }
    let name = text.toLowerCase();
    let sc = scheme;
    if (name.startsWith("/")) {
        const slash = name.indexOf("/", 1);
        if (slash < 0) {
            return null;
        }
        const prefix = name.slice(1, slash);
        name = name.slice(slash + 1);
        if (prefix !== "") {
            sc = prefix;
        }
    }
    if (TRANSPARENT.has(name)) {
        return { hex: "#fffffe", alpha: 0 };
    }
    let hex: string | undefined;
    if (sc === "x11") {
        hex = X11_COLORS.get(name);
    } else if (sc === "svg") {
        hex = CSS_COLORS.get(name);
    } else {
        const colors = BREWER_SCHEMES.get(sc);
        const index = /^\d{1,3}$/.test(name) ? Number(name) : 0;
        hex = colors !== undefined && index >= 1 ? colors[index - 1] : undefined;
    }
    return hex === undefined ? null : { hex, alpha: 1 };
}

/**
 * Resolves a Graphviz color value the way Graphviz draws it for a use; an unknown color is black.
 * @param raw - the value, at most 256 characters
 * @param scheme - the object's `colorscheme`, or null
 * @param use - an outline or font color (`line`), a fill, or an edge's line color
 * @returns the color and how it was read
 * @category Styles
 */
export function graphvizColor(raw: string, scheme: string | null, use: GraphvizColorUse): GraphvizColor {
    let text = raw.replace(/^[ \t\r\n]+/, "");
    let list: GraphvizColor["list"] = null;
    const colon = text.indexOf(":");
    if (colon >= 0) {
        text = text.slice(0, colon);
        if (use !== "line") {
            const semi = text.indexOf(";");
            if (semi >= 0) {
                text = text.slice(0, semi);
            }
            list = use === "fill" ? "gradient" : "lines";
        }
    }
    const sc = scheme === null || scheme.trim() === "" ? "x11" : scheme.toLowerCase();
    const resolved = text === "" ? null : resolveOne(text, sc);
    return resolved === null
        ? { hex: "#000000", alpha: 1, unknown: true, list }
        : { hex: resolved.hex, alpha: resolved.alpha, unknown: false, list };
}
