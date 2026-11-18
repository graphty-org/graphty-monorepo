/**
 * The Export dialog's View field, shared by Image and Video, drawn from `viewChoice`'s entries.
 */

import { Select, Stack, Text } from "@mantine/core";
import React from "react";

import { CURRENT, type ViewChoice } from "./viewChoice";

/** Props for ViewSelect. */
interface ViewSelectProps {
    readonly views: ViewChoice;
    /** Called with the picked view name, or null for the reader's camera. */
    readonly onChange: (view: string | null) => void;
}

/**
 * The View list: an unusable view is disabled with its reason under its name, and the chosen one
 * shows its reason as the field's error.
 * @param props - Component props
 * @param props.views - the entries and the chosen one, from `viewChoice`
 * @param props.onChange - called with the picked view
 * @returns the list
 */
export function ViewSelect({ views, onChange }: ViewSelectProps): React.JSX.Element {
    const entries = [views.current, ...views.cameras, ...views.saved];
    return (
        <Select
            label="View"
            data={[
                { value: CURRENT, label: views.current.label },
                ...[
                    { group: "Camera views", items: views.cameras },
                    { group: "Saved views", items: views.saved },
                ]
                    .filter(({ items }) => items.length > 0)
                    .map(({ group, items }) => ({
                        group,
                        items: items.map((entry) => ({
                            value: entry.value,
                            label: entry.label,
                            disabled: entry.reason !== null,
                        })),
                    })),
            ]}
            value={views.chosen.value}
            error={views.chosen.reason ?? undefined}
            allowDeselect={false}
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
