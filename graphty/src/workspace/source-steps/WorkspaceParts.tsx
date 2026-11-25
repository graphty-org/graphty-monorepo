import { DataTable, type DataTableColumn, PANEL_GRID, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    JoinReduce,
    SourceColumnProfile,
    SourceDraft,
    SourceDraftCell,
    SourceKey,
    SourceStepRow,
} from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

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

/** A reduce value for "no reduce": the step keeps its row rule for the column. */
const NO_REDUCE = "row";

/**
 * A merge step's Values differ row: the column (which lists its cells in the table), its clash
 * rule, and how its rows reduce when several meet one node (`editStep({ aggregate })`).
 * @param props - Component props
 * @param props.step - the step
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
    column,
    rule,
    rules,
    onRule,
    onReduce,
    onShow,
}: Readonly<{
    step: SourceStepRow;
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
                    data={[{ value: NO_REDUCE, label: WORKSPACE_WORDS.row }, ...REDUCE_CHOICES]}
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

/** Which cells of a Values differ column the table lists. */
export type CellFilter = (typeof CELL_FILTERS)[number]["value"];

/**
 * The cells of one Values differ column at a step, from `preview().cells`: each source's value,
 * the value shown and what shows it; All, Open or Decided. The selected cells take source 1's or
 * source 2's value (`draft.pickAll`), or lose their picks (`draft.clearPicks`): conflict
 * resolution by the reader.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.step - the step
 * @param props.column - the column
 * @param props.only - which cells
 * @param props.height - the table's height
 * @param props.onOnly - changes which cells
 * @param props.onError - shows a refusal
 * @returns the pane
 */
export function CellsPane({
    session,
    draft,
    step,
    column,
    only,
    height,
    onOnly,
    onError,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    step: SourceStepRow;
    column: string;
    only: CellFilter;
    height: number;
    onOnly: (only: CellFilter) => void;
    onError: (error: unknown) => void;
}>): React.JSX.Element {
    // on reload: fresh: pointer: the cells picked for a look
    const [selected, setSelected] = useState<readonly string[]>([]);
    // ponytail: every cell of the column at once; page it as the values list does when counts reach the thousands.
    const { total, cells } = draft.preview().cells({ column, step: step.index, only });
    const ids = cells.map((cell) => JSON.stringify(cell.ref));
    const refs = cells.filter((_cell, at) => selected.includes(ids[at] ?? "")).map((cell) => cell.ref);
    const act = (run: () => number): void => {
        try {
            run();
            setSelected([]);
        } catch (error) {
            onError(error);
        }
    };
    // Pick 1 takes the value no row of the incoming source brought; Pick 2 takes that source's.
    const from = step.source;
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
                        setSelected([]);
                        onOnly(CELL_FILTERS.find((each) => each.value === value)?.value ?? "all");
                    }}
                />
                <Text size="xs" aria-label={`${column} ${DRILL_WORDS.cells}`}>
                    {formatNumber(total)}
                </Text>
                <Button
                    size="compact-xs"
                    variant="default"
                    disabled={refs.length === 0}
                    onClick={() => {
                        act(() => draft.pickAll({ otherThan: from, column, only: "all", refs }));
                    }}
                >
                    {WORKSPACE_WORDS.pick1}
                </Button>
                <Button
                    size="compact-xs"
                    variant="default"
                    disabled={refs.length === 0}
                    onClick={() => {
                        act(() => draft.pickAll({ source: from, column, only: "all", refs }));
                    }}
                >
                    {WORKSPACE_WORDS.pick2}
                </Button>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={refs.length === 0}
                    onClick={() => {
                        act(() => draft.clearPicks({ column, refs }));
                    }}
                >
                    {WORKSPACE_WORDS.clearPicks}
                </Button>
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
                        setSelected([...next]);
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
