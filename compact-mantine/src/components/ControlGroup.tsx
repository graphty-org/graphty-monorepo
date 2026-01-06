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
 * @returns The control group component
 */
export function ControlGroup({ label, actions, children }: ControlGroupProps): React.JSX.Element {
    return (
        <Box>
            {/* Separator line above section */}
            <Divider color="gray.7" mt={8} mb={0} />
            {/* Header row with label and optional actions */}
            <Group justify="space-between" py={8}>
                <Text size="xs" fw={500} lh={1.2}>
                    {label}
                </Text>
                {actions && <Group gap={4}>{actions}</Group>}
            </Group>

            {/* Content area - tight spacing between controls */}
            <Stack gap={0}>{children}</Stack>
        </Box>
    );
}
