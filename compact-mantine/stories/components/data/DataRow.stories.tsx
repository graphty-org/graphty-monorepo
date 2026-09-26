import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useRef, useState } from "react";

import {
    AdvancedButton,
    DataRow,
    DataRowHeader,
    FieldGlyph,
    LabelsProvider,
    PANEL_GRID,
    RankChip,
    UiGlyph,
    useNumberFormatter,
} from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A data row: one of the reader's own strings -- a node label, an attribute name, a filename --
 * with the number that describes it at the trailing edge.
 *
 * Every other row type in this library replaces its text label with a drawing, because a
 * setting can be drawn. Data cannot: there is no picture of `Mr_Whiskers`. So this row keeps the
 * string at the leading edge in the primary text color and puts the value at the trailing edge
 * in the quieter secondary color. The value is bare: a run of rows that measure the same thing
 * carries its unit once, on a `DataRowHeader` above them.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **DataRow** | A reading: a statistic, a fact, a ranking, a recent file. The reader looks at it, and at most clicks it to open what it names. |
 * | `Tree` | A list of objects the reader selects, renames or reorders, with nesting (layers, groups). |
 * | `PageList` | The same, flat: pages, saved views, style layers. |
 * | `ResultRow` | A find result: the match highlighted in its context. |
 * | `DataTable` | Several columns of values, or thousands of rows to sort, search and pick from. |
 *
 * Not for a setting: a value the reader changes belongs in a field row (`PanelField`,
 * `FieldRow`), even when it has a word beside it today.
 *
 * ## Usage
 *
 * ```tsx
 * import { DataRow, DataRowHeader, useNumberFormatter } from "@graphty/compact-mantine";
 *
 * const formatter = useNumberFormatter();
 *
 * <DataRowHeader label="Most connected" unit="links" />
 * {nodes.map((node) => (
 *     <DataRow
 *         key={node.id}
 *         name={node.label}
 *         value={formatter.format(node.degree)}
 *         selected={node.id === current}
 *         onClick={() => { focusNode(node.id); }}
 *     />
 * ))}
 * ```
 *
 * The value is drawn exactly as given. Format numbers for the reader's locale first
 * (`useNumberFormatter()`), or `1284` is drawn the same in every locale.
 *
 * ## Keyboard and accessibility
 *
 * - Without `onClick` the row is inert text: it takes no focus and does not light up under the
 *   pointer.
 * - With `onClick` the name and value become one `<button>`: Tab reaches it, Enter and Space
 *   activate it. The handler's second argument says whether a pointer or the keyboard did it.
 * - `selected` marks the current row of a ranking. It draws the accent tint and is reported as
 *   `aria-current`, so the current row is announced as well as drawn.
 * - The name ellipsizes when it is too long for the row, carries the whole string as its
 *   `title`, and stays whole in the accessible name.
 * - The `trailing` control sits outside the row's button, so it is reachable and clickable in
 *   its own right without activating the row.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 240 x 32 (`PANEL_GRID.DATA_PITCH`) |
 * | Pill (hover, selected, focus ring) | 24px tall, inset 4 8 4 12, radius 5 |
 * | Name | 11px, line height 32, weight 450, primary text color |
 * | Value | 11px, secondary text color, right-aligned |
 * | Icon | 16px leading slot |
 * | Trailing slot | 24 x 24, ending at x 232 |
 */
const meta: Meta<typeof DataRow> = {
    title: "Components/Data display/DataRow",
    component: DataRow,
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
 * Sets `data-state` on the row inside it, for the forced hover and focus looks: a story cannot
 * hold a real `:hover` or `:focus-visible`.
 * @param root0 - Component props
 * @param root0.state - The pointer or focus state to draw
 * @param root0.children - The row
 * @returns The wrapper
 */
function Forced({ state, children }: { state: "hover" | "focus"; children: React.ReactNode }): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    React.useLayoutEffect(() => {
        ref.current?.querySelector(".cm-data-row")?.setAttribute("data-state", state);
    });
    return <div ref={ref}>{children}</div>;
}

/**
 * One row: the reader's own string at the leading edge, the number that describes it at the
 * trailing edge. Edit it in the Controls table.
 */
