import { ComboInput, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    SourceDraft,
    SourceMatchCounts,
    SourceStepPatch,
    SourceStepRow,
} from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, MultiSelect, Radio, Stack, Switch, Text, UnstyledButton } from "@mantine/core";
import React, { useId } from "react";

import { sourceName } from "../data-place/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { becoming, choiceOfInto, directions, intoChoices, intoOfChoice, NEW_VALUE, shownBecomes } from "./cardWords";
import { edgeTypeChoices } from "./join";
import {
    type Becomes,
    type CardInto,
    type CardPicks,
    type CardResult,
    countsOf,
    draftColumns,
    intoFields,
    type JoinCardView,
    keyColumn,
    type MatchSwitches,
    newCard,
    newKind,
    sharedColumns,
    switchesOf,
    toPairOf,
} from "./joinCards";
import { Pick } from "./Pick";
import { BECOMES, BUCKET_WORDS, JOIN_WORDS, matchWords, moreWords, WORKSPACE_WORDS } from "./words";
import { DifferRow } from "./WorkspaceParts";

/** Field 1's Field value for the space's own key. */
const KEY_VALUE = "key";

/** New nodes, as a type list offers it. */
const NEW_NODES = { value: NEW_VALUE, label: WORKSPACE_WORDS.newNodes };

/** Writes a card: its picks, and its options once it has a step. */
export type CardChange = (card: JoinCardView, picks: CardPicks, result: CardResult | null) => void;

/** What every part of a card takes. */
interface CardProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly card: JoinCardView;
    /** Writes the card. */
    readonly onChange: CardChange;
}

/**
 * One labeled row of a card: the words in one column, the controls in the rest.
 * @param props - Component props
 * @param props.label - the words
 * @param props.children - the controls
 * @returns the row
 */
function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <div className="jw-row">
            <Text size="xs" truncate>
                {label}
            </Text>
            <div className="jw-row-controls">{children}</div>
        </div>
    );
}

/**
 * A choice of a few ways as a row.
 * @param props - Component props
 * @param props.label - the choice's name
 * @param props.value - the choice now
 * @param props.data - the ways
 * @param props.onChange - takes a choice
 * @returns the row
 */
function Choice<T extends string>({
    label,
    value,
    data,
    onChange,
}: Readonly<{
    label: string;
    value: T;
    data: readonly { readonly value: T; readonly label: string }[];
    onChange: (value: T) => void;
}>): React.JSX.Element {
    return (
        <Row label={label}>
            <SegmentedControl
                size="xs"
                aria-label={label}
                value={value}
                data={data.map((each) => ({ ...each }))}
                onChange={(next) => {
                    const picked = data.find((each) => each.value === next);
                    if (picked !== undefined) {
                        onChange(picked.value);
                    }
                }}
            />
        </Row>
    );
}

/**
 * A name typed or picked, as a row: a type, or a separator. Enter, Tab or leaving it takes it.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the name now
 * @param props.placeholder - what an empty one reads
 * @param props.options - the names offered
 * @param props.trim - whether the spaces around it are taken off
 * @param props.onChange - takes a name
 * @returns the row
 */
function NameRow({
    label,
    value,
    placeholder = label,
    options,
    trim = true,
    onChange,
}: Readonly<{
    label: string;
    value: string;
    placeholder?: string;
    options: readonly { readonly value: string }[];
    trim?: boolean;
    onChange: (value: string) => void;
}>): React.JSX.Element {
    return (
        <Row label={label}>
            <ComboInput
                label={label}
                width="100%"
                variant="outlined"
                placeholder={placeholder}
                options={options.map((each) => ({ ...each }))}
                value={value}
                onChange={(next) => {
                    const text = trim ? String(next).trim() : String(next);
                    if (text !== value) {
                        onChange(text);
                    }
                }}
            />
        </Row>
    );
}

/**
 * A whole number as a row.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the number now, or undefined for the element's own
 * @param props.min - the smallest one
 * @param props.options - the numbers offered
 * @param props.onChange - takes a number
 * @returns the row
 */
