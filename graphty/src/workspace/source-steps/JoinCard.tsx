import type {
    GraphSession,
    SourceDraft,
    SourceJoinOutcome,
    SourceJoinSide,
    SourceMatchCounts,
    SourceStepPatch,
} from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Radio, Stack, Switch, Text } from "@mantine/core";
import React, { useId } from "react";

import { GLYPHS } from "../glyphs";
import { ariaKey } from "../keys/keys";
import { factWords, matchWords, outcomeWords, type SideChoices, sideName, type SourceNames } from "./cardWords";
import {
    BLANK_LINE,
    type CardEnd,
    type CardLine,
    type CardResult,
    countsOf,
    DEFAULT_RESULT,
    fieldsOf,
    type Ignoring,
    matchOf,
    type MatchSwitches,
    namesSeveral,
    NO_END,
    type OpenCard,
    outcomeKey,
    resultOf,
    sameSide,
    type Suggestion,
    switchesOf,
    wholeLines,
} from "./joinCards";
import { Options, Row, StepCounts } from "./JoinOptions";
import { DELETE_KEY } from "./keys";
import { KeyWords } from "./KeyWords";
import { Pick, type PickChoice, type PickGroup } from "./Pick";
import { JOIN_WORDS, moreWords, WORKSPACE_WORDS } from "./words";
import { cardReach } from "./workspaceCards";

/** New nodes, as a side list offers it. */
const NEW_VALUE = "new";

/**
 * A side as a list's value.
 * @param side - the side
 * @returns the value
 */
function sideValue(side: SourceJoinSide): string {
    return JSON.stringify(side.source === undefined ? { space: side.space } : { source: side.source });
}

/**
 * A line with one end picked anew: both its fields go when its side changes.
 * @param line - the line
 * @param at - the end
 * @param end - its new side
 * @returns the line
 */
function withSide(line: CardLine, at: "a" | "b", end: CardEnd): CardLine {
    const other = { ...(at === "a" ? line.b : line.a), field: null };
    return at === "a" ? { a: end, b: other } : { a: other, b: end };
}

/**
 * Lines whose two sources name no source of the ones before them, blank. A line with one source picked
 * keeps it, whichever end: the other end then offers only the card's sources.
 * @param lines - the lines
 * @returns the lines
 */
function connected(lines: readonly CardLine[]): readonly CardLine[] {
    const named: SourceJoinSide[] = [];
    return lines.map((line, at) => {
        const sides = [line.a.side, line.b.side].filter((side) => side !== null);
        const linked = at === 0 || sides.some((side) => named.some((each) => sameSide(each, side)));
        if (!linked && sides.length === 2) {
            return BLANK_LINE;
        }
        if (linked) {
            named.push(...sides);
        }
        return line;
    });
}

/**
 * The sources a card's other lines name, each once.
 * @param card - the card
 * @param at - the line left out
 * @returns the sources
 */
function namedBy(card: OpenCard, at: number): SourceJoinSide[] {
    const named: SourceJoinSide[] = [];
    for (const side of card.lines.flatMap((line, i) => (i === at ? [] : [line.a.side, line.b.side]))) {
        if (side !== null && !named.some((each) => sameSide(each, side))) {
            named.push(side);
        }
    }
    return named;
}

/** What every line of a card takes. */
interface LineProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly names: SourceNames;
    readonly card: OpenCard;
    /** The line's place. */
    readonly at: number;
    readonly choices: SideChoices;
    readonly suggestion: Suggestion | null;
    /** Writes the card's lines; `resided` when a side changed. */
    readonly onLines: (lines: readonly CardLine[], resided: boolean) => void;
}

/**
 * The sides a picker offers, in their groups.
 * @param props - the line
 * @param end - which end
 * @returns the choices
 */
function sideData(props: LineProps, end: "a" | "b"): readonly (PickChoice | PickGroup)[] {
    const { session, names, choices, card, at } = props;
    const choice = (side: SourceJoinSide): PickChoice => ({
        value: sideValue(side),
        label: sideName(session, names, side),
    });
    if (at > 0) {
        // A further line holds a source the card already names, at either end: once the other end has
        // one it does not name, this end offers only those.
        const named = namedBy(card, at);
        const other = card.lines[at][end === "a" ? "b" : "a"];
        const free = other.side === null ? other.isNew !== true : named.some((each) => sameSide(each, other.side));
        if (!free) {
            return named.map((side) => choice(side));
        }
    }
    const groups = [
        { group: WORKSPACE_WORDS.waiting, items: choices.waiting.map((side) => choice(side)) },
        { group: WORKSPACE_WORDS.inGraph, items: choices.inGraph.map((side) => choice(side)) },
        { group: WORKSPACE_WORDS.nodeTypes, items: choices.types.map((side) => choice(side)) },
    ].filter((each) => each.items.length > 0);
    return end === "a" ? groups : [...groups, { value: NEW_VALUE, label: WORKSPACE_WORDS.newNodes }];
}

