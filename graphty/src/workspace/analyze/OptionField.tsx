import { StyleNumberInput } from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import { Checkbox, Select } from "@mantine/core";
import type React from "react";

import { optionWords } from "./words";

/** Props for OptionField. */
interface OptionFieldProps {
    /** The algorithm's key, for the app's words. */
    algorithm: string;
    option: OptionDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}

/**
 * A value if it is a number.
 * @param value - the value.
 * @returns the number, or undefined.
 */
function num(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
}

/**
 * A number or integer option as a number field.
 * @param props - Component props
 * @param props.label - The app's words for it
 * @param props.option - The option descriptor
 * @param props.value - The value set, or undefined for the default
 * @param props.onChange - Called with the new value
 * @returns The field
 */
function NumberOption({
    label,
    option,
    value,
    onChange,
}: Readonly<{ label: string } & Omit<OptionFieldProps, "algorithm">>): React.JSX.Element {
    const integer = option.type === "integer";
    return (
        <StyleNumberInput
            label={label}
            value={num(value)}
            defaultValue={num(option.default) ?? 0}
            min={num(option.min)}
            max={num(option.max)}
            step={option.step ?? (integer ? 1 : undefined)}
            decimalScale={integer ? 0 : undefined}
            onChange={onChange}
        />
    );
}

/**
 * One option of the short form, drawn from the element's option descriptor: a number field, a
 * choice list or a checkbox, under the app's words for it.
 * @param props - Component props
 * @param props.algorithm - The algorithm's key
 * @param props.option - The option descriptor
 * @param props.value - The value set, or undefined for the default
 * @param props.onChange - Called with the new value
 * @returns The control
 */
export function OptionField({
    algorithm,
    option,
    value,
    onChange,
}: Readonly<OptionFieldProps>): React.JSX.Element | null {
    const words = optionWords(algorithm, option);
    switch (option.type) {
        case "number":
        case "integer":
            return <NumberOption label={words.label} option={option} value={value} onChange={onChange} />;
        case "enum": {
            const fallback = typeof option.default === "string" ? option.default : null;
            return (
                <Select
                    label={words.label}
                    value={typeof value === "string" ? value : fallback}
                    data={(option.values ?? []).map(({ value: v }) => ({ value: v, label: words.choice(v) }))}
                    allowDeselect={false}
                    // The list stays inside the Analyze popover, so picking from it is not a click
                    // outside that closes the popover first.
                    comboboxProps={{ withinPortal: false }}
                    onChange={onChange}
                />
            );
        }
        case "boolean":
            return (
                <Checkbox
                    size="xs"
                    label={words.label}
                    checked={typeof value === "boolean" ? value : option.default === true}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked);
                    }}
                />
            );
        default:
            return null;
    }
}
