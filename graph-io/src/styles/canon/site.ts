/**
 * Where a raw value came from, so a canonicalizer can note a problem against the right target, property and element
 * and spend the work it costs from the extraction's one budget.
 */

import { STYLE_ISSUE } from "../codes.js";
import type { StyleNotes } from "../notes.js";
import type { StyleNoteCode, StyleTarget, StyleWorkBudget } from "../types.js";

/**
 * A number, color, enumeration or mapper expression longer than this many characters is not parsed: it is noted as
 * `W_STYLE_VALUE_TOO_LONG` and gives no value. Text is copied whatever its length.
 * @category Styles
 */
export const MAX_STYLE_VALUE_LENGTH = 256;

/**
 * Where a raw value is read: the notes it reports to, the target and property it is for, the element it belongs to
 * and the budget its work is spent from.
 * @category Styles
 */
export interface CanonSite {
    /** Where problems are noted. */
    readonly notes: StyleNotes;
    /** Nodes, edges or the graph. */
    readonly target: StyleTarget | "graph";
    /** The neutral property the value is for. */
    readonly property: string;
    /** The element the value belongs to, by index; absent for a rule's value. */
    readonly element?: number;
    /** The work budget; each value spends one operation plus one per character it reads. */
    readonly budget?: StyleWorkBudget;
}

/**
 * Notes a problem with a value at its site.
 * @param site - where the value was read
 * @param code - the condition
 * @param sample - the offending value
 */
export function noteAt(site: CanonSite, code: StyleNoteCode, sample: unknown): void {
    site.notes.add(code, site.target, site.property, { sample, element: site.element });
}

/**
 * Spends operations from the site's budget; graph values count as node work.
 * @param site - where the value was read
 * @param operations - the work
 */
export function spendAt(site: CanonSite, operations: number): void {
    site.budget?.spend(site.target === "graph" ? "node" : site.target, operations);
}

/**
 * The text of a raw scalar, untrimmed, after the length limit: null for an absent value (no note), and null with a
 * note for a value that is empty, too long, not finite or not a scalar. Spends at most 257 operations.
 * @param raw - the file's value
 * @param site - where it was read
 * @returns the value's text, or null
 */
export function scalarText(raw: unknown, site: CanonSite): string | null {
    spendAt(site, 1);
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === "number") {
        if (Number.isFinite(raw)) {
            return String(raw);
        }
        noteAt(site, STYLE_ISSUE.BAD_VALUE, String(raw));
        return null;
    }
    if (typeof raw !== "string") {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, typeof raw);
        return null;
    }
    if (raw.length > MAX_STYLE_VALUE_LENGTH) {
        noteAt(site, STYLE_ISSUE.VALUE_TOO_LONG, `${raw.length} characters`);
        return null;
    }
    spendAt(site, raw.length);
    if (raw.trim() === "") {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, raw);
        return null;
    }
    return raw;
}
