/**
 * The Export dialog's Camera field, shared by Image and Video, drawn from `viewChoice`'s entries.
 */

import { Select, Stack, Text } from "@mantine/core";
import React from "react";

import type { ViewChoice } from "./viewChoice";

/** Props for ViewSelect. */
interface ViewSelectProps {
    readonly views: ViewChoice;
    /** Called with the picked camera's name, or null for the reader's camera. */
    readonly onChange: (view: string | null) => void;
    /** Whether the list is disabled, such as while a recording runs. */
    readonly disabled?: boolean;
}

/**
 * The Camera list: an unusable camera is disabled with its reason under its name, and the chosen one
 * shows its reason as the field's error.
 * @param props - Component props
 * @param props.views - the entries and the chosen one, from `viewChoice`
 * @param props.onChange - called with the picked view
 * @param props.disabled - whether the list is disabled
 * @returns the list
 */
export function ViewSelect({ views, onChange, disabled = false }: ViewSelectProps): React.JSX.Element {
    const entries = [views.current, ...views.saved];
    return (
        <Select
            label="Camera"
            data={entries.map((entry) => ({
                value: entry.value,
                label: entry.label,
                disabled: entry.reason !== null,
            }))}
            value={views.chosen.value}
            error={views.chosen.reason ?? undefined}
            allowDeselect={false}
            disabled={disabled}
            renderOption={({ option }) => {
                const reason = entries.find((entry) => entry.value === option.value)?.reason;
                return reason === null || reason === undefined ? (
                    option.label
                ) : (
                    <Stack gap={0}>
                        <Text size="xs">{option.label}</Text>
                        <Text size="xs" c="dimmed">
                            {reason}
                        </Text>
                    </Stack>
                );
            }}
            onChange={(value) => {
                onChange(entries.find((entry) => entry.value === value)?.view ?? null);
            }}
        />
    );
}
