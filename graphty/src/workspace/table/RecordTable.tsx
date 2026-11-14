import {
    DataTable,
    type DataTableColumn,
    type DataTableSort,
    type DataTableValue,
    PANEL_GRID,
} from "@graphty/compact-mantine";
import type {
    EdgeId,
    EdgeRecord,
    GraphSession,
    IssueId,
    NodeId,
    NodeRecord,
    PageColumn,
    RecordPage,
    ScopeInput,
} from "@graphty/graphty-element/session";
import { Menu } from "@mantine/core";
import React, { useState } from "react";

import { useShowingBranches } from "../selection/useSteps";
import { useNumberFormats } from "../settings/numberFormat";
import { timeValue } from "../time/timeActions";
import { elementSort, groupName, type RecordKind, type TableColumnChoice } from "./columns";

/** How many records past the drawn rows a window reads, above and below. */
const WINDOW_PAD = 50;

/** One drawn row: the record, and its position in the page's result columns. */
interface Row {
    readonly record: NodeRecord | EdgeRecord;
    readonly index: number;
}

/**
 * What a cell shows: an edge's ends by their nodes' names (a node is called by its label), a date
 * column's values as dates (its kind alone decides, never its role), anything else as it is.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param column - the column.
 * @param record - the row's record.
 * @returns the cell's value.
 */
function cellValue(
    session: GraphSession,
    kind: RecordKind,
    column: TableColumnChoice,
    record: NodeRecord | EdgeRecord,
): DataTableValue {
    const key = column.attribute ?? column.id;
    const value = column.structure === true ? session.data.structureValue(record.id, key) : record[key];
    if (kind === "edge" && (key === "source" || key === "target")) {
        const id = value as NodeId;
        return session.data.nodeName(id).name;
    }
    return tableValue(timeValue(session, value, column.descriptor?.type === "time"));
}

/** Fired with a node id when a row is clicked while Pick on canvas is armed (the selection's reference picker). */
export const PICK_NODE_EVENT = "graphty-pick-node";

/** Props for RecordTable. */
interface RecordTableProps {
    session: GraphSession;
    kind: RecordKind;
    /** The visible columns, keys first. */
    columns: readonly TableColumnChoice[];
    /** Which records: the graph, or a group's members. */
    scope: ScopeInput;
    /** Only the records an open issue is on: one issue's id, or "any" for every open issue; null for every record. */
    issue?: IssueId | null;
    /** The issues each column's warning carries, by column id: a cell on a record they are on is tinted. */
    issueColumns?: ReadonlyMap<string, readonly IssueId[]>;
    sort: DataTableSort | null;
    onSortChange: (sort: DataTableSort | null) => void;
    height: number;
    /** Moves a column one place left (-1) or right (1) among the columns that are not keys. */
    onMoveColumn?: (id: string, by: -1 | 1) => void;
    /** A column's header parts: its icons, summary, warning and menu. */
    header?: (column: TableColumnChoice) => Partial<DataTableColumn<object>>;
    /** While a selection is edited: the group a record is in, whose color tints its row. */
    groupOf?: (id: NodeId | EdgeId) => { name: string; color: string } | null;
    /** Only the records that match this text, as graphty-element's `matching` finds them. */
    matching?: string;
    /** A click marks the row in this table only and leaves the graph's selection alone (an editor's preview). */
    localSelection?: boolean;
    /**
     * With `groupOf`, a Group column drawn first (a chit and the group's name) in place of the row
     * tint: the outline-and-pane selection editor's table, while the `selection-workspace`
     * experiment is off.
     */
    groupColumn?: boolean;
}

/**
 * A value the table can draw and sort: what the element gave, else its text.
 * @param value - a record's attribute value or a result cell.
 * @returns the table's value.
 */
function tableValue(value: unknown): DataTableValue {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    return typeof value === "bigint" ? value.toString() : JSON.stringify(value);
}

/**
 * A result cell as the table draws it: a partition's group by the name the key and the layer tree
 * give it ("Group 3", from the rank graphty-element puts on each cell), any other cell as it is.
 * The element still sorts the column by the run's own values.
 * @param column - the page's result column.
 * @param index - the row's position in the page.
 * @returns the table's value.
 */
function resultValue(column: PageColumn | undefined, index: number): DataTableValue {
    const value = column?.values[index];
    const rank = column?.ranks?.[index];
    return rank === undefined || value === undefined ? value : groupName({ group: String(value), size: 0, rank });
}

