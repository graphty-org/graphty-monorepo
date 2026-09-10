import { Box, DirectionProvider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    HistogramRow,
    LabelsProvider,
    MetricRow,
    PANEL_GRID,
    SparklineRow,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A distribution drawn instead of the four numbers that summarise it.
 *
 * `Links per node: min 2, median 3, max 4, standard deviation 0.62` is four
 * numbers standing in for a shape. A histogram draws the shape in the same
 * space, and answers what the four numbers cannot: is the distribution bimodal,
 * does it have a long tail, is this one hub and nineteen leaves.
 *
 * Reach for it for a distribution -- how many links each node has, how
 * betweenness is spread, how big the components are. Never for two or three
 * values, which belong on a row of their own.
 *
 * **What to pass**
 *
 * - `bins` -- in order along the axis. Each one carries a `label` written as a
 *   phrase a reader can understand on its own (`"3 links: 12 nodes"`), because
 *   that label is both the bar's tooltip and its row in the hidden table of
 *   values. Mark one `highlighted` to draw it in the accent colour.
 * - `minLabel` and `maxLabel` -- the value at each end of the axis. Always
 *   drawn, and not optional: they are what lets the picture be read as the table
 *   it replaced.
 * - `label` -- the chart's own name. **Supply it.** It becomes the accessible
 *   name of the drawing and the caption of a visually hidden table listing every
 *   bin, so a screen reader announces one named image and can then read the
 *   numbers. Without it the drawing is hidden from assistive technology and only
 *   the table remains.
 *
 * **The height is fixed at 64px**, which is exactly two row pitches, and there
 * is no other height. There is no legend, no title and no summary line: a chart
 * that needs a legend at this size is the wrong chart.
 *
 * Two siblings share its ideas and its shape. `SparklineRow` is the same drawing
 * at half the height, for a series rather than a distribution. `MetricRow` is
 * one reading with a bar for its percentile and a chip for its rank. Both have
 * pages of their own under **Showing Data**.
 */
const meta: Meta<typeof HistogramRow> = {
    title: "Showing Data/HistogramRow",
    component: HistogramRow,
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
type Story = StoryObj<typeof HistogramRow>;

/** A degree distribution over twenty nodes. */
const DEGREES = [
    { label: "2 links: 5 nodes", count: 5 },
    { label: "3 links: 12 nodes", count: 12, highlighted: true },
    { label: "4 links: 3 nodes", count: 3 },
];

/** A force-directed layout settling over twenty ticks. */
const SETTLING = [92, 71, 55, 44, 36, 29, 24, 20, 16, 13, 11, 9, 7, 6, 5, 4, 4, 3, 3, 2];

/**
 * A degree distribution replacing `min 2, median 3, max 4, standard deviation
 * 0.62`. The middle bin is highlighted because it is the one the reader has
 * selected.
 *
 * A screen reader announces this as "Links per node, image", described by the
 * two axis ends, with a hidden table listing all three bins behind it.
 */
export const Default: Story = {
    args: {
        label: "Links per node",
        bins: DEGREES,
        minLabel: "2",
        maxLabel: "4",
    },
};

/**
 * The long tail the four numbers hide: most nodes broker nothing, and one
 * brokers everything. A median and a standard deviation cannot say this; the
 * picture says it at a glance.
 */
export const LongTail: Story = {
    args: {
        label: "Betweenness",
        bins: [
            { label: "0.00 to 0.05: 13 nodes", count: 13 },
            { label: "0.05 to 0.10: 3 nodes", count: 3 },
            { label: "0.10 to 0.15: 2 nodes", count: 2 },
            { label: "0.15 to 0.20: 1 node", count: 1 },
            { label: "0.20 to 0.25: 0 nodes", count: 0 },
            { label: "0.25 to 0.30: 0 nodes", count: 0 },
            { label: "0.30 to 0.35: 1 node", count: 1 },
        ],
        minLabel: "0.00",
        maxLabel: "0.35",
    },
};

/**
 * Bimodal: the shape that most argues for drawing the distribution at all. Two
 * groups that barely know each other, and no summary statistic that would tell
 * you so.
 */
export const Bimodal: Story = {
    args: {
        label: "Links per node",
        bins: [
            { label: "1 link: 2 nodes", count: 2 },
            { label: "2 links: 6 nodes", count: 6 },
            { label: "3 links: 1 node", count: 1 },
            { label: "4 links: 0 nodes", count: 0 },
            { label: "5 links: 2 nodes", count: 2 },
            { label: "6 links: 7 nodes", count: 7 },
            { label: "7 links: 2 nodes", count: 2 },
        ],
        minLabel: "1",
        maxLabel: "7",
    },
};

/**
 * With an advanced settings button in the 24px trailing slot. The chart gives up
 * that width, so the row still ends where every other row in the panel does.
 */
export const WithTrailing: Story = {
    args: {
        label: "Links per node",
        bins: DEGREES,
        minLabel: "2",
        maxLabel: "4",
        trailing: (
            <AdvancedButton
                label="Bin width and scale"
                changed
                onClick={() => {
                    // Opens the binning options.
                }}
            />
        ),
    },
};

/**
 * Nothing measured yet, and a computation still running. `busy` sets
 * `aria-busy`, which holds the live region's announcement back until the values
 * arrive, so a screen reader hears the result once instead of hearing every
 * intermediate frame of it.
 */
export const Busy: Story = {
    args: {
        label: "Links per node",
        bins: [],
        busy: true,
        minLabel: "--",
        maxLabel: "--",
    },
};

/**
 * Translated. `LabelsProvider` supplies the locale that numbers are formatted
 * in, and replaces any string the library produces.
 *
 * The chart itself writes no words -- the bin labels and the axis ends are
 * yours, so translate them where you write them -- but the counts in the hidden
 * table behind the drawing are grouped the way the locale groups them.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider locale="fr-FR">
            <HistogramRow
                label="Liens par noeud"
                bins={[
                    { label: "2 liens : 1234 noeuds", count: 1234 },
                    { label: "3 liens : 2048 noeuds", count: 2048, highlighted: true },
                ]}
                minLabel="2"
                maxLabel="3"
            />
        </LabelsProvider>
    ),
};

/**
 * The three chart rows with the text direction reversed.
 *
 * Every row is laid out along the inline axis rather than from the left, so the
 * whole panel turns around: each axis starts at the right, the metric's name
 * leads from the right and its bar fills leftwards, and the sparkline's first
 * value moves to the right-hand edge so the line still reads the same way as the
 * two labels flanking it. Nothing here is a mirror image applied afterwards.
 *
 * Two things have to be set to get this, and they are the two a right-to-left
 * application sets anyway:
 * - `dir="rtl"`, usually on the document, which is what turns the layout around
 * - Mantine's `DirectionProvider`, which is how a component reads the direction
 *   from JavaScript -- the sparkline needs it because an SVG coordinate space
 *   has no idea which way text runs
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={PANEL_GRID.GUTTER}>
                    <HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />
                    <SparklineRow label="Layout settling" values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />
                    <Stack gap={0}>
                        <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
                        <MetricRow name="Betweenness" percentile={20} value="0.04" rank="#12" />
                    </Stack>
                </Stack>
            </Box>
        </DirectionProvider>
    ),
};

/**
 * The three chart rows together in the panel they were drawn for, at 280px: the
 * distribution of the whole graph, the layout settling, and one selected node's
 * own numbers.
 *
 * Six readings that would otherwise be a paragraph, in the height of five rows.
 */
export const WithTheOtherChartRows: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.SECTION_PAD_BOTTOM}>
            <HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />
            <SparklineRow label="Layout settling" values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />
            <Stack gap={0}>
                <MetricRow name="Age" percentile={62} value="7" rank="#8" />
                <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
                <MetricRow name="Betweenness" percentile={41} value="0.04" rank="#12" />
            </Stack>
        </Stack>
    ),
};
