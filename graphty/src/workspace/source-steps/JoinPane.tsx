import { DataTable, PANEL_GRID, SegmentedControl } from "@graphty/compact-mantine";
import type { GraphSession, SourceDraft, SourceDraftRow, SourceElementRef } from "@graphty/graphty-element/session";
import { Button, Group, Stack } from "@mantine/core";
import React, { useState } from "react";

import { useBoxSize } from "../useBoxSize";
import { lineWords, sideName, type SourceNames } from "./cardWords";
import { BLANK_LINE, type CardLine, fieldsOf, matchOf, type OpenCard, sameSide, type Suggestion } from "./joinCards";
import { JoinTables, PAGE, type RowFilter, type TableSide } from "./JoinTables";
import { EFFECT_COLORS, rowColumns } from "./tableColumns";
import { WORKSPACE_WORDS } from "./words";
import { type CellFilter, CellsPane } from "./WorkspaceParts";

/** What the pane lists instead of the two sources' rows. */
export type TableShows =
    | { readonly kind: "rows"; readonly step: number; readonly bucket: string }
    | { readonly kind: "cells"; readonly step: number; readonly column: string; readonly only: CellFilter };

/** How the two sources' rows are shown: which line lines them up, and which rows. */
export interface RowsView {
    readonly card: string;
    readonly line: number;
    readonly only: RowFilter;
}

/** The rows picked in the table, for a look and for what the card does with them. */
export interface Picked {
    /** What the table listed when they were picked. */
    readonly list: string;
    readonly ids: readonly string[];
    readonly refs: readonly SourceElementRef[];
    readonly rows: readonly SourceDraftRow[];
}

/**
 * The rows behind one count of a step, or the cells of one Both have column, for looking and picking: the
 * card says what can be done with the rows picked.
 * @param props - Component props
 * @param props.names - the sources' names
 * @param props.draft - the open draft
 * @param props.shows - what it lists
 * @param props.picked - the rows picked in it
 * @param props.onShows - changes what it lists
 * @param props.onPick - takes the rows picked
 * @returns the table
 */
function RowsPane({
    names,
    draft,
    shows,
    picked,
    onShows,
    onPick,
}: Readonly<{
    names: SourceNames;
    draft: SourceDraft;
    shows: TableShows;
    picked: readonly string[];
    onShows: (shows: TableShows) => void;
    onPick: (picked: Omit<Picked, "list">) => void;
}>): React.JSX.Element | null {
    // on reload: fresh: pointer: the page of a list opened for a look
    const [offset, setOffset] = useState(0);
    const grid = useBoxSize();
    const height = Math.max(PANEL_GRID.ROW_PITCH * 4, grid.height);
    if (shows.kind === "cells") {
        const step = draft.steps().find((each) => each.index === shows.step);
        return step === undefined ? null : (
            <div ref={grid.ref} className="jw-table-grid">
                <CellsPane
                    names={names}
                    draft={draft}
                    step={step}
                    column={shows.column}
                    only={shows.only}
                    height={height}
                    selected={picked}
                    onOnly={(only) => {
                        onShows({ ...shows, only });
                    }}
                    onSelect={(ids, refs) => {
                        onPick({ ids, refs, rows: [] });
                    }}
                />
            </div>
        );
    }
    let rows: { total: number; rows: readonly SourceDraftRow[] } = { total: 0, rows: [] };
    try {
        rows = draft.preview().rows({ step: shows.step, bucket: shows.bucket as never, offset, limit: PAGE });
    } catch {
        // A count the step no longer keeps lists nothing.
    }
    const ids = rows.rows.map((row) => JSON.stringify([row.source, row.table, row.row, row.key, row.element]));
    return (
        <div ref={grid.ref} className="jw-table-grid">
            <DataTable<SourceDraftRow>
                key={`${String(shows.step)}:${shows.bucket}`}
                label={WORKSPACE_WORDS.rows}
                rowHeight={PANEL_GRID.ROW_PITCH}
                headerHeight={PANEL_GRID.ROW_PITCH}
                data={rows.rows}
                rowCount={rows.total}
                rowOffset={offset}
                onRangeChange={(start, end) => {
                    if (start < offset || end > offset + PAGE) {
                        setOffset(Math.max(0, start - PAGE / 4));
                    }
                }}
                columns={rowColumns(names, rows.rows)}
                getRowId={(_row, index) => ids[index - offset] ?? String(index)}
                height={height}
                rowColor={(row) => EFFECT_COLORS[row.effect]}
                selectionMode="multiple"
                selectedIds={[...picked]}
                onSelectionChange={(selected) => {
                    const now = rows.rows.filter((_row, at) => selected.includes(ids[at] ?? ""));
                    onPick({
                        ids: [...selected],
                        refs: now.flatMap((row) => (row.element === null ? [] : [row.element])),
                        rows: now.filter((row) => row.key !== null),
                    });
                }}
            />
        </div>
    );
}

/**
 * The tables of one line: each source's once, or one for a source matched with itself.
 * @param session - the element's session
 * @param names - the sources' names
 * @param draft - the open draft
 * @param line - the line
 * @param before - the card's step place, if it has one
 * @param suggestion - the line's likeliest fields
 * @returns the tables
 */
function tableSides(
    session: GraphSession,
    names: SourceNames,
    draft: SourceDraft,
    line: CardLine,
    before: number | undefined,
    suggestion: Suggestion | null,
): readonly TableSide[] {
    const alike = sameSide(line.a.side, line.b.side);
    return (["a", "b"] as const).flatMap((end) => {
        const { side, field } = line[end];
        if (side === null || (alike && end === "b")) {
            return [];
        }
        const fields = alike ? [line.a.field, line.b.field] : [field];
        return [
            {
                end,
                side,
                name: sideName(session, names, side),
                fields: fieldsOf(draft, side, before),
                picked: fields.filter((each) => each !== null),
                suggested: field === null ? (suggestion?.[end] ?? null) : null,
            },
        ];
    });
}

