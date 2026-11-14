import type {
    JoinInput,
    JoinKey,
    JoinStepEntry,
    JoinStepOutcome,
    JoinSuggestion,
} from "@graphty/graphty-element/session";
import { Badge, Button, Radio, Select, Text } from "@mantine/core";
import React, { useMemo } from "react";

import { GLYPHS } from "../../glyphs";
import { useJoinWorkspace } from "../context";
import { changeStep } from "./choices";
import { FateChips, LooseToggles, Row, Seg } from "./controls";
import { MatchRow } from "./MatchRows";
import { Options } from "./Options";
import {
    errorWords,
    guessOf,
    inputName,
    isNewKey,
    type Outcome,
    OUTCOME_BY_ID,
    OUTCOME_SHAPES,
    outcomeOf,
    OUTCOMES,
    pathName,
} from "./outcomes";
import { Venn } from "./Venn";

/**
 * A column's name as an edge's end: "person_id" reads "person".
 * @param column - the column.
 * @returns the name.
 */
function endName(column: string): string {
    return column.replace(/[_ ]?id$/i, "") || column;
}

/**
 * The example line under an answer, from the card's own table and graphty-element's suggestion
 * for that answer: "door_entries -> edge: person -> building".
 * @param outcome - the answer.
 * @param suggestion - the element's suggestion for its shape.
 * @param table - the card's table name.
 * @param columns - the table's columns, for an answer the element suggests no key for.
 * @param inputs - the draft's inputs, naming the load a key matches onto.
 * @returns the line.
 */
function exampleLine(
    outcome: Outcome,
    suggestion: JoinSuggestion,
    table: string,
    columns: readonly string[],
    inputs: readonly JoinInput[],
): string {
    const keyed = suggestion.keys.map((key) => key.file);
    const files = keyed.length > 0 ? keyed : columns.slice(0, 2);
    const one = files[0] ?? "?";
    switch (outcome) {
        case "edge":
            return `${table} -> edge: ${endName(one)} -> ${endName(files[1] ?? "?")}`;
        case "node":
            return `${table} -> node; edges: ${files.map(endName).join(", ") || "?"}`;
        case "links": {
            const shared = suggestion.link?.columns ?? columns.slice(1, 2);
            return `${table} -> link: shared ${shared.join(", ") || "?"}`;
        }
        default: {
            const key = suggestion.keys[0];
            return key === undefined
                ? `${table} -> fields: ${one}`
                : `${table} -> fields: ${key.file} = ${key.onto === undefined ? "" : `${inputName(inputs, key.onto)}.`}${pathName(key.graph)}`;
        }
    }
}

/**
 * Whether two keys match the same column to the same graph value.
 * @param a - one key.
 * @param b - the other.
 * @returns true when they are the same match.
 */
function sameKey(a: JoinKey | undefined, b: JoinKey | undefined): boolean {
    return a !== undefined && b !== undefined && a.file === b.file && a.graph === b.graph && a.onto === b.onto;
}

/**
 * A card's body. Its table (From), then the one question every card asks first: what does each
 * row become? The group starts unpicked, graphty-element's guess tagged "suggested"; nothing joins
 * until the reader picks. Once picked: that answer's match rows (each with its live count), its
 * options, and each row fate's count.
 * @param props - Component props
 * @param props.from - the card's table.
 * @param props.step - its step, once an answer is picked.
 * @param props.outcome - what its step does.
 * @param props.onFrom - the reader picked another table.
 * @param props.onPick - the reader picked an answer.
 * @returns the body.
 */
export function CardBody({
    from,
    step,
    outcome,
    onFrom,
    onPick,
}: Readonly<{
    from: string;
    step?: JoinStepEntry;
    outcome?: JoinStepOutcome;
    onFrom: (from: string) => void;
    onPick: (answer: Outcome) => void;
}>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const picked = step === undefined ? null : outcomeOf(step.choices);
    const { guess, examples } = useMemo(
        () => ({
            version,
            guess: guessOf(draft.suggest(from, step?.id, { among: OUTCOME_SHAPES })),
            examples: Object.fromEntries(
                OUTCOMES.map((each) => [
                    each.value,
                    exampleLine(
                        each.value,
                        draft.suggest(from, step?.id, { shape: each.shape }),
                        inputName(draft.inputs, from),
                        draft.inputs.find((input) => input.key === from)?.columns ?? [],
                        draft.inputs,
                    ),
                ]),
            ) as Record<Outcome, string>,
        }),
        [draft, version, from, step?.id],
    );
    const inputs = draft.inputs.map((each) => ({
        value: each.key,
        label: `${inputName(draft.inputs, each.key)}  ${String(each.rows)}${each.held ? "  table" : ""}`,
    }));

    return (
        <div className="jr-body">
            <Row label="From">
                <Select
                    size="xs"
                    aria-label="From"
                    data={inputs}
                    value={from}
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: true }}
                    onChange={(value) => {
                        if (value !== null && value !== from) {
                            onFrom(value);
                        }
                    }}
                />
            </Row>
            <Text size="sm" c="dimmed">
                Each row becomes
            </Text>
            <Radio.Group
                aria-label="Each row becomes"
                size="xs"
                value={picked}
                onChange={(value) => {
                    const answer = OUTCOMES.find((each) => each.value === value)?.value;
                    if (answer !== undefined && answer !== picked) {
                        onPick(answer);
                    }
                }}
            >
                <div className="jc-outcomes">
                    {OUTCOMES.map((each) => (
                        <Radio
                            key={each.value}
                            value={each.value}
                            size="xs"
                            label={
                                <span className="jc-outcome-label">
                                    {each.label}
                                    {guess === each.value && step?.joined === undefined ? (
                                        <Badge size="xs" variant="outline" color="gray">
                                            suggested
                                        </Badge>
                                    ) : null}
                                </span>
                            }
                            description={examples[each.value]}
                        />
                    ))}
                </div>
            </Radio.Group>
            {step === undefined || picked === null || outcome === undefined ? null : (
                <Picked step={step} answer={picked} outcome={outcome} />
            )}
        </div>
    );
}

