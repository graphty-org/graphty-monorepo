import { Group, Kbd, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Kbd`, themed as the key caps of Figma's keyboard shortcuts sheet: dark in both
 * schemes, with a lit look (`mod={{ active: true }}`) and a light `variant="inline"` for prose.
 * Every prop is Mantine's: see [Kbd on mantine.dev](https://mantine.dev/core/kbd/).
 *
 * For a shortcut shown inside a tooltip use `TooltipShortcut`; for the whole sheet of shortcuts,
 * `ShortcutSheet` (both in Components).
 *
 * ## Usage
 *
 * ```tsx
 * import { Kbd, Text } from "@mantine/core";
 *
 * <Text size="sm">Press <Kbd variant="inline">Ctrl</Kbd> <Kbd variant="inline">K</Kbd> to search.</Text>
 * ```
 *
 * A native `<kbd>` element, so a screen reader reads the key name as text.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Cap | #1e1e1e with a 1px #ffffffb2 border, radius 2px, 14/24 text; caps 3px apart |
 * | Lit | #80caff ground and border, #1e1e1e text |
 * | Inline | 11/16, 1px `--cm-border`, radius 2px, padding 0 4px |
 */
const meta: Meta<typeof Kbd> = {
    title: "Themed Mantine/Feedback/Kbd",
    component: Kbd,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Kbd>;

/** One key cap; change `size` or `variant` in Controls. */
export const Default: Story = {
    args: {
        children: "Ctrl",
    },
};

/** The list cap (`sm`), the essential cap (`md`), the lit cap, and the light inline cap in prose. Light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={12}>
            <Group gap={3}>
                <Kbd>Shift</Kbd>
                <Kbd>L</Kbd>
            </Group>
            <Group gap={3}>
                <Kbd size="md">Ctrl</Kbd>
                <Kbd size="md">\</Kbd>
            </Group>
            <Group gap={3}>
                <Kbd size="md" mod={{ active: true }}>
                    Ctrl
                </Kbd>
                <Kbd size="md" mod={{ active: true }}>
                    K
                </Kbd>
            </Group>
            <Text size="sm">
                Press <Kbd variant="inline">Ctrl</Kbd> <Kbd variant="inline">K</Kbd> to search.
            </Text>
        </Stack>
    ),
};
