import { Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { PANEL_GRID, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Button`, themed as Figma's text buttons: 24px tall, radius 5, no border, and four
 * new variants. Every prop is Mantine's: see [Button on mantine.dev](https://mantine.dev/core/button/).
 *
 * | Variant | Figma look |
 * |---|---|
 * | `filled` (the default) | primary: the brand fill |
 * | `default` | secondary: transparent with a 1px translucent edge |
 * | `subtle` | ghost |
 * | `light` | the highlighted look (selected ground, brand text) |
 * | `danger`, `danger-outline`, `inverse`, `success` | new with this theme; `color="red"` on a filled button is also the danger button |
 *
 * For an icon-only button use `ActionIcon`; for a button with a default action and a menu of
 * others use `SplitButton` (Components/Actions).
 *
 * ## Usage
 *
 * ```tsx
 * import { Button } from "@mantine/core";
 *
 * <Button>Share</Button>
 * <Button variant="default">Cancel</Button>
 * <Button variant="danger">Delete</Button>
 * ```
 *
 * A native button: it activates on click, not on pointer-down. A disabled button is skipped by
 * Tab. Keyboard focus draws a 1px ring outside the button.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px (`sm`, the default); 32px (`md`) |
 * | Label | 11/16, weight 450, inset 8px (`md`: 12px) |
 * | Leading icon | a 24px slot, 4px from the edge |
 * | Radius | 5px |
 * | Full width in a panel | 208 x 24 (16px margins in a 240px panel) |
 */
const meta: Meta<typeof Button> = {
    title: "Themed Mantine/Actions/Button",
    component: Button,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

/**
 * A primary button; use Controls to change its variant, size, disabled or loading. The play
 * function tabs to it and checks the 1px focus ring.
 */
export const Default: Story = {
    args: { children: "Button", variant: "filled", size: "sm", disabled: false, loading: false },
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole("button", { name: "Button" });
        await userEvent.tab();
        await expect(button).toHaveFocus();
        await expect(getComputedStyle(button).outlineWidth).toBe("1px");
    },
};

const VARIANTS = [
    { name: "primary (filled)", props: {} },
    { name: "secondary (default)", props: { variant: "default" } },
    { name: "ghost (subtle)", props: { variant: "subtle" } },
    { name: "danger", props: { variant: "danger" } },
    { name: "danger-outline", props: { variant: "danger-outline" } },
    { name: "inverse", props: { variant: "inverse" } },
    { name: "success", props: { variant: "success" } },
    { name: "light", props: { variant: "light" } },
] as const;

const STATES = ["rest", "hover", "press", "focus"] as const;

/**
 * Every variant in every state (hover, press and focus forced with `data-state`, since a pseudo
 * class cannot be), then disabled and loading. Light and dark side by side; the Contrast toolbar
 * switches to the WCAG AA token set.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="xs" w={120} />
                {[...STATES, "disabled", "loading"].map((s) => (
                    <Text key={s} size="xs" w={72}>
                        {s}
                    </Text>
                ))}
            </Group>
            {VARIANTS.map(({ name, props }) => (
                <Group key={name} gap={8} wrap="nowrap">
                    <Text size="xs" w={120}>
                        {name}
                    </Text>
                    {STATES.map((state) => (
                        <Box key={state} w={72}>
                            <Button {...props} data-state={state === "rest" ? undefined : state}>
                                Button
                            </Button>
                        </Box>
                    ))}
                    <Box w={72}>
                        <Button {...props} disabled>
                            Button
                        </Button>
                    </Box>
                    <Box w={72}>
                        <Button {...props} loading>
                            Button
                        </Button>
                    </Box>
                </Group>
            ))}
        </Stack>
    ),
};

/** Sections and sizes: a leading icon 4px from the edge, a shortcut, `md` (32 tall) and full width in a panel. */
export const SectionsAndSizes: Story = {
    render: () => (
        <Stack gap={8} w={PANEL_GRID.WIDTH}>
            <Group gap={8}>
                <Button leftSection={<UiGlyph name="plus" />}>Create</Button>
                <Button variant="default" leftSection={<UiGlyph name="plus" />}>
                    Import
                </Button>
            </Group>
            <Group gap={8}>
                <Button rightSection="Ctrl+Enter">Button</Button>
                <Button variant="default" rightSection="Ctrl+Enter">
                    Button
                </Button>
            </Group>
            <Group gap={8}>
                <Button size="md">Share</Button>
                <Button size="md" variant="default">
                    Button
                </Button>
            </Group>
            <Box px={16}>
                <Button variant="default" fullWidth>
                    Show prototype settings
                </Button>
            </Box>
        </Stack>
    ),
};

/** A colour other than the primary keeps Mantine's own derivation on the filled variant. */
export const Colors: Story = {
    render: () => (
        <Group gap="xs">
            <Button>Brand</Button>
            <Button color="red">Red (danger)</Button>
            <Button color="green">Green</Button>
            <Button color="grape">Grape</Button>
        </Group>
    ),
};
