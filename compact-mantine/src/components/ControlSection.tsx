import { ActionIcon, Box, Collapse, Divider, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { type KeyboardEvent } from "react";

import type { ControlSectionProps } from "../types";

/**
 * A collapsible section for grouping related controls.
 * Provides consistent Figma-style styling with toggle functionality.
 *
 * When hasConfiguredValues is true, shows a small indicator dot
 * to visually highlight that the section contains explicitly set values.
 * @param root0 - Component props
 * @param root0.label - The label text for the section header
 * @param root0.defaultOpen - Whether the section is open by default
 * @param root0.children - Child controls to render in the section
 * @param root0.hasConfiguredValues - Whether this section has configured values
 * @returns The control section component
 */
export function ControlSection({
    label,
    defaultOpen = true,
    children,
    hasConfiguredValues = false,
}: ControlSectionProps): React.JSX.Element {
    const [opened, { toggle }] = useDisclosure(defaultOpen);

    /**
     * Handle keyboard events for accessibility.
     * Toggles the section when Enter or Space is pressed.
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
            {/* Separator line above section */}
            {/* Uses default-border for theme-aware color that works in both light and dark modes */}
            <Divider color="var(--mantine-color-default-border)" mt={8} mb={0} mx={8} />
            {/* Header row with expand/collapse toggle - accessible via keyboard */}
            <Group
                justify="space-between"
                py={8}
                px={8}
                style={{ cursor: "pointer" }}
                onClick={toggle}
                role="button"
                tabIndex={0}
                aria-expanded={opened}
                aria-label={opened ? `Collapse ${label}` : `Expand ${label}`}
                onKeyDown={handleKeyDown}
            >
                <Group gap={4}>
                    <ActionIcon
                        variant="subtle"
                        size="xs"
                        c="dimmed"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        {opened ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </ActionIcon>
                    <Text size="xs" fw={500} lh={1.2}>
                        {label}
                    </Text>
                    {/* Indicator dot for sections with configured values */}
                    {hasConfiguredValues && (
                        <Box
                            aria-label={`${label} has configured values`}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: "var(--mantine-color-blue-5)",
                                marginLeft: 4,
                            }}
                        />
                    )}
                </Group>
            </Group>

            {/* Collapsible content area */}
            <Collapse in={opened}>
                <Stack gap={0}>{children}</Stack>
            </Collapse>
        </Box>
    );
}
