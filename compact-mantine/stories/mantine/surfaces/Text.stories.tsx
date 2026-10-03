import { Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Text`, on Figma's type scale: Inter at weight 450, with `sm` (11/16) as the body
 * size of a panel. Every prop is Mantine's: see [Text on mantine.dev](https://mantine.dev/core/text/).
 * The whole scale, with weights and tracking, is on the Foundations/Typography page.
 *
 * ## Usage
 *
 * ```tsx
 * import { Text } from "@mantine/core";
 *
 * <Text size="sm">72 components</Text>
 * <Text size="sm" c="var(--cm-text-secondary)">Created in this file</Text>
 * ```
 *
 * ## Measurements
 *
 * | Size | Font / line height |
 * |---|---|
 * | `xs` | 9/14 (captions) |
 * | `sm` | 11/16 (the panel body) |
 * | `md` | 13/22 |
 * | `lg` | 15/25 |
 * | `xl` | 24/32 |
 */
const meta: Meta<typeof Text> = {
    title: "Themed Mantine/Surfaces/Text",
    component: Text,
    tags: ["autodocs"],
    args: {
        size: "sm",
    },
};

export default meta;
type Story = StoryObj<typeof Text>;

/** Body text at `sm`, 11/16; change `size`, `fw` or `c` in Controls. */
export const Default: Story = {
    args: {
        children: "The quick brown fox jumps over the lazy dog",
    },
};

/** Every size of the scale, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={4}>
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <Text key={size} size={size}>
                    {size}: The quick brown fox
                </Text>
            ))}
        </Stack>
    ),
};
