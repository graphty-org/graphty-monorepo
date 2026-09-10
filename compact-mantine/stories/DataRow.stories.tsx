import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useRef, useState } from "react";

import {
    DataRow,
    DataRowHeader,
    DoorButton,
    FieldGlyph,
    LabelsProvider,
    PANEL_GRID,
    RankChip,
    UiGlyph,
    useCollator,
} from "../src";
import type { DataRowSortDirection } from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A list row: one of the reader's own strings, with the number that describes
 * it at the trailing edge.
 *
 * **What it is for.** Every other row type in this library replaces its text
 * label with a drawing, because a setting can be drawn. Data cannot: there is
 * no picture of `Mr_Whiskers`. So this row keeps the string -- an identifier, a
 * node label, an attribute name, a filename -- at 12px in the primary text
 * colour, and puts the number that describes it at the trailing edge in the
 * smaller secondary colour.
 *
 * **When to use it**
 * - A ranked list: the most connected nodes, the highest scores, the largest
 *   components.
 * - The attributes a dataset actually carries: `Age`, `Bridges`,
 *   `Betweenness`.
 * - Files, saved views and layouts the reader named themselves.
 * - Not for a setting. A value the reader changes belongs in a field row, even
 *   when it has a word beside it today.
 *
 * **The value is bare.** A run of rows that all measure the same thing carries
 * its unit word once, on a `DataRowHeader` above the column -- "links" above,
 * `4` on each row -- so the trailing edge becomes a column of numbers a reader
 * compares by scanning. A rank is a `RankChip` reading `#6`, not the sentence
 * "Rank 6 of 318".
 *
 * **Selection.** `onClick` receives the event and a second argument saying
 * whether the row was activated with a pointer or from the keyboard, so the
 * gestures a list is expected to answer are yours to implement: Shift to extend
 * a range, Control or Command to toggle one row, a right click for a menu,
 * a double click to open. Selection is reported to a screen reader as well as
 * drawn -- `aria-current` for a list with one selected row, `aria-selected`
 * when you have wrapped the run in a listbox.
 *
 * **Sorting.** `DataRowHeader` becomes a button as soon as you give it
 * `onSortChange`. It cycles ascending and descending, draws the direction, and
 * reports it as `aria-sort`; read the event's `shiftKey` to sort by several
 * columns at once and pass each column its `sortPriority`.
 */
const meta: Meta<typeof DataRow> = {
    title: "Showing Data/DataRow",
    component: DataRow,
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
type Story = StoryObj<typeof DataRow>;

/** One row of the demo data: a name, and the number that describes it. */
interface Cat {
    /** The reader's own string. */
    name: string;
    /** How many links the node has. */
    links: number;
}

const CATS: Cat[] = [
    { name: "Mr_Whiskers", links: 4 },
    { name: "Mrs_Henderson", links: 4 },
    { name: "Chonky_Boy", links: 3 },
    { name: "Biscuit", links: 2 },
];

/**
 * Whether the gesture that asked for something was held with Shift.
 *
 * A change handler is given a `SyntheticEvent`, which says nothing about
 * modifier keys until you look at the native event underneath it. This is how a
 * consumer reads Shift without asserting a type.
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

/**
 * One row: the reader's own string at the leading edge, the number that
 * describes it at the trailing edge. The number is bare, because the unit
 * belongs on the column above it.
 */
export const Default: Story = {
    args: {
        name: "Mr_Whiskers",
        value: "4",
    },
};

/**
 * The shape these rows are actually used in: a caption, then a run of rows at a
 * 28px pitch. "links" is written once above the column instead of twenty times
 * down the trailing edge, which is what lets a reader compare the numbers by
 * scanning rather than by reading.
 */
export const Column: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={1}>
            <DataRowHeader label="Most connected" unit="links" />
            {CATS.map((cat) => (
                <DataRow key={cat.name} name={cat.name} value={String(cat.links)} />
            ))}
        </Stack>
    ),
};

/**
 * One selected row, driven from the consumer's own state. Clicking a row
 * replaces the selection; the selected row draws on the accent tint and reports
 * itself as `aria-current`, so a reader who cannot see the tint is still told
 * which row is the one on screen.
 */
export const SingleSelection: Story = {
    render: function SingleSelectionStory(): React.JSX.Element {
        const [selected, setSelected] = useState("Mrs_Henderson");

        return (
            <Stack gap={1}>
                <DataRowHeader label="Most connected" unit="links" />
                {CATS.map((cat) => (
                    <DataRow
                        key={cat.name}
                        name={cat.name}
                        value={String(cat.links)}
                        selected={cat.name === selected}
                        onClick={(): void => {
                            setSelected(cat.name);
                        }}
                    />
                ))}
            </Stack>
        );
    },
};