/**
 * One header menu from two parts: the header's own items, then the column's Move left and Move
 * right, with a divider between them.
 * @param own - the header's items, or undefined.
 * @param move - the move items, or undefined for a key column.
 * @returns the menu, or undefined with neither.
 */
function joinMenus(own: React.ReactNode, move: React.ReactNode): React.ReactNode {
    if (own === undefined || own === null) {
        return move;
    }
    if (move === undefined) {
        return own;
    }
    return (
        <>
            {own}
            <Menu.Divider />
            {move}
        </>
    );
}

/**
 * A row's Group cell: its group's chit and name, or nothing.
 * @param group - the row's group, or null.
 * @param filled - whether the chit is filled with the group's color.
 * @returns the cell.
 */
function groupCell(group: { name: string; color: string } | null, filled: boolean): React.ReactNode {
    return group === null ? null : (
        <span className="ws-table-group">
            <span
                className="sel-chit"
                style={{ borderColor: group.color, background: filled ? group.color : "transparent" }}
            />
            {group.name}
        </span>
    );
}

/**
 * The records of one kind, read a window at a time from graphty-element's `nodePage` or
 * `edgePage`. The element sorts (a result column by the run's value, a grouping by group size),
 * reads each run's values, and holds the selection; the table draws what it is handed.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.kind - Nodes or edges
 * @param props.columns - The visible columns
 * @param props.scope - Which records
 * @param props.issue - Only the records an open issue is on
 * @param props.issueColumns - The issues each column's warning carries
 * @param props.sort - The sorted column
 * @param props.onSortChange - Called with a new sort
 * @param props.height - The table's height in pixels
 * @param props.onMoveColumn - Moves a column one place
 * @param props.header - A column's header parts
 * @param props.groupOf - The group a record is in, while a selection is edited
 * @param props.matching - Only the records that match this text
 * @param props.localSelection - A click marks the row here only, never the graph's selection
 * @param props.groupColumn - A Group column first in place of the row tint
 * @returns The table
 */
