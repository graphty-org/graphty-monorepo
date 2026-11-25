import { Select } from "@mantine/core";
import React from "react";

/**
 * A select whose picks a join workspace card writes.
 * @param props - Component props
 * @param props.name - its accessible name
 * @param props.data - its choices
 * @param props.value - the choice now, or null
 * @param props.onPick - takes a pick
 * @returns the select
 */
export function Pick({
    name,
    data,
    value,
    onPick,
}: Readonly<{
    name: string;
    data: readonly { readonly value: string; readonly label: string }[];
    value: string | null;
    onPick: (value: string) => void;
}>): React.JSX.Element {
    return (
        <Select
            size="xs"
            aria-label={name}
            placeholder={name.replace(/^Field \d /, "")}
            allowDeselect={false}
            data={data.map((each) => ({ ...each }))}
            value={value}
            onChange={(next) => {
                if (next !== null && next !== value) {
                    onPick(next);
                }
            }}
        />
    );
}
