import { CloseButton } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof CloseButton> = {
    title: "Theme/CloseButton",
    component: CloseButton,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof CloseButton>;

export const Default: Story = {
    args: {},
};

export const Disabled: Story = {
    args: {
        disabled: true,
    },
};

export const Subtle: Story = {
    args: {
        variant: "subtle",
    },
};

export const Transparent: Story = {
    args: {
        variant: "transparent",
    },
};

export const Filled: Story = {
    args: {
        variant: "filled",
    },
};

export const Light: Story = {
    args: {
        variant: "light",
    },
};

export const Outline: Story = {
    args: {
        variant: "outline",
    },
};
