import { ActionIcon, Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { ChevronRight, MoreHorizontal,Settings } from "lucide-react";

import { ControlGroup } from "../ControlGroup";
import { Popout } from "./Popout";
import { PopoutAnchor } from "./PopoutAnchor";
import { PopoutButton } from "./PopoutButton";
import { PopoutManager } from "./PopoutManager";

/**
 * `Popout.Anchor` provides an anchor element for descendant Popout panels to align to.
 *
 * **Purpose:** When you want popout panels to align to a container (like a sidebar)
 * rather than just appearing next to the trigger button, wrap the container with
 * `Popout.Anchor`.
 *
 * **Key behaviors:**
 * - Panel aligns to the anchor element's edge based on `placement`
 * - Panel border is removed on the side that touches the anchor (flush appearance)
 * - Border radius is flattened on the snapping side
 * - Multiple popouts inside the same anchor all align to that anchor
 *
 * **When to use:**
 * - Sidebars with multiple popout triggers
 * - Control panels where popouts should extend from the panel edge
 * - Any container where you want consistent popout alignment
 */
const meta: Meta<typeof PopoutAnchor> = {
    title: "Components/PopoutAnchor",
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
 * Anchor to a sidebar/panel container.
 *
 * This is the most common use case: a sidebar with multiple controls that can
 * open popout panels. The panels align flush with the sidebar edge.
 *
 * Notice how the panel:
 * - Aligns to the left edge of the sidebar (not just the button)
 * - Has no border on the right side (flush with sidebar)
 * - Has flattened corners on the snapping side
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
                                            icon={<Settings size={12} />}
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
                                            Panel aligns flush with the sidebar edge.
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Notice the seamless border connection.
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
                                            icon={<ChevronRight size={12} />}
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
                            rightSection={<ChevronRight size={14} />}
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
                                        <MoreHorizontal size={18} />
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
 * This story shows the visual difference between using `Popout.Anchor` and not.
 *
 * **Without anchor:** Panel appears near the trigger with a gap and full borders.
 * **With anchor:** Panel aligns flush with the container, creating a seamless appearance.
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
                                        icon={<Settings size={12} />}
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
                                            icon={<Settings size={12} />}
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
