import { Box, Divider, Group, Stack, Text } from "@mantine/core";
import React from "react";

import type { ControlGroupProps } from "../types";

/**
 * A section header with label for grouping related controls.
 * Provides consistent Figma-style styling with separator lines.
 * @param root0 - Component props
 * @param root0.label - The label text for the group header
 * @param root0.actions - Optional action buttons to display in the header
 * @param root0.children - Child controls to render in the group
 * @param root0.bleed - When true, separator line extends to parent container edges
 * @returns The control group component
 */
export function ControlGroup({ label, actions, children, bleed }: ControlGroupProps): React.JSX.Element {
    // When bleed is true, use negative margin to extend separator line beyond parent padding
    // Uses CSS calc with Mantine spacing variable for theme-aware sizing
    // Adds 1px to account for typical 1px border on containers (sidebar, popout panels)
    const bleedMargin = bleed ? "calc(-1 * var(--mantine-spacing-sm) - 1px)" : undefined;

    return (
        <Box>
            {/* Separator line above section - extends to container edges when bleed is true */}
            {/* Uses default-border for theme-aware color that works in both light and dark modes */}
            <Divider color="var(--mantine-color-default-border)" mt={8} mb={0} mx={bleedMargin} />
            {/* Header row with label and optional actions */}
            <Group justify="space-between" py={8} px={8}>
                <Text size="xs" fw={500} lh={1.2}>
                    {label}
                </Text>
                {actions && <Group gap={4}>{actions}</Group>}
            </Group>

            {/* Content area - tight spacing between controls */}
            <Stack gap={0} px={8}>
                {children}
            </Stack>
        </Box>
    );
}
