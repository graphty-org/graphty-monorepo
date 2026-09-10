import type { DataTableValue } from "./types";

// How a cell's value becomes text, and how two of them compare. Both live here
// rather than in the component because the search has to match what a reader
// can see: a cell drawn as "1,024" is found by typing "1,024", which only holds
// while one function decides both.

/**
 * The formatters and words one table draws its values with.
 */
export interface ValueFormat {
    /** Formats a number for the active locale. */
    number: Intl.NumberFormat;
    /** Formats a date for the active locale. */
    date: Intl.DateTimeFormat;
    /** How a value of true is written. */
    yes: string;
    /** How a value of false is written. */
    no: string;
}

/**
 * Writes a cell's value as text.
 *
 * This is both what an undrawn cell shows and what the search box looks in, so
 * a reader searching for what they can see finds it: a number is searched in
 * the grouped, locale-formatted spelling that is on the screen rather than in
 * the digits behind it.
 *
 * A missing value -- `null`, `undefined`, or a number that is not a number --
 * becomes an empty string, so a search never matches the word "null" and an
 * empty cell is empty rather than apologetic.
 * @param value - The value the column read out of the row
 * @param format - The formatters and words to write it with
 * @returns The value as text
 */
export function cellText(value: DataTableValue, format: ValueFormat): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? format.number.format(value) : "";
    }

    if (typeof value === "boolean") {
        return value ? format.yes : format.no;
    }

    return Number.isNaN(value.getTime()) ? "" : format.date.format(value);
}

/**
 * Whether a value counts as missing for sorting and searching.
 * @param value - The value the column read out of the row
 * @returns True when the row has no value for this column
 */
function isMissing(value: DataTableValue): boolean {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === "number") {
        return !Number.isFinite(value);
    }

    return value instanceof Date && Number.isNaN(value.getTime());
}

/**
 * Compares two of a column's values for sorting.
 *
 * Numbers compare as numbers rather than as text, so 9 comes before 10; dates
 * compare as instants; and text compares through the collator, which is what
 * puts the accented word where a reader of that language expects it instead of
 * after every unaccented one.
 *
 * Rows with no value for the column sort together at the ascending end, so
 * sorting a column ascending brings the empties to the top and sorting it
 * descending sends them to the bottom.
 * @param a - One row's value
 * @param b - The other row's value
 * @param collator - The comparator for the active locale
 * @returns A negative number when `a` sorts first, a positive number when `b` does, zero when neither
 */
export function compareValues(a: DataTableValue, b: DataTableValue, collator: Intl.Collator): number {
    const aMissing = isMissing(a);
    const bMissing = isMissing(b);

    if (aMissing || bMissing) {
        if (aMissing && bMissing) {
            return 0;
        }

        return aMissing ? -1 : 1;
    }

    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }

    if (typeof a === "boolean" && typeof b === "boolean") {
        if (a === b) {
            return 0;
        }

        return a ? 1 : -1;
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }

    return collator.compare(String(a), String(b));
}
