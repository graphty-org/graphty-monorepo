import type React from "react";

import type { ActivationEvent, ActivationMeta, ChangeHandler } from "../../types/events";
import type { DataTableLabels } from "./labels";

/**
 * A value a column reads out of a row.
 *
 * The table sorts, searches and draws a cell from this value, so it is the one
 * thing every column has to supply. Anything a person should be able to read or
 * search for belongs here; anything that is only a drawing -- a swatch, a
 * sparkline, a badge -- belongs in the column's `cell` instead, with the value
 * behind it still returned from here so the row stays sortable and searchable.
 *
 * `null` and `undefined` both mean "this row has no value for this column".
 * They sort together at the ascending end and are never matched by a search.
 */
export type DataTableValue = string | number | boolean | Date | null | undefined;

/**
 * How a column's contents line up.
 *
 * These are logical, not physical: `"end"` is the right edge where text runs
 * left to right and the left edge where it runs right to left. Numbers read
 * best aligned to the end, so a reader can compare digits down the column.
 */
export type DataTableAlign = "start" | "end";

/**
 * One column of a data table.
 * @example
 * ```tsx
 * const columns: DataTableColumn<Node>[] = [
 *     {id: "name", header: "Node", value: (node) => node.id},
 *     {id: "degree", header: "Links", value: (node) => node.degree, align: "end"},
 * ];
 * ```
 */
export interface DataTableColumn<TRow extends object> {
    /**
     * A stable identifier for this column, unique within the table.
     *
     * It is what the sort order, the hidden-column list and the column order
     * are written in terms of, so keep it stable across renders and across
     * releases of your own app: a saved column arrangement is stored under
     * these strings.
     */
    id: string;
    /** The column's name, drawn in the header row and read out as the header's accessible name. */
    header: string;
    /**
     * Reads this column's value out of a row.
     *
     * Called for sorting, for searching and -- unless the column also supplies
     * a `cell` -- for drawing. Keep it cheap and free of side effects: a table
     * of ten thousand rows calls it once per row per sort.
     */
    value: (row: TRow) => DataTableValue;
    /**
     * Draws the cell, when the value alone is not the drawing.
     *
     * Leave it out and the cell shows the value: text as it stands, numbers
     * formatted for the active locale, dates in the locale's own short form.
     * Supply it for a swatch, a chip, a unit suffix or anything else with a
     * shape. Sorting and searching still use `value`, so a drawn cell stays
     * sortable.
     */
    cell?: (row: TRow) => React.ReactNode;
    /** How wide the column is drawn, in pixels. Defaults to the width of one field in a property panel. */
    width?: number;
    /** How the column's contents line up. Defaults to `"start"`; use `"end"` for numbers. */
    align?: DataTableAlign;
    /** Whether the column's header sorts the table. Defaults to `true`. */
    sortable?: boolean;
    /**
     * Whether the first activation of this column's header sorts it descending
     * rather than ascending.
     *
     * Left out, the table decides from the data: a column of words starts
     * ascending, because A-to-Z is what a reader expects of a name, and a
     * column of numbers starts descending, because the largest is what a
     * reader is usually looking for.
     */
    descendingFirst?: boolean;
    /** Whether the search box looks in this column. Defaults to `true`. */
    filterable?: boolean;
    /** Whether this column may be hidden. Defaults to `true`. */
    hideable?: boolean;
}

/**
 * One column of a sort order.
 */
export interface DataTableSort {
    /** Which column is sorted, by its `id`. */
    id: string;
    /** Whether the column is sorted descending. */
    desc: boolean;
}

/**
 * How many rows may be selected at once.
 *
 * - `"multiple"` is the usual reading of a list: a plain click replaces the
 *   selection, Shift extends it, and Control or Command adds and removes one
 *   row.
 * - `"single"` keeps exactly one row selected and ignores the modifier keys.
 * - `"none"` makes the rows unselectable. They stay reachable from the
 *   keyboard, because a person still has to be able to read them.
 */
export type DataTableSelectionMode = "none" | "single" | "multiple";

/**
 * Called when a row is activated, by a click or from the keyboard.
 *
 * The row comes first, because a table draws its own rows and a consumer
 * therefore has no other way to tell which one this is. The event is second, so
 * modifier keys, `preventDefault` and the target are all still reachable, and
 * the activation source is third: selection semantics differ between a pointer,
 * which carries a click count and modifiers, and a key, which does not.
 */
export type DataTableRowHandler<TRow extends object> = (
    row: TRow,
    event: ActivationEvent,
    meta: ActivationMeta,
) => void;

