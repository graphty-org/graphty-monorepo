/**
 * XGMML attribute types and values (`research-xgmml.md` sections 3.6, 3.8 and 4.3): which kind an
 * `<att>` declares (Cytoscape's `cy:type` before the draft's `type`, case-insensitively), and the
 * lexical rules of each kind as Cytoscape writes them. A value that does not parse is never
 * guessed at: the caller records E_BAD_VALUE and leaves the cell unset.
 */

import { type AttRec } from "./document.js";

/** The scalar kinds of a column, in widening order (string beats everything). */
export type ScalarKind = "bool" | "int" | "long" | "real" | "string";

/** What one att declares. */
export type DeclaredKind = ScalarKind | "list" | "map";

/** The declared kind of an att and the type text to keep in `origin.type`. */
export interface AttType {
    /** The kind. */
    readonly kind: DeclaredKind;
    /** The type as declared (`cy:type` when given, else `type`), or null for an untyped att. */
    readonly declared: string | null;
    /** The type text no kind matched (kept as text, W_UNKNOWN_ATTR_TYPE), or null. */
    readonly unknown: string | null;
}

/** Cytoscape's `cy:type` names (3.3+), lower-cased. */
const CY_TYPES: Readonly<Record<string, DeclaredKind>> = {
    string: "string",
    double: "real",
    integer: "int",
    long: "long",
    boolean: "bool",
    list: "list",
};

/** The XGMML draft's types, Cytoscape's `boolean` and the 2.x `map`, lower-cased. */
const XGMML_TYPES: Readonly<Record<string, DeclaredKind>> = {
    string: "string",
    real: "real",
    integer: "int",
    boolean: "bool",
    list: "list",
    map: "map",
};

/**
 * The kind an att declares: `cy:type` first, then `type`, both case-insensitive; no type is a
 * string; an unknown type is a string the caller reports. A numeric att whose name ends in
 * `.SUID` is a long (Cytoscape keeps SUID references as Long).
 * @param att - the att
 * @returns the declared kind
 */
export function attType(att: AttRec): AttType {
    let kind: DeclaredKind | undefined;
    let declared: string | null = null;
    if (att.cyType !== null && att.cyType.length > 0) {
        kind = CY_TYPES[att.cyType.trim().toLowerCase()];
        declared = att.cyType;
    }
    if (kind === undefined && att.type !== null && att.type.length > 0) {
        kind = XGMML_TYPES[att.type.trim().toLowerCase()];
        declared = att.type;
    }
    if (kind === undefined) {
        const unknown = declared ?? null;
        return { kind: "string", declared, unknown };
    }
    if ((kind === "int" || kind === "real") && att.name?.endsWith(".SUID") === true) {
        kind = "long";
    }
    return { kind, declared, unknown: null };
}

/**
 * The scalar kind a list element type names (`cy:elementType`), or null when it names none.
 * @param text - the element type text
 * @returns the kind, or null
 */
export function elementKind(text: string | null): ScalarKind | null {
    if (text === null) {
        return null;
    }
    const kind = CY_TYPES[text.trim().toLowerCase()] ?? XGMML_TYPES[text.trim().toLowerCase()];
    return kind === undefined || kind === "list" || kind === "map" ? null : kind;
}

/**
 * The wider of two scalar kinds (design section 5.1): int and long widen to long, any two numbers
 * to real, a boolean and a number to string, anything and a string to string.
 * @param a - one kind
 * @param b - the other
 * @returns the kind both fit
 */
export function widenScalar(a: ScalarKind, b: ScalarKind): ScalarKind {
    if (a === b) {
        return a;
    }
    if (a === "string" || b === "string" || a === "bool" || b === "bool") {
        return "string";
    }
    if (a === "real" || b === "real") {
        return "real";
    }
    return "long";
}

const INTEGER_TEXT = /^[+-]?[0-9]+$/;

/** Java's Double.valueOf forms that Cytoscape writes: no hex, no `d` / `f` suffix. */
const REAL_TEXT = /^[+-]?(NaN|Infinity|([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?)$/;

const I32_MIN = -2147483648;
const I32_MAX = 2147483647;

/** A parsed scalar and what parsing it found. */
export interface ParsedScalar {
    /** The value. */
    readonly value: boolean | number | string;
    /** An integer beyond i32 (the column widens), or a long / real beyond what a double holds exactly. */
    readonly overflow?: "i32" | "precision" | undefined;
}

/**
 * Parse one value text by its declared scalar kind. Numbers and booleans are trimmed; strings
 * never are. Booleans accept 1 / 0 / true / false / yes / no in any case.
 * @param text - the value text
 * @param kind - the declared kind
 * @param unescape - decode Cytoscape's two-character `\n` and `\t` in strings
 * @returns the value, or null when the text does not parse as the kind
 */
export function parseScalar(text: string, kind: ScalarKind, unescape: boolean): ParsedScalar | null {
    switch (kind) {
        case "string":
            return { value: unescape ? unescapeCytoscape(text) : text };
        case "bool": {
            const t = text.trim().toLowerCase();
            if (t === "1" || t === "true" || t === "yes") {
                return { value: true };
            }
            if (t === "0" || t === "false" || t === "no") {
                return { value: false };
            }
            return null;
        }
        case "int":
        case "long": {
            const t = text.trim();
            if (!INTEGER_TEXT.test(t)) {
                return null;
            }
            const n = Number(t);
            if (kind === "int" && (n < I32_MIN || n > I32_MAX)) {
                return { value: n, overflow: Number.isSafeInteger(n) ? "i32" : "precision" };
            }
            return { value: n, overflow: Number.isSafeInteger(n) ? undefined : "precision" };
        }
        case "real": {
            const t = text.trim();
            if (!REAL_TEXT.test(t)) {
                return null;
            }
            const n = Number(t);
            // only a finite spelling that overflows (1e400) loses precision; NaN and the infinities are exact
            const overflow = !Number.isFinite(n) && !/Infinity|NaN/.test(t) ? "precision" : undefined;
            return { value: n, overflow };
        }
        default: {
            const name: never = kind;
            throw new Error(`unknown scalar kind ${String(name)}`);
        }
    }
}

/**
 * Decode the two-character escapes the Cytoscape writer uses for newline and tab.
 * @param text - the text
 * @returns the text with `\n` and `\t` decoded
 */
export function unescapeCytoscape(text: string): string {
    return text.includes("\\") ? text.replace(/\\t/g, "\t").replace(/\\n/g, "\n") : text;
}
