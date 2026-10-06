/**
 * The two spellings of an integer node id.
 *
 * A node id read from a URL, a form field or a table cell is a string even when the graph holds
 * the number, so every lookup by id accepts either spelling of an integer: `"34"` finds node `34`
 * and `34` finds node `"34"`. This is the one place that rule is written; `DataManager.getNode`
 * and the session's `positions.pin` both read it.
 */

/** A string that spells an integer, and nothing else. */
const INTEGER_ID = /^-?\d+$/;

/**
 * The other spelling of an integer id.
 * @param id - The id as the caller wrote it.
 * @returns `34` for `"34"`, `"34"` for `34`, or undefined for an id that does not spell an integer.
 */
export function otherIdSpelling(id: string | number): string | number | undefined {
    if (typeof id === "string") {
        return INTEGER_ID.test(id) ? Number.parseInt(id, 10) : undefined;
    }

    return Number.isInteger(id) ? String(id) : undefined;
}
