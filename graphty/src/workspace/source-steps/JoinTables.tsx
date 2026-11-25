import { DataTable, type DataTableColumn, PANEL_GRID } from "@graphty/compact-mantine";
import type {
    SourceDraft,
    SourceJoinRow,
    SourceJoinRows,
    SourceJoinSide,
    SourceSideField,
} from "@graphty/graphty-element/session";
import { Text } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useBoxSize } from "../useBoxSize";
import { factWords, nameOf, profileWords, type SourceNames } from "./cardWords";
import { type CardLine, type Ignoring, ignoringOf, matchOf } from "./joinCards";
import { valueWords } from "./tableColumns";
import { WORKSPACE_WORDS } from "./words";

/** How many rows a page of the tables reads. */
export const PAGE = 200;

/** The width under which two tables are drawn under each other. */
const NARROW = 420;

/** The height of a table's name over it. */
const NAME_HEIGHT = 18;

/** One of the two tables. */
export interface TableSide {
    readonly end: "a" | "b";
    readonly side: SourceJoinSide;
    /** Its name. */
    readonly name: string;
    readonly fields: readonly SourceSideField[];
    /** The fields picked of it. */
    readonly picked: readonly string[];
    /** The field the element finds likeliest, while none is picked. */
    readonly suggested: string | null;
}

/**
 * A column header's icon: the field is matched, or the likeliest to match.
 * @param side - the table
 * @param field - the field
 * @returns the icon and what it says
 */
function markOf(side: TableSide, field: string): Pick<DataTableColumn<SourceJoinRow>, "icon" | "iconLabel"> {
    if (side.picked.includes(field)) {
        return { icon: <GLYPHS.check size={12} />, iconLabel: WORKSPACE_WORDS.matched };
    }
    return side.suggested === field
        ? { icon: <GLYPHS.suggested size={12} />, iconLabel: WORKSPACE_WORDS.suggested }
        : {};
}

/**
 * The columns of one table: each field with its facts in its header, the picked one kept at the start.
 * @param names - the sources' names
 * @param side - the table
 * @param rows - a page of the lines, which size the columns
 * @param pickable - whether a header picks its field
 * @returns the columns
 */
function columnsOf(
    names: SourceNames,
    side: TableSide,
    rows: readonly SourceJoinRow[],
    pickable: boolean,
): DataTableColumn<SourceJoinRow>[] {
    const { end } = side;
    return side.fields.map((field) => {
        const facts = factWords(field);
        const from = field.from === null ? null : nameOf(names, field.from);
        const header = [field.name, ...(from === null ? [] : [from])].join(" ");
        const words = rows.slice(0, 20).map((row) => valueWords(row[end]?.[field.name]).length);
        const picked = side.picked.includes(field.name);
        return {
            id: field.name,
            header: facts === "" ? header : `${header} (${facts})`,
            headerTooltip: profileWords(field, from),
            width: Math.min(
                240,
                Math.max(96, (header.length + facts.length + 3) * 6.5 + 40, ...words.map((n) => n * 8 + 32)),
            ),
            sortable: pickable,
            ...(picked ? { pinned: "start" as const, rowHeader: true } : {}),
            ...markOf(side, field.name),
            value: (row) => valueWords(row[end]?.[field.name]),
            cell: (row) => {
                const value = valueWords(row[end]?.[field.name]);
                // A copy of the row above, beside another row of the other side.
                return row.repeat === end ? (
                    <Text span inherit c="dimmed" truncate>
                        {value}
                    </Text>
                ) : (
                    value
                );
            },
        };
    });
}

/**
 * A page of a line's rows.
 * @param draft - the open draft
 * @param line - the line
 * @param on - how the card compares values
 * @param before - the card's step place, if it has one
 * @param only - which rows
 * @param offset - the first one
 * @returns the page; empty once a side is gone
 */