export const Default: Story = {
    args: {
        name: "Mr_Whiskers",
        value: "4",
    },
};

/**
 * Every state, light and dark side by side: rest, hover, selected, selected and hovered,
 * keyboard focus, inert, and with an icon, a rank chip and a trailing button.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={0}>
            <DataRowHeader label="Most connected" unit="links" sortDirection="descending" onSortChange={() => undefined} />
            <DataRow name="Rest" value="4" onClick={() => undefined} />
            <Forced state="hover">
                <DataRow name="Hover" value="4" onClick={() => undefined} />
            </Forced>
            <DataRow name="Selected" value="3" selected onClick={() => undefined} />
            <Forced state="hover">
                <DataRow name="Selected + hover" value="3" selected onClick={() => undefined} />
            </Forced>
            <Forced state="focus">
                <DataRow name="Keyboard focus" value="2" onClick={() => undefined} />
            </Forced>
            <DataRow name="Inert" value="2" />
            <DataRow name="With an icon" icon={<FieldGlyph name="attribute" />} value="Number" onClick={() => undefined} />
            <DataRow name="With a rank" value={<RankChip>#6</RankChip>} onClick={() => undefined} />
            <DataRow
                name="With a trailing button"
                value="1"
                trailing={<AdvancedButton label="Settings" icon={<UiGlyph name="gear" />} />}
                onClick={() => undefined}
            />
        </Stack>
    ),
    // Selected + hover is drawn as selected (Figma's layer rows).
    play: ({ canvasElement }) => expectStatesApply(canvasElement, { unchanged: ['.cm-data-row[data-state="hover"]:has([aria-current])'] }),
};

/**
 * The shape these rows are used in: a caption, then a run of rows at a 32px pitch. "links" is
 * written once above the column instead of on every row, so the numbers can be compared by
 * scanning down.
 */
export const Column: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <DataRowHeader label="Most connected" unit="links" />
            {CATS.map((cat) => (
                <DataRow key={cat.name} name={cat.name} value={String(cat.links)} />
            ))}
        </Stack>
    ),
};

/**
 * A ranking with a current row. Clicking a row opens the node it names; the current row draws
 * the accent tint and is reported as `aria-current`. The rank is a `RankChip` reading `#6`,
 * not the sentence "Rank 6 of 318".
 */
export const Ranking: Story = {
    render: function RankingStory(): React.JSX.Element {
        const [current, setCurrent] = useState("Chonky_Boy");
        const ranked = [
            { name: "Mr_Whiskers", rank: "#1" },
            { name: "Chonky_Boy", rank: "#2" },
            { name: "Mrs_Henderson", rank: "#6" },
        ];

        return (
            <Stack gap={0}>
                <DataRowHeader label="Highest betweenness" unit="rank" />
                {ranked.map((row) => (
                    <DataRow
                        key={row.name}
                        name={row.name}
                        value={<RankChip>{row.rank}</RankChip>}
                        selected={row.name === current}
                        onClick={(): void => {
                            setCurrent(row.name);
                        }}
                    />
                ))}
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const target = canvas.getByRole("button", { name: /Mr_Whiskers/ });
        await userEvent.click(target);
        await expect(target).toHaveAttribute("aria-current", "true");
        await expect(canvas.getByRole("button", { name: /Chonky_Boy/ })).not.toHaveAttribute("aria-current");
    },
};

/**
 * A row that opens what it names: recent files. `onClick` receives the event and whether the
 * activation came from a pointer or the keyboard. Click a row, or Tab to one and press Enter.
 */
export const OpensWhatItNames: Story = {
    render: function OpensWhatItNamesStory(): React.JSX.Element {
        const [reading, setReading] = useState("Nothing opened yet");

        return (
            <Stack gap={0}>
                <DataRowHeader label="Recent files" unit="nodes" />
                {[
                    { file: "cats.graphml", nodes: "20" },
                    { file: "shelter.gexf", nodes: "318" },
                    { file: "neighborhood.csv", nodes: "1,284" },
                ].map((row) => (
                    <DataRow
                        key={row.file}
                        name={row.file}
                        value={row.nodes}
                        onClick={(_event, activation): void => {
                            setReading(`Opened ${row.file} from the ${activation.source}`);
                        }}
                    />
                ))}
                <Text size="xs" c="dimmed" mt="xs" px={PANEL_GRID.PAD_LEFT}>
                    {reading}
                </Text>
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: /shelter\.gexf/ }));
        await expect(canvas.getByText(/Opened shelter\.gexf from the pointer/)).toBeInTheDocument();
    },
};