/**
 * A line's side picker.
 * @param props - the line
 * @param props.end - which end
 * @returns the picker
 */
function SidePick(props: LineProps & Readonly<{ end: "a" | "b" }>): React.JSX.Element {
    const { session, card, at, end, onLines } = props;
    const line = card.lines[at];
    const picked = line[end];
    const data = sideData(props, end);
    const value = picked.side === null ? null : sideValue(picked.side);
    const source = session.data.sources({ staged: true }).find((each) => each.key === picked.side?.source);
    return (
        <Pick
            name={pickerName(WORKSPACE_WORDS.source, at, end)}
            placeholder={WORKSPACE_WORDS.source}
            data={data}
            value={picked.isNew === true ? NEW_VALUE : value}
            title={source?.name}
            onPick={(next) => {
                const to: CardEnd =
                    next === NEW_VALUE
                        ? { ...NO_END, isNew: true }
                        : { side: JSON.parse(next) as SourceJoinSide, field: null };
                onLines(connected(card.lines.map((each, i) => (i === at ? withSide(each, end, to) : each))), true);
            }}
        />
    );
}

/**
 * A picker's name: which end of the first line, or of a further one.
 * @param word - what it picks
 * @param at - the line's place
 * @param end - the end
 * @returns such as "Field 1", or "Match 2 field 1"
 */
function pickerName(word: string, at: number, end: "a" | "b"): string {
    const name = `${at === 0 ? word : word.toLowerCase()} ${end === "a" ? "1" : "2"}`;
    return at === 0 ? name : `${WORKSPACE_WORDS.match} ${String(at + 1)} ${name}`;
}

/**
 * A line's field picker: each field with its facts, the source an earlier join brought it from, and
 * "suggested" on the likeliest one.
 * @param props - the line
 * @param props.end - which end
 * @returns the picker
 */
function FieldPick(props: LineProps & Readonly<{ end: "a" | "b" }>): React.JSX.Element {
    const { draft, names, card, at, end, suggestion, onLines } = props;
    const line = card.lines[at];
    const other = end === "a" ? line.b : line.a;
    const before = card.step?.index;
    // A field an earlier join brought is in no row: at most one end of a match can be one.
    const joined = fieldsOf(draft, other.side, before).some(
        (field) => field.name === other.field && field.from !== null,
    );
    const alike = sameSide(line.a.side, line.b.side);
    const data = fieldsOf(draft, line[end].side, before).map((field): PickChoice => {
        const from = field.from === null ? [] : [names.get(field.from) ?? WORKSPACE_WORDS.removedSource];
        const likely = suggestion?.[end] === field.name ? [WORKSPACE_WORDS.suggested] : [];
        return {
            value: field.name,
            label: field.name,
            hint: [...from, factWords(field), ...likely].filter((each) => each !== "").join(", "),
            disabled: joined && field.from !== null && !(alike && other.field === field.name),
        };
    });
    return (
        <Pick
            name={pickerName(JOIN_WORDS.field, at, end)}
            placeholder={JOIN_WORDS.field}
            data={data}
            value={line[end].field}
            onPick={(field) => {
                const to = { ...line, [end]: { ...line[end], field } };
                onLines(
                    card.lines.map((each, i) => (i === at ? to : each)),
                    false,
                );
            }}
        />
    );
}

/**
 * One line of a card: its two sources, a field of each under them, and its live count.
 * @param props - Component props
 * @param props.onFocus - the reader is on the line
 * @returns the line
 */
