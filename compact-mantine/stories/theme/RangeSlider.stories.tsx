import { Box, RangeSlider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof RangeSlider> = {
    title: "Compact Theme/Mantine Components/RangeSlider",
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

/**
 * The plain range slider on the small slider's look (design/figma-spec.md 5.8). The play
 * function focuses the marked thumb.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            columns={220}
            cells={[
                ["rest", <RangeSlider defaultValue={[20, 70]} />],
                ["focus", <div data-story-focus><RangeSlider defaultValue={[30, 80]} /></div>],
                ["disabled", <RangeSlider defaultValue={[20, 70]} disabled />],
            ]}
        />
    ),
    play: focusMarked,
};