/**
 * A leading 16px icon, worth drawing only when the rows differ in type. These rows are a
 * dataset's attributes, so they carry the attribute glyph; a list of nodes would carry none,
 * because "node" is not a distinction between them.
 */
export const WithIcon: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <DataRowHeader label="Attributes" />
            <DataRow name="Age" icon={<FieldGlyph name="attribute" />} value="Number" />
            <DataRow name="Bridges" icon={<FieldGlyph name="attribute" />} value="Number" />
            <DataRow name="Betweenness" icon={<FieldGlyph name="attribute" />} value="Number" />
        </Stack>
    ),
};

/**
 * The 24px trailing slot, drawn only because there is something to put in it: a button that
 * opens the style's own settings. The slot sits outside the row's button, so clicking it does
 * not apply the style.
 */
export const WithTrailing: Story = {
    render: function WithTrailingStory(): React.JSX.Element {
        const [applied, setApplied] = useState("Default");

        return (
            <Stack gap={0}>
                <DataRowHeader label="Styles" />
                {["Default", "Communities", "Heat map"].map((style) => (
                    <DataRow
                        key={style}
                        name={style}
                        selected={style === applied}
                        trailing={
                            <AdvancedButton
                                label={`${style} settings`}
                                changed={style === "Communities"}
                                icon={<UiGlyph name="gear" />}
                                onClick={(): void => {
                                    // Opens the style's settings.
                                }}
                            />
                        }
                        onClick={(): void => {
                            setApplied(style);
                        }}
                    />
                ))}
            </Stack>
        );
    },
};

/**
 * A read-only run: no `onClick`, so nothing takes focus and nothing lights up under the pointer.
 * A list the reader cannot act on must not pretend it can be clicked.
 */
export const Inert: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <DataRowHeader label="Components" unit="nodes" />
            <DataRow name="Neighborhood cats" value="14" />
            <DataRow name="Shelter cats" value="4" />
            <DataRow name="Chonky_Boy" value="2" />
        </Stack>
    ),
};

/**
 * A name longer than the row. It ellipsizes and carries the whole string as a title for the
 * pointer, and stays whole in the accessible name. The value never gives up its width, because
 * the number is the thing being compared.
 */
export const LongName: Story = {
    args: {
        name: "Mrs_Henderson_from_the_house_on_the_corner",
        value: "4",
    },
};

/**
 * Rows whose values are formatted for the active locale by `useNumberFormatter()`.
 * @returns The rows
 */
function LocalizedRows(): React.JSX.Element {
    const formatter = useNumberFormatter();
    return (
        <Stack gap={0}>
            <DataRowHeader
                label="Most connected"
                unit="links"
                sortDirection="descending"
                sortPriority={2}
                onSortChange={(): void => {
                    // The story keeps a fixed direction.
                }}
            />
            <DataRow name="Mr_Whiskers" value={formatter.format(1284)} selected />
            <DataRow name="Mrs_Henderson" value={formatter.format(4)} />
            <DataRow
                name="Biscuit"
                value={formatter.format(2)}
                trailing={
                    <AdvancedButton
                        label="Options"
                        icon={<UiGlyph name="gear" />}
                        onClick={(): void => {
                            // Opens the row's options.
                        }}
                    />
                }
            />
        </Stack>
    );
}

/**
 * Right to left, in an Arabic locale. The padding, the gaps and the trailing slot swap ends with
 * the text because every measurement is on the inline axis. The values go through
 * `useNumberFormatter()` and the caption's sort position is formatted by the library, so both are
 * written in the locale's digits. The names are left in English so the mirroring is easy to see.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <LabelsProvider locale="ar-EG">
                <div dir="rtl">
                    <LocalizedRows />
                </div>
            </LabelsProvider>
        </DirectionProvider>
    ),
};
