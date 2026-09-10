import { Box, DirectionProvider, Stack, UnstyledButton } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { CompoundRow, DoorButton, PANEL_GRID, PANEL_INK, PanelLabelsProvider, UiGlyph } from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A 14px colour swatch, drawn in a segment's leading slot in place of a glyph.
 * @param root0 - Component props
 * @param root0.color - The colour the swatch shows
 * @returns The swatch
 */
function Swatch({ color }: { color: string }): React.JSX.Element {
    return (
        <Box
            style={{
                width: PANEL_GRID.GLYPH,
                height: PANEL_GRID.GLYPH,
                borderRadius: "var(--mantine-radius-xs)",
                background: color,
                border: `1px solid ${PANEL_INK.BORDER}`,
                boxSizing: "border-box",
            }}
        />
    );
}

/**
 * Two or three values that belong to one thing, in a single box divided by
 * hairlines.
 *
 * **What it is for.** A colour and its opacity are one setting seen two ways,
 * not two settings. Drawing them in one box, split by a one-pixel divider in
 * the colour of the panel behind it, says exactly that; drawing them in two
 * boxes with a gap between them says the opposite. The divider is a hairline
 * and not a gutter on purpose, because a gutter reads as two separate controls.
 *
 * **When to reach for it.**
 * - For a value and the parts that belong to it: a colour and its opacity, a
 *   colour written as three channels, a graph's node and edge counts.
 * - Never for two unrelated values. The test is whether the box has one honest
 *   name: "Node colour and opacity" is one thing seen two ways, so it belongs
 *   here; "Node size and edge width" is two things that happen to be adjacent,
 *   so it belongs in a `FieldRow` pair -- two fields, two boxes, two glyphs. A
 *   compound row is a claim about the data, and a false claim costs the reader
 *   more than the pixel it saves.
 *
 * **What it does for you.**
 * - One box, one tooltip, one accessible name covering all of the values.
 * - Exactly one segment sets `grow` and becomes the main value; the rest are
 *   sized to their content. Development logs a warning when none or several do,
 *   and when the number of segments falls outside two and three.
 * - `mono` puts a hex value or an identifier in the monospace face.
 * - `fullValue` keeps a shortened value reachable, in the tooltip and in what a
 *   screen reader announces.
 * - `onClick` turns the box into a real button that opens an editor for the
 *   whole compound, and hands you the event that activated it.
 * - `busy` makes the row announce itself when a background computation finishes
 *   filling it in.
 * - The 24px trailing slot is always drawn, empty or not, so every row in the
 *   panel ends on the same line.
 */