function Line(
    props: LineProps & Readonly<{ counts: SourceMatchCounts | null; onFocus: () => void }>,
): React.JSX.Element {
    const { card, at, counts, onLines, onFocus } = props;
    const line = card.lines[at];
    const two = line.a.side !== null && (line.b.side !== null || line.b.isNew === true);
    return (
        <fieldset
            className="ss-field jw-line"
            aria-label={`${WORKSPACE_WORDS.match} ${String(at + 1)}`}
            onFocusCapture={onFocus}
        >
            <SidePick {...props} end="a" />
            <span />
            <SidePick {...props} end="b" />
            {/* The first match keeps the remove column empty, so every match's "=" lines up. */}
            {at === 0 ? (
                <span />
            ) : (
                <ActionIcon
                    size="xs"
                    variant="subtle"
                    aria-label={`${WORKSPACE_WORDS.remove} ${WORKSPACE_WORDS.match.toLowerCase()} ${String(at + 1)}`}
                    onClick={() => {
                        onLines(
                            card.lines.filter((_each, i) => i !== at),
                            false,
                        );
                    }}
                >
                    <GLYPHS.close size={12} aria-hidden />
                </ActionIcon>
            )}
            {two ? (
                <>
                    <FieldPick {...props} end="a" />
                    <Text size="xs" ta="center" aria-hidden>
                        =
                    </Text>
                    {line.b.isNew === true ? (
                        <Text size="xs">{WORKSPACE_WORDS.newNodes}</Text>
                    ) : (
                        <FieldPick {...props} end="b" />
                    )}
                    <span />
                </>
            ) : null}
            {counts === null ? null : (
                <Text
                    size="xs"
                    className="jw-line-count"
                    aria-label={`${WORKSPACE_WORDS.matchCount} ${String(at + 1)}`}
                >
                    {matchWords(counts)}
                </Text>
            )}
        </fieldset>
    );
}

/** What each Ignore switch ignores, after the row's own word. */
const IGNORE_WORDS = { ignoreCase: "Case", ignoreSpaces: "Spaces" } as const;

/**
 * The "Ignore" switches of a card, which set how all its matches compare: each drawn while it is on
 * or would match more rows, alone or with the other.
 * @param props - Component props
 * @param props.more - what they would add
 * @param props.on - how the card compares now
 * @param props.always - both are drawn, as nothing counts what they would add
 * @param props.onIgnore - changes one
 * @returns the row, or nothing when neither would change anything
 */
function IgnoreSwitches({
    more,
    on,
    always,
    onIgnore,
}: Readonly<{
    more: MatchSwitches;
    on: Ignoring;
    always: boolean;
    onIgnore: (patch: Partial<Ignoring>) => void;
}>): React.JSX.Element | null {
    const shown = (
        [
            { id: "ignoreCase", label: JOIN_WORDS.ignoreCase, on: on.ignoreCase, more: more.moreWithCase },
            { id: "ignoreSpaces", label: JOIN_WORDS.ignoreSpaces, on: on.ignoreSpaces, more: more.moreWithSpaces },
        ] as const
    ).filter((toggle) => always || toggle.on || (toggle.more ?? 0) > 0 || more.together);
    if (shown.length === 0) {
        return null;
    }
    return (
        <Row label={WORKSPACE_WORDS.ignore}>
            <Group gap={12} wrap="wrap">
                {shown.map((toggle) => {
                    const words = (toggle.more ?? 0) === 0 ? null : moreWords(toggle.more);
                    const name = IGNORE_WORDS[toggle.id];
                    return (
                        <Switch
                            key={toggle.id}
                            size="xs"
                            aria-label={toggle.label}
                            label={words === null ? name : `${name} ${words}`}
                            checked={toggle.on}
                            onChange={(event) => {
                                onIgnore({ [toggle.id]: event.currentTarget.checked });
                            }}
                        />
                    );
                })}
            </Group>
        </Row>
    );
}

/** The card editor's props. */
interface JoinCardBodyProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly names: SourceNames;
    readonly card: OpenCard;
    readonly choices: SideChoices;
    /** What its matches can make. */
    readonly outcomes: readonly SourceJoinOutcome[];
    /** Each line's likeliest fields. */
    readonly suggestions: readonly (Suggestion | null)[];
    /** Whether it can be removed: not the one blank card there is. */
    readonly removable: boolean;
    readonly error: string | undefined;
    /** What can be done with the rows picked in the table, while it lists the card's. */
    readonly tableActions: React.ReactNode;
    /** Adding the one waiting source picked as it is. */
    readonly addAsIs: React.ReactNode;
    /** How the waiting sources' rows are read. */
    readonly readSettings: React.ReactNode;
    readonly onLines: (lines: readonly CardLine[], resided: boolean) => void;
    readonly onIgnore: (patch: Partial<Ignoring>) => void;
    readonly onOutcome: (outcome: SourceJoinOutcome) => void;
    readonly onSet: (outcome: SourceJoinOutcome, patch: Partial<CardResult>) => void;
    readonly onPatch: (step: number, patch: SourceStepPatch) => void;
    readonly onLine: (at: number) => void;
    readonly onShowCells: (step: number, column: string) => void;
    readonly onShowRows: (step: number, bucket: string) => void;
    readonly onRemove: () => void;
}

