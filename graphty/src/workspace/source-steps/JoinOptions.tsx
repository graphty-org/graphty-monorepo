import { ComboInput, ControlSection, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    SourceDraft,
    SourceDraftMadeCounts,
    SourceJoinOutcome,
    SourceJoinSide,
    SourceStepPatch,
    SourceStepRow,
} from "@graphty/graphty-element/session";
import { Group, MultiSelect, Text, UnstyledButton } from "@mantine/core";
import React from "react";

import { directions, NO_MATCH_WORDS, sameEnds } from "./cardWords";
import { type CardLine, type CardResult, DEFAULT_RESULT, directionOf, noMatchOf, noMatchWays } from "./joinCards";
import { Pick } from "./Pick";
import {
    BUCKET_WORDS,
    bucketCount,
    type BucketWords,
    counted,
    JOIN_WORDS,
    OVER_CAP_WORDS,
    WORKSPACE_WORDS,
} from "./words";
import { DifferRow, ReduceRow } from "./WorkspaceParts";

/**
 * One labeled row of a card: the words in one column, the controls in the rest.
 * @param props - Component props
 * @param props.label - the words
 * @param props.children - the controls
 * @returns the row
 */
export function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <div className="jw-row">
            <Text size="xs" truncate title={label}>
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
                fullWidth
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

/** The names a type's box offers: none, so it is one plain box whatever the graph holds. */
const NO_NAMES: readonly { readonly value: string }[] = [];

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
                placeholder={value.length === 0 ? WORKSPACE_WORDS.none : undefined}
                data={[...new Set([...columns, ...value])]}
                value={[...value]}
                onChange={onChange}
            />
        </Row>
    );
}

/** Fields' "many rows" ways, as the element's `repeated` names them. */
const MANY_ROWS = [
    { value: "first", label: WORKSPACE_WORDS.first },
    { value: "last", label: WORKSPACE_WORDS.last },
    { value: "list", label: WORKSPACE_WORDS.list },
    { value: "count", label: WORKSPACE_WORDS.count },
] as const;

/** What a row whose value names several nodes does. */
const SEVERAL_MATCH = [
    { value: "each", label: WORKSPACE_WORDS.each },
    { value: "skip", label: WORKSPACE_WORDS.skip },
] as const;

/** The separators a cell of several values commonly holds. */
const SEPARATORS = [{ value: ";" }, { value: "," }, { value: "|" }];

/**
 * Whether a merge step's nodes take several rows, so how their columns reduce is asked: a group is the
 * node and what folds into it.
 * @param step - the step
 * @returns true when it is
 */
function takesSeveral(step: SourceStepRow): boolean {
    return (step.buckets?.groups[0] ?? 0) > 2;
}

/** Whether a value naming nothing makes a node. */
const MISSING = [
    { value: "skip", label: WORKSPACE_WORDS.skip },
    { value: "add", label: WORKSPACE_WORDS.newNode },
] as const;

/**
 * The sources an outcome's rows land on, which a value naming nothing would make a node of: one, or the two an
 * edge's ends come from ("people / doors").
 * @param outcome - the outcome
 * @param name - a side's name
 * @returns their names, or null for none
 */
function ontoName(outcome: SourceJoinOutcome, name: (side: SourceJoinSide) => string): string | null {
    const names = [...new Set(outcome.onto.map((side) => name(side)))];
    return names.length === 0 ? null : names.join(" / ");
}

/** What a card's options take. */
interface OptionProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly step: SourceStepRow;
    /** Every step of the card: a card of two merges asks Both have of each. */
    readonly steps: readonly SourceStepRow[];
    readonly lines: readonly CardLine[];
    /** The outcome the step makes. */
    readonly outcome: SourceJoinOutcome;
    readonly result: CardResult;
    /** Whether a value of a match names several nodes. */
    readonly several: boolean;
    /** A side's name. */
    readonly name: (side: SourceJoinSide) => string;
    /** Changes options. */
    readonly onSet: (patch: Partial<CardResult>) => void;
    /** Changes a choice the step keeps. */
    readonly onPatch: (step: number, patch: SourceStepPatch) => void;
    /** Lists a Both have column's cells in the table. */
    readonly onShowCells: (step: number, column: string) => void;
}

/** One rarer option. */
interface AdvancedRow {
    readonly row: React.JSX.Element;
    /** Whether the reader set it. */
    readonly set: boolean;
}

/** A card's options, the ones always drawn and the ones folded under Advanced. */
interface OptionRows {
    readonly basic: React.ReactNode;
    readonly advanced: readonly AdvancedRow[];
}

/**
 * The options of fields on a node.
 * @param props - the card's options
 * @returns the rows
 */
