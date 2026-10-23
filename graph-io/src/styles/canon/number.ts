/**
 * Canonical numbers, lengths, opacities and booleans: 6 significant digits, never negative, never NaN or Infinity.
 */

import { STYLE_ISSUE } from "../codes.js";
import type { StyleDialect } from "../types.js";
import { type CanonSite, noteAt, scalarText, spendAt } from "./site.js";

/**
 * The largest length or factor a file may give; a larger one is noted as `W_STYLE_BAD_VALUE` and gives no value.
 * @category Styles
 */
export const MAX_STYLE_NUMBER = 1e6;

/**
 * Points per inch: DOT gives node sizes in inches, and a canonical length is in points (pixels at 72 dpi).
 * @category Styles
 */
export const DOT_POINTS_PER_INCH = 72;

/** One way to read a decimal number, so a long run of digits fails or passes in one pass. */
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * A number at 6 significant digits, with `-0` as `0`.
 * @param value - a finite number
 * @returns the canonical number
 * @category Styles
 */
export function num6(value: number): number {
    return Number(value.toPrecision(6)) + 0;
}

/**
 * A finite number from a number or a decimal string, or null with a note.
 * @param raw - the file's value
 * @param site - where it was read
 * @returns the number, or null
 */
function finite(raw: unknown, site: CanonSite): number | null {
    if (typeof raw === "boolean") {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, raw);
        return null;
    }
    const text = scalarText(raw, site);
    if (text === null) {
        return null;
    }
    const trimmed = text.trim();
    let value = Number.NaN;
    if (typeof raw === "number") {
        value = raw;
    } else if (DECIMAL.test(trimmed)) {
        value = Number(trimmed);
    }
    if (!Number.isFinite(value)) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, text);
        return null;
    }
    return value;
}

/**
 * A length or factor: a finite number at least 0 and at most `MAX_STYLE_NUMBER` after multiplying by `factor`, at 6
 * significant digits. Anything else is null with a `W_STYLE_BAD_VALUE` note.
 * @param raw - the file's value: a number or a decimal string
 * @param site - where it was read
 * @param factor - multiplies the value first (`DOT_POINTS_PER_INCH` for DOT sizes); defaults to 1
 * @returns the canonical number, or null
 * @category Styles
 */
export function canonNumber(raw: unknown, site: CanonSite, factor = 1): number | null {
    const value = finite(raw, site);
    if (value === null) {
        return null;
    }
    const scaled = value * factor;
    if (!(scaled >= 0 && scaled <= MAX_STYLE_NUMBER)) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, typeof raw === "string" ? raw : String(raw));
        return null;
    }
    return num6(scaled);
}

/**
 * A signed number (an offset): any finite value within the largest a style number may be, either way.
 * @param raw - the file's value
 * @param site - where it was read
 * @returns the canonical number, or null (noted)
 * @category Styles
 */
export function canonSigned(raw: unknown, site: CanonSite): number | null {
    const value = finite(raw, site);
    if (value === null) {
        return null;
    }
    if (Math.abs(value) > MAX_STYLE_NUMBER) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, typeof raw === "string" ? raw : String(raw));
        return null;
    }
    return num6(value);
}

/**
 * An opacity from 0 to 1. Cytoscape desktop states opacities from 0 to 255 and is divided by 255; every other
 * dialect states 0 to 1. A value outside the dialect's range is null with a `W_STYLE_BAD_VALUE` note.
 * @param raw - the file's value
 * @param dialect - the file's dialect
 * @param site - where it was read
 * @returns the canonical opacity, or null
 * @category Styles
 */
export function canonOpacity(raw: unknown, dialect: StyleDialect, site: CanonSite): number | null {
    const value = finite(raw, site);
    if (value === null) {
        return null;
    }
    const top = dialect === "cytoscape" ? 255 : 1;
    if (!(value >= 0 && value <= top)) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, typeof raw === "string" ? raw : String(raw));
        return null;
    }
    return num6(value / top);
}

/** Boolean spellings, lowercase. */
const BOOLEANS: ReadonlyMap<string, boolean> = new Map([
    ["true", true],
    ["yes", true],
    ["on", true],
    ["1", true],
    ["false", false],
    ["no", false],
    ["off", false],
    ["0", false],
]);

/**
 * A boolean from `true`/`false`, `yes`/`no`, `on`/`off` or `1`/`0` in any case; anything else is null with a note.
 * @param raw - the file's value
 * @param site - where it was read
 * @returns the boolean, or null
 * @category Styles
 */
export function canonBoolean(raw: unknown, site: CanonSite): boolean | null {
    if (typeof raw === "boolean") {
        spendAt(site, 1);
        return raw;
    }
    const text = scalarText(raw, site);
    if (text === null) {
        return null;
    }
    const value = BOOLEANS.get(text.trim().toLowerCase());
    if (value === undefined) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, text);
        return null;
    }
    return value;
}

/**
 * The unit of a dialect's lengths: GEXF and Pajek give size factors relative to their tool's normal size, every
 * other dialect gives pixels (after DOT's inches are converted).
 * @param dialect - the file's dialect
 * @returns `"relative"` or `"px"`
 * @category Styles
 */
export function styleLengthUnit(dialect: StyleDialect): "px" | "relative" {
    return dialect === "gexf" || dialect === "dvips" ? "relative" : "px";
}
