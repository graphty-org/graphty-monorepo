/**
 * Condition rows: value, comparison and operand, the rule editor of Data > Filters. A condition is the app's editing state; the
 * rule it makes is a graphty-element `RuleTree` leaf, and every count is the element's.
 */

import { ActionIcon, Autocomplete, NumberInput, Select, TextInput, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { yesNoWord } from "../inspector/words";
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
 * A value box with the column's values listed under it. Typing makes the first listed value the
 * active one, so Enter takes a value from the list rather than the letters typed so far; with
 * nothing listed, Enter is the form's. The list counts as open only while it shows a value, so
 * Escape on an empty list is not spent closing nothing.
 * @param props - Component props
 * @param props.samples - the values to list.
 * @param props.value - the text in the box.
 * @param props.onChange - takes the new text.
 * @param props.label - the field's label, in a form.
 * @param props."aria-label" - the field's name, in a row.
 * @returns the box.
 */
function ValueBox({
    samples,
    value,
    onChange,
    ...named
}: Readonly<{
    samples: readonly string[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    "aria-label"?: string;
}>): React.JSX.Element {
    const [opened, setOpened] = useState(false);
    const typed = value.trim().toLowerCase();
    const listed = samples.filter((sample) => sample.toLowerCase().includes(typed));
    return (
        <Autocomplete
            {...named}
            data={listed}
            filter={({ options }) => options}
            selectFirstOptionOnChange
            dropdownOpened={opened && listed.length > 0}
            onDropdownOpen={() => {
                setOpened(true);
            }}
            onDropdownClose={() => {
                setOpened(false);
            }}
            value={value}
            onChange={onChange}
        />
    );
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
    } else if (
        attribute?.type === "boolean" &&
        (condition.compare === "is" || condition.compare === "is-not" || condition.compare === "one-of")
    ) {
        // A yes-or-no column offers its two values in the words every place writes them; the
        // rule holds them as graphty-element's rules read a yes-or-no, "true" and "false".
        operand = (
            <Select
                {...name(operandName)}
                data={[
                    { value: "true", label: yesNoWord(true) },
                    { value: "false", label: yesNoWord(false) },
                ]}
                value={condition.text === "true" || condition.text === "false" ? condition.text : null}
                allowDeselect={false}
                onChange={(value) => {
                    set({ text: value ?? "" });
                }}
            />
        );
    } else if (condition.compare === "is" || condition.compare === "is-not" || condition.compare === "one-of") {
        operand = (
            <ValueBox
                {...name(operandName)}
                samples={samples}
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
                    // A yes-or-no starts at Yes, as a style card on one does.
                    const text = next?.type === "boolean" ? "true" : "";
                    onChange({ ...BLANK_CONDITION, reads: value ?? "", compare: first, text });
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
        // The attribute on its own line beside the minus, the test and its value under it, so
        // nothing is cut at the inspector's 240 px (style.css).
        <div className="ws-condition-row">
            {fields}
            {onRemove !== undefined && (
                <Tooltip label="Remove condition">
                    <ActionIcon
                        variant="subtle"
                        aria-label="Remove condition"
                        onClick={onRemove}
                        className="ws-condition-remove"
                    >
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
        </div>
    );
}
