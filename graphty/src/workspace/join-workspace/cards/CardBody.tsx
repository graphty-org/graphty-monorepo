import type { JoinKey, JoinStepEntry, JoinStepOutcome, JoinSuggestion } from "@graphty/graphty-element/session";
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
 * The example line under an answer, from graphty-element's suggestion for that answer.
 * @param outcome - the answer.
 * @param suggestion - the element's suggestion for its shape.
 * @returns the line.
 */
function exampleLine(outcome: Outcome, suggestion: JoinSuggestion): string {
    const files = suggestion.keys.map((key) => key.file);
    switch (outcome) {
        case "edge":
            return files.length === 2 ? `${files[0]} - ${files[1]} -> edge` : "two keys -> one edge";
        case "node":
            return files.length > 0 ? `row -> node; edges to ${files.join(", ")}` : "row -> node; edge per key";
        case "links": {
            const shared = suggestion.link?.columns ?? [];
            return shared.length > 0 ? `shared ${shared.join(", ")} -> link` : "shared value -> link";
        }
        default:
            return files.length > 0
                ? `${files[0]} = ${pathName(suggestion.keys[0].graph)} -> fields`
                : "key -> fields on existing nodes";
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
                    exampleLine(each.value, draft.suggest(from, step?.id, { shape: each.shape })),
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
    // A join reopened after Done was the reader's own choice: nothing on it is a suggestion.
    const suggested = (at: number): boolean =>
        step.joined === undefined && sameKey(choices.keys[at], suggestion.keys[at]);
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
                                    keys[at] = {
                                        file: key.file,
                                        graph: key.graph,
                                        ...(value === "add" ? { unknown: "add" } : {}),
                                    };
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
