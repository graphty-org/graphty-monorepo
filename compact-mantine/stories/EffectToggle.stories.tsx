import { Box, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { CompactColorInput, EffectToggle, StyleNumberInput } from "../src";

/**
 * A checkbox toggle that conditionally shows child controls when enabled.
 *
 * **Purpose:** Provides an enable/disable pattern for optional features that have
 * their own configuration options. Child controls only appear when the toggle is checked.
 *
 * **When to use:**
 * - For optional effects like glow, shadow, outline, or animation
 * - When enabling a feature reveals additional configuration options
 * - To reduce visual clutter by hiding irrelevant controls
 * - For boolean settings that have dependent sub-options
 *
 * **Key features:**
 * - Checkbox controls visibility of child content
 * - Indented child area for visual hierarchy
 * - Supports controlled and uncontrolled modes
 * - Clean show/hide animation
 */
const meta: Meta<typeof EffectToggle> = {
    title: "Components/EffectToggle",
    component: EffectToggle,
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
type Story = StoryObj<typeof EffectToggle>;

/**
 * Unchecked toggle with hidden child content.
 */
export const Default: Story = {
    args: {
        label: "Enable sparkles",
        defaultChecked: false,
        children: (
            <Box p="xs">
                <span>Sparkle settings would appear here</span>
            </Box>
        ),
    },
};

/**
 * Checked toggle showing configuration controls for the enabled effect.
 */
export const WithControls: Story = {
    args: {
        label: "Enable rainbow mode",
        defaultChecked: true,
        children: (
            <Stack gap={4}>
                <CompactColorInput label="Primary Sparkle" defaultColor="#5B8FF9" showOpacity={false} />
                <StyleNumberInput label="Fabulousness" defaultValue={5} min={1} max={20} />
            </Stack>
        ),
    },
};
