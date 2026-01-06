import { Box, RangeSlider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof RangeSlider> = {
    title: "Theme/RangeSlider",
    component: RangeSlider,
    args: {
        size: "compact",
    },
    decorators: [
        (Story) => (
            <Box w={300} p="md">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof RangeSlider>;

export const Default: Story = {
    args: {
        defaultValue: [20, 80],
    },
};

export const WithMarks: Story = {
    args: {
        defaultValue: [25, 75],
        marks: [
            { value: 0, label: "Cold" },
            { value: 50, label: "Warm" },
            { value: 100, label: "Hot" },
        ],
    },
};

export const Disabled: Story = {
    args: {
        defaultValue: [30, 70],
        disabled: true,
    },
};

export const MinRange: Story = {
    args: {
        defaultValue: [40, 60],
        minRange: 10,
    },
};

export const CustomStep: Story = {
    args: {
        defaultValue: [20, 80],
        step: 10,
        marks: [
            { value: 0, label: "0" },
            { value: 50, label: "50" },
            { value: 100, label: "100" },
        ],
    },
};
