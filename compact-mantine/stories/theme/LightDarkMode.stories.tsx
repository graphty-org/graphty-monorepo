import { Box, MantineProvider, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { compactTheme, ControlGroup, ControlSection, PANEL_GRID } from "../../src";
import { CM_COLORS, CM_HIGH_CONTRAST } from "../../src/theme/tokens";

/**
 * These stories demonstrate light/dark mode compatibility for components
 * that previously had hardcoded dark mode colors.
 *
 * Use the theme toggle in the Storybook toolbar to switch between light and dark modes.
 * All components should be readable and visually appropriate in both modes.
 */
const meta: Meta = {
    title: "Compact Theme/Mantine Components/Light-Dark Mode",
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
                <Box className="light-theme-container" style={{ flex: 1, colorScheme: "light" }}>
                    <MantineProvider
                        theme={compactTheme}
                        forceColorScheme="light"
                        cssVariablesSelector=".light-theme-container"
                    >
                        <Box
                            p="md"
                            style={{
                                backgroundColor: "var(--cm-bg)",
                                color: "var(--cm-text)",
                                border: "1px solid var(--cm-border)",
                                borderRadius: 13,
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
                <Box className="dark-theme-container" style={{ flex: 1, colorScheme: "dark" }}>
                    <MantineProvider
                        theme={compactTheme}
                        forceColorScheme="dark"
                        cssVariablesSelector=".dark-theme-container"
                    >
                        <Box
                            p="md"
                            style={{
                                backgroundColor: "var(--cm-bg)",
                                color: "var(--cm-text)",
                                border: "1px solid var(--cm-border)",
                                borderRadius: 13,
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
        <Box w={PANEL_GRID.WIDTH}>
            <Stack gap="md">
                <Title order={5}>ControlGroup</Title>
                <Text size="sm" c="dimmed">
                    The divider and text should be visible in both modes.
                </Text>

                <Box
                    style={{
                        backgroundColor: "var(--cm-bg)",
                        border: "1px solid var(--cm-border)",
                        borderRadius: 13,
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
        <Box w={PANEL_GRID.WIDTH}>
            <Stack gap="md">
                <Title order={5}>ControlSection</Title>
                <Text size="sm" c="dimmed">
                    The divider and text should be visible in both modes.
                    Click to collapse/expand.
                </Text>

                <Box
                    style={{
                        backgroundColor: "var(--cm-bg)",
                        border: "1px solid var(--cm-border)",
                        borderRadius: 13,
                    }}
                >
                    <ControlSection label="Node Settings" defaultOpened>
                        <Box p="xs">
                            <Text size="xs">Node configuration options</Text>
                        </Box>
                    </ControlSection>

                    <ControlSection label="Edge Settings" defaultOpened={false}>
                        <Box p="xs">
                            <Text size="xs">Edge configuration options</Text>
                        </Box>
                    </ControlSection>

                    <ControlSection label="Label Settings" defaultOpened>
                        <Box p="xs">
                            <Text size="xs">Label configuration options</Text>
                        </Box>
                    </ControlSection>
                </Box>
            </Stack>
        </Box>
    ),
};

/**
 * Every colour token, in the light and the dark scheme side by side. Each column sets
 * `color-scheme` on a wrapper and every `--cm-*` inside it resolves for that scheme -- the same
 * mechanism menus and tooltips use to render dark in the light app. Tokens the WCAG AA option
 * changes are marked AA; switch the toolbar's Contrast control to see their AA values.
 */
export const Tokens: Story = {
    render: () => (
        <Box style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "4px 16px", alignItems: "center" }}>
            <Text size="sm" fw={550}>
                Token
            </Text>
            <Text size="sm" fw={550}>
                Light
            </Text>
            <Text size="sm" fw={550}>
                Dark
            </Text>
            {Object.keys(CM_COLORS).map((name) => (
                <Box key={name} style={{ display: "contents" }}>
                    <Text size="sm" ff="monospace">
                        --cm-{name}
                        {name in CM_HIGH_CONTRAST ? " (AA)" : ""}
                    </Text>
                    {(["light", "dark"] as const).map((scheme) => (
                        <Box
                            key={scheme}
                            style={{
                                colorScheme: scheme,
                                background: "var(--cm-bg)",
                                padding: 4,
                                borderRadius: 5,
                            }}
                        >
                            <Box
                                style={{
                                    height: 16,
                                    borderRadius: 2,
                                    background: `var(--cm-${name})`,
                                    boxShadow: "inset 0 0 0 1px var(--cm-border-translucent)",
                                }}
                            />
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    ),
};
