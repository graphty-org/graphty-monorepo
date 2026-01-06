import { Box, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { ControlSubGroup } from "../src";

/**
 * A lightweight collapsible sub-section for nesting controls within a ControlSection.
 *
 * **Purpose:** Provides a second level of grouping for advanced or related options
 * within a parent section. Has lighter visual weight than ControlSection.
 *
 * **When to use:**
 * - To nest related advanced options within a ControlSection
 * - For "more options" or "advanced settings" within a category
 * - When you need hierarchical organization of controls
 * - For text effects, animation settings, or other optional enhancements
 *
 * **Key features:**
 * - Collapsed by default (defaultOpen: false)
 * - Lighter visual styling with dimmed text
 * - Indented content area when expanded
 * - No separator line (unlike ControlSection)
 */
const meta: Meta<typeof ControlSubGroup> = {
    title: "Components/ControlSubGroup",
    component: ControlSubGroup,
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
type Story = StoryObj<typeof ControlSubGroup>;

/**
 * Collapsed sub-group (default state). Click to expand.
 */
export const Default: Story = {
    args: {
        label: "Bonus Features",
        defaultOpen: false,
        children: (
            <Box>
                <Text size="sm">Unlock hidden options (click to expand)</Text>
            </Box>
        ),
    },
};

/**
 * Expanded sub-group showing child content with indentation.
 */
export const Expanded: Story = {
    args: {
        label: "Hidden Talents",
        defaultOpen: true,
        children: (
            <Box>
                <Text size="sm">Special abilities configuration</Text>
            </Box>
        ),
    },
};
