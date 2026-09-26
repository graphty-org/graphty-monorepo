import { Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { HelpButton } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * The floating help button: a round question mark in a corner of the canvas that opens a menu of
 * help links you supply.
 *
 * ## When to use it
 *
 * Reach for `HelpButton` for the one always-there way into help, docs and keyboard shortcuts
 * from an editor canvas. Reach for `InfoCircle` to explain one control in place, and for a
 * Mantine `ActionIcon` with a `Menu` for any other menu button (the help button is round,
 * raised and never changes on hover, which suits only this job).
 *
 * ## Usage
 *
 * ```tsx
 * import { Menu } from "@mantine/core";
 * import { HelpButton } from "@graphty/compact-mantine";
 *
 * <HelpButton>
 *     <Menu.Item component="a" href="/docs">Help page</Menu.Item>
 *     <Menu.Item onClick={openShortcutSheet}>Keyboard shortcuts</Menu.Item>
 *     <Menu.Divider />
 *     <Menu.Item>Release notes</Menu.Item>
 * </HelpButton>
 * ```
 *
 * The children are the menu's items; without any, the button opens nothing (give it an
 * `onClick`). `menuProps` passes through to Mantine's `Menu`, for example to control `opened`.
 * The caller positions the button.
 *
 * ## Keyboard and accessibility
 *
 * - A single button named "Help" by default (`label` renames it; the tooltip shows the same
 *   text and appears at once, without the usual delay).
 * - Enter, Space or a click opens the menu 4px above, end-aligned; the arrows move through its
 *   items and Escape closes it, returning focus to the button (Mantine's `Menu`).
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Button | 32 x 32 circle, `--cm-bg`, elevation 200, no hover change |
 * | Focus ring | 1px at -2px, fading in over 200ms |
 * | Menu | the dark menu, 4px above, end-aligned |
 */
const meta: Meta<typeof HelpButton> = {
    title: "Components/App shell/HelpButton",
    component: HelpButton,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HelpButton>;

/** The help button in the bottom corner of a frame; its menu opens above it. */
export const Default: Story = {
    args: { label: "Help" },
    render: (args) => (
        <div style={{ paddingTop: 160, display: "flex", justifyContent: "flex-end", width: 320 }}>
            <HelpButton {...args}>
                <Menu.Item>Help page</Menu.Item>
                <Menu.Item>Keyboard shortcuts</Menu.Item>
                <Menu.Divider />
                <Menu.Item>Release notes</Menu.Item>
            </HelpButton>
        </div>
    ),
};

/** Rest and keyboard focus (hover and press do not change it). */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={24}>
            {(["rest", "focus"] as const).map((state) => (
                <Stack key={state} gap={4} align="center">
                    <HelpButton data-state={state} />
                    <Text size="xs">{state}</Text>
                </Stack>
            ))}
        </Group>
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/** A click opens the caller's menu above the button. */
export const MenuOpen: Story = {
    ...Default,
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole("button", { name: "Help" });
        await userEvent.click(button);
        const id = button.getAttribute("aria-controls") ?? "";
        await waitFor(() => expect(document.getElementById(id)).toBeVisible());
        const menu = document.getElementById(id) as HTMLElement;
        await expect(within(menu).getByRole("menuitem", { name: "Keyboard shortcuts" })).toBeVisible();
    },
};
