import { ActionIcon, Box, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Settings } from "lucide-react";

import { Popout } from "./Popout";
import { PopoutManager } from "./PopoutManager";

/**
 * A floating pop-out panel component that opens from a trigger element.
 *
 * **Purpose:** Provides a non-modal, draggable panel for displaying contextual
 * settings or information without blocking the rest of the UI.
 *
 * **When to use:**
 * - For property panels that need to float over the canvas
 * - For contextual settings that shouldn't block the main interface
 * - When users need to interact with both the panel and the underlying content
 *
 * **Key features:**
 * - Opens to the left of the trigger
 * - Non-modal (doesn't block interaction with background)
 * - Compound component API (Popout.Trigger, Popout.Panel, Popout.Content)
 */
const meta: Meta<typeof Popout> = {
    title: "Components/Popout",
    component: Popout,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box
                    style={{
                        width: "100%",
                        height: "100vh",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "flex-start",
                        padding: 100,
                        backgroundColor: "var(--mantine-color-body)",
                    }}
                >
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Popout>;

/**
 * Basic popout panel with a title header. Click the trigger to open,
 * click the close button (X) to close.
 */
export const Basic: Story = {
    render: () => (
        <Popout>
            <Popout.Trigger>
                <ActionIcon variant="subtle" aria-label="Open settings">
                    <Settings size={16} />
                </ActionIcon>
            </Popout.Trigger>
            <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                <Popout.Content>
                    <Text size="sm">Panel content goes here</Text>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Panel should not be visible initially
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Click the trigger to open
        await userEvent.click(canvas.getByLabelText("Open settings"));

        // Panel should now be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();
        await expect(canvas.getByText("Settings")).toBeVisible();
        await expect(canvas.getByText("Panel content goes here")).toBeVisible();

        // Click the close button
        await userEvent.click(canvas.getByLabelText("Close panel"));

        // Panel should be closed
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    },
};

/**
 * Panel on a similar gray background to stress-test visibility.
 * The xl shadow and border ensure the panel remains discernible.
 */
export const OnGrayBackground: Story = {
    decorators: [
        (Story) => (
            <Box
                style={{
                    width: "100%",
                    height: "100vh",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "flex-start",
                    padding: 100,
                    backgroundColor: "var(--mantine-color-gray-1)",
                }}
            >
                <Story />
            </Box>
        ),
    ],
    render: () => (
        <Popout>
            <Popout.Trigger>
                <ActionIcon variant="subtle" aria-label="Open settings">
                    <Settings size={16} />
                </ActionIcon>
            </Popout.Trigger>
            <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                <Popout.Content>
                    <Text size="sm">Panel is visible against gray background</Text>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Open the panel
        await userEvent.click(canvas.getByLabelText("Open settings"));

        // Panel should be visible with border and shadow
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();
    },
};

/**
 * Panel on a dark background to verify visibility in dark contexts.
 */
export const OnDarkBackground: Story = {
    decorators: [
        (Story) => (
            <Box
                style={{
                    width: "100%",
                    height: "100vh",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "flex-start",
                    padding: 100,
                    backgroundColor: "var(--mantine-color-dark-7)",
                }}
            >
                <Story />
            </Box>
        ),
    ],
    render: () => (
        <Popout>
            <Popout.Trigger>
                <ActionIcon variant="subtle" aria-label="Open settings">
                    <Settings size={16} />
                </ActionIcon>
            </Popout.Trigger>
            <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                <Popout.Content>
                    <Text size="sm">Panel is visible against dark background</Text>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Open the panel
        await userEvent.click(canvas.getByLabelText("Open settings"));

        // Panel should be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();
    },
};
