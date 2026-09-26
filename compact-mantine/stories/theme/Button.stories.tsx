import { Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { PANEL_GRID, UiGlyph } from "../../src";

/**
 * Mantine's Button, themed to Figma's text buttons (design/figma-spec.md 4.1): 24 tall at the
 * default size, the label inset 8px, 11/16 weight 450, radius 5, no border. Variants: `filled`
 * (primary, the default), `default` (secondary: a 1px translucent edge), `subtle` (ghost), `light`,
 * and the new `danger`, `danger-outline`, `inverse` and `success`. `color="red"` on a filled
 * button is the danger button.
 */
const meta: Meta<typeof Button> = {
    title: "Compact Theme/Mantine Components/Button",
    component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

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
 * Every variant in every state, side by side. Hover, press and focus are forced with
 * `data-state`, since a pseudo class cannot be; switch the Theme toolbar for dark and the
 * Contrast toolbar for the WCAG AA token set.
 */
export const States: Story = {
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

/** The sections and sizes: a leading icon 4px from the edge, a shortcut, md (32 tall), full width. */
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

/** A primary button: click to activate (text buttons are not mouse-down controls); Tab to see the ring. */
export const Default: Story = {
    args: { children: "Button" },
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole("button", { name: "Button" });
        await userEvent.tab();
        await expect(button).toHaveFocus();
        await expect(getComputedStyle(button).outlineWidth).toBe("1px");
    },
};

export const Secondary: Story = { args: { children: "Cancel", variant: "default" } };

export const Ghost: Story = { args: { children: "Ghost", variant: "subtle" } };

export const Danger: Story = { args: { children: "Delete", variant: "danger" } };

export const Disabled: Story = { args: { children: "Disabled", disabled: true } };

export const Loading: Story = { args: { children: "Loading", loading: true } };

/** Non-primary colours keep Mantine's own derivation on the filled variant. */
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
