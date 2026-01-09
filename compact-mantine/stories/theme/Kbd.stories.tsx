import { Kbd } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Kbd> = {
    title: "Theme/Kbd",
    component: Kbd,
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
    args: {
        children: "Ctrl",
    },
};
