import { Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Text> = {
    title: "Compact Theme/Mantine Components/Text",
    component: Text,
    args: {
        size: "sm", // sm is 11px in compact theme
    },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
    args: {
        children: "The quick brown fox jumps over the lazy dog",
    },
};

/** The type scale: 9/14, 11/16, 13/22, 15/25, 24/32. */
export const States: Story = {
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
