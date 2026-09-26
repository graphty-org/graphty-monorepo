import { Box, Slider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Slider> = {
    title: "Compact Theme/Mantine Components/Slider",
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

/**
 * The plain slider, Figma's small variant (design/figma-spec.md 5.8): an 8px track on
 * --cm-bg-secondary with a 1px inset edge, a brand bar and a 12px white thumb. The play
 * function focuses the marked thumb so its ring shows.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            columns={220}
            cells={[
                ["rest", <Slider defaultValue={40} />],
                ["focus", <div data-story-focus><Slider defaultValue={60} /></div>],
                ["with marks", <Slider defaultValue={50} marks={[{ value: 0, label: "0" }, { value: 50, label: "50" }, { value: 100, label: "100" }]} />],
                ["disabled", <Slider defaultValue={40} disabled />],
            ]}
        />
    ),
    play: focusMarked,
};
