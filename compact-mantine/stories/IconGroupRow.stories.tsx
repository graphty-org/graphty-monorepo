import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import {
    AdvancedButton,
    FieldGlyph,
    IconGroupRow,
    PANEL_GRID,
    PANEL_INK,
    PanelLabelsProvider,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * Every glyph in this file is drawn the same way: a 16px viewBox, 1.5px round
 * strokes, and no colour of its own, so the drawing changes colour with the
 * selection.
 * @param root0 - Component props
 * @param root0.children - The inner shapes of the glyph
 * @returns The glyph SVG
 */
function GroupGlyph({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <svg
            width={PANEL_GRID.GLYPH}
            height={PANEL_GRID.GLYPH}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            style={{ flex: "0 0 auto", display: "block" }}
        >
            {children}
        </svg>
    );
}

/** The node shapes a graph can draw a point with. */
const SHAPE_OPTIONS = [
    {
        value: "box",
        label: "Box",
        icon: (
            <GroupGlyph>
                <rect x="3" y="3" width="10" height="10" rx="1" />
            </GroupGlyph>
        ),
    },
    {
        value: "sphere",
        label: "Sphere",
        icon: (
            <GroupGlyph>
                <circle cx="8" cy="8" r="5" />
                <ellipse cx="8" cy="8" rx="2.25" ry="5" />
            </GroupGlyph>
        ),
    },
    {
        value: "disc",
        label: "Disc",
        icon: (
            <GroupGlyph>
                <ellipse cx="8" cy="8" rx="5.5" ry="2.75" />
            </GroupGlyph>
        ),
    },
];

/** The three more shapes that take the set to its ceiling of six. */
const EXTRA_SHAPE_OPTIONS = [
    {
        value: "diamond",
        label: "Diamond",
        icon: (
            <GroupGlyph>
                <path d="M8 2.5 13.5 8 8 13.5 2.5 8z" />
            </GroupGlyph>
        ),
    },
    {
        value: "ring",
        label: "Ring",
        icon: (
            <GroupGlyph>
                <circle cx="8" cy="8" r="5.5" />
                <circle cx="8" cy="8" r="2" />
            </GroupGlyph>
        ),
    },
    {
        value: "cross",
        label: "Cross",
        icon: (
            <GroupGlyph>
                <path d="M6.5 2.5h3v4h4v3h-4v4h-3v-4h-4v-3h4z" />
            </GroupGlyph>
        ),
    },
];

/** The layouts, whose names the panel cannot afford to hide. */
const LAYOUT_OPTIONS = [
    {
        value: "force",
        label: "Force directed",
        icon: (
            <GroupGlyph>
                <circle cx="4" cy="5" r="1.75" />
                <circle cx="12" cy="4.5" r="1.75" />
                <circle cx="7.5" cy="12" r="1.75" />
                <line x1="5.7" y1="4.9" x2="10.3" y2="4.6" />
                <line x1="4.6" y1="6.6" x2="6.9" y2="10.3" />
                <line x1="11.2" y1="6" x2="8.3" y2="10.4" />
            </GroupGlyph>
        ),
    },
    {
        value: "hierarchical",
        label: "Hierarchical",
        icon: (
            <GroupGlyph>
                <circle cx="8" cy="3.5" r="1.5" />
                <circle cx="4" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <path d="M8 5v2.5H4.5v3M8 7.5h3.5v3" />
            </GroupGlyph>
        ),
    },
    {
        value: "radial",
        label: "Radial",
        icon: (
            <GroupGlyph>
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="5.5" strokeDasharray="2 2" />
                <circle cx="13" cy="8" r="1" />
                <circle cx="4.4" cy="4.9" r="1" />
                <circle cx="5.4" cy="12" r="1" />
            </GroupGlyph>
        ),
    },
];

/** The three curves a measured value can be drawn through. */
const SCALE_OPTIONS = [
    { value: "sqrt", label: "Square root", icon: <FieldGlyph name="scaleSqrt" /> },
    { value: "linear", label: "Linear", icon: <FieldGlyph name="scaleLinear" /> },
    { value: "log", label: "Logarithmic", icon: <FieldGlyph name="scaleLog" /> },
];

/** The floor of the range: two options, both drawable. */
const ROUTING_OPTIONS = [
    {
        value: "straight",
        label: "Straight edges",
        icon: (
            <GroupGlyph>
                <circle cx="3.5" cy="12.5" r="1.5" />
                <circle cx="12.5" cy="3.5" r="1.5" />
                <line x1="4.6" y1="11.4" x2="11.4" y2="4.6" />
            </GroupGlyph>
        ),
    },
    {
        value: "curved",
        label: "Curved edges",
        icon: (
            <GroupGlyph>
                <circle cx="3.5" cy="12.5" r="1.5" />
                <circle cx="12.5" cy="3.5" r="1.5" />
                <path d="M4.6 11.4C5.5 6.5 7.5 4.6 11.4 4.6" />
            </GroupGlyph>
        ),
    },
];

/**
 * A parent that owns the selection, for the controlled story. Declared at
 * module scope so the state survives a re-render of the story.
 * @returns The controlled row and a readout of what it chose
 */
function ControlledExample(): React.JSX.Element {
    const [shape, setShape] = useState("sphere");

    return (
        <Stack gap={PANEL_GRID.TRAIL_GAP}>
            <IconGroupRow
                label="Node shape"
                options={SHAPE_OPTIONS}
                value={shape}
                onChange={(next) => {
                    setShape(next);
                }}
            />
            <Text size="sm" c={PANEL_INK.CHROME}>
                Every point in the graph is drawn as: {shape}
            </Text>
        </Stack>
    );
}

/**
 * A row of two to six mutually exclusive options drawn as pictures, in one
 * segmented track.
 *
 * **Why it exists.** A select whose whole option list is short and pictureable
 * spends a row hiding all but one of its choices behind a chevron. This spends
 * the same row showing every choice at rest, so the alternatives are learnable
 * by looking rather than by opening something.
 *
 * **When to reach for it.** Two to six options whose difference can be *drawn*:
 * node shapes, edge routing, layouts, scale curves. Not more than six, which
 * stops reading as a set of drawings, and not a set whose options differ
 * conceptually rather than visually however few of them there are -- both of
 * those belong in a select. A legible checkbox is never worth converting into a
 * pair of pictures either. Outside two to six the row still renders and says so
 * once in the console during development.
 *
 * **How the width is spent.** The track takes 108px for up to three options and
 * 224px for four to six, chosen from the option count unless you pass `width`.
 * The segments then divide the track by what they hold, so a segment carrying a
 * word takes the room its word needs and the drawings share what is left. The
 * row's fixed 24px trailing slot is drawn whether or not it holds anything, so
 * this row ends level with every other row in the panel.
 *
 * **Naming the choices.** Each option carries the word it would have been
 * called. The word is not drawn unless you ask for it, but it is always what a
 * screen reader announces and what the tooltip says. Two things ask for it to
 * be drawn: `hybrid`, which names the selected option only, and
 * `PanelLabelsProvider`, the application-wide preference that puts a word beside
 * every control in the panel. Name the group itself with `label` or
 * `labelledBy`, or a reader hears the options without ever hearing what is being
 * chosen.
 *
 * **Keyboard.** The group is a set of radio buttons, so Tab reaches it in one
 * stop and lands on the current choice, the arrow keys move the selection and
 * the focus together, Home and End jump to the ends, and Space selects.
 *
 * **Right to left** needs no configuration, and matters more here than in most
 * rows: the arrow keys follow the direction the text runs, so ArrowRight always
 * moves to the segment on the right. See the *Right To Left* story.
 */
const meta: Meta<typeof IconGroupRow> = {
    title: "Editing a Value/IconGroupRow",
    component: IconGroupRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        // Both take arbitrary markup, which no control can edit.
        options: { control: false },
        trailing: { control: false },
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
type Story = StoryObj<typeof IconGroupRow>;

/**
 * Three drawable shapes in a 108px track. No words are spent: the drawings are
 * the labels, and each one's word is still its tooltip and the name a screen
 * reader announces.
 */
export const Default: Story = {
    args: {
        label: "Node shape",
        options: SHAPE_OPTIONS,
        defaultValue: "sphere",
    },
};

/**
 * `hybrid` at 224px. Layout names are exactly the names a panel cannot afford
 * to hide, so the drawing is on every segment and the word is on the selected
 * one. One row, current choice named, alternatives learnable by trying them.
 */
export const Hybrid: Story = {
    args: {
        label: "Layout",
        options: LAYOUT_OPTIONS,
        defaultValue: "force",
        hybrid: true,
        width: PANEL_GRID.BODY,
    },
};

/**
 * The curve a measured value is drawn through -- the transform between an
 * attribute such as a node's importance and the size it is drawn at. Three
 * curves, three drawings, no words needed.
 */
export const ScaleCurves: Story = {
    args: {
        label: "Scale",
        options: SCALE_OPTIONS,
        defaultValue: "sqrt",
    },
};

/**
 * The floor of the range. Two options are a group; one option is a statement
 * rather than a choice and belongs in a field.
 */
export const TwoOptions: Story = {
    args: {
        label: "Edge routing",
        options: ROUTING_OPTIONS,
        defaultValue: "curved",
    },
};

/**
 * The ceiling. Six drawable options take the 224px track automatically. A
 * seventh would stop reading as a set of drawings, so it belongs in a select --
 * the row says so in the console during development.
 */
export const SixOptions: Story = {
    args: {
        label: "Node shape",
        options: [...SHAPE_OPTIONS, ...EXTRA_SHAPE_OPTIONS],
        defaultValue: "disc",
    },
};

/**
 * With an advanced settings button in the 24px trailing slot: a gear that opens
 * the settings behind this row. It is drawn in the primary text colour, and
 * says so to a screen reader, because something behind it has been changed from
 * its default -- here the force layout's repulsion.
 */
export const WithTrailing: Story = {
    args: {
        label: "Layout",
        options: LAYOUT_OPTIONS,
        defaultValue: "force",
        hybrid: true,
        width: PANEL_GRID.BODY,
        trailing: (
            <AdvancedButton
                label="Layout options"
                changed
                onClick={() => {
                    // Opening the settings is the consumer's business.
                }}
            />
        ),
    },
};

/**
 * `width: "fill"` lets the track take whatever the row has left, and still
 * leaves the trailing slot standing. Use it inside a container narrower or
 * wider than the 280px panel this library measures for.
 */
export const FillsTheRow: Story = {
    args: {
        label: "Node shape",
        options: SHAPE_OPTIONS,
        defaultValue: "box",
        width: "fill",
    },
};

/**
 * Controlled: the parent owns the value. Choosing a shape here restyles every
 * point in the graph, so the choice belongs to the application's state rather
 * than to the row. `onChange` is handed the new value first and the event that
 * caused it second, so a consumer can read modifier keys or tell a keyboard
 * choice from a click.
 */
export const Controlled: Story = {
    render: (): React.JSX.Element => <ControlledExample />,
};

/**
 * An option that cannot be chosen, and a whole group that cannot. A disabled
 * option is drawn dimmer, is skipped by the arrow keys and is announced as
 * unavailable, rather than being left out of the group -- which would move
 * every other option and make the set harder to recognise.
 */
export const Unavailable: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <IconGroupRow
                label="Node shape"
                options={SHAPE_OPTIONS.map((option) =>
                    (option.value === "disc" ? { ...option, disabled: true } : option))}
                defaultValue="sphere"
            />
            <IconGroupRow label="Edge routing" options={ROUTING_OPTIONS} defaultValue="curved" disabled />
        </Stack>
    ),
};

