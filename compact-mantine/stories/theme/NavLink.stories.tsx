import { NavLink } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Home } from "lucide-react";

const meta: Meta<typeof NavLink> = {
    title: "Theme/NavLink",
    component: NavLink,
};

export default meta;
type Story = StoryObj<typeof NavLink>;

export const Default: Story = {
    args: {
        label: "Home",
        leftSection: <Home size={14} />,
    },
};
