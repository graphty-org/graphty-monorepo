import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StyleSelect } from "../src";

/**
 * A select dropdown that visually distinguishes between default and explicit values.
 *
 * **Purpose:** Allows users to choose from predefined options while clearly indicating
 * whether the current selection is a default or an explicitly-set override. Includes
 * a reset button to revert to the default.
 *
 * **When to use:**
 * - For categorical properties that have sensible defaults
 * - When users should see that they've customized a selection
 * - In style editors where "reset to default" is useful
 * - For settings like font family, alignment, or blend mode
 *
 * **Key features:**
 * - Italic/dimmed styling when using default value
 * - Normal styling when value is explicitly set
 * - Reset button (×) appears only for non-default values
 * - Controlled and uncontrolled modes
 */
const meta: Meta<typeof StyleSelect> = {
    title: "Components/StyleSelect",
    component: StyleSelect,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={280} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof StyleSelect>;

const moodOptions = [
    { value: "sleepy", label: "Sleepy" },
    { value: "hungry", label: "Hungry" },
    { value: "chaotic", label: "Chaotic" },
    { value: "judging", label: "Silently Judging" },
];

/**
 * Select dropdown showing default value (italic styling).
 * Change the selection to see normal styling and the reset button appear.
 */
export const Default: Story = {
    args: {
        label: "Current Mood",
        defaultValue: "sleepy",
        options: moodOptions,
    },
};