function NumberRow({
    label,
    value,
    min,
    options,
    onChange,
}: Readonly<{
    label: string;
    value: number | undefined;
    min: number;
    options: readonly number[];
    onChange: (value: number) => void;
}>): React.JSX.Element {
    return (
        <Row label={label}>
            <ComboInput
                label={label}
                width={88}
                variant="outlined"
                numeric
                min={min}
                options={options.map((each) => ({ value: String(each) }))}
                value={value ?? ""}
                onChange={(next) => {
                    const number = Math.round(Number(next));
                    if (number !== value && number >= min) {
                        onChange(number);
                    }
                }}
            />
        </Row>
    );
}

/**
 * Several columns, as a row.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the columns now
 * @param props.columns - the columns offered
 * @param props.onChange - takes them
 * @returns the row
 */
function ColumnsRow({
    label,
    value,
    columns,
    onChange,
}: Readonly<{
    label: string;
    value: readonly string[];
    columns: readonly string[];
    onChange: (columns: readonly string[]) => void;
}>): React.JSX.Element {
    return (
        <Row label={label}>
            <MultiSelect
                size="xs"
                searchable
                variant="outlined"
                aria-label={label}
                placeholder={value.length === 0 ? label : undefined}
                data={[...new Set([...columns, ...value])]}
                value={[...value]}
                onChange={onChange}
            />
        </Row>
    );
}

/**
 * A match's live count.
 * @param props - Component props
 * @param props.counts - the element's counts, or null while unpicked
 * @param props.suggested - whether the match is still the element's guess
 * @param props.label - the count's name
 * @returns the row
 */
function MatchCount({
    counts,
    suggested = false,
    label,
}: Readonly<{
    counts: SourceMatchCounts | null;
    suggested?: boolean;
    label: string;
}>): React.JSX.Element | null {
    if (counts === null) {
        return null;
    }
    return (
        <Group gap={12} wrap="wrap" className="jw-match-count">
            <Text size="xs" aria-label={label}>
                {matchWords(counts)}
            </Text>
            {suggested ? (
                <Text size="xs" c="dimmed">
                    {WORKSPACE_WORDS.suggested}
                </Text>
            ) : null}
        </Group>
    );
}

/**
 * The "Ignore" switches of a card, which set how all its matches compare: each drawn while it is on
 * or would match more rows, alone or with the other.
 * @param props - Component props
 * @param props.more - what they would add
 * @param props.picks - the card's picks
 * @param props.set - changes the picks
 * @returns the row, or nothing when neither would change anything
 */
