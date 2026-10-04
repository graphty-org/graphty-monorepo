import { DataTable, type DataTableColumn, type DataTableSort, type DataTableValue } from "@graphty/compact-mantine";
import type {
    EdgeRecord,
    GraphSession,
    NodeId,
    NodeRecord,
    RecordPage,
    ScopeInput,
} from "@graphty/graphty-element/session";
import React, { useEffect, useState } from "react";

import { elementSort, type RecordKind, type TableColumnChoice } from "./columns";

/** How many records past the drawn rows a window reads, above and below. */
const WINDOW_PAD = 50;

/** One drawn row: the record, and its position in the page's result columns. */
interface Row {
    readonly record: NodeRecord | EdgeRecord;
    readonly index: number;
}

/** Props for RecordTable. */
interface RecordTableProps {
    session: GraphSession;
    kind: RecordKind;
    /** The visible columns, keys first. */
    columns: readonly TableColumnChoice[];
    /** Which records: the graph, or a group's members. */
    scope: ScopeInput;
    sort: DataTableSort | null;
    onSortChange: (sort: DataTableSort | null) => void;
    height: number;
    /** Called with each page read, for the count line. */
    onTotal: (total: number) => void;
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
 * The records of one kind, read a window at a time from graphty-element's `nodePage` or
 * `edgePage`. The element sorts (a result column by the run's value, a grouping by group size),
 * reads each run's values, and holds the selection; the table draws what it is handed.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.kind - Nodes or edges
 * @param props.columns - The visible columns
 * @param props.scope - Which records
 * @param props.sort - The sorted column
 * @param props.onSortChange - Called with a new sort
 * @param props.height - The table's height in pixels
 * @param props.onTotal - Called with the record count
 * @returns The table
 */
export function RecordTable({
    session,
    kind,
    columns,
    scope,
    sort,
    onSortChange,
    height,
    onTotal,
}: RecordTableProps): React.JSX.Element {
    const [range, setRange] = useState({ offset: 0, limit: 200 });
    const runIds = columns.flatMap((column) => (column.run === undefined ? [] : [column.run]));
    const sorted = columns.find((column) => column.id === sort?.id);

    // Read on every render: the element caches a sorted page per revision, and the dock re-renders
    // this whenever the element reports a change.
    const options = {
        offset: range.offset,
        limit: range.limit,
        scope,
        columns: runIds,
        ...(sorted === undefined ? {} : { sort: elementSort(sorted, sort?.desc ?? false) }),
    };
    const page: RecordPage<NodeRecord | EdgeRecord> =
        kind === "node" ? session.data.nodePage(options) : session.data.edgePage(options);

    useEffect(() => {
        onTotal(page.total);
    }, [onTotal, page.total]);

    const rows = page.records.map((record, index): Row => ({ record, index }));
    const tableColumns = columns.map((column): DataTableColumn<Row> => {
        const at = column.run === undefined ? -1 : runIds.indexOf(column.run);
        return {
            id: column.id,
            header: column.header,
            align: column.numeric ? "end" : "start",
            value:
                at >= 0
                    ? (row) => page.columns?.[at]?.values[row.index]
                    : (row) => tableValue(row.record[column.attribute ?? column.id]),
        };
    });

    // One selection, the element's: the rows draw it and a click on a row changes it.
    const selected = kind === "node" ? session.selection.nodes : session.selection.edges;
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
            height={height}
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
                void session.selection.apply(kind === "node" ? { nodes: picked } : { edges: picked.map(String) });
            }}
        />
    );
}