/**
 * Several selected rows, with the gestures a list is expected to answer:
 * Shift extends the range from the last row clicked, Control or Command adds
 * and removes one row, and a plain click replaces the selection.
 *
 * The rows are wrapped in a `role="listbox"` marked `aria-multiselectable`, and
 * each row is given `role="option"` so its state is announced as
 * `aria-selected` rather than as "current". The listbox owns the arrow keys and
 * the rows share one tab stop between them, which is the arrangement the ARIA
 * Authoring Practices listbox pattern asks for.
 */
export const MultipleSelection: Story = {
    render: function MultipleSelectionStory(): React.JSX.Element {
        const [selected, setSelected] = useState<string[]>(["Mrs_Henderson"]);
        const [anchor, setAnchor] = useState(1);
        const [active, setActive] = useState(1);
        const listRef = useRef<HTMLDivElement>(null);

        /**
         * Applies one activation to the selection.
         * @param index - Which row was activated
         * @param event - The click, or the click a browser made from Enter or Space
         */
        function activate(index: number, event: React.MouseEvent | React.KeyboardEvent): void {
            const name = CATS[index].name;
            setActive(index);

            if (event.shiftKey) {
                const from = Math.min(anchor, index);
                const to = Math.max(anchor, index);
                setSelected(CATS.slice(from, to + 1).map((cat) => cat.name));
                return;
            }

            setAnchor(index);

            if (event.metaKey || event.ctrlKey) {
                setSelected((current) =>
                    current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
                );
                return;
            }

            setSelected([name]);
        }

        /**
         * Moves the tab stop and the focus between the rows.
         * @param event - The key pressed inside the list
         */
        function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                return;
            }
            event.preventDefault();

            const step = event.key === "ArrowDown" ? 1 : -1;
            const next = Math.min(CATS.length - 1, Math.max(0, active + step));
            setActive(next);
            listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus();
        }

        return (
            <Stack gap={1}>
                <DataRowHeader label="Most connected" unit="links" />
                <div
                    ref={listRef}
                    role="listbox"
                    aria-label="Most connected nodes"
                    aria-multiselectable
                    onKeyDown={handleKeyDown}
                >
                    {CATS.map((cat, index) => (
                        <DataRow
                            key={cat.name}
                            name={cat.name}
                            value={String(cat.links)}
                            role="option"
                            selected={selected.includes(cat.name)}
                            tabIndex={index === active ? 0 : -1}
                            onClick={(event): void => {
                                activate(index, event);
                            }}
                        />
                    ))}
                </div>
                <Text size="xs" c="dimmed" mt="xs">
                    {selected.length} of {CATS.length} selected
                </Text>
            </Stack>
        );
    },
};

/**
 * The rest of the gestures a row reports. A double click opens the thing the
 * row names or starts renaming it; a right click asks for a menu, and so do the
 * keyboard's context-menu key and Shift+F10 while a row has focus. Call
 * `preventDefault` on the context-menu event to put your own menu up in place
 * of the browser's.
 */
export const Gestures: Story = {
    render: function GesturesStory(): React.JSX.Element {
        const [reading, setReading] = useState("Nothing yet");

        return (
            <Stack gap={1}>
                <DataRowHeader label="Saved layouts" />
                {["Force directed", "Hierarchical", "Radial"].map((layout) => (
                    <DataRow
                        key={layout}
                        name={layout}
                        onClick={(_event, meta): void => {
                            setReading(`Selected ${layout} from the ${meta.source}`);
                        }}
                        onDoubleClick={(): void => {
                            setReading(`Opened ${layout}`);
                        }}
                        onContextMenu={(event): void => {
                            event.preventDefault();
                            setReading(`Menu asked for on ${layout}`);
                        }}
                    />
                ))}
                <Text size="xs" c="dimmed" mt="xs">
                    {reading}
                </Text>
            </Stack>
        );
    },
};

/**
 * A sortable column caption. Giving it `onSortChange` makes it a button that
 * cycles between ascending and descending; the arrow is drawn for the eye and
 * the same state is reported as `aria-sort`, which a screen reader reads out
 * once the caption and its rows sit inside an element with `role="table"`.
 *
 * The rows are ordered with `Intl.Collator`, which sorts the way a reader of
 * the active language expects rather than by character code.
 */
