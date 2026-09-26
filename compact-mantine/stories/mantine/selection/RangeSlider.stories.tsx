import { Box, RangeSlider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `RangeSlider`, themed on the same small plain slider look as `Slider`: an 8px track,
 * a brand bar between the thumbs, and two 12px white thumbs. Every prop is Mantine's: see
 * [RangeSlider on mantine.dev](https://mantine.dev/core/slider/) (Slider and RangeSlider share one
 * page).
 *
 * ## Usage
 *
 * ```tsx
 * import { RangeSlider } from "@mantine/core";
 *
 * <RangeSlider value={range} onChange={setRange} minRange={10} thumbFromLabel="Minimum" thumbToLabel="Maximum" />
 * ```
 *
 * Each thumb is a `role="slider"` with its own name (`thumbFromLabel`, `thumbToLabel`). Arrow keys
 * step the focused thumb; keyboard focus draws a 1px ring on it.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Track | 8px, fully round |
 * | Thumbs | 12 x 12, 2px white border |
 * | Mark labels | 9/14 |
 */
const meta: Meta<typeof RangeSlider> = {
    title: "Themed Mantine/Selection/RangeSlider",
    component: RangeSlider,
    tags: ["autodocs"],
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

/** A range from 20 to 80; drag either thumb. */
export const Default: Story = {
    args: {
        defaultValue: [20, 80],
        thumbFromLabel: "Minimum",
        thumbToLabel: "Maximum",
    },
};

/** Rest, keyboard focus and disabled, light and dark side by side. Keyboard focus is on the marked thumb. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
    play: async (context) => {
        await focusMarked(context);
        await expectStatesApply(context.canvasElement);
    },
};

/** Labeled marks under the track. */
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

/** `minRange={10}` keeps the thumbs at least 10 apart. */
export const MinRange: Story = {
    args: {
        defaultValue: [40, 60],
        minRange: 10,
    },
};

/** `step={10}` moves each thumb in steps of 10. */
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
