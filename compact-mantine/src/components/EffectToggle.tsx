import { Box, Checkbox, Stack } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React from "react";

import type { EffectToggleProps } from "../types";

/**
 * A checkbox toggle that shows/hides child controls.
 * Supports both controlled and uncontrolled modes.
 * Used for enabling/disabling effects like glow and outline.
 * Provides clean visual indent for child content.
 * @param root0 - Component props
 * @param root0.label - The label for the toggle checkbox
 * @param root0.checked - Whether the toggle is checked (controlled mode)
 * @param root0.defaultChecked - Default checked state for uncontrolled mode
 * @param root0.onChange - Called when the toggle state changes (optional for uncontrolled mode)
 * @param root0.children - Child controls to show when checked
 * @returns The effect toggle component
 */
export function EffectToggle({
    label,
    checked,
    defaultChecked,
    onChange,
    children,
}: EffectToggleProps): React.JSX.Element {
    // Use Mantine's useUncontrolled for controlled/uncontrolled support
    const [_checked, handleChange] = useUncontrolled<boolean>({
        value: checked,
        defaultValue: defaultChecked,
        finalValue: false,
        onChange,
    });

    return (
        <Stack gap={4}>
            <Checkbox
                size="compact"
                label={label}
                checked={_checked}
                onChange={(e) => {
                    handleChange(e.currentTarget.checked);
                }}
            />
            {_checked && (
                <Box data-testid="effect-toggle-children" pl="md">
                    <Stack gap={4}>{children}</Stack>
                </Box>
            )}
        </Stack>
    );
}