export const SortableHeader: Story = {
    render: function SortableHeaderStory(): React.JSX.Element {
        const [direction, setDirection] = useState<DataRowSortDirection>("descending");
        const collator = useCollator({ numeric: true });
        const rows = useMemo(
            () =>
                [...CATS].sort((a, b) =>
                    direction === "ascending"
                        ? a.links - b.links || collator.compare(a.name, b.name)
                        : b.links - a.links || collator.compare(a.name, b.name),
                ),
            [collator, direction],
        );

        return (
            <div role="table" aria-label="Most connected nodes">
                <Stack gap={1}>
                    <div role="row">
                        <DataRowHeader
                            label="Most connected"
                            unit="links"
                            sortDirection={direction}
                            onSortChange={setDirection}
                        />
                    </div>
                    {rows.map((cat) => (
                        <div key={cat.name} role="row">
                            <div role="cell">
                                <DataRow name={cat.name} value={String(cat.links)} />
                            </div>
                        </div>
                    ))}
                </Stack>
            </div>
        );
    },
};

/**
 * Sorting by two columns. A plain activation sorts by that column alone; Shift
 * adds it to the sort already in force, and each column then draws where it
 * comes in the order as a small chip beside its arrow. The chip is a drawing
 * for the eye: every column announces its own direction through `aria-sort`, so
 * repeating the position for a screen reader would only be noise.
 */
export const MultiColumnSort: Story = {
    render: function MultiColumnSortStory(): React.JSX.Element {
        const [sorts, setSorts] = useState<{ column: "links" | "name"; direction: DataRowSortDirection }[]>([
            { column: "links", direction: "descending" },
        ]);

        /**
         * Records the direction one column was sorted in.
         * @param column - Which column was activated
         * @param direction - The direction it asked to be sorted in
         * @param event - The event that asked, whose Shift key decides whether this replaces the sort or adds to it
         */
        function applySort(
            column: "links" | "name",
            direction: DataRowSortDirection,
            event?: React.SyntheticEvent,
        ): void {
            setSorts((current) => {
                const rest = current.filter((sort) => sort.column !== column);
                return heldShift(event) ? [...rest, { column, direction }] : [{ column, direction }];
            });
        }

        /**
         * Where one column comes in the sort, counting from one.
         * @param column - The column to look up
         * @returns Its position, or undefined when only one column is sorted
         */
        function priorityOf(column: "links" | "name"): number | undefined {
            const index = sorts.findIndex((sort) => sort.column === column);
            return sorts.length > 1 && index >= 0 ? index + 1 : undefined;
        }

        /**
         * Which way one column is sorted, if it is.
         * @param column - The column to look up
         * @returns Its direction, or "none"
         */
        function directionOf(column: "links" | "name"): DataRowSortDirection {
            return sorts.find((sort) => sort.column === column)?.direction ?? "none";
        }

        const collator = useCollator({ numeric: true });
        const rows = useMemo(
            () =>
                [...CATS].sort((a, b) => {
                    for (const sort of sorts) {
                        const sign = sort.direction === "ascending" ? 1 : -1;
                        const compared =
                            sort.column === "links" ? a.links - b.links : collator.compare(a.name, b.name);
                        if (compared !== 0) {
                            return compared * sign;
                        }
                    }
                    return 0;
                }),
            [collator, sorts],
        );

        return (
            <Stack gap={1}>
                <DataRowHeader
                    label="Name"
                    sortDirection={directionOf("name")}
                    sortPriority={priorityOf("name")}
                    onSortChange={(direction, event): void => {
                        applySort("name", direction, event);
                    }}
                />
                <DataRowHeader
                    label="Most connected"
                    unit="links"
                    sortDirection={directionOf("links")}
                    sortPriority={priorityOf("links")}
                    onSortChange={(direction, event): void => {
                        applySort("links", direction, event);
                    }}
                />
                {rows.map((cat) => (
                    <DataRow key={cat.name} name={cat.name} value={String(cat.links)} />
                ))}
            </Stack>
        );
    },
};

/**
 * A leading 16px icon, worth drawing only when the rows differ in type. These
 * rows are a dataset's attributes, so they carry the attribute glyph; a list of
 * nodes would carry none, because "node" is not a distinction between them.
 */
