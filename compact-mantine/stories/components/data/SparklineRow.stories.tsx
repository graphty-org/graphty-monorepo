import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { AdvancedButton, LabelsProvider, PANEL_GRID, PANEL_INK, SparklineRow } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A series drawn in one 32px row: a 24px line on a 1px baseline, flanked by the value at each end
 * of the axis.
 *
 * The line reports the shape and the two end labels report the magnitude; neither is any use
 * alone, so both are always drawn. The series is normalized over its own extremes, so the line
 * fills the height whatever the numbers are -- and two sparklines in one panel are not comparable
 * to each other unless their labels say so. There is no legend, title or summary line.
 *
 * ## When to use it
 *
 * Reach for SparklineRow when the question is "which way is this going": a layout settling, a
 * value over time, a queue draining. Reach for `HistogramRow` for a distribution rather than a
 * series, and `MetricRow` for one reading's place in its distribution.
 *
 * ## Usage
 *
 * ```tsx
 * import { SparklineRow } from "@graphty/compact-mantine";
 *
 * <SparklineRow label="Layout settling" values={energyPerTick} minLabel="Tick 1" maxLabel="Tick 20" busy={running} />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - **Give it a `label`.** It becomes the accessible name of the drawing (`role="img"`) and the
 *   caption of a visually hidden table listing every value, so a screen reader announces one
 *   named image and can then read the numbers. Without it the drawing is hidden and only the table
 *   remains.
 * - The drawing is described by the two axis ends.
 * - `busy` makes the row a live region that holds its announcement back until the series is done.
 * - Right to left, the first value moves to the right-hand edge. The sparkline reads the direction
 *   from Mantine's `DirectionProvider`, because an SVG has no idea which way text runs.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 32px (`PANEL_GRID.SPARKLINE_HEIGHT`) |
 * | Line | 24px tall, 1px stroke, `--cm-icon-secondary` |
 * | Baseline | 1px `--cm-border` |
 * | Axis ends | 11px, secondary text color, beside the line |
 * | Trailing slot | 24px, taken from the line's width |
 */
const meta: Meta<typeof SparklineRow> = {
    title: "Components/Data display/SparklineRow",
    component: SparklineRow,
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
type Story = StoryObj<typeof SparklineRow>;

/** A force-directed layout settling over twenty ticks. */
const SETTLING = [92, 71, 55, 44, 36, 29, 24, 20, 16, 13, 11, 9, 7, 6, 5, 4, 4, 3, 3, 2];

/** A value that goes up rather than down. */
const GROWTH = [3, 4, 4, 6, 9, 11, 16, 22, 27, 35, 44, 51, 63, 70, 78, 88];

/** A layout settling. The line reports the shape; the two ends say which twenty ticks are shown. */
export const Default: Story = {
    args: {
        label: "Layout settling",
        values: SETTLING,
        minLabel: "Tick 1",
        maxLabel: "Tick 20",
    },
};

/**
 * Every state, light and dark side by side: a line, a settled (flat) series, nothing measured yet,
 * and a trailing control.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Line" padded>
                <SparklineRow label="Layout settling" values={[1, 4, 2, 8, 6, 7]} minLabel="Tick 1" maxLabel="Tick 6" />
            </StoryState>
            <StoryState name="Settled" padded>
                <SparklineRow label="Layout settling" values={[5, 5, 5, 5]} minLabel="Tick 1" maxLabel="Tick 4" />
            </StoryState>
            <StoryState name="Empty" padded>
                <SparklineRow label="Layout settling" values={[]} minLabel="--" maxLabel="--" />
            </StoryState>
            <StoryState name="With a trailing control" padded>
                <SparklineRow
                    label="Layout settling"
                    values={SETTLING}
                    minLabel="Tick 1"
                    maxLabel="Tick 20"
                    trailing={<AdvancedButton label="Layout settings" changed />}
                />
            </StoryState>
        </StoryStates>
    ),
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
 * A settled series: every value the same. The line runs down the middle rather than along an
 * edge, because a flat line at the top would read as "at the maximum", a claim the data does not
 * make.
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
 * Nothing measured yet. The baseline and both axis ends are still drawn, so the row keeps its
 * shape and the panel does not reflow when the first value arrives.
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
 * Still being computed. `busy` holds the announcement of the series back until the computation
 * finishes, so a screen reader hears the result once rather than every frame of it.
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
 * With a control in the trailing slot. The drawing gives up that 24px, so the row still ends where
 * every other row in the panel does.
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
 * Two sparklines in one panel. They are not comparable to each other: each is normalized over its
 * own extremes, so the labels are what make the magnitudes readable.
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
 * Translated. `LabelsProvider` sets the locale that the hidden table of values is formatted in.
 * The axis labels are yours, so translate them where you write them.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider locale="fr-FR">
            <SparklineRow label="Stabilization de la disposition" values={SETTLING} minLabel="Pas 1" maxLabel="Pas 20" />
        </LabelsProvider>
    ),
};

/**
 * Right to left. The first value moves to the right-hand edge, so the line still runs from the
 * start of the axis to its end and reads the same way as the labels flanking it.
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
