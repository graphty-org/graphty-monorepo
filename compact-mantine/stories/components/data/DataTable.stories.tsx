import { Badge, Box, Button, Checkbox, Code, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useRef, useState } from "react";

import {
    DataTable,
    type DataTableColumn,
    type DataTableHandle,
    type DataTableSort,
    LabelsProvider,
    PANEL_GRID,
    PANEL_INK,
} from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A compact, virtualized data table: sortable columns, a search across them, a selection, and
 * full keyboard operation, for several columns of values over thousands of rows.
 *
 * It draws only the rows the scrolling area can show, so about a dozen rows are in the document
 * whether there are fifty of them or fifty thousand. The arrangement -- sorting, selection, hidden
 * columns, column order, search -- can each be left to the table or held in your own state.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **DataTable** | Several columns per row, or more rows than a panel can hold, that a reader sorts, searches and picks from. |
 * | `DataRow` | One string and one number per row in a panel: "the ten most connected nodes". |
 * | `Tree` / `PageList` | Objects the reader selects, renames and reorders. |
 *
 * ## Usage
 *
 * ```tsx
 * import { DataTable, type DataTableColumn } from "@graphty/compact-mantine";
 *
 * const columns: DataTableColumn<GraphNode>[] = [
 *     { id: "label", header: "Node", value: (node) => node.label, width: 150 },
 *     { id: "degree", header: "Links", value: (node) => node.degree, align: "end", width: 64 },
 * ];
 *
 * <DataTable
 *     columns={columns}
 *     data={nodes}
 *     getRowId={(node) => node.id}
 *     label="Nodes"
 *     searchable
 *     height={320}
 *     selectedIds={selection}
 *     onSelectionChange={setSelection}
 * />
 * ```
 *
 * - **Sorting.** A header sorts by its column, again reverses it, and a third time returns to the
 *   natural order. Words start A to Z, numbers largest first. Shift adds a column to the sort; the
 *   number beside each caret is its place in the sort. Words are compared with a collator for the
 *   reader's language.
 * - **Searching.** One box searches every visible column and matches the text a reader sees: a
 *   value drawn as `1,024` is found by typing `1,024`. A hidden column is not searched.
 * - **Selecting.** A click selects one row, Shift extends from the last row clicked, Command or
 *   Control toggles one. `selectionMode="single"` ignores the modifiers.
 * - **Drawn cells.** A column's `cell` draws anything; sorting and search still use its `value`.
 *
 * ## Keyboard and accessibility
 *
 * - The ARIA grid pattern. Tab moves into and out of the whole table, not through every cell.
 * - Arrow keys move between cells; Home and End reach the ends of a row, and with Control the ends
 *   of the table; Page Up and Page Down move a screenful.
 * - Space selects the focused row, Shift with an arrow grows the selection, Control+A selects
 *   everything on show, Enter opens the row (`onRowClick`).
 * - The table reports its row and column counts and numbers every drawn row, so a reader hears
 *   "row 40 of 4,000" with forty rows in the document. Sorted columns carry `aria-sort`, selected
 *   rows `aria-selected`, and a change in the number of rows shown is announced.
 * - Right to left, the columns and the arrow keys run the other way.
 * - Every string comes from `LabelsProvider`; numbers and dates follow its locale.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Header row | 40px, 11/16 at weight 600, primary text color |
 * | Data rows | 40px (`rowHeight`), 11/16 at weight 450 |
 * | Cell padding | 0 16 in the first column, 0 8 elsewhere |
 * | Grid lines | 1px `--cm-border` outline on every cell |
 * | Hover | no tint |
 * | Selected row | every cell `--cm-bg-selected` |
 * | Keyboard cell | 1px `--cm-border-selected` box drawn inside the cell |
 * | Sort caret | 5 x 3 after the header label |
 */
