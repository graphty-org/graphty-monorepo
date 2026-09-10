import type { DataTableSelectionMode } from "./types";

// Section 1.2 of the hardening contract: plain click selects, Shift extends,
// Command or Control toggles. The algebra is kept here as a pure function so
// the semantics can be tested without a DOM, and so the same rules serve a
// pointer gesture, a Shift+Arrow keyboard extension and a Ctrl+A select-all.
//
// TanStack Table's own row.getToggleSelectedHandler() is checkbox semantics --
// every activation toggles one row, and Shift extends from the last row the
// handler saw. That is right for a column of checkboxes and wrong for a list
// where clicking a row means "this row, and only this row", so the gesture
// rules are ours and only the resulting state is handed back to the table.

/**
 * Which modifier keys an activation carried.
 */
export interface SelectionModifiers {
    /** Whether Shift was held: extend the selection from the anchor to here. */
    extend: boolean;
    /** Whether Command or Control was held: add this row to the selection, or take it out. */
    toggle: boolean;
}

/**
 * Everything the selection rules need to know about one activation.
 */
export interface SelectionGesture {
    /** Every row currently on show, by identifier, in the order they are drawn. */
    ids: readonly string[];
    /** Which row was activated, as a position in `ids`. */
    index: number;
    /** Which rows are selected now. */
    selected: readonly string[];
    /**
     * The row a range extends from: the last row a plain or toggling
     * activation landed on. Undefined before the first activation.
     */
    anchor: string | undefined;
    /** Which modifier keys the activation carried. */
    modifiers: SelectionModifiers;
    /** How many rows may be selected at once. */
    mode: DataTableSelectionMode;
}

/**
 * What one activation leaves behind.
 */
export interface SelectionResult {
    /** Which rows are selected now, in the order they are drawn. */
    selected: string[];
    /** The row a later range should extend from. */
    anchor: string | undefined;
}

/**
 * Returns the identifiers between two positions, inclusive, in drawn order.
 * @param ids - Every row currently on show, in the order they are drawn
 * @param from - One end of the range, as a position in `ids`
 * @param to - The other end of the range, as a position in `ids`
 * @returns The identifiers of every row in the range
 */
function rangeOf(ids: readonly string[], from: number, to: number): string[] {
    const first = Math.min(from, to);
    const last = Math.max(from, to);
    return ids.slice(first, last + 1);
}

/**
 * Puts a set of identifiers back into the order the rows are drawn in.
 *
 * A selection is reported in drawn order rather than in the order the rows were
 * clicked, so that a consumer can hand it straight to something that reads down
 * the list. Identifiers that are not on show -- rows a search has hidden, or
 * rows that have since left the data -- keep their places at the front, so a
 * search does not quietly discard a selection made before it.
 * @param selected - The identifiers to order
 * @param ids - Every row currently on show, in the order they are drawn
 * @returns The identifiers, in drawn order
 */
function inDrawnOrder(selected: Iterable<string>, ids: readonly string[]): string[] {
    const wanted = new Set(selected);
    const ordered: string[] = [];

    for (const id of wanted) {
        if (!ids.includes(id)) {
            ordered.push(id);
        }
    }

    for (const id of ids) {
        if (wanted.has(id)) {
            ordered.push(id);
        }
    }

    return ordered;
}

/**
 * Works out what a selection gesture leaves selected.
 *
 * The rules are the ones every desktop list has used for thirty years, and a
 * reader brings them with them:
 *
 * - a plain activation selects the row and nothing else;
 * - Shift extends from the anchor -- the row the last plain or toggling
 *   activation landed on -- to this row, replacing the selection;
 * - Command or Control adds this row to the selection, or takes it out again;
 * - Shift together with Command or Control adds the whole range to the
 *   selection instead of replacing it.
 *
 * A table that allows only one selected row ignores the modifiers, and a table
 * that allows none is left alone entirely.
 * @param gesture - The activation, the rows on show, and what is selected now
 * @returns What is selected now, and the row a later range should extend from
 */
export function applySelectionGesture(gesture: SelectionGesture): SelectionResult {
    const { ids, index, selected, anchor, modifiers, mode } = gesture;
    const id = ids[index];

    if (mode === "none" || id === undefined) {
        return { selected: [...selected], anchor };
    }

    if (mode === "single") {
        return { selected: [id], anchor: id };
    }

    const anchorIndex = anchor === undefined ? -1 : ids.indexOf(anchor);

    if (modifiers.extend && anchorIndex !== -1) {
        const range = rangeOf(ids, anchorIndex, index);

        // Shift on its own replaces the selection with the range, which is what
        // makes a mistaken range correctable by dragging Shift back the other
        // way. Shift with Command or Control adds the range instead, which is
        // how a second run of rows joins a first.
        const next = modifiers.toggle ? inDrawnOrder([...selected, ...range], ids) : range;

        // The anchor deliberately does not move: extending again from the same
        // anchor is how a range is grown and shrunk.
        return { selected: next, anchor };
    }

    if (modifiers.toggle) {
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }

        return { selected: inDrawnOrder(next, ids), anchor: id };
    }

    return { selected: [id], anchor: id };
}

/**
 * Works out what selecting every row on show leaves selected.
 *
 * Rows a search has hidden are neither selected nor deselected: a select-all
 * means the rows a person can see, and silently selecting rows they cannot see
 * is how a bulk action goes wrong.
 * @param ids - Every row currently on show, in the order they are drawn
 * @param selected - Which rows are selected now
 * @param mode - How many rows may be selected at once
 * @returns What is selected now, and the row a later range should extend from
 */
export function selectAll(
    ids: readonly string[],
    selected: readonly string[],
    mode: DataTableSelectionMode,
): SelectionResult {
    if (mode !== "multiple") {
        return { selected: [...selected], anchor: undefined };
    }

    return { selected: inDrawnOrder([...selected, ...ids], ids), anchor: ids[0] };
}
