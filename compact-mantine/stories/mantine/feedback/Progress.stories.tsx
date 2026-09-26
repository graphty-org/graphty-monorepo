import { Box, Progress, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Progress`, themed as Figma's progress bar: a 4px round track with a brand fill.
 * Every prop is Mantine's: see [Progress on mantine.dev](https://mantine.dev/core/progress/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Progress } from "@mantine/core";
 *
 * <Progress value={percent} aria-label="Layout progress" />
 * ```
 *
 * A `role="progressbar"` with `aria-valuenow`; name it with `aria-label`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Track | 4px, fully round, `--cm-bg-secondary` |
 * | Fill | `--cm-bg-brand` |
 */
const meta: Meta<typeof Progress> = {
    title: "Themed Mantine/Feedback/Progress",
    component: Progress,
    tags: ["autodocs"],
    args: {
        value: 65,
    },
};

export default meta;
type Story = StoryObj<typeof Progress>;

/** A bar at 65%; change `value` in Controls. */
export const Default: Story = {
    args: { "aria-label": "Progress", w: 240 },
};

/** Empty, part and full, then a caller colour, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={12} w={240}>
            {[0, 40, 100].map((value) => (
                <Box key={value}>
                    <Text size="xs" c="dimmed">
                        {value}%
                    </Text>
                    <Progress value={value} aria-label={`${value} percent`} />
                </Box>
            ))}
            <Box>
                <Text size="xs" c="dimmed">
                    color="red"
                </Text>
                <Progress value={60} color="red" aria-label="60 percent, red" />
            </Box>
        </Stack>
    ),
};

/** Mantine's colours, `striped` and `animated`. */
export const Variants: Story = {
    render: () => (
        <Stack gap="sm">
            <Progress value={75} color="blue" />
            <Progress value={50} color="green" />
            <Progress value={25} color="red" />
            <Progress value={100} color="teal" striped />
            <Progress value={60} color="orange" animated />
        </Stack>
    ),
};

/** `Progress.Root` with several `Progress.Section`s, at the default and `sm` sizes. */
export const Sections: Story = {
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="sm" mb={4}>
                    Default multi-section:
                </Text>
                <Progress.Root>
                    <Progress.Section value={35} color="blue" />
                    <Progress.Section value={25} color="green" />
                    <Progress.Section value={15} color="orange" />
                </Progress.Root>
            </Box>
            <Box>
                <Text size="sm" mb={4}>
                    Small multi-section:
                </Text>
                <Progress.Root size="sm">
                    <Progress.Section value={35} color="blue" />
                    <Progress.Section value={25} color="green" />
                    <Progress.Section value={15} color="orange" />
                </Progress.Root>
            </Box>
        </Stack>
    ),
};