const meta: Meta<typeof CompoundRow> = {
    title: "Editing a Value/CompoundRow",
    component: CompoundRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        width: {
            control: "radio",
            options: [PANEL_GRID.FIELD, PANEL_GRID.BODY],
            description: "224 fills the row beside the trailing slot; 108 is half a row.",
        },
        busy: {
            control: "boolean",
        },
        onClick: { action: "activated" },
        onFocus: { action: "focus" },
        onBlur: { action: "blur" },
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
type Story = StoryObj<typeof CompoundRow>;

/**
 * A node's colour and its opacity, with a button in the trailing slot that
 * opens the settings behind the row. The swatch and the hex value take the
 * leftover width; the percentage is sized to its content.
 */
export const Default: Story = {
    args: {
        label: "Node colour and opacity",
        segments: [
            { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
            { value: "100", unit: "%" },
        ],
        trailing: (
            <DoorButton
                label="Show node colour on canvas"
                icon={<UiGlyph name="eye" />}
                onClick={() => {
                    // Story only: the real row opens the canvas preview.
                }}
            />
        ),
    },
};

/**
 * The same row with nothing to put in the trailing slot. The slot keeps its
 * width, so this row still ends on the same line as every row above and below
 * it.
 */
export const WithoutTrailing: Story = {
    args: {
        label: "Edge colour and opacity",
        segments: [
            { glyph: <Swatch color="var(--mantine-color-dark-4)" />, value: "48525C", mono: true, grow: true },
            { value: "60", unit: "%" },
        ],
    },
};

/**
 * A trailing button that says something behind it has been changed from its
 * default. `changed` draws the glyph in the primary text colour instead of the
 * secondary one and states the change in the button's accessible name, so a
 * reader who cannot see the difference in colour is told about it too.
 */
export const WithChangedSettings: Story = {
    args: {
        label: "Selection colour and opacity",
        segments: [
            { glyph: <Swatch color="var(--mantine-color-yellow-6)" />, value: "F7B731", mono: true, grow: true },
            { value: "85", unit: "%" },
        ],
        trailing: (
            <DoorButton
                label="Selection colour options"
                changed
                onClick={() => {
                    // Story only: the real button opens the selection settings.
                }}
            />
        ),
    },
};

/**
 * Three values of one thing: a node's colour written as its three channels.
 * Three is the ceiling. A fourth value turns the box into a table, and
 * development says so.
 */
export const ThreeSegments: Story = {
    args: {
        label: "Node colour, red green and blue",
        segments: [
            { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "74", mono: true, grow: true },
            { value: "126", mono: true },
            { value: "232", mono: true },
        ],
    },
};

/**
 * Single capital letters in place of glyphs, from the closed set N, E, W, D and
 * K. The node count and the edge count are one thing -- the size of the cat
 * social network -- so they share one box.
 */
export const GraphSize: Story = {
    args: {
        label: "Graph size, nodes and edges",
        segments: [
            { glyph: "N", value: "20", grow: true },
            { glyph: "E", value: "34" },
        ],
        trailing: (
            <DoorButton
                label="Dataset details"
                onClick={() => {
                    // Story only: the real button opens the dataset settings.
                }}
            />
        ),
    },
};

/**
 * The narrow form, at 108px, for a box that sits beside another control rather
 * than filling the row. The growing segment is the first to be shortened, which
 * is why a hex value is better off in the full-width form.
 */
export const Narrow: Story = {
    args: {
        label: "Label colour and opacity",
        segments: [
            { glyph: <Swatch color="var(--mantine-color-gray-4)" />, value: "D5D7DA", mono: true, grow: true },
            { value: "70", unit: "%" },
        ],
        width: PANEL_GRID.FIELD,
    },
};

/**
 * Pass `onClick` and the box becomes a real button: it takes focus, draws a
 * focus ring, and activates on click, on Enter and on Space. The handler
 * receives the event, so it can read modifier keys, call `preventDefault`, or
 * work out which value the pointer landed on -- every segment carries a
 * `data-segment-index` attribute for exactly that.
 *
 * Try it with the keyboard: Tab reaches the box before it reaches the trailing
 * button, and Enter or Space activates it. Shift-click and Alt-click to see the
 * modifiers arrive.
 */
export const Interactive: Story = {
    render: function InteractiveRow(): React.JSX.Element {
        const [lastActivation, setLastActivation] = React.useState("Nothing yet");

        return (
            <Stack gap="xs">
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
                        { value: "100", unit: "%" },
                    ]}
                    onClick={(event) => {
                        const segment = (event.target as Element).closest("[data-segment-index]");
                        const index = segment?.getAttribute("data-segment-index") ?? "none";
                        const modifiers = [
                            event.shiftKey ? "shift" : undefined,
                            event.altKey ? "alt" : undefined,
                            event.metaKey ? "meta" : undefined,
                        ]
                            .filter((modifier) => modifier !== undefined)
                            .join(" + ");

                        setLastActivation(`segment ${index}${modifiers === "" ? "" : `, ${modifiers}`}`);
                    }}
                    trailing={
                        <DoorButton
                            label="Node colour options"
                            onClick={() => {
                                // Story only: the real button opens the colour settings.
                            }}
                        />
                    }
                />
                <Box style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}>
                    Last activation: {lastActivation}
                </Box>
            </Stack>
        );
    },
};

/**
 * A segment is narrow, so a long value is shortened with an ellipsis and the
 * rest of it is out of reach. `fullValue` puts the complete text back: it
 * becomes the segment's tooltip, and it is what a screen reader announces in
 * place of the shortened drawing.
 *
 * The row below draws a truncated node identifier beside its degree. Hover the
 * identifier to see the whole of it.
 */
export const ShortenedValue: Story = {
    args: {
        label: "Node identifier and degree",
        segments: [
            {
                glyph: "N",
                value: "graph-2f9a...",
                fullValue: "graph-2f9a41c6-88b0-4f2e-9a17-3d5c",
                mono: true,
                grow: true,
            },
            { glyph: "D", value: "12" },
        ],
    },
};

