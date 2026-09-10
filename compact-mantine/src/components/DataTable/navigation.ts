import { type Direction, isRtl } from "../../utils/rtl";

// ARIA Authoring Practices, Grid pattern, "Keyboard interaction". The movement
// rules are kept here as a pure function so they can be tested without a DOM
// and without a virtualizer: the component owns focus and scrolling, this
// module owns only which cell comes next.

/**
 * The row index that means the header row rather than a row of data.
 *
 * Rows of data are numbered from zero through the rows currently on show, so
 * the header needs a number of its own that cannot collide with them.
 */
export const HEADER_ROW = -1;

/**
 * Which cell holds focus.
 */
export interface GridPosition {
    /** Which row, counting from zero through the rows on show, or {@link HEADER_ROW} for the header. */
    row: number;
    /** Which column, counting from zero through the columns currently visible. */
    column: number;
}

/**
 * How big the table is.
 */
export interface GridExtent {
    /** How many rows of data are on show. */
    rowCount: number;
    /** How many columns are visible. */
    columnCount: number;
}

/**
 * How big the table is, and how far one page of it reaches.
 */
export interface GridBounds extends GridExtent {
    /** How many rows Page Up and Page Down move by: as many as the scrolling area can show at once. */
    pageSize: number;
}

/**
 * The state of the modifier keys a movement key was pressed with.
 */
export interface GridModifiers {
    /** Whether Control or Command was held, which turns Home and End into whole-table moves. */
    jumpToEnd: boolean;
}

/**
 * Keeps a number inside a range.
 * @param value - The number to keep in range
 * @param min - The lowest allowed value
 * @param max - The highest allowed value
 * @returns The number, brought into range
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Works out which cell a movement key moves focus to.
 *
 * The moves are the ones the ARIA Authoring Practices give a grid: the arrow
 * keys move one cell, Home and End move to the ends of the row, Control with
 * them moves to the ends of the table, and Page Up and Page Down move by as
 * many rows as the scrolling area shows at once. The header row is one row
 * above the first row of data, so Arrow Up from the first row reaches the
 * column headers and Arrow Down leaves them again.
 *
 * The inline arrows follow the direction of the text: where text runs right to
 * left, so do the columns, and Arrow Right therefore moves towards the start of
 * the row rather than away from it.
 * @param current - Which cell holds focus now
 * @param key - The key that was pressed, as `KeyboardEvent.key` spells it
 * @param bounds - How big the table is, and how far one page of it reaches
 * @param direction - Which way the text runs
 * @param modifiers - Which modifier keys the press carried
 * @returns Which cell to move to, or undefined when the key moves nothing
 */
export function nextGridPosition(
    current: GridPosition,
    key: string,
    bounds: GridBounds,
    direction: Direction,
    modifiers: GridModifiers,
): GridPosition | undefined {
    const { rowCount, columnCount, pageSize } = bounds;
    const lastRow = rowCount - 1;
    const lastColumn = columnCount - 1;

    if (columnCount === 0) {
        return undefined;
    }

    // Where text runs right to left the columns are drawn right to left too, so
    // the key that points at the next column is the other one.
    const forward = isRtl(direction) ? "ArrowLeft" : "ArrowRight";
    const backward = isRtl(direction) ? "ArrowRight" : "ArrowLeft";

    if (key === forward) {
        return { row: current.row, column: Math.min(current.column + 1, lastColumn) };
    }

    if (key === backward) {
        return { row: current.row, column: Math.max(current.column - 1, 0) };
    }

    if (key === "ArrowDown") {
        return { row: clamp(current.row + 1, HEADER_ROW, lastRow), column: current.column };
    }

    if (key === "ArrowUp") {
        return { row: clamp(current.row - 1, HEADER_ROW, lastRow), column: current.column };
    }

    if (key === "Home") {
        // Control+Home reaches the very first cell of the table, which is the
        // first column header rather than the first row of data.
        return modifiers.jumpToEnd ? { row: HEADER_ROW, column: 0 } : { row: current.row, column: 0 };
    }

    if (key === "End") {
        return modifiers.jumpToEnd
            ? { row: Math.max(lastRow, HEADER_ROW), column: lastColumn }
            : { row: current.row, column: lastColumn };
    }

    if (key === "PageDown") {
        // Paging is a way of moving through the data, so it lands in the data
        // rather than on the headers even when it starts there.
        return { row: clamp(Math.max(current.row, 0) + pageSize, 0, Math.max(lastRow, 0)), column: current.column };
    }

    if (key === "PageUp") {
        return { row: clamp(Math.max(current.row, 0) - pageSize, 0, Math.max(lastRow, 0)), column: current.column };
    }

    return undefined;
}

/**
 * Brings a remembered focus position back into range.
 *
 * The position a table remembers outlives the rows it pointed at: a search
 * shortens the table, hiding a column narrows it, and the cell that held focus
 * may no longer exist. Rather than losing focus to the page, the table moves it
 * to the nearest cell that does exist.
 * @param position - The remembered position
 * @param bounds - How big the table is now
 * @returns A position that exists in the table as it stands
 */
export function clampGridPosition(position: GridPosition, bounds: GridExtent): GridPosition {
    const lastRow = bounds.rowCount - 1;
    const lastColumn = Math.max(bounds.columnCount - 1, 0);

    return {
        row: clamp(position.row, HEADER_ROW, Math.max(lastRow, HEADER_ROW)),
        column: clamp(position.column, 0, lastColumn),
    };
}

/**
 * Whether two focus positions point at the same cell.
 * @param a - One position
 * @param b - The other position
 * @returns True when both point at the same cell
 */
export function samePosition(a: GridPosition, b: GridPosition): boolean {
    return a.row === b.row && a.column === b.column;
}
