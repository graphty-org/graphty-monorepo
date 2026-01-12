import { NumberInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof NumberInput> = {
    title: "Theme/NumberInput",
    component: NumberInput,
};

export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter amount",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        defaultValue: 42,
        w: 150,
    },
};

export const WithControls: Story = {
    args: {
        defaultValue: 10,
        hideControls: false,
        w: 150,
    },
};

export const WithSuffix: Story = {
    args: {
        suffix: "%",
        defaultValue: 75,
        w: 150,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        disabled: true,
        w: 150,
    },
};
