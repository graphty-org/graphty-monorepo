import "../selection/selection.css";
import "./source-steps.css";

import {
    CardList,
    type CardListItem,
    ComboInput,
    DataTable,
    PANEL_GRID,
    SegmentedControl,
} from "@graphty/compact-mantine";
import {
    DEFAULT_BRANCH_PALETTE,
    type GraphSession,
    type SourceDraft,
    type SourceDraftRow,
    type SourceElementRef,
    type SourceMatchValue,
    type SourceStepRow,
} from "@graphty/graphty-element/session";
import { Badge, Button, ColorSwatch, Group, Kbd, Loader, Radio, Stack, Switch, Text } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { sourceName } from "../data-place/words";
import { sourceStepsOn } from "../features";
import { formatNumber } from "../inspector/words";
import { ariaKey, formatKey, isTypingTarget, matchesKey } from "../keys/keys";
import { cardPalette } from "../selection/cardPalette";
import { usePreviewCanvas } from "../selection/previewCanvas";
import { useSessionEvents } from "../sessionEvents";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { commitWorkspace } from "./actions";
import { edgeTypeChoices, spaceChoices } from "./join";
import { Pick } from "./JoinCard";
import {
    type CardInto,
    type CardPicks,
    type CardResult,
    cardsOf,
    countsOf,
    DEFAULT_RESULT,
    draftColumns,
    type JoinCardView,
    newCard,
    pairOf,
    type PendingCard,
    samePicks,
    stepCardId,
    writeCard,
} from "./joinCards";
import { JOIN_WORKSPACE_KEY, SIDE_KEY, WORKSPACE_UNDO_KEY } from "./keys";
import { EFFECT_COLORS, MATCH_VALUE_COLUMNS, rowColumns } from "./tableColumns";
import {
    BUCKET_WORDS,
    JOIN_WORDS,
    moreWords,
    OVERLAP_FILTERS,
    PREVIEW_WORDS,
    refusedWords,
    WORKSPACE_WORDS,
} from "./words";

/** The element's events after which the workspace reads its draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** Lists, menus and popovers close themselves on Escape: never the workspace too. */
const SELF_CLOSING =
    "[data-portal], [data-popout-portal-container], .mantine-Combobox-dropdown, .mantine-Popover-dropdown";

/** How many rows a table page reads. */
const PAGE = 200;

/** Field 1's Field value for the space's own key. */
const KEY_VALUE = "key";

/** What the table below the preview lists. */
type TableShows =
    | { readonly kind: "values"; readonly card: string; readonly only: (typeof OVERLAP_FILTERS)[number]["value"] }
    | { readonly kind: "rows"; readonly step: number; readonly bucket: string };

/** Updates one card's picks or result. */
type CardChange = (card: JoinCardView, picks: CardPicks, result: CardResult | null) => void;

/**
 * One match row: the field in the graph, the incoming field, the live count and the matching
 * switches, all read from the open draft.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card
 * @param props.onChange - writes the card
 * @param props.onFocusValues - puts the match's value list in the table
 * @returns the row
 */
