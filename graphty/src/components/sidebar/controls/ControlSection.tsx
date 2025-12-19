import {ActionIcon, Box, Collapse, Divider, Group, Stack, Text} from "@mantine/core";
import {useDisclosure} from "@mantine/hooks";
import {ChevronDown, ChevronRight} from "lucide-react";
import React from "react";

interface ControlSectionProps {
    label: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    /** Whether this section has any configured (non-default) values */
    hasConfiguredValues?: boolean;
}

/**
 * A collapsible section for grouping related controls.
 * Provides consistent Figma-style styling with toggle functionality.
 *
 * When hasConfiguredValues is true, shows a small indicator dot
 * to visually highlight that the section contains explicitly set values.
 */
export function ControlSection({label, defaultOpen = true, children, hasConfiguredValues = false}: ControlSectionProps): React.JSX.Element {
    const [opened, {toggle}] = useDisclosure(defaultOpen);

    return (
        <Box>
            {/* Separator line above section */}
            <Divider color="gray.7" mt={8} mb={0} />
            {/* Header row with expand/collapse toggle */}
            <Group
                justify="space-between"
                py={8}
                style={{cursor: "pointer"}}
                onClick={toggle}
            >
                <Group gap={4}>
                    <ActionIcon
                        variant="subtle"
                        size="xs"
                        c="dimmed"
                        aria-label={opened ? `Collapse ${label}` : `Expand ${label}`}
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
