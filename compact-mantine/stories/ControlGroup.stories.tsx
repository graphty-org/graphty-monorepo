import { ActionIcon, Box, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Plus, RotateCcw } from "lucide-react";

import { ControlGroup } from "../src";

/**
 * A non-collapsible section header for grouping related controls with a label.
 *
 * **Purpose:** Provides visual organization for groups of controls that should always
 * be visible. Includes a separator line and optional action buttons in the header.
 *
 * **When to use:**
 * - To group related controls under a common heading
 * - When the section should always be expanded (use ControlSection for collapsible)
 * - When you need action buttons (add, reset, etc.) in the section header
 * - For primary control groupings that users access frequently
 *
 * **Key features:**
 * - Separator line above for visual separation
 * - Optional action buttons in the header row
 * - Consistent spacing between child controls
 */
const meta: Meta<typeof ControlGroup> = {
    title: "Components/ControlGroup",
    component: ControlGroup,
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
type Story = StoryObj<typeof ControlGroup>;

/**
 * Basic control group with a label and child content.
 */
export const Default: Story = {
    args: {
        label: "Mood Settings",
        children: (
            <Box p="xs">
                <Text size="sm">Fine-tune the vibes here</Text>
            </Box>
        ),
    },
};

/**
 * Control group with action buttons in the header for quick operations.
 */
export const WithActions: Story = {
    args: {
        label: "Treat Dispenser",
        actions: (
            <>
                <ActionIcon size="xs" variant="subtle" color="gray">
                    <Plus size={12} />
                </ActionIcon>
                <ActionIcon size="xs" variant="subtle" color="gray">
                    <RotateCcw size={12} />
                </ActionIcon>
            </>
        ),
        children: (
            <Box p="xs">
                <Text size="sm">Add more treats or reset the stash</Text>
            </Box>
        ),
    },
};