const meta: Meta<typeof DataTable> = {
    title: "Components/Data display/DataTable",
    component: DataTable,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        columns: { control: false },
        data: { control: false },
        getRowId: { control: false },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** One row of the demo data: a node of a graph, with the numbers that describe it. */
interface GraphNode {
    /** The node's own identifier, which is the reader's string rather than ours. */
    id: string;
    /** The reader's label for the node. */
    label: string;
    /** How many links the node has. */
    degree: number;
    /** How much of the shortest-path traffic runs through it, from 0 to 1. */
    betweenness: number;
    /** Which cluster the node was assigned to. */
    community: string;
    /** What kind of thing the node stands for. */
    kind: "person" | "place" | "event";
    /** When the node was last touched. */
    updated: Date;
    /** Whether the node is pinned in place. */
    pinned: boolean;
}

const FIRST = ["Ada", "Grace", "Alan", "Katherine", "Edsger", "Barbara", "Tony", "Radia", "\u00C4rger", "Zoe"];
const LAST = ["Lovelace", "Hopper", "Turing", "Johnson", "Dijkstra", "Liskov", "Hoare", "Perlman", "Ostrom", "Curie"];
const KINDS: GraphNode["kind"][] = ["person", "place", "event"];

/**
 * Builds a run of plausible nodes.
 *
 * The numbers come from a fixed sequence rather than from `Math.random`, so the
 * story draws the same table every time and the visual regression run has
 * something stable to compare against.
 * @param count - How many nodes to build
 * @returns The nodes, in no particular order
 */
function makeNodes(count: number): GraphNode[] {
    let seed = 20260904;

    /**
     * The next number in the fixed sequence, between 0 and 1.
     * @returns A number between 0 and 1
     */
    const next = (): number => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };

    return Array.from({ length: count }, (_, index) => {
        const first = FIRST[Math.floor(next() * FIRST.length)];
        const last = LAST[Math.floor(next() * LAST.length)];

        return {
            id: `n${String(index)}`,
            label: `${first} ${last}`,
            degree: Math.floor(next() * 240),
            betweenness: Math.round(next() * 1000) / 1000,
            community: `Cluster ${String(1 + Math.floor(next() * 8))}`,
            kind: KINDS[Math.floor(next() * KINDS.length)],
            updated: new Date(2026, 0, 1 + Math.floor(next() * 240)),
            pinned: next() > 0.85,
        };
    });
}

const NODES = makeNodes(600);

const COLUMNS: DataTableColumn<GraphNode>[] = [
    { id: "label", header: "Node", value: (node) => node.label, width: 150 },
    { id: "degree", header: "Links", value: (node) => node.degree, align: "end", width: 64 },
    { id: "betweenness", header: "Between", value: (node) => node.betweenness, align: "end", width: 80 },
    { id: "community", header: "Cluster", value: (node) => node.community, width: 96 },
    { id: "kind", header: "Kind", value: (node) => node.kind, width: 80 },
    { id: "updated", header: "Updated", value: (node) => node.updated, width: 100 },
    { id: "pinned", header: "Pinned", value: (node) => node.pinned, width: 64 },
];

/**
 * A frame the width a table wants, rather than the 280px a property panel gets.
 * @param root0 - Component props
 * @param root0.children - What to draw in the frame
 * @returns The frame
 */
function Frame({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <Box w={640} p="md" bg="var(--mantine-color-body)">
            <Stack gap={PANEL_GRID.TRAIL_GAP}>{children}</Stack>
        </Box>
    );
}

/**
 * A line of explanation under a story, in the secondary text color.
 * @param root0 - Component props
 * @param root0.children - The explanation
 * @returns The line
 */
function Note({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <Text size="sm" c={PANEL_INK.CHROME}>
            {children}
        </Text>
    );
}

/** One Figma Variables row: a name and a value per mode. */
interface Variable {
    id: string;
    name: string;
    light: string;
    dark: string;
}

