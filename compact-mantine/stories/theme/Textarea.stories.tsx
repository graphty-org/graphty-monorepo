import { Textarea } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Textarea> = {
    title: "Theme/Textarea",
    component: Textarea,
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
    args: {
        placeholder: "Write your thoughts...",
        rows: 2,
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "Write here",
        w: 250,
        rows: 2,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "With value",
        w: 250,
        rows: 2,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        disabled: true,
        w: 250,
        rows: 2,
    },
};
