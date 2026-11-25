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
    type SourceCellValue,
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
import type { JoinWorkspaceOpen } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useBoxSize } from "../useBoxSize";
import { commitWorkspace } from "./actions";
import { draftSpaceChoices, edgeTypeChoices } from "./join";
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
import { JOIN_WORKSPACE_KEY, READER_EDITS_KEY, SIDE_KEY, WORKSPACE_UNDO_KEY } from "./keys";
import { Pick } from "./Pick";
import { ReaderEdits } from "./ReaderEdits";
import { StagedRows } from "./StagedFields";
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
import { AddStepBody, type CellFilter, CellsPane, DifferRow, FieldsPane, RemoveStrip } from "./WorkspaceParts";

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
    | { readonly kind: "fields"; readonly card: string }
    | { readonly kind: "rows"; readonly step: number; readonly bucket: string }
    | { readonly kind: "cells"; readonly step: number; readonly column: string; readonly only: CellFilter };

/** Updates one card's picks or result. */
type CardChange = (card: JoinCardView, picks: CardPicks, result: CardResult | null) => void;

/**
 * An Add step's card id: its place, so a card follows its step through undo.
 * @param index - The step's place.
 * @returns The id.
 */
function addCardId(index: number): string {
    return `add:${String(index)}`;
}

/** A staged source's value in a type list: its keys, before any step builds it. */
const STAGED = "staged:";

/**
 * The types a match can name in the graph: each space as the draft builds it, then each staged
 * source the draft has not added yet, by its keys.
 * @param session - the element's session
 * @param draft - the open draft
 * @returns the choices
 */
function intoChoices(
    session: GraphSession,
    draft: SourceDraft,
): readonly { readonly value: string; readonly label: string }[] {
    const built = new Set(draft.steps().map((step) => step.source));
    return [
        ...draftSpaceChoices(session, draft),
        ...session.data
            .staged()
            .filter((source) => !built.has(source.key))
            .map((source) => ({ value: `${STAGED}${source.key}`, label: sourceName(source) })),
    ];
}

/**
 * A space as the reader reads it, as the draft builds it.
 * @param session - the element's session
 * @param draft - the open draft
 * @param space - the space
 * @returns its name
 */
