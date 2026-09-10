import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useState } from "react";

import {
    DataRow,
    DataRowHeader,
    PANEL_GRID,
    PANEL_INK,
    useCollator,
} from "../src";
import type { DataRowSortDirection } from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * The 20px caption above a run of data rows, optionally a sort control.
 *
 * It exists to carry the one word the rows below must not repeat. When three or
 * more rows measure the same thing, the unit goes here once -- "links" above the
 * column -- and each row then prints a bare `4` instead of `4 links`. The
 * trailing edge of the column becomes a set of numbers a reader can compare
 * downwards, instead of a ragged run of phrases they have to re-read.
 *
 * Both halves are drawn small and quiet, because a caption is furniture rather
 * than content. The exception is the name of the column the list is actually
 * sorted by, which is drawn in the primary text colour: that is how a reader
 * sees at a glance what order they are looking at.
 *
 * Give it `onSortChange` and the caption becomes a button. Activating it cycles
 * between ascending and descending, draws the direction as an arrow, and reports
 * it as `aria-sort`.
 *
 * **`aria-sort` is only read out inside a table.** It is defined on a column
 * header in a table or a grid, so if you want a screen reader to announce the
 * order, wrap the caption and its rows in an element with `role="table"` and
 * give each row `role="row"`. Above a plain list the arrow is a drawing only,
 * and a reader who cannot see it learns the order changed only if you say so
 * yourself -- with a live region, or by moving focus to the reordered list.
 */
const meta: Meta<typeof DataRowHeader> = {
    title: "Showing Data/DataRowHeader",
    component: DataRowHeader,
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
type Story = StoryObj<typeof DataRowHeader>;

/**
 * Whether the gesture that asked for the sort was held with Shift.
 *
 * A change handler is given a `SyntheticEvent`, which says nothing about
 * modifier keys until you look at the native event underneath it. This is how to
 * read Shift without asserting a type.
 * @param event - The event that asked for the change, if there was one
 * @returns True when Shift was held
 */
function heldShift(event?: React.SyntheticEvent): boolean {
    const native = event?.nativeEvent;
    if (native instanceof MouseEvent || native instanceof KeyboardEvent) {
        return native.shiftKey;
    }
    return false;
}

/** Five nodes and how many links each one has. */
const NODES = [
    {name: "Mr_Whiskers", links: 12},
    {name: "Bramble", links: 9},
    {name: "Tiptoe", links: 7},
    {name: "Mittens", links: 4},
    {name: "Marmalade", links: 4},
    {name: "Pepper", links: 2},
];

/**
 * A caption and the rows it heads. The unit is written once, at the top, and
 * every row below prints a bare number.
 */
export const Default: Story = {
    render: (): React.JSX.Element => (
        <Box>
            <DataRowHeader label="Most connected" unit="links" />
            {NODES.map((node) => (
                <DataRow key={node.name} name={node.name} value={node.links} />
            ))}
        </Box>
    ),
};

/**
 * The same rows without a caption, for comparison. Every row now has to carry
 * the unit itself, the numbers no longer share a column, and the eye has to read
 * each phrase rather than scan a list.
 *
 * This is the case the caption exists to prevent.
 */
export const WithoutTheCaption: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.PAD_LEFT}>
            <Box>
                <Text size="xs" c={PANEL_INK.CHROME} mb={4}>
                    With a caption
                </Text>
                <DataRowHeader label="Most connected" unit="links" />
                {NODES.map((node) => (
                    <DataRow key={node.name} name={node.name} value={node.links} />
                ))}
            </Box>
            <Box>
                <Text size="xs" c={PANEL_INK.CHROME} mb={4}>
                    Without one
                </Text>
                {NODES.map((node) => (
                    <DataRow key={node.name} name={node.name} value={`${String(node.links)} links`} />
                ))}
            </Box>
        </Stack>
    ),
};

/**
 * A caption with no unit, which is the right shape when the rows are not all
 * measuring the same thing: a list of attributes, a list of files.
 */
export const WithoutAUnit: Story = {
    render: (): React.JSX.Element => (
        <Box>
            <DataRowHeader label="Attributes" />
            <DataRow name="community" value="12 values" />
            <DataRow name="degree" value="1 to 12" />
            <DataRow name="label" value="318 values" />
        </Box>
    ),
};