/**
 * Called when a row is double-clicked or asked for a context menu.
 *
 * The row comes first for the same reason it does on
 * {@link DataTableRowHandler}: the table draws the rows, so the consumer has no
 * other way to tell which one this is.
 */
export type DataTableRowMouseHandler<TRow extends object> = (row: TRow, event: React.MouseEvent) => void;

/**
 * The handful of things a data table can be asked to do from outside.
 *
 * Reach for it through a `ref` when the table keeps its own column arrangement
 * -- a table given `defaultHiddenColumns` rather than `hiddenColumns` -- and
 * something outside it, such as your own columns menu, has to change that
 * arrangement. A table whose arrangement you pass in as props needs none of
 * this: set the props instead.
 * @example
 * ```tsx
 * const grid = useRef<DataTableHandle>(null);
 * <DataTable ref={grid} columns={columns} data={rows} defaultHiddenColumns={["notes"]} />
 * <ActionRow label="Show notes" onClick={() => { grid.current?.setColumnHidden("notes", false); }} />
 * ```
 */
export interface DataTableHandle {
    /**
     * Scrolls a row into view, counting from zero through the rows currently on
     * show -- that is, after any search and in the current sort order.
     *
     * Out-of-range positions are ignored rather than clamped, so scrolling to a
     * row that a search has just hidden does nothing.
     * @param index - Which row to reveal, counting from zero
     */
    scrollToRow: (index: number) => void;
    /**
     * Hides or shows one column.
     * @param id - Which column, by its `id`
     * @param hidden - True to hide it, false to show it
     */
    setColumnHidden: (id: string, hidden: boolean) => void;
    /**
     * Moves one column to a new position among the columns.
     * @param id - Which column, by its `id`
     * @param toIndex - Where it should end up, counting from zero across every column including the hidden ones
     */
    moveColumn: (id: string, toIndex: number) => void;
    /** Clears the selection. */
    clearSelection: () => void;
}

/**
 * Props for the DataTable component.
 */
