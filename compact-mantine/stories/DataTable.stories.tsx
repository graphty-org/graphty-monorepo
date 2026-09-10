import { Badge, Box, Button, Checkbox, Code, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useRef, useState } from "react";

import {
    DataTable,
    LabelsProvider,
    PANEL_GRID,
    PANEL_INK,
} from "../src";
import type { DataTableColumn, DataTableHandle, DataTableSort } from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A compact, virtualized data table: sortable columns, a search across them, a
 * selection, and full keyboard operation.
 *
 * **What it is for.** A property panel's list rows carry one string and one
 * number each, which is enough for "the ten most connected nodes". A table is
 * for the other case: several columns of values, for thousands of rows, that a
 * reader wants to sort, search and pick from. It draws only the rows the
 * scrolling area can show, so ten rows are in the document whether there are
 * fifty of them or fifty thousand.
 *
 * **Sorting.** Activating a column's header sorts by it, again reverses it, and
 * a third time returns the table to its natural order. A column of words starts
 * A to Z; a column of numbers starts largest first, because that is what a
 * reader is usually looking for. Holding Shift adds a column to the sort instead
 * of replacing it, and the number beside each arrow says where that column comes
 * in the sort. Words are compared with a collator for the reader's own language,
 * so an accented word lands where they expect it rather than after every
 * unaccented one.
 *
 * **Searching.** One box searches every visible column, and it matches the text
 * a reader can actually see: a value drawn as `1,024` is found by typing
 * `1,024`. Hiding a column takes it out of the search as well as out of the
 * drawing.
 *
 * **Selecting.** A plain click selects one row, Shift extends the selection from
 * the last row clicked, and Command or Control adds and removes single rows.
 * The selection is a slice of state you can own, which is the point: an app
 * whose canvas, map and panels all select the same things passes one selection
 * to all of them.
 *
 * **Keyboard.** The table follows the grid pattern of the ARIA Authoring
 * Practices. Tab moves into and out of the whole table rather than through every
 * cell; the arrow keys move between cells; Home and End reach the ends of a row
 * and Control with them the ends of the table; Page Up and Page Down move by a
 * screenful; Space selects the focused row, Shift with an arrow grows the
 * selection, Enter opens the row and Control+A selects everything on show.
 * Where text runs right to left, so do the columns, and the arrow keys follow.
 *
 * **What a screen reader is told.** The table reports how many rows and columns
 * it has and numbers every row and cell it has drawn, so a reader is told "row
 * 40 of 4,000" even though only forty rows are in the document. Sorted columns
 * carry `aria-sort`, selected rows carry `aria-selected`, and a change in how
 * many rows are on show is announced.
 */
const meta: Meta<typeof DataTable> = {
    title: "Showing Data/DataTable",
    component: DataTable,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
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

const FIRST = ["Ada", "Grace", "Alan", "Katherine", "Edsger", "Barbara", "Tony", "Radia", "Ärger", "Zoe"];
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
 * A line of explanation under a story, in the secondary text colour.
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

/**
 * Six hundred nodes with a search box above them, sorted by how connected they
 * are. Only the rows the frame can show are in the document.
 */
export const Default: Story = {
    render: () => (
        <Frame>
            <DataTable
                columns={COLUMNS}
                data={NODES}
                getRowId={(node) => node.id}
                label="Nodes"
                searchable
                height={320}
                defaultSorting={[{ id: "degree", desc: true }]}
            />
            <Note>
                Six hundred rows; around a dozen of them are in the document at any moment. Click a header to sort,
                Shift-click a second one to sort by both.
            </Note>
        </Frame>
    ),
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
