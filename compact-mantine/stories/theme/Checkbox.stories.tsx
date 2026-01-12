import { Checkbox } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Checkbox> = {
    title: "Theme/Checkbox",
    component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

export const Unchecked: Story = {
    args: {
        label: "Unchecked",
    },
};

export const Checked: Story = {
    args: {
        label: "Checked",
        defaultChecked: true,
    },
};

export const Disabled: Story = {
    args: {
        label: "Disabled",
        disabled: true,
    },
};

export const DisabledChecked: Story = {
    args: {
        label: "Disabled Checked",
        defaultChecked: true,
        disabled: true,
    },
};

export const Indeterminate: Story = {
    args: {
        label: "Indeterminate",
        indeterminate: true,
    },
};
