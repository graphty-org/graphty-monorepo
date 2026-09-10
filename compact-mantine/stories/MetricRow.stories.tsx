import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import {
    LabelsProvider,
    MetricRow,
    PANEL_GRID,
    PANEL_INK,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * One reading, with a bar for where it falls in its distribution and a chip for
 * its rank.
 *
 * This is the row that replaces two lines of prose -- `0.31, 98th percentile`
 * and `Rank 6 of 318` -- with one: the name, a 64px bar filled to the
 * percentile, the number itself, and a rank chip. Stack several and the outlier
 * is visible in the bars before any of the numbers have been read.
 *
 * **What to pass**
 *
 * - `name` -- the metric's own name. Shortened with an ellipsis when the row is
 *   too narrow, and always readable in full to a screen reader.
 * - `percentile` -- 0 to 100. Values outside that range are clamped rather than
 *   drawn off the end of the bar.
 * - `value` -- the number itself, drawn beside the bar. **Format it yourself for
 *   the reader's locale** before passing it in; `useNumberFormatter()` from this
 *   package is the short way. A chart never removes the last route to the figure
 *   it draws, which is why the number is not optional.
 * - `rank` -- optional, and the only optional member of the row. Pass the
 *   content, such as `"#6"`, not a chip.
 *
 * **What it does for a screen reader.** The bar is a progress bar named by the
 * metric, and its value is announced as an ordinal -- "98th percentile" -- and
 * not as "98%", which would be a claim about a different quantity. The ordinal
 * is spelled by the active locale's own plural rules.
 */
const meta: Meta<typeof MetricRow> = {
    title: "Showing Data/MetricRow",
    component: MetricRow,
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
type Story = StoryObj<typeof MetricRow>;

/** One metric: a high value, near the top of its distribution. */
export const Default: Story = {
    args: {
        name: "Bridges",
        percentile: 98,
        value: "0.31",
        rank: "#6",
    },
};

/**
 * Three metrics at one row pitch each. Read down the bars and the outlier is
 * visible before any of the numbers have been.
 *
 * The rows are stacked with no gap: the pitch is built into the row, and adding
 * space between them breaks the column the bars form.
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

/**
 * The ends of the range. A percentile of 0 still draws a bar track, so the row
 * keeps its shape; a percentile of 100 fills it.
 */
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
 * Without a rank. The chip is the only optional member of the row; the name, the
 * bar and the value are not.
 */
export const WithoutARank: Story = {
    args: {
        name: "Age",
        percentile: 62,
        value: "7",
    },
};

/**
 * Still being computed. `busy` marks the row as busy for assistive technology,
 * which holds the announcement of the reading back until the computation
 * finishes -- so a screen reader hears the result once instead of hearing every
 * intermediate frame of it.
 *
 * The row keeps its pitch while it waits, so the panel does not jump when the
 * number arrives.
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
 * A name too long for 280px. The ellipsis is a drawing only: the whole name
 * stays in the document, so a screen reader reads it in full, and a tooltip
 * carries it to the reader the ellipsis hides it from.
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
 * Clickable. Supplying `onClick` makes the row a real button: focusable, with a
 * pointer cursor, answering Enter and Space.
 *
 * The handler receives the event first, so modifier keys and `preventDefault()`
 * are available, and a second argument saying whether the activation came from a
 * pointer or from the keyboard -- which is the distinction selection behaviour
 * usually turns on, because a keyboard activation carries no modifiers to extend
 * a range with.
 *
 * Click a row below, shift-click one, or tab to one and press Enter.
 */
export const Clickable: Story = {
    render: function ClickableStory(): React.JSX.Element {
        const [reading, setReading] = useState("Click, shift-click, or tab to a row and press Enter.");

        return (
            <Stack gap={PANEL_GRID.GUTTER}>
                <Stack gap={0}>
                    {[
                        {name: "Age", percentile: 62, value: "7"},
                        {name: "Bridges", percentile: 98, value: "0.31"},
                        {name: "Betweenness", percentile: 41, value: "0.04"},
                    ].map((metric) => (
                        <MetricRow
                            key={metric.name}
                            name={metric.name}
                            percentile={metric.percentile}
                            value={metric.value}
                            onClick={(event, meta): void => {
                                const extend = event.shiftKey ? ", extending the selection" : "";
                                setReading(`${metric.name} from the ${meta.source}${extend}`);
                            }}
                        />
                    ))}
                </Stack>
                <Text size="sm" c={PANEL_INK.CHROME}>
                    {reading}
                </Text>
            </Stack>
        );
    },
};

/**
 * Translated. `LabelsProvider` supplies the locale that numbers and ordinals are
 * formatted in, and replaces any string the library produces.
 *
 * The percentile is spelled by the locale's own plural rules rather than by
 * English grammar: French marks only the first ordinal, so 98 is "98e" while 1
 * would be "1er". Both are announced, not drawn -- the row itself never writes
 * the word "percentile" on the screen.
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
 * Right to left. The name leads from the right, the bar fills leftwards from its
 * own leading edge, and the value and chip trail at the left.
 *
 * Two things produce this, and they are the two a right-to-left application sets
 * anyway: `dir="rtl"`, usually on the document, and Mantine's
 * `DirectionProvider` so a component can read the direction from JavaScript.
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
