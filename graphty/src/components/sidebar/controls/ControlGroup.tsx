import {Box, Divider, Group, Stack, Text} from "@mantine/core";
import React from "react";

interface ControlGroupProps {
    label: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * A section header with label for grouping related controls.
 * Provides consistent Figma-style styling with separator lines.
 */
export function ControlGroup({label, actions, children}: ControlGroupProps): React.JSX.Element {
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
