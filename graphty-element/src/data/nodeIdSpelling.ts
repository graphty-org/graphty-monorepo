/**
 * The two spellings of an integer node or edge id.
 *
 * A node id read from a URL, a form field or a table cell is a string even when the graph holds
 * the number, so every lookup by id accepts either spelling of an integer: `"34"` finds node `34`
 * and `34` finds node `"34"`. An edge id is the text `"17"`, so `17` finds it too. Only canonical
 * safe integers have two spellings: `"034"`, `"-0"`, `" 34"`, `"1e0"`, `"0x1"`, `"34.0"` and
 * anything beyond `Number.MAX_SAFE_INTEGER` name only themselves. This is the one place that rule
 * is written; every node and edge lookup a consumer can reach reads it.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

/** A string that is the canonical printing of an integer: no sign on zero, no leading zeros. */
const CANONICAL_INTEGER = /^(?:0|-?[1-9]\d*)$/;

/**
 * The other spelling of an integer id.
 * @param id - The id as the caller wrote it.
 * @returns `34` for `"34"`, `"34"` for `34`, or undefined for an id that is not a canonical safe
 * integer.
 */
export function otherIdSpelling(id: string | number): string | number | undefined {
    if (typeof id === "string") {
        const value = Number(id);
        return CANONICAL_INTEGER.test(id) && Number.isSafeInteger(value) ? value : undefined;
    }

    return Number.isSafeInteger(id) ? String(id) : undefined;
}

/**
 * The row of an id named in either spelling of an integer. The exact id always wins, so a graph
 * holding both `34` and `"34"` answers each by its own row.
 * @param ids - An id map: a snapshot's `ids`, or anything with the same `indexOf`.
 * @param ids.indexOf - The row of an id, or `INVALID_INDEX` when the map holds no such id.
 * @param id - The id, as the caller wrote it.
 * @returns The row, or `INVALID_INDEX` when the map holds neither spelling.
 */
export function rowOfEitherSpelling(ids: { indexOf(id: string | number): number }, id: string | number): number {
    const row = ids.indexOf(id);
    const other = row === INVALID_INDEX ? otherIdSpelling(id) : undefined;
    return other === undefined ? row : ids.indexOf(other);
}