const VARIABLES: Variable[] = [
    { id: "primary", name: "primary", light: "0D99FF", dark: "0C8CE9" },
    { id: "secondary", name: "secondary", light: "8738E5", dark: "D1A8FF" },
    { id: "tertiary", name: "tertiary", light: "14AE5C", dark: "198F51" },
    { id: "warning", name: "warning", light: "FFCD29", dark: "F3C11B" },
];

const VARIABLE_COLUMNS: DataTableColumn<Variable>[] = [
    { id: "name", header: "Name", value: (v) => v.name, width: 160 },
    { id: "light", header: "Light", value: (v) => v.light, width: 200 },
    { id: "dark", header: "Dark", value: (v) => v.dark, width: 200 },
];

/**
 * Six hundred nodes with a search box above them, sorted by how connected they are. Only the rows
 * the frame can show are in the document. Edit the height, search and selection mode in the
 * Controls table.
 */
export const Default: Story = {
    args: {
        label: "Nodes",
        searchable: true,
        height: 320,
        defaultSorting: [{ id: "degree", desc: true }],
    },
    render: (args) => (
        <Frame>
            <DataTable {...args} columns={COLUMNS} data={NODES} getRowId={(node) => node.id} />
            <Note>
                Six hundred rows; around a dozen of them are in the document at any moment. Click a header to sort,
                Shift-click a second one to sort by both.
            </Note>
        </Frame>
    ),
};

/**
 * Every state, light and dark side by side, on Figma's Variables table: the cell grid, the 40px
 * header, a selected row (every cell tinted), a sorted column with its caret, and the keyboard
 * cell's inside box (on the first body cell). Row hover adds no tint.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Box w={600} bg="var(--cm-bg)">
            <DataTable
                columns={VARIABLE_COLUMNS}
                data={VARIABLES}
                getRowId={(v) => v.id}
                label="Variables"
                height={220}
                defaultSelectedIds={["secondary"]}
                defaultSorting={[{ id: "name", desc: false }]}
            />
        </Box>
    ),
    play: async ({ canvasElement }) => {
        const grid = canvasElement.querySelector<HTMLElement>('[role="grid"]');
        const first = canvasElement.querySelector<HTMLElement>('[role="gridcell"]');
        grid?.focus();
        first?.focus();
        first?.setAttribute("data-state", "focus");
    },
};

/**
 * Sorting by several columns at once. The sort is held outside the table, so
 * the story can show you what it looks like.
 */
export const Sorting: Story = {
    render: function SortingStory() {
        const [sorting, setSorting] = useState<DataTableSort[]>([{ id: "community", desc: false }]);

        return (
            <Frame>
                <DataTable
                    columns={COLUMNS}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes by cluster"
                    height={280}
                    sorting={sorting}
                    onSortingChange={setSorting}
                />
                <Code block>{JSON.stringify(sorting)}</Code>
                <Note>
                    Shift-click a second header to add it to the sort rather than replace it. A third activation of a
                    column clears it. The small number beside each arrow is where that column comes in the sort.
                </Note>
            </Frame>
        );
    },
};

/**
 * A selection held outside the table, the way an app that selects the same
 * things in a canvas and in a panel would hold it.
 */
export const Selection: Story = {
    render: function SelectionStory() {
        const [selected, setSelected] = useState<string[]>(["n3", "n4"]);
        const labels = useMemo(
            () => NODES.filter((node) => selected.includes(node.id)).map((node) => node.label),
            [selected],
        );

        return (
            <Frame>
                <DataTable
                    columns={COLUMNS}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes"
                    height={280}
                    selectedIds={selected}
                    onSelectionChange={setSelected}
                />
                <Note>
                    Click a row to select it, Shift-click to extend, Command or Control-click to add and remove. From
                    the keyboard: Space selects, Shift with an arrow grows the selection, Control+A selects everything
                    on show.
                </Note>
                <Text size="sm">{labels.length === 0 ? "Nothing selected" : labels.join(", ")}</Text>
            </Frame>
        );
    },
};

