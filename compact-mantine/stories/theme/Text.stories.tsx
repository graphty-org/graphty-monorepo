import { Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Text> = {
    title: "Theme/Text",
    component: Text,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
    args: {
        children: "The quick brown fox jumps over the lazy dog",
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="xs">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Text size="compact">The quick brown fox jumps over the lazy dog (11px)</Text>
            </Group>
            <Group>
                <Text size="xs" style={{ width: 80 }}>
                    xs:
                </Text>
                <Text size="xs">The quick brown fox jumps over the lazy dog (12px)</Text>
            </Group>
            <Group>
                <Text size="sm" style={{ width: 80 }}>
                    sm:
                </Text>
                <Text size="sm">The quick brown fox jumps over the lazy dog (14px)</Text>
            </Group>
        </Stack>
    ),
};
