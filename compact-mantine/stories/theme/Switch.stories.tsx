import { Switch } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Switch> = {
    title: "Theme/Switch",
    component: Switch,
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

export const Off: Story = {
    args: {
        label: "Off",
    },
};

export const On: Story = {
    args: {
        label: "On",
        defaultChecked: true,
    },
};

export const DisabledOff: Story = {
    args: {
        label: "Disabled Off",
        disabled: true,
    },
};

export const DisabledOn: Story = {
    args: {
        label: "Disabled On",
        defaultChecked: true,
        disabled: true,
    },
};
