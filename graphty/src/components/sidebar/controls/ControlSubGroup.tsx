import { ActionIcon, Box, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import React from "react";

interface ControlSubGroupProps {
    label: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

/**
 * A collapsible sub-section for grouping related advanced controls.
 * Used for nested options like text effects, animation settings, etc.
 * Provides a lighter visual weight than ControlSection.
 * @param root0 - Component props
 * @param root0.label - The label text for the sub-group header
 * @param root0.defaultOpen - Whether the sub-group is open by default
 * @param root0.children - Child controls to render in the sub-group
 * @returns The control sub-group component
 */
export function ControlSubGroup({ label, defaultOpen = false, children }: ControlSubGroupProps): React.JSX.Element {
    const [opened, { toggle }] = useDisclosure(defaultOpen);

    return (
        <Box>
            {/* Header row with expand/collapse toggle */}
            <Group gap={4} py={4} style={{ cursor: "pointer" }} onClick={toggle}>
                <ActionIcon
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    aria-label={opened ? `Collapse ${label}` : `Expand ${label}`}
                >
                    {opened ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </ActionIcon>
                <Text size="xs" c="dimmed" lh={1.2}>
                    {label}
                </Text>
            </Group>

            {/* Conditionally rendered content area with indent */}
            {opened && (
                <Box pl="md">
                    <Stack gap={4}>{children}</Stack>
                </Box>
            )}
        </Box>
    );
}