function MatchRow({
    session,
    draft,
    card,
    onChange,
    onFocusValues,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    card: JoinCardView;
    onChange: CardChange;
    onFocusValues: () => void;
}>): React.JSX.Element {
    const { picks } = card;
    const sources = [...session.data.staged(), ...session.data.sources()];
    const spaces = spaceChoices(session);
    const supplying = session.data.spaces().find((row) => row.space === picks.into?.space)?.sources ?? [];
    const intoFields = [
        { value: KEY_VALUE, label: JOIN_WORDS.key },
        ...supplying.flatMap((key) =>
            draftColumns(draft, key, "nodes").map((column) => ({
                value: JSON.stringify([key, column]),
                label: column,
            })),
        ),
    ];
    const intoValue =
        picks.into?.source === undefined || picks.into.field === undefined
            ? KEY_VALUE
            : JSON.stringify([picks.into.source, picks.into.field]);
    const counts = countsOf(draft, picks);
    const set = (patch: Partial<CardPicks>): void => {
        onChange(card, { ...picks, ...patch }, card.result);
    };
    const toggles = [
        { id: "ignoreCase", label: "Aa", on: picks.ignoreCase, more: counts?.moreWithIgnoreCase ?? null },
        { id: "ignoreSpaces", label: "__", on: picks.ignoreSpaces, more: counts?.moreWithIgnoreSpaces ?? null },
    ] as const;
    return (
        <div className="ss-field" onFocusCapture={onFocusValues}>
            <Group gap={4} wrap="nowrap">
                <Pick
                    name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.source.toLowerCase()}`}
                    data={sources.map((source) => ({ value: source.key, label: sourceName(source) }))}
                    value={picks.from?.source ?? null}
                    onPick={(source) => {
                        set({ from: { source } });
                    }}
                />
                <Pick
                    name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.field.toLowerCase()}`}
                    data={
                        picks.from === null
                            ? []
                            : draftColumns(draft, picks.from.source).map((column) => ({ value: column, label: column }))
                    }
                    value={picks.from?.field ?? null}
                    onPick={(field) => {
                        if (picks.from !== null) {
                            set({ from: { source: picks.from.source, field } });
                        }
                    }}
                />
            </Group>
            <Group gap={4} wrap="nowrap">
                <Pick
                    name={`${WORKSPACE_WORDS.inGraph} ${JOIN_WORDS.type.toLowerCase()}`}
                    data={spaces}
                    value={picks.into?.space ?? null}
                    onPick={(space) => {
                        set({ into: { space } });
                    }}
                />
                <Pick
                    name={`${WORKSPACE_WORDS.inGraph} ${JOIN_WORDS.field.toLowerCase()}`}
                    data={picks.into === null ? [] : intoFields}
                    value={picks.into === null ? null : intoValue}
                    onPick={(value) => {
                        if (picks.into === null) {
                            return;
                        }
                        if (value === KEY_VALUE) {
                            set({ into: { space: picks.into.space } });
                            return;
                        }
                        const [source, field] = JSON.parse(value) as [string, string];
                        const into: CardInto = { space: picks.into.space, source, field };
                        set({ into });
                    }}
                />
            </Group>
            <Group gap={8} wrap="wrap">
                {counts === null ? null : (
                    <Text size="xs" fw={600} aria-label={WORKSPACE_WORDS.matchCount}>
                        {`${formatNumber(counts.matched)} / ${formatNumber(counts.matched + counts.only2)}`}
                    </Text>
                )}
                {toggles.map((toggle) => {
                    const more = moreWords(toggle.more);
                    return (
                        <Switch
                            key={toggle.id}
                            size="xs"
                            aria-label={toggle.id === "ignoreCase" ? JOIN_WORDS.ignoreCase : JOIN_WORDS.ignoreSpaces}
                            label={more === null ? toggle.label : `${toggle.label} ${more}`}
                            checked={toggle.on}
                            onChange={(event) => {
                                set({ [toggle.id]: event.currentTarget.checked });
                            }}
                        />
                    );
                })}
                {card.suggested ? (
                    <Badge size="xs" variant="light">
                        {WORKSPACE_WORDS.suggested}
                    </Badge>
                ) : null}
            </Group>
        </div>
    );
}

/**
 * A two-way choice as a compact row: its label, then a segmented control.
 * @param props - Component props
 * @param props.label - the choice's name
 * @param props.value - the choice now
 * @param props.data - the two ways
 * @param props.onChange - takes a choice
 * @returns the row
 */
function Choice({
    label,
    value,
    data,
    onChange,
}: Readonly<{
    label: string;
    value: string;
    data: readonly { readonly value: string; readonly label: string }[];
    onChange: (value: string) => void;
}>): React.JSX.Element {
    return (
        <Group gap={6} wrap="nowrap" justify="space-between">
            <Text size="xs" c="dimmed">
                {label}
            </Text>
            <SegmentedControl
                size="xs"
                aria-label={label}
                value={value}
                data={data.map((each) => ({ ...each }))}
                onChange={onChange}
            />
        </Group>
    );
}

/**
 * The picked result's options, one compact row each.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card, with a result
 * @param props.result - its result
 * @param props.onChange - writes the card
 * @returns the rows
 */