/**
 * `busy` is for a row whose values are worked out by something running in the
 * background. Supplying it at all -- true or false -- makes the box a polite
 * announcement, so a screen reader reads the row's name and its new values once
 * the work finishes. While it is true the row is marked busy, which holds the
 * announcement back rather than reading out every intermediate step.
 *
 * Press Recount to watch a row go busy and then settle.
 */
export const Busy: Story = {
    render: function CountingRow(): React.JSX.Element {
        const [counting, setCounting] = React.useState(false);
        const [counts, setCounts] = React.useState({ nodes: "20", edges: "34" });

        return (
            <Stack gap="xs">
                <CompoundRow
                    label="Graph size, nodes and edges"
                    busy={counting}
                    segments={[
                        { glyph: "N", value: counting ? "--" : counts.nodes, grow: true },
                        { glyph: "E", value: counting ? "--" : counts.edges },
                    ]}
                />
                <UnstyledButton
                    style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.ACCENT, textAlign: "start" }}
                    onClick={() => {
                        setCounting(true);
                        window.setTimeout(() => {
                            setCounts({ nodes: "23", edges: "41" });
                            setCounting(false);
                        }, 1200);
                    }}
                >
                    Recount
                </UnstyledButton>
            </Stack>
        );
    },
};

/**
 * Three rows of a real panel, with Mr_Whiskers selected in a 20-node cat social
 * network: the node's colour, the edge's colour and the dataset's size, all on
 * the same 32px pitch and all ending on the same line.
 */
export const InAPanel: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <Box
                component="span"
                style={{
                    height: PANEL_GRID.CONTROL_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    fontSize: "var(--mantine-font-size-sm)",
                    fontWeight: 500,
                    color: PANEL_INK.VALUE,
                }}
            >
                Mr_Whiskers
            </Box>
            <CompoundRow
                label="Node colour and opacity"
                segments={[
                    { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
                    { value: "100", unit: "%" },
                ]}
                trailing={
                    <DoorButton
                        label="Node colour options"
                        onClick={() => {
                            // Story only.
                        }}
                    />
                }
            />
            <CompoundRow
                label="Edge colour and opacity"
                segments={[
                    { glyph: <Swatch color="var(--mantine-color-dark-4)" />, value: "48525C", mono: true, grow: true },
                    { value: "60", unit: "%" },
                ]}
            />
            <CompoundRow
                label="Graph size, nodes and edges"
                segments={[
                    { glyph: "N", value: "20", grow: true },
                    { glyph: "E", value: "34" },
                ]}
            />
        </Stack>
    ),
};

/**
 * The `showLabels` preference, which a consumer turns on with
 * `PanelLabelsProvider`. It is off by default; when it is on, the row's one
 * name moves out to a column of its own in the secondary text colour and the
 * box fills the rest of the row. The segments are never labelled individually,
 * because they are not individually named things.
 *
 * With the name on the page, a screen reader is pointed at the drawn word
 * rather than given a second copy of it, so what is announced and what is drawn
 * are the same string.
 */
export const WithLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <Stack gap={0}>
                <CompoundRow
                    label="Node colour"
                    segments={[
                        { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />
                <CompoundRow
                    label="Graph size"
                    segments={[
                        { glyph: "N", value: "20", grow: true },
                        { glyph: "E", value: "34" },
                    ]}
                />
            </Stack>
        </PanelLabelsProvider>
    ),
};

/**
 * The same rows with text running right to left. Everything the row measures
 * along the inline axis is written in logical CSS, so the glyph slot, the
 * padding, the unit suffix and the trailing slot all swap sides on their own.
 *
 * A hex value and an identifier stay in their own reading order rather than
 * being rearranged by the paragraph around them, and neither runs into its
 * neighbour across the hairline.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={0}>
                    <CompoundRow
                        label="Node colour and opacity"
                        segments={[
                            { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
                            { value: "100", unit: "%" },
                        ]}
                        trailing={
                            <DoorButton
                                label="Node colour options"
                                onClick={() => {
                                    // Story only.
                                }}
                            />
                        }
                    />
                    <CompoundRow
                        label="Graph size, nodes and edges"
                        segments={[
                            { glyph: "N", value: "20", grow: true },
                            { glyph: "E", value: "34" },
                        ]}
                    />
                </Stack>
            </Box>
        </DirectionProvider>
    ),
};
