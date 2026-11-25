import "../selection/selection.css";
import "./source-steps.css";

import {
    CardList,
    type CardListItem,
    ControlSection,
    DataTable,
    PANEL_GRID,
    SegmentedControl,
} from "@graphty/compact-mantine";
import {
    DEFAULT_BRANCH_PALETTE,
    type GraphSession,
    type SourceCellValue,
    type SourceDraft,
    type SourceDraftRow,
    type SourceElementRef,
    type SourceMatchValue,
    type SourceStepPatch,
    type SourceStepRow,
} from "@graphty/graphty-element/session";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { sourceStepsOn } from "../features";
import { focusIsLost } from "../frame/focus";
import { formatNumber } from "../inspector/words";
import { ariaKey, isTypingTarget, matchesKey } from "../keys/keys";
import { cardPalette } from "../selection/cardPalette";
import { usePreviewCanvas } from "../selection/previewCanvas";
import { useSessionEvents } from "../sessionEvents";
import type { JoinWorkspaceOpen } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useBoxSize } from "../useBoxSize";
import { commitWorkspace } from "./actions";
import { cardActWords, cardSummary, cardTitle, hasMatch, intoWords, spaceName } from "./cardWords";
import { type CardChange, JoinCardBody } from "./JoinCard";
import {
    actOf,
    type CardPicks,
    cardsOf,
    DEFAULT_RESULT,
    type JoinCardView,
    newCard,
    pairOf,
    type PendingCard,
    stepCardId,
    toPairOf,
    writeCard,
    writtenFor,
} from "./joinCards";
import { JOIN_WORKSPACE_KEY, READER_EDITS_KEY, SIDE_KEY, WORKSPACE_UNDO_KEY } from "./keys";
import { KeyWords } from "./KeyWords";
import { ReaderEdits } from "./ReaderEdits";
import { StagedRows } from "./StagedFields";
import { EFFECT_COLORS, MATCH_VALUE_COLUMNS, nameOf, rowColumns } from "./tableColumns";
import {
    addStepWords,
    JOIN_WORDS,
    OVERLAP_FILTERS,
    PREVIEW_WORDS,
    refusedWords,
    STAGED_WORDS,
    WORKSPACE_WORDS,
} from "./words";
import { AddStepBody, type CellFilter, CellsPane, FieldsPane, RemoveStrip, TableActions } from "./WorkspaceParts";

/** The element's events after which the workspace reads its draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** Lists, menus and popovers close themselves on Escape: never the workspace too. */
const SELF_CLOSING =
    "[data-portal], [data-popout-portal-container], .mantine-Combobox-dropdown, .mantine-Popover-dropdown";

/** What can take focus over the workspace: lists, menus, popovers, and a dialog of its own. */
const OVER_THE_WORKSPACE = `${SELF_CLOSING}, [role=dialog]:not(.jw-modal), [role=alertdialog]`;

/** The colors of what the commit does, as the header key names them: merged, new, unmatched. */
const [MERGED_COLOR = "#000", NEW_COLOR = "#000", UNTOUCHED_COLOR = "#000"] = DEFAULT_BRANCH_PALETTE;

/** The key's colors, upper case, which no card takes. */
const KEY_COLORS: ReadonlySet<string> = new Set([MERGED_COLOR, NEW_COLOR, UNTOUCHED_COLOR].map((c) => c.toUpperCase()));

/** No elements picked. */
const NO_REFS: readonly SourceElementRef[] = [];

/**
 * A card's id once its step is at a place: a card written here keeps its own, one read from the steps
 * is named by its place.
 * @param card - the card as it was
 * @param step - the place
 * @returns the id
 */
function idAt(card: JoinCardView, step: number): string {
    return card.step !== null && card.id === stepCardId(card.step.index) ? stepCardId(step) : card.id;
}

/**
 * Whether a step has a join card of its own.
 * @param step - the step
 * @returns true when it does
 */
function isCard(step: SourceStepRow): boolean {
    return step.act !== null || step.link !== null || step.extract !== null;
}

/** How many rows a table page reads. */
const PAGE = 200;

/** What the table below the preview lists. */
type TableShows =
    | {
          readonly kind: "values";
          readonly card: string;
          readonly only: (typeof OVERLAP_FILTERS)[number]["value"];
          /** The card's second match, rather than its first. */
          readonly other?: true;
      }
    | { readonly kind: "fields"; readonly card: string }
    | { readonly kind: "rows"; readonly step: number; readonly bucket: string }
    | { readonly kind: "cells"; readonly step: number; readonly column: string; readonly only: CellFilter };

/** The rows picked in the table, for a look and for what the card does with them. */
interface Picked {
    /** What the table listed when they were picked. */
    readonly list: string;
    readonly ids: readonly string[];
    readonly refs: readonly SourceElementRef[];
    readonly keys: readonly SourceCellValue[];
}

/**
 * An Add step's card id: its place, so a card follows its step through undo.
 * @param index - The step's place.
 * @returns The id.
 */
function addCardId(index: number): string {
    return `add:${String(index)}`;
}

/**
 * The mark of an open card's step: its elements at full strength.
 * @param card - the open card, if any
 * @returns the mark, or undefined for no card or a card with no step
 */
