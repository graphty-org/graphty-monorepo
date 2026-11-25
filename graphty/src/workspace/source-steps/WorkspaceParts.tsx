import { DataTable, type DataTableColumn, PANEL_GRID, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    JoinReduce,
    SourceCellValue,
    SourceColumnProfile,
    SourceDraft,
    SourceDraftCell,
    SourceElementRef,
    SourceKey,
    SourceStepRow,
} from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React from "react";

import { formatNumber } from "../inspector/words";
import { DraftEffects, Line } from "./DraftEffects";
import { profileOf } from "./join";
import { Pick } from "./Pick";
import { nameOf, valueWords } from "./tableColumns";
import {
    addStepWords,
    afterWords,
    CELL_FILTERS,
    cellWords,
    DRILL_WORDS,
    JOIN_WORDS,
    KIND_WORDS,
    overlapCountWords,
    overlapQuestionWords,
    RULE_WORDS,
    STAGED_WORDS,
    STEP_WORDS,
    WORKSPACE_WORDS,
} from "./words";

/** The per-column ways a merge step reduces a column's rows when one node takes several. */
const REDUCE_CHOICES: readonly { readonly value: JoinReduce; readonly label: string }[] = [
    { value: "first", label: "First" },
    { value: "last", label: "Last" },
    { value: "list", label: "List" },
    { value: "count", label: "Count" },
    { value: "sum", label: "Sum" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
    { value: "mean", label: "Mean" },
];

/** A reduce value for "no reduce": the column follows the card's Many rows. */
const NO_REDUCE = "row";

/**
 * A merge step's Values differ row: the column (which lists its cells in the table), its clash
 * rule, and how its rows reduce when several meet one node (`editStep({ aggregate })`).
 * @param props - Component props
 * @param props.step - the step
 * @param props.many - the card's Many rows choice, which a column with none of its own follows
 * @param props.column - the column
 * @param props.rule - its clash rule now
 * @param props.rules - the rules its values take
 * @param props.onRule - sets the rule
 * @param props.onReduce - sets the reduce, or null for the row rule
 * @param props.onShow - lists the column's cells in the table
 * @returns the row
 */
export function DifferRow({
    step,
    many,
    column,
    rule,
    rules,
    onRule,
    onReduce,
    onShow,
}: Readonly<{
    step: SourceStepRow;
    many: string;
    column: string;
    rule: string;
    rules: readonly string[];
    onRule: (rule: string) => void;
    onReduce: (reduce: JoinReduce | null) => void;
    onShow: () => void;
}>): React.JSX.Element {
    const reduce = step.act?.aggregate?.[column] ?? NO_REDUCE;
    return (
        <div className="jw-row">
            <UnstyledButton className="ss-count-show" onClick={onShow} aria-label={`${DRILL_WORDS.cells} ${column}`}>
                <Text size="xs" truncate>
                    {column}
                </Text>
            </UnstyledButton>
            <div className="jw-row-controls">
                <Pick
                    name={`${WORKSPACE_WORDS.clash} ${column}`}
                    data={rules.map((each) => ({ value: each, label: RULE_WORDS[each as keyof typeof RULE_WORDS] }))}
                    value={rule}
                    onPick={onRule}
                />
                <Pick
                    name={`${WORKSPACE_WORDS.manyRows} ${column}`}
                    data={[
                        { value: NO_REDUCE, label: many },
                        ...REDUCE_CHOICES.filter((each) => each.label !== many || each.value === reduce),
                    ]}
                    value={reduce}
                    onPick={(value) => {
                        onReduce(REDUCE_CHOICES.find((each) => each.value === value)?.value ?? null);
                    }}
                />
            </div>
        </div>
    );
}

/**
 * The body of an Add step's card: the key-overlap questions it still asks ("Same person?"), each
 * answered Merge or Keep separate (`draft.answerOverlap`), and its new nodes and edges.
 * @param props - Component props
 * @param props.draft - the open draft
 * @param props.step - the Add step
 * @param props.spaceName - names a space as the reader reads it
 * @param props.onError - shows a refusal on the card
 * @returns the body
 */
export function AddStepBody({
    draft,
    step,
    spaceName,
    onError,
}: Readonly<{
    draft: SourceDraft;
    step: SourceStepRow;
    spaceName: (space: string) => string;
    onError: (error: unknown) => void;
}>): React.JSX.Element {
    const questions = draft.preview().questions.filter((question) => question.params.source === step.source);
    return (
        <Stack gap={4}>
            {questions.map((question) => (
                <Group key={question.params.space} gap={6} wrap="wrap" justify="space-between">
                    <Text size="xs">{overlapQuestionWords(spaceName(question.params.space))}</Text>
                    <Text size="xs" c="dimmed">
                        {overlapCountWords(question)}
                    </Text>
                    <Group gap={4} wrap="nowrap">
                        {(["merge", "separate"] as const).map((answer) => (
                            <Button
                                key={answer}
                                size="compact-xs"
                                variant="default"
                                onClick={() => {
                                    try {
                                        draft.answerOverlap(question.params.source, answer);
                                    } catch (error) {
                                        onError(error);
                                    }
                                }}
                            >
                                {answer === "merge" ? STAGED_WORDS.merge : STAGED_WORDS.separate}
                            </Button>
                        ))}
                    </Group>
                </Group>
            ))}
            <Text size="xs" c="dimmed">
                {addStepWords(step)}
            </Text>
        </Stack>
    );
}

/**
 * What removing a source does, shown while the workspace holds the removal (opened from the
 * source's Remove): the graph's totals before and after, the later steps that go with it or whose
 * counts move, references left unbound, and the reader edits that lose their element. Done commits
 * it with the cards as one undo step; Cancel keeps the source.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.source - the source removed
 * @returns the strip
 */
export function RemoveStrip({
    session,
    draft,
    source,
}: Readonly<{ session: GraphSession; draft: SourceDraft; source: SourceKey }>): React.JSX.Element {
    const preview = draft.preview();
    const title = `${WORKSPACE_WORDS.remove} ${nameOf(session, source)}`;
    return (
        <section className="jw-remove" aria-label={title}>
            <Stack gap={4}>
                <Text size="xs" fw={600}>
                    {title}
                </Text>
                <Line label={STEP_WORDS.nodes} value={afterWords(preview.before.nodes, preview.after.nodes)} />
                <Line label={STEP_WORDS.edges} value={afterWords(preview.before.edges, preview.after.edges)} />
                <DraftEffects session={session} preview={preview} own={(step) => step.source === source} />
            </Stack>
        </section>
    );
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
            width: Math.min(240, Math.max(96, nameOf(session, source).length * 7 + 32)),
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

/**
 * What a card can do with the rows the reader picked in the table, while it lists one of the card's
 * counts (leave them out of the step, or take a left-out key back) or one of its Values differ columns
 * (take source 1's or source 2's value, or clear the pick). The table itself is for looking only.
 * @param props - Component props
 * @param props.draft - the open draft
 * @param props.step - the card's step
 * @param props.column - the Values differ column listed, or null while a count's rows are
 * @param props.keys - the keys of the picked rows
 * @param props.refs - the elements of the picked cells
 * @param props.onDone - called once an act was made
 * @param props.onError - shows a refusal on the card
 * @returns the buttons
 */
export function TableActions({
    draft,
    step,
    column,
    keys,
    refs,
    onDone,
    onError,
}: Readonly<{
    draft: SourceDraft;
    step: SourceStepRow;
    column: string | null;
    keys: readonly SourceCellValue[];
    refs: readonly SourceElementRef[];
    onDone: () => void;
    onError: (error: unknown) => void;
}>): React.JSX.Element {
    const act = (run: () => unknown): void => {
        try {
            run();
            onDone();
        } catch (error) {
            onError(error);
        }
    };
    const button = (label: string, name: string, disabled: boolean, run: () => unknown): React.JSX.Element => (
        <Button
            key={name}
            size="compact-xs"
            variant="default"
            aria-label={name}
            disabled={disabled}
            onClick={() => {
                act(run);
            }}
        >
            {label}
        </Button>
    );
    if (column !== null) {
        const none = refs.length === 0;
        const from = step.source;
        // Pick 1 takes the value no row of the incoming source brought; Pick 2 takes that source's.
        const picks: readonly (readonly [string, () => unknown])[] = [
            [WORKSPACE_WORDS.pick1, () => draft.pickAll({ otherThan: from, column, only: "all", refs })],
            [WORKSPACE_WORDS.pick2, () => draft.pickAll({ source: from, column, only: "all", refs })],
            [WORKSPACE_WORDS.clearPicks, () => draft.clearPicks({ column, refs })],
        ];
        return (
            <Group gap={6} wrap="wrap" data-table-actions="">
                <Text size="xs">{column}</Text>
                {picks.map(([label, run]) => button(label, label, none, run))}
            </Group>
        );
    }
    return (
        <Group gap={6} wrap="wrap" data-table-actions="">
            {button(WORKSPACE_WORDS.exclude, WORKSPACE_WORDS.exclude, keys.length === 0, () => {
                draft.exclude(step.index, keys);
            })}
            {step.except?.values.map((key) => {
                const name = `${WORKSPACE_WORDS.include} ${String(key)}`;
                return button(name, name, false, () => {
                    draft.include(step.index, [key]);
                });
            })}
        </Group>
    );
}

/** Which cells of a Values differ column the table lists. */
export type CellFilter = (typeof CELL_FILTERS)[number]["value"];

/**
 * The cells of one Values differ column at a step, from `preview().cells`: each source's value,
 * the value shown and what shows it; All, Open or Decided. The card the column is on settles the
 * selected ones.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.step - the step
 * @param props.column - the column
 * @param props.only - which cells
 * @param props.height - the table's height
 * @param props.selected - the cells selected, by their ids
 * @param props.onOnly - changes which cells
 * @param props.onSelect - takes the cells selected
 * @returns the pane
 */
export function CellsPane({
    session,
    draft,
    step,
    column,
    only,
    height,
    selected,
    onOnly,
    onSelect,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    step: SourceStepRow;
    column: string;
    only: CellFilter;
    height: number;
    selected: readonly string[];
    onOnly: (only: CellFilter) => void;
    onSelect: (ids: readonly string[], refs: readonly SourceElementRef[]) => void;
}>): React.JSX.Element {
    // ponytail: every cell of the column at once; page it as the values list does when counts reach the thousands.
    const { total, cells } = draft.preview().cells({ column, step: step.index, only });
    const ids = cells.map((cell) => JSON.stringify(cell.ref));
    return (
        <div className="jw-table">
            <Group gap={6} wrap="wrap">
                <Text size="xs" fw={600}>
                    {column}
                </Text>
                <SegmentedControl
                    size="xs"
                    aria-label={DRILL_WORDS.cells}
                    value={only}
                    data={CELL_FILTERS.map((each) => ({ ...each }))}
                    onChange={(value) => {
                        onOnly(CELL_FILTERS.find((each) => each.value === value)?.value ?? "all");
                    }}
                />
                <Text size="xs" aria-label={`${column} ${DRILL_WORDS.cells}`}>
                    {formatNumber(total)}
                </Text>
            </Group>
            <div className="jw-table-grid">
                <DataTable<SourceDraftCell>
                    key={`${column}:${only}`}
                    label={DRILL_WORDS.cellsLabel}
                    rowHeight={PANEL_GRID.ROW_PITCH}
                    headerHeight={PANEL_GRID.ROW_PITCH}
                    data={cells}
                    columns={cellColumns(session, cells)}
                    getRowId={(_cell, index) => ids[index] ?? String(index)}
                    height={height}
                    selectionMode="multiple"
                    selectedIds={selected}
                    onSelectionChange={(next) => {
                        onSelect(
                            [...next],
                            cells.filter((_cell, at) => next.includes(ids[at] ?? "")).map((cell) => cell.ref),
                        );
                    }}
                />
            </div>
        </div>
    );
}

/**
 * One field's profile: kind, valid, empty, distinct and samples.
 * @param props - Component props
 * @param props.title - whose field
 * @param props.profile - the profile, from the element
 * @returns the column
 */
function Profile({
    title,
    profile,
}: Readonly<{ title: string; profile: SourceColumnProfile | null }>): React.JSX.Element {
    const rows: readonly (readonly [string, string])[] =
        profile === null
            ? []
            : [
                  [JOIN_WORDS.kind, KIND_WORDS[profile.kind]],
                  [JOIN_WORDS.valid, formatNumber(profile.valid)],
                  [JOIN_WORDS.empty, formatNumber(profile.empty)],
                  [JOIN_WORDS.distinct, formatNumber(profile.distinct)],
                  [JOIN_WORDS.samples, profile.samples.map((sample) => cellWords(sample)).join(", ")],
              ];
    return (
        <fieldset className="ss-profile">
            <Text component="legend" size="xs" fw={600} truncate>
                {title}
            </Text>
            {rows.map(([label, value]) => (
                <Group key={label} gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed" w={56}>
                        {label}
                    </Text>
                    <Text size="xs" truncate aria-label={`${title} ${label.toLowerCase()}`}>
                        {value}
                    </Text>
                </Group>
            ))}
        </fieldset>
    );
}

/**
 * The two fields of a card's match side by side, each profiled by the open draft: kind, valid,
 * empty, distinct and samples.
 * @param props - Component props
 * @param props.draft - the open draft
 * @param props.sides - each field's name and what it reads
 * @returns the pane
 */
export function FieldsPane({
    draft,
    sides,
}: Readonly<{
    draft: SourceDraft;
    sides: readonly {
        readonly title: string;
        readonly side: { readonly source?: SourceKey; readonly field?: string; readonly space?: string };
    }[];
}>): React.JSX.Element {
    return (
        <Group gap="md" align="flex-start" wrap="nowrap" className="jw-table">
            {sides.map(({ title, side }) => (
                <Profile key={title} title={title} profile={profileOf(draft, side)} />
            ))}
        </Group>
    );
}
