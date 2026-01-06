import { Box, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StatRow } from "../src";

/**
 * A simple label-value pair for displaying read-only statistics or metadata.
 *
 * **Purpose:** Shows a label on the left and its corresponding value on the right
 * in a compact, consistent format. Ideal for displaying object properties or metrics.
 *
 * **When to use:**
 * - To display object properties or metadata
 * - For read-only information in property panels
 * - When showing multiple key-value pairs in a list
 * - For statistics, counts, or status information
 *
 * **Key features:**
 * - Label on left (dimmed), value on right (emphasized)
 * - Consistent 11px font size for compact display
 * - Accepts string or number values
 * - Stack multiple for a property list
 */
const meta: Meta<typeof StatRow> = {
    title: "Components/StatRow",
    component: StatRow,
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
type Story = StoryObj<typeof StatRow>;

/**
 * Single statistic display.
 */
export const Default: Story = {
    args: {
        label: "Treats Consumed",
        value: "42",
    },
};

/**
 * Multiple stats stacked to form a property list.
 */
export const MultipleStats: Story = {
    render: () => (
        <Stack gap={4}>
            <StatRow label="Naps Taken" value="156" />
            <StatRow label="Zoomies" value="423" />
            <StatRow label="Mischief Level" value="over 9000" />
            <StatRow label="Bothers Given" value="0" />
        </Stack>
    ),
};