/**
 * Naming the group from something already on the screen. Prefer `labelledBy`
 * to `label` whenever a heading or a caption already says what is being chosen,
 * so the drawn name and the announced one cannot drift apart.
 */
export const NamedByAHeading: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.TRAIL_GAP}>
            <Text id="edge-routing-heading" size="sm" c={PANEL_INK.CHROME}>
                Edge routing
            </Text>
            <IconGroupRow options={ROUTING_OPTIONS} defaultValue="curved" labelledBy="edge-routing-heading" />
        </Stack>
    ),
};

/**
 * Right to left. The track mirrors, the sliding ground follows the selection,
 * and -- the part that cannot be seen in a screenshot -- the arrow keys follow
 * the text: ArrowRight moves to the segment drawn on the right, which is the
 * *previous* option here. Set the direction once for your whole application
 * with Mantine's `DirectionProvider`.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <div dir="rtl">
                <Stack gap={0}>
                    <IconGroupRow label="Node shape" options={SHAPE_OPTIONS} defaultValue="sphere" />
                    <IconGroupRow
                        label="Layout"
                        options={LAYOUT_OPTIONS}
                        defaultValue="force"
                        hybrid
                        width={PANEL_GRID.BODY}
                    />
                </Stack>
            </div>
        </DirectionProvider>
    ),
};

/**
 * The `showLabels` preference, which is off by default. When a consumer turns
 * it on -- typically from a setting of their own -- every control in the panel
 * writes its word beside its drawing, this row included: every segment is
 * named, not only the selected one. Long words are cut off with an ellipsis and
 * stay complete in the tooltip and to a screen reader.
 */
export const WithPanelLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <Stack gap={0}>
                <IconGroupRow
                    label="Edge routing"
                    options={ROUTING_OPTIONS}
                    defaultValue="curved"
                    width={PANEL_GRID.BODY}
                />
                <IconGroupRow
                    label="Layout"
                    options={LAYOUT_OPTIONS}
                    defaultValue="hierarchical"
                    hybrid
                    width={PANEL_GRID.BODY}
                />
            </Stack>
        </PanelLabelsProvider>
    ),
};
