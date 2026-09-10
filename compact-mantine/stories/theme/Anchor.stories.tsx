import { Anchor } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Anchor> = {
    title: "Compact Theme/Mantine Components/Anchor",
    component: Anchor,
};

export default meta;
type Story = StoryObj<typeof Anchor>;

export const Default: Story = {
    args: {
        children: "Documentation",
        href: "#",
    },
};