function stepMark(card: JoinCardView | undefined): { readonly step: number } | undefined {
    return card?.step === null || card === undefined ? undefined : { step: card.step.index };
}

/**
 * What the table lists for a card the reader has not asked about: the values its two fields match,
 * else the new nodes its step makes, else its fields.
 * @param card - the card, if one is open
 * @returns what it lists
 */
function shownFor(card: JoinCardView | undefined): TableShows | null {
    if (card === undefined) {
        return null;
    }
    if (hasMatch(card)) {
        return { kind: "values", card: card.id, only: "all" };
    }
    const made = card.step?.extract ?? null;
    return card.step === null || made === null
        ? { kind: "fields", card: card.id }
        : { kind: "rows", step: card.step.index, bucket: "newNodes" };
}

/**
 * A card's second match, when its other end names nodes there are.
 * @param card - the card
 * @returns the match, or null
 */
function otherMatch(card: JoinCardView): ReturnType<typeof toPairOf> {
    return card.picks.to?.into?.isNew === true ? null : toPairOf(card.picks);
}

/**
 * A page of a card's value-overlap list, a step card's counted before its own step.
 * @param draft - the open draft
 * @param card - the card, if it is still there
 * @param shows - which of its matches, and which values
 * @param offset - the first value
 * @returns the page; empty while unpicked or refused
 */
function valuesPage(
    draft: SourceDraft,
    card: JoinCardView | undefined,
    shows: Extract<TableShows, { kind: "values" }>,
    offset: number,
): { total: number; values: readonly SourceMatchValue[] } {
    const { only } = shows;
    let pair = null;
    if (card !== undefined) {
        pair = shows.other === true ? otherMatch(card) : pairOf(card.picks);
    }
    if (pair === null || card === undefined) {
        return { total: 0, values: [] };
    }
    try {
        return draft.matchValues(pair, {
            ...(card.step === null ? {} : { before: card.step.index }),
            ignoreCase: card.picks.ignoreCase,
            ignoreSpaces: card.picks.ignoreSpaces,
            ...(only === "all" ? {} : { only }),
            offset,
            limit: PAGE,
        });
    } catch {
        // A pair the draft refuses lists nothing.
        return { total: 0, values: [] };
    }
}

/**
 * The names and reads of a card's two fields, for the Fields view.
 * @param session - the element's session
 * @param draft - the open draft
 * @param card - the card
 * @returns the two sides
 */
function fieldSides(
    session: GraphSession,
    draft: SourceDraft,
    card: JoinCardView,
): { readonly title: string; readonly side: { source?: string; field?: string; space?: string } }[] {
    const { from, into, to, shared = [] } = card.picks;
    if (from !== null && shared.length > 0) {
        return shared.map((field) =>
            card.picks.inRows === true || into === null || into.space === ""
                ? { title: `${nameOf(session, from.source)}.${field}`, side: { source: from.source, field } }
                : {
                      title: intoWords(session, draft, { space: into.space, field }),
                      side: { space: into.space, field },
                  },
        );
    }
    const graphSide = (side: CardPicks["into"]): ReturnType<typeof fieldSides> =>
        side === null || side.isNew === true
            ? []
            : [
                  {
                      title: intoWords(session, draft, side),
                      side:
                          side.source !== undefined && side.field !== undefined
                              ? { source: side.source, field: side.field }
                              : { space: side.space, ...(side.field === undefined ? {} : { field: side.field }) },
                  },
              ];
    const incoming = (field: string | undefined): ReturnType<typeof fieldSides> =>
        from === null || field === undefined
            ? []
            : [{ title: `${nameOf(session, from.source)}.${field}`, side: { source: from.source, field } }];
    return [
        ...graphSide(into),
        ...incoming(from?.field),
        ...(to === undefined || to === null ? [] : [...graphSide(to.into), ...incoming(to.field)]),
    ];
}

/**
 * A card's matches: the values one of them overlaps by, or its fields' profiles.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.shows - what it lists
 * @param props.card - the card, if it is still there
 * @param props.offset - the first value of the page
 * @param props.grid - measures the table
 * @param props.height - the table's height
 * @param props.onShows - changes what it lists, from the top
 * @param props.onRange - asks for the page holding these rows
 * @returns the pane
 */