function fieldsOptions(props: OptionProps): OptionRows {
    const { step, steps, result, onSet, onPatch, onShowCells } = props;
    // Each merge of the card, in step order, its columns in one order, whatever changed last.
    const differing = (steps.length === 0 ? [step] : steps).flatMap((each) =>
        [...each.valuesDiffer].sort((a, b) => a.params.column.localeCompare(b.params.column)),
    );
    // Asked once a node takes several rows, of each column whose values differ or that has a way of its own.
    const own = Object.keys(step.act?.aggregate ?? {}).filter((column) => column !== "*");
    const asked = takesSeveral(step)
        ? differing.flatMap(({ params }) => (params.step === step.index ? [params.column] : []))
        : [];
    const reduced = [...new Set([...asked, ...own])].sort((a, b) => a.localeCompare(b));
    return {
        basic: (
            <>
                <Choice
                    label={WORKSPACE_WORDS.manyRows}
                    value={result.repeated}
                    data={MANY_ROWS}
                    onChange={(repeated) => {
                        onSet({ repeated });
                    }}
                />
                {differing.map(({ params }) => (
                    <DifferRow
                        key={`${String(params.step)}:${params.column}`}
                        column={params.column}
                        rule={params.rule}
                        rules={params.rules}
                        onRule={(rule) => {
                            const picked = params.rules.find((each) => each === rule);
                            if (picked !== undefined) {
                                onPatch(params.step, { clash: { [params.column]: picked } });
                            }
                        }}
                        onShow={() => {
                            onShowCells(params.step, params.column);
                        }}
                    />
                ))}
            </>
        ),
        advanced:
            reduced.length === 0
                ? []
                : [
                      {
                          set: own.length > 0,
                          row: (
                              <fieldset key="reduce" className="ss-field">
                                  <Text component="legend" size="xs" c="dimmed">
                                      {WORKSPACE_WORDS.manyRowsByField}
                                  </Text>
                                  {reduced.map((column) => (
                                      <ReduceRow
                                          key={column}
                                          step={step}
                                          many={
                                              MANY_ROWS.find((each) => each.value === result.repeated)?.label ??
                                              WORKSPACE_WORDS.first
                                          }
                                          column={column}
                                          onReduce={(reduce) => {
                                              const { [column]: _was, ...rest } = step.act?.aggregate ?? {};
                                              const aggregate = reduce === null ? rest : { ...rest, [column]: reduce };
                                              onPatch(step.index, {
                                                  aggregate: Object.keys(aggregate).length === 0 ? null : aggregate,
                                              });
                                          }}
                                      />
                                  ))}
                              </fieldset>
                          ),
                      },
                  ],
    };
}

/**
 * The options of nodes sharing a value.
 * @param props - the card's options
 * @param edgeType - the Edge type row
 * @param newType - the New type row
 * @returns the rows
 */
function sharedOptions(props: OptionProps, edgeType: AdvancedRow, newType: AdvancedRow): OptionRows {
    const { outcome, result, onSet } = props;
    const edges = outcome.code === "shared";
    return {
        basic: (
            <>
                <NumberRow
                    label={WORKSPACE_WORDS.hubCap}
                    value={result.maxShared}
                    min={2}
                    options={[5, 10, 25, 100]}
                    onChange={(maxShared) => {
                        onSet({ maxShared });
                    }}
                />
                {edges ? (
                    <NumberRow
                        label={WORKSPACE_WORDS.minShared}
                        value={result.minShared}
                        min={1}
                        options={[1, 2, 3]}
                        onChange={(minShared) => {
                            onSet({ minShared });
                        }}
                    />
                ) : null}
            </>
        ),
        advanced: edges ? [edgeType] : [edgeType, newType],
    };
}

/**
 * The options of a column's values made nodes.
 * @param props - the card's options
 * @param edgeType - the Edge type row
 * @param newType - the New type row
 * @returns the rows
 */
function newNodesOptions(props: OptionProps, edgeType: AdvancedRow, newType: AdvancedRow): OptionRows {
    const { draft, step, outcome, result, onSet } = props;
    const [side] = outcome.rows;
    const columns = draft
        .sideFields(side, { before: step.index })
        .flatMap((field) => (field.from === null && !outcome.fields.includes(field.name) ? [field.name] : []));
    return {
        basic: (
            <>
                <NameRow
                    label={WORKSPACE_WORDS.splitOn}
                    placeholder={WORKSPACE_WORDS.none}
                    options={SEPARATORS}
                    value={result.split}
                    trim={false}
                    onChange={(split) => {
                        onSet({ split });
                    }}
                />
                {newType.row}
            </>
        ),
        advanced: [
            {
                set: result.columns.length > 0,
                row: (
                    <ColumnsRow
                        key="columns"
                        label={WORKSPACE_WORDS.carry}
                        value={result.columns}
                        columns={columns}
                        onChange={(picked) => {
                            onSet({ columns: picked });
                        }}
                    />
                ),
            },
            edgeType,
        ],
    };
}

