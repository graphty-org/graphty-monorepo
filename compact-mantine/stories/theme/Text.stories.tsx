import { Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Text> = {
    title: "Theme/Text",
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
