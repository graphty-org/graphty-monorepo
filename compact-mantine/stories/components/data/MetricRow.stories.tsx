import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { LabelsProvider, MetricRow, PANEL_GRID, PANEL_INK } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * One reading, with a bar for where it falls in its distribution and a chip for its rank.
 *
 * It replaces two lines of prose -- `0.31, 98th percentile` and `Rank 6 of 318` -- with one
 * row: the name, a 64px bar filled to the percentile, the number itself, and a rank chip. Stack
 * several and the outlier shows in the bars before any number has been read.
 *
 * ## When to use it
 *
 * Reach for MetricRow for a reading that has a percentile (and optionally a rank). Reach for
 * `DataRow` for a reading with no distribution behind it, for `HistogramRow` to draw the whole
 * distribution rather than one point in it, and for `SparklineRow` for a series over time.
 *
 * ## Usage
 *
 * ```tsx
 * import { MetricRow, useNumberFormatter } from "@graphty/compact-mantine";
 *
 * const formatter = useNumberFormatter({ maximumFractionDigits: 2 });
 *
 * <MetricRow name="Bridges" percentile={98} value={formatter.format(0.31)} rank="#6" busy={computing} />
 * ```
 *
 * `percentile` runs 0 to 100 and is clamped outside that range. `value` is required and drawn as
 * given, so format it for the reader's locale first. `rank` is the only optional member: pass the
 * content (`"#6"`), not a `RankChip`.
 *
 * ## Keyboard and accessibility
 *
 * - The bar is a `progressbar` named by the metric. Its value is announced as an ordinal ("98th
 *   percentile"), spelled by the active locale's plural rules, never as "98%".
 * - With `onClick` the row is a button: Tab reaches it, Enter and Space activate it. The handler
 *   receives the event and whether a pointer or the keyboard activated it.
 * - The row is a live region when `busy` is given; `busy={true}` holds the announcement back
 *   until the computation finishes, so the result is heard once.
 * - A long name ellipsises for the eye and stays whole for a screen reader.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 32px (`PANEL_GRID.ROW_PITCH`) |
 * | Bar | 64 x 4, radius 2 |
 * | Bar colour | accent fill on the field-surface track |
 * | Name and value | 11/16 at weight 450 |
 * | Rank | a `RankChip` (16px) |
 */
const meta: Meta<typeof MetricRow> = {
    title: "Components/Data display/MetricRow",
    component: MetricRow,
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
type Story = StoryObj<typeof MetricRow>;

/** One metric near the top of its distribution. Edit it in the Controls table. */
export const Default: Story = {
    args: {
        name: "Bridges",
        percentile: 98,
        value: "0.31",
        rank: "#6",
    },
};

/** Every state, light and dark side by side: high, low, without a rank, and still computing. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="High" padded>
                <MetricRow name="Bridges" percentile={98} value="0.31" rank="#1" />
            </StoryState>
            <StoryState name="Low" padded>
                <MetricRow name="Leaf" percentile={3} value="0.01" rank="#20" />
            </StoryState>
            <StoryState name="No rank" padded>
                <MetricRow name="Hub" percentile={60} value="0.12" />
            </StoryState>
            <StoryState name="Busy" padded>
                <MetricRow name="Betweenness" percentile={0} value="--" busy />
            </StoryState>
        </StoryStates>
    ),
};

/**
 * Four metrics stacked with no gap: the pitch is built into the row, and space between rows would
 * break the column the bars form. Read down the bars and the outlier is visible first.
 */
export const AStack: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <MetricRow name="Age" percentile={62} value="7" rank="#8" />
            <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
            <MetricRow name="Betweenness" percentile={41} value="0.04" rank="#12" />
            <MetricRow name="Clustering" percentile={12} value="0.08" rank="#204" />
        </Stack>
    ),
};

/** The ends of the range. A percentile of 0 still draws the track, so the row keeps its shape; 100 fills it. */
export const TheEnds: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <MetricRow name="Lowest" percentile={0} value="0.00" rank="#318" />
            <MetricRow name="Middle" percentile={50} value="0.12" rank="#159" />
            <MetricRow name="Highest" percentile={100} value="0.94" rank="#1" />
        </Stack>
    ),
};

/**
 * Still being computed. `busy` holds the announcement back until the computation finishes, and
 * the row keeps its pitch so the panel does not jump when the number arrives.
 */
export const Busy: Story = {
    args: {
        name: "Betweenness",
        percentile: 0,
        value: "--",
        busy: true,
    },
};

/**
 * A name too long for the row. The ellipsis is a drawing only: the whole name stays in the
 * document, so a screen reader reads it in full, and the pointer gets it as a tooltip.
 */
export const ALongName: Story = {
    args: {
        name: "Betweenness centrality, normalised over the largest component",
        percentile: 41,
        value: "0.04",
        rank: "#12",
    },
};

/**
 * Clickable. `onClick` makes the row a button; the handler receives the event (modifier keys,
 * `preventDefault`) and whether a pointer or the keyboard activated it. Click a row, Shift-click
 * one, or Tab to one and press Enter.
 */
export const Clickable: Story = {
    render: function ClickableStory(): React.JSX.Element {
        const [reading, setReading] = useState("Click, Shift-click, or Tab to a row and press Enter.");

        return (
            <Stack gap={PANEL_GRID.GUTTER}>
                <Stack gap={0}>
                    {[
                        { name: "Age", percentile: 62, value: "7" },
                        { name: "Bridges", percentile: 98, value: "0.31" },
                        { name: "Betweenness", percentile: 41, value: "0.04" },
                    ].map((metric) => (
                        <MetricRow
                            key={metric.name}
                            name={metric.name}
                            percentile={metric.percentile}
                            value={metric.value}
                            onClick={(event, activation): void => {
                                const extend = event.shiftKey ? ", extending the selection" : "";
                                setReading(`${metric.name} from the ${activation.source}${extend}`);
                            }}
                        />
                    ))}
                </Stack>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    {reading}
                </Text>
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: /Bridges/ }));
        await expect(canvas.getByText("Bridges from the pointer")).toBeInTheDocument();
    },
};

/**
 * Translated. `LabelsProvider` supplies the locale and replaces the library's strings. The
 * percentile is spelled by the locale's plural rules: French marks only the first ordinal, so 98
 * is "98e" and 1 is "1er". Both are announced, not drawn.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider
            locale="fr-FR"
            labels={{
                ordinal: (value, rule) => (rule === "one" ? `${value}er` : `${value}e`),
                percentile: (ordinal) => `${ordinal} centile`,
            }}
        >
            <Stack gap={0}>
                <MetricRow name="Ponts" percentile={98} value="0,31" rank="#6" />
                <MetricRow name="Intermediarite" percentile={1} value="0,04" rank="#318" />
            </Stack>
        </LabelsProvider>
    ),
};

/**
 * Right to left. The name leads from the right, the bar fills leftwards from its own leading edge,
 * and the value and chip trail at the left. `dir="rtl"` and Mantine's `DirectionProvider`, the
 * two things a right-to-left app sets anyway, are all it takes.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={0}>
                    <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
                    <MetricRow name="Betweenness" percentile={20} value="0.04" rank="#12" />
                </Stack>
            </Box>
        </DirectionProvider>
    ),
};
