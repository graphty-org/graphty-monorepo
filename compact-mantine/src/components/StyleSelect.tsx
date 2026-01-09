import { ActionIcon, Group, Select } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { ChevronDown, X } from "lucide-react";
import React from "react";

import type { StyleSelectProps } from "../types";

/**
 * A select input that distinguishes between default and explicit values.
 * Supports both controlled and uncontrolled modes.
 *
 * Features:
 * - Shows muted styling when using default value (value is undefined)
 * - Shows normal styling when an explicit value is set
 * - Shows a reset button (x) only when an explicit value is set
 * - Clicking reset calls onChange(undefined) to revert to default
 * @param root0 - Component props
 * @param root0.label - Label for the select
 * @param root0.value - Current value - undefined means using default (controlled mode)
 * @param root0.defaultValue - Default value to show when value is undefined
 * @param root0.options - Available options
 * @param root0.onChange - Called when value changes (optional for uncontrolled mode)
 * @returns The style select component
 */
export function StyleSelect({ label, value, defaultValue, options, onChange }: StyleSelectProps): React.JSX.Element {
    // Use Mantine's useUncontrolled for controlled/uncontrolled support
    const [_value, handleChange] = useUncontrolled<string | undefined>({
        value,
        defaultValue: undefined, // Start with undefined (using default)
        finalValue: undefined,
        onChange,
    });

    const isDefault = _value === undefined;
    const displayValue = _value ?? defaultValue;

    const handleSelectChange = (newValue: string | null): void => {
        if (newValue !== null) {
            handleChange(newValue);
        }
    };

    const handleReset = (): void => {
        handleChange(undefined);
    };

    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <Select
                label={label}
                aria-label={label}
                value={displayValue}
                onChange={handleSelectChange}
                data={options}
                rightSection={<ChevronDown size={14} />}
                rightSectionPointerEvents="none"
                data-is-default={isDefault ? "true" : "false"}
                allowDeselect={false}
                styles={{
                    input: isDefault
                        ? {
                              fontStyle: "italic",
                              color: "var(--mantine-color-dimmed)",
                          }
                        : undefined,
                }}
                style={{ flex: 1 }}
            />
            {!isDefault && (
                <ActionIcon
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    aria-label={`Reset ${label} to default`}
                    onClick={handleReset}
                    style={{ marginBottom: 2 }}
                >
                    <X size={12} />
                </ActionIcon>
            )}
        </Group>
    );
}
