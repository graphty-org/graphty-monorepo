import { SegmentedControl } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof SegmentedControl> = {
    title: "Theme/SegmentedControl",
    component: SegmentedControl,
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {
    args: {
        data: ["Nap", "Eat", "Play"],
    },
};

export const ThreeOptions: Story = {
    args: {
        data: ["Nap", "Eat", "Zoom"],
        w: 200,
    },
};

export const FiveOptions: Story = {
    args: {
        data: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        w: 300,
    },
};

export const FullWidth: Story = {
    args: {
        data: ["Yes", "No", "Maybe"],
        fullWidth: true,
        w: 200,
    },
};

export const Disabled: Story = {
    args: {
        data: ["A", "B"],
        disabled: true,
        w: 100,
    },
};