/**
 * The options of edges, and of nodes linked to what they name.
 * @param props - the card's options
 * @param edgeType - the Edge type row
 * @param newType - the New type row
 * @returns the rows
 */
function edgeOptions(props: OptionProps, edgeType: AdvancedRow, newType: AdvancedRow): OptionRows {
    const { outcome, result, onSet } = props;
    const isEdge = outcome.code === "edge";
    const existing = (
        <Choice
            key="existing"
            label={WORKSPACE_WORDS.existing}
            value={result.existing}
            data={[
                { value: "add", label: WORKSPACE_WORDS.add },
                { value: "merge", label: WORKSPACE_WORDS.merge },
            ]}
            onChange={(next) => {
                onSet({ existing: next });
            }}
        />
    );
    const direction = (
        <Row key="direction" label={JOIN_WORDS.direction}>
            <Pick
                name={JOIN_WORDS.direction}
                data={directions(outcome, props)}
                value={directionOf(outcome, result)}
                onPick={(value) => {
                    onSet({ direction: value === "from-into" ? "from-into" : "into-from" });
                }}
            />
        </Row>
    );
    const missing = (
        <Choice
            key="missing"
            label={WORKSPACE_WORDS.missing(ontoName(outcome, props.name))}
            value={result.missing}
            data={MISSING}
            onChange={(next) => {
                onSet({ missing: next });
            }}
        />
    );
    // Asked first where it changes what the card makes: an edge already there, ends of one kind.
    const meets = isEdge && outcome.edgesBetween > 0;
    const turns = sameEnds(outcome);
    const makesEnd = outcome.takes.includes("type");
    return {
        basic: (
            <>
                {isEdge ? (
                    <Choice
                        label={WORKSPACE_WORDS.edges}
                        value={result.perPair ? "pair" : "row"}
                        data={[
                            { value: "row", label: WORKSPACE_WORDS.perRow },
                            { value: "pair", label: WORKSPACE_WORDS.perPair },
                        ]}
                        onChange={(value) => {
                            onSet({ perPair: value === "pair" });
                        }}
                    />
                ) : null}
                {isEdge ? null : missing}
                {meets ? existing : null}
                {turns ? direction : null}
            </>
        ),
        advanced: [
            ...(isEdge && !meets ? [{ row: existing, set: result.existing !== DEFAULT_RESULT.existing }] : []),
            ...(turns ? [] : [{ row: direction, set: directionOf(outcome, result) !== "into-from" }]),
            edgeType,
            // Named after its column until the reader names it.
            ...(makesEnd ? [{ ...newType, set: newType.set && result.type !== outcome.fields.at(0) }] : []),
        ],
    };
}

/**
 * The options of what a card makes, one compact row each, and only those it needs: the rarer ones folded
 * under Advanced.
 * @param props - Component props
 * @returns the rows
 */
