import { PasswordInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof PasswordInput> = {
    title: "Theme/PasswordInput",
    component: PasswordInput,
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter secret code",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "••••",
        w: 200,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "secret",
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
