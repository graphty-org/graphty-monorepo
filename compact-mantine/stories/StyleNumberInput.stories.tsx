import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StyleNumberInput } from "../src";

/**
 * A number input that visually distinguishes between default and explicit values.
 *
 * **Purpose:** Allows users to enter numeric values while clearly indicating whether
 * the current value is a default or an explicitly-set override. Includes a reset button
 * to revert to the default.
 *
 * **When to use:**
 * - For numeric properties that have sensible defaults
 * - When users should see that they've customized a value
 * - In style editors where "reset to default" is useful
 * - For settings like opacity, size, spacing, or angles
 *
 * **Key features:**
 * - Italic/dimmed styling when using default value
 * - Normal styling when value is explicitly set
 * - Reset button (×) appears only for non-default values
 * - Supports min/max, step, decimal scale, and suffix
 * - Controlled and uncontrolled modes
 *
 * **How it differs from Mantine's NumberInput:**
 *
 * | Feature | Mantine `NumberInput` | `StyleNumberInput` |
 * |---------|----------------------|-------------------|
 * | Value semantics | `undefined` means empty | `undefined` means "using the default value" |
 * | Default styling | Always normal text | Italic/dimmed when using default |
 * | Spinner controls | Shown by default | Hidden by default (`hideControls={true}`) |
 * | Reset mechanism | No built-in reset | Reset button reverts to default value |
 * | Focus handling | Standard | Local state prevents focus loss during typing |
 * | Use case | General-purpose number fields | Style property editors with overridable defaults |
 *
 * Use Mantine's `NumberInput` for general forms. Use `StyleNumberInput` when you need
 * users to understand whether they're using a default or have explicitly customized a value.
 */
const meta: Meta<typeof StyleNumberInput> = {
    title: "Components/StyleNumberInput",
    component: StyleNumberInput,
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
type Story = StoryObj<typeof StyleNumberInput>;

/**
 * Basic number input with a default value (shown in italic).
 */
export const Default: Story = {
    args: {
        label: "Cuteness",
        defaultValue: 10,
    },
};

/**
 * Number input with constraints and visible spinner controls.
 */
export const WithMinMaxAndStep: Story = {
    args: {
        label: "Nap Angle",
        defaultValue: 0,
        min: 0,
        max: 360,
        step: 15,
        suffix: "°",
        hideControls: false,
    },
};

/**
 * Number input with a unit suffix displayed after the value.
 */
export const WithSuffix: Story = {
    args: {
        label: "Snack Budget",
        defaultValue: 100,
        suffix: "treats",
    },
};

/**
 * Number input supporting decimal values with fixed precision.
 */
export const WithDecimalScale: Story = {
    args: {
        label: "Chaos Factor",
        defaultValue: 3.14,
        min: 0.1,
        max: 10,
        step: 0.1,
        decimalScale: 2,
    },
};