function pageOf(
    draft: SourceDraft,
    line: CardLine,
    on: Ignoring,
    before: number | undefined,
    only: RowFilter,
    offset: number,
): Pick<SourceJoinRows, "total" | "rows"> {
    const [a, b] = line.a.side === null ? [line.b.side, null] : [line.a.side, line.b.side];
    if (a === null) {
        return { total: 0, rows: [] };
    }
    const match = line.b.isNew === true ? null : matchOf(line);
    try {
        const page = draft.joinRows({
            a,
            ...(b === null ? {} : { b }),
            ...(match === null ? {} : { match }),
            ...(match === null || only === "all" ? {} : { only }),
            ...ignoringOf(on),
            ...(before === undefined ? {} : { before }),
            offset,
            limit: PAGE,
        });
        // One side alone is read as the element's first: here it is the line's own.
        return line.a.side === null
            ? { total: page.total, rows: page.rows.map((row) => ({ a: null, b: row.a })) }
            : page;
    } catch {
        return { total: 0, rows: [] };
    }
}

/** Which rows the tables list. */
export type RowFilter = "all" | "matched" | "a" | "b";

/**
 * Both sources' rows side by side, lined up by the card's match, as one window of lines: a header picks
 * or clears its field, and the two scroll as one.
 * @param props - Component props
 * @param props.draft - the open draft
 * @param props.names - the sources' names
 * @param props.line - the line whose rows they are
 * @param props.on - how the card compares values
 * @param props.before - the card's step place, if it has one
 * @param props.only - which rows
 * @param props.sides - the tables: one for one source, or the same source twice
 * @param props.onField - a header was pressed
 * @returns the tables
 */
export function JoinTables({
    draft,
    names,
    line,
    on,
    before,
    only,
    sides,
    onField,
}: Readonly<{
    draft: SourceDraft;
    names: SourceNames;
    line: CardLine;
    on: Ignoring;
    before: number | undefined;
    only: RowFilter;
    sides: readonly TableSide[];
    /** Absent while one source alone is picked. */
    onField?: (end: "a" | "b", field: string) => void;
}>): React.JSX.Element {
    // on reload: fresh: pointer: the page of rows scrolled to for a look
    const [offset, setOffset] = useState(0);
    const box = useBoxSize();
    const tables = useRef<HTMLDivElement>(null);
    // Beside each other while each has room for a column or two, else under each other.
    const beside = sides.length > 1 && box.width >= NARROW;
    const height = Math.max(PANEL_GRID.ROW_PITCH * 4, beside ? box.height : box.height / Math.max(1, sides.length));
    const page = pageOf(draft, line, on, before, only, offset);
    const range = (start: number, end: number): void => {
        if (start < offset || end > offset + PAGE) {
            setOffset(Math.max(0, start - PAGE / 4));
        }
    };
    // Row n of one table is row n of the other: what scrolls one scrolls both.
    const follow = (event: React.UIEvent): void => {
        const { scrollTop } = event.target as HTMLElement;
        const all = tables.current?.querySelectorAll<HTMLElement>("[data-testid=data-table-viewport]") ?? [];
        for (const each of all) {
            if (each.scrollTop !== scrollTop) {
                each.scrollTop = scrollTop;
            }
        }
    };
    return (
        <div ref={box.ref} className="jw-table-grid">
            <div ref={tables} className="jw-tables" {...(beside ? { "data-beside": "" } : {})} onScrollCapture={follow}>
                {sides.map((side) => (
                    <div key={side.end} className="jw-side">
                        <Text size="xs" fw={600} truncate>
                            {side.name}
                        </Text>
                        <DataTable<SourceJoinRow>
                            label={side.name}
                            rowHeight={PANEL_GRID.ROW_PITCH}
                            headerHeight={PANEL_GRID.ROW_PITCH}
                            data={page.rows}
                            rowCount={page.total}
                            rowOffset={offset}
                            onRangeChange={range}
                            columns={columnsOf(names, side, page.rows, onField !== undefined)}
                            getRowId={(_row, index) => String(index)}
                            height={height - NAME_HEIGHT}
                            selectionMode="none"
                            sorting={[]}
                            onSortingChange={(next) => {
                                const field = next.at(0)?.id;
                                if (field !== undefined) {
                                    onField?.(side.end, field);
                                }
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
