import { ActionIcon, Box, Collapse, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { type KeyboardEvent } from "react";

import type { ControlSubGroupProps } from "../types";

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

    /**
     * Handle keyboard events for accessibility.
     * Toggles the sub-group when Enter or Space is pressed.
     * @param e - The keyboard event
     */
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
        }
    };

    return (
        <Box>
            {/* Header row with expand/collapse toggle - accessible via keyboard */}
            <Group
                gap={4}
                py={4}
                style={{ cursor: "pointer" }}
                onClick={toggle}
                role="button"
                tabIndex={0}
                aria-expanded={opened}
                aria-label={opened ? `Collapse ${label}` : `Expand ${label}`}
                onKeyDown={handleKeyDown}
            >
                <ActionIcon
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    tabIndex={-1}
                    aria-hidden="true"
                >
                    {opened ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </ActionIcon>
                <Text size="xs" c="dimmed" lh={1.2}>
                    {label}
                </Text>
            </Group>

            {/* Animated content area using Collapse for smooth transitions */}
            <Collapse in={opened}>
                <Box pl="md">
                    <Stack gap={4}>{children}</Stack>
                </Box>
            </Collapse>
        </Box>
    );
}
