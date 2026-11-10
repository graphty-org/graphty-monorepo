import type { JoinReport, JoinStepEntry, JoinStepOutcome } from "@graphty/graphty-element/session";
import { Button, Chip, Group, NumberInput, SegmentedControl, Select, Text, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useJoinWorkspace } from "../context";
import { changeStep, type ChoicesPatch } from "./choices";
import { MatchButton } from "./Matcher";
import {
    DEFAULT_SEPARATOR,
    errorWords,
    fateCounts,
    fateWord,
    inputName,
    type JoinOp,
    startChoices,
    WARN_FATES,
} from "./ops";
import { Venn } from "./Venn";

/**
 * One labeled row of a card.
 * @param props - Component props
 * @param props.label - its label.
 * @param props.children - its controls.
 * @returns the row.
 */
function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <div className="jr-row">
            <Text size="sm" c="dimmed" className="jr-row-label">
                {label}
            </Text>
            <div className="jr-row-controls">{children}</div>
        </div>
    );
}

/**
 * A text box whose value reaches the recipe when the reader leaves it or presses Enter, so typing
 * a name is one edit of the recipe, not one per letter.
 * @param props - Component props
 * @param props.label - its accessible name.
 * @param props.value - the value the recipe holds.
 * @param props.placeholder - shown while it is empty.
 * @param props.width - its width.
 * @param props.onCommit - the value typed.
 * @returns the box.
 */
function CommitInput({
    label,
    value,
    placeholder,
    width,
    onCommit,
}: Readonly<{
    label: string;
    value: string;
    placeholder?: string;
    width?: number;
    onCommit: (value: string) => void;
}>): React.JSX.Element {
    const [typed, setTyped] = useState(value);
    useEffect(() => {
        setTyped(value);
    }, [value]);
    const commit = (): void => {
        if (typed !== value) {
            onCommit(typed);
        }
    };
    return (
        <TextInput
            size="xs"
            w={width}
            aria-label={label}
            placeholder={placeholder}
            value={typed}
            onChange={(event) => {
                setTyped(event.currentTarget.value);
            }}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commit();
                }
            }}
        />
    );
}

/**
 * The Aa and a b toggles: match ignoring letter case, ignoring spaces; each shows how many more
 * would match (the report's `extraIgnoringCase`, `extraIgnoringSpaces`).
 * @param props - Component props
 * @param props.step - the step.
 * @param props.report - its report.
 * @returns the toggles.
 */
function LooseToggles({
    step,
    report,
}: Readonly<{ step: JoinStepEntry; report: JoinReport | undefined }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const toggle = (name: "ignoreCase" | "ignoreSpaces", label: string, more: number): React.JSX.Element => {
        const on = step.choices[name] === true;
        return (
            <Button
                size="compact-xs"
                variant={on ? "light" : "default"}
                aria-pressed={on}
                aria-label={name === "ignoreCase" ? "Ignore case" : "Ignore spaces"}
                className="jr-loose"
                onClick={() => {
                    changeStep(api, step, { [name]: on ? undefined : true });
                }}
            >
                {label}
                {!on && more > 0 ? <span className="jr-more">+{more}</span> : null}
            </Button>
        );
    };
    return (
        <>
            {toggle("ignoreCase", "Aa", report?.extraIgnoringCase ?? 0)}
            {toggle("ignoreSpaces", "a b", report?.extraIgnoringSpaces ?? 0)}
        </>
    );
}

/**
 * A segmented choice of a card.
 * @param props - Component props
 * @param props.label - its accessible name.
 * @param props.value - the value.
 * @param props.data - the options.
 * @param props.onChange - the change.
 * @returns the control.
 */
function Seg({
    label,
    value,
    data,
    onChange,
}: Readonly<{
    label: string;
    value: string;
    data: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}>): React.JSX.Element {
    return <SegmentedControl size="xs" aria-label={label} value={value} data={[...data]} onChange={onChange} />;
}

/**
 * Column chips: which columns of the input a step brings or shares.
 * @param props - Component props
 * @param props.label - the group's accessible name.
 * @param props.columns - the columns offered.
 * @param props.chosen - the columns on.
 * @param props.onChange - the columns on now.
 * @returns the chips.
 */
