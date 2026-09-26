import { Badge, Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Badge`, themed as Figma's small label ("Beta"): 16px tall with a 1px outline by
 * default, plus `filled` (brand) and `light` (selected ground). Every prop is Mantine's: see
 * [Badge on mantine.dev](https://mantine.dev/core/badge/).
 *
 * For a count or an alert dot on an icon, use `Indicator`.
 *
 * ## Usage
 *
 * ```tsx
 * import { Badge } from "@mantine/core";
 *
 * <Badge>Beta</Badge>
 * <Badge variant="filled">New</Badge>
 * ```
 *
 * A plain `<div>` with text: it is read as part of the surrounding content, so put it next to
 * the thing it labels (a menu item's `rightSection`, a heading).
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 16px, padding 0 4px, radius 5px |
 * | Default | transparent, 1px `--cm-border` outline inside, 11/16 `--cm-text` |
 * | In a dark menu | outline #383838, menu secondary text |
 */
const meta: Meta<typeof Badge> = {
    title: "Themed Mantine/Feedback/Badge",
    component: Badge,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Badge>;

/** The default outlined badge; use Controls to change its `variant`. */
export const Default: Story = {
    args: {
        children: "Beta",
    },
};

/**
 * Every look: outline (the default), filled, light and dot, then the outline inside a dark menu.
 * Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={12}>
            <Group gap={8}>
                <Badge>Beta</Badge>
                <Badge variant="filled">New</Badge>
                <Badge variant="light">Pro</Badge>
                <Badge variant="dot">Live</Badge>
                <Text size="xs">outline (default) / filled / light / dot</Text>
            </Group>
            <Menu opened withinPortal={false} position="bottom-start">
                <Menu.Target>
                    <span />
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item rightSection={<Badge>Beta</Badge>}>Motion</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Stack>
    ),
};

/** A colour other than the primary keeps Mantine's own derivation, filled and light. */
export const Colors: Story = {
    render: () => (
        <Stack gap={8}>
            {(["filled", "light"] as const).map((variant) => (
                <Group key={variant} gap="xs">
                    {["blue", "green", "red", "orange", "grape"].map((color) => (
                        <Badge key={color} variant={variant} color={color}>
                            {color}
                        </Badge>
                    ))}
                </Group>
            ))}
        </Stack>
    ),
};
