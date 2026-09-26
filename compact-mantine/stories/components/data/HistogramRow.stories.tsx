import { Box, DirectionProvider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { AdvancedButton, HistogramRow, LabelsProvider, MetricRow, PANEL_GRID, SparklineRow } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A distribution drawn in a 64px row, instead of the four numbers that summarize it.
 *
 * `Links per node: min 2, median 3, max 4, standard deviation 0.62` is four numbers standing in
 * for a shape. A histogram draws the shape in the same space and answers what the four numbers
 * cannot: is it bimodal, does it have a long tail, is this one hub and nineteen leaves. There is
 * no legend, title or summary line: a chart that needs a legend at this size is the wrong chart.
 *
 * ## When to use it
 *
 * Reach for HistogramRow for a distribution: how many links each node has, how betweenness is
 * spread, how big the components are. Reach for `SparklineRow` for a series over time (the same
 * idea at half the height), `MetricRow` for one reading's place in its distribution, and a
 * `DataRow` each for two or three values, which do not need a chart.
 *
 * ## Usage
 *
 * ```tsx
 * import { HistogramRow } from "@graphty/compact-mantine";
 *
 * <HistogramRow
 *     label="Links per node"
 *     bins={[
 *         { label: "2 links: 5 nodes", count: 5 },
 *         { label: "3 links: 12 nodes", count: 12, highlighted: true },
 *         { label: "4 links: 3 nodes", count: 3 },
 *     ]}
 *     minLabel="2"
 *     maxLabel="4"
 * />
 * ```
 *
 * - `bins` are in order along the axis. Each `label` is a phrase that stands on its own, because
 *   it is both the bar's tooltip and its row in the hidden table of values. `highlighted` draws a
 *   bin in the accent color.
 * - `minLabel` and `maxLabel` are required and always drawn: they let the picture be read as the
 *   table it replaced.
 *
 * ## Keyboard and accessibility
 *
 * - **Give it a `label`.** It becomes the accessible name of the drawing (`role="img"`) and the
 *   caption of a visually hidden table listing every bin, so a screen reader announces one named
 *   image and can then read the numbers. Without it the drawing is hidden and only the table
 *   remains.
 * - The drawing is described by the two axis ends.
 * - `busy` makes the row a live region that holds its announcement back until the values arrive.
 * - The chart takes no focus; a `trailing` control is reachable on its own.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 64px (two row pitches; there is no other height) |
 * | Bars | `--cm-icon-secondary`; the highlighted bin `--cm-bg-brand` |
 * | Baseline | 1px `--cm-border` |
 * | Axis ends | 11px, secondary text color, in a 16px band |
 * | Trailing slot | 24px, taken from the chart's width |
 */
const meta: Meta<typeof HistogramRow> = {
    title: "Components/Data display/HistogramRow",
    component: HistogramRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        // Every story sits in a 240px panel on the panel ground; States lays out several panels
        // side by side, so it brings its own.
        (Story, context): React.JSX.Element =>
            context.name === "States" ? (
                <Story />
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={{ paddingInline: "16px 8px" }}>
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
 * A degree distribution in place of `min 2, median 3, max 4, standard deviation 0.62`. The middle
 * bin is highlighted because it holds the node the reader has selected. A screen reader announces
 * "Links per node, image", with a hidden table of all three bins behind it.
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
 * Every state, light and dark side by side: bins with one highlighted, with a trailing control,
 * and nothing measured yet while a computation runs.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Bins, one highlighted" padded>
                <HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />
            </StoryState>
            <StoryState name="With a trailing control" padded>
                <HistogramRow
                    label="Links per node"
                    bins={DEGREES}
                    minLabel="2"
                    maxLabel="4"
                    trailing={<AdvancedButton label="Bin width and scale" changed />}
                />
            </StoryState>
            <StoryState name="Busy, no bins yet" padded>
                <HistogramRow label="Links per node" bins={[]} busy minLabel="--" maxLabel="--" />
            </StoryState>
        </StoryStates>
    ),
};

/**
 * The long tail the four numbers hide: most nodes broker nothing, and one brokers everything. A
 * median and a standard deviation cannot say this; the picture says it at a glance.
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
 * Bimodal: two groups that barely know each other, and no summary statistic that would tell you
 * so. The shape that most argues for drawing the distribution at all.
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
 * With an advanced settings button in the 24px trailing slot. The chart gives up that width, so
 * the row still ends where every other row in the panel does.
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
 * Nothing measured yet, and a computation still running. `busy` holds the live region's
 * announcement back until the values arrive, so a screen reader hears the result once.
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
 * The three chart rows together in the 240px panel they were drawn for: the distribution of the
 * whole graph, the layout settling, and one selected node's own numbers. Six readings that would
 * otherwise be a paragraph, in the height of five rows.
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

/**
 * Translated. The chart writes no words of its own -- the bin labels and axis ends are yours --
 * but `LabelsProvider`'s locale groups the counts in the hidden table of values.
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
 * Right to left. The axis starts at the right and the bars run leftwards; nothing is a mirror
 * image applied afterwards. `dir="rtl"` and Mantine's `DirectionProvider` are all it takes.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />
            </Box>
        </DirectionProvider>
    ),
};