function ColumnChips({
    label,
    columns,
    chosen,
    onChange,
}: Readonly<{
    label: string;
    columns: readonly string[];
    chosen: readonly string[];
    onChange: (columns: readonly string[]) => void;
}>): React.JSX.Element {
    return (
        <Chip.Group
            multiple
            value={[...chosen]}
            onChange={(value) => {
                onChange(columns.filter((column) => value.includes(column)));
            }}
        >
            <Group gap={3} role="group" aria-label={label} className="jr-cols">
                {columns.map((column) => (
                    <Chip key={column} value={column} size="xs" variant="outline">
                        {column}
                    </Chip>
                ))}
            </Group>
        </Chip.Group>
    );
}

/**
 * A step card's body: its input, its match row, the controls its intent takes, then each row
 * fate's count (a press shows only those rows in the table).
 * @param props - Component props
 * @param props.step - the step.
 * @param props.op - its intent.
 * @param props.outcome - what it does.
 * @returns the body.
 */
export function StepBody({
    step,
    op,
    outcome,
}: Readonly<{ step: JoinStepEntry; op: JoinOp; outcome: JoinStepOutcome }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft } = api;
    const { choices } = step;
    const { report } = outcome;
    const set = (patch: ChoicesPatch): void => {
        changeStep(api, step, patch);
    };
    const input = draft.inputs.find((each) => each.key === step.from);
    const columns = input?.columns ?? [];
    const own = columns.filter((column) => column !== "id");
    const zero = report !== undefined && report.matched === 0;
    const from = inputName(draft.inputs, step.from);
    const inputs = draft.inputs.map((each) => ({ value: each.key, label: inputName(draft.inputs, each.key) }));
    const keyFiles = new Set(choices.keys.map((key) => key.file));
    const rows: React.ReactNode[] = [];

    rows.push(
        <Row key="from" label="From">
            <Select
                size="xs"
                aria-label="From"
                data={inputs}
                value={step.from}
                allowDeselect={false}
                onChange={(value) => {
                    if (value !== null && value !== step.from) {
                        api.edit((each) => {
                            each.change(step.id, { from: value, choices: startChoices(op, each, value, step.id) });
                        });
                    }
                }}
            />
        </Row>,
    );

    if (op === "edges") {
        rows.push(
            <Row key="source" label="Source">
                <MatchButton step={step} end={0} label="Source" zero={zero} />
            </Row>,
            <Row key="target" label="Target">
                <MatchButton step={step} end={1} label="Target" zero={zero} />
                <Seg
                    label="Unknown ends"
                    value={choices.unknownEnds ?? "add"}
                    data={[
                        { value: "add", label: "add" },
                        { value: "leave-out", label: "skip" },
                    ]}
                    onChange={(value) => {
                        set({ unknownEnds: value === "add" ? undefined : "leave-out" });
                    }}
                />
            </Row>,
            <Row key="loose" label="Match">
                <LooseToggles step={step} report={report} />
            </Row>,
            <Row key="kinds" label="New kind">
                <CommitInput
                    label="New source kind"
                    placeholder="source"
                    value={choices.endKinds?.source ?? ""}
                    onCommit={(source) => {
                        const endKinds = { ...choices.endKinds, source: source === "" ? undefined : source };
                        set({
                            endKinds:
                                endKinds.source === undefined && endKinds.target === undefined ? undefined : endKinds,
                        });
                    }}
                />
                <CommitInput
                    label="New target kind"
                    placeholder="target"
                    value={choices.endKinds?.target ?? ""}
                    onCommit={(target) => {
                        const endKinds = { ...choices.endKinds, target: target === "" ? undefined : target };
                        set({
                            endKinds:
                                endKinds.source === undefined && endKinds.target === undefined ? undefined : endKinds,
                        });
                    }}
                />
            </Row>,
        );
    } else if (op === "kind" || op === "split") {
        const column = op === "kind" ? choices.keys[1]?.file : (choices.columns?.[0] ?? choices.keys[1]?.file);
        const asNodes = choices.shape === "edges";
        const separator = column === undefined ? DEFAULT_SEPARATOR : (choices.split?.[column] ?? DEFAULT_SEPARATOR);
        const shaped = (name: string, nodes: boolean, sep: string, kind?: string): ChoicesPatch =>
            nodes || op === "kind"
                ? {
                      shape: "edges",
                      keys: [choices.keys[0], { file: name, graph: "id" }],
                      endKinds: { target: kind ?? name },
                      kindIds: "scoped",
                      columns: undefined,
                      clash: undefined,
                      split: op === "split" ? { [name]: sep } : undefined,
                  }
                : {
                      shape: "node-values",
                      keys: [choices.keys[0]],
                      columns: [name],
                      split: { [name]: sep },
                      clash: { [name]: "overwrite" },
                      endKinds: undefined,
                      kindIds: undefined,
                  };
        rows.push(
            <Row key="column" label="Column">
                <Select
                    size="xs"
                    aria-label="Column"
                    data={own}
                    value={column ?? null}
                    allowDeselect={false}
                    onChange={(value) => {
                        if (value !== null) {
                            set(shaped(value, asNodes, separator));
                        }
                    }}
                />
                {op === "split" && (
                    <CommitInput
                        label="Separator"
                        width={48}
                        value={separator}
                        onCommit={(sep) => {
                            if (column !== undefined && sep !== "") {
                                set(shaped(column, asNodes, sep, choices.endKinds?.target));
                            }
                        }}
                    />
                )}
            </Row>,
        );
        if (op === "split") {
            rows.push(
                <Row key="as" label="As">
                    <Seg
                        label="Split as"
                        value={asNodes ? "nodes" : "list"}
                        data={[
                            { value: "list", label: "list" },
                            { value: "nodes", label: "nodes" },
                        ]}
                        onChange={(value) => {
                            if (column !== undefined) {
                                set(shaped(column, value === "nodes", separator));
                            }
                        }}
                    />
                </Row>,
            );
        }
        if (op === "kind" || asNodes) {
            rows.push(
                <Row key="kind" label="Kind">
                    <CommitInput
                        label="Kind"
                        placeholder={column}
                        value={choices.endKinds?.target ?? ""}
                        onCommit={(kind) => {
                            if (column !== undefined) {
                                set(shaped(column, true, separator, kind === "" ? column : kind));
                            }
                        }}
                    />
                </Row>,
            );
        }
    } else {
        rows.push(
            <Row key="match" label="Match">
                <MatchButton step={step} end={0} label="Match" zero={zero} />
                <LooseToggles step={step} report={report} />
            </Row>,
        );
    }

    if (op === "values") {
        const offered = columns.filter((column) => !keyFiles.has(column));
        rows.push(
            <Row key="onto" label="Onto">
                <Seg
                    label="Onto"
                    value={choices.shape === "edge-values" ? "edges" : "nodes"}
                    data={[
                        { value: "nodes", label: "nodes" },
                        { value: "edges", label: "edges" },
                    ]}
                    onChange={(value) => {
                        set({ shape: value === "edges" ? "edge-values" : "node-values" });
                    }}
                />
            </Row>,
            <Row key="bring" label="Bring">
                <ColumnChips
                    label="Bring"
                    columns={offered}
                    chosen={choices.columns ?? offered}
                    onChange={(chosen) => {
                        set({ columns: chosen.length === offered.length ? undefined : chosen });
                    }}
                />
            </Row>,
        );
    }
    if (op === "flag") {
        rows.push(
            <Row key="flag" label="Column">
                <CommitInput
                    label="Flag column"
                    value={choices.flag ?? ""}
                    onCommit={(flag) => {
                        if (flag !== "") {
                            set({ flag });
                        }
                    }}
                />
            </Row>,
        );
    }
    if (op === "map") {
        const { via } = choices;
        const viaColumns = draft.inputs.find((each) => each.key === via)?.columns ?? [];
        const [mapFrom, mapTo] = choices.mapping?.columns ?? [];
        rows.push(
            <Row key="via" label="Via">
                <Select
                    size="xs"
                    aria-label="Via"
                    placeholder="-"
                    data={inputs.filter((each) => each.value !== step.from)}
                    value={via ?? null}
                    allowDeselect={false}
                    onChange={(value) => {
                        if (value !== null) {
                            set({ via: value, mapping: { ...choices.mapping, columns: undefined } });
                        }
                    }}
                />
            </Row>,
            <Row key="pair" label="">
                <Select
                    size="xs"
                    aria-label="Mapping from"
                    placeholder="auto"
                    data={[...viaColumns]}
                    value={mapFrom ?? null}
                    onChange={(value) => {
                        const to = mapTo ?? viaColumns.find((each) => each !== value);
                        set({
                            mapping: {
                                ...choices.mapping,
                                columns: value === null || to === undefined ? undefined : [value, to],
                            },
                        });
                    }}
                />
                <Select
                    size="xs"
                    aria-label="Mapping to"
                    placeholder="auto"
                    data={[...viaColumns]}
                    value={mapTo ?? null}
                    onChange={(value) => {
                        const fromColumn = mapFrom ?? viaColumns.find((each) => each !== value);
                        set({
                            mapping: {
                                ...choices.mapping,
                                columns: value === null || fromColumn === undefined ? undefined : [fromColumn, value],
                            },
                        });
                    }}
                />
            </Row>,
        );
    }
    if (op === "link") {
        const link = choices.link ?? { columns: [] };
        rows.push(
            <Row key="shared" label="Shared">
                <ColumnChips
                    label="Shared"
                    columns={columns.filter((column) => !keyFiles.has(column))}
                    chosen={link.columns}
                    onChange={(chosen) => {
                        set({ link: { ...link, columns: chosen } });
                    }}
                />
            </Row>,
            <Row key="as" label="As">
                <Seg
                    label="Link as"
                    value={link.as ?? "edges"}
                    data={[
                        { value: "edges", label: "edges" },
                        { value: "nodes", label: "value nodes" },
                    ]}
                    onChange={(value) => {
                        set({ link: { ...link, as: value === "nodes" ? "nodes" : undefined } });
                    }}
                />
                <Text span size="sm" c="dimmed">
                    hub cap
                </Text>
                <NumberInput
                    size="xs"
                    w={64}
                    aria-label="Hub cap"
                    min={2}
                    value={link.maxShared ?? 10}
                    onChange={(value) => {
                        if (typeof value === "number") {
                            set({ link: { ...link, maxShared: value } });
                        }
                    }}
                />
            </Row>,
        );
    }
    if (op === "merge") {
        rows.push(
            <Row key="unmatched" label="Unmatched">
                <Seg
                    label="Unmatched"
                    value={choices.unmatchedFrom ?? "keep"}
                    data={[
                        { value: "keep", label: "keep" },
                        { value: "drop", label: "drop" },
                    ]}
                    onChange={(value) => {
                        set({ unmatchedFrom: value === "drop" ? "drop" : undefined });
                    }}
                />
            </Row>,
        );
    }
    if (op === "compare") {
        rows.push(<Venn key="venn" step={step} report={report} from={from} />);
    }

    return (
        <div className="jr-body">
            {rows}
            {outcome.error === undefined ? (
                <FateChips step={step} op={op} from={from} />
            ) : (
                <Text size="sm" c="red" className="jr-error">
                    {errorWords(outcome)}
                </Text>
            )}
        </div>
    );
}

/**
 * Each row fate's count; a press shows only those rows in the table, a second press every row.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.op - its intent.
 * @param props.from - its input's name.
 * @returns the chips.
 */
function FateChips({ step, op, from }: Readonly<{ step: JoinStepEntry; op: JoinOp; from: string }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const shown = api.step === step.id ? api.fate : null;
    return (
        <Group gap={3} className="jr-fates" role="group" aria-label="Row fates">
            {fateCounts(api.draft, step.id).map(({ fate, rows }) => (
                <Button
                    key={fate}
                    size="compact-xs"
                    variant={shown === fate ? "light" : "default"}
                    color={WARN_FATES.has(fate) ? "yellow" : undefined}
                    aria-pressed={shown === fate}
                    data-fate={fate}
                    onClick={() => {
                        api.select(step.id);
                        api.setSide("after");
                        api.setFate(shown === fate ? null : fate);
                    }}
                >
                    <b>{rows}</b>&nbsp;{fateWord(fate, op, from)}
                </Button>
            ))}
        </Group>
    );
}