function Options({
    session,
    card,
    result,
    onChange,
}: Readonly<{
    session: GraphSession;
    card: JoinCardView;
    result: CardResult;
    onChange: CardChange;
}>): React.JSX.Element {
    const set = (patch: Partial<CardResult>): void => {
        onChange(card, card.picks, { ...result, ...patch });
    };
    if (result.result === "merge") {
        return (
            <Stack gap={4}>
                <Choice
                    label={WORKSPACE_WORDS.manyRows}
                    value={result.repeated}
                    data={[
                        { value: "first", label: WORKSPACE_WORDS.first },
                        { value: "last", label: WORKSPACE_WORDS.last },
                    ]}
                    onChange={(value) => {
                        set({ repeated: value === "last" ? "last" : "first" });
                    }}
                />
                <Choice
                    label={WORKSPACE_WORDS.noMatch}
                    value={result.unmatchedFrom}
                    data={[
                        { value: "keep", label: WORKSPACE_WORDS.add },
                        { value: "drop", label: WORKSPACE_WORDS.skip },
                    ]}
                    onChange={(value) => {
                        set({ unmatchedFrom: value === "drop" ? "drop" : "keep" });
                    }}
                />
            </Stack>
        );
    }
    const edgeTypes = edgeTypeChoices(session);
    return (
        <Stack gap={4}>
            <Choice
                label={WORKSPACE_WORDS.edges}
                value={result.perPair ? "pair" : "row"}
                data={[
                    { value: "row", label: WORKSPACE_WORDS.perRow },
                    { value: "pair", label: WORKSPACE_WORDS.perPair },
                ]}
                onChange={(value) => {
                    set({ perPair: value === "pair" });
                }}
            />
            <Choice
                label={WORKSPACE_WORDS.noMatch}
                value={result.unmatched}
                data={[
                    { value: "add", label: WORKSPACE_WORDS.add },
                    { value: "skip", label: WORKSPACE_WORDS.skip },
                ]}
                onChange={(value) => {
                    set({ unmatched: value === "add" ? "add" : "skip" });
                }}
            />
            <Choice
                label={JOIN_WORDS.direction}
                value={result.direction}
                data={[
                    { value: "into-from", label: "1->2" },
                    { value: "from-into", label: "2->1" },
                ]}
                onChange={(value) => {
                    set({ direction: value === "from-into" ? "from-into" : "into-from" });
                }}
            />
            <ComboInput
                label={JOIN_WORDS.edgeType}
                width="100%"
                variant="outlined"
                placeholder={JOIN_WORDS.edgeType}
                options={edgeTypes}
                value={result.edgeType}
                onChange={(next) => {
                    const edgeType = String(next).trim();
                    if (edgeType !== result.edgeType) {
                        set({ edgeType });
                    }
                }}
            />
        </Stack>
    );
}

/**
 * A step's counts, each a button that lists its rows in the table.
 * @param props - Component props
 * @param props.step - the card's step
 * @param props.onShow - lists one count's rows
 * @returns the counts
 */
function StepCounts({
    step,
    onShow,
}: Readonly<{ step: SourceStepRow; onShow: (bucket: string) => void }>): React.JSX.Element | null {
    const { buckets } = step;
    if (buckets === null) {
        return null;
    }
    const words = BUCKET_WORDS[step.op === "join.merge" ? "merge" : "edge"];
    return (
        <Group gap={4} wrap="wrap">
            {words.map(({ id, label }) => {
                const count = buckets[id];
                return count === 0 ? null : (
                    <Button
                        key={id}
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => {
                            onShow(id);
                        }}
                    >
                        {`${formatNumber(count)} ${label}`}
                    </Button>
                );
            })}
        </Group>
    );
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
 * A card's result as its title names it.
 * @param result - the result, or null before the reader picks one
 * @returns the word
 */
function resultWords(result: CardResult | null): string {
    if (result === null) {
        return WORKSPACE_WORDS.unknown;
    }
    return result.result === "merge" ? WORKSPACE_WORDS.merge : WORKSPACE_WORDS.connect;
}

/**
 * A card's title: the incoming source and its result.
 * @param session - the element's session
 * @param card - the card
 * @returns the title
 */
function cardTitle(session: GraphSession, card: JoinCardView): string {
    const source = [...session.data.staged(), ...session.data.sources()].find(
        (each) => each.key === card.picks.from?.source,
    );
    const name = source === undefined ? WORKSPACE_WORDS.unknown : sourceName(source);
    return `${name} -> ${resultWords(card.result)}`;
}

/**
 * A card's folded summary: its match and what its step does.
 * @param card - the card
 * @returns the line
 */
function cardSummary(card: JoinCardView): string {
    const { from, into } = card.picks;
    const match = from?.field === undefined || into === null ? "" : `${into.field ?? into.space} = ${from.field}`;
    const b = card.step?.buckets;
    if (b === null || b === undefined) {
        return match;
    }
    const done =
        card.step?.op === "join.merge"
            ? `${formatNumber(b.merged)} ${WORKSPACE_WORDS.merged}, ${formatNumber(b.keptNew)} ${WORKSPACE_WORDS.new}`
            : `${formatNumber(b.newEdges)} ${WORKSPACE_WORDS.edges.toLowerCase()}`;
    return `${match}; ${done}`;
}

