import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    LabelsProvider,
    PANEL_GRID,
    PANEL_INK,
    SparklineRow,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A series drawn at the height of a single row: 24px of line on a 1px baseline,
 * with the value at each end of the axis beside it.
 *
 * Reach for it when the question is "which way is this going" -- a layout
 * settling, a value over time, a queue draining. For a distribution rather than
 * a series, reach for `HistogramRow`, which is the same idea at twice the
 * height.
 *
 * **The two axis-end labels are always drawn**, and they flank the line rather
 * than sitting under it, because one row pitch has no second line to put them
 * on. A sparkline without them is a squiggle: the line reports the shape and the
 * labels report the magnitude, and neither is any use alone.
 *
 * **The series is normalised over its own extremes.** The line fills the height
 * available whatever the numbers are, so two sparklines in one panel are not
 * comparable to each other unless their labels say they are.
 *
 * **Give it a `label`.** It becomes the accessible name of the drawing and the
 * caption of a visually hidden table listing every value behind it, so a screen
 * reader announces one named image and can then read the numbers. Without it the
 * drawing is hidden from assistive technology altogether and only the table
 * remains.
 *
 * There is no legend, no title and no summary line. A chart that needs a legend
 * at this size is the wrong chart.
 */
const meta: Meta<typeof SparklineRow> = {
    title: "Showing Data/SparklineRow",
    component: SparklineRow,
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
type Story = StoryObj<typeof SparklineRow>;

/** A force-directed layout settling over twenty ticks. */
const SETTLING = [92, 71, 55, 44, 36, 29, 24, 20, 16, 13, 11, 9, 7, 6, 5, 4, 4, 3, 3, 2];

/** A value that goes up rather than down. */
const GROWTH = [3, 4, 4, 6, 9, 11, 16, 22, 27, 35, 44, 51, 63, 70, 78, 88];

/**
 * A layout settling. The line reports the shape, and the two ends report which
 * twenty ticks are being shown.
 */
export const Default: Story = {
    args: {
        label: "Layout settling",
        values: SETTLING,
        minLabel: "Tick 1",
        maxLabel: "Tick 20",
    },
};

/** The other direction. Nothing about the row changes; only the data does. */
export const Rising: Story = {
    args: {
        label: "Nodes loaded",
        values: GROWTH,
        minLabel: "0s",
        maxLabel: "16s",
    },
};

/**
 * A settled series: every value the same.
 *
 * The line draws down the middle rather than along the top or the bottom.
 * A series with no range has no shape to report, and pinning it to an edge would
 * invent one -- a flat line at the top reads as "at the maximum", which is a
 * claim the data does not make.
 */
export const Settled: Story = {
    args: {
        label: "Layout settling",
        values: [2, 2, 2, 2, 2, 2, 2, 2],
        minLabel: "Tick 33",
        maxLabel: "Tick 40",
    },
};

/**
 * Nothing measured yet. The baseline and both axis ends are still drawn, so the
 * row keeps its pitch and its shape and the panel does not reflow the moment the
 * first value arrives.
 */
export const Empty: Story = {
    args: {
        label: "Layout settling",
        values: [],
        minLabel: "Tick 1",
        maxLabel: "Tick 40",
    },
};

/**
 * Still being computed. `busy` marks the row busy for assistive technology,
 * which holds the announcement of the series back until the computation
 * finishes, so a screen reader hears the result once rather than hearing every
 * frame of it.
 */
export const Busy: Story = {
    args: {
        label: "Layout settling",
        values: [92, 71, 55],
        minLabel: "Tick 1",
        maxLabel: "Tick 20",
        busy: true,
    },
};

/**
 * With a control in the trailing slot. The drawing gives up that 24px, so the
 * row still ends where every other row in the panel does.
 */
export const WithATrailingControl: Story = {
    args: {
        label: "Layout settling",
        values: SETTLING,
        minLabel: "Tick 1",
        maxLabel: "Tick 20",
        trailing: <AdvancedButton label="Layout settings" changed onClick={(): void => undefined} />,
    },
};

/**
 * Two sparklines in one panel.
 *
 * They are not comparable to each other: each is normalised over its own
 * extremes, so a line that reaches the top of its 24px means "the highest value
 * in this series", not "the highest value on the screen". The labels are what
 * make the magnitudes readable.
 */
export const SeveralAtOnce: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.SECTION_PAD_BOTTOM}>
            <SparklineRow label="Layout settling" values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />
            <SparklineRow label="Nodes loaded" values={GROWTH} minLabel="0s" maxLabel="16s" />
            <Text size="xs" c={PANEL_INK.CHROME}>
                Each line fills its own height. Read the ends, not the slopes against each other.
            </Text>
        </Stack>
    ),
};

/**
 * Translated. `LabelsProvider` sets the locale that numbers in the hidden table
 * of values are grouped for, and replaces any string the library produces. The
 * axis labels are yours, so translate those where you write them.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider locale="fr-FR">
            <SparklineRow
                label="Stabilisation de la disposition"
                values={SETTLING}
                minLabel="Pas 1"
                maxLabel="Pas 20"
            />
        </LabelsProvider>
    ),
};

/**
 * Right to left. The first value moves to the right-hand edge, so the line still
 * runs from the start of the axis to its end and reads the same way as the two
 * labels flanking it. Nothing here is a mirror image applied afterwards.
 *
 * Two things produce this, and they are the two a right-to-left application sets
 * anyway: `dir="rtl"`, usually on the document, and Mantine's
 * `DirectionProvider`. The sparkline genuinely needs the second one, because an
 * SVG coordinate space has no idea which way text runs.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <SparklineRow label="Layout settling" values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />
            </Box>
        </DirectionProvider>
    ),
};
