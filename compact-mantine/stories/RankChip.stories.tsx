import { Box, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { DataRow, DataRowHeader, MetricRow, PANEL_GRID, PANEL_INK, RankChip } from "../src";

// Everything here comes from "../src", the package's published entry point.

/**
 * A small chip for a rank: `#6`, where a sentence used to say `Rank 6 of 318`.
 *
 * The denominator is not information the reader is missing. The panel above the
 * list already says how many nodes there are, so the chip keeps the number that
 * changes and drops the four words that do not.
 *
 * It is Mantine's `Badge` at the size the compact theme gives it: 14px tall on a
 * 9px face, fully round, on a surface one step away from the panel. That is
 * small enough to read as an annotation of the row rather than as a second value
 * competing with the row's own.
 *
 * **Pass the rank already spelled the short way.** The chip does no formatting:
 * it draws whatever you give it, so `#6` and `2nd` and `A` all work, and a whole
 * sentence would simply overflow the row.
 *
 * It has no role of its own and no accessible name of its own, deliberately. It
 * is a short piece of text with a box drawn round it, read in its place in the
 * row; giving it a label would lift it out of that reading and announce it
 * twice. It renders as a `span`, so it is valid inside a row that is itself a
 * button.
 */
const meta: Meta<typeof RankChip> = {
    title: "Showing Data/RankChip",
    component: RankChip,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story): React.JSX.Element => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof RankChip>;

/** One chip on its own, at the size it is actually drawn. */
export const Default: Story = {
    args: {
        children: "#6",
    },
};

/**
 * What it replaces. The chip carries the number that changes from row to row;
 * the sentence carries three words that do not.
 */
export const InsteadOfASentence: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            <Group gap={PANEL_GRID.GUTTER}>
                <RankChip>#6</RankChip>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    the chip
                </Text>
            </Group>
            <Text size="sm" c={PANEL_INK.VALUE}>
                Rank 6 of 318
            </Text>
            <Text size="xs" c={PANEL_INK.CHROME}>
                The panel already says there are 318 nodes, so the second half of that sentence is a constant
                repeated on every row.
            </Text>
        </Stack>
    ),
};

/**
 * Beside a data row, in the trailing slot, which is where it most often goes.
 *
 * The chip annotates the row's own value rather than replacing it: the number of
 * links stays, and the chip says where that number puts this node in the order.
 */
export const InADataRow: Story = {
    render: (): React.JSX.Element => (
        <Box>
            <DataRowHeader label="Most connected" unit="links" defaultSortDirection="descending" />
            <DataRow name="Mr_Whiskers" value={12} trailing={<RankChip>#1</RankChip>} />
            <DataRow name="Bramble" value={9} trailing={<RankChip>#2</RankChip>} />
            <DataRow name="Tiptoe" value={7} trailing={<RankChip>#3</RankChip>} />
        </Box>
    ),
};

/**
 * In a metric row, which takes the rank as content and draws the chip for you.
 * Pass `rank`, not a `RankChip`.
 */
export const InAMetricRow: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <MetricRow name="Age" percentile={62} value="7" rank="#8" />
            <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
            <MetricRow name="Betweenness" percentile={41} value="0.04" rank="#12" />
        </Stack>
    ),
};

/**
 * Content other than a rank. The chip is a small round box for a very short
 * string, so a position in a multi-column sort, a letter grade or a count all
 * sit in it happily.
 *
 * Anything longer than three or four characters is the wrong content: it makes
 * the chip wide enough to compete with the row's own value, which is the one
 * thing it is sized not to do.
 */
export const OtherContent: Story = {
    render: (): React.JSX.Element => (
        <Group gap={PANEL_GRID.GUTTER}>
            <RankChip>#1</RankChip>
            <RankChip>2</RankChip>
            <RankChip>99+</RankChip>
            <RankChip>A</RankChip>
            <RankChip>x3</RankChip>
        </Group>
    ),
};

/**
 * Right to left. The chip is text in a box, so it turns around with the row it
 * annotates and needs nothing set on it.
 *
 * Format the number itself for the reader's locale before passing it in --
 * `useNumberFormatter()` from this package is the short way -- because the chip
 * prints exactly what it is given.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <DataRowHeader label="Most connected" unit="links" />
                <DataRow name="Mr_Whiskers" value={12} trailing={<RankChip>#1</RankChip>} />
                <DataRow name="Bramble" value={9} trailing={<RankChip>#2</RankChip>} />
            </Box>
        </DirectionProvider>
    ),
};
