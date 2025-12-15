import {ActionIcon, Group, NumberInput} from "@mantine/core";
import {X} from "lucide-react";
import React, {useEffect, useState} from "react";

export interface StyleNumberInputProps {
    /** Label for the input (also used for aria-label) */
    label: string;
    /** Current value - undefined means using default */
    value: number | undefined;
    /** Default value to show when value is undefined */
    defaultValue: number;
    /** Called when value changes */
    onChange: (value: number | undefined) => void;
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Number of decimal places */
    decimalScale?: number;
    /** Suffix to display (e.g., "%") */
    suffix?: string;
    /** Whether to hide the spinner controls */
    hideControls?: boolean;
}

/**
 * A number input that distinguishes between default and explicit values.
 *
 * Features:
 * - Shows muted/italic styling when using default value (value is undefined)
 * - Shows normal styling when an explicit value is set
 * - Shows a reset button (×) only when an explicit value is set
 * - Clicking reset calls onChange(undefined) to revert to default
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
    const isDefault = value === undefined;
    const displayValue = value ?? defaultValue;

    // Local state for the input to prevent focus loss during typing
    const [localValue, setLocalValue] = useState<string | number>(displayValue);

    // Sync local state when prop changes
    useEffect(() => {
        setLocalValue(value ?? defaultValue);
    }, [value, defaultValue]);

    const handleChange = (newValue: string | number): void => {
        setLocalValue(newValue);
    };

    const handleBlur = (): void => {
        const numValue = typeof localValue === "string" ? parseFloat(localValue) : localValue;
        if (!isNaN(numValue) && numValue !== value) {
            onChange(numValue);
        } else if (isNaN(numValue)) {
            // Reset to current value if invalid
            setLocalValue(value ?? defaultValue);
        }
    };

    const handleReset = (): void => {
        onChange(undefined);
    };

    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <NumberInput
                label={label}
                aria-label={label}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                min={min}
                max={max}
                step={step}
                decimalScale={decimalScale}
                suffix={suffix}
                hideControls={hideControls}
                size="compact"
                data-is-default={isDefault ? "true" : "false"}
                styles={{
                    input: isDefault ? {
                        fontStyle: "italic",
                        color: "var(--mantine-color-dark-2)",
                    } : undefined,
                }}
                style={{flex: 1}}
            />
            {!isDefault && (
                <ActionIcon
                    variant="subtle"
                    size="xs"
                    c="dark.3"
                    aria-label={`Reset ${label} to default`}
                    onClick={handleReset}
                    style={{marginBottom: 2}}
                >
                    <X size={12} />
                </ActionIcon>
            )}
        </Group>
    );
}
