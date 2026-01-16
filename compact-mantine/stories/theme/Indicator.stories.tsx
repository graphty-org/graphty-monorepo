import { Avatar, Indicator } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Indicator> = {
    title: "Theme/Indicator",
    component: Indicator,
};

export default meta;
type Story = StoryObj<typeof Indicator>;

export const Default: Story = {
    render: () => (
        <Indicator color="red" inline>
            <Avatar src="https://i.pravatar.cc/100?u=stable-seed" alt="User avatar" />
        </Indicator>
    ),
};
