import { Box, Slider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Slider> = {
    title: "Theme/Slider",
    component: Slider,
    decorators: [
        (Story) => (
            <Box w={300} p="md">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
    args: {
        defaultValue: 40,
    },
};

export const Disabled: Story = {
    args: {
        defaultValue: 60,
        disabled: true,
    },
};

export const WithMarks: Story = {
    args: {
        defaultValue: 50,
        marks: [
            { value: 0, label: "Sleepy" },
            { value: 50, label: "Awake" },
            { value: 100, label: "Zoomies" },
        ],
    },
    decorators: [
        (Story) => (
            <Box mb="lg">
                <Story />
            </Box>
        ),
    ],
};

export const WithSteps: Story = {
    args: {
        defaultValue: 25,
        min: 0,
        max: 100,
        step: 25,
        marks: [
            { value: 0, label: "0%" },
            { value: 25, label: "25%" },
            { value: 50, label: "50%" },
            { value: 75, label: "75%" },
            { value: 100, label: "100%" },
        ],
    },
    decorators: [
        (Story) => (
            <Box mb="lg">
                <Story />
            </Box>
        ),
    ],
};
