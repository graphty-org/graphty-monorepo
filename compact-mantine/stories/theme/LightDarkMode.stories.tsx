import { Box, MantineProvider, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { compactTheme, ControlGroup, ControlSection } from "../../src";

/**
 * These stories demonstrate light/dark mode compatibility for components
 * that previously had hardcoded dark mode colors.
 *
 * Use the theme toggle in the Storybook toolbar to switch between light and dark modes.
 * All components should be readable and visually appropriate in both modes.
 */
const meta: Meta = {
    title: "Theme/Light-Dark Mode",
};

export default meta;

type Story = StoryObj;

/**
 * Side-by-side comparison of light and dark modes.
 * This helps verify that all components render correctly in both color schemes.
 */
export const SideBySide: Story = {
    render: () => (
        <Stack gap="xl">
            <Title order={4}>Light vs Dark Mode Comparison</Title>
            <Text size="sm" c="dimmed">
                All components should be readable with appropriate contrast in both modes.
            </Text>

            <Box style={{ display: "flex", gap: 32 }}>
                {/* Light mode panel */}
                <Box className="light-theme-container" style={{ flex: 1 }}>
                    <MantineProvider
                        theme={compactTheme}
                        forceColorScheme="light"
                        cssVariablesSelector=".light-theme-container"
                    >
                        <Box
                            p="md"
                            style={{
                                backgroundColor: "var(--mantine-color-body)",
                                border: "1px solid var(--mantine-color-default-border)",
                                borderRadius: 8,
                            }}
                        >
                            <Stack gap="md">
                                <Title order={5}>Light Mode</Title>

                                <SegmentedControl
                                    data={["Option 1", "Option 2", "Option 3"]}
                                    defaultValue="Option 1"
                                />

                                <ControlGroup label="Control Group Header">
                                    <Box p="xs">
                                        <Text size="xs">Content inside group</Text>
                                    </Box>
                                </ControlGroup>

                                <ControlSection label="Collapsible Section">
                                    <Box p="xs">
                                        <Text size="xs">Content inside section</Text>
                                    </Box>
                                </ControlSection>
                            </Stack>
                        </Box>
                    </MantineProvider>
                </Box>

                {/* Dark mode panel */}
                <Box className="dark-theme-container" style={{ flex: 1 }}>
                    <MantineProvider
                        theme={compactTheme}
                        forceColorScheme="dark"
                        cssVariablesSelector=".dark-theme-container"
                    >
                        <Box
                            p="md"
                            style={{
                                backgroundColor: "var(--mantine-color-body)",
                                border: "1px solid var(--mantine-color-default-border)",
                                borderRadius: 8,
                            }}
                        >
                            <Stack gap="md">
                                <Title order={5}>Dark Mode</Title>

                                <SegmentedControl
                                    data={["Option 1", "Option 2", "Option 3"]}
                                    defaultValue="Option 1"
                                />

                                <ControlGroup label="Control Group Header">
                                    <Box p="xs">
                                        <Text size="xs">Content inside group</Text>
                                    </Box>
                                </ControlGroup>

                                <ControlSection label="Collapsible Section">
                                    <Box p="xs">
                                        <Text size="xs">Content inside section</Text>
                                    </Box>
                                </ControlSection>
                            </Stack>
                        </Box>
                    </MantineProvider>
                </Box>
            </Box>
        </Stack>
    ),
};

/**
 * SegmentedControl indicator should be visible in both light and dark modes.
 * Previously, the indicator used a hardcoded dark mode color.
 */
export const SegmentedControlIndicator: Story = {
    render: () => (
        <Stack gap="md">
            <Title order={5}>SegmentedControl Indicator</Title>
            <Text size="sm" c="dimmed">
                The selected indicator should be visible in both light and dark modes.
                Use the theme toggle in the toolbar to verify.
            </Text>

            <SegmentedControl
                data={["First", "Second", "Third"]}
                defaultValue="First"
            />

            <SegmentedControl
                data={["Settings", "Appearance", "About"]}
                defaultValue="Settings"
            />

            <SegmentedControl
                data={["Day", "Week", "Month", "Year"]}
                defaultValue="Week"
            />
        </Stack>
    ),
};

/**
 * ControlGroup should have readable divider and text colors in both modes.
 */
export const ControlGroupColors: Story = {
    render: () => (
        <Box w={280}>
            <Stack gap="md">
                <Title order={5}>ControlGroup</Title>
                <Text size="sm" c="dimmed">
                    The divider and text should be visible in both modes.
                </Text>

                <Box
                    style={{
                        backgroundColor: "var(--mantine-color-body)",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 8,
                    }}
                >
                    <ControlGroup label="Appearance">
                        <Box p="xs">
                            <Text size="xs">Settings content here</Text>
                        </Box>
                    </ControlGroup>

                    <ControlGroup label="Layout">
                        <Box p="xs">
                            <Text size="xs">Layout options here</Text>
                        </Box>
                    </ControlGroup>

                    <ControlGroup label="Advanced">
                        <Box p="xs">
                            <Text size="xs">Advanced settings here</Text>
                        </Box>
                    </ControlGroup>
                </Box>
            </Stack>
        </Box>
    ),
};

/**
 * ControlSection should have readable divider and text colors in both modes.
 */
export const ControlSectionColors: Story = {
    render: () => (
        <Box w={280}>
            <Stack gap="md">
                <Title order={5}>ControlSection</Title>
                <Text size="sm" c="dimmed">
                    The divider and text should be visible in both modes.
                    Click to collapse/expand.
                </Text>

                <Box
                    style={{
                        backgroundColor: "var(--mantine-color-body)",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 8,
                    }}
                >
                    <ControlSection label="Node Settings" defaultOpen>
                        <Box p="xs">
                            <Text size="xs">Node configuration options</Text>
                        </Box>
                    </ControlSection>

                    <ControlSection label="Edge Settings" defaultOpen={false}>
                        <Box p="xs">
                            <Text size="xs">Edge configuration options</Text>
                        </Box>
                    </ControlSection>

                    <ControlSection label="Label Settings" defaultOpen>
                        <Box p="xs">
                            <Text size="xs">Label configuration options</Text>
                        </Box>
                    </ControlSection>
                </Box>
            </Stack>
        </Box>
    ),
};
