import { TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof TextInput> = {
    title: "Theme/TextInput",
    component: TextInput,
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter your pet's name",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "Type here",
        w: 200,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "With value",
        w: 200,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        disabled: true,
        w: 200,
    },
};

export const WithError: Story = {
    args: {
        placeholder: "Error",
        error: "Oops",
        w: 200,
    },
};