export function Options(props: OptionProps): React.JSX.Element {
    const { outcome, result, several, onSet } = props;
    const edgeType: AdvancedRow = {
        set: result.edgeType !== "",
        row: (
            <NameRow
                key="edgeType"
                label={JOIN_WORDS.edgeType}
                // A typed name, the same box on every visit: a list would appear only once the graph has types.
                options={NO_NAMES}
                value={result.edgeType}
                onChange={(next) => {
                    onSet({ edgeType: next });
                }}
            />
        ),
    };
    const newType: AdvancedRow = {
        set: result.type !== "",
        row: (
            <NameRow
                key="type"
                label={WORKSPACE_WORDS.newType}
                options={NO_NAMES}
                value={result.type}
                onChange={(type) => {
                    onSet({ type });
                }}
            />
        ),
    };
    const rowsOf = (): OptionRows => {
        switch (outcome.code) {
            case "fields":
            case "fold": {
                return fieldsOptions(props);
            }
            case "shared":
            case "shared-nodes": {
                return sharedOptions(props, edgeType, newType);
            }
            case "new-nodes": {
                return newNodesOptions(props, edgeType, newType);
            }
            default: {
                return edgeOptions(props, edgeType, newType);
            }
        }
    };
    const { basic, advanced } = rowsOf();
    const ways = noMatchWays(outcome)?.ways ?? null;
    const fanOut = (
        <Choice
            key="several"
            label={WORKSPACE_WORDS.severalMatch}
            value={result.fanOut}
            data={SEVERAL_MATCH}
            onChange={(next) => {
                onSet({ fanOut: next });
            }}
        />
    );
    const folded: readonly AdvancedRow[] = [
        ...(several && outcome.takes.includes("fanOut")
            ? [{ row: fanOut, set: result.fanOut !== DEFAULT_RESULT.fanOut }]
            : []),
        ...advanced,
    ];
    return (
        <>
            {ways === null ? null : (
                <Choice
                    // An edge's rows are the edges: what it asks is whether a missing end makes a node.
                    label={
                        outcome.code === "edge"
                            ? WORKSPACE_WORDS.missing(ontoName(outcome, props.name))
                            : WORKSPACE_WORDS.unmatched(
                                  [...new Set(outcome.rows.map((side) => props.name(side)))].join(", "),
                              )
                    }
                    value={noMatchOf(outcome, result) ?? ways[0]}
                    data={ways.map((way) => ({ value: way, label: NO_MATCH_WORDS[way] }))}
                    onChange={(noMatch) => {
                        onSet({ noMatch });
                    }}
                />
            )}
            {basic}
            {folded.length === 0 ? null : (
                // What the reader set is never folded out of sight when the card is drawn again.
                <ControlSection label={WORKSPACE_WORDS.advanced} defaultOpened={folded.some((each) => each.set)}>
                    {folded.map((each) => each.row)}
                </ControlSection>
            )}
        </>
    );
}

/**
 * The counts of what a join adds to the graph or folds into its edges, which a card reads off its whole join, by
 * the step counts each is. The nodes a merge matched stay its step's: they need not be nodes the graph holds.
 */
const EFFECTS: readonly (readonly ["nodes" | "edges", "merged" | "new", readonly string[]])[] = [
    ["nodes", "new", ["keptNew", "newNodes"]],
    ["edges", "new", ["newEdges"]],
    ["edges", "merged", ["mergedEdges"]],
];

/** The words of each effect a card's word list leaves out: a merge card's new edges. */
const EFFECT_WORDS: Readonly<Record<string, BucketWords>> = {
    "nodes.new": BUCKET_WORDS.merge[1],
    "edges.new": { id: "newEdges", one: "new edge", many: "new edges" },
    "edges.merged": { id: "mergedEdges", one: "edge merged", many: "edges merged" },
};

/**
 * A card's counts, each a button that lists what it counts in the table. What the join does to the graph is
 * counted over the card's whole join, every step it wrote and the sources it added for itself, so it agrees
 * with the key; a count no one step lists is not a button.
 * @param props - Component props
 * @param props.step - the card's step
 * @param props.reach - what the card's whole join does; null once the draft is closed
 * @param props.onShow - lists one count's rows
 * @returns the counts
 */
export function StepCounts({
    step,
    reach,
    onShow,
}: Readonly<{
    step: SourceStepRow;
    reach: SourceDraftMadeCounts | null;
    onShow: (bucket: string) => void;
}>): React.JSX.Element | null {
    const { buckets } = step;
    if (buckets === null) {
        return null;
    }
    const links = step.link?.nodes === undefined ? "links" : "nodeLinks";
    const made = step.link === null ? "edge" : links;
    const words = BUCKET_WORDS[step.op === "join.merge" ? "merge" : made];
    const effectOf = (id: string): (typeof EFFECTS)[number] | undefined =>
        EFFECTS.find(([, , ids]) => ids.includes(id));
    const show = (id: string, text: string): React.JSX.Element => (
        <UnstyledButton
            key={id}
            className="ss-count-show"
            onClick={() => {
                onShow(id);
            }}
        >
            {text}
        </UnstyledButton>
    );
    const item = (each: BucketWords): React.JSX.Element | null => {
        const own = bucketCount(buckets, each.id);
        const effect = effectOf(each.id);
        const count = effect === undefined || reach === null ? own : reach[effect[0]][effect[1]];
        if (count === 0) {
            return null;
        }
        const text = counted(count, each);
        return count === own ? show(each.id, text) : <span key={each.id}>{text}</span>;
    };
    const listed = new Set(words.map((each) => effectOf(each.id)));
    const more = EFFECTS.flatMap((effect) => (listed.has(effect) ? [] : [EFFECT_WORDS[`${effect[0]}.${effect[1]}`]]));
    return (
        <Group gap={12} wrap="wrap" className="jw-counts">
            {[...words, ...more].map((each) => item(each))}
            {step.link === null || buckets.hub.length === 0
                ? null
                : show("hub", counted(buckets.hub.length, OVER_CAP_WORDS))}
        </Group>
    );
}
