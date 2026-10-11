/**
 * A Cytoscape.js stylesheet written as text (`node { background-color: red; } edge[w > 2] { width: 4 }`), read the
 * way Cytoscape.js 3.34's `appendFromString` reads it, in linear passes instead of its backtracking patterns:
 *
 * - comments `/* ... *\/` holding at least one character are removed first;
 * - each block is the text before the first `{` (the selector) and the text up to the next `}` (the properties);
 *   an empty block takes the `}` and runs to the next one;
 * - a block whose selector Cytoscape.js rejects is skipped; text with no further block stops the reading;
 * - each property is `name: value` ending at `;` or at the end of the block, on one line; a property name is
 *   taken as written (no camel case), and a block with a property that does not have this shape stops the reading.
 */

import { parseCyjsSelector } from "./selector.js";

/** One block of a stylesheet: its selector and its properties in order. */
export interface CyjsSheetEntry {
    /** The selector as written. */
    readonly selector: unknown;
    /** `[name, value]` in order. */
    readonly properties: readonly (readonly [string, unknown])[];
    /** Whether property names are taken as written (text) or camel case is also read (JSON). */
    readonly dashOnly: boolean;
}

/** Why reading a text stylesheet stopped early, or null. */
type CyjsSheetStop = "NO_BLOCK" | "BAD_PROPERTY" | null;

/** Line terminators, which `.` in Cytoscape.js's patterns does not match. */
const LINE = /[\n\r\u2028\u2029]/;
const SPACE = /\s/;

/**
 * Removes the comments Cytoscape.js removes: `/*`, at least one character, `*\/`.
 * @param text - the stylesheet
 * @returns the text without comments
 */
function stripComments(text: string): string {
    let out = "";
    let from = 0;
    for (;;) {
        const open = text.indexOf("/*", from);
        if (open < 0) {
            break;
        }
        const close = text.indexOf("*/", open + 3);
        if (close < 0) {
            break;
        }
        out += text.slice(from, open);
        from = close + 2;
    }
    return out + text.slice(from);
}

/**
 * The end of a run of whitespace.
 * @param s - the text
 * @param i - the start
 * @returns the first position that is not whitespace
 */
function skipSpace(s: string, i: number): number {
    let j = i;
    while (j < s.length && SPACE.test(s[j])) {
        j++;
    }
    return j;
}

/**
 * The text with trailing whitespace removed.
 * @param s - the text
 * @returns the text
 */
function trimEnd(s: string): string {
    let e = s.length;
    while (e > 0 && SPACE.test(s[e - 1])) {
        e--;
    }
    return s.slice(0, e);
}

/**
 * One `name: value` of a block, starting at `from`.
 * @param block - the block's text
 * @param from - where the remaining text starts
 * @param next - for each position, the first position at or after it that is not whitespace
 * @returns the name, the value and where the remaining text starts after it, or null
 */
function readProperty(
    block: string,
    from: number,
    next: Int32Array,
): { name: string; value: string; end: number } | null {
    const len = block.length;
    const lead = next[from];
    // the name: at least one character on one line, up to the first ':' after it
    const colon = block.indexOf(":", lead + 1);
    if (colon < 0) {
        return null;
    }
    const name = trimEnd(block.slice(lead, colon));
    if (name === "" || LINE.test(name)) {
        return null;
    }
    // the value: at least one character on one line, ending where only whitespace precedes ';' or the end
    const start = next[colon + 1];
    for (let e = start + 1; e <= len; e++) {
        if (LINE.test(block[e - 1])) {
            break;
        }
        const nn = next[e];
        if (nn >= len) {
            return { name, value: block.slice(start, e), end: len };
        }
        if (block[nn] === ";") {
            return { name, value: block.slice(start, e), end: nn + 1 };
        }
    }
    // only whitespace after the colon: a whitespace character on the line is the value
    if (start >= len) {
        for (let i = colon + 1; i < len; i++) {
            if (!LINE.test(block[i])) {
                return { name, value: block[i], end: len };
            }
        }
    }
    return null;
}

/**
 * For each position of a text, the first position at or after it that is not whitespace.
 * @param s - the text
 * @returns the table (length + 1 entries)
 */
function nextNonSpace(s: string): Int32Array {
    const next = new Int32Array(s.length + 1);
    next[s.length] = s.length;
    for (let i = s.length - 1; i >= 0; i--) {
        next[i] = SPACE.test(s[i]) ? next[i + 1] : i;
    }
    return next;
}

/**
 * Reads a text stylesheet into blocks the way Cytoscape.js does.
 * @param text - the stylesheet
 * @returns the blocks Cytoscape.js keeps, in order, and why reading stopped early (or null)
 */
export function parseCyjsStylesheetText(text: string): { entries: CyjsSheetEntry[]; stop: CyjsSheetStop } {
    const s = stripComments(text);
    const entries: CyjsSheetEntry[] = [];
    let pos = 0;
    while (skipSpace(s, pos) < s.length) {
        const lead = skipSpace(s, pos);
        // the selector: the text before the first '{' that leaves it at least one character
        let open = s.indexOf("{", lead + 1);
        let selStart = lead;
        if (s[lead] === "{") {
            if (lead > pos) {
                // the leading whitespace gives its last character to the selector
                selStart = lead - 1;
                open = lead;
            }
        }
        if (open < 0) {
            return { entries, stop: "NO_BLOCK" };
        }
        // the block: at least one character, up to the next '}'
        const close = s.indexOf("}", open + 2);
        if (close < 0) {
            return { entries, stop: "NO_BLOCK" };
        }
        const selector = trimEnd(s.slice(selStart, open));
        const block = s.slice(open + 1, close);
        pos = close + 1;
        if (selector !== "core" && parseCyjsSelector(selector).invalid) {
            continue;
        }
        const properties: [string, unknown][] = [];
        const next = nextNonSpace(block);
        let from = 0;
        let bad = false;
        while (next[from] < block.length) {
            const p = readProperty(block, from, next);
            if (p === null) {
                bad = true;
                break;
            }
            properties.push([p.name, p.value]);
            from = p.end;
        }
        if (bad) {
            return { entries, stop: "BAD_PROPERTY" };
        }
        entries.push({ selector, properties, dashOnly: true });
    }
    return { entries, stop: null };
}