export interface DataTableProps<TRow extends object> {
    /**
     * The rows, in their natural order.
     *
     * Sorting and searching are applied on top of this array rather than to it,
     * so it is never mutated. Keep the array itself stable between renders --
     * build it in `useMemo` or hold it in state -- because a new array is a new
     * set of rows and costs a re-sort.
     */
    data: readonly TRow[];
    /**
     * The columns, in their natural order.
     *
     * The order here is the order a reader sees until `columnOrder` says
     * otherwise. Keep the array stable between renders for the same reason as
     * `data`.
     */
    columns: readonly DataTableColumn<TRow>[];
    /**
     * Works out a stable identifier for a row.
     *
     * This is what a selection is written in terms of, so supply it whenever
     * your rows have identifiers of their own. Left out, a row is identified by
     * its position in `data`, which means a selection follows the position
     * rather than the thing when the data changes underneath it.
     */
    getRowId?: (row: TRow, index: number) => string;
    /**
     * The table's accessible name, such as "Nodes" or "Search results".
     *
     * Supply this or `labelledBy` whenever the page holds more than one table,
     * so a screen reader can tell them apart in its list of tables.
     */
    label?: string;
    /**
     * The id of the element that names the table, when a heading beside the
     * table already says what it is.
     *
     * Prefer this to `label` when such a heading exists: two names for one
     * thing drift apart, and a visible heading is the one a sighted reader
     * sees.
     */
    labelledBy?: string;
    /**
     * The strings this table produces, for rewording one table rather than the
     * whole application.
     *
     * Anything left out is inherited from the nearest `LabelsProvider`, and
     * anything that provider left out keeps its English default. Reach for
     * `LabelsProvider` to translate the library; reach for this when one table
     * counts nodes and another counts files.
     */
    labels?: Partial<DataTableLabels>;
    /**
     * How tall the scrolling area is: a number of pixels, or any CSS length.
     *
     * The table draws only the rows this height can show, so the height has to
     * be a real one -- an `auto` height would mean drawing every row, which is
     * the thing virtualization exists to avoid.
     */
    height?: number | string;
    /** How tall each row is drawn, in pixels. Defaults to the 28px row this library gives a row of data. */
    rowHeight?: number;
    /** How tall the header row is drawn, in pixels. Defaults to the 24px control height of a property panel. */
    headerHeight?: number;
    /**
     * How many rows to draw beyond the ones on screen, above and below.
     *
     * Higher numbers cost more to draw and make a fast scroll smoother.
     * Defaults to eight.
     */
    overscan?: number;
    /** How many rows may be selected at once. Defaults to `"multiple"`. */
    selectionMode?: DataTableSelectionMode;
    /**
     * The identifiers of the selected rows. Supply this to drive the selection
     * from your own state.
     *
     * This is the whole point of the table's selection being a slice of state
     * rather than a private detail: an app that already knows what is selected
     * -- because a canvas, a map or another panel selects the same things --
     * passes that selection in, and the table draws it.
     */
    selectedIds?: readonly string[];
    /** The identifiers of the rows selected before anyone has changed the selection, when the table keeps its own. */
    defaultSelectedIds?: readonly string[];
    /**
     * Called with the identifiers of the selected rows, and the event that
     * changed them.
     *
     * The event is absent when the selection was changed in code rather than by
     * a person.
     */
    onSelectionChange?: ChangeHandler<string[]>;
    /**
     * Which columns the table is sorted by, in order of precedence. Supply this
     * to drive the sort from your own state.
     */
    sorting?: readonly DataTableSort[];
    /** Which columns the table is sorted by before anyone has changed it, when the table keeps its own sort. */
    defaultSorting?: readonly DataTableSort[];
    /**
     * Called with the new sort order, and the event that asked for it.
     *
     * Read the event's `shiftKey` to tell a request to sort by one more column
     * from a request to replace the sort, though the table has already applied
     * that distinction by the time it calls you.
     */
    onSortingChange?: ChangeHandler<DataTableSort[]>;
    /** The identifiers of the hidden columns. Supply this to drive column visibility from your own state. */
    hiddenColumns?: readonly string[];
    /** The identifiers of the columns hidden before anyone has changed them, when the table keeps its own. */
    defaultHiddenColumns?: readonly string[];
    /** Called with the identifiers of the hidden columns, and the event that changed them. */
    onHiddenColumnsChange?: ChangeHandler<string[]>;
    /**
     * The identifiers of the columns, in the order they are drawn. Supply this
     * to drive the column order from your own state.
     *
     * A column left out of the list keeps its natural position after the ones
     * that are in it, so a partial order is enough to pull one column to the
     * front.
     */
    columnOrder?: readonly string[];
    /** The order the columns are drawn in before anyone has changed it, when the table keeps its own order. */
    defaultColumnOrder?: readonly string[];
    /** Called with the identifiers of the columns in their new order, and the event that changed them. */
    onColumnOrderChange?: ChangeHandler<string[]>;
    /**
     * The text every visible column is searched for. Supply this to drive the
     * search from your own search box.
     *
     * A row is kept when any one of its visible, searchable cells contains the
     * text, ignoring case. Hiding a column takes it out of the search as well
     * as out of the drawing, which is what a reader expects: they are searching
     * what they can see.
     */
    filter?: string;
    /** What the table is searched for before anyone has changed it, when the table keeps its own search text. */
    defaultFilter?: string;
    /** Called with the new search text, and the event that changed it. */
    onFilterChange?: ChangeHandler<string>;
    /**
     * Whether to draw a search box above the table.
     *
     * Leave it off when your app has a search box of its own; pass the text in
     * as `filter` instead.
     */
    searchable?: boolean;
    /**
     * Called when a row is activated, by a click or by Enter.
     *
     * This is not how selection is reported -- the table handles the modifier
     * keys itself and reports the result through `onSelectionChange`. Use this
     * for what the row means: open it, reveal it, load it.
     */
    onRowClick?: DataTableRowHandler<TRow>;
    /** Called when a row is double-clicked. Open the thing the row names, or start renaming it. */
    onRowDoubleClick?: DataTableRowMouseHandler<TRow>;
    /**
     * Called when a context menu is asked for on a row.
     *
     * Call `preventDefault` on the event to replace the browser's own menu with
     * yours. The keyboard's context-menu key and Shift+F10 raise it as well as
     * a right click, so a menu opened from here is reachable without a pointer.
     */
    onRowContextMenu?: DataTableRowMouseHandler<TRow>;
    /** Called when anything inside the table takes focus. */
    onFocus?: React.FocusEventHandler<HTMLDivElement>;
    /**
     * Called when focus leaves a control in the table.
     *
     * Fires for a move between two cells as well as for a move out of the
     * table; `event.relatedTarget` says which happened.
     */
    onBlur?: React.FocusEventHandler<HTMLDivElement>;
    /**
     * What to draw in place of the rows when there are none.
     *
     * Left out, the table says so in words: one sentence for a table with no
     * data at all, and a different one for a search that matched nothing.
     */
    empty?: React.ReactNode;
}
