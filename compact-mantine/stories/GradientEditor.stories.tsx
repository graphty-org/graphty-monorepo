import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { createColorStop, GradientEditor, type ColorStop } from "../src";

/**
 * An interactive editor for creating and modifying linear gradients.
 *
 * **Purpose:** Allows users to create multi-color gradients by adding, removing,
 * and configuring color stops. Includes optional direction control for gradient angle.
 *
 * **When to use:**
 * - For background gradient configuration
 * - When users need to create custom color transitions
 * - In theme editors or visual customization panels
 * - For fill styles in graphics or visualization tools
 *
 * **Key features:**
 * - Add up to 5 color stops with position sliders
 * - Remove stops (minimum 2 required)
 * - Optional direction slider (0-360 degrees)
 * - Supports controlled and uncontrolled modes
 * - Each stop has a unique ID for stable rendering
 */
const meta: Meta<typeof GradientEditor> = {
    title: "Components/GradientEditor",
    component: GradientEditor,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={320} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof GradientEditor>;

const defaultStops: ColorStop[] = [createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")];

const fiveStops: ColorStop[] = [
    createColorStop(0, "#FF6B6B"),
    createColorStop(0.25, "#F7B731"),
    createColorStop(0.5, "#61D095"),
    createColorStop(0.75, "#5B8FF9"),
    createColorStop(1, "#9B59B6"),
];

/**
 * Two-color gradient with direction control.
 */
export const Default: Story = {
    args: {
        defaultStops: defaultStops,
        defaultDirection: 90,
        showDirection: true,
    },
};

/**
 * Maximum 5 color stops for a complex rainbow gradient.
 */
export const MaxStops: Story = {
    args: {
        defaultStops: fiveStops,
        defaultDirection: 180,
        showDirection: true,
    },
};

/**
 * Gradient editor without direction control for simpler use cases.
 */
export const WithoutDirection: Story = {
    args: {
        defaultStops: defaultStops,
        showDirection: false,
    },
};