/**
 * The editor of a selected card: its sources, then a field of each, then how to join them, and, once one
 * way is picked, that way's options and counts.
 * @param props - Component props
 * @returns the editor
 */
export function JoinCardBody(props: JoinCardBodyProps): React.JSX.Element {
    const { session, draft, names, card, choices, outcomes, suggestions, error, onLines } = props;
    const group = useId();
    const { lines, step } = card;
    const name = (side: SourceJoinSide): string => sideName(session, names, side);
    const counts = lines.map((line) => countsOf(draft, line, card, step?.index));
    const current = outcomes.find((each) => each.current === true);
    const result =
        step === null || current === undefined ? { ...DEFAULT_RESULT, ...card.chosen } : resultOf(step, current);
    const whole = wholeLines(lines);
    const shared = whole.some(({ a, b }) => sameSide(a.side, b.side) && a.field === b.field);
    const worded = (outcome: SourceJoinOutcome): CardResult =>
        outcome === current ? result : { ...DEFAULT_RESULT, ...card.chosen };
    return (
        <Stack gap={8} className="jw-card" data-join-editor={card.id}>
            {lines.map((_line, at) => (
                <Line
                    // eslint-disable-next-line react/no-array-index-key -- a line is its place: two can be alike
                    key={at}
                    session={session}
                    draft={draft}
                    names={names}
                    card={card}
                    at={at}
                    choices={choices}
                    suggestion={suggestions.at(at) ?? null}
                    counts={counts[at]}
                    onLines={onLines}
                    onFocus={() => {
                        props.onLine(at);
                    }}
                />
            ))}
            {props.addAsIs}
            {whole.length === 0 ? null : (
                <>
                    <IgnoreSwitches more={switchesOf(counts)} on={card} always={shared} onIgnore={props.onIgnore} />
                    <Group>
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            disabled={lines.some((line) => matchOf(line) === null)}
                            onClick={() => {
                                onLines([...lines, BLANK_LINE], false);
                            }}
                        >
                            {`+ ${WORKSPACE_WORDS.match}`}
                        </Button>
                    </Group>
                </>
            )}
            {props.readSettings}
            {outcomes.length === 0 ? null : (
                <Radio.Group
                    name={group}
                    size="xs"
                    label={WORKSPACE_WORDS.joinAs}
                    value={current === undefined ? null : outcomeKey(current)}
                    onChange={(value) => {
                        const next = outcomes.find((each) => outcomeKey(each) === value);
                        if (next !== undefined) {
                            props.onOutcome(next);
                        }
                    }}
                >
                    <Stack gap={4} mt={4}>
                        {outcomes.map((each) => (
                            <Radio
                                key={outcomeKey(each)}
                                size="xs"
                                value={outcomeKey(each)}
                                label={outcomeWords(each, { name, lines, result: worded(each) })}
                            />
                        ))}
                    </Stack>
                </Radio.Group>
            )}
            {step === null || current === undefined ? null : (
                <Options
                    session={session}
                    draft={draft}
                    step={step}
                    lines={lines}
                    outcome={current}
                    result={result}
                    several={namesSeveral(draft, step)}
                    name={name}
                    onSet={(patch) => {
                        props.onSet(current, patch);
                    }}
                    onPatch={props.onPatch}
                    onShowCells={props.onShowCells}
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
                    reach={cardReach(draft, card.steps)}
                    onShow={(bucket) => {
                        props.onShowRows(step.index, bucket);
                    }}
                />
            )}
            {props.tableActions}
            {props.removable ? <RemoveButton onRemove={props.onRemove} /> : null}
        </Stack>
    );
}

/**
 * Removes the selected card.
 * @param props - Component props
 * @param props.onRemove - removes it
 * @returns the button
 */
export function RemoveButton({ onRemove }: Readonly<{ onRemove: () => void }>): React.JSX.Element {
    return (
        <Group>
            <Button
                size="compact-xs"
                variant="subtle"
                aria-keyshortcuts={ariaKey(DELETE_KEY)}
                rightSection={<KeyWords combo={DELETE_KEY} />}
                onClick={onRemove}
            >
                {WORKSPACE_WORDS.remove}
            </Button>
        </Group>
    );
}