export function RecordTable({
    session,
    kind,
    columns,
    scope,
    issue = null,
    issueColumns,
    sort,
    onSortChange,
    height,
    onMoveColumn,
    header,
    groupOf,
    matching,
    localSelection = false,
    groupColumn = false,
}: Readonly<RecordTableProps>): React.JSX.Element {
    const [range, setRange] = useState({ offset: 0, limit: 200 });
    const [marked, setMarked] = useState<readonly (NodeId | EdgeId)[]>([]);
    const numberFormats = useNumberFormats();
    // Rows take their group's color only while the canvas draws the group colors.
    const filled = useShowingBranches(session);
    const runIds = columns.flatMap((column) => (column.run === undefined ? [] : [column.run]));
    const sorted = columns.find((column) => column.id === sort?.id);

    // Read on every render: the element caches a sorted page per revision, and the dock re-renders
    // this whenever the element reports a change.
    const options = {
        offset: range.offset,
        limit: range.limit,
        scope,
        columns: runIds,
        ...(issue === null ? {} : { issue }),
        ...(matching === undefined ? {} : { matching: { text: matching } }),
        ...(sorted === undefined ? {} : { sort: elementSort(sorted, sort?.desc ?? false) }),
    };
    const page: RecordPage<NodeRecord | EdgeRecord> =
        kind === "node" ? session.data.nodePage(options) : session.data.edgePage(options);

    const rows = page.records.map((record, index): Row => ({ record, index }));
    // The keys stay first; every other column moves from its header menu, which a finger reaches too.
    const movable = columns.filter((column) => column.group !== "key").map((column) => column.id);
    const tableColumns = columns.map((column): DataTableColumn<Row> => {
        const at = column.run === undefined ? -1 : runIds.indexOf(column.run);
        const place = movable.indexOf(column.id);
        const move =
            place === -1 || onMoveColumn === undefined ? undefined : (
                <>
                    <Menu.Item
                        disabled={place === 0}
                        onClick={() => {
                            onMoveColumn(column.id, -1);
                        }}
                    >
                        Move left
                    </Menu.Item>
                    <Menu.Item
                        disabled={place === movable.length - 1}
                        onClick={() => {
                            onMoveColumn(column.id, 1);
                        }}
                    >
                        Move right
                    </Menu.Item>
                </>
            );
        const parts = header?.(column);
        const warned = issueColumns?.get(column.id) ?? [];
        return {
            ...parts,
            id: column.id,
            header: column.header,
            // A group's name is a word ("Group 3"), so it reads from the left like other words.
            align: column.numeric && column.grouping !== true ? "end" : "start",
            // A first click sorts words and dates A to Z (oldest first), as a spreadsheet does,
            // and numbers highest first; never by whatever the first row happens to hold.
            descendingFirst: column.numeric,
            // The key names its row, so every other cell reads with it.
            rowHeader: column.group === "key",
            menu: joinMenus(parts?.menu, move),
            // A cell on a record its column's issues are on is drawn in the header warning's tint.
            ...(warned.length === 0
                ? {}
                : {
                      cellTone: (row: Row) =>
                          page.issues?.[row.index]?.some((id) => warned.includes(id)) === true ? "warning" : undefined,
                  }),
            value:
                at >= 0
                    ? (row) => resultValue(page.columns?.[at], row.index)
                    : (row) => cellValue(session, kind, column, row.record),
        };
    });

    if (groupOf !== undefined && groupColumn) {
        // A chit and the group's name, never a row tint: lime means selected (spec 8).
        tableColumns.unshift({
            id: "sel:group",
            header: "Group",
            sortable: false,
            hideable: false,
            value: (row) => groupOf(row.record.id)?.name,
            cell: (row) => groupCell(groupOf(row.record.id), filled),
        });
    }

    // One selection, the element's: the rows draw it and a click on a row changes it.
    const graphSelection = kind === "node" ? session.selection.nodes : session.selection.edges;
    const selected = localSelection ? marked : graphSelection;
    const known = new Map<string, NodeId>();
    for (const id of selected) {
        known.set(String(id), id);
    }
    for (const row of rows) {
        known.set(String(row.record.id), row.record.id);
    }

    return (
        <DataTable<Row>
            label={kind === "node" ? "Nodes" : "Edges"}
            // The panel list pitch, not the spreadsheet rows DataTable draws by default.
            rowHeight={PANEL_GRID.ROW_PITCH}
            headerHeight={PANEL_GRID.ROW_PITCH}
            data={rows}
            rowCount={page.total}
            rowOffset={page.offset}
            onRangeChange={(start, end) => {
                if (start < range.offset || end > range.offset + range.limit) {
                    const offset = Math.max(0, start - WINDOW_PAD);
                    setRange({ offset, limit: end - offset + WINDOW_PAD });
                }
            }}
            columns={tableColumns}
            getRowId={(row) => String(row.record.id)}
            // Each row is tinted in its group's color while the canvas draws the group colors (the
            // owner, 2026-11-04: no Group column).
            rowColor={
                groupOf === undefined || !filled || groupColumn
                    ? undefined
                    : (row) => {
                          const color = groupOf(row.record.id)?.color;
                          return color === "" ? undefined : color;
                      }
            }
            height={height}
            // A short column (an id, a number) is drawn whole; a long one takes what it needs.
            columnSizing="content"
            // The inspector's and the key's spelling, so one score reads alike in all three.
            formatNumber={numberFormats.number}
            sorting={sort === null ? [] : [sort]}
            onSortingChange={(next) => {
                onSortChange(next[0] ?? null);
            }}
            selectedIds={selected.map(String)}
            onSelectionChange={(ids, event) => {
                if (event === undefined) {
                    return;
                }
                const picked = ids.flatMap((id) => {
                    const real = known.get(id);
                    return real === undefined ? [] : [real];
                });
                // Pick on canvas is armed: the row clicked is the reference, and the selection stays.
                const clicked = picked.find((id) => !selected.some((each) => String(each) === String(id)));
                if (document.body.dataset.pickingNode !== undefined && kind === "node" && clicked !== undefined) {
                    globalThis.dispatchEvent(new CustomEvent(PICK_NODE_EVENT, { detail: clicked }));
                    return;
                }
                if (localSelection) {
                    setMarked(picked);
                    return;
                }
                // The ids come from the page just read, so the element has no reason to refuse them;
                // if it does, the selection it already has stays, which is what the table shows.
                // The reader picked the rows, so the change acts like a click on the canvas.
                session.selection
                    .apply(kind === "node" ? { nodes: picked } : { edges: picked.map(String) }, "replace", {
                        cause: "user",
                    })
                    .catch(() => undefined);
            }}
        />
    );
}
