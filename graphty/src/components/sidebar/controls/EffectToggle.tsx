import {Box, Stack} from "@mantine/core";
import React from "react";

import {CompactCheckbox} from "./CompactCheckbox";

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
 */
export function EffectToggle({label, checked, onChange, children}: EffectToggleProps): React.JSX.Element {
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
