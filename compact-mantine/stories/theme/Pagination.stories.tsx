import { Pagination } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Pagination> = {
    title: "Theme/Pagination",
    component: Pagination,
    args: {
        total: 10,
    },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    args: {
        defaultValue: 1,
    },
};