function spaceName(session: GraphSession, draft: SourceDraft, space: string): string {
    return draftSpaceChoices(session, draft).find((choice) => choice.value === space)?.label ?? space;
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
    const types = intoChoices(session, draft);
    // A space's fields are its supplying sources' columns as the draft builds them; a staged node 1
    // offers its own columns, so any of them, not only its key, can be matched.
    const stagedInto = picks.into?.space === "" ? picks.into.source : undefined;
    const supplying =
        stagedInto === undefined
            ? (draft.spaces().find((row) => row.space === picks.into?.space)?.sources ?? [])
            : [stagedInto];
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
 * @param props.onShowCells - lists a Values differ column's cells in the table
 * @returns the rows
 */
function Options({
    session,
    card,
    result,
    onChange,
    onPatch,
    onShowCells,
}: Readonly<{
    session: GraphSession;
    card: JoinCardView;
    result: CardResult;
    onChange: CardChange;
    onPatch: (step: number, patch: SourceStepPatch) => void;
    onShowCells: (step: number, column: string) => void;
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
                    <DifferRow
                        key={params.column}
                        step={step}
                        column={params.column}
                        rule={params.rule}
                        rules={params.rules}
                        onRule={(rule) => {
                            const picked = params.rules.find((each) => each === rule);
                            if (picked !== undefined) {
                                onPatch(step.index, { clash: { [params.column]: picked } });
                            }
                        }}
                        onReduce={(reduce) => {
                            const { [params.column]: _was, ...rest } = step.act?.aggregate ?? {};
                            const aggregate = reduce === null ? rest : { ...rest, [params.column]: reduce };
                            onPatch(step.index, { aggregate: Object.keys(aggregate).length === 0 ? null : aggregate });
                        }}
                        onShow={() => {
                            onShowCells(step.index, params.column);
                        }}
                    />
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
 * @param draft - the open draft
 * @param into - the side
 * @returns the words
 */
function intoWords(session: GraphSession, draft: SourceDraft, into: CardInto): string {
    const type =
        into.space === "" && into.source !== undefined
            ? nameOf(session, into.source)
            : spaceName(session, draft, into.space);
    return `${type}.${into.field ?? JOIN_WORDS.key}`;
}

/**
 * A card's folded summary: its matches, named by their sources, and what its step does.
 * @param session - the element's session
 * @param draft - the open draft
 * @param card - the card
 * @returns the line
 */
function cardSummary(session: GraphSession, draft: SourceDraft, card: JoinCardView): string {
    const { from, into, to } = card.picks;
    const name = from === null ? "" : nameOf(session, from.source);
    const matches = [
        from?.field === undefined || into === null
            ? null
            : `${intoWords(session, draft, into)} = ${name}.${from.field}`,
        to?.field === undefined || to.into === null
            ? null
            : `${intoWords(session, draft, to.into)} = ${name}.${to.field}`,
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
    const { from, into } = card.picks;
    return [
        ...(into === null
            ? []
            : [
                  {
                      title: intoWords(session, draft, into),
                      side:
                          into.source !== undefined && into.field !== undefined
                              ? { source: into.source, field: into.field }
                              : { space: into.space },
                  },
              ]),
        ...(from?.field === undefined
            ? []
            : [
                  {
                      title: `${nameOf(session, from.source)}.${from.field}`,
                      side: { source: from.source, field: from.field },
                  },
              ]),
    ];
}

/**
 * The table below the preview: a match's value overlap or its two fields' profiles, the rows behind
 * one count of a step (selected rows can be left out of the step, and left-out keys taken back),
 * or the cells of one Values differ column with Pick 1, Pick 2 and Clear.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.shows - what it lists
 * @param props.cards - the cards
 * @param props.onShows - changes what it lists
 * @param props.onMark - marks the elements of the picked rows
 * @param props.onError - shows a refusal
 * @returns the table
 */
function TablePane({
    session,
    draft,
    shows,
    cards,
    onShows,
    onMark,
    onError,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    shows: TableShows | null;
    cards: readonly JoinCardView[];
    onShows: (shows: TableShows) => void;
    onMark: (refs: readonly SourceElementRef[]) => void;
    onError: (error: unknown) => void;
}>): React.JSX.Element | null {
    // on reload: fresh: pointer: the page of a list opened for a look
    const [offset, setOffset] = useState(0);
    // on reload: fresh: pointer: the keys of the rows picked for a look
    const [keys, setKeys] = useState<readonly SourceCellValue[]>([]);
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
                    onOnly={(only) => {
                        onShows({ ...shows, only });
                    }}
                    onError={onError}
                />
            </div>
        );
    }
    if (shows.kind === "values" || shows.kind === "fields") {
        const card = cards.find((each) => each.id === shows.card);
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
                    setOffset(0);
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
                    {view}
                    {card === undefined ? null : <FieldsPane draft={draft} sides={fieldSides(session, draft, card)} />}
                </div>
            );
        }
        const page = valuesPage(draft, card, shows.only, offset);
        return (
            <div className="jw-table">
                <Group gap={6} wrap="nowrap">
                    {view}
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
                </Group>
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
    const except = draft.steps()[shows.step]?.except ?? null;
    const act = (run: () => void): void => {
        try {
            run();
            setKeys([]);
        } catch (error) {
            onError(error);
        }
    };
    return (
        <div className="jw-table">
            <Group gap={6} wrap="wrap">
                <Button
                    size="compact-xs"
                    variant="default"
                    disabled={keys.length === 0}
                    onClick={() => {
                        act(() => {
                            draft.exclude(shows.step, keys);
                        });
                    }}
                >
                    {WORKSPACE_WORDS.exclude}
                </Button>
                {except?.values.map((key) => (
                    <Button
                        key={String(key)}
                        size="compact-xs"
                        variant="subtle"
                        aria-label={`${WORKSPACE_WORDS.include} ${String(key)}`}
                        onClick={() => {
                            act(() => {
                                draft.include(shows.step, [key]);
                            });
                        }}
                    >
                        {`${WORKSPACE_WORDS.include} ${String(key)}`}
                    </Button>
                ))}
            </Group>
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
                        setKeys([...new Set(picked.flatMap((row) => (row.key === null ? [] : [row.key])))]);
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
    useEffect(() => {
        if (opened !== null) {
            return;
        }
        try {
            // An open draft (from any door) is adopted; a new one asks the key-overlap question
            // when a staged source is added as it is.
            const opening = session.data.currentDraft() ?? session.data.draft({ askOverlap: true });
            if (how.remove !== undefined) {
                opening.removeSource(how.remove);
            }
            const source = how.source ?? session.data.staged().at(-1)?.key;
            const into = how.into === undefined ? null : { space: how.into };
            const first =
                how.remove !== undefined || (source === undefined && into === null)
                    ? []
                    : [newCard(opening, "new:0", source, into)];
            setPending(first);
            setOpen(first[0]?.id ?? null);
            setOpened({ draft: opening });
        } catch (error) {
            setOpened({ draft: null });
            store.set({ notice: { message: refusedWords(error), error: true }, joinWorkspace: false });
        }
    }, [opened, session, how, store]);
    // on reload: fresh: pointer: the Reader edits list opened for a look
    const [editsOpen, setEditsOpen] = useState(false);
    // on reload: fresh: in flight: an other end picked on a written card before both its field and type are
    const [pendingTo, setPendingTo] = useState<Readonly<Partial<Record<string, CardPicks["to"]>>>>({});
    // on reload: fresh: in flight: the refusal each card last met, drawn on it
    const [errors, setErrors] = useState<Readonly<Partial<Record<string, string>>>>({});
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
    // The steps that add a staged source as it is: a card each, read-only but for its questions.
    // A join step that adds its own staged source shows on its own card, not as an Add card too.
    const addSteps = live
        ? draft
              .steps()
              .filter(
                  (step, _at, all) =>
                      step.act === null &&
                      step.op === "join.add" &&
                      !all.some((other) => other.act !== null && other.source === step.source),
              )
        : [];
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
        const waiting = picks.to !== undefined && picks.to !== null && toPairOf(picks) === null;
        setPendingTo(({ [card.id]: _was, ...rest }) => (waiting ? { ...rest, [card.id]: picks.to } : rest));
        if (waiting && result !== null && card.step !== null) {
            return;
        }
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
            noticeOn(stepCardId(step))(error);
        }
    };
    const addCard = (): void => {
        const id = `new:${String(++nextId.current)}`;
        setPending((now) => [...now, newCard(draft, id, session.data.staged().at(-1)?.key)]);
        setOpen(id);
    };
    const removeCard = (id: string): void => {
        const card = cards.find((each) => each.id === id);
        const index = card?.step?.index ?? addSteps.find((step) => addCardId(step.index) === id)?.index;
        if (index !== undefined) {
            try {
                draft.removeStep(index);
            } catch (error) {
                noticeOn(id)(error);
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

    const { marks } = draft.preview();
    // The key names each effect by the mark the preview draws for it (a ring, a dashed border, a
    // dotted border), in the color it takes outside a card's own color.
    const keyItems = [
        { id: "merged", color: MERGED_COLOR, label: WORKSPACE_WORDS.nodesMerged, count: marks.nodes.merged },
        { id: "new", color: NEW_COLOR, label: WORKSPACE_WORDS.nodesNew, count: marks.nodes.new },
        { id: "edges", color: NEW_COLOR, label: WORKSPACE_WORDS.edgesNew, count: marks.edges.new },
        { id: "untouched", color: UNTOUCHED_COLOR, label: WORKSPACE_WORDS.untouched, count: marks.nodes.untouched },
    ];
    // The table lists what the reader asked for, else the open card's values.
    const listed = shows?.kind === "values" && !cards.some((card) => card.id === shows.card) ? null : shows;
    const tableShows: TableShows | null =
        listed ?? (openCard === undefined ? null : { kind: "values", card: openCard.id, only: "all" });

    const items: CardListItem[] = cards.map((shown, at) => {
        const waitingTo = pendingTo[shown.id];
        const card: JoinCardView =
            waitingTo === undefined || (shown.picks.to ?? null) !== null
                ? shown
                : { ...shown, picks: { ...shown.picks, to: waitingTo } };
        const { result } = card;
        // A card joining a staged source not yet in the draft says how its rows are read first,
        // and can add it as it is.
        const staged = session.data
            .staged()
            .find(
                (each) =>
                    each.key === card.picks.from?.source && !draft.steps().some((step) => step.source === each.key),
            );
        const error = errors[card.id];
        return {
            id: card.id,
            title: cardTitle(session, card),
            ...(colors ? { color: colorOf(at) } : {}),
            summary: (
                <Text size="xs" c="dimmed" truncate>
                    {cardSummary(session, draft, card)}
                </Text>
            ),
            data: { "data-join-card": card.id },
            children: (
                <Stack gap={6}>
                    {staged === undefined || card.step !== null ? null : (
                        <fieldset className="ss-field" aria-label={WORKSPACE_WORDS.readSettings}>
                            <Text component="legend" size="xs" fw={600}>
                                {WORKSPACE_WORDS.readSettings}
                            </Text>
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
                        </fieldset>
                    )}
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
                        <Options
                            session={session}
                            card={card}
                            result={result}
                            onChange={change}
                            onPatch={patch}
                            onShowCells={(step, column) => {
                                setShows({ kind: "cells", step, column, only: "all" });
                            }}
                        />
                    )}
                    {error === undefined ? null : (
                        <Text size="xs" c="red" role="alert">
                            {error}
                        </Text>
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
    // Each Add step is a card too, so every step the draft holds is visible: its questions and counts.
    const addItems: CardListItem[] = addSteps.map((step) => {
        const id = addCardId(step.index);
        const error = errors[id];
        return {
            id,
            title: `${nameOf(session, step.source)} -> ${WORKSPACE_WORDS.added}`,
            data: { "data-join-card": id },
            children: (
                <Stack gap={4}>
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
                        {how.remove === undefined ? null : (
                            <RemoveStrip session={session} draft={draft} source={how.remove} />
                        )}
                        <CardList
                            label={WORKSPACE_WORDS.matches}
                            items={[...addItems, ...items]}
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
                                onShows={setShows}
                                onMark={setMarked}
                                onError={noticeOn(openCard?.id ?? "")}
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
