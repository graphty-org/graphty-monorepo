import { Box, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { DataRow, DataRowHeader, MetricRow, PANEL_GRID, PANEL_INK, RankChip } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Imported from "../../../src", the package's published entry point.

/**
 * A small chip for a rank: `#6`, where a sentence used to say `Rank 6 of 318`.
 *
 * The denominator is not information the reader is missing: the panel above the list already
 * says how many nodes there are. So the chip keeps the number that changes from row to row and
 * drops the words that do not. It is small and outlined so it reads as an annotation of the row
 * rather than a second value competing with the row's own.
 *
 * ## When to use it
 *
 * Reach for RankChip beside a `DataRow` value, or inside a `DataRowHeader`, for a rank, a
 * position in a sort or another string of three or four characters. `MetricRow` draws one for
 * you: pass it `rank="#6"`, not a chip. Reach for Mantine `Badge` for a status or a category
 * label, which is a word rather than a number.
 *
 * ## Usage
 *
 * ```tsx
 * import { DataRow, RankChip } from "@graphty/compact-mantine";
 *
 * <DataRow name="Mr_Whiskers" value={12} trailing={<RankChip>#1</RankChip>} />
 * ```
 *
 * The chip does no formatting: it draws exactly what it is given. Format a number for the
 * reader's locale first (`useNumberFormatter()`).
 *
 * ## Keyboard and accessibility
 *
 * - No role and no accessible name of its own, on purpose: it is short text read in its place in
 *   the row. A label would lift it out of that reading and announce it twice.
 * - It renders as a `span`, so it is valid inside a row that is itself a button, and inside a
 *   sortable caption.
 * - It takes no focus.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 16px |
 * | Radius | 5px |
 * | Outline | 1px, border color, drawn inside |
 * | Text | 11/16 at weight 450 |
 * | Fill | transparent |
 */
const meta: Meta<typeof RankChip> = {
    title: "Components/Data display/RankChip",
    component: RankChip,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story): React.JSX.Element => (
            <Box w={PANEL_GRID.WIDTH} py="md" bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof RankChip>;

/** One chip on its own, at the size it is drawn. Edit its content in the Controls table. */
export const Default: Story = {
    args: {
        children: "#6",
    },
    decorators: [
        (Story): React.JSX.Element => (
            <Box px={PANEL_GRID.PAD_LEFT}>
                <Story />
            </Box>
        ),
    ],
};

/**
 * Every place it is drawn, light and dark side by side: on its own, on a selected row, and as
 * the sort position in a caption.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={8}>
            <Group gap={8} px={PANEL_GRID.PAD_LEFT}>
                <RankChip>#1</RankChip>
                <RankChip>#6</RankChip>
                <RankChip>#318</RankChip>
            </Group>
            <DataRow name="Selected row" value={<RankChip>#2</RankChip>} selected onClick={() => undefined} />
            <DataRowHeader label="In a caption" sortDirection="descending" sortPriority={2} onSortChange={() => undefined} />
        </Stack>
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/**
 * What it replaces. The chip carries the number that changes from row to row; the sentence
 * carries three words that do not.
 */
export const InsteadOfASentence: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER} px={PANEL_GRID.PAD_LEFT}>
            <Group gap={PANEL_GRID.GUTTER}>
                <RankChip>#6</RankChip>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    the chip
                </Text>
            </Group>
            <Text size="xs" c={PANEL_INK.VALUE}>
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
 * In a data row's trailing slot. The chip annotates the row's own value rather than replacing
 * it: the number of links stays, and the chip says where that number puts this node.
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

/** In a metric row, which takes the rank as content and draws the chip itself. Pass `rank`, not a `RankChip`. */
export const InAMetricRow: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0} style={{ paddingInline: `${String(PANEL_GRID.PAD_LEFT)}px ${String(PANEL_GRID.PAD_RIGHT)}px` }}>
            <MetricRow name="Age" percentile={62} value="7" rank="#8" />
            <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
            <MetricRow name="Betweenness" percentile={41} value="0.04" rank="#12" />
        </Stack>
    ),
};

/**
 * Content other than a rank: a position in a multi-column sort, a letter grade, a count. Anything
 * longer than three or four characters is the wrong content, because it makes the chip wide
 * enough to compete with the row's own value.
 */
export const OtherContent: Story = {
    render: (): React.JSX.Element => (
        <Group gap={PANEL_GRID.GUTTER} px={PANEL_GRID.PAD_LEFT}>
            <RankChip>#1</RankChip>
            <RankChip>2</RankChip>
            <RankChip>99+</RankChip>
            <RankChip>A</RankChip>
            <RankChip>x3</RankChip>
        </Group>
    ),
};

/** Right to left. The chip is text in a box, so it turns around with the row and needs nothing set on it. */
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
