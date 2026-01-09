import { ThemeIcon } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Home } from "lucide-react";

const meta: Meta<typeof ThemeIcon> = {
    title: "Theme/ThemeIcon",
    component: ThemeIcon,
};

export default meta;
type Story = StoryObj<typeof ThemeIcon>;

export const Default: Story = {
    args: {
        children: <Home size={14} />,
        color: "blue",
    },
};