/**
 * One row at a time, for a table that drives a single inspector.
 */
export const SingleSelection: Story = {
    render: function SingleSelectionStory() {
        const [selected, setSelected] = useState<string[]>([]);

        return (
            <Frame>
                <DataTable
                    columns={COLUMNS}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes"
                    height={224}
                    selectionMode="single"
                    selectedIds={selected}
                    onSelectionChange={setSelected}
                />
                <Note>The modifier keys are ignored: one row is selected at a time whatever a reader holds down.</Note>
            </Frame>
        );
    },
};

/**
 * Hiding and reordering columns from outside the table, with the arrangement
 * held in the story's own state.
 */
export const ColumnArrangement: Story = {
    render: function ColumnArrangementStory() {
        const [hidden, setHidden] = useState<string[]>(["betweenness", "updated"]);
        const [order, setOrder] = useState<string[]>([]);

        return (
            <Frame>
                <Group gap={PANEL_GRID.GUTTER}>
                    {COLUMNS.map((column) => (
                        <Checkbox
                            key={column.id}
                            size="xs"
                            label={column.header}
                            checked={!hidden.includes(column.id)}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;
                                setHidden((previous) =>
                                    checked
                                        ? previous.filter((id) => id !== column.id)
                                        : [...previous, column.id],
                                );
                            }}
                        />
                    ))}
                </Group>

                <Group gap={PANEL_GRID.GUTTER}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            setOrder(["kind", "community", "label"]);
                        }}
                    >
                        Kind first
                    </Button>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            setOrder([]);
                        }}
                    >
                        Natural order
                    </Button>
                </Group>

                <DataTable
                    columns={COLUMNS}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes"
                    searchable
                    height={252}
                    hiddenColumns={hidden}
                    onHiddenColumnsChange={setHidden}
                    columnOrder={order}
                    onColumnOrderChange={setOrder}
                />
                <Note>
                    A column left out of the order keeps its natural place after the ones that are in it, so a partial
                    order is enough to pull one column to the front. Hiding a column takes it out of the search too:
                    hide Cluster and then search for "Cluster 3".
                </Note>
            </Frame>
        );
    },
};

/**
 * A table that keeps its own arrangement, rearranged through its handle.
 */
export const RearrangedFromOutside: Story = {
    render: function RearrangedStory() {
        const handle = useRef<DataTableHandle>(null);

        return (
            <Frame>
                <Group gap={PANEL_GRID.GUTTER}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            handle.current?.setColumnHidden("betweenness", true);
                        }}
                    >
                        Hide Between
                    </Button>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            handle.current?.moveColumn("kind", 0);
                        }}
                    >
                        Kind first
                    </Button>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            handle.current?.scrollToRow(400);
                        }}
                    >
                        Reveal row 400
                    </Button>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            handle.current?.clearSelection();
                        }}
                    >
                        Clear selection
                    </Button>
                </Group>

                <DataTable ref={handle} columns={COLUMNS} data={NODES} getRowId={(node) => node.id} label="Nodes" height={252} />
                <Note>
                    A table whose arrangement you pass in as props needs none of this. The handle is for the other case:
                    a table that keeps its own arrangement, with your own columns menu beside it.
                </Note>
            </Frame>
        );
    },
};

/**
 * Columns that draw themselves. Sorting and searching still work on the value
 * behind the drawing.
 */
