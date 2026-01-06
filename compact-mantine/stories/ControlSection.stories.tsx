import { Box, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { ControlSection } from "../src";

/**
 * A collapsible section for organizing controls into expandable groups.
 *
 * **Purpose:** Allows users to show/hide groups of related controls, reducing
 * visual clutter while keeping options accessible. Includes an optional indicator
 * dot to highlight sections with configured (non-default) values.
 *
 * **When to use:**
 * - To organize many controls into logical, collapsible groups
 * - For advanced or less frequently used options that can be hidden
 * - When you want to indicate sections with custom configurations
 * - For property panels with multiple categories of settings
 *
 * **Key features:**
 * - Click header to expand/collapse content
 * - Chevron icon indicates current state
 * - Optional blue indicator dot when hasConfiguredValues is true
 * - Separator line above for visual separation
 */
const meta: Meta<typeof ControlSection> = {
    title: "Components/ControlSection",
    component: ControlSection,
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
type Story = StoryObj<typeof ControlSection>;

/**
 * Expanded section showing child controls.
 */
export const Default: Story = {
    args: {
        label: "Personality",
        defaultOpen: true,
        children: (
            <Box p="xs">
                <Text size="sm">Customize your companion's quirks</Text>
            </Box>
        ),
    },
};

/**
 * Collapsed section that can be expanded by clicking the header.
 */
export const Collapsed: Story = {
    args: {
        label: "Secret Powers",
        defaultOpen: false,
        children: (
            <Box p="xs">
                <Text size="sm">Hidden abilities revealed here</Text>
            </Box>
        ),
    },
};

/**
 * Section with a blue indicator dot showing it contains non-default values.
 * Use this to draw attention to sections where users have made customizations.
 */
export const WithConfiguredValues: Story = {
    args: {
        label: "Snack Preferences",
        defaultOpen: true,
        hasConfiguredValues: true,
        children: (
            <Box p="xs">
                <Text size="sm">Custom snacks configured (blue dot = fancy taste)</Text>
            </Box>
        ),
    },
};
