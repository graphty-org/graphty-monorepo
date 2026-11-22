import { TextInput } from "@mantine/core";
import React from "react";

/**
 * Save as's name field: focused when the dialog opens, its text selected on focus.
 * @param props - Component props
 * @param props.value - the name.
 * @param props.onChange - takes the typed name.
 * @returns the field.
 */
export function NameField({
    value,
    onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>): React.JSX.Element {
    return (
        <TextInput
            data-autofocus
            label="Name"
            value={value}
            onChange={(event) => {
                onChange(event.currentTarget.value);
            }}
            onFocus={(event) => {
                event.currentTarget.select();
            }}
        />
    );
}
