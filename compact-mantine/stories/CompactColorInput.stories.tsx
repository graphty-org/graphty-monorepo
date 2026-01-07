import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { CompactColorInput } from "../src";

/**
 * A compact color picker with optional opacity control, designed for dense UI layouts.
 *
 * **Purpose:** Provides an all-in-one color selection experience combining a color swatch,
 * hex input, and optional opacity slider in a single compact row.
 *
 * **When to use:**
 * - When users need to pick colors in space-constrained interfaces
 * - When you need both color and opacity controls together
 * - In property panels, style editors, or theming interfaces
 * - When you want to distinguish between default and explicitly-set values
 *
 * **Key features:**
 * - Figma-style layout: [swatch] [hex input] | [opacity%] [reset]
 * - Shows muted/italic styling for default values
 * - Reset button appears only when value differs from default
 * - Supports controlled and uncontrolled modes
 */
const meta: Meta<typeof CompactColorInput> = {
    title: "Components/CompactColorInput",
    component: CompactColorInput,
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
type Story = StoryObj<typeof CompactColorInput>;

/**
 * Basic color input with opacity control.
 */
export const Default: Story = {
    args: {
        defaultColor: "#5B8FF9",
        defaultOpacity: 100,
    },
};

/**
 * Color input with a descriptive label above.
 */
export const WithLabel: Story = {
    args: {
        label: "Fur Color",
        defaultColor: "#5B8FF9",
        defaultOpacity: 100,
    },
};

/**
 * Color input without opacity control for simpler use cases.
 */
export const WithoutOpacity: Story = {
    args: {
        label: "Nose Boop",
        defaultColor: "#61D095",
        showOpacity: false,
    },
};
