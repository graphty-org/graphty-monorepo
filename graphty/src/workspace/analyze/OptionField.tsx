import { StyleNumberInput } from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import { Checkbox, Select } from "@mantine/core";
import type React from "react";

/** Props for OptionField. */
interface OptionFieldProps {
    option: OptionDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}

/**
 * One option of the short form, drawn from the element's option descriptor: a number field, a
 * choice list or a checkbox. Its label is the element's option name.
 * @param props - Component props
 * @param props.option - The option descriptor
 * @param props.value - The value set, or undefined for the default
 * @param props.onChange - Called with the new value
 * @returns The control
 */
export function OptionField({ option, value, onChange }: OptionFieldProps): React.JSX.Element | null {
    switch (option.type) {
        case "number":
        case "integer":
            return (
                <StyleNumberInput
                    label={option.plainName}
                    value={typeof value === "number" ? value : undefined}
                    defaultValue={typeof option.default === "number" ? option.default : 0}
                    min={typeof option.min === "number" ? option.min : undefined}
                    max={typeof option.max === "number" ? option.max : undefined}
                    step={option.step ?? (option.type === "integer" ? 1 : undefined)}
                    decimalScale={option.type === "integer" ? 0 : undefined}
                    onChange={onChange}
                />
            );
        case "enum": {
            const fallback = typeof option.default === "string" ? option.default : null;
            return (
                <Select
                    label={option.plainName}
                    value={typeof value === "string" ? value : fallback}
                    data={(option.values ?? []).map(({ value: v, label }) => ({ value: v, label }))}
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
                    label={option.plainName}
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
