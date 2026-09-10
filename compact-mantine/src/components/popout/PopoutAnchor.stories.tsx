import { ActionIcon, Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { ControlGroup, Popout, PopoutButton, PopoutManager, UiGlyph } from "../../index";
import { PopoutAnchor } from "./PopoutAnchor";

// Everything but PopoutAnchor comes from "../../index", the package's published
// entry point. The anchor is reached as `Popout.Anchor` rather than as a named
// export, so this file imports it from its own module to name it in the story.

/**
 * `Popout.Anchor` marks the container that pop-outs inside it line their edge up
 * with.
 *
 * **Purpose:** So that a column of triggers opens one tidy stack of panels
 * against the container's edge, rather than a staircase following the buttons.
 *
 * **Key behaviours:**
 * - The container decides the horizontal edge; each panel still opens level with
 *   the row that opened it
 * - A panel opened from inside another panel lines up with that panel instead,
 *   so nested stacks step out one level at a time
 * - Every pop-out inside the same anchor uses it, with no per-panel wiring
 * - Panels keep their full border and rounded corners either way; the anchor
 *   changes where a panel opens, not how it is drawn
 *
 * **When to use:**
 * - Sidebars with several pop-out triggers
 * - Control panels whose pop-outs should extend from the panel edge
 * - Any container that wants one consistent opening edge
 */
const meta: Meta<typeof PopoutAnchor> = {
    title: "Floating Panels/Popout.Anchor",
    component: PopoutAnchor,
    tags: ["autodocs"],
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PopoutAnchor>;

/**
 * Anchor to a sidebar.
 *
 * The common case: a sidebar with several controls, each opening a panel. Every
 * panel meets the sidebar's edge, and each one opens level with its own row.
 */
export const AnchorToPanel: Story = {
    render: function AnchorToPanelRender() {
        return (
            <Popout.Anchor>
                <Box
                    w={260}
                    p="sm"
                    style={{
                        backgroundColor: "var(--mantine-color-body)",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 8,
                    }}
                >
                    <Stack gap="xs">
                        <Text size="sm" fw={500} mb="xs">
                            Settings Panel
                        </Text>

                        <Popout>
                            <ControlGroup
                                label="Display"
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="gear" size={12} />}
                                            aria-label="Open display settings"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Configure display options
                                </Text>
                            </ControlGroup>
                            <Popout.Panel
                                width={220}
                                header={{ variant: "title", title: "Display Settings" }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <Stack gap="xs" p="sm">
                                        <Text size="sm">
                                            The panel meets the sidebar edge.
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            It opens level with the row it came from.
                                        </Text>
                                    </Stack>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>

                        <Popout>
                            <ControlGroup
                                label="Advanced"
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="chevronRight" size={12} />}
                                            aria-label="Open advanced settings"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Advanced configuration
                                </Text>
                            </ControlGroup>
                            <Popout.Panel
                                width={220}
                                header={{ variant: "title", title: "Advanced" }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <Stack gap="xs" p="sm">
                                        <Text size="sm">
                                            All popouts in this sidebar align to the same anchor.
                                        </Text>
                                    </Stack>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Stack>
                </Box>
            </Popout.Anchor>
        );
    },
};

/**
 * Anchor to a button or small element.
 *
 * You can also anchor to smaller elements like buttons. This is useful when
 * you want the popout panel to align with a specific UI element rather than
 * appearing offset from the trigger.
 *
 * In this example, the "More options" button serves as both the anchor and
 * contains the trigger. The panel aligns flush with the button's edge.
 */
export const AnchorToButton: Story = {
    render: function AnchorToButtonRender() {
        return (
            <Stack gap="xl" align="center">
                {/* Example 1: Action button with popout */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        Action Button Anchor
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                        Panel aligns to the button edge
                    </Text>
                    <Popout.Anchor>
                        <Button
                            variant="light"
                            rightSection={<UiGlyph name="chevronRight" size={14} />}
                        >
                            <Popout>
                                <Popout.Trigger>
                                    <Box
                                        component="span"
                                        style={{ cursor: "pointer" }}
                                    >
                                        More Options
                                    </Box>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={200}
                                    header={{ variant: "title", title: "Options" }}
                                    placement="right"
                                >
                                    <Popout.Content>
                                        <Stack gap="xs" p="sm">
                                            <Text size="sm">
                                                Panel extends from the button edge.
                                            </Text>
                                        </Stack>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Button>
                    </Popout.Anchor>
                </Box>

                {/* Example 2: Icon button with popout */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        Icon Button Anchor
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                        Panel aligns below the icon button
                    </Text>
                    <Popout.Anchor>
                        <ActionIcon variant="light" size="lg">
                            <Popout>
                                <Popout.Trigger>
                                    <Box
                                        component="span"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <UiGlyph name="chevronDown" size={18} />
                                    </Box>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={180}
                                    header={{ variant: "title", title: "Menu" }}
                                    placement="bottom"
                                    alignment="end"
                                >
                                    <Popout.Content>
                                        <Stack gap="xs" p="sm">
                                            <Text size="sm">Action 1</Text>
                                            <Text size="sm">Action 2</Text>
                                            <Text size="sm">Action 3</Text>
                                        </Stack>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </ActionIcon>
                    </Popout.Anchor>
                </Box>
            </Stack>
        );
    },
};

/**
 * Comparison: With and without anchor.
 *
 * This story shows the difference between using `Popout.Anchor` and not.
 *
 * **Without anchor:** the panel opens beside the trigger, offset by the gap.
 * **With anchor:** the panel opens against the container's edge instead.
 */
export const Comparison: Story = {
    render: function ComparisonRender() {
        return (
            <Group gap="xl" align="flex-start">
                {/* Without Popout.Anchor */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        Without Anchor
                    </Text>
                    <Box
                        w={200}
                        p="sm"
                        style={{
                            backgroundColor: "var(--mantine-color-body)",
                            border: "1px solid var(--mantine-color-default-border)",
                            borderRadius: 8,
                        }}
                    >
                        <Popout>
                            <Group justify="space-between">
                                <Text size="xs">Settings</Text>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open without anchor"
                                    />
                                </Popout.Trigger>
                            </Group>
                            <Popout.Panel
                                width={180}
                                header={{ variant: "title", title: "Settings" }}
                                placement="left"
                                gap={8}
                            >
                                <Popout.Content>
                                    <Text size="sm" p="sm">
                                        Has gap and full borders
                                    </Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Box>
                </Box>

                {/* With Popout.Anchor */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        With Anchor
                    </Text>
                    <Popout.Anchor>
                        <Box
                            w={200}
                            p="sm"
                            style={{
                                backgroundColor: "var(--mantine-color-body)",
                                border: "1px solid var(--mantine-color-default-border)",
                                borderRadius: 8,
                            }}
                        >
                            <Popout>
                                <Group justify="space-between">
                                    <Text size="xs">Settings</Text>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="gear" size={12} />}
                                            aria-label="Open with anchor"
                                        />
                                    </Popout.Trigger>
                                </Group>
                                <Popout.Panel
                                    width={180}
                                    header={{ variant: "title", title: "Settings" }}
                                    placement="left"
                                >
                                    <Popout.Content>
                                        <Text size="sm" p="sm">
                                            Flush with container
                                        </Text>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Box>
                    </Popout.Anchor>
                </Box>
            </Group>
        );
    },
};
