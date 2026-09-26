import { ActionIcon, Box, Button, Checkbox, Menu, Stack, Switch, Text, TextInput, Tooltip } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { PANEL_INK, UiGlyph } from "../../src";
import { expectStatesApply } from "../helpers/assert-states";
import { StateGrid } from "../helpers/input-states";
import { BOTH_SCHEMES } from "../helpers/schemes";

/**
 * How the theme shows keyboard focus, and what moves.
 *
 * ## Focus
 *
 * The ring is Figma's: **1px of `--cm-border-selected`** (#0d99ff in light, #0c8ce9 in dark),
 * shown on **keyboard focus only**, so a dense surface stays quiet under the mouse. Number and
 * text fields are the exception and ring on any focus, because a caret alone is easy to lose.
 *
 * - **Inside a field**: the ring replaces the field's hover edge, inset 1px, so focusing never
 *   changes the field's size.
 * - **Outside a button**: 1px out from the button's edge, so it never covers the label.
 * - Mantine's own ring is switched off (`focusRing: "never"`); a consumer's `focusRing` setting
 *   no longer affects these components.
 *
 * A resting outline reserves the ring's slot, so focus never shifts layout.
 *
 * ## Motion
 *
 * | What | Timing |
 * |---|---|
 * | Small state changes: a checkbox tick, a switch knob, a hover color | 100ms (`--cm-duration-sm`) |
 * | Menus, popovers, list boxes, tooltips and modals | open and close in one frame, no fade |
 * | A tooltip, cold | opens after 1000ms |
 * | A tooltip, warm | the next one opens at once while one shows, or within 300ms after it hides |
 * | A tooltip, dismissed | hides at once on a pointer-down, a key, the wheel, or the pointer leaving the window |
 *
 * The warm hand-off needs one Mantine `Tooltip.Group` around the app; the theme gives it the
 * delays, so it takes no props.
 */
const meta: Meta = {
    title: "Foundations/Focus and motion",
    parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj;

/**
 * The focus ring on a field (inside) and a button and an icon button (outside), forced with
 * `data-state="focus"` since a story cannot hold real keyboard focus in two places.
 */
export const FocusRing: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "field", node: <TextInput aria-label="Field at rest" defaultValue="Frame 1" w={88} /> },
                {
                    state: "field, focus",
                    node: <TextInput aria-label="Focused field" defaultValue="Frame 1" w={88} data-state="focus" />,
                },
                { state: "button", node: <Button>Export</Button> },
                { state: "button, focus", node: <Button data-state="focus">Export</Button> },
                {
                    state: "icon, focus",
                    node: (
                        <ActionIcon variant="subtle" aria-label="Settings" data-state="focus">
                            <UiGlyph name="settings" />
                        </ActionIcon>
                    ),
                },
            ]}
        />
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/**
 * Real keyboard focus: Tab from the field to the button, and the ring follows.
 * Click with the mouse and no ring is drawn on the button.
 */
export const KeyboardOnly: Story = {
    render: () => (
        <Box style={{ display: "flex", gap: 8 }}>
            <TextInput aria-label="Name" defaultValue="Frame 1" w={88} />
            <Button>Rename</Button>
        </Box>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("textbox", { name: "Name" }));
        await userEvent.tab();
        await expect(canvas.getByRole("button", { name: "Rename" })).toHaveFocus();
    },
};

/**
 * What moves, live. The checkbox and the switch animate for 100ms; the menu and the tooltip
 * appear in one frame (the tooltip after its 1000ms cold delay).
 */
export const Motion: Story = {
    render: () => (
        <Stack gap={12} align="flex-start">
            <Box style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Checkbox label="Tick" defaultChecked />
                <Switch label="Knob" defaultChecked />
            </Box>
            <Box style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Menu>
                    <Menu.Target>
                        <Button variant="default">Open a menu</Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item>Copy</Menu.Item>
                        <Menu.Item>Paste</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
                <Tooltip.Group>
                    <Tooltip label="First tooltip: 1000ms">
                        <Button variant="default">Hover me</Button>
                    </Tooltip>
                    <Tooltip label="Warm: opens at once">
                        <Button variant="default">Then me</Button>
                    </Tooltip>
                </Tooltip.Group>
            </Box>
            <Text size="xs" c={PANEL_INK.CHROME}>
                Hover the first button, wait, then move to the second.
            </Text>
        </Stack>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const doc = canvasElement.ownerDocument;
        const duration = (selector: string): string =>
            getComputedStyle(canvasElement.querySelector(selector) as Element).transitionDuration;
        // The checkbox and the switch move for 100ms (0s when the reader asks for reduced motion).
        const moving = doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ? "0s" : "0.1s";
        await expect(duration(".mantine-Checkbox-input")).toBe(moving);
        await expect(duration(".mantine-Switch-thumb")).toBe(moving);
        // The menu is drawn in full the moment it opens.
        await userEvent.click(canvas.getByRole("button", { name: "Open a menu" }));
        const menu = await within(doc.body).findByRole("menu");
        await expect(getComputedStyle(menu).opacity).toBe("1");
        await expect(getComputedStyle(menu).transitionDuration).toBe("0s");
        await userEvent.keyboard("{Escape}");
        // The tooltip waits out its cold delay before it opens.
        await userEvent.hover(canvas.getByRole("button", { name: "Hover me" }));
        await new Promise((resolve) => setTimeout(resolve, 500));
        await expect(within(doc.body).queryByRole("tooltip")).toBeNull();
        await expect(await within(doc.body).findByRole("tooltip", {}, { timeout: 2000 })).toBeVisible();
        await userEvent.unhover(canvas.getByRole("button", { name: "Hover me" }));
    },
};
