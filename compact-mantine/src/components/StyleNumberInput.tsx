import { ActionIcon, Group, NumberInput } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";

import type { StyleNumberInputProps } from "../types";

/**
 * A number input that distinguishes between default and explicit values.
 * Supports both controlled and uncontrolled modes.
 *
 * Features:
 * - Shows muted/italic styling when using default value (value is undefined)
 * - Shows normal styling when an explicit value is set
 * - Shows a reset button (x) only when an explicit value is set
 * - Clicking reset calls onChange(undefined) to revert to default
 * @param root0 - Component props
 * @param root0.label - Label for the input
 * @param root0.value - Current value - undefined means using default (controlled mode)
 * @param root0.defaultValue - Default value to show when value is undefined
 * @param root0.onChange - Called when value changes (optional for uncontrolled mode)
 * @param root0.min - Minimum allowed value
 * @param root0.max - Maximum allowed value
 * @param root0.step - Step increment
 * @param root0.decimalScale - Number of decimal places
 * @param root0.suffix - Suffix to display
 * @param root0.hideControls - Whether to hide the spinner controls
 * @returns The style number input component
 */
export function StyleNumberInput({
    label,
    value,
    defaultValue,
    onChange,
    min,
    max,
    step,
    decimalScale,
    suffix,
    hideControls = true,
}: StyleNumberInputProps): React.JSX.Element {
    // Use Mantine's useUncontrolled for controlled/uncontrolled support
    const [_value, handleChange] = useUncontrolled<number | undefined>({
        value,
        defaultValue: undefined, // Start with undefined (using default)
        finalValue: undefined,
        onChange,
    });

    const isDefault = _value === undefined;
    const displayValue = _value ?? defaultValue;

    // Local state for the input to prevent focus loss during typing
    const [localValue, setLocalValue] = useState<string | number>(displayValue);

    // Sync local state when value changes
    useEffect(() => {
        setLocalValue(_value ?? defaultValue);
    }, [_value, defaultValue]);

    const handleInputChange = (newValue: string | number): void => {
        setLocalValue(newValue);
    };

    const handleBlur = (): void => {
        const numValue = typeof localValue === "string" ? parseFloat(localValue) : localValue;
        if (!isNaN(numValue)) {
            // Clamp to min/max
            let clampedValue = numValue;
            if (min !== undefined && clampedValue < min) {
                clampedValue = min;
            }
            if (max !== undefined && clampedValue > max) {
                clampedValue = max;
            }

            if (clampedValue !== _value) {
                handleChange(clampedValue);
            }
            // Update local display to show clamped value
            setLocalValue(clampedValue);
        } else {
            // Reset to current value if invalid
            setLocalValue(_value ?? defaultValue);
        }
    };

    const handleReset = (): void => {
        handleChange(undefined);
    };

    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <NumberInput
                label={label}
                aria-label={label}
                value={localValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                min={min}
                max={max}
                step={step}
                decimalScale={decimalScale}
                suffix={suffix}
                hideControls={hideControls}
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