function ValuesPane({
    session,
    draft,
    shows,
    card,
    offset,
    grid,
    height,
    onShows,
    onRange,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    shows: Extract<TableShows, { kind: "values" | "fields" }>;
    card: JoinCardView | undefined;
    offset: number;
    grid: ReturnType<typeof useBoxSize>["ref"];
    height: number;
    onShows: (shows: TableShows) => void;
    onRange: (start: number, end: number) => void;
}>): React.JSX.Element {
    const view = (
        <SegmentedControl
            size="xs"
            aria-label={WORKSPACE_WORDS.fields}
            value={shows.kind}
            data={[
                { value: "values", label: WORKSPACE_WORDS.values },
                { value: "fields", label: WORKSPACE_WORDS.fields },
            ]}
            onChange={(kind) => {
                onShows(
                    kind === "fields"
                        ? { kind: "fields", card: shows.card }
                        : { kind: "values", card: shows.card, only: "all" },
                );
            }}
        />
    );
    if (shows.kind === "fields") {
        return (
            <div className="jw-table">
                {card !== undefined && hasMatch(card) ? view : null}
                {card === undefined ? null : <FieldsPane draft={draft} sides={fieldSides(session, draft, card)} />}
            </div>
        );
    }
    const page = valuesPage(draft, card, shows, offset);
    const other = card === undefined ? null : otherMatch(card);
    return (
        <div className="jw-table">
            <Group gap={6} wrap="nowrap">
                {view}
                {other === null || card?.picks.from?.field === undefined ? null : (
                    <SegmentedControl
                        size="xs"
                        aria-label={WORKSPACE_WORDS.match}
                        value={shows.other === true ? "other" : "first"}
                        data={[
                            { value: "first", label: card.picks.from.field },
                            { value: "other", label: other.from.field },
                        ]}
                        onChange={(value) => {
                            const { other: _was, ...rest } = shows;
                            onShows(value === "other" ? { ...rest, other: true } : rest);
                        }}
                    />
                )}
                <SegmentedControl
                    size="xs"
                    aria-label={PREVIEW_WORDS.valuesDiffer}
                    value={shows.only}
                    data={OVERLAP_FILTERS.map((each) => ({ ...each }))}
                    onChange={(only) => {
                        onShows({ ...shows, only: only as typeof shows.only });
                    }}
                />
            </Group>
            <div ref={grid} className="jw-table-grid">
                <DataTable<SourceMatchValue>
                    key={`${shows.card}:${shows.only}:${String(shows.other)}`}
                    label={JOIN_WORDS.values}
                    rowHeight={PANEL_GRID.ROW_PITCH}
                    headerHeight={PANEL_GRID.ROW_PITCH}
                    data={page.values}
                    rowCount={page.total}
                    rowOffset={offset}
                    onRangeChange={onRange}
                    columns={MATCH_VALUE_COLUMNS}
                    getRowId={(row) => `${typeof row.value}:${String(row.value)}`}
                    height={height}
                    selectionMode="none"
                />
            </div>
        </div>
    );
}

/**
 * The table below the preview, for looking only: a match's value overlap or its fields' profiles, the
 * rows behind one count of a step, or the cells of one Values differ column. The card says what can be
 * done with the rows picked in it.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.shows - what it lists
 * @param props.cards - the cards
 * @param props.picked - the rows picked in it
 * @param props.onShows - changes what it lists
 * @param props.onPick - takes the rows picked
 * @returns the table
 */
function TablePane({
    session,
    draft,
    shows,
    cards,
    picked,
    onShows,
    onPick,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    shows: TableShows | null;
    cards: readonly JoinCardView[];
    picked: readonly string[];
    onShows: (shows: TableShows) => void;
    onPick: (picked: Omit<Picked, "list">) => void;
}>): React.JSX.Element | null {
    // on reload: fresh: pointer: the page of a list opened for a look
    const [offset, setOffset] = useState(0);
    const grid = useBoxSize();
    const height = Math.max(PANEL_GRID.ROW_PITCH * 4, grid.height);
    if (shows === null) {
        return <div className="jw-table" />;
    }
    const range = (start: number, end: number): void => {
        if (start < offset || end > offset + PAGE) {
            setOffset(Math.max(0, start - PAGE / 4));
        }
    };
    if (shows.kind === "cells") {
        const step = draft.steps().find((each) => each.index === shows.step);
        return step === undefined ? (
            <div className="jw-table" />
        ) : (
            <div ref={grid.ref} className="jw-table-grid">
                <CellsPane
                    session={session}
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
                        onPick({ ids, refs, keys: [] });
                    }}
                />
            </div>
        );
    }
    if (shows.kind === "values" || shows.kind === "fields") {
        return (
            <ValuesPane
                session={session}
                draft={draft}
                shows={shows}
                card={cards.find((each) => each.id === shows.card)}
                offset={offset}
                grid={grid.ref}
                height={height}
                onShows={(next) => {
                    setOffset(0);
                    onShows(next);
                }}
                onRange={range}
            />
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
        <div className="jw-table">
            <div ref={grid.ref} className="jw-table-grid">
                <DataTable<SourceDraftRow>
                    key={`${String(shows.step)}:${shows.bucket}`}
                    label={WORKSPACE_WORDS.rows}
                    rowHeight={PANEL_GRID.ROW_PITCH}
                    headerHeight={PANEL_GRID.ROW_PITCH}
                    data={rows.rows}
                    rowCount={rows.total}
                    rowOffset={offset}
                    onRangeChange={range}
                    columns={rowColumns(session, rows.rows)}
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
                            keys: [...new Set(now.flatMap((row) => (row.key === null ? [] : [row.key])))],
                        });
                    }}
                />
            </div>
        </div>
    );
}

/**
 * The join workspace (issue #9796, behind the source-steps experiment): a near-full-screen modal
 * built like the selection workspace, with one card per join on the left, the graph preview over
 * the data table on the right. One source draft holds every card; nothing reaches the graph until
 * Done, which commits them all as one undo step; Cancel (Esc) throws the draft away.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.how - how it opened: the first card's staged source or node 1 type, or a removal
 * @returns the modal, drawn over the canvas column
 */
