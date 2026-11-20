import "./source-steps.css";

import { DataTable, type DataTableColumn, PANEL_GRID, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    SourceDraftCell,
    SourceDraftPreview,
    SourceDraftRow,
    SourceKey,
    SourceValue,
} from "@graphty/graphty-element/session";
import { Group, Stack, Text } from "@mantine/core";
import React from "react";

import { sourceName } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import { useSessionEvents } from "../sessionEvents";
import type { JoinCardState, JoinDrill, WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { cellId, openDraft, rowId, setDrill } from "./preview";
import { bucketWords, CELL_FILTERS, cellWords, DRILL_WORDS, EFFECT_WORDS, RULE_WORDS } from "./words";

/** The draft's acts change the rows and cells the tab lists. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** A row's tint by what the commit does to its element; the Effect column says it in words. */
const EFFECT_COLORS: Readonly<Partial<Record<SourceDraftRow["effect"], string>>> = {
    added: "var(--mantine-color-green-light)",
    changed: "var(--mantine-color-yellow-light)",
    removed: "var(--mantine-color-red-light)",
    "left-out": "var(--mantine-color-gray-light)",
};

/**
 * A built value as the tab shows it: a list an aggregate gathered reads as its values.
 * @param value - the value, or undefined where the side holds none.
 * @returns its words.
 */
function valueWords(value: SourceValue | undefined): string {
    if (value === undefined) {
        return "";
    }
    // A list is the one value that is an object.
    return typeof value === "object" && value !== null
        ? value.map((each) => cellWords(each)).join(", ")
        : cellWords(value);
}

/**
 * A source's name, by its key.
 * @param session - the element's session.
 * @param key - the source.
 * @returns its name.
 */
function nameOf(session: GraphSession, key: SourceKey): string {
    const source = session.data.sources({ staged: true }).find((each) => each.key === key);
    return source === undefined ? key : sourceName(source);
}

/**
 * The rows table's columns: the key, the source, the effect, then each value column's held and
 * incoming values side by side.
 * @param session - the element's session.
 * @param rows - the rows.
 * @returns the columns.
 */
function rowColumns(session: GraphSession, rows: readonly SourceDraftRow[]): DataTableColumn<SourceDraftRow>[] {
    const names = new Set<string>();
    for (const row of rows) {
        for (const name of [...Object.keys(row.held ?? {}), ...Object.keys(row.incoming ?? {})]) {
            names.add(name);
        }
    }
    return [
        { id: "key", header: DRILL_WORDS.key, sortable: false, rowHeader: true, value: (row) => cellWords(row.key) },
        { id: "from", header: DRILL_WORDS.from, sortable: false, value: (row) => nameOf(session, row.source) },
        { id: "effect", header: DRILL_WORDS.effect, sortable: false, value: (row) => EFFECT_WORDS[row.effect] },
        ...[...names].flatMap((name): DataTableColumn<SourceDraftRow>[] => [
            {
                id: `held:${name}`,
                header: `${name} (${DRILL_WORDS.held})`,
                sortable: false,
                value: (row) => valueWords(row.held?.[name]),
            },
            {
                id: `incoming:${name}`,
                header: `${name} (${DRILL_WORDS.incoming})`,
                sortable: false,
                value: (row) => valueWords(row.incoming?.[name] ?? undefined),
            },
        ]),
    ];
}

/**
 * The cells table's columns: the element, each source's value, the value shown, and what shows it
 * (R for a reader decision, else the rule).
 * @param session - the element's session.
 * @param cells - the cells.
 * @returns the columns.
 */
function cellColumns(session: GraphSession, cells: readonly SourceDraftCell[]): DataTableColumn<SourceDraftCell>[] {
    const sources = [...new Set(cells.flatMap((cell) => cell.values.map((each) => each.source)))];
    return [
        { id: "key", header: DRILL_WORDS.key, sortable: false, rowHeader: true, value: (cell) => cell.ref.key },
        ...sources.map((source): DataTableColumn<SourceDraftCell> => ({
            id: `source:${source}`,
            header: nameOf(session, source),
            sortable: false,
            value: (cell) => valueWords(cell.values.find((each) => each.source === source)?.value),
        })),
        { id: "shown", header: DRILL_WORDS.shown, sortable: false, value: (cell) => valueWords(cell.shown ?? "") },
        {
            id: "by",
            header: DRILL_WORDS.by,
            sortable: false,
            value: (cell) => (cell.decided ? DRILL_WORDS.reader : RULE_WORDS[cell.rule]),
        },
    ];
}

/** What each drill-down view is given: the session, the open draft's preview and step, the room. */
interface ViewProps<D> {
    readonly session: GraphSession;
    readonly preview: SourceDraftPreview;
    readonly step: number;
    readonly drill: D;
    readonly height: number;
}

/**
 * The table props both drill-down views share: one row pitch, the room the dock gives, and the
 * selection the card acts on.
 * @param store - the chrome store, for the selection.
 * @param drill - the drill-down.
 * @param height - the room for the table, in pixels.
 * @returns the props.
 */
function gridProps(
    store: WorkspaceStore,
    drill: NonNullable<JoinDrill>,
    height: number,
): {
    rowHeight: number;
    headerHeight: number;
    height: number;
    selectionMode: "multiple";
    selectedIds: readonly string[];
    onSelectionChange: (selected: readonly string[]) => void;
} {
    return {
        rowHeight: PANEL_GRID.ROW_PITCH,
        headerHeight: PANEL_GRID.ROW_PITCH,
        height: Math.max(PANEL_GRID.ROW_PITCH * 4, height - PANEL_GRID.ROW_PITCH * 2),
        selectionMode: "multiple",
        selectedIds: drill.selected,
        onSelectionChange: (selected) => {
            setDrill(store, { ...drill, selected: [...selected] });
        },
    };
}

/**
 * The rows behind one count: held and incoming side by side, tinted by effect, Changed only or All.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.preview - the open draft's preview
 * @param props.step - the card's step
 * @param props.drill - the count
 * @param props.height - the room for the table, in pixels
 * @returns the view
 */
function RowsView({
    session,
    preview,
    step,
    drill,
    height,
}: ViewProps<Extract<JoinDrill, { kind: "rows" }>>): React.JSX.Element {
    const { store } = useWorkspace();
    // ponytail: every row of the count at once; page it as FieldsTab does when counts reach the thousands.
    const { total, rows: all } = preview.rows({ step, bucket: drill.bucket });
    const rows = drill.changedOnly ? all.filter((row) => row.effect !== "unchanged") : all;
    return (
        <Stack gap={6} className="ss-fields-tab">
            <Group gap={8} wrap="nowrap">
                <SegmentedControl
                    size="xs"
                    aria-label={DRILL_WORDS.show}
                    value={drill.changedOnly ? "changed" : "all"}
                    data={[
                        { value: "changed", label: DRILL_WORDS.changedOnly },
                        { value: "all", label: DRILL_WORDS.all },
                    ]}
                    onChange={(value) => {
                        setDrill(store, { ...drill, changedOnly: value === "changed", selected: [] });
                    }}
                />
                <Text size="xs" fw={600}>
                    {bucketWords(drill.bucket)}
                </Text>
                <Text size="xs" aria-label={`${bucketWords(drill.bucket)} ${DRILL_WORDS.rows}`}>
                    {formatNumber(total)}
                </Text>
            </Group>
            <DataTable<SourceDraftRow>
                key={`${drill.bucket}:${String(drill.changedOnly)}`}
                label={DRILL_WORDS.rowsLabel}
                data={rows}
                columns={rowColumns(session, rows)}
                getRowId={rowId}
                rowColor={(row) => EFFECT_COLORS[row.effect]}
                {...gridProps(store, drill, height)}
            />
        </Stack>
    );
}

/**
 * The cells of one Values differ column: each source's value, the one shown, R for decided; All,
 * Open or Decided.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.preview - the open draft's preview
 * @param props.step - the card's step
 * @param props.drill - the column
 * @param props.height - the room for the table, in pixels
 * @returns the view
 */
function CellsView({
    session,
    preview,
    step,
    drill,
    height,
}: ViewProps<Extract<JoinDrill, { kind: "cells" }>>): React.JSX.Element {
    const { store } = useWorkspace();
    // ponytail: every cell of the column at once; page it as FieldsTab does when counts reach the thousands.
    const { total, cells } = preview.cells({ column: drill.column, step, only: drill.only });
    return (
        <Stack gap={6} className="ss-fields-tab">
            <Group gap={8} wrap="nowrap">
                <Text size="xs" fw={600}>
                    {drill.column}
                </Text>
                <SegmentedControl
                    size="xs"
                    aria-label={DRILL_WORDS.cells}
                    value={drill.only}
                    data={CELL_FILTERS.map((each) => ({ ...each }))}
                    onChange={(value) => {
                        const only = CELL_FILTERS.find((each) => each.value === value)?.value ?? "all";
                        setDrill(store, { ...drill, only, selected: [] });
                    }}
                />
                <Text size="xs" aria-label={`${drill.column} ${DRILL_WORDS.cells}`}>
                    {formatNumber(total)}
                </Text>
            </Group>
            <DataTable<SourceDraftCell>
                key={`${drill.column}:${drill.only}`}
                label={DRILL_WORDS.cellsLabel}
                data={cells}
                columns={cellColumns(session, cells)}
                getRowId={cellId}
                {...gridProps(store, drill, height)}
            />
        </Stack>
    );
}

/**
 * The dock's Preview tab while the Join card previews (design 5.4): the rows behind the count the
 * reader clicked, or the cells of the Values differ column they clicked, from the draft's
 * `preview.rows` and `preview.cells`. View and select only: the card acts on the selection.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card, previewing
 * @param props.height - the room for the table, in pixels
 * @returns the tab's body
 */
export function PreviewTab({
    session,
    card,
    height,
}: Readonly<{ session: GraphSession; card: JoinCardState; height: number }>): React.JSX.Element | null {
    useSessionEvents(session, DRAFT_EVENTS);
    const { drill } = card;
    const draft = openDraft(session);
    if (drill === null || draft === null || card.preview === null) {
        return null;
    }
    const view = { session, preview: draft.preview(), step: card.preview.step, height };
    return drill.kind === "rows" ? <RowsView {...view} drill={drill} /> : <CellsView {...view} drill={drill} />;
}