export const WithIcon: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={1}>
            <DataRowHeader label="Attributes" />
            <DataRow name="Age" icon={<FieldGlyph name="attribute" />} value="Number" />
            <DataRow name="Bridges" icon={<FieldGlyph name="attribute" />} value="Number" />
            <DataRow name="Betweenness" icon={<FieldGlyph name="attribute" />} value="Number" />
        </Stack>
    ),
};

/**
 * The rank chip: `#6`, where a panel would otherwise spend a line on "Rank 6 of
 * 318". The denominator is not information the reader is missing -- the panel
 * above already says how many nodes there are -- so the chip keeps the number
 * that changes and drops the words that do not.
 */
export const WithRankChip: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={1}>
            <DataRowHeader label="Highest betweenness" unit="score" />
            <DataRow name="Mr_Whiskers" value={<RankChip>#1</RankChip>} />
            <DataRow name="Chonky_Boy" value={<RankChip>#2</RankChip>} />
            <DataRow name="Mrs_Henderson" value={<RankChip>#6</RankChip>} />
        </Stack>
    ),
};

/**
 * The 24px trailing slot, drawn only because there is something to put in it --
 * here an advanced settings button that opens the layout's own parameters. The
 * slot sits outside the row's button, so it is reachable and clickable in its
 * own right without selecting the row.
 */
export const WithTrailing: Story = {
    render: function WithTrailingStory(): React.JSX.Element {
        const [applied, setApplied] = useState("Force directed");

        return (
            <Stack gap={1}>
                <DataRowHeader label="Saved layouts" />
                {["Force directed", "Hierarchical", "Radial"].map((layout) => (
                    <DataRow
                        key={layout}
                        name={layout}
                        selected={layout === applied}
                        trailing={
                            <DoorButton
                                label={`${layout} options`}
                                deviates={layout === "Force directed"}
                                icon={<UiGlyph name="gear" />}
                                onClick={(): void => {
                                    // Opens the layout's parameters.
                                }}
                            />
                        }
                        onClick={(): void => {
                            setApplied(layout);
                        }}
                    />
                ))}
            </Stack>
        );
    },
};

/**
 * A read-only run: no `onClick`, so nothing takes focus and nothing lights up
 * under the pointer. A list the reader cannot act on must not pretend it can be
 * clicked.
 */
export const Inert: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={1}>
            <DataRowHeader label="Components" unit="nodes" />
            <DataRow name="Neighbourhood cats" value="14" />
            <DataRow name="Shelter cats" value="4" />
            <DataRow name="Chonky_Boy" value="2" />
        </Stack>
    ),
};

/**
 * The reader's own strings are as long as the reader made them. The name
 * ellipsises and carries the whole string as a title for the pointer, while the
 * whole string stays the row's accessible name for anyone reading it aloud. The
 * value never gives up its width, because the number is the thing being
 * compared.
 */
export const LongName: Story = {
    args: {
        name: "Mrs_Henderson_from_the_house_on_the_corner",
        value: "4",
    },
};

/**
 * The caption on its own. With no `unit` it names the column and nothing else,
 * which is the right form when the rows carry words rather than numbers.
 */
export const HeaderOnly: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={1}>
            <DataRowHeader label="Most connected" unit="links" />
            <DataRowHeader label="Attributes" />
        </Stack>
    ),
};

/**
 * The same rows with the text running right to left. Every measurement in the
 * row is written on the inline axis rather than as a left or a right, so the
 * padding, the gaps and the trailing slot all swap ends with the text; the
 * sort arrow does not, because turning a chevron over means the same thing in
 * either direction.
 *
 * The numbers are formatted for the locale as well: wrap the tree in
 * `LabelsProvider` with a `locale` and this library's own numbers -- here the
 * position of each column in the sort -- are written in that locale's digits.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <LabelsProvider locale="ar-EG">
                <div dir="rtl">
                    <Stack gap={1}>
                        <DataRowHeader
                            label="الأكثر اتصالا"
                            unit="روابط"
                            sortDirection="descending"
                            sortPriority={2}
                            onSortChange={(): void => {
                                // The story keeps a fixed direction.
                            }}
                        />
                        <DataRow name="السيد ويسكرز" value="٤" selected />
                        <DataRow name="السيدة هندرسون" value="٤" />
                        <DataRow
                            name="بيسكويت"
                            value="٢"
                            trailing={
                                <DoorButton
                                    label="خيارات"
                                    icon={<UiGlyph name="gear" />}
                                    onClick={(): void => {
                                        // Opens the row's options.
                                    }}
                                />
                            }
                        />
                    </Stack>
                </div>
            </LabelsProvider>
        </DirectionProvider>
    ),
};