function IgnoreSwitches({
    more,
    picks,
    set,
}: Readonly<{
    more: MatchSwitches;
    picks: CardPicks;
    set: (patch: Partial<CardPicks>) => void;
}>): React.JSX.Element | null {
    const shown = (
        [
            { id: "ignoreCase", label: JOIN_WORDS.ignoreCase, on: picks.ignoreCase, more: more.moreWithCase },
            { id: "ignoreSpaces", label: JOIN_WORDS.ignoreSpaces, on: picks.ignoreSpaces, more: more.moreWithSpaces },
        ] as const
    ).filter((toggle) => toggle.on || (toggle.more ?? 0) > 0 || more.together);
    if (shown.length === 0) {
        return null;
    }
    return (
        <Group gap={12} wrap="wrap" className="jw-match-count">
            {shown.map((toggle) => {
                const words = toggle.more === 0 ? null : moreWords(toggle.more);
                return (
                    <Switch
                        key={toggle.id}
                        size="xs"
                        aria-label={toggle.label}
                        label={words === null ? toggle.label : `${toggle.label} ${words}`}
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

/** What each matching row of a card takes. */
interface MatchProps extends CardProps {
    /** Changes the card's picks. */
    readonly set: (patch: Partial<CardPicks>) => void;
}

/**
 * Row 1 of a card's match: the type in the graph, or New nodes, and its field.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card
 * @param props.set - changes its picks
 * @param props.newNodes - whether New nodes is offered
 * @returns the row's cells
 */
function IntoCells({
    session,
    draft,
    card,
    set,
    newNodes,
}: Omit<MatchProps, "onChange"> & Readonly<{ newNodes: boolean }>): React.JSX.Element {
    const { into } = card.picks;
    const types = intoChoices(session, draft);
    const fields = into === null || into.isNew === true ? [] : intoFields(draft, into, card.step?.index);
    const picked = into?.field === undefined ? undefined : fields.find((each) => each.label === into.field);
    return (
        <>
            <Pick
                name={`${WORKSPACE_WORDS.inGraph} ${JOIN_WORDS.type.toLowerCase()}`}
                data={newNodes ? [...types, NEW_NODES] : types}
                value={choiceOfInto(into)}
                onPick={(value) => {
                    set({ into: intoOfChoice(value) });
                }}
            />
            {into?.isNew === true ? (
                <span />
            ) : (
                <Pick
                    name={`${WORKSPACE_WORDS.inGraph} ${JOIN_WORDS.field.toLowerCase()}`}
                    data={
                        into === null
                            ? []
                            : [
                                  { value: KEY_VALUE, label: keyColumn(draft, into) ?? JOIN_WORDS.key },
                                  ...fields.map((each) => ({ value: JSON.stringify(each.into), label: each.label })),
                              ]
                    }
                    value={fieldValue(into, picked?.into)}
                    onPick={(value) => {
                        if (into === null) {
                            return;
                        }
                        const field = fields.find((each) => JSON.stringify(each.into) === value);
                        set({ into: field?.into ?? intoOfChoice(choiceOfInto(into) ?? "") });
                    }}
                />
            )}
        </>
    );
}

/**
 * The field list's value for a side.
 * @param into - the side, or null while none is picked
 * @param field - the field picked of it, if any
 * @returns the value
 */
function fieldValue(into: CardInto | null, field: CardInto | undefined): string | null {
    if (into === null) {
        return null;
    }
    return field === undefined ? KEY_VALUE : JSON.stringify(field);
}

/**
 * Row 3 of a card's match: the other end's type, or New nodes, and the incoming field naming it, with
 * its live count; a node's can be taken off.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card
 * @param props.set - changes its picks
 * @param props.fields - the incoming source's columns
 * @param props.removable - whether it can be taken off
 * @returns the row's cells
 */
function OtherEndCells({
    session,
    draft,
    card,
    set,
    fields,
    removable,
}: Omit<MatchProps, "onChange"> &
    Readonly<{
        fields: readonly { readonly value: string; readonly label: string }[];
        removable: boolean;
    }>): React.JSX.Element {
    const { picks } = card;
    const end = picks.to ?? { into: null };
    const pair = toPairOf(picks);
    return (
        <>
            <Text size="xs" fw={600} aria-hidden>
                3
            </Text>
            <Pick
                name={`${WORKSPACE_WORDS.otherEnd} ${JOIN_WORDS.type.toLowerCase()}`}
                data={[...intoChoices(session, draft), NEW_NODES]}
                value={choiceOfInto(end.into)}
                onPick={(value) => {
                    set({ to: { ...end, into: intoOfChoice(value) } });
                }}
            />
            <Pick
                name={`${WORKSPACE_WORDS.otherEnd} ${JOIN_WORDS.field.toLowerCase()}`}
                data={fields}
                value={end.field ?? null}
                onPick={(field) => {
                    set({ to: { ...end, field } });
                }}
            />
            {removable ? (
                <ActionIcon
                    size="xs"
                    variant="subtle"
                    aria-label={`${WORKSPACE_WORDS.remove} ${WORKSPACE_WORDS.otherEnd}`}
                    onClick={() => {
                        set({ to: null });
                    }}
                >
                    <GLYPHS.close size={12} aria-hidden />
                </ActionIcon>
            ) : (
                <span />
            )}
            {pair === null || end.into?.isNew === true ? null : (
                <MatchCount
                    counts={countsOf(draft, picks, card.step?.index, pair)}
                    label={`${WORKSPACE_WORDS.otherEnd} ${WORKSPACE_WORDS.matchCount.toLowerCase()}`}
                />
            )}
        </>
    );
}

/**
 * The matching rows of a card: 1, the field in the graph (or New nodes); 2, the incoming source's
 * field; and, for an edge or a node naming two things, 3, the other end. Each match's live count is
 * the open draft's, a step card's counted against the graph before its own step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card
 * @param props.onChange - writes the card
 * @param props.becomes - what its rows become
 * @param props.onFocusValues - puts the match's value list in the table
 * @returns the rows
 */
function MatchRows({
    session,
    draft,
    card,
    onChange,
    becomes,
    onFocusValues,
}: CardProps & Readonly<{ becomes: Exclude<Becomes, "links">; onFocusValues: () => void }>): React.JSX.Element {
    const { picks } = card;
    const { from } = picks;
    const isNode = becomes === "node";
    const sources = [...session.data.staged(), ...session.data.sources()];
    const fromColumns =
        from === null ? [] : draftColumns(draft, from.source).map((column) => ({ value: column, label: column }));
    const set = (patch: Partial<CardPicks>): void => {
        onChange(card, { ...picks, ...patch }, card.result);
    };
    // An edge always names two ends; a node may name a second thing; new nodes at 1 stand alone.
    const two = becomes === "edge" || (isNode && (picks.to ?? null) !== null);
    const cells = { session, draft, card, set };
    const counts = countsOf(draft, picks, card.step?.index);
    const otherPair = two && picks.to?.into?.isNew !== true ? toPairOf(picks) : null;
    const otherCounts = otherPair === null ? null : countsOf(draft, picks, card.step?.index, otherPair);
    return (
        <div className="jw-match" onFocusCapture={onFocusValues}>
            <Text size="xs" fw={600} aria-hidden>
                1
            </Text>
            <IntoCells {...cells} newNodes={isNode && !two} />
            <span />
            <Text size="xs" fw={600} aria-hidden>
                2
            </Text>
            <Pick
                name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.source.toLowerCase()}`}
                data={sources.map((source) => ({ value: source.key, label: sourceName(source) }))}
                value={from?.source ?? null}
                onPick={(source) => {
                    onChange(...withSource(draft, card, source));
                }}
            />
            <Pick
                name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.field.toLowerCase()}`}
                data={fromColumns}
                value={from?.field ?? null}
                onPick={(field) => {
                    if (from !== null) {
                        set({ from: { source: from.source, field } });
                    }
                }}
            />
            <span />
            <MatchCount counts={counts} suggested={card.suggested} label={WORKSPACE_WORDS.matchCount} />
            {two ? <OtherEndCells {...cells} fields={fromColumns} removable={isNode} /> : null}
            <IgnoreSwitches more={switchesOf([counts, otherCounts])} picks={picks} set={set} />
            {isNode && !two && picks.into?.isNew !== true ? (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    className="jw-add-match"
                    disabled={from === null}
                    onClick={() => {
                        set({ to: { into: null } });
                    }}
                >
                    {`+ ${WORKSPACE_WORDS.match}`}
                </Button>
            ) : null}
        </div>
    );
}

/**
 * A card with its incoming source changed: what it becomes stays, and the element's guess for the new
 * source is drawn, never applied.
 * @param draft - the open draft
 * @param card - the card
 * @param source - the source picked
 * @returns what `onChange` takes
 */
function withSource(draft: SourceDraft, card: JoinCardView, source: string): Parameters<CardChange> {
    const next = newCard(draft, card.id, source);
    const { becomes, ignoreCase, ignoreSpaces } = card.picks;
    const other = becomes === "edge" ? { to: next.picks.to ?? { into: null } } : { to: null };
    // A guess is drawn on a card still asking; a written one waits for the reader's own field.
    const picks =
        card.step === null
            ? { ...next.picks, into: next.picks.into ?? card.picks.into, becomes, ...(becomes === null ? {} : other) }
            : { ...card.picks, becomes, ignoreCase, ignoreSpaces, from: { source }, ...other };
    return [{ ...card, picks, guess: next.guess, suggested: card.step === null && next.suggested }, picks, card.result];
}

/** Where a Links card's values are, when the nodes carry them. */
const ON_NODES = "nodes";

/**
 * A Links card's rows: the nodes linked, where their values are (on the nodes, or in a source's rows,
 * whose field names the node), and the columns matched with themselves.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card
 * @param props.onChange - writes the card
 * @returns the rows
 */
function LinkRows({ session, draft, card, onChange }: CardProps): React.JSX.Element {
    const { picks } = card;
    const { from, into, shared = [], inRows = false } = picks;
    const step = card.step?.index;
    const set = (patch: Partial<CardPicks>): void => {
        onChange(card, { ...picks, ...patch }, card.result);
    };
    const sources = [...session.data.staged(), ...session.data.sources()];
    // The links are the rows' source's own, else those of a source of the nodes.
    const ownerOf = (side: CardInto): CardPicks["from"] => {
        const key = side.source ?? draft.spaces().find((space) => space.space === side.space)?.rowsOf[0];
        return key === undefined ? from : { source: key };
    };
    return (
        <>
            <Row label={WORKSPACE_WORDS.nodes}>
                <Pick
                    name={`${WORKSPACE_WORDS.inGraph} ${JOIN_WORDS.type.toLowerCase()}`}
                    data={intoChoices(session, draft)}
                    value={choiceOfInto(into)}
                    onPick={(value) => {
                        const side = intoOfChoice(value);
                        set(inRows ? { into: side } : { into: side, from: ownerOf(side), shared: [] });
                    }}
                />
            </Row>
            <Row label={WORKSPACE_WORDS.valuesIn}>
                <Pick
                    name={WORKSPACE_WORDS.valuesIn}
                    data={[
                        { value: ON_NODES, label: WORKSPACE_WORDS.onNodes },
                        ...sources.map((source) => ({ value: source.key, label: sourceName(source) })),
                    ]}
                    value={inRows ? (from?.source ?? null) : ON_NODES}
                    onPick={(value) => {
                        set(
                            value === ON_NODES
                                ? { inRows: false, shared: [], ...(into === null ? {} : { from: ownerOf(into) }) }
                                : { inRows: true, shared: [], from: { source: value } },
                        );
                    }}
                />
            </Row>
            {inRows ? (
                <Row label={WORKSPACE_WORDS.namedBy}>
                    <Pick
                        name={WORKSPACE_WORDS.namedBy}
                        data={
                            from === null
                                ? []
                                : draftColumns(draft, from.source).map((column) => ({ value: column, label: column }))
                        }
                        value={from?.field ?? null}
                        onPick={(field) => {
                            if (from !== null) {
                                set({ from: { source: from.source, field } });
                            }
                        }}
                    />
                </Row>
            ) : null}
            <ColumnsRow
                label={WORKSPACE_WORDS.sharedField}
                value={shared}
                columns={sharedColumns(draft, picks, step)}
                onChange={(columns) => {
                    set({ shared: columns });
                }}
            />
        </>
    );
}

/** Merge's "many rows" ways, as `CardResult.many` names them. */
const MANY_ROWS = [
    { value: "first", label: WORKSPACE_WORDS.first },
    { value: "last", label: WORKSPACE_WORDS.last },
    { value: "list", label: WORKSPACE_WORDS.list },
    { value: "count", label: WORKSPACE_WORDS.count },
] as const;

/** What a row matching nothing does, for an edge's ends. */
const NO_MATCH = [
    { value: "add", label: WORKSPACE_WORDS.add },
    { value: "skip", label: WORKSPACE_WORDS.skip },
] as const;

/** What a row matching nothing does when each row is a node: it can also stay one, linked to nothing. */
const NO_MATCH_NODE = [...NO_MATCH, { value: "keep", label: WORKSPACE_WORDS.keep }] as const;

/** What a row whose value names several nodes does. */
const SEVERAL_MATCH = [
    { value: "each", label: WORKSPACE_WORDS.each },
    { value: "skip", label: WORKSPACE_WORDS.skip },
] as const;

/** The separators a cell of several values commonly holds. */
const SEPARATORS = [{ value: ";" }, { value: "," }, { value: "|" }];

/**
 * The options of what a card's rows become, one compact row each, and only those it needs.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card, with a step
 * @param props.result - its options
 * @param props.onChange - writes the card
 * @param props.onPatch - changes a choice its step keeps, such as a column's clash rule
 * @param props.onShowCells - lists a Values differ column's cells in the table
 * @returns the rows
 */
function Options({
    session,
    draft,
    card,
    result,
    onChange,
    onPatch,
    onShowCells,
}: CardProps &
    Readonly<{
        result: CardResult;
        onPatch: (step: number, patch: SourceStepPatch) => void;
        onShowCells: (step: number, column: string) => void;
    }>): React.JSX.Element {
    const { picks, step } = card;
    const set = (patch: Partial<CardResult>): void => {
        onChange(card, picks, { ...result, ...patch });
    };
    // Asked only where a value names several nodes.
    const several =
        result.fanOut === "each" && (countsOf(draft, picks, step?.index)?.fanOut ?? 0) === 0 ? null : (
            <Choice
                label={WORKSPACE_WORDS.severalMatch}
                value={result.fanOut}
                data={SEVERAL_MATCH}
                onChange={(fanOut) => {
                    set({ fanOut });
                }}
            />
        );
    if (picks.becomes === "fields") {
        return (
            <>
                <Choice
                    label={WORKSPACE_WORDS.manyRows}
                    value={result.many}
                    data={MANY_ROWS}
                    onChange={(many) => {
                        set({ many });
                    }}
                />
                {several}
                {[...(step?.valuesDiffer ?? [])]
                    .sort((a, b) => a.params.column.localeCompare(b.params.column))
                    .map(({ params }) =>
                        step === null ? null : (
                            <DifferRow
                                key={params.column}
                                step={step}
                                many={
                                    MANY_ROWS.find((each) => each.value === result.many)?.label ?? WORKSPACE_WORDS.first
                                }
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
                                    onPatch(step.index, {
                                        aggregate: Object.keys(aggregate).length === 0 ? null : aggregate,
                                    });
                                }}
                                onShow={() => {
                                    onShowCells(step.index, params.column);
                                }}
                            />
                        ),
                    )}
                <Choice
                    label={WORKSPACE_WORDS.noMatch}
                    value={result.unmatchedFrom}
                    data={[
                        { value: "keep", label: WORKSPACE_WORDS.add },
                        { value: "drop", label: WORKSPACE_WORDS.skip },
                    ]}
                    onChange={(unmatchedFrom) => {
                        set({ unmatchedFrom });
                    }}
                />
            </>
        );
    }
    const nodeTypes = session.data.types().filter((type) => type.kind === "node");
    const typeChoices = nodeTypes.map((type) => ({ value: type.name }));
    const edgeType = (
        <NameRow
            label={JOIN_WORDS.edgeType}
            options={edgeTypeChoices(session)}
            value={result.edgeType}
            onChange={(next) => {
                set({ edgeType: next });
            }}
        />
    );
    if (picks.becomes === "links") {
        return (
            <>
                <Choice
                    label={WORKSPACE_WORDS.linkAs}
                    value={result.as}
                    data={[
                        { value: "edges", label: WORKSPACE_WORDS.edges },
                        { value: "nodes", label: WORKSPACE_WORDS.aNodeEach },
                    ]}
                    onChange={(as) => {
                        set({ as });
                    }}
                />
                <NumberRow
                    label={WORKSPACE_WORDS.hubCap}
                    value={result.maxShared}
                    min={2}
                    options={[5, 10, 25, 100]}
                    onChange={(maxShared) => {
                        set({ maxShared });
                    }}
                />
                {result.as === "edges" ? (
                    <NumberRow
                        label={WORKSPACE_WORDS.minShared}
                        value={result.minShared}
                        min={1}
                        options={[1, 2, 3]}
                        onChange={(minShared) => {
                            set({ minShared });
                        }}
                    />
                ) : (
                    <NameRow
                        label={WORKSPACE_WORDS.newType}
                        options={typeChoices}
                        value={result.type}
                        onChange={(type) => {
                            set({ type });
                        }}
                    />
                )}
                {edgeType}
                <Row label={WORKSPACE_WORDS.ignore}>
                    <Group gap={12}>
                        {(["ignoreCase", "ignoreSpaces"] as const).map((each) => (
                            <Switch
                                key={each}
                                size="xs"
                                label={JOIN_WORDS[each]}
                                checked={picks[each]}
                                onChange={(event) => {
                                    onChange(card, { ...picks, [each]: event.currentTarget.checked }, result);
                                }}
                            />
                        ))}
                    </Group>
                </Row>
            </>
        );
    }
    if (picks.into?.isNew === true) {
        const source = picks.from?.source;
        return (
            <>
                <NameRow
                    label={WORKSPACE_WORDS.newType}
                    options={typeChoices}
                    value={result.type}
                    onChange={(type) => {
                        set({ type });
                    }}
                />
                <NameRow
                    label={WORKSPACE_WORDS.splitOn}
                    placeholder={WORKSPACE_WORDS.none}
                    options={SEPARATORS}
                    value={result.split}
                    trim={false}
                    onChange={(split) => {
                        set({ split });
                    }}
                />
                <ColumnsRow
                    label={WORKSPACE_WORDS.carry}
                    value={result.columns}
                    columns={
                        source === undefined
                            ? []
                            : draftColumns(draft, source).filter((column) => column !== picks.from?.field)
                    }
                    onChange={(columns) => {
                        set({ columns });
                    }}
                />
                {edgeType}
            </>
        );
    }
    return (
        <>
            {picks.to?.into?.isNew === true ? (
                <NameRow
                    label={WORKSPACE_WORDS.newType}
                    options={typeChoices}
                    value={newKind(picks)}
                    onChange={(space) => {
                        onChange(card, { ...picks, to: { ...picks.to, into: { space, isNew: true } } }, result);
                    }}
                />
            ) : null}
            {picks.becomes === "edge" ? (
                <>
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
                        label={WORKSPACE_WORDS.existing}
                        value={result.existing}
                        data={[
                            { value: "add", label: WORKSPACE_WORDS.add },
                            { value: "merge", label: WORKSPACE_WORDS.merge },
                        ]}
                        onChange={(existing) => {
                            set({ existing });
                        }}
                    />
                </>
            ) : null}
            {several}
            {picks.becomes === "edge" ? (
                <Choice
                    label={WORKSPACE_WORDS.noMatch}
                    value={result.unmatched === "add" ? "add" : "skip"}
                    data={NO_MATCH}
                    onChange={(unmatched) => {
                        set({ unmatched });
                    }}
                />
            ) : (
                <Choice
                    label={WORKSPACE_WORDS.noMatch}
                    value={result.unmatched}
                    data={NO_MATCH_NODE}
                    onChange={(unmatched) => {
                        set({ unmatched });
                    }}
                />
            )}
            <Choice
                label={JOIN_WORDS.direction}
                value={result.direction}
                data={directions(picks)}
                onChange={(direction) => {
                    set({ direction });
                }}
            />
            {edgeType}
        </>
    );
}

/**
 * A step's counts, each a button that lists its rows in the table; a count with no rows to list is
 * plain text.
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
        <Group gap={12} wrap="wrap" className="jw-counts">
            {words.map(({ id, label }) => {
                const count = buckets[id];
                return count === 0 ? null : (
                    <UnstyledButton
                        key={id}
                        className="ss-count-show"
                        onClick={() => {
                            onShow(id);
                        }}
                    >
                        {`${formatNumber(count)} ${label}`}
                    </UnstyledButton>
                );
            })}
            {step.link === null || buckets.hub.length === 0 ? null : (
                <Text size="xs" span>
                    {`${formatNumber(buckets.hub.length)} ${WORKSPACE_WORDS.overCap}`}
                </Text>
            )}
        </Group>
    );
}

/**
 * An open card: what each row becomes, then that choice's matching rows and, once the card has a
 * step, its options and counts.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.card - the card
 * @param props.onChange - writes the card
 * @param props.error - what the card's last write was refused with, if it was
 * @param props.tableActions - what can be done with the rows picked in the table, while it lists the card's
 * @param props.readSettings - how a staged source's rows are read, drawn while the choice uses it
 * @param props.onPatch - changes a choice its step keeps
 * @param props.onFocusValues - puts the match's value list in the table
 * @param props.onShowCells - lists a Values differ column's cells in the table
 * @param props.onShowRows - lists the rows behind one of the step's counts in the table
 * @returns the card's body
 */
export function JoinCardBody({
    session,
    draft,
    card,
    onChange,
    error,
    tableActions,
    readSettings,
    onPatch,
    onFocusValues,
    onShowCells,
    onShowRows,
}: CardProps &
    Readonly<{
        error: string | undefined;
        tableActions: React.ReactNode;
        readSettings: React.ReactNode;
        onPatch: (step: number, patch: SourceStepPatch) => void;
        onFocusValues: () => void;
        onShowCells: (step: number, column: string) => void;
        onShowRows: (step: number, bucket: string) => void;
    }>): React.JSX.Element {
    const name = useId();
    const { picks, step, result } = card;
    const becomes = shownBecomes(card);
    const sources = [...session.data.staged(), ...session.data.sources()];
    return (
        <Stack gap={8} className="jw-card">
            {becomes === null ? (
                <Row label={WORKSPACE_WORDS.incomingSource}>
                    <Pick
                        name={`${WORKSPACE_WORDS.incoming} ${JOIN_WORDS.source.toLowerCase()}`}
                        data={sources.map((source) => ({ value: source.key, label: sourceName(source) }))}
                        value={picks.from?.source ?? null}
                        onPick={(source) => {
                            onChange(...withSource(draft, card, source));
                        }}
                    />
                </Row>
            ) : null}
            <Radio.Group
                name={name}
                size="xs"
                label={WORKSPACE_WORDS.eachRow}
                value={picks.becomes}
                onChange={(value) => {
                    const next = BECOMES.find((each) => each.value === value)?.value;
                    if (next !== undefined) {
                        onChange(card, becoming(draft, picks, next), result);
                    }
                }}
            >
                <Stack gap={4} mt={4}>
                    {BECOMES.map(({ value, label }) => (
                        <Group key={value} gap={8} wrap="nowrap">
                            <Radio size="xs" value={value} label={label} />
                            {card.guess === value && picks.becomes === null ? (
                                <Text size="xs" c="dimmed">
                                    {WORKSPACE_WORDS.suggested}
                                </Text>
                            ) : null}
                        </Group>
                    ))}
                </Stack>
            </Radio.Group>
            {becomes === null || becomes === "links" ? null : (
                <MatchRows
                    session={session}
                    draft={draft}
                    card={card}
                    onChange={onChange}
                    becomes={becomes}
                    onFocusValues={onFocusValues}
                />
            )}
            {becomes === "links" ? <LinkRows session={session} draft={draft} card={card} onChange={onChange} /> : null}
            {picks.becomes === "fields" ? null : readSettings}
            {result === null || step === null ? null : (
                <Options
                    session={session}
                    draft={draft}
                    card={card}
                    result={result}
                    onChange={onChange}
                    onPatch={onPatch}
                    onShowCells={onShowCells}
                />
            )}
            {error === undefined ? null : (
                <Text size="xs" c="red" role="alert">
                    {error}
                </Text>
            )}
            {step === null ? null : (
                <StepCounts
                    step={step}
                    onShow={(bucket) => {
                        onShowRows(step.index, bucket);
                    }}
                />
            )}
            {tableActions}
        </Stack>
    );
}
