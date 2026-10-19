import { Group, Loader, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Loader`, themed as Figma's spinner: 16px by default and drawn in the icon color, so
 * it reads on either scheme. Every prop is Mantine's: see
 * [Loader on mantine.dev](https://mantine.dev/core/loader/).
 *
 * Inside a button, pass `loading` to the Button or ActionIcon instead; it keeps the button's
 * width.
 *
 * ## Usage
 *
 * ```tsx
 * import { Loader } from "@mantine/core";
 *
 * <Loader />
 * ```
 *
 * The spinner is drawn only and has no role, so announce the wait in text as well, for example
 * in a `role="status"` region.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Size | 16px (`sm`, the default) |
 * | Color | `--cm-icon` |
 */
const meta: Meta<typeof Loader> = {
    title: "Themed Mantine/Feedback/Loader",
    component: Loader,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Loader>;

/** The default 16px spinner; change `size` or `type` in Controls. */
export const Default: Story = {
    args: {},
};

/** Every size of the ramp, then a color override, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={12}>
            <Group gap={16} align="center">
                {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                    <Stack key={size} gap={4} align="center">
                        <Loader size={size} />
                        <Text size="xs" c="dimmed">
                            {size}
                            {size === "sm" ? " (default)" : ""}
                        </Text>
                    </Stack>
                ))}
            </Group>
            <Group gap={16}>
                <Loader color="brand" />
            </Group>
        </Stack>
    ),
};

/** A color other than the default keeps Mantine's own palette. */
export const Colors: Story = {
    render: () => (
        <Group gap="md">
            <Loader color="blue" />
            <Loader color="green" />
            <Loader color="red" />
            <Loader color="orange" />
            <Loader color="violet" />
        </Group>
    ),
};