/**
 * What a card shows once its answer is picked: the match rows, the options, the result.
 * @param props - Component props
 * @param props.step - the card's step.
 * @param props.answer - its answer.
 * @param props.outcome - what its step does.
 * @returns the rows.
 */
function Picked({
    step,
    answer,
    outcome,
}: Readonly<{ step: JoinStepEntry; answer: Outcome; outcome: JoinStepOutcome }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const { choices } = step;
    const { report } = outcome;
    const { suggestion } = useMemo(
        () => ({ version, suggestion: draft.suggest(step.from, step.id, { shape: OUTCOME_BY_ID[answer].shape }) }),
        [draft, version, step, answer],
    );
    // A join reopened after Done, or a copy of a card, was the reader's own choice: nothing on it is a suggestion.
    const suggested = (at: number): boolean =>
        step.joined === undefined && !api.copies.has(step.id) && sameKey(choices.keys[at], suggestion.keys[at]);
    const setKeys = (keys: readonly JoinKey[]): void => {
        changeStep(api, step, { keys });
    };
    const columns = draft.inputs.find((each) => each.key === step.from)?.columns ?? [];

    let matches: React.ReactNode;
    if (answer === "edge") {
        matches = (
            <>
                <MatchRow step={step} at={0} label="From end" suggested={suggested(0)} />
                <MatchRow step={step} at={1} label="To end" suggested={suggested(1)} />
            </>
        );
    } else if (answer === "node") {
        const unused = columns.find(
            (column) => !choices.keys.some((key) => key.file === column) && column !== choices.rowNode?.id,
        );
        matches = (
            <>
                {choices.keys.map((key, at) => (
                    <MatchRow
                        key={`${String(at)}:${key.file}`}
                        step={step}
                        at={at}
                        label="Named"
                        canMakeNodes
                        suggested={suggested(at)}
                        onRemove={
                            choices.keys.length > 1
                                ? () => {
                                      setKeys(choices.keys.filter((_each, index) => index !== at));
                                  }
                                : undefined
                        }
                    >
                        {isNewKey(key) ? null : (
                            <Seg
                                label={`No match ${key.file}`}
                                value={key.unknown ?? "leave-out"}
                                data={[
                                    { value: "leave-out", label: "Skip" },
                                    { value: "add", label: "Add" },
                                ]}
                                onChange={(value) => {
                                    const keys = [...choices.keys];
                                    const { unknown: _unknown, ...rest } = key;
                                    keys[at] = { ...rest, ...(value === "add" ? { unknown: "add" } : {}) };
                                    setKeys(keys);
                                }}
                            />
                        )}
                    </MatchRow>
                ))}
                <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={unused === undefined}
                    leftSection={<GLYPHS.add size={14} aria-hidden />}
                    onClick={() => {
                        if (unused !== undefined) {
                            setKeys([...choices.keys, { file: unused, graph: "id" }]);
                        }
                    }}
                >
                    Column
                </Button>
            </>
        );
    } else {
        matches = <MatchRow step={step} at={0} label="Match" suggested={suggested(0)} />;
    }

    return (
        <>
            {matches}
            <Row label="Ignore">
                <LooseToggles step={step} report={report} />
            </Row>
            <Options step={step} outcome={answer} report={report} />
            {choices.compare === true ? (
                <Venn step={step} report={report} from={inputName(draft.inputs, step.from)} />
            ) : null}
            {outcome.error === undefined ? (
                <FateChips step={step} />
            ) : (
                <Text size="sm" c="red" className="jr-error">
                    {errorWords(outcome)}
                </Text>
            )}
        </>
    );
}
