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
    type SourceMatchCounts,
    type SourceMatchValue,
    type SourceStepPatch,
    type SourceStepRow,
} from "@graphty/graphty-element/session";
import { Badge, Button, Group, Kbd, Loader, Radio, Stack, Switch, Text } from "@mantine/core";
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
import { useBoxSize } from "../useBoxSize";
import { commitWorkspace } from "./actions";
import { edgeTypeChoices, spaceChoices, spaceLabel } from "./join";
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
    stepCardId,
    toPairOf,
    writeCard,
    writtenFor,
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
    RULE_WORDS,
    WORKSPACE_WORDS,
} from "./words";

/** The element's events after which the workspace reads its draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** Lists, menus and popovers close themselves on Escape: never the workspace too. */
const SELF_CLOSING =
    "[data-portal], [data-popout-portal-container], .mantine-Combobox-dropdown, .mantine-Popover-dropdown";

/** The colors of what the commit does, as the header key names them: merged, new, unmatched. */
const [MERGED_COLOR = "#000", NEW_COLOR = "#000", UNTOUCHED_COLOR = "#000"] = DEFAULT_BRANCH_PALETTE;

/** The key's colors, upper case, which no card takes. */
const KEY_COLORS: ReadonlySet<string> = new Set([MERGED_COLOR, NEW_COLOR, UNTOUCHED_COLOR].map((c) => c.toUpperCase()));

/** A step's counts that make a graph a reader rarely wants: drawn as a warning. */
const WARN_BUCKETS: ReadonlySet<string> = new Set(["selfLoops", "parallelPairs"]);

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

/** A staged source's value in a type list: its keys, before any step builds it. */
const STAGED = "staged:";

/**
 * The types a match can name in the graph: each space, then each staged source by its keys.
 * @param session - the element's session
 * @returns the choices
 */
function intoChoices(session: GraphSession): readonly { readonly value: string; readonly label: string }[] {
    return [
        ...spaceChoices(session),
        ...session.data.staged().map((source) => ({ value: `${STAGED}${source.key}`, label: sourceName(source) })),
    ];
}

/**
 * A type list's value as a card's node 1 side.
 * @param value - the picked value
 * @returns the side, on its keys
 */
function intoOfChoice(value: string): CardInto {
    return value.startsWith(STAGED) ? { space: "", source: value.slice(STAGED.length) } : { space: value };
}

/**
 * A card's node 1 side as its type list's value.
 * @param into - the side
 * @returns the value
 */
function choiceOfInto(into: CardInto | null): string | null {
    if (into === null) {
        return null;
    }
    return into.space === "" && into.source !== undefined ? `${STAGED}${into.source}` : into.space;
}

/**
 * A match's live count and its "more with" switches.
 * @param props - Component props
 * @param props.counts - the element's counts, or null while unpicked
 * @param props.picks - the card's picks
 * @param props.set - changes the picks
 * @param props.switches - whether it draws the switches (they set the whole card's matching)
 * @returns the row
 */
