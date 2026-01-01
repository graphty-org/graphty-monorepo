import { ActionIcon, Group, NativeSelect } from "@mantine/core";
import { ChevronDown, X } from "lucide-react";
import React from "react";

export interface StyleSelectOption {
    value: string;
    label: string;
}

export interface StyleSelectProps {
    /** Label for the select (also used for aria-label) */
    label: string;
    /** Current value - undefined means using default */
    value: string | undefined;
    /** Default value to show when value is undefined */
    defaultValue: string;
    /** Available options */
    options: StyleSelectOption[];
    /** Called when value changes */
    onChange: (value: string | undefined) => void;
}

/**
 * A select input that distinguishes between default and explicit values.
 *
 * Features:
 * - Shows muted styling when using default value (value is undefined)
 * - Shows normal styling when an explicit value is set
 * - Shows a reset button (x) only when an explicit value is set
 * - Clicking reset calls onChange(undefined) to revert to default
 * @param root0 - Component props
 * @param root0.label - Label for the select
 * @param root0.value - Current value - undefined means using default
 * @param root0.defaultValue - Default value to show when value is undefined
 * @param root0.options - Available options
 * @param root0.onChange - Called when value changes
 * @returns The style select component
 */
export function StyleSelect({ label, value, defaultValue, options, onChange }: StyleSelectProps): React.JSX.Element {
    const isDefault = value === undefined;
    const displayValue = value ?? defaultValue;

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange(event.currentTarget.value);
    };

    const handleReset = (): void => {
        onChange(undefined);
    };

    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <NativeSelect
                label={label}
                aria-label={label}
                value={displayValue}
                onChange={handleChange}
                data={options}
                size="compact"
                rightSection={<ChevronDown size={14} />}
                rightSectionPointerEvents="none"
                data-is-default={isDefault ? "true" : "false"}
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