function JoinWorkspace({
    session,
    how,
}: Readonly<{ session: GraphSession; how: JoinWorkspaceOpen }>): React.JSX.Element | null {
    const { store, element } = useWorkspace();
    const titleId = useId();
    const box = useRef<HTMLDialogElement>(null);
    // on reload: fresh: in flight: the draft being edited; autosave keeps it, and the next opening picks it up
    const [opened, setOpened] = useState<{ readonly draft: SourceDraft | null } | null>(null);
    const draft = opened?.draft ?? null;
    const nextId = useRef(0);
    // on reload: fresh: in flight: picks of cards with no step yet, which the closed workspace drops
    const [pending, setPending] = useState<readonly PendingCard[]>([]);
    // on reload: fresh: pointer: the card opened for a look
    const [open, setOpen] = useState<string | null>(null);
    // on reload: fresh: pointer: what the table lists for a look
    const [shows, setShows] = useState<TableShows | null>(null);
    // Opened after the first render: opening a draft tells every listener, which must not happen while rendering.
    // Once: StrictMode's development-only rerun must not open it a second time over the first.
    const openedOnce = useRef(false);
    useEffect(() => {
        if (openedOnce.current) {
            return;
        }
        openedOnce.current = true;
        try {
            // An open draft (from any door, or brought back by a reload) is adopted; a new one asks
            // the key-overlap question when a staged source is added as it is.
            const adopted = session.data.currentDraft();
            const opening = adopted ?? session.data.draft({ askOverlap: true });
            // The draft holds the removal from here: a reload opens on the draft, undone or not.
            if (how.remove !== undefined && opening.steps().some((step) => step.source === how.remove)) {
                opening.removeSource(how.remove);
            }
            const made = cardsOf(opening, []);
            const used = new Set(opening.steps().map((step) => step.source));
            const staged = session.data.staged().findLast((each) => !used.has(each.key));
            // With nothing staged and no join yet, the newest source's own rows can still be split
            // into nodes or linked.
            const newest = adopted === null && made.length === 0 ? session.data.sources().at(-1) : undefined;
            const source = how.source ?? (staged ?? newest)?.key;
            const into = how.into === undefined ? null : { space: how.into };
            const first =
                how.remove !== undefined || (source === undefined && into === null)
                    ? []
                    : [newCard(opening, "new:0", source, into)];
            setPending(first);
            setOpen(first.at(0)?.id ?? (adopted === null ? undefined : made.at(-1)?.id) ?? null);
            setOpened({ draft: opening });
            // The draft holds it from here: a reload opens the workspace on the draft as it is.
            store.set({ joinWorkspace: {} });
        } catch (error) {
            setOpened({ draft: null });
            store.set({ notice: { message: refusedWords(error), error: true }, joinWorkspace: false });
        }
    }, [session, how, store]);
    // on reload: fresh: pointer: the Add cards that ask a question, folded for a look
    const [foldedAdds, setFoldedAdds] = useState<ReadonlySet<string>>(new Set());
    // on reload: fresh: pointer: the Reader edits list opened for a look
    const [editsOpen, setEditsOpen] = useState(false);
    // on reload: fresh: in flight: an other end picked on a written card before both its field and type are
    const [pendingTo, setPendingTo] = useState<Readonly<Partial<Record<string, CardPicks["to"]>>>>({});
    // on reload: fresh: in flight: the refusal each card last met, drawn on it
    const [errors, setErrors] = useState<Readonly<Partial<Record<string, string>>>>({});
    // on reload: fresh: pointer: the rows picked for a look
    const [pickedRows, setPickedRows] = useState<Picked | null>(null);
    // on reload: fresh: pointer: the preview's look, picked for a look
    const [colors, setColors] = useState(true);
    // on reload: fresh: in flight: the first drawing of the draft
    const [drawing, setDrawing] = useState(true);
    const version = useSessionEvents(session, DRAFT_EVENTS);
    const frame = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ws-body");
    usePreviewCanvas(draft !== null, box, frame);

    // The draft is drawn After while the workspace is open; closing by any door throws it away.
    // Decided a microtask later: StrictMode's development-only rerun mounts the workspace again
    // first, and must find its draft still open (as the selection workspace does).
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        if (draft === null) {
            return undefined;
        }
        void draft.display(true).then(() => {
            setDrawing(false);
        });
        return () => {
            mounted.current = false;
            queueMicrotask(() => {
                if (!mounted.current && draft.open) {
                    draft.dispose();
                }
            });
        };
    }, [draft]);

    const close = (): void => {
        store.set({ joinWorkspace: false });
    };
    const live = draft?.open === true;
    // The workspace is modal: its keys work from the moment it opens, whatever an undo or a deleted card
    // took focus away with. Checked after every render, and whenever focus moves.
    const opener = useRef<Element | null>(null);
    useEffect(() => {
        if (!live) {
            return undefined;
        }
        const keep = (): void => {
            const now = document.activeElement;
            const inside = box.current?.contains(now) === true || now?.closest(OVER_THE_WORKSPACE) !== null;
            if (box.current !== null && !inside) {
                box.current.focus();
            }
        };
        opener.current ??= document.activeElement;
        keep();
        document.addEventListener("focusin", keep);
        return () => {
            document.removeEventListener("focusin", keep);
        };
    });
    useEffect(
        () => () => {
            // Closed, focus goes back where the workspace was opened from.
            if (opener.current instanceof HTMLElement && focusIsLost()) {
                opener.current.focus();
            }
        },
        [],
    );
    // A draft gone by another door (a project opened, the graph cleared) closes the workspace.
    useEffect(() => {
        if (draft !== null && !live) {
            store.set({ joinWorkspace: false });
        }
    }, [draft, live, version, store]);

    const cards = live ? cardsOf(draft, pending) : [];
    // The steps that add a staged source as it is: a card each, read-only but for its questions.
    // A join step that adds its own staged source shows on its own card, not as an Add card too.
    const addSteps = live
        ? draft
              .steps()
              .filter(
                  (step, _at, all) =>
                      step.op === "join.add" && !all.some((other) => isCard(other) && other.source === step.source),
              )
        : [];
    // Cards never take the key's colors, so a color names either a card or what the commit does.
    const palette = (session.scope.options.branchPalette ?? cardPalette(session.catalog.palettes())).filter(
        (color) => !KEY_COLORS.has(color.toUpperCase()),
    );
    const colorOf = (at: number): string => palette[at % Math.max(1, palette.length)] ?? MERGED_COLOR;
    // A card an undo took back is drawn again with its picks: it is the open one.
    const openAdd = addSteps.map((step) => addCardId(step.index)).find((id) => id === open);
    const openCard =
        openAdd === undefined
            ? (cards.find((card) => card.id === open) ?? cards.find((card) => card.step === null))
            : undefined;

    // The table lists what the reader asked for, else the open card's values.
    const listed = shows?.kind === "values" && !cards.some((card) => card.id === shows.card) ? null : shows;
    const tableShows = listed ?? shownFor(openCard);
    // Rows picked in another list are not this one's.
    const list = JSON.stringify(tableShows);
    const rowsPicked = pickedRows?.list === list ? pickedRows : null;
    const marked = rowsPicked?.refs ?? NO_REFS;

    // The preview: each card's step in its color, the open card or the picked rows at full strength.
    useEffect(() => {
        if (!live || !colors) {
            return undefined;
        }
        const steps = cards.flatMap((card, at) =>
            card.step === null ? [] : [{ step: card.step.index, color: colorOf(at) }],
        );
        const mark = marked.length > 0 ? { refs: marked } : stepMark(openCard);
        const view = session.styles.showDraft({
            merged: MERGED_COLOR,
            new: NEW_COLOR,
            untouched: UNTOUCHED_COLOR,
            steps,
            ...(mark === undefined ? {} : { mark }),
        });
        return () => {
            view.end();
        };
        // The view reads the draft when shown: it is shown again after every draft change.
    }, [live, colors, version, open, marked, session]); // eslint-disable-line react-hooks/exhaustive-deps -- cards and colors are read from the draft, which `version` follows

    if (draft === null || !live || frame === null) {
        return null;
    }

    // A refusal is drawn on the card that met it, never behind the modal; with no card, in the header.
    const noticeOn =
        (id: string) =>
        (error: unknown): void => {
            setErrors((now) => ({ ...now, [id]: refusedWords(error) }));
        };
    const change: CardChange = (card, picks, result) => {
        const notice = noticeOn(card.id);
        setErrors(({ [card.id]: _was, ...rest }) => rest);
        // "+ Match" on a written card: the other end waits on the card until both its field and its
        // type are picked, then the step is written with it.
        const waiting =
            card.step !== null && picks.becomes === "node" && (picks.to ?? null) !== null && toPairOf(picks) === null;
        setPendingTo(({ [card.id]: _was, ...rest }) => (waiting ? { ...rest, [card.id]: picks.to } : rest));
        if (waiting && result === card.result) {
            return;
        }
        const write = waiting ? { ...picks, to: null } : picks;
        const at = card.step?.index ?? null;
        const act = actOf(write, result ?? DEFAULT_RESULT, card.step);
        const keep = (id: string): void => {
            // A step card going back to picks is no longer the card that wrote the step.
            const was = at === null ? pending.find((each) => each.id === card.id) : undefined;
            const next: PendingCard = {
                id,
                picks,
                guess: card.guess,
                suggested: card.suggested && picks === card.picks,
                ...(was?.written === undefined ? {} : { written: was.written }),
            };
            // A step card going back to picks takes the written card behind it along.
            setPending((now) => [
                ...now.filter((each) => each.id !== card.id && !(at !== null && writtenFor(each, card))),
                next,
            ]);
            setOpen(id);
        };
        if (act === null) {
            // Only picks: a step card whose match is unpicked goes back to a pending card.
            if (at !== null) {
                try {
                    draft.removeStep(at, { adds: "remove" });
                } catch (error) {
                    notice(error);
                    return;
                }
            }
            keep(at === null ? card.id : `new:${String(++nextId.current)}`);
            return;
        }
        try {
            const step = writeCard(draft, card.step, act);
            // The step reads back as the element names it (a staged source by its new space).
            const made = cardsOf(draft, []).find((each) => each.step?.index === step)?.picks ?? write;
            // Kept, written: an undo that takes the step back draws the card again, as it was before
            // the pick that wrote it. A step card
            // rewritten with other picks carries its written card's picks along, so that card
            // is never drawn again beside it.
            setPending((now) =>
                now.map((each) =>
                    each.id === card.id || (at !== null && writtenFor(each, card))
                        ? { ...each, written: [...(each.written ?? []), write, made] }
                        : each,
                ),
            );
            const id = idAt(card, step);
            setOpen(id);
            setShows((now) => (now?.kind === "values" && now.card === card.id ? { ...now, card: id } : now));
        } catch (error) {
            // What was picked stays on the card, beside why it was refused.
            if (at === null) {
                keep(card.id);
            }
            notice(error);
        }
    };
    const patch = (step: number, edit: SourceStepPatch): void => {
        try {
            draft.editStep(step, edit);
        } catch (error) {
            noticeOn(cards.find((each) => each.step?.index === step)?.id ?? "")(error);
        }
    };
    const addCard = (): void => {
        const id = `new:${String(++nextId.current)}`;
        const source = session.data.staged().at(-1) ?? session.data.sources().at(-1);
        setPending((now) => [...now, newCard(draft, id, source?.key)]);
        setOpen(id);
    };
    const removeCard = (id: string): void => {
        const card = cards.find((each) => each.id === id);
        const index = card?.step?.index ?? addSteps.find((step) => addCardId(step.index) === id)?.index;
        if (index !== undefined) {
            try {
                // A join's card takes back the sources its join added too.
                draft.removeStep(index, { adds: card === undefined ? "keep" : "remove" });
            } catch (error) {
                noticeOn(id)(error);
                return;
            }
        }
        // Only a step card takes the written card behind it along (an undo of the deletion brings it back
        // behind its step); unfinished cards stay.
        setPending((now) =>
            now
                .filter((each) => each.id !== id || (card !== undefined && writtenFor(each, card)))
                .map((each) => (card !== undefined && writtenFor(each, card) ? { ...each, deleted: true } : each)),
        );
    };
    const undo = (): void => {
        draft.undo();
        const back = cardsOf(draft, []);
        setPending((now) =>
            now.map(({ deleted, ...each }) =>
                deleted === true && !back.some((card) => writtenFor(each, card)) ? { ...each, deleted } : each,
            ),
        );
        setPickedRows(null);
    };
    const { side } = draft;
    const toggleSide = (): void => {
        void draft.show(side === "after" ? "before" : "after");
    };
    const cancel = (): void => {
        draft.dispose();
        close();
    };
    const done = (): void => {
        void commitWorkspace(store, session, draft, noticeOn("")).then((ok) => {
            if (ok) {
                close();
            }
        });
    };
    const frameMarked = (): void => {
        const step = stepMark(openCard)?.step;
        let ids = null;
        if (marked.length > 0) {
            ids = draft.preview().ids({ refs: marked });
        } else if (step !== undefined) {
            ids = draft.preview().ids({ step, bucket: "merged" });
        }
        if (ids !== null && ids.nodes.length > 0) {
            void element?.zoomToNodes([...ids.nodes]);
        }
    };

    const keys = (event: React.KeyboardEvent<HTMLElement>): void => {
        const target = event.target as HTMLElement;
        if (event.key === "Escape") {
            if (
                event.defaultPrevented ||
                target.closest(SELF_CLOSING) !== null ||
                target.matches("[aria-expanded=true]")
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            cancel();
            return;
        }
        if (isTypingTarget(target)) {
            return;
        }
        const bound: readonly (readonly [string, () => void])[] = [
            [WORKSPACE_UNDO_KEY, undo],
            [JOIN_WORKSPACE_KEY, addCard],
            [SIDE_KEY, toggleSide],
            [
                READER_EDITS_KEY,
                () => {
                    setEditsOpen((now) => !now);
                },
            ],
        ];
        const run = bound.find(([combo]) => matchesKey(event, combo))?.[1] ?? null;
        if (run !== null) {
            event.preventDefault();
            event.stopPropagation();
            run();
        }
    };

    const { marks, sources: draftSources } = draft.preview();
    const removed = draftSources.filter((each) => each.state === "removed");
    // The key names each effect by the mark the preview draws for it (a ring, a dashed border, a
    // dotted border), in the color it takes outside a card's own color.
    const keyItems = [
        { id: "merged", color: MERGED_COLOR, label: WORKSPACE_WORDS.nodesMerged, count: marks.nodes.merged },
        { id: "new", color: NEW_COLOR, label: WORKSPACE_WORDS.nodesNew, count: marks.nodes.new },
        { id: "edges", color: NEW_COLOR, label: WORKSPACE_WORDS.edgesNew, count: marks.edges.new },
        ...(marks.edges.merged === 0
            ? []
            : [
                  {
                      id: "edges-merged",
                      color: MERGED_COLOR,
                      label: WORKSPACE_WORDS.edgesMerged,
                      count: marks.edges.merged,
                  },
              ]),
        { id: "untouched", color: UNTOUCHED_COLOR, label: WORKSPACE_WORDS.untouched, count: marks.nodes.untouched },
        ...(
            [
                ["nodes-removed", WORKSPACE_WORDS.nodesRemoved, marks.nodes.removed],
                ["edges-removed", WORKSPACE_WORDS.edgesRemoved, marks.edges.removed],
            ] as const
        ).flatMap(([id, label, count]) => (count === 0 ? [] : [{ id, color: "inherit", label, count }])),
    ];
    const items: CardListItem[] = cards.map((shown, at) => {
        const waitingTo = pendingTo[shown.id];
        const card: JoinCardView =
            waitingTo === undefined || (shown.picks.to ?? null) !== null
                ? shown
                : { ...shown, picks: { ...shown.picks, to: waitingTo } };
        // A card joining a staged source not yet in the draft says how its rows are read, and can add
        // it as it is.
        const staged = session.data
            .staged()
            .find(
                (each) =>
                    each.key === card.picks.from?.source && !draft.steps().some((step) => step.source === each.key),
            );
        const title = cardTitle(session, card);
        const words = cardActWords(card);
        return {
            id: card.id,
            title: words === undefined ? title : `${title} -> ${words}`,
            ...(colors ? { color: colorOf(at) } : {}),
            summary: (
                <Text size="xs" c="dimmed" className="jw-summary">
                    {cardSummary(session, draft, card)}
                </Text>
            ),
            data: { "data-join-card": card.id },
            children: (
                <JoinCardBody
                    session={session}
                    draft={draft}
                    card={card}
                    onChange={change}
                    error={errors[card.id]}
                    tableActions={
                        card.step !== null &&
                        (tableShows?.kind === "rows" || tableShows?.kind === "cells") &&
                        tableShows.step === card.step.index ? (
                            <TableActions
                                draft={draft}
                                step={card.step}
                                column={tableShows.kind === "cells" ? tableShows.column : null}
                                keys={rowsPicked?.keys ?? []}
                                refs={rowsPicked?.refs ?? []}
                                onDone={() => {
                                    setPickedRows(null);
                                }}
                                onError={noticeOn(card.id)}
                            />
                        ) : null
                    }
                    readSettings={
                        staged === undefined || card.step !== null ? null : (
                            <fieldset className="ss-field jw-read" aria-label={WORKSPACE_WORDS.readSettings}>
                                <ControlSection label={STAGED_WORDS.rowsAre} defaultOpened={false}>
                                    <StagedRows
                                        session={session}
                                        reader={draft}
                                        source={staged}
                                        full
                                        write={(next) => {
                                            try {
                                                draft.setMapping(staged.key, next);
                                            } catch (error) {
                                                noticeOn(card.id)(error);
                                            }
                                        }}
                                    />
                                </ControlSection>
                                <Group>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        onClick={() => {
                                            try {
                                                draft.add(staged.key);
                                                removeCard(card.id);
                                                // The pressed button goes with its card: keys stay in the workspace.
                                                box.current?.focus();
                                            } catch (error) {
                                                noticeOn(card.id)(error);
                                            }
                                        }}
                                    >
                                        {WORKSPACE_WORDS.addAsIs}
                                    </Button>
                                </Group>
                            </fieldset>
                        )
                    }
                    onPatch={patch}
                    onFocusValues={() => {
                        if (hasMatch(card) && (tableShows?.kind !== "values" || tableShows.card !== card.id)) {
                            setShows({ kind: "values", card: card.id, only: "all" });
                        }
                    }}
                    onShowCells={(step, column) => {
                        setShows({ kind: "cells", step, column, only: "all" });
                    }}
                    onShowRows={(step, bucket) => {
                        setShows({ kind: "rows", step, bucket });
                    }}
                />
            ),
        };
    });
    // Each Add step is a card too, so every step the draft holds is visible: its questions and counts.
    const asked = new Set(draft.preview().questions.map((question) => question.params.source));
    const addItems: CardListItem[] = addSteps.map((step) => {
        const id = addCardId(step.index);
        const name = nameOf(session, step.source);
        const error = errors[id];
        return {
            id,
            title: `${name} -> ${WORKSPACE_WORDS.added}`,
            summary: (
                <Text size="xs" c="dimmed" truncate>
                    {addStepWords(step)}
                </Text>
            ),
            data: { "data-join-card": id },
            children: (
                <Stack gap={4} className="jw-card">
                    <AddStepBody
                        draft={draft}
                        step={step}
                        spaceName={(space) => spaceName(session, draft, space)}
                        onError={noticeOn(id)}
                    />
                    {error === undefined ? null : (
                        <Text size="xs" c="red" role="alert">
                            {error}
                        </Text>
                    )}
                </Stack>
            ),
        };
    });
    // An Add card that asks a question is open until it is answered or the reader folds it; any
    // other card is open one at a time.
    const asks = new Set(addSteps.filter((step) => asked.has(step.source)).map((step) => addCardId(step.index)));
    const isOpen = (id: string): boolean => (asks.has(id) ? !foldedAdds.has(id) : id === (openAdd ?? openCard?.id));
    const ids = [...addItems, ...items].map((item) => item.id);

    return createPortal(
        <>
            <div className="sel-ws-scrim" aria-hidden />
            <dialog // eslint-disable-line jsx-a11y/no-noninteractive-element-interactions -- only catches keys bubbling from its own controls
                ref={box}
                open
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="sel-ws sel-modal jw-modal"
                onKeyDown={keys}
            >
                <header className="sel-ws-head">
                    <Text size="sm" fw={600} className="sel-ws-title" id={titleId}>
                        {WORKSPACE_WORDS.title}
                    </Text>
                    {keyItems.map((each) => (
                        <Group key={each.id} gap={4} wrap="nowrap" aria-label={`${each.label} ${String(each.count)}`}>
                            <span
                                className="jw-key-mark"
                                data-mark={each.id}
                                style={{ color: each.color }}
                                aria-hidden
                            />
                            <Text size="xs">{`${each.label} ${formatNumber(each.count)}`}</Text>
                        </Group>
                    ))}
                    {drawing ? (
                        <Group gap={4} wrap="nowrap" data-drawing="">
                            <Loader size={12} aria-hidden />
                            <Text size="sm" c="dimmed" span>
                                {WORKSPACE_WORDS.drawing}
                            </Text>
                        </Group>
                    ) : null}
                    <span className="sel-spacer" />
                    <SegmentedControl
                        size="xs"
                        aria-label={WORKSPACE_WORDS.preview}
                        value={colors ? "colors" : "styled"}
                        data={[
                            { value: "colors", label: WORKSPACE_WORDS.cardColors },
                            { value: "styled", label: WORKSPACE_WORDS.styled },
                        ]}
                        onChange={(value) => {
                            setColors(value === "colors");
                        }}
                    />
                    <SegmentedControl
                        size="xs"
                        aria-label={PREVIEW_WORDS.beforeAfter}
                        aria-keyshortcuts={ariaKey(SIDE_KEY)}
                        value={side}
                        data={[
                            { value: "before", label: PREVIEW_WORDS.before },
                            {
                                value: "after",
                                label: (
                                    <Group gap={4} wrap="nowrap" component="span">
                                        {`${PREVIEW_WORDS.after} `}
                                        <KeyWords combo={SIDE_KEY} />
                                    </Group>
                                ),
                            },
                        ]}
                        onChange={(value) => {
                            void draft.show(value === "before" ? "before" : "after");
                        }}
                    />
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-keyshortcuts={ariaKey(WORKSPACE_UNDO_KEY)}
                        rightSection={<KeyWords combo={WORKSPACE_UNDO_KEY} />}
                        onClick={undo}
                    >
                        {WORKSPACE_WORDS.undo}
                    </Button>
                    <span className="sel-ws-gap" />
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-keyshortcuts="Escape"
                        rightSection={<KeyWords combo="Escape" />}
                        onClick={cancel}
                    >
                        {WORKSPACE_WORDS.cancel}
                    </Button>
                    <Button size="compact-xs" onClick={done}>
                        {WORKSPACE_WORDS.done}
                    </Button>
                </header>
                <div className="sel-ws-body">
                    <div className="sel-ws-cards">
                        {removed.map(({ source }) => (
                            <RemoveStrip key={source} session={session} draft={draft} source={source} />
                        ))}
                        <CardList
                            label={WORKSPACE_WORDS.matches}
                            items={[...addItems, ...items]}
                            autoFold
                            folded={new Set(ids.filter((id) => !isOpen(id)))}
                            onFoldedChange={(folded) => {
                                setFoldedAdds(new Set([...asks].filter((id) => folded.has(id))));
                                // The card the reader just unfolded, else whichever is left open.
                                const unfolded = ids.filter((id) => !asks.has(id) && !folded.has(id));
                                const next = unfolded.find((id) => !isOpen(id)) ?? unfolded.at(0) ?? null;
                                if (next !== open) {
                                    // Another card's rows are not this one's.
                                    setShows(null);
                                }
                                setOpen(next);
                                setPickedRows(null);
                            }}
                            onRemove={removeCard}
                            add={
                                <Button
                                    size="compact-xs"
                                    variant="subtle"
                                    aria-keyshortcuts={ariaKey(JOIN_WORKSPACE_KEY)}
                                    rightSection={<KeyWords combo={JOIN_WORKSPACE_KEY} />}
                                    onClick={addCard}
                                >
                                    {`+ ${WORKSPACE_WORDS.addJoin}`}
                                </Button>
                            }
                        />
                        <ReaderEdits
                            session={session}
                            draft={draft}
                            open={editsOpen}
                            onToggle={() => {
                                setEditsOpen((now) => !now);
                            }}
                            onError={noticeOn("")}
                        />
                        {errors[""] === undefined ? null : (
                            <Text size="xs" c="red" role="alert">
                                {errors[""]}
                            </Text>
                        )}
                    </div>
                    <div className="sel-ws-center" data-strip="">
                        <div className="sel-ws-preview" />
                        <Stack gap={4} className="jw-lower">
                            <Group gap={6} justify="flex-end">
                                <Button size="compact-xs" variant="subtle" onClick={frameMarked}>
                                    {WORKSPACE_WORDS.frame}
                                </Button>
                            </Group>
                            <TablePane
                                session={session}
                                draft={draft}
                                shows={tableShows}
                                cards={cards}
                                picked={rowsPicked?.ids ?? []}
                                onShows={setShows}
                                onPick={(next) => {
                                    setPickedRows({ ...next, list });
                                }}
                            />
                        </Stack>
                    </div>
                </div>
            </dialog>
        </>,
        frame,
    );
}

/**
 * The join workspace while the store says it is open and the source-steps experiment is on.
 * @returns the workspace, or nothing
 */
export function JoinWorkspaceHost(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.joinWorkspace);
    return opened !== false && session !== null && sourceStepsOn(session) ? (
        <JoinWorkspace session={session} how={opened} />
    ) : null;
}