/**
 * The table below the preview: a match's value overlap, or the rows behind one count of a step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.shows - what it lists
 * @param props.cards - the cards
 * @param props.onShows - changes what it lists
 * @param props.onMark - marks the elements of the picked rows
 * @returns the table
 */
function TablePane({
    session,
    draft,
    shows,
    cards,
    onShows,
    onMark,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    shows: TableShows | null;
    cards: readonly JoinCardView[];
    onShows: (shows: TableShows) => void;
    onMark: (refs: readonly SourceElementRef[]) => void;
}>): React.JSX.Element | null {
    // on reload: fresh: pointer: the page of a list opened for a look
    const [offset, setOffset] = useState(0);
    const box = useRef<HTMLDivElement>(null);
    const height = Math.max(PANEL_GRID.ROW_PITCH * 4, (box.current?.clientHeight ?? 240) - PANEL_GRID.ROW_PITCH * 2);
    if (shows === null) {
        return <div ref={box} className="jw-table" />;
    }
    const range = (start: number, end: number): void => {
        if (start < offset || end > offset + PAGE) {
            setOffset(Math.max(0, start - PAGE / 4));
        }
    };
    if (shows.kind === "values") {
        const card = cards.find((each) => each.id === shows.card);
        const pair = card === undefined ? null : pairOf(card.picks);
        let page: { total: number; values: readonly SourceMatchValue[] } = { total: 0, values: [] };
        if (pair !== null && card !== undefined) {
            try {
                page = draft.matchValues(pair, {
                    ignoreCase: card.picks.ignoreCase,
                    ignoreSpaces: card.picks.ignoreSpaces,
                    ...(shows.only === "all" ? {} : { only: shows.only }),
                    offset,
                    limit: PAGE,
                });
            } catch {
                // A pair the draft refuses lists nothing.
            }
        }
        return (
            <div ref={box} className="jw-table">
                <SegmentedControl
                    size="xs"
                    aria-label={PREVIEW_WORDS.valuesDiffer}
                    value={shows.only}
                    data={OVERLAP_FILTERS.map((each) => ({ ...each }))}
                    onChange={(only) => {
                        setOffset(0);
                        onShows({ ...shows, only: only as typeof shows.only });
                    }}
                />
                <DataTable<SourceMatchValue>
                    key={`${shows.card}:${shows.only}`}
                    label={JOIN_WORDS.values}
                    rowHeight={PANEL_GRID.ROW_PITCH}
                    headerHeight={PANEL_GRID.ROW_PITCH}
                    data={page.values}
                    rowCount={page.total}
                    rowOffset={offset}
                    onRangeChange={range}
                    columns={MATCH_VALUE_COLUMNS}
                    getRowId={(row) => `${typeof row.value}:${String(row.value)}`}
                    height={height}
                    selectionMode="none"
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
        <div ref={box} className="jw-table">
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
                onSelectionChange={(selected) => {
                    const picked = rows.rows.filter((_row, at) => selected.includes(ids[at] ?? ""));
                    onMark(picked.flatMap((row) => (row.element === null ? [] : [row.element])));
                }}
            />
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
 * @param props.start - the incoming source the opener named, if any
 * @returns the modal, drawn over the canvas column
 */
export function JoinWorkspace({
    session,
    start,
}: Readonly<{ session: GraphSession; start?: string }>): React.JSX.Element | null {
    const { store, element } = useWorkspace();
    const titleId = useId();
    const box = useRef<HTMLDialogElement>(null);
    // on reload: gap #9660: the draft lives in the element, whose autosave does not keep source drafts
    const [draft] = useState<SourceDraft | null>(() => {
        try {
            return session.data.currentDraft() ?? session.data.draft();
        } catch (error) {
            store.set({ notice: { message: refusedWords(error), error: true }, joinWorkspace: false });
            return null;
        }
    });
    const nextId = useRef(0);
    // on reload: gap #9660: picks of cards with no step, which belong to the draft a reload discards
    const [pending, setPending] = useState<readonly PendingCard[]>(() => {
        const source = start ?? session.data.staged().at(-1)?.key;
        return draft === null || source === undefined ? [] : [newCard(draft, "new:0", source)];
    });
    // on reload: fresh: pointer: the card opened for a look
    const [open, setOpen] = useState<string | null>(pending[0]?.id ?? null);
    // on reload: fresh: pointer: what the table lists for a look
    const [shows, setShows] = useState<TableShows | null>(null);
    // on reload: fresh: pointer: the rows picked for a look
    const [marked, setMarked] = useState<readonly SourceElementRef[]>([]);
    // on reload: fresh: pointer: the preview's look, picked for a look
    const [colors, setColors] = useState(true);
    // on reload: fresh: in flight: the first drawing of the draft
    const [drawing, setDrawing] = useState(true);
    const version = useSessionEvents(session, DRAFT_EVENTS);
    const frame = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ws-body");
    usePreviewCanvas(draft !== null, box, frame);

    // The draft is drawn After while the workspace is open; closing by any door throws it away.
    useEffect(() => {
        if (draft === null) {
            return undefined;
        }
        void draft.display(true).then(() => {
            setDrawing(false);
        });
        return () => {
            if (draft.open) {
                draft.dispose();
            }
        };
    }, [draft]);

    const close = (): void => {
        store.set({ joinWorkspace: false });
    };
    const live = draft?.open === true;
    // A draft gone by another door (a project opened, the graph cleared) closes the workspace.
    useEffect(() => {
        if (draft !== null && !live) {
            store.set({ joinWorkspace: false });
        }
    }, [draft, live, version, store]);

    const cards = live ? cardsOf(draft, pending) : [];
    const palette = session.scope.options.branchPalette ?? cardPalette(session.catalog.palettes());
    const colorOf = (at: number): string => palette[at % palette.length] ?? DEFAULT_BRANCH_PALETTE[0];
    // A card an undo took back is drawn again with its picks: it is the open one.
    const openCard = cards.find((card) => card.id === open) ?? cards.find((card) => card.step === null);

    // The preview: each card's step in its color, the open card or the picked rows at full strength.
    useEffect(() => {
        if (!live || !colors) {
            return undefined;
        }
        const [merged = "#000", added = "#000", untouched = "#000"] = DEFAULT_BRANCH_PALETTE;
        const steps = cards.flatMap((card, at) =>
            card.step === null ? [] : [{ step: card.step.index, color: colorOf(at) }],
        );
        const mark = marked.length > 0 ? { refs: marked } : stepMark(openCard);
        const view = session.styles.showDraft({
            merged,
            new: added,
            untouched,
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

    const notice = (error: unknown): void => {
        store.set({ notice: { message: refusedWords(error), error: true } });
    };
    const change: CardChange = (card, picks, result) => {
        const at = card.step?.index ?? null;
        const pair = pairOf(picks);
        if (result === null || pair === null) {
            // Only picks: a step card whose match is unpicked goes back to a pending card.
            if (at !== null) {
                try {
                    draft.removeStep(at);
                } catch (error) {
                    notice(error);
                    return;
                }
            }
            const id = at === null ? card.id : `new:${String(++nextId.current)}`;
            const next: PendingCard = { id, picks, guess: card.guess, suggested: false };
            setPending((now) => [...now.filter((each) => each.id !== card.id), next]);
            setOpen(id);
            return;
        }
        try {
            const step = writeCard(draft, at, picks, result);
            if (step !== null) {
                // Kept, written: an undo that takes the step back draws the card again.
                setPending((now) =>
                    now.map((each) => (each.id === card.id ? { ...each, picks, written: true } : each)),
                );
                setOpen(stepCardId(step));
            }
        } catch (error) {
            notice(error);
        }
    };
    const addCard = (): void => {
        const id = `new:${String(++nextId.current)}`;
        setPending((now) => [...now, newCard(draft, id, session.data.staged().at(-1)?.key)]);
        setOpen(id);
    };
    const removeCard = (id: string): void => {
        const card = cards.find((each) => each.id === id);
        if (card?.step !== null && card?.step !== undefined) {
            try {
                draft.removeStep(card.step.index);
            } catch (error) {
                notice(error);
                return;
            }
        }
        setPending((now) =>
            now.filter((each) => each.id !== id && (card === undefined || !samePicks(each.picks, card.picks))),
        );
    };
    const undo = (): void => {
        draft.undo();
        setMarked([]);
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
        void commitWorkspace(store, session, draft).then((ok) => {
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
        ];
        const run = bound.find(([combo]) => matchesKey(event, combo))?.[1] ?? null;
        if (run !== null) {
            event.preventDefault();
            event.stopPropagation();
            run();
        }
    };

    const { marks } = draft.preview();
    const keyItems = [
        { id: "merged", color: DEFAULT_BRANCH_PALETTE[0], label: WORKSPACE_WORDS.merged, count: marks.merged },
        { id: "new", color: DEFAULT_BRANCH_PALETTE[1], label: WORKSPACE_WORDS.new, count: marks.new },
        { id: "untouched", color: DEFAULT_BRANCH_PALETTE[2], label: WORKSPACE_WORDS.untouched, count: marks.untouched },
    ];

    const items: CardListItem[] = cards.map((card, at) => {
        const { result } = card;
        return {
            id: card.id,
            title: cardTitle(session, card),
            ...(colors ? { color: colorOf(at) } : {}),
            summary: (
                <Text size="xs" c="dimmed" truncate>
                    {cardSummary(card)}
                </Text>
            ),
            data: { "data-join-card": card.id },
            children: (
                <Stack gap={6}>
                    <Text size="xs" fw={600}>
                        {WORKSPACE_WORDS.matches}
                    </Text>
                    <MatchRow
                        session={session}
                        draft={draft}
                        card={card}
                        onChange={change}
                        onFocusValues={() => {
                            if (shows?.kind !== "values" || shows.card !== card.id) {
                                setShows({ kind: "values", card: card.id, only: "all" });
                            }
                        }}
                    />
                    <Radio.Group
                        size="xs"
                        label={WORKSPACE_WORDS.result}
                        value={result?.result ?? null}
                        onChange={(value) => {
                            const next = value === "merge" ? "merge" : "connect";
                            change(card, card.picks, { ...(result ?? DEFAULT_RESULT), result: next });
                        }}
                    >
                        <Group gap={8} mt={4}>
                            {(["merge", "connect"] as const).map((each) => (
                                <Group key={each} gap={4} wrap="nowrap">
                                    <Radio
                                        size="xs"
                                        value={each}
                                        label={each === "merge" ? WORKSPACE_WORDS.merge : WORKSPACE_WORDS.connect}
                                        disabled={pairOf(card.picks) === null}
                                    />
                                    {card.guess === each && result === null ? (
                                        <Badge size="xs" variant="light">
                                            {WORKSPACE_WORDS.suggested}
                                        </Badge>
                                    ) : null}
                                </Group>
                            ))}
                        </Group>
                    </Radio.Group>
                    {result === null ? null : (
                        <Options session={session} card={card} result={result} onChange={change} />
                    )}
                    {card.step === null ? null : (
                        <StepCounts
                            step={card.step}
                            onShow={(bucket) => {
                                if (card.step !== null) {
                                    setShows({ kind: "rows", step: card.step.index, bucket });
                                }
                            }}
                        />
                    )}
                </Stack>
            ),
        };
    });

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
                            <ColorSwatch size={10} color={each.color} aria-hidden />
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
                            { value: "after", label: `${PREVIEW_WORDS.after} ${formatKey(SIDE_KEY)}` },
                        ]}
                        onChange={(value) => {
                            void draft.show(value === "before" ? "before" : "after");
                        }}
                    />
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-keyshortcuts={ariaKey(WORKSPACE_UNDO_KEY)}
                        rightSection={<Kbd size="xs">{formatKey(WORKSPACE_UNDO_KEY)}</Kbd>}
                        onClick={undo}
                    >
                        {WORKSPACE_WORDS.undo}
                    </Button>
                    <span className="sel-ws-gap" />
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-keyshortcuts="Escape"
                        rightSection={<Kbd size="xs">Esc</Kbd>}
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
                        <CardList
                            label={WORKSPACE_WORDS.matches}
                            items={items}
                            autoFold
                            folded={new Set(cards.map((card) => card.id).filter((id) => id !== openCard?.id))}
                            onFoldedChange={(folded) => {
                                setOpen(cards.find((card) => !folded.has(card.id))?.id ?? null);
                                setMarked([]);
                            }}
                            onRemove={removeCard}
                            add={
                                <Button
                                    size="compact-xs"
                                    variant="subtle"
                                    aria-keyshortcuts={ariaKey(JOIN_WORKSPACE_KEY)}
                                    rightSection={<Kbd size="xs">{formatKey(JOIN_WORKSPACE_KEY)}</Kbd>}
                                    onClick={addCard}
                                >
                                    {`+ ${WORKSPACE_WORDS.addJoin}`}
                                </Button>
                            }
                        />
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
                                shows={shows}
                                cards={cards}
                                onShows={setShows}
                                onMark={setMarked}
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
    return opened && session !== null && sourceStepsOn(session) ? <JoinWorkspace session={session} /> : null;
}