function MatchCount({
    counts,
    picks,
    set,
    switches = true,
}: Readonly<{
    counts: SourceMatchCounts | null;
    picks: CardPicks;
    set: (patch: Partial<CardPicks>) => void;
    switches?: boolean;
}>): React.JSX.Element | null {
    if (counts === null) {
        return null;
    }
    const toggles = [
        { id: "ignoreCase", label: "Aa", on: picks.ignoreCase, more: counts.moreWithIgnoreCase },
        { id: "ignoreSpaces", label: "__", on: picks.ignoreSpaces, more: counts.moreWithIgnoreSpaces },
    ] as const;
    return (
        <Group gap={8} wrap="wrap">
            <Text size="xs" fw={600} aria-label={WORKSPACE_WORDS.matchCount}>
                {`${formatNumber(counts.matched)} / ${formatNumber(counts.matched + counts.only2)}`}
            </Text>
            {(switches ? toggles : []).map((toggle) => {
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
        </Group>
    );
}

/**
 * One match row: the field in the graph (side 1), the incoming field (side 2), the live count and
 * the matching switches, and Connect's second match naming the other end, all read from the open
 * draft. A step card is counted against the graph before its own step.
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
    const types = intoChoices(session);
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
    const step = card.step?.index;
    const counts = countsOf(draft, picks, step);
    const toPair = toPairOf(picks);
    const toCounts = toPair === null ? null : countsOf(draft, picks, step, toPair);
    const fromColumns =
        picks.from === null
            ? []
            : draftColumns(draft, picks.from.source).map((column) => ({ value: column, label: column }));
    const set = (patch: Partial<CardPicks>): void => {
        onChange(card, { ...picks, ...patch }, card.result);
    };
    const { to } = picks;
    return (
        <div className="ss-field" onFocusCapture={onFocusValues}>
            <Group gap={4} wrap="nowrap">
                <Text size="xs" fw={600} aria-hidden>
                    1
                </Text>
                <Pick
                    name={`${WORKSPACE_WORDS.inGraph} ${JOIN_WORDS.type.toLowerCase()}`}
                    data={types}
                    value={choiceOfInto(picks.into)}
                    onPick={(value) => {
                        set({ into: intoOfChoice(value) });
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
                            set({ into: intoOfChoice(choiceOfInto(picks.into) ?? "") });
                            return;
                        }
                        const [source, field] = JSON.parse(value) as [string, string];
                        const into: CardInto = { space: picks.into.space, source, field };
                        set({ into });
                    }}
                />
            </Group>
            <Group gap={4} wrap="nowrap">
                <Text size="xs" fw={600} aria-hidden>
                    2
                </Text>
                <Pick
                    name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.source.toLowerCase()}`}
                    data={sources.map((source) => ({ value: source.key, label: sourceName(source) }))}
                    value={picks.from?.source ?? null}
                    onPick={(source) => {
                        set({ from: { source }, to: null });
                    }}
                />
                <Pick
                    name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.field.toLowerCase()}`}
                    data={fromColumns}
                    value={picks.from?.field ?? null}
                    onPick={(field) => {
                        if (picks.from !== null) {
                            set({ from: { source: picks.from.source, field } });
                        }
                    }}
                />
            </Group>
            <Group gap={8} wrap="wrap">
                <MatchCount counts={counts} picks={picks} set={set} />
                {card.suggested ? (
                    <Badge size="xs" variant="light">
                        {WORKSPACE_WORDS.suggested}
                    </Badge>
                ) : null}
            </Group>
            {to === undefined || to === null ? (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={picks.from === null || card.result?.result === "merge"}
                    onClick={() => {
                        set({ to: { into: null } });
                    }}
                >
                    {`+ ${WORKSPACE_WORDS.match}`}
                </Button>
            ) : (
                <Group gap={4} wrap="nowrap">
                    <Pick
                        name={`${WORKSPACE_WORDS.otherEnd} ${JOIN_WORDS.field.toLowerCase()}`}
                        data={fromColumns}
                        value={to.field ?? null}
                        onPick={(field) => {
                            set({ to: { ...to, field } });
                        }}
                    />
                    <Pick
                        name={`${WORKSPACE_WORDS.otherEnd} ${JOIN_WORDS.type.toLowerCase()}`}
                        data={types}
                        value={choiceOfInto(to.into)}
                        onPick={(value) => {
                            set({ to: { ...to, into: intoOfChoice(value) } });
                        }}
                    />
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-label={`${WORKSPACE_WORDS.remove} ${WORKSPACE_WORDS.otherEnd}`}
                        onClick={() => {
                            set({ to: null });
                        }}
                    >
                        {WORKSPACE_WORDS.remove}
                    </Button>
                </Group>
            )}
            {toCounts === null ? null : <MatchCount counts={toCounts} picks={picks} set={set} switches={false} />}
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
 * @param props.onPatch - changes a choice its step keeps, such as a column's clash rule
 * @returns the rows
 */
function Options({
    session,
    card,
    result,
    onChange,
    onPatch,
}: Readonly<{
    session: GraphSession;
    card: JoinCardView;
    result: CardResult;
    onChange: CardChange;
    onPatch: (step: number, patch: SourceStepPatch) => void;
}>): React.JSX.Element {
    const set = (patch: Partial<CardResult>): void => {
        onChange(card, card.picks, { ...result, ...patch });
    };
    if (result.result === "merge") {
        const { step } = card;
        return (
            <Stack gap={4}>
                <Choice
                    label={WORKSPACE_WORDS.manyRows}
                    value={result.many}
                    data={MANY_ROWS}
                    onChange={(value) => {
                        set({ many: MANY_ROWS.find((each) => each.value === value)?.value ?? "first" });
                    }}
                />
                {step?.valuesDiffer.map(({ params }) => (
                    <Group key={params.column} gap={6} wrap="nowrap" justify="space-between">
                        <Text size="xs" c="dimmed" truncate>
                            {params.column}
                        </Text>
                        <Pick
                            name={`${WORKSPACE_WORDS.clash} ${params.column}`}
                            data={params.rules.map((rule) => ({ value: rule, label: RULE_WORDS[rule] }))}
                            value={params.rule}
                            onPick={(rule) => {
                                const picked = params.rules.find((each) => each === rule);
                                if (picked !== undefined) {
                                    onPatch(step.index, { clash: { [params.column]: picked } });
                                }
                            }}
                        />
                    </Group>
                ))}
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

/** Merge's "many rows" ways, as `CardResult.many` names them. */
const MANY_ROWS = [
    { value: "first", label: WORKSPACE_WORDS.first },
    { value: "last", label: WORKSPACE_WORDS.last },
    { value: "list", label: WORKSPACE_WORDS.list },
    { value: "count", label: WORKSPACE_WORDS.count },
] as const;

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
                        variant={WARN_BUCKETS.has(id) ? "light" : "subtle"}
                        color={WARN_BUCKETS.has(id) ? "red" : undefined}
                        data-warn={WARN_BUCKETS.has(id) ? "" : undefined}
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
 * A source's name by its key.
 * @param session - the element's session
 * @param key - the source
 * @returns its name
 */
function nameOf(session: GraphSession, key: string): string {
    const source = [...session.data.staged(), ...session.data.sources()].find((each) => each.key === key);
    return source === undefined ? WORKSPACE_WORDS.unknown : sourceName(source);
}

/**
 * A node 1 side as the reader reads it: the type and its field, such as "people.Key".
 * @param session - the element's session
 * @param into - the side
 * @returns the words
 */
function intoWords(session: GraphSession, into: CardInto): string {
    const type =
        into.space === "" && into.source !== undefined ? nameOf(session, into.source) : spaceLabel(session, into.space);
    return `${type}.${into.field ?? JOIN_WORDS.key}`;
}

/**
 * A card's folded summary: its matches, named by their sources, and what its step does.
 * @param session - the element's session
 * @param card - the card
 * @returns the line
 */
function cardSummary(session: GraphSession, card: JoinCardView): string {
    const { from, into, to } = card.picks;
    const name = from === null ? "" : nameOf(session, from.source);
    const matches = [
        from?.field === undefined || into === null ? null : `${intoWords(session, into)} = ${name}.${from.field}`,
        to?.field === undefined || to.into === null ? null : `${intoWords(session, to.into)} = ${name}.${to.field}`,
    ].filter((each) => each !== null);
    const match = matches.join(", ");
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
 * A page of a card's value-overlap list, a step card's counted before its own step.
 * @param draft - the open draft
 * @param card - the card, if it is still there
 * @param only - which values
 * @param offset - the first value
 * @returns the page; empty while unpicked or refused
 */
function valuesPage(
    draft: SourceDraft,
    card: JoinCardView | undefined,
    only: (typeof OVERLAP_FILTERS)[number]["value"],
    offset: number,
): { total: number; values: readonly SourceMatchValue[] } {
    const pair = card === undefined ? null : pairOf(card.picks);
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
    if (shows.kind === "values") {
        const card = cards.find((each) => each.id === shows.card);
        const page = valuesPage(draft, card, shows.only, offset);
        return (
            <div className="jw-table">
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
                <div ref={grid.ref} className="jw-table-grid">
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
                    onSelectionChange={(selected) => {
                        const picked = rows.rows.filter((_row, at) => selected.includes(ids[at] ?? ""));
                        onMark(picked.flatMap((row) => (row.element === null ? [] : [row.element])));
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
 * @param props.start - the incoming source the opener named, if any
 * @returns the modal, drawn over the canvas column
 */
function JoinWorkspace({
    session,
    start,
}: Readonly<{ session: GraphSession; start?: string }>): React.JSX.Element | null {
    const { store, element } = useWorkspace();
    const titleId = useId();
    const box = useRef<HTMLDialogElement>(null);
    // on reload: fresh: in flight: the element draft being edited, which a reload discards along with the closed workspace
    const [opened, setOpened] = useState<{ readonly draft: SourceDraft | null } | null>(null);
    const draft = opened?.draft ?? null;
    const nextId = useRef(0);
    // on reload: fresh: in flight: picks of cards with no step yet, part of the discarded draft
    const [pending, setPending] = useState<readonly PendingCard[]>([]);
    // on reload: fresh: pointer: the card opened for a look
    const [open, setOpen] = useState<string | null>(null);
    // on reload: fresh: pointer: what the table lists for a look
    const [shows, setShows] = useState<TableShows | null>(null);
    // Opened after the first render: opening a draft tells every listener, which must not happen while rendering.
    useEffect(() => {
        if (opened !== null) {
            return;
        }
        try {
            const opening = session.data.currentDraft() ?? session.data.draft();
            const source = start ?? session.data.staged().at(-1)?.key;
            const first = source === undefined ? [] : [newCard(opening, "new:0", source)];
            setPending(first);
            setOpen(first[0]?.id ?? null);
            setOpened({ draft: opening });
        } catch (error) {
            setOpened({ draft: null });
            store.set({ notice: { message: refusedWords(error), error: true }, joinWorkspace: false });
        }
    }, [opened, session, start, store]);
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
    // A draft gone by another door (a project opened, the graph cleared) closes the workspace.
    useEffect(() => {
        if (draft !== null && !live) {
            store.set({ joinWorkspace: false });
        }
    }, [draft, live, version, store]);

    const cards = live ? cardsOf(draft, pending) : [];
    // Cards never take the key's colors, so a color names either a card or what the commit does.
    const palette = (session.scope.options.branchPalette ?? cardPalette(session.catalog.palettes())).filter(
        (color) => !KEY_COLORS.has(color.toUpperCase()),
    );
    const colorOf = (at: number): string => palette[at % Math.max(1, palette.length)] ?? MERGED_COLOR;
    // A card an undo took back is drawn again with its picks: it is the open one.
    const openCard = cards.find((card) => card.id === open) ?? cards.find((card) => card.step === null);

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
            // A step card going back to picks takes the written card behind it along.
            setPending((now) => [
                ...now.filter((each) => each.id !== card.id && !(at !== null && writtenFor(each, card))),
                next,
            ]);
            setOpen(id);
            return;
        }
        try {
            const step = writeCard(draft, at, picks, result);
            if (step !== null) {
                // The step reads back as the element names it (a staged source by its new space).
                const made = cardsOf(draft, []).find((each) => each.step?.index === step)?.picks ?? picks;
                // Kept, written: an undo that takes the step back draws the card again. A step card
                // rewritten with other picks carries its written card's picks along, so that card
                // is never drawn again beside it.
                setPending((now) =>
                    now.map((each) =>
                        each.id === card.id || (at !== null && writtenFor(each, card))
                            ? { ...each, picks, written: [...(each.written ?? []), picks, made] }
                            : each,
                    ),
                );
                setOpen(stepCardId(step));
                setShows((now) =>
                    now?.kind === "values" && now.card === card.id ? { ...now, card: stepCardId(step) } : now,
                );
            }
        } catch (error) {
            notice(error);
        }
    };
    const patch = (step: number, edit: SourceStepPatch): void => {
        try {
            draft.editStep(step, edit);
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
        // Only a step card takes the written card behind it along; unfinished cards stay.
        setPending((now) => now.filter((each) => each.id !== id && !(card !== undefined && writtenFor(each, card))));
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
    // The key names each effect by the mark the preview draws for it (a ring, a dashed border, a
    // dotted border), in the color it takes outside a card's own color.
    const keyItems = [
        { id: "merged", color: MERGED_COLOR, label: WORKSPACE_WORDS.nodesMerged, count: marks.merged },
        { id: "new", color: NEW_COLOR, label: WORKSPACE_WORDS.nodesNew, count: marks.new },
        { id: "untouched", color: UNTOUCHED_COLOR, label: WORKSPACE_WORDS.untouched, count: marks.untouched },
    ];
    // The table lists what the reader asked for, else the open card's values.
    const listed = shows?.kind === "values" && !cards.some((card) => card.id === shows.card) ? null : shows;
    const tableShows: TableShows | null =
        listed ?? (openCard === undefined ? null : { kind: "values", card: openCard.id, only: "all" });

    const items: CardListItem[] = cards.map((card, at) => {
        const { result } = card;
        return {
            id: card.id,
            title: cardTitle(session, card),
            ...(colors ? { color: colorOf(at) } : {}),
            summary: (
                <Text size="xs" c="dimmed" truncate>
                    {cardSummary(session, card)}
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
                            if (tableShows?.kind !== "values" || tableShows.card !== card.id) {
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
                                        disabled={
                                            pairOf(card.picks) === null ||
                                            (each === "merge" && toPairOf(card.picks) !== null)
                                        }
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
                        <Options session={session} card={card} result={result} onChange={change} onPatch={patch} />
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
                                // The card the reader just unfolded, else whichever is left open.
                                const unfolded = cards.filter((card) => !folded.has(card.id));
                                setOpen(
                                    (unfolded.find((card) => card.id !== openCard?.id) ?? unfolded.at(0))?.id ?? null,
                                );
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
                                shows={tableShows}
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