/**
 * A line once a header of its tables was pressed: the field is picked, or cleared when it was. Of one
 * source with itself, the first press picks one end and the next the other, the same field making shared
 * values.
 * @param line - the line
 * @param end - the table
 * @param field - the field
 * @returns the line
 */
function withPressed(line: CardLine, end: "a" | "b", field: string): CardLine {
    const set = (at: "a" | "b", next: string | null): CardLine => ({ ...line, [at]: { ...line[at], field: next } });
    if (!sameSide(line.a.side, line.b.side)) {
        return set(end, line[end].field === field ? null : field);
    }
    if (line.a.field === null) {
        return set("a", field);
    }
    if (line.b.field === null) {
        return set("b", field);
    }
    if (line.b.field === field) {
        return set("b", null);
    }
    return line.a.field === field ? set("a", null) : set("b", field);
}

/** What the pane shows of the selected card. */
export interface PaneProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly names: SourceNames;
    readonly card: OpenCard;
    /** The list of one of its counts or columns asked for, instead of its sources' rows. */
    readonly shows: TableShows | null;
    readonly view: RowsView;
    /** Each line's likeliest fields. */
    readonly suggestions: readonly (Suggestion | null)[];
    /** The rows picked in the list. */
    readonly picked: readonly string[];
    readonly onShows: (shows: TableShows | null) => void;
    readonly onView: (view: RowsView) => void;
    readonly onPick: (picked: Omit<Picked, "list">) => void;
    readonly onLines: (lines: readonly CardLine[], resided: boolean) => void;
}

/**
 * The line whose rows are shown: the one the reader is on, else the first.
 * @param card - the card
 * @param view - how its rows are shown
 * @returns its place
 */
function lineAt(card: OpenCard, view: RowsView): number {
    return view.card === card.id && view.line < card.lines.length ? view.line : 0;
}

/**
 * The choices over the two tables: which line lines them up, and which rows.
 * @param props - the pane's props, the line shown, its place, which rows and the tables
 * @returns the choices
 */
function RowsChoices(
    props: Pick<PaneProps, "card" | "onView"> &
        Readonly<{ line: CardLine; at: number; only: RowFilter; sides: readonly TableSide[] }>,
): React.JSX.Element {
    const { card, line, at, only, sides, onView } = props;
    return (
        <>
            {card.lines.length < 2 ? null : (
                <SegmentedControl
                    size="xs"
                    aria-label={WORKSPACE_WORDS.match}
                    value={String(at)}
                    data={card.lines.map((each, i) => ({ value: String(i), label: lineWords(each, i) }))}
                    onChange={(value) => {
                        onView({ card: card.id, line: Number(value), only: "all" });
                    }}
                />
            )}
            {sides.length < 2 || matchOf(line) === null ? null : (
                <SegmentedControl
                    size="xs"
                    aria-label={WORKSPACE_WORDS.show}
                    value={only}
                    data={[
                        { value: "all", label: WORKSPACE_WORDS.all },
                        { value: "matched", label: WORKSPACE_WORDS.matched },
                        ...sides.map((each) => ({ value: each.end, label: WORKSPACE_WORDS.only(each.name) })),
                    ]}
                    onChange={(value) => {
                        onView({ card: card.id, line: at, only: value as RowFilter });
                    }}
                />
            )}
        </>
    );
}

/**
 * The pane under the preview: the selected card's two sources' rows beside each other, or the rows or
 * cells behind one of its counts.
 * @param props - Component props
 * @returns the pane
 */
export function JoinPane(props: PaneProps): React.JSX.Element {
    const { session, draft, names, card, shows, view, suggestions, picked, onShows, onPick, onLines } = props;
    const at = lineAt(card, view);
    const line = card.lines.at(at) ?? BLANK_LINE;
    const only = view.card === card.id ? view.only : "all";
    const sides = tableSides(session, names, draft, line, card.step?.index, suggestions.at(at) ?? null);
    const two = line.b.isNew === true || (line.a.side !== null && line.b.side !== null);
    const press = (end: "a" | "b", field: string): void => {
        onLines(
            card.lines.map((each, i) => (i === at ? withPressed(line, end, field) : each)),
            false,
        );
    };
    return (
        <Stack gap={4} className="jw-lower">
            <Group gap={6} wrap="wrap">
                {shows === null ? (
                    <RowsChoices {...props} line={line} at={at} only={only} sides={sides} />
                ) : (
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            onShows(null);
                        }}
                    >
                        {WORKSPACE_WORDS.tables}
                    </Button>
                )}
            </Group>
            {shows === null ? (
                <JoinTables
                    key={JSON.stringify([card.id, at, only, line.a.side, line.b.side])}
                    draft={draft}
                    names={names}
                    line={line}
                    on={card}
                    before={card.step?.index}
                    only={only}
                    // "Only <source>" draws that source's table alone.
                    sides={only === "a" || only === "b" ? sides.filter((side) => side.end === only) : sides}
                    {...(two ? { onField: press } : {})}
                />
            ) : (
                <RowsPane
                    key={JSON.stringify({ ...shows, only: undefined })}
                    names={names}
                    draft={draft}
                    shows={shows}
                    picked={picked}
                    onShows={onShows}
                    onPick={onPick}
                />
            )}
        </Stack>
    );
}
