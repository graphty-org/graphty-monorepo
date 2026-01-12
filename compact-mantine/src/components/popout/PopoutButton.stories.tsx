import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { ExternalLink, Palette, Settings, Sliders } from "lucide-react";

import { ControlGroup } from "../ControlGroup";
import { Popout } from "./Popout";
import { PopoutButton } from "./PopoutButton";
import { PopoutManager } from "./PopoutManager";

/**
 * A button component designed to be used as a Popout trigger.
 * Automatically highlights when the associated popout is open.
 *
 * **Purpose:** Provides visual feedback indicating whether a popout panel is currently open,
 * helping users understand the relationship between the trigger and its panel.
 *
 * **When to use:**
 * - As a trigger for Popout panels in sidebars and control groups
 * - When you need visual feedback for open/closed state
 * - In place of plain ActionIcon triggers for popouts
 *
 * **Key features:**
 * - Uses `subtle` variant when popout is closed (dimmed appearance)
 * - Uses `light` variant when popout is open (highlighted appearance)
 * - Must be used within a Popout component (inside Popout.Trigger)
 */
const meta: Meta<typeof PopoutButton> = {
    title: "Components/PopoutButton",
    component: PopoutButton,
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
type Story = StoryObj<typeof PopoutButton>;

/**
 * Basic usage showing the PopoutButton within a Popout.
 * Click the button to see it highlight when the panel opens.
 */
export const Default: Story = {
    render: function DefaultRender() {
        return (
            <Box p="xl">
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton
                            icon={<Settings size={14} />}
                            aria-label="Open settings"
                        />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={200}
                        header={{ variant: "title", title: "Settings" }}
                        placement="right"
                        gap={8}
                    >
                        <Popout.Content>
                            <Text size="sm">Panel content</Text>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Box>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Button should exist and be in subtle state initially
        const button = canvas.getByRole("button", { name: "Open settings" });
        await expect(button).toBeInTheDocument();
        await expect(button).toHaveAttribute("data-variant", "subtle");
        await expect(button).toHaveAttribute("aria-expanded", "false");

        // Click to open popout
        await userEvent.click(button);

        // Button should now be highlighted (light variant)
        await expect(button).toHaveAttribute("data-variant", "light");
        await expect(button).toHaveAttribute("aria-expanded", "true");

        // Panel should be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        // Close via Escape
        await userEvent.keyboard("{Escape}");

        // Button should return to subtle variant
        await expect(button).toHaveAttribute("data-variant", "subtle");
        await expect(button).toHaveAttribute("aria-expanded", "false");
    },
};

/**
 * Shows PopoutButton in a realistic sidebar context with a ControlGroup.
 * This is the typical usage pattern for settings panels.
 *
 * Uses `Popout.Anchor` to align the panel to the sidebar edge rather than just the button.
 */
export const InControlGroup: Story = {
    render: function InControlGroupRender() {
        return (
            <Popout.Anchor>
                <Box
                    w={240}
                    p="sm"
                    style={{
                        backgroundColor: "var(--mantine-color-body)",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 8,
                    }}
                >
                    <Popout>
                        <ControlGroup
                            label="Appearance"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<ExternalLink size={12} />}
                                        aria-label="Open appearance settings"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Click the button to open settings
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Appearance Settings" }}
                            placement="left"
                        >
                            <Popout.Content>
                                <Text size="sm">Appearance options would go here</Text>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </Box>
            </Popout.Anchor>
        );
    },
};

/**
 * Multiple PopoutButtons showing how each maintains its own highlight state.
 * Opening one popout closes the others (exclusive siblings behavior).
 *
 * Uses `Popout.Anchor` so all panels align to the sidebar edge with flush borders.
 */
export const MultipleButtons: Story = {
    render: function MultipleButtonsRender() {
        return (
            <Popout.Anchor>
                <Box
                    w={240}
                    p="sm"
                    style={{
                        backgroundColor: "var(--mantine-color-body)",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 8,
                    }}
                >
                    <Stack gap="xs">
                        <Popout>
                            <ControlGroup
                                label="Settings"
                                bleed
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Settings size={12} />}
                                            aria-label="Open settings"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    General settings
                                </Text>
                            </ControlGroup>
                            <Popout.Panel
                                width={200}
                                header={{ variant: "title", title: "Settings" }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <Text size="sm">Settings panel</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>

                        <Popout>
                            <ControlGroup
                                label="Appearance"
                                bleed
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Palette size={12} />}
                                            aria-label="Open appearance"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Colors and themes
                                </Text>
                            </ControlGroup>
                            <Popout.Panel
                                width={200}
                                header={{ variant: "title", title: "Appearance" }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <Text size="sm">Appearance panel</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>

                        <Popout>
                            <ControlGroup
                                label="Advanced"
                                bleed
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Sliders size={12} />}
                                            aria-label="Open advanced"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Advanced options
                                </Text>
                            </ControlGroup>
                            <Popout.Panel
                                width={200}
                                header={{ variant: "title", title: "Advanced" }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <Text size="sm">Advanced panel</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Stack>
                </Box>
            </Popout.Anchor>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // All buttons should start in subtle state
        const settingsBtn = canvas.getByRole("button", { name: "Open settings" });
        const appearanceBtn = canvas.getByRole("button", { name: "Open appearance" });
        const advancedBtn = canvas.getByRole("button", { name: "Open advanced" });

        await expect(settingsBtn).toHaveAttribute("data-variant", "subtle");
        await expect(appearanceBtn).toHaveAttribute("data-variant", "subtle");
        await expect(advancedBtn).toHaveAttribute("data-variant", "subtle");

        // Open settings - should highlight only settings button
        await userEvent.click(settingsBtn);
        await expect(settingsBtn).toHaveAttribute("data-variant", "light");
        await expect(appearanceBtn).toHaveAttribute("data-variant", "subtle");
        await expect(advancedBtn).toHaveAttribute("data-variant", "subtle");

        // Open appearance - should close settings and highlight appearance
        await userEvent.click(appearanceBtn);
        await expect(settingsBtn).toHaveAttribute("data-variant", "subtle");
        await expect(appearanceBtn).toHaveAttribute("data-variant", "light");
        await expect(advancedBtn).toHaveAttribute("data-variant", "subtle");

        // Open advanced - should close appearance and highlight advanced
        await userEvent.click(advancedBtn);
        await expect(settingsBtn).toHaveAttribute("data-variant", "subtle");
        await expect(appearanceBtn).toHaveAttribute("data-variant", "subtle");
        await expect(advancedBtn).toHaveAttribute("data-variant", "light");

        // Close via Escape
        await userEvent.keyboard("{Escape}");
        await expect(advancedBtn).toHaveAttribute("data-variant", "subtle");
    },
};

/**
 * Demonstrates the difference between using `Popout.Anchor` and not using it.
 *
 * **Without Anchor:** Panel appears next to the button trigger only.
 * **With Anchor:** Panel aligns to the container edge with a flush border appearance.
 */
export const WithAndWithoutAnchor: Story = {
    render: function WithAndWithoutAnchorRender() {
        return (
            <Stack gap="xl">
                {/* Without Popout.Anchor */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        Without Popout.Anchor
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                        Panel appears near button with gap
                    </Text>
                    <Box
                        w={240}
                        p="sm"
                        style={{
                            backgroundColor: "var(--mantine-color-body)",
                            border: "1px solid var(--mantine-color-default-border)",
                            borderRadius: 8,
                        }}
                    >
                        <Popout>
                            <ControlGroup
                                label="Settings"
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Settings size={12} />}
                                            aria-label="Open settings without anchor"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Panel will appear near button
                                </Text>
                            </ControlGroup>
                            <Popout.Panel
                                width={200}
                                header={{ variant: "title", title: "Settings" }}
                                placement="left"
                                gap={8}
                            >
                                <Popout.Content>
                                    <Text size="sm">Not anchored to sidebar</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Box>
                </Box>

                {/* With Popout.Anchor */}
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        With Popout.Anchor
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                        Panel aligns flush with container edge
                    </Text>
                    <Popout.Anchor>
                        <Box
                            w={240}
                            p="sm"
                            style={{
                                backgroundColor: "var(--mantine-color-body)",
                                border: "1px solid var(--mantine-color-default-border)",
                                borderRadius: 8,
                            }}
                        >
                            <Popout>
                                <ControlGroup
                                    label="Settings"
                                    actions={
                                        <Popout.Trigger>
                                            <PopoutButton
                                                icon={<Settings size={12} />}
                                                aria-label="Open settings with anchor"
                                            />
                                        </Popout.Trigger>
                                    }
                                >
                                    <Text size="xs" c="dimmed" p="sm">
                                        Panel aligns to sidebar
                                    </Text>
                                </ControlGroup>
                                <Popout.Panel
                                    width={200}
                                    header={{ variant: "title", title: "Settings" }}
                                    placement="left"
                                >
                                    <Popout.Content>
                                        <Text size="sm">Anchored to sidebar edge</Text>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Box>
                    </Popout.Anchor>
                </Box>
            </Stack>
        );
    },
};

