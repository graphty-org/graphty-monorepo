import { Group, Loader, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Loader> = {
    title: "Compact Theme/Mantine Components/Loader",
    component: Loader,
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Default: Story = {
    args: {},
};

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

/**
 * Figma's spinner (design/figma-spec.md 8.8): 16px by default, drawn in --cm-icon, so it reads
 * in both themes; every size of the ramp for comparison, and a colour override.
 */
export const States: Story = {
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
