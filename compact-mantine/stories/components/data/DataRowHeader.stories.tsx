import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useMemo, useState } from "react";

import { DataRow, DataRowHeader, type DataRowSortDirection, PANEL_GRID, PANEL_INK, useCollator } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * The caption above a run of data rows, and optionally the control that sorts them.
 *
 * It carries the one word the rows below must not repeat. When three or more rows measure the
 * same thing the unit goes here once -- "links" above the column -- and each row prints a bare
 * `4` instead of `4 links`, so the trailing edge becomes a column of numbers a reader compares by
 * scanning. Both halves are small and quiet, because a caption is chrome rather than content;
 * the name of the column the list is sorted by is drawn in the primary text color, so a reader
 * sees at a glance which order they are looking at.
 *
 * ## When to use it
 *
 * Reach for DataRowHeader above a run of `DataRow`s (or `MetricRow`s) that share a unit or a sort.
 * Reach for `ControlSection` when you need a section heading that folds, and for `DataTable` when
 * the rows have several columns each, where every column header sorts on its own.
 *
 * ## Usage
 *
 * ```tsx
 * import { DataRow, DataRowHeader, type DataRowSortDirection } from "@graphty/compact-mantine";
 *
 * const [sort, setSort] = useState<DataRowSortDirection>("descending");
 *
 * <div role="table" aria-label="Nodes by number of links">
 *     <div role="row">
 *         <DataRowHeader label="Most connected" unit="links" sortDirection={sort} onSortChange={setSort} />
 *     </div>
 *     {rows.map((row) => (
 *         <div key={row.id} role="row"><DataRow name={row.label} value={row.links} /></div>
 *     ))}
 * </div>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - Without `onSortChange` the caption is plain text.
 * - With `onSortChange` it becomes a `<button>`: Enter, Space or a click toggles between
 *   ascending and descending. Returning to unsorted is yours to set: a panel's list is always in
 *   some order.
 * - The direction is reported as `aria-sort` on a `columnheader`. `aria-sort` is read out only
 *   inside a table or grid, so wrap the caption and its rows in `role="table"` with each in a
 *   `role="row"`, as `Sortable` does. Above a plain list the arrow is a drawing only.
 * - `onSortChange` receives the event, so read `shiftKey` to add a column to the sort.
 * - `sortPriority` draws a chip for the eye only; each column announces its own direction.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 32px |
 * | Label and unit | 11/16 at weight 550, secondary text color (the sorted column's label in the primary color) |
 * | Sort caret | 5 x 3 |
 * | Sort priority | a `RankChip` beside the caret |
 */
const meta: Meta<typeof DataRowHeader> = {
    title: "Components/Data display/DataRowHeader",
    component: DataRowHeader,
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
type Story = StoryObj<typeof DataRowHeader>;

/**
 * Whether the gesture that asked for the sort was held with Shift.
 *
 * A change handler is given a `SyntheticEvent`, which says nothing about modifier keys until you
 * look at the native event underneath it. This is how to read Shift without asserting a type.
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

/** Six nodes and how many links each one has. */
const NODES = [
    { name: "Mr_Whiskers", links: 12 },
    { name: "Bramble", links: 9 },
    { name: "Tiptoe", links: 7 },
    { name: "Mittens", links: 4 },
    { name: "Marmalade", links: 4 },
    { name: "Pepper", links: 2 },
];

/** A caption with a unit. Edit the label, the unit and the sort in the Controls table. */
export const Default: Story = {
    args: {
        label: "Most connected",
        unit: "links",
    },
};

/**
 * Every state, light and dark side by side: a plain caption, sortable but unsorted, descending,
 * ascending, and second in a sort by two columns.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={0}>
            <DataRowHeader label="Plain caption" unit="links" />
            <DataRowHeader label="Sortable, unsorted" unit="links" onSortChange={() => undefined} />
            <DataRowHeader label="Descending" unit="links" sortDirection="descending" onSortChange={() => undefined} />
            <DataRowHeader label="Ascending" unit="links" sortDirection="ascending" onSortChange={() => undefined} />
            <DataRowHeader
                label="Second in the sort"
                unit="hops"
                sortDirection="descending"
                sortPriority={2}
                onSortChange={() => undefined}
            />
        </Stack>
    ),
};

/**
 * The same rows with and without a caption. Without one, every row carries the unit itself, the
 * numbers no longer share a column, and the eye reads each phrase instead of scanning a list.
 */
export const WithoutTheCaption: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.PAD_LEFT}>
            <Box>
                <Text size="xs" c={PANEL_INK.CHROME} mb={4} px={PANEL_GRID.PAD_LEFT}>
                    With a caption
                </Text>
                <DataRowHeader label="Most connected" unit="links" />
                {NODES.map((node) => (
                    <DataRow key={node.name} name={node.name} value={node.links} />
                ))}
            </Box>
            <Box>
                <Text size="xs" c={PANEL_INK.CHROME} mb={4} px={PANEL_GRID.PAD_LEFT}>
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
 * A caption with no unit, the right shape when the rows are not all measuring the same thing: a
 * list of attributes, a list of files.
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
 * Sortable, inside a `role="table"` so `aria-sort` is announced. Click the caption, or press
 * Enter or Space on it, to reverse the order. Ties are broken with `useCollator()`, which compares
 * strings the way the reader's own language does.
 */
export const Sortable: Story = {
    render: function SortableStory(): React.JSX.Element {
        const [direction, setDirection] = useState<DataRowSortDirection>("descending");
        const collator = useCollator({ numeric: true });

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
                        onSortChange={(next): void => {
                            setDirection(next);
                        }}
                    />
                </Box>
                {rows.map((node) => (
                    <Box key={node.name} role="row">
                        <Box role="cell">
                            <DataRow name={node.name} value={node.links} />
                        </Box>
                    </Box>
                ))}
                <Text size="xs" c={PANEL_INK.CHROME} mt="xs" px={PANEL_GRID.PAD_LEFT}>
                    Sorted {direction}, ties broken by name.
                </Text>
            </Box>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const header = canvas.getByRole("columnheader");
        await expect(header).toHaveAttribute("aria-sort", "descending");
        await userEvent.click(canvas.getByRole("button", { name: /Most connected/ }));
        await expect(header).toHaveAttribute("aria-sort", "ascending");
        await userEvent.click(canvas.getByRole("button", { name: /Most connected/ }));
        await expect(header).toHaveAttribute("aria-sort", "descending");
    },
};

/**
 * Several columns sorted at once. `sortPriority` draws where each column comes in the order,
 * formatted for the active locale. Shift-activating a caption adds it to the sort rather than
 * replacing it; that rule is yours to write, from the event `onSortChange` receives.
 */
export const MultipleColumns: Story = {
    render: function MultipleColumnsStory(): React.JSX.Element {
        const [order, setOrder] = useState<{ id: string; direction: DataRowSortDirection }[]>([
            { id: "links", direction: "descending" },
            { id: "name", direction: "ascending" },
        ]);

        const change = (id: string, direction: DataRowSortDirection, add: boolean): void => {
            setOrder((current) => {
                const without = current.filter((entry) => entry.id !== id);
                return add ? [...without, { id, direction }] : [{ id, direction }];
            });
        };

        const priority = (id: string): number | undefined => {
            const index = order.findIndex((entry) => entry.id === id);
            return index === -1 || order.length < 2 ? undefined : index + 1;
        };

        const direction = (id: string): DataRowSortDirection =>
            order.find((entry) => entry.id === id)?.direction ?? "none";

        return (
            <Stack gap={0}>
                <DataRowHeader
                    label="Most connected"
                    unit="links"
                    sortDirection={direction("links")}
                    sortPriority={priority("links")}
                    onSortChange={(next, event): void => {
                        change("links", next, heldShift(event));
                    }}
                />
                <DataRowHeader
                    label="Name"
                    sortDirection={direction("name")}
                    sortPriority={priority("name")}
                    onSortChange={(next, event): void => {
                        change("name", next, heldShift(event));
                    }}
                />
                <Text size="xs" c={PANEL_INK.CHROME} mt="xs" px={PANEL_GRID.PAD_LEFT}>
                    {order.map((entry) => `${entry.id} ${entry.direction}`).join(", then ")}
                </Text>
            </Stack>
        );
    },
};

/**
 * Right to left. The caption's name leads from the right, its unit trails at the left, and the
 * sort caret follows the text.
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