/**
 * Sortable. Passing `onSortChange` turns the caption into a button: click it, or
 * press Enter or Space on it, to reverse the order.
 *
 * Two nodes here have the same number of links, and the tie is broken with
 * `useCollator()` from this package, which compares strings the way the reader's
 * own language does. A bare `a < b`, or `localeCompare` with no locale, gets
 * accented and non-Latin text wrong.
 *
 * The caption and its rows are wrapped in a `role="table"` so that `aria-sort`
 * is actually announced; above a plain list it would be written but never read
 * out.
 */
export const Sortable: Story = {
    render: function SortableStory(): React.JSX.Element {
        const [direction, setDirection] = useState<DataRowSortDirection>("descending");
        const collator = useCollator({numeric: true});

        const rows = useMemo(
            () =>
                [...NODES].sort((a, b) => {
                    const byLinks = direction === "descending" ? b.links - a.links : a.links - b.links;
                    return byLinks === 0 ? collator.compare(a.name, b.name) : byLinks;
                }),
            [collator, direction],
        );

        return (
            <Box role="table" aria-label="Nodes by number of links">
                <Box role="row">
                    <DataRowHeader
                        label="Most connected"
                        unit="links"
                        sortDirection={direction}
                        onSortChange={(next): void => setDirection(next)}
                    />
                </Box>
                {rows.map((node) => (
                    <Box key={node.name} role="row">
                        <DataRow name={node.name} value={node.links} />
                    </Box>
                ))}
                <Text size="xs" c={PANEL_INK.CHROME} mt="xs">
                    Sorted {direction}, ties broken by name in {collator.resolvedOptions().locale}.
                </Text>
            </Box>
        );
    },
};

/**
 * Several columns sorted at once.
 *
 * `sortPriority` draws a small number beside the arrow saying where this column
 * comes in the order, counting from one. The number is formatted for the active
 * locale.
 *
 * Shift-activating a caption is the usual way to add a column to the existing
 * sort rather than replace it; the event handed to `onSortChange` carries
 * `shiftKey`, so that behaviour is yours to write. Shift-click a caption below.
 */
export const MultipleColumns: Story = {
    render: function MultipleColumnsStory(): React.JSX.Element {
        const [order, setOrder] = useState<{id: string; direction: DataRowSortDirection}[]>([
            {id: "links", direction: "descending"},
            {id: "name", direction: "ascending"},
        ]);

        const change = (id: string, direction: DataRowSortDirection, add: boolean): void => {
            setOrder((current) => {
                const without = current.filter((entry) => entry.id !== id);
                return add ? [...without, {id, direction}] : [{id, direction}];
            });
        };

        const priority = (id: string): number | undefined => {
            const index = order.findIndex((entry) => entry.id === id);
            return index === -1 || order.length < 2 ? undefined : index + 1;
        };

        const direction = (id: string): DataRowSortDirection =>
            order.find((entry) => entry.id === id)?.direction ?? "none";

        return (
            <Stack gap={PANEL_GRID.GUTTER}>
                <DataRowHeader
                    label="Most connected"
                    unit="links"
                    sortDirection={direction("links")}
                    sortPriority={priority("links")}
                    onSortChange={(next, event): void => change("links", next, heldShift(event))}
                />
                <DataRowHeader
                    label="Name"
                    sortDirection={direction("name")}
                    sortPriority={priority("name")}
                    onSortChange={(next, event): void => change("name", next, heldShift(event))}
                />
                <Text size="xs" c={PANEL_INK.CHROME}>
                    {order.map((entry) => `${entry.id} ${entry.direction}`).join(", then ")}
                </Text>
            </Stack>
        );
    },
};

/**
 * Right to left. The caption's name leads from the right, its unit trails at the
 * left, and the sort arrow follows the text direction.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <DataRowHeader label="Most connected" unit="links" defaultSortDirection="descending" />
                {NODES.map((node) => (
                    <DataRow key={node.name} name={node.name} value={node.links} />
                ))}
            </Box>
        </DirectionProvider>
    ),
};
