import type { JoinReport, JoinStepEntry } from "@graphty/graphty-element/session";
import { Button, Group, MultiSelect, NumberInput, SegmentedControl, Text, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useJoinWorkspace } from "../context";
import { changeStep } from "./choices";
import { fateCounts, fateWord, inputName, WARN_FATES } from "./outcomes";

/**
 * One labeled row of a card.
 * @param props - Component props
 * @param props.label - its label.
 * @param props.children - its controls.
 * @returns the row.
 */
export function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
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
export function CommitInput({
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
 * A number box whose value reaches the recipe when the reader leaves it or presses Enter, so
 * typing "25" is one edit of the recipe, not a pass through 2.
 * @param props - Component props
 * @param props.label - its accessible name.
 * @param props.value - the value the recipe holds.
 * @param props.min - the smallest value.
 * @param props.onCommit - the value typed.
 * @returns the box.
 */
export function CommitNumber({
    label,
    value,
    min,
    onCommit,
}: Readonly<{ label: string; value: number; min: number; onCommit: (value: number) => void }>): React.JSX.Element {
    const [typed, setTyped] = useState<number | string>(value);
    useEffect(() => {
        setTyped(value);
    }, [value]);
    const commit = (): void => {
        const next = typeof typed === "number" ? typed : Number.parseInt(typed, 10);
        if (Number.isFinite(next) && next >= min && next !== value) {
            onCommit(next);
        } else if (next !== value) {
            setTyped(value);
        }
    };
    return (
        <NumberInput
            size="xs"
            w={72}
            aria-label={label}
            min={min}
            allowDecimal={false}
            value={typed}
            onChange={setTyped}
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
 * A segmented choice of a card.
 * @param props - Component props
 * @param props.label - its accessible name.
 * @param props.value - the value.
 * @param props.data - the options.
 * @param props.onChange - the change.
 * @returns the control.
 */
export function Seg({
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
 * Columns picked: which columns of the input a card brings or shares.
 * @param props - Component props
 * @param props.label - the group's accessible name.
 * @param props.columns - the columns offered.
 * @param props.chosen - the columns on.
 * @param props.onChange - the columns on now.
 * @returns the chips.
 */
export function ColumnChips({
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
        <MultiSelect
            size="xs"
            aria-label={label}
            searchable
            placeholder={chosen.length === 0 ? "none" : undefined}
            data={[...columns]}
            value={[...chosen]}
            comboboxProps={{ withinPortal: true }}
            onChange={(value) => {
                onChange(columns.filter((column) => value.includes(column)));
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
export function LooseToggles({
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
 * Each row fate's count; a press shows only those rows in the table, a second press every row.
 * @param props - Component props
 * @param props.step - the step.
 * @returns the chips.
 */
export function FateChips({ step }: Readonly<{ step: JoinStepEntry }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const shown = api.step === step.id ? api.fate : null;
    const from = inputName(api.draft.inputs, step.from);
    return (
        <Group gap={3} className="jr-fates" role="group" aria-label="Result">
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
                    <b>{rows}</b>&nbsp;{fateWord(fate, step.choices, from)}
                </Button>
            ))}
        </Group>
    );
}
