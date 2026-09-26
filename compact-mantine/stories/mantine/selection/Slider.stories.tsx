import { Box, Slider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Slider`, themed as Figma's small plain slider: an 8px track, a brand bar and a 12px
 * white thumb. Every prop is Mantine's: see [Slider on mantine.dev](https://mantine.dev/core/slider/).
 *
 * For a pair of values use `RangeSlider`. For a number the reader types or scrubs in a panel row,
 * use `PanelField kind="number"` (Components/Inputs). Colour sliders (hue, alpha) are part of
 * `ColorPickerPanel` (Components/Colour).
 *
 * ## Usage
 *
 * ```tsx
 * import { Slider } from "@mantine/core";
 *
 * <Slider aria-label="Opacity" value={opacity} onChange={setOpacity} />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The thumb is a `role="slider"`: arrow keys step, Page Up / Page Down take bigger steps,
 *   Home / End go to the ends. The pointer jumps the thumb on pointer-down.
 * - Name it with `aria-label` or `thumbLabel`. Keyboard focus draws a 1px ring on the thumb.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Track | 8px, fully round, `--cm-bg-secondary` with a 1px inset edge |
 * | Thumb | 12 x 12, 2px white border |
 * | Mark labels | 9/14 |
 */
const meta: Meta<typeof Slider> = {
    title: "Themed Mantine/Selection/Slider",
    component: Slider,
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
type Story = StoryObj<typeof Slider>;

/** A slider at 40; drag it or use the arrow keys. */
export const Default: Story = {
    args: {
        defaultValue: 40,
        "aria-label": "Amount",
    },
};

/** Rest, keyboard focus, with marks, and disabled, light and dark side by side. Keyboard focus is on the marked thumb. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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

/** Labelled marks under the track. */
export const WithMarks: Story = {
    args: {
        defaultValue: 50,
        marks: [
            { value: 0, label: "0%" },
            { value: 50, label: "50%" },
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

/** `step={25}` snaps the thumb to the marks. */
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