export const DrawnCells: Story = {
    render: () => {
        const columns: DataTableColumn<GraphNode>[] = [
            { id: "label", header: "Node", value: (node) => node.label, width: 150 },
            {
                id: "kind",
                header: "Kind",
                value: (node) => node.kind,
                width: 96,
                cell: (node) => (
                    <Badge size="xs" variant="light">
                        {node.kind}
                    </Badge>
                ),
            },
            {
                id: "degree",
                header: "Links",
                value: (node) => node.degree,
                align: "end",
                width: 140,
                cell: (node) => (
                    <Box style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.GUTTER, width: "100%" }}>
                        <Box
                            aria-hidden="true"
                            style={{
                                flex: "1 1 auto",
                                height: 4,
                                borderRadius: 2,
                                background: PANEL_INK.RAISED,
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                style={{
                                    width: `${String(Math.round((node.degree / 240) * 100))}%`,
                                    height: "100%",
                                    background: PANEL_INK.ACCENT,
                                }}
                            />
                        </Box>
                        <Box component="span" style={{ flex: "0 0 auto" }}>
                            {node.degree}
                        </Box>
                    </Box>
                ),
            },
            { id: "community", header: "Cluster", value: (node) => node.community, width: 96 },
        ];

        return (
            <Frame>
                <DataTable
                    columns={columns}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes"
                    searchable
                    height={280}
                    defaultSorting={[{ id: "degree", desc: true }]}
                />
                <Note>
                    A drawn cell is only the drawing. The column still reads a value for sorting and for searching, so
                    the bar sorts by its number and the badge is found by typing the word it shows.
                </Note>
            </Frame>
        );
    },
};

/**
 * Fifty thousand rows. The table draws the same dozen of them as six hundred
 * would.
 */
export const LargeDataset: Story = {
    render: () => {
        const many = makeNodes(50000);

        return (
            <Frame>
                <DataTable
                    columns={COLUMNS}
                    data={many}
                    getRowId={(node) => node.id}
                    label="Nodes"
                    searchable
                    height={320}
                />
                <Note>
                    Sorting and searching run over all fifty thousand rows; the drawing never grows. The count beside
                    the search box says how many rows the search left.
                </Note>
            </Frame>
        );
    },
};

/**
 * A table with nothing in it says so, and says something different when it is a
 * search that came back empty.
 */
export const Empty: Story = {
    render: () => (
        <Frame>
            <DataTable columns={COLUMNS} data={[]} label="Nodes" height={160} searchable />
            <Note>Search for something in the table above to see the other message.</Note>
        </Frame>
    ),
};

/**
 * The same table with the text running right to left. The columns run the other
 * way, and so do the arrow keys.
 */
export const RightToLeft: Story = {
    render: () => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Frame>
                <DataTable
                    columns={COLUMNS}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Nodes"
                    searchable
                    height={280}
                    defaultSorting={[{ id: "degree", desc: true }]}
                />
                <Note>
                    Arrow Left now moves to the next column and Arrow Right to the previous one, because that is the
                    order the columns are drawn in.
                </Note>
            </Frame>
        </DirectionProvider>
    ),
};

/**
 * Every string the table produces can be replaced, and its numbers and dates
 * are formatted for whichever locale is in force. The strings come from the
 * same `LabelsProvider` that translates the rest of the library, so an
 * application translates the table once along with everything else.
 */
export const Translated: Story = {
    render: () => (
        <LabelsProvider
            locale="de-DE"
            labels={{
                dataTable: "Datentabelle",
                search: "Suchen",
                searchPlaceholder: "Suchen",
                clearSearch: "Suche loeschen",
                noRows: "Keine Zeilen",
                noMatchingRows: "Keine Zeilen gefunden",
                rowsShown: (shown, total) => `${shown} von ${total} Zeilen`,
                rowsSelected: (count) => `${count} ausgewaehlt`,
                yes: "Ja",
                no: "Nein",
            }}
        >
            <Frame>
                <DataTable
                    columns={COLUMNS}
                    data={NODES}
                    getRowId={(node) => node.id}
                    label="Knoten"
                    searchable
                    height={280}
                    defaultSorting={[{ id: "label", desc: false }]}
                />
                <Note>
                    Numbers, dates and sorting follow the locale; the words follow the labels you pass. Sorted by node
                    name, the accented name lands where a German reader expects it rather than after every unaccented
                    one.
                </Note>
            </Frame>
        </LabelsProvider>
    ),
};
