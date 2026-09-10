import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import {
    DataRow,
    DataRowHeader,
    LabelsProvider,
    PANEL_GRID,
    StatRow,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A label and a reading on one line: a node count, a density, a selected item's
 * degree.
 *
 * **Deprecated. Use `DataRow`.** It draws the same pair -- the reader's string
 * at the leading edge, the value at the trailing edge in the secondary text
 * colour -- and adds a leading icon, a selected state, a trailing control,
 * activation with modifier keys, double click and a context menu. Nothing this
 * component draws is missing from it. This one keeps working, because the
 * package is published.
 *
 * **What it still does correctly, and what to keep when you move:**
 * - The label and the reading are announced as one named pair rather than as
 *   two unrelated runs of text
 * - A number is formatted for the reader's locale, so `1000000` is drawn as
 *   "1,000,000" in English and "1.000.000" in German
 * - A label too long for the panel shortens with an ellipsis, and is still read
 *   out in full
 */
const meta: Meta<typeof StatRow> = {
    title: "Showing Data/StatRow",
    component: StatRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof StatRow>;

/**
 * One reading.
 */
export const Default: Story = {
    args: {
        label: "Nodes",
        value: 1284,
    },
};

/**
 * A column of readings. Each pair is announced with its own label.
 */
export const Stacked: Story = {
    render: () => (
        <Stack gap={0}>
            <StatRow label="Nodes" value={1284} />
            <StatRow label="Edges" value={9611} />
            <StatRow label="Density" value="0.012" />
            <StatRow label="Components" value={3} />
        </Stack>
    ),
};

/**
 * Numbers are formatted for the reader's locale: grouped, with that locale's
 * own decimal separator and digits. Every digit survives -- nothing is rounded
 * away. Pass a string when you have formatted the value yourself.
 */
export const Localized: Story = {
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    en-US
                </Text>
                <LabelsProvider locale="en-US">
                    <StatRow label="Nodes" value={1284000} />
                    <StatRow label="Density" value={0.01234} />
                </LabelsProvider>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    de-DE
                </Text>
                <LabelsProvider locale="de-DE">
                    <StatRow label="Knoten" value={1284000} />
                    <StatRow label="Dichte" value={0.01234} />
                </LabelsProvider>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    ar-EG
                </Text>
                <LabelsProvider locale="ar-EG">
                    <StatRow label="Nodes" value={1284000} />
                    <StatRow label="Density" value={0.01234} />
                </LabelsProvider>
            </Box>
        </Stack>
    ),
};

/**
 * A label too long for the panel shortens with an ellipsis and keeps the
 * reading where it is. The whole label stays in the document, so it is read out
 * in full, and a tooltip repeats it for a reader using a pointer.
 */
export const LongLabel: Story = {
    args: {
        label: "Average weighted betweenness centrality",
        value: 0.4271,
    },
};

/**
 * The same readings as `DataRow`, which is what to use instead. A run of rows
 * that all measure the same thing carries its unit word once, on a header above
 * the column, rather than repeating it on every row.
 */
export const MovingToDataRow: Story = {
    render: () => (
        <Stack gap={0}>
            <DataRowHeader label="Most connected" unit="links" />
            <DataRow name="Mr_Whiskers" value="318" onClick={() => undefined} />
            <DataRow name="Biscuit" value="204" onClick={() => undefined} />
            <DataRow name="Noodle" value="91" onClick={() => undefined} />
        </Stack>
    ),
};
