import { Box, Stack } from "@mantine/core";
import React from "react";

import { CompactCheckbox } from "./CompactCheckbox";

interface EffectToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    children: React.ReactNode;
}

/**
 * A checkbox toggle that shows/hides child controls.
 * Used for enabling/disabling effects like glow and outline.
 * Provides clean visual indent for child content.
 * @param root0 - Component props
 * @param root0.label - The label for the toggle checkbox
 * @param root0.checked - Whether the toggle is checked
 * @param root0.onChange - Called when the toggle state changes
 * @param root0.children - Child controls to show when checked
 * @returns The effect toggle component
 */
export function EffectToggle({ label, checked, onChange, children }: EffectToggleProps): React.JSX.Element {
    return (
        <Stack gap={4}>
            <CompactCheckbox
                label={label}
                checked={checked}
                onChange={(e) => {
                    onChange(e.currentTarget.checked);
                }}
            />
            {checked && (
                <Box data-testid="effect-toggle-children" pl="md">
                    <Stack gap={4}>{children}</Stack>
                </Box>
            )}
        </Stack>
    );
}
