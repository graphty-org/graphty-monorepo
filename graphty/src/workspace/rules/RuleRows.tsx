/**
 * Condition rows: value, comparison and operand, the one rule editor Data > Filters and a layer's
 * Which elements share (tier3 design, section 3.1). A condition is the app's editing state; the
 * rule it makes is a graphty-element `RuleTree` leaf, and every count is the element's.
 */

import { ActionIcon, Autocomplete, Button, Group, NumberInput, Select, Stack, TextInput, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import {
    attributeOf,
    BLANK_CONDITION,
    type Compare,
    compareWords,
    type Condition,
    type Field,
    isNumber,
    type ReadsGroup,
} from "./conditions";

/** The props of one condition row. */
interface ConditionRowProps {
    readonly condition: Condition;
    readonly onChange: (next: Condition) => void;
    /** What a condition may read. */
    readonly choices: readonly ReadsGroup[];
    /** The comparisons offered for what it reads; one alone draws no comparison select. */
    readonly compares: (attribute: Field | undefined) => readonly Compare[];
    readonly attributes: readonly Field[];
    /** Draws the field names as labels above each field (a form), else only as their names (a row). */
    readonly labelled?: boolean;
    /** The row's minus, when it may be removed. */
    readonly onRemove?: () => void;
}

/**
 * One condition: what it reads, how it compares, and the operand the comparison takes.
 * @param props - Component props
 * @returns the row.
 */
export function ConditionRow(props: ConditionRowProps): React.JSX.Element {
    const { condition, onChange, choices, compares, attributes, labelled = true, onRemove } = props;
    const attribute = attributeOf(condition.reads, attributes);
    const chosen = condition.reads !== "";
    const offered = chosen ? compares(attribute) : [];
    const set = (next: Partial<Condition>): void => {
        onChange({ ...condition, ...next });
    };
    // A field is named by a label in a form, by its accessible name alone in a row.
    const name = (words: string): { label?: string; "aria-label"?: string } =>
        labelled ? { label: words } : { "aria-label": words };
    const numeric = attribute !== undefined && isNumber(attribute);
    const takesNumber = numeric && ["is", "is-not", "at-least", "at-most", "between"].includes(condition.compare);
    const samples = [...new Set((attribute?.sampleValues ?? []).map(String))];
    // A single comparison names the operand field "Is" (a filter step's list of values).
    const operandName = offered.length === 1 ? "Is" : "Value";

    let operand: React.ReactNode = null;
    if (!chosen || condition.compare === "has-value") {
        operand = null;
    } else if (takesNumber) {
        operand = (
            <>
                <NumberInput
                    {...name(condition.compare === "between" ? "From" : "Value")}
                    value={condition.low}
                    onChange={(value) => {
                        set({ low: value });
                    }}
                />
                {condition.compare === "between" && (
                    <NumberInput
                        {...name("To")}
                        value={condition.high}
                        onChange={(value) => {
                            set({ high: value });
                        }}
                    />
                )}
            </>
        );
    } else if (condition.compare === "is" || condition.compare === "is-not" || condition.compare === "one-of") {
        operand = (
            <Autocomplete
                {...name(operandName)}
                data={samples}
                value={condition.text}
                onChange={(value) => {
                    set({ text: value });
                }}
            />
        );
    } else {
        operand = (
            <TextInput
                {...name("Value")}
                value={condition.text}
                onChange={(event) => {
                    set({ text: event.currentTarget.value });
                }}
            />
        );
    }

    const fields = (
        <>
            <Select
                {...name("Attribute")}
                data={choices.map((g) => ({ group: g.group, items: [...g.items] }))}
                value={chosen ? condition.reads : null}
                searchable
                // Tab passes through; the list opens on a click, a typed letter or ArrowDown.
                openOnFocus={false}
                onChange={(value) => {
                    const next = attributeOf(value ?? "", attributes);
                    const first = value === null ? "at-least" : (compares(next)[0] ?? "is");
                    onChange({ ...BLANK_CONDITION, reads: value ?? "", compare: first });
                }}
            />
            {offered.length > 1 && (
                <Select
                    {...name("Is")}
                    data={offered.map((c) => ({ value: c, label: compareWords(c) }))}
                    value={condition.compare}
                    allowDeselect={false}
                    onChange={(value) => {
                        const next = offered.find((c) => c === value);
                        if (next !== undefined) {
                            set({ compare: next });
                        }
                    }}
                />
            )}
            {operand}
        </>
    );

    if (labelled && onRemove === undefined) {
        return fields;
    }
    return (
        <Group gap={4} wrap="nowrap" align="flex-end" className="ws-condition-row">
            {fields}
            {onRemove !== undefined && (
                <Tooltip label="Remove condition">
                    <ActionIcon variant="subtle" aria-label="Remove condition" onClick={onRemove}>
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );
}

/** The props of a list of conditions joined by "and". */
interface RuleRowsProps extends Omit<ConditionRowProps, "condition" | "onChange" | "onRemove" | "labelled"> {
    readonly conditions: readonly Condition[];
    readonly onChange: (next: readonly Condition[]) => void;
}

/**
 * Conditions joined by "and", each with its minus, and "Add condition" below them.
 * @param props - Component props
 * @returns the rows.
 */
export function RuleRows(props: RuleRowsProps): React.JSX.Element {
    const { conditions, onChange, ...row } = props;
    return (
        <Stack gap={4}>
            {conditions.map((condition, i) => (
                <div key={String(i)} role="group" aria-label={`Condition ${String(i + 1)}`}>
                    <ConditionRow
                        {...row}
                        labelled={false}
                        condition={condition}
                        onChange={(next) => {
                            onChange(conditions.map((c, j) => (j === i ? next : c)));
                        }}
                        onRemove={() => {
                            onChange(conditions.filter((_c, j) => j !== i));
                        }}
                    />
                </div>
            ))}
            <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<GLYPHS.add size={12} aria-hidden />}
                onClick={() => {
                    onChange([...conditions, BLANK_CONDITION]);
                }}
            >
                Add condition
            </Button>
        </Stack>
    );
}
