import { Avatar } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Avatar> = {
    title: "Compact Theme/Mantine Components/Avatar",
    component: Avatar,
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
    args: {
        children: "AB",
        color: "blue",
    },
};
