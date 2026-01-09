import { Burger } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Burger> = {
    title: "Theme/Burger",
    component: Burger,
};

export default meta;
type Story = StoryObj<typeof Burger>;

export const Default: Story = {
    args: {
        opened: false,
        "aria-label": "Toggle navigation",
    },
};
