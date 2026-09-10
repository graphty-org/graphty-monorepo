import { ActionIcon, Box, Table, TextInput, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import {
    type Column,
    type ColumnDef,
    columnFilteringFeature,
    columnOrderingFeature,
    type ColumnSort,
    columnVisibilityFeature,
    createFilteredRowModel,
    createSortedRowModel,
    functionalUpdate,
    globalFilteringFeature,
    rowSelectionFeature,
    type RowSelectionState,
    rowSortingFeature,
    tableFeatures,
    type Updater,
    useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useCollator, useLocale, useNumberFormatter } from "../../i18n";
import { UiGlyph } from "../../icons";
import { type ActivationEvent, type ActivationMeta, getActivationMeta } from "../../types/events";
import { isRtl, useDirection } from "../../utils/rtl";
import { useDataTableLabels } from "./labels";
import { clampGridPosition, type GridPosition, HEADER_ROW, nextGridPosition, samePosition } from "./navigation";
import { applySelectionGesture, selectAll, type SelectionModifiers, type SelectionResult } from "./selection";
import type { DataTableColumn, DataTableHandle, DataTableProps, DataTableSort } from "./types";
import { cellText, compareValues, type ValueFormat } from "./values";

// The feature set. TanStack Table 9 registers features explicitly rather than
// shipping one object with everything in it, so the table only carries the code
// for what this component actually does: sorting, a search across the columns,
// hiding and reordering columns, and holding a selection. Pagination, grouping,
// pinning, faceting, resizing and cell selection are deliberately absent.
//
// Row model factories are slots on the same object and have to sit alongside
// the feature they belong to -- the sorted model needs the sorting feature, the
// filtered model needs the filtering one, and the global filter is built on
// column filtering.
const dataTableFeatures = tableFeatures({
    columnFilteringFeature,
    columnOrderingFeature,
    columnVisibilityFeature,
    filteredRowModel: createFilteredRowModel(),
    globalFilteringFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
});

/**
 * The feature set this table registers with TanStack Table.
 */
type DataTableFeatures = typeof dataTableFeatures;

/** What the search box is looking for, and where it is allowed to look. */
interface GlobalSearch {
    /** The text to look for, already lower-cased for the active locale. */
    query: string;
    /**
     * The columns to look in: the visible, searchable ones.
     *
     * They travel with the query rather than being read off the table, because
     * hiding a column has to make the table search again -- and the row model
     * only knows to do that when the thing it is filtering by has changed.
     */
    columnIds: readonly string[];
}

// How tall the scrolling area is when the caller says nothing. Ten rows of the
// 28px data pitch plus the header, which is enough to read as a list rather
// than as a peephole.
const DEFAULT_HEIGHT = 320;

// How many rows to draw beyond the ones on screen. Eight is roughly a third of
// a screenful at the default row height: enough that a flick of the wheel does
// not reach the edge of what is drawn.
const DEFAULT_OVERSCAN = 8;

// The 12px reading size a row of the reader's own strings is drawn at, the same
// size the list row uses. A table holds data rather than chrome, so it is drawn
// one step larger than the labels around it.
const CELL_FONT_SIZE = 12;

// The line height every single-line label in a panel is drawn at.
const LINE_HEIGHT = 1.2;

// The ground of a selected row: the accent at a low alpha over the panel. It is
// the one spelling that stays correct when the scheme flips and when a consumer
// changes the primary colour, and it is what the list row already uses.
const SELECTED_GROUND = "var(--mantine-primary-color-light)";

// Mantine's own class for a focus ring that appears only for a keyboard user.
// The theme sets focusRing "auto", which styles Mantine's controls through this
// class; a bare table cell is not a Mantine control, so it asks for the ring by
// name.
const FOCUS_RING_CLASS = "mantine-focus-auto";

// An empty array that keeps its identity between renders, so that a table given
// no selection, no sort and no hidden columns does not look like it has been
// given new ones on every render.
const EMPTY_IDS: readonly string[] = [];
const EMPTY_SORT: readonly DataTableSort[] = [];

/**
 * Spells a column's sort state the way `aria-sort` does.
 * @param sorted - What TanStack Table reports for the column
 * @returns The value for `aria-sort`
 */
function ariaSortOf(sorted: false | "asc" | "desc"): "ascending" | "descending" | "none" {
    if (sorted === "asc") {
        return "ascending";
    }

    if (sorted === "desc") {
        return "descending";
    }

    return "none";
}

/**
 * Keeps a number inside a range.
 * @param value - The number to keep in range
 * @param min - The lowest allowed value
 * @param max - The highest allowed value
 * @returns The number, brought into range
 */
function clampNumber(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * A compact, virtualized data table.
 * @param props - Component props
 * @param ref - A handle for the few things a table can be asked to do from outside
 * @returns The table
 */
function DataTableInner<TRow extends object>(
    props: DataTableProps<TRow>,
    ref: React.ForwardedRef<DataTableHandle>,
): React.JSX.Element {
    const {
        data,
        columns,
        getRowId,
        label,
        labelledBy,
        labels: labelOverrides,
        height = DEFAULT_HEIGHT,
        rowHeight = PANEL_GRID.DATA_PITCH,
        headerHeight = PANEL_GRID.CONTROL_HEIGHT,
        overscan = DEFAULT_OVERSCAN,
        selectionMode = "multiple",
        selectedIds,
        defaultSelectedIds,
        onSelectionChange,
        sorting,
        defaultSorting,
        onSortingChange,
        hiddenColumns,
        defaultHiddenColumns,
        onHiddenColumnsChange,
        columnOrder,
        defaultColumnOrder,
        onColumnOrderChange,
        filter,
        defaultFilter,
        onFilterChange,
        searchable = false,
        onRowClick,
        onRowDoubleClick,
        onRowContextMenu,
        onFocus,
        onBlur,
        empty,
    } = props;

    const labels = useDataTableLabels(labelOverrides);
    const direction = useDirection();
    const locale = useLocale();
    const numberFormatter = useNumberFormatter();
    // Numeric collation, so "item 9" sorts before "item 10" the way a reader
    // reads them rather than the way UTF-16 orders them.
    const collator = useCollator({ numeric: true, sensitivity: "variant" });
    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

    const format = useMemo<ValueFormat>(
        () => ({ number: numberFormatter, date: dateFormatter, yes: labels.yes, no: labels.no }),
        [numberFormatter, dateFormatter, labels.yes, labels.no],
    );

    // Every slice of state is controlled or uncontrolled, the way every
    // value-holding component in this package works: pass the value to drive it
    // from your own state, pass the default to let the table keep its own.
    const [selection, setSelection] = useUncontrolled<readonly string[]>({
        value: selectedIds,
        defaultValue: defaultSelectedIds,
        finalValue: EMPTY_IDS,
        onChange: (value: readonly string[], event?: React.SyntheticEvent): void => {
            onSelectionChange?.([...value], event);
        },
    });
    const [sortOrder, setSortOrder] = useUncontrolled<readonly DataTableSort[]>({
        value: sorting,
        defaultValue: defaultSorting,
        finalValue: EMPTY_SORT,
        onChange: (value: readonly DataTableSort[], event?: React.SyntheticEvent): void => {
            onSortingChange?.([...value], event);
        },
    });
    const [hidden, setHidden] = useUncontrolled<readonly string[]>({
        value: hiddenColumns,
        defaultValue: defaultHiddenColumns,
        finalValue: EMPTY_IDS,
        onChange: (value: readonly string[], event?: React.SyntheticEvent): void => {
            onHiddenColumnsChange?.([...value], event);
        },
    });
    const [order, setOrder] = useUncontrolled<readonly string[]>({
        value: columnOrder,
        defaultValue: defaultColumnOrder,
        finalValue: EMPTY_IDS,
        onChange: (value: readonly string[], event?: React.SyntheticEvent): void => {
            onColumnOrderChange?.([...value], event);
        },
    });
    const [search, setSearch] = useUncontrolled<string>({
        value: filter,
        defaultValue: defaultFilter,
        finalValue: "",
        onChange: (value: string, event?: React.SyntheticEvent): void => {
            onFilterChange?.(value, event);
        },
    });

    const columnById = useMemo(() => {
        const byId = new Map<string, DataTableColumn<TRow>>();
        for (const column of columns) {
            byId.set(column.id, column);
        }

        return byId;
    }, [columns]);

    // Which columns the search may look in: the ones that are both searchable
    // and on show. Hiding a column takes it out of the search as well as out of
    // the drawing, because a reader searches what they can see.
    const hiddenKey = JSON.stringify(hidden);
    const searchColumnIds = useMemo(() => {
        const hiddenSet = new Set(hidden);
        return columns.filter((column) => (column.filterable ?? true) && !hiddenSet.has(column.id)).map((c) => c.id);
        // Keyed on the contents of the hidden list rather than on the array
        // itself, so a caller who rebuilds the array on every render does not
        // make the table search again on every render.
    }, [columns, hiddenKey]);

    const globalSearch = useMemo<GlobalSearch | undefined>(() => {
        const query = search.trim();
        if (query === "") {
            return undefined;
        }

        return { query: query.toLocaleLowerCase(locale), columnIds: searchColumnIds };
    }, [search, locale, searchColumnIds]);

    const rowsData = useMemo(() => [...data], [data]);

    const columnDefs = useMemo<ColumnDef<DataTableFeatures, TRow>[]>(
        () =>
            columns.map((column) => ({
                id: column.id,
                accessorFn: (row: TRow) => column.value(row),
                enableSorting: column.sortable ?? true,
                enableHiding: column.hideable ?? true,
                enableGlobalFilter: column.filterable ?? true,
                sortDescFirst: column.descendingFirst,
                // The comparison is ours rather than TanStack's: its built-in
                // alphanumeric comparison sorts by code unit, which puts every
                // accented word after every unaccented one. This one reads the
                // value through the column's own accessor and compares it with
                // the collator for the active locale.
                sortFn: (rowA, rowB) => compareValues(column.value(rowA.original), column.value(rowB.original), collator),
            })),
        [columns, collator],
    );

    // A record with the same keys is compared field by field by the table
    // before it writes anything, so rebuilding these on every render costs a
    // comparison rather than a render loop. The sort order is the exception:
    // its entries are objects, which are compared by identity, so it is
    // rebuilt only when its contents actually change.
    const sortKey = JSON.stringify(sortOrder);
    const sortingState = useMemo<ColumnSort[]>(
        () => sortOrder.map((entry) => ({ id: entry.id, desc: entry.desc })),
        [sortKey],
    );
    const columnVisibility = useMemo(() => {
        const visibility: Record<string, boolean> = {};
        for (const id of hidden) {
            visibility[id] = false;
        }

        return visibility;
    }, [hidden]);
    const rowSelectionState = useMemo(() => {
        const state: RowSelectionState = {};
        for (const id of selection) {
            state[id] = true;
        }

        return state;
    }, [selection]);
    const columnOrderState = useMemo(() => [...order], [order]);

    // The event that asked for the last sort. TanStack Table's own sorting
    // handler works out the next order and swallows the event on the way; the
    // contract's event model says a change reports the event that caused it, so
    // it is parked here for the moment between the header being activated and
    // the resulting state arriving.
    const sortEventRef = useRef<React.SyntheticEvent | undefined>(undefined);

    const table = useTable<DataTableFeatures, TRow>({
        features: dataTableFeatures,
        data: rowsData,
        columns: columnDefs,
        getRowId,
        enableRowSelection: selectionMode !== "none",
        enableMultiRowSelection: selectionMode === "multiple",
        // Every column is a candidate for the search; which of them the search
        // actually looks in is decided per row below, from the visible set that
        // travels with the query.
        getColumnCanGlobalFilter: () => true,
        globalFilterFn: (row, columnId, filterValue): boolean => {
            const value = filterValue as GlobalSearch | undefined;
            if (value === undefined || !value.columnIds.includes(columnId)) {
                return false;
            }

            const column = columnById.get(columnId);
            if (column === undefined) {
                return false;
            }

            return cellText(column.value(row.original), format).toLocaleLowerCase(locale).includes(value.query);
        },
        state: {
            sorting: sortingState,
            columnVisibility,
            columnOrder: columnOrderState,
            rowSelection: rowSelectionState,
            globalFilter: globalSearch,
        },
        onSortingChange: (updater: Updater<ColumnSort[]>): void => {
            const next = functionalUpdate(updater, sortingState);
            setSortOrder(
                next.map((entry) => ({ id: entry.id, desc: entry.desc })),
                sortEventRef.current,
            );
        },
        onColumnVisibilityChange: (updater: Updater<Record<string, boolean>>): void => {
            const next = functionalUpdate(updater, columnVisibility);
            setHidden(Object.keys(next).filter((id) => !next[id]));
        },
        onColumnOrderChange: (updater: Updater<string[]>): void => {
            setOrder(functionalUpdate(updater, columnOrderState));
        },
        onRowSelectionChange: (updater: Updater<RowSelectionState>): void => {
            setSelection(Object.keys(functionalUpdate(updater, rowSelectionState)));
        },
    });

    const { rows } = table.getRowModel();
    const visibleColumns = table.getVisibleLeafColumns();
    const rowCount = rows.length;
    const columnCount = visibleColumns.length;

    const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLTableElement>(null);

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => rowHeight,
        getItemKey: (index) => rowIds[index] ?? index,
        overscan,
    });

    // Roving tabindex, as the ARIA Authoring Practices ask of a grid: exactly
    // one cell is in the tab order at a time, Tab moves into and out of the
    // whole table, and the arrow keys move between the cells. The remembered
    // position outlives the rows it points at -- a search can shorten the table
    // under it -- so it is brought back into range on the way to being drawn
    // rather than corrected in an effect.
    const [focus, setFocus] = useState<GridPosition>({ row: HEADER_ROW, column: 0 });
    const position = useMemo(() => clampGridPosition(focus, { rowCount, columnCount }), [focus, rowCount, columnCount]);
    const focusPendingRef = useRef(false);
    const anchorRef = useRef<string | undefined>(undefined);

    /**
     * Moves focus to a cell, bringing its row into view first when the table
     * has scrolled past it.
     * @param next - The cell to move focus to
     */
    const moveFocusTo = (next: GridPosition): void => {
        if (next.row >= 0) {
            virtualizer.scrollToIndex(next.row);
        }

        focusPendingRef.current = true;
        setFocus((previous) => (samePosition(previous, next) ? previous : next));
    };

    // A cell that has scrolled out of view is not in the document, so focus
    // cannot reach it until the row it belongs to has been drawn. The request
    // is therefore left standing until the cell turns up, which is the render
    // after the virtualizer has scrolled. It is deliberately never satisfied
    // for a table nobody has touched: focus is moved only after something asked
    // for it to move, so a table does not steal focus by existing.
    useLayoutEffect(() => {
        if (!focusPendingRef.current) {
            return;
        }

        const selector = `[data-grid-row="${position.row}"][data-grid-column="${position.column}"]`;
        const cell = gridRef.current?.querySelector(selector);
        if (!(cell instanceof HTMLElement)) {
            return;
        }

        focusPendingRef.current = false;
        cell.focus();
    });

    /**
     * Reports a selection, unless it is the one that was already there.
     *
     * Clicking the one selected row again, or selecting everything twice, is a
     * gesture that changes nothing -- and a change handler called for a change
     * that did not happen is one undo entry the reader has to press through
     * twice.
     * @param result - What the gesture left selected, and where a range would extend from
     * @param event - The event that asked for it
     */
    const commitSelection = (result: SelectionResult, event: React.SyntheticEvent): void => {
        anchorRef.current = result.anchor;

        const unchanged =
            result.selected.length === selection.length &&
            result.selected.every((id, index) => id === selection[index]);

        if (unchanged) {
            return;
        }

        setSelection(result.selected, event);
    };

    /**
     * Reports a new selection, working out what the gesture leaves selected.
     * @param index - Which row was activated, as a position in the rows on show
     * @param modifiers - Which modifier keys the activation carried
     * @param event - The event that asked for it
     */
    const applyGesture = (index: number, modifiers: SelectionModifiers, event: React.SyntheticEvent): void => {
        commitSelection(
            applySelectionGesture({
                ids: rowIds,
                index,
                selected: selection,
                anchor: anchorRef.current,
                modifiers,
                mode: selectionMode,
            }),
            event,
        );
    };

    /**
     * Reports that a row was activated, with the source stated separately.
     * @param index - Which row, as a position in the rows on show
     * @param event - The activation
     * @param meta - Whether it came from a pointer or from the keyboard
     */
    const activateRow = (index: number, event: ActivationEvent, meta: ActivationMeta): void => {
        const row = rows[index];
        if (row === undefined) {
            return;
        }

        onRowClick?.(row.original, event, meta);
    };

    /**
     * Sorts by a column, adding it to the sort rather than replacing it when
     * Shift is held.
     * @param column - The column whose header was activated
     * @param event - The activation
     */
    const handleSort = (column: Column<DataTableFeatures, TRow>, event: ActivationEvent): void => {
        if (!column.getCanSort()) {
            return;
        }

        sortEventRef.current = event;
        // Undefined leaves the direction to the column's own cycle: the first
        // activation sorts the way the data suggests, the second reverses it,
        // and the third returns the table to its natural order.
        column.toggleSorting(undefined, event.shiftKey && column.getCanMultiSort());
        sortEventRef.current = undefined;
    };

    /**
     * How many rows one press of Page Up or Page Down moves by: as many as the
     * scrolling area shows at once, less one so the reader keeps a row of
     * context.
     * @returns The number of rows in one page
     */
    const pageSize = (): number => {
        const viewport = scrollRef.current?.clientHeight ?? 0;
        const visible = Math.floor((viewport === 0 ? rowHeight * 10 : viewport) / rowHeight);
        return Math.max(1, visible - 1);
    };

    /**
     * Answers the keys the ARIA Authoring Practices give a grid.
     * @param event - The key press, from whichever cell holds focus
     */
    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const multiple = selectionMode === "multiple";
        const jumpToEnd = event.ctrlKey || event.metaKey;

        if (multiple && jumpToEnd && (event.key === "a" || event.key === "A")) {
            event.preventDefault();
            commitSelection(selectAll(rowIds, selection, selectionMode), event);
            return;
        }

        // A header cell is a button and answers Enter and Space itself, so the
        // selection keys apply only once focus is in the data.
        if (position.row >= 0 && (event.key === " " || event.key === "Enter")) {
            event.preventDefault();

            if (event.key === " ") {
                applyGesture(position.row, { extend: event.shiftKey, toggle: !event.shiftKey }, event);
            } else {
                applyGesture(position.row, { extend: false, toggle: false }, event);
                activateRow(position.row, event, { source: "keyboard" });
            }

            return;
        }

        const next = nextGridPosition(
            position,
            event.key,
            { rowCount, columnCount, pageSize: pageSize() },
            direction,
            { jumpToEnd },
        );

        if (next === undefined) {
            return;
        }

        event.preventDefault();
        moveFocusTo(next);

        // Shift with an arrow grows the selection as focus moves, which is the
        // keyboard's version of dragging a range with the pointer.
        if (multiple && event.shiftKey && next.row >= 0 && next.row !== position.row) {
            applyGesture(next.row, { extend: true, toggle: false }, event);
        }
    };

    useImperativeHandle(
        ref,
        (): DataTableHandle => ({
            scrollToRow: (index: number): void => {
                if (index >= 0 && index < rowCount) {
                    virtualizer.scrollToIndex(index);
                }
            },
            setColumnHidden: (id: string, isHidden: boolean): void => {
                table.getColumn(id)?.toggleVisibility(!isHidden);
            },
            moveColumn: (id: string, toIndex: number): void => {
                const ids = table.getAllLeafColumns().map((column) => column.id);
                const from = ids.indexOf(id);
                if (from === -1) {
                    return;
                }

                ids.splice(from, 1);
                ids.splice(clampNumber(toIndex, 0, ids.length), 0, id);
                table.setColumnOrder(ids);
            },
            clearSelection: (): void => {
                anchorRef.current = undefined;
                setSelection([]);
            },
        }),
        [table, virtualizer, rowCount, setSelection],
    );

    const totalWidth = visibleColumns.reduce(
        (sum, column) => sum + (columnById.get(column.id)?.width ?? PANEL_GRID.FIELD),
        0,
    );

    /**
     * The box one cell of a column occupies.
     *
     * The last column stretches into whatever room is left over, so a table
     * narrower than the space it is given has no bare strip down its trailing
     * edge.
     * @param column - The column the cell belongs to
     * @param index - Where the column comes among the visible ones
     * @returns The style for the cell
     */
    const cellBox = (column: DataTableColumn<TRow> | undefined, index: number): React.CSSProperties => {
        const width = column?.width ?? PANEL_GRID.FIELD;

        return {
            flex: index === columnCount - 1 ? `1 1 ${String(width)}px` : `0 0 ${String(width)}px`,
            minWidth: 0,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: column?.align === "end" ? "flex-end" : "flex-start",
            paddingInline: PANEL_GRID.GUTTER,
            // Drawn inside the cell rather than around it, so the ring is never
            // clipped by the edge of the scrolling area (WCAG 2.2, 2.4.11).
            outlineOffset: -2,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
        };
    };

    const isSelectable = selectionMode !== "none";
    const shownText = labels.rowsShown(numberFormatter.format(rowCount), numberFormatter.format(data.length));

    /**
     * What to draw in place of the rows when there are none.
     * @returns The message, or the caller's own replacement
     */
    const emptyContent = (): React.ReactNode => {
        if (empty !== undefined) {
            return empty;
        }

        return data.length === 0 ? labels.noRows : labels.noMatchingRows;
    };

    return (
        <Box
            data-testid="data-table"
            // Mantine's DirectionProvider supplies the direction as context and
            // leaves the document's own `dir` to the app, so a table told to run
            // right to left has to say so on its own root or it would be drawn
            // one way and keyed the other. Only the reversed direction is
            // declared: writing `ltr` here would override the direction of a
            // page that runs right to left without the provider, which is a case
            // where inheriting is the right answer.
            dir={isRtl(direction) ? "rtl" : undefined}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: PANEL_GRID.TRAIL_GAP,
                width: "100%",
                color: PANEL_INK.VALUE,
            }}
        >
            {searchable && (
                <Box style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.GUTTER }}>
                    <TextInput
                        data-testid="data-table-search"
                        size="xs"
                        type="search"
                        // The box's own value is not its name, so a name has to
                        // come from somewhere: there is no visible label beside
                        // it in a panel this dense.
                        aria-label={labels.search}
                        placeholder={labels.searchPlaceholder}
                        value={search}
                        onChange={(event) => {
                            setSearch(event.currentTarget.value, event);
                        }}
                        rightSection={
                            search === "" ? undefined : (
                                <ActionIcon
                                    data-testid="data-table-search-clear"
                                    variant="subtle"
                                    size={PANEL_GRID.CONTROL_HEIGHT}
                                    aria-label={labels.clearSearch}
                                    onClick={(event) => {
                                        setSearch("", event);
                                    }}
                                >
                                    <UiGlyph name="close" size={PANEL_GRID.CHEVRON} />
                                </ActionIcon>
                            )
                        }
                        rightSectionPointerEvents="all"
                        style={{ flex: "1 1 auto", minWidth: 0 }}
                    />
                    <Box
                        component="span"
                        data-testid="data-table-count"
                        aria-hidden="true"
                        dir="auto"
                        style={{
                            flex: "0 0 auto",
                            fontSize: "var(--mantine-font-size-sm)",
                            color: PANEL_INK.CHROME,
                        }}
                    >
                        {shownText}
                    </Box>
                </Box>
            )}

            {/* What arrives after the fact -- a search that changed how many
                rows there are, a selection made with the keyboard -- is said
                out loud rather than only drawn. */}
            <VisuallyHidden role="status" aria-live="polite" dir="auto" data-testid="data-table-status">
                {shownText}
                {isSelectable && selection.length > 0 ? ` ${labels.rowsSelected(numberFormatter.format(selection.length))}` : ""}
            </VisuallyHidden>

            <Box
                ref={scrollRef}
                data-testid="data-table-viewport"
                style={{
                    height,
                    overflow: "auto",
                    position: "relative",
                    border: `1px solid ${PANEL_INK.BORDER}`,
                    borderRadius: "var(--mantine-radius-sm)",
                    background: PANEL_INK.PANEL,
                }}
            >
                {/* ARIA Authoring Practices, Grid pattern. The table reports
                    how many rows and columns it has and numbers the ones it
                    has drawn, which is what lets a screen reader say "row 40
                    of 4,000" when only forty rows are in the document at
                    once. */}
                <Table
                    ref={gridRef}
                    role="grid"
                    aria-label={labelledBy === undefined && label === undefined ? labels.dataTable : label}
                    aria-labelledby={labelledBy}
                    aria-rowcount={rowCount + 1}
                    aria-colcount={columnCount}
                    aria-multiselectable={selectionMode === "multiple" ? true : undefined}
                    onKeyDown={handleKeyDown}
                    stickyHeader
                    tabularNums
                    withRowBorders={false}
                    horizontalSpacing={0}
                    verticalSpacing={0}
                    highlightOnHover={isSelectable}
                    highlightOnHoverColor={PANEL_INK.SURFACE}
                    style={{
                        display: "grid",
                        width: "100%",
                        minWidth: totalWidth,
                        fontSize: CELL_FONT_SIZE,
                        lineHeight: LINE_HEIGHT,
                    }}
                >
                    <Table.Thead
                        style={{
                            display: "grid",
                            position: "sticky",
                            insetBlockStart: 0,
                            zIndex: 1,
                            background: PANEL_INK.PANEL,
                            borderBlockEnd: `1px solid ${PANEL_INK.DIVIDER}`,
                        }}
                    >
                        <Table.Tr
                            role="row"
                            aria-rowindex={1}
                            style={{ display: "flex", width: "100%", height: headerHeight }}
                        >
                            {visibleColumns.map((column, index) => {
                                const config = columnById.get(column.id);
                                const sortable = column.getCanSort();
                                const sorted = column.getIsSorted();
                                const isFocused = position.row === HEADER_ROW && position.column === index;
                                const priority = sorted === false ? -1 : column.getSortIndex();
                                // The tab stop sits on the sort button when
                                // there is one, and on the header cell itself
                                // when there is not.
                                const rovingTabIndex = isFocused ? 0 : -1;

                                const caption = (
                                    <>
                                        <Box
                                            component="span"
                                            data-testid="data-table-header-label"
                                            // The direction is worked out from
                                            // the text itself: a column named in
                                            // Arabic inside a table that runs
                                            // left to right reads correctly, and
                                            // so does the other way round.
                                            dir="auto"
                                            title={config?.header}
                                            style={{
                                                flex: "0 1 auto",
                                                minWidth: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                color: sorted === false ? undefined : PANEL_INK.VALUE,
                                            }}
                                        >
                                            {config?.header ?? column.id}
                                        </Box>

                                        {sorted !== false && (
                                            <Box
                                                component="span"
                                                data-testid="data-table-sort-glyph"
                                                data-direction={ariaSortOf(sorted)}
                                                aria-hidden="true"
                                                style={{
                                                    flex: "0 0 auto",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    color: PANEL_INK.VALUE,
                                                    // A vertical turn means the
                                                    // same thing whichever way
                                                    // the text runs, so there is
                                                    // nothing here to mirror.
                                                    transform: sorted === "asc" ? "rotate(180deg)" : undefined,
                                                }}
                                            >
                                                <UiGlyph name="chevronDown" size={PANEL_GRID.CHEVRON} />
                                            </Box>
                                        )}

                                        {sortingState.length > 1 && priority >= 0 && (
                                            // Where this column comes in a sort
                                            // by several columns, drawn for the
                                            // eye only: every column already
                                            // announces its own direction
                                            // through aria-sort.
                                            <Box
                                                component="span"
                                                data-testid="data-table-sort-priority"
                                                aria-hidden="true"
                                                style={{
                                                    flex: "0 0 auto",
                                                    fontSize: "var(--mantine-font-size-xs)",
                                                    color: PANEL_INK.CHROME,
                                                }}
                                            >
                                                {numberFormatter.format(priority + 1)}
                                            </Box>
                                        )}
                                    </>
                                );

                                return (
                                    <Table.Th
                                        key={column.id}
                                        scope="col"
                                        data-testid="data-table-header"
                                        aria-colindex={index + 1}
                                        aria-sort={sortable ? ariaSortOf(sorted) : undefined}
                                        data-grid-row={sortable ? undefined : HEADER_ROW}
                                        data-grid-column={sortable ? undefined : index}
                                        tabIndex={sortable ? undefined : rovingTabIndex}
                                        className={sortable ? undefined : FOCUS_RING_CLASS}
                                        onFocus={
                                            sortable
                                                ? undefined
                                                : () => {
                                                      setFocus((previous) =>
                                                          samePosition(previous, { row: HEADER_ROW, column: index })
                                                              ? previous
                                                              : { row: HEADER_ROW, column: index },
                                                      );
                                                  }
                                        }
                                        style={{
                                            ...cellBox(config, index),
                                            gap: PANEL_GRID.GUTTER / 2,
                                            height: headerHeight,
                                            fontSize: "var(--mantine-font-size-sm)",
                                            fontWeight: 500,
                                            color: PANEL_INK.CHROME,
                                            textAlign: "start",
                                        }}
                                    >
                                        {sortable ? (
                                            // A cell holding one control puts
                                            // the tab stop on the control, so a
                                            // screen reader says "button" and a
                                            // reader knows the header does
                                            // something.
                                            <UnstyledButton
                                                type="button"
                                                data-testid="data-table-sort-button"
                                                data-grid-row={HEADER_ROW}
                                                data-grid-column={index}
                                                tabIndex={rovingTabIndex}
                                                onClick={(event) => {
                                                    setFocus({ row: HEADER_ROW, column: index });
                                                    handleSort(column, event);
                                                }}
                                                onFocus={() => {
                                                    setFocus((previous) =>
                                                        samePosition(previous, { row: HEADER_ROW, column: index })
                                                            ? previous
                                                            : { row: HEADER_ROW, column: index },
                                                    );
                                                }}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: PANEL_GRID.GUTTER / 2,
                                                    justifyContent:
                                                        config?.align === "end" ? "flex-end" : "flex-start",
                                                    flex: "1 1 auto",
                                                    minWidth: 0,
                                                    height: "100%",
                                                    background: "transparent",
                                                    color: "inherit",
                                                    font: "inherit",
                                                    textAlign: "start",
                                                    outlineOffset: -2,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {caption}
                                            </UnstyledButton>
                                        ) : (
                                            caption
                                        )}
                                    </Table.Th>
                                );
                            })}
                        </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody
                        style={{
                            display: "grid",
                            position: "relative",
                            height: virtualizer.getTotalSize(),
                        }}
                    >
                        {virtualizer.getVirtualItems().map((item) => {
                            const row = rows[item.index];
                            if (row === undefined) {
                                return null;
                            }

                            const isSelected = selection.includes(row.id);

                            return (
                                <Table.Tr
                                    key={row.id}
                                    role="row"
                                    data-testid="data-table-row"
                                    data-index={item.index}
                                    data-selected={isSelected ? "true" : undefined}
                                    aria-rowindex={item.index + 2}
                                    aria-selected={isSelectable ? isSelected : undefined}
                                    onDoubleClick={(event) => {
                                        onRowDoubleClick?.(row.original, event);
                                    }}
                                    onContextMenu={(event) => {
                                        onRowContextMenu?.(row.original, event);
                                    }}
                                    style={{
                                        display: "flex",
                                        position: "absolute",
                                        insetBlockStart: 0,
                                        insetInlineStart: 0,
                                        width: "100%",
                                        height: rowHeight,
                                        transform: `translateY(${String(item.start)}px)`,
                                        background: isSelected ? SELECTED_GROUND : undefined,
                                        cursor: isSelectable ? "pointer" : undefined,
                                    }}
                                >
                                    {visibleColumns.map((column, index) => {
                                        const config = columnById.get(column.id);
                                        const isFocused =
                                            position.row === item.index && position.column === index;
                                        const value = config?.value(row.original);
                                        const text = cellText(value, format);
                                        // A value the table writes itself is
                                        // wrapped so that bidi works it out from
                                        // the text -- these are the reader's own
                                        // strings, in whatever script they use --
                                        // and so that the ellipsis applies to the
                                        // text rather than to the box that
                                        // positions it. A column that draws
                                        // itself is handed through untouched.
                                        const drawn =
                                            config?.cell === undefined ? (
                                                <Box
                                                    component="span"
                                                    dir="auto"
                                                    style={{
                                                        minWidth: 0,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {text}
                                                </Box>
                                            ) : (
                                                config.cell(row.original)
                                            );

                                        return (
                                            <Table.Td
                                                key={column.id}
                                                role="gridcell"
                                                data-testid="data-table-cell"
                                                aria-colindex={index + 1}
                                                data-grid-row={item.index}
                                                data-grid-column={index}
                                                tabIndex={isFocused ? 0 : -1}
                                                className={FOCUS_RING_CLASS}
                                                // A cell ellipsises when the
                                                // column is too narrow for its
                                                // value, so it carries the whole
                                                // value as a title for a
                                                // pointer. The ellipsis is a
                                                // drawing rather than a
                                                // truncation: the whole value is
                                                // still the cell's text, so a
                                                // screen reader reads all of it
                                                // either way.
                                                title={config?.cell === undefined ? text : undefined}
                                                onFocus={() => {
                                                    setFocus((previous) =>
                                                        samePosition(previous, { row: item.index, column: index })
                                                            ? previous
                                                            : { row: item.index, column: index },
                                                    );
                                                }}
                                                onClick={(event) => {
                                                    setFocus({ row: item.index, column: index });
                                                    applyGesture(
                                                        item.index,
                                                        {
                                                            extend: event.shiftKey,
                                                            toggle: event.metaKey || event.ctrlKey,
                                                        },
                                                        event,
                                                    );
                                                    activateRow(item.index, event, getActivationMeta(event));
                                                }}
                                                style={cellBox(config, index)}
                                            >
                                                {drawn}
                                            </Table.Td>
                                        );
                                    })}
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>

                {rowCount === 0 && (
                    <Box
                        data-testid="data-table-empty"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: PANEL_GRID.PAD_LEFT,
                            fontSize: "var(--mantine-font-size-sm)",
                            color: PANEL_INK.CHROME,
                        }}
                    >
                        {emptyContent()}
                    </Box>
                )}
            </Box>
        </Box>
    );
}

/**
 * A compact, virtualized data table: sortable columns, a search across them, a
 * selection, and full keyboard operation.
 *
 * **Why it exists.** A property panel's list rows carry one string and one
 * number each. A table carries several columns of them, for thousands of rows,
 * and has to stay quick and readable while it does. This one draws only the
 * rows the scrolling area can show, so ten rows are in the document whether
 * there are fifty of them or fifty thousand.
 *
 * **What it does for you**
 * - **Sorting.** Activating a column's header sorts by it, again reverses it,
 *   and a third time returns the table to its natural order. Holding Shift adds
 *   a column to the sort instead of replacing it, and the order of the columns
 *   in the sort is drawn beside each arrow.
 * - **Searching.** One box searches every visible column, matching the text a
 *   reader can actually see: a number is found in the grouped spelling on the
 *   screen rather than in the digits behind it. Hiding a column takes it out of
 *   the search too.
 * - **Selecting.** A plain click selects one row, Shift extends the selection
 *   from the last row clicked, and Command or Control adds and removes single
 *   rows. The keyboard does the same with Space, Shift+Space and Shift with the
 *   arrow keys, and Control+A selects everything on show.
 * - **Arranging.** Columns can be hidden and reordered, as state you pass in or
 *   as state the table keeps for itself.
 *
 * **Keyboard.** The table follows the grid pattern of the ARIA Authoring
 * Practices: Tab moves into and out of the whole table, the arrow keys move
 * between cells, Home and End reach the ends of a row, Control with them
 * reaches the ends of the table, and Page Up and Page Down move by a screenful.
 * Every cell reports its row and column number, so a screen reader can say
 * where a reader is in a table whose rows are mostly not in the document.
 *
 * **State.** Every slice -- the selection, the sort order, the hidden columns,
 * the column order and the search text -- is controlled or uncontrolled in the
 * usual way: pass `selectedIds` to drive it from your own state, or
 * `defaultSelectedIds` to let the table keep its own. The selection being a
 * slice of your state is the point: an app whose canvas and panels select the
 * same things passes one selection to all of them.
 * @example
 * ```tsx
 * const columns: DataTableColumn<Node>[] = [
 *     {id: "id", header: "Node", value: (node) => node.id},
 *     {id: "degree", header: "Links", value: (node) => node.degree, align: "end"},
 *     {id: "community", header: "Group", value: (node) => node.community},
 * ];
 *
 * const [selected, setSelected] = useState<string[]>([]);
 *
 * <DataTable
 *     columns={columns}
 *     data={nodes}
 *     getRowId={(node) => node.id}
 *     label="Nodes"
 *     searchable
 *     height={320}
 *     selectedIds={selected}
 *     onSelectionChange={setSelected}
 *     defaultSorting={[{id: "degree", desc: true}]}
 * />
 * ```
 */
export const DataTable = React.forwardRef(DataTableInner) as <TRow extends object>(
    props: DataTableProps<TRow> & { ref?: React.Ref<DataTableHandle> },
) => React.JSX.Element;
