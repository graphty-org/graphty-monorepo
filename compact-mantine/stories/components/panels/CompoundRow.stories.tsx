import { Box, DirectionProvider, Stack, UnstyledButton } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { AdvancedButton, CompoundRow, PANEL_GRID, PANEL_INK, PanelLabelsProvider, UiGlyph } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * A 12px color swatch, drawn in a segment's leading slot in place of a glyph.
 * @param root0 - Component props
 * @param root0.color - The color the swatch shows
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
 * A color and its opacity are one setting seen two ways. Drawing them in one
 * box, split by a 1px seam in the panel's own color, says so; two boxes with a
 * gap between them would say the opposite.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **CompoundRow** | A value and the parts that belong to it: a color and its opacity, a color as three channels, a graph's node and edge counts. The box has one honest name. |
 * | **FieldRow** pair | Two separate values that happen to sit together, such as node size and edge width: two fields, two boxes, two glyphs. |
 * | **CompactColorInput** | The color should be edited in place with a picker, not opened elsewhere. |
 * | **DataRow** | A read-only name and value in a list of readings. |
 *
 * ## Usage
 *
 * ```tsx
 * import { ColorSwatch } from "@mantine/core";
 * import { AdvancedButton, CompoundRow } from "@graphty/compact-mantine";
 *
 * <CompoundRow
 *     label="Node color and opacity"
 *     segments={[
 *         { glyph: <ColorSwatch color="#4a7ee8" size={12} />, value: "4A7EE8", mono: true, grow: true },
 *         { value: "100", unit: "%" },
 *     ]}
 *     onClick={openColorEditor}
 *     trailing={<AdvancedButton label="Node color options" onClick={openOptions} />}
 * />
 * ```
 *
 * - Exactly one segment sets `grow` and takes the leftover width; the others
 *   size to their content. Development warns when none or several do, or when
 *   there are not two or three segments.
 * - `mono` sets a hex value or an identifier in the monospace face.
 * - `fullValue` keeps a shortened value reachable, as the segment's tooltip and
 *   as what a screen reader announces.
 * - `busy` (supplied for the component's whole life) makes the row a polite live
 *   region that announces its new values once a background computation ends.
 *
 * ## Keyboard and accessibility
 *
 * - Without `onClick` the box is a read-only `group` named by `label` and never
 *   enters the tab order.
 * - With `onClick` it is a real button: it takes focus, draws the 1px focus ring
 *   inside, and activates on click, Enter and Space. The handler gets the event;
 *   each segment carries `data-segment-index` so you can tell which value the
 *   pointer landed on.
 * - Tab reaches the box before the trailing control.
 * - The name comes from the label and every segment's value, never from an
 *   `aria-label` that would hide them.
 * - Laid out in logical CSS: segments, unit suffixes and the trailing slot swap
 *   sides under `dir="rtl"`, and hex values keep their own reading order.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 184 x 24 (`PANEL_GRID.BODY`, the default) or 88 x 24 (`PANEL_GRID.FIELD`) |
 * | Radius | 5px |
 * | Fill | `--cm-bg-secondary`, with 1px `--cm-bg` seams between segments |
 * | Segment text | 11/16, weight 450 |
 * | Interactive | `--cm-border` outline on hover, 1px focus ring inside |
 * | Row | 32px pitch, 24px trailing slot always drawn |
 */
const meta: Meta<typeof CompoundRow> = {
    title: "Components/Panels and rows/CompoundRow",
    component: CompoundRow,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        width: {
            control: "radio",
            options: [PANEL_GRID.FIELD, PANEL_GRID.BODY],
            description: "184 fills the row beside the trailing slot; 88 is half a row.",
        },
        busy: {
            control: "boolean",
        },
        segments: { control: false },
        trailing: { control: false },
        onClick: { action: "activated" },
        onFocus: { action: "focus" },
        onBlur: { action: "blur" },
    },
    decorators: [
        // Every story sits in a 240px panel with a section's 16 | 8 content padding; States
        // lays out several panels side by side, so it brings its own.
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
type Story = StoryObj<typeof CompoundRow>;

/**
 * A node's color and its opacity, with a button in the trailing slot. The
 * swatch and hex value take the leftover width; the percentage sizes to its
 * content. Switch `width` and `busy` in the Controls table.
 */
export const Default: Story = {
    args: {
        label: "Node color and opacity",
        segments: [
            { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
            { value: "100", unit: "%" },
        ],
        trailing: (
            <AdvancedButton
                label="Show node color on canvas"
                icon={<UiGlyph name="eye" />}
                onClick={() => {
                    // Story only: the real row opens the canvas preview.
                }}
            />
        ),
    },
};

/**
 * Every state, light and dark: read-only, interactive at rest, under the
 * pointer (the outline), with keyboard focus (the 1px ring inside), and the
 * narrow 88px form.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => {
        const segments = [
            { glyph: <Swatch color="#3380ff" />, value: "3380FF", grow: true },
            { value: "100", unit: "%" },
        ];
        return (
            <StoryStates>
                <StoryState name="Read-only" padded>
                    <CompoundRow label="Fill" segments={segments} />
                </StoryState>
                <StoryState name="Interactive" padded>
                    <CompoundRow label="Fill" segments={segments} onClick={() => undefined} />
                </StoryState>
                <StoryState name="Hover" force="hover" padded>
                    <CompoundRow label="Fill" segments={segments} onClick={() => undefined} />
                </StoryState>
                <StoryState name="Focus" force="focus" padded>
                    <CompoundRow label="Fill" segments={segments} onClick={() => undefined} />
                </StoryState>
                <StoryState name="Narrow (88)" padded>
                    <CompoundRow
                        label="Label color"
                        width={PANEL_GRID.FIELD}
                        segments={[
                            { value: "D5D7DA", grow: true },
                            { value: "70", unit: "%" },
                        ]}
                    />
                </StoryState>
            </StoryStates>
        );
    },
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/**
 * Three values of one thing: a color as its three channels. Three is the
 * ceiling; a fourth turns the box into a table, and development says so.
 */
export const ThreeSegments: Story = {
    args: {
        label: "Node color, red green and blue",
        segments: [
            { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "74", mono: true, grow: true },
            { value: "126", mono: true },
            { value: "232", mono: true },
        ],
    },
};

/**
 * Capital letters in place of glyphs, from the closed set N, E, W, D and K.
 * The node and edge counts are one thing -- the size of the graph -- so they
 * share one box.
 */
export const GraphSize: Story = {
    args: {
        label: "Graph size, nodes and edges",
        segments: [
            { glyph: "N", value: "20", grow: true },
            { glyph: "E", value: "34" },
        ],
        trailing: (
            <AdvancedButton
                label="Dataset details"
                onClick={() => {
                    // Story only: the real button opens the dataset settings.
                }}
            />
        ),
    },
};

/**
 * With `onClick` the box is a real button. Tab to it and press Enter or Space,
 * or Shift-click and Alt-click to see the modifiers and the segment index
 * arrive in the handler.
 */
export const Interactive: Story = {
    render: function InteractiveRow(): React.JSX.Element {
        const [lastActivation, setLastActivation] = React.useState("Nothing yet");

        return (
            <Stack gap="xs">
                <CompoundRow
                    label="Node color and opacity"
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
                        <AdvancedButton
                            label="Node color options"
                            onClick={() => {
                                // Story only: the real button opens the color settings.
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
 * `fullValue` puts a shortened value back: it becomes the segment's tooltip and
 * what a screen reader announces. Hover the identifier to see all of it.
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
 * `busy` for values worked out in the background. Supplying it at all makes the
 * box a polite live region; while it is true the announcement is held back, so
 * the reader hears the result once. Press Recount.
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
                    style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.BRAND_TEXT, textAlign: "start" }}
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
 * Three rows of a real panel: the node's color, the edge's color and the
 * dataset's size, on the same 32px pitch and ending on the same line.
 */
export const InAPanel: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <CompoundRow
                label="Node color and opacity"
                segments={[
                    { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
                    { value: "100", unit: "%" },
                ]}
                trailing={<AdvancedButton label="Node color options" onClick={() => undefined} />}
            />
            <CompoundRow
                label="Edge color and opacity"
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
 * The `showLabels` preference (`PanelLabelsProvider`). The row's one name moves
 * out to a column of its own and the box fills the rest. Segments are never
 * labeled one by one: they are not separately named things.
 */
export const WithLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <Stack gap={0}>
                <CompoundRow
                    label="Node color"
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
 * Right to left. The glyph slot, padding, unit suffix and trailing slot swap
 * sides on their own; a hex value keeps its own reading order.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={0}>
                    <CompoundRow
                        label="Node color and opacity"
                        segments={[
                            { glyph: <Swatch color={PANEL_INK.ACCENT} />, value: "4A7EE8", mono: true, grow: true },
                            { value: "100", unit: "%" },
                        ]}
                        trailing={<AdvancedButton label="Node color options" onClick={() => undefined} />}
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
