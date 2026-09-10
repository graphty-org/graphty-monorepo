import { Box, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    LabelsProvider,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    PanelLabelsProvider,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A compact field for one changeable value, with a glyph in place of a caption.
 *
 * **Purpose:** Replaces the caption-above-input stack. The word that used to sit
 * above the input becomes a 14px drawing in a 16px slot inside the box, which
 * halves the height of a property panel and starts the value at exactly 24px
 * from the field's leading edge in every row.
 *
 * **What it is:** a real form control -- a text box, a number box or a
 * drop-down. It can be typed into, it works with `value`/`onChange` or on its
 * own with `defaultValue`, and a screen reader announces both its name and its
 * value.
 *
 * **When to use:**
 * - For any value someone can change: a number, a name, a colour, a choice
 * - In pairs at 108px, alone at 224px, or filling a row
 * - Never for a yes-or-no (that is a toggle row) and never for the reader's own
 *   strings (that is a data row)
 *
 * **Key features:**
 * - The glyph slot doubles as a drag handle: `onScrubStart`, `onScrub` and
 *   `onScrubEnd` make one drag one undo entry
 * - A filled glyph says the value follows a data attribute; a hollow one says it
 *   was typed in once
 * - A word for a disagreement across a multiple selection, which stays editable
 * - A chevron inside the box for a drop-down -- it never moves out to the slot
 *   at the end of the row
 * - A small accent square in the slot's corner for a value that has not taken
 *   effect yet
 * - `PanelLabelsProvider` puts the word back beside the glyph
 */
const meta: Meta<typeof PanelField> = {
    title: "Editing a Value/PanelField",
    component: PanelField,
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
type Story = StoryObj<typeof PanelField>;

/**
 * One of a pair: a 108px field whose glyph stands in for the word "Smallest".
 * It has a value and no change handler, so it is read-only -- which is what a
 * field that only reports a number should be.
 */
export const Default: Story = {
    args: {
        label: "Smallest node size",
        glyph: "sizeSmallest",
        value: "1.0",
    },
};

/**
 * The pair, at 108 + 8 + 108. Two fields, one row, no captions spent.
 */
export const Pair: Story = {
    render: (): React.JSX.Element => (
        <Group gap={PANEL_GRID.GUTTER} wrap="nowrap">
            <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            <PanelField label="Largest node size" glyph="sizeLargest" value="2.0" />
        </Group>
    ),
};

/**
 * Typing into a field. Give it `onChange` and it becomes editable; the value
 * comes first and the event second, so a programmatic change is expressible with
 * no event at all.
 */
export const Editable: Story = {
    render: (): React.JSX.Element => <EditableField />,
};

/**
 * A text field wired to its own state, for the Editable story.
 * @returns An editable field
 */
function EditableField(): React.JSX.Element {
    const [name, setName] = React.useState("Betweenness");

    return (
        <Stack gap="xs">
            <PanelField
                label="Label attribute"
                glyph="attribute"
                width={PANEL_GRID.BODY}
                value={name}
                onChange={(next) => {
                    setName(String(next));
                }}
            />
            <Text size="xs" c={PANEL_INK.CHROME}>
                {`onChange -> ${name}`}
            </Text>
        </Stack>
    );
}

/**
 * A number field. Up and down arrows step the value, and the digits follow the
 * reader's locale rather than being forced into English.
 */
export const NumberBox: Story = {
    render: (): React.JSX.Element => <NumberField />,
};

/**
 * A number field wired to its own state, for the number box story.
 * @returns A number field
 */
function NumberField(): React.JSX.Element {
    const [depth, setDepth] = React.useState<string | number>(2);

    return (
        <PanelField
            label="Traversal depth"
            glyph="D"
            kind="number"
            min={1}
            max={12}
            value={depth}
            onChange={setDepth}
        />
    );
}

/**
 * A body-span field at 224px, with a unit. The unit is a dimmed suffix at the
 * end of the same box, and the value's own room is measured to leave space for
 * it however long the translated word turns out to be.
 */
export const WithUnit: Story = {
    args: {
        label: "Edge width",
        glyph: "width",
        value: "1.5",
        unit: "links",
        width: PANEL_GRID.BODY,
    },
};

/**
 * Bound to a data attribute: the glyph draws filled. A hollow glyph on the same
 * field would say the value was typed in once, which is the entire
 * "Fixed | By attribute" control, deleted. A screen reader is told about the
 * binding as well, since a filled shape is not something it can see.
 */
export const Bound: Story = {
    args: {
        label: "Size by attribute",
        glyph: "attribute",
        value: "Age",
        bound: true,
        kind: "select",
        width: PANEL_GRID.BODY,
    },
};

/**
 * A real drop-down: give the field `data` and it offers the choices itself, with
 * arrow keys, Escape and a listbox that assistive technology understands.
 */
export const Choices: Story = {
    render: (): React.JSX.Element => <ChoicesField />,
};

/**
 * A drop-down wired to its own state, for the Choices story.
 * @returns A drop-down field
 */
function ChoicesField(): React.JSX.Element {
    const [layout, setLayout] = React.useState<string | number>("Force directed");

    return (
        <PanelField
            label="Layout"
            kind="select"
            width={PANEL_GRID.BODY}
            data={["Force directed", "Hierarchical", "Radial", "Circular"]}
            value={layout}
            onChange={setLayout}
        />
    );
}

/**
 * The drop-down look without a drop-down list. With no `data` the field draws
 * the chevron and stays read-only, and `onClick` opens whatever you have built
 * for it -- a pop-out, a picker, a dialog.
 */
export const OpensYourOwnPanel: Story = {
    args: {
        label: "Layout",
        value: "Force directed",
        kind: "select",
        width: PANEL_GRID.BODY,
        onClick: () => undefined,
    },
};

/**
 * A multiple selection whose values disagree. The word for a disagreement stands
 * in for the value at full strength, and the field is still editable: typing
 * sets every selected item at once.
 */
export const Mixed: Story = {
    args: {
        label: "Opacity",
        glyph: "opacity",
        value: "100",
        mixed: true,
        unit: "%",
        onChange: () => undefined,
    },
};

/**
 * The same field with the library's strings translated. Every word this library
 * produces can be replaced through `LabelsProvider`, and anything left out keeps
 * its English default.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider locale="de-DE" labels={{ mixed: "Verschieden" }}>
            <PanelField label="Deckkraft" glyph="opacity" value="100" mixed unit="%" onChange={() => undefined} />
        </LabelsProvider>
    ),
};

/**
 * An unset value. Passing placeholder text leaves the field empty and shows the
 * text in the placeholder colour, which is both what it looked like before and
 * what it now means to a screen reader.
 */
export const Placeholder: Story = {
    args: {
        label: "Label attribute",
        glyph: "attribute",
        placeholder: "Choose",
        kind: "select",
        width: PANEL_GRID.BODY,
    },
};

/**
 * Set earlier but not yet in effect: a 4px accent square in the corner of the
 * glyph slot, and a description a screen reader can read.
 */
export const Pending: Story = {
    args: {
        label: "Largest node size",
        glyph: "sizeLargest",
        value: "4.0",
        pending: true,
    },
};

/**
 * A capital letter in place of a glyph, from the closed set N, E, W, D, K.
 */
export const Letter: Story = {
    args: {
        label: "Depth",
        glyph: "D",
        value: "2",
    },
};

/**
 * A colour swatch in the slot, which is the one glyph that is not a drawing from
 * the built-in set.
 */
export const Swatch: Story = {
    args: {
        label: "Node colour",
        glyph: (
            <Box
                style={{
                    width: PANEL_GRID.GLYPH,
                    height: PANEL_GRID.GLYPH,
                    borderRadius: "var(--mantine-radius-xs)",
                    background: PANEL_INK.ACCENT,
                    border: `1px solid ${PANEL_INK.BORDER}`,
                    boxSizing: "border-box",
                }}
            />
        ),
        value: "4A7EE8",
        width: PANEL_GRID.BODY,
    },
};

/**
 * Draggable: the glyph slot takes an `ew-resize` cursor and a pointer drag.
 * The three handlers bracket the gesture, so the whole drag is one entry in the
 * undo history rather than one per pixel. The value can still be typed, which is
 * the keyboard way to the same place. On a touch screen the slot does not drag:
 * there the glyph is a target, not a handle.
 */
export const Draggable: Story = {
    render: (): React.JSX.Element => <DraggableField />,
};

/**
 * A field whose value follows the drag, with a log of the gesture boundaries.
 * @returns A draggable field wired to its own state
 */
function DraggableField(): React.JSX.Element {
    const [size, setSize] = React.useState(1);
    const [log, setLog] = React.useState<string[]>([]);

    return (
        <Stack gap="xs">
            <PanelField
                label="Smallest node size"
                glyph="sizeSmallest"
                value={size.toFixed(1)}
                onScrubStart={() => {
                    setLog((entries) => [...entries, "start"]);
                }}
                onScrub={(delta) => {
                    setSize((current) => Math.max(0, current + delta / 20));
                }}
                onScrubEnd={() => {
                    setLog((entries) => [...entries, "end"]);
                }}
            />
            <Text size="xs" c={PANEL_INK.CHROME}>
                {log.length === 0 ? "Drag the glyph sideways" : log.join(" - ")}
            </Text>
        </Stack>
    );
}

/**
 * Right to left. Every measurement in the field is written as a logical
 * property, so the glyph, the value and the unit all change ends together, and a
 * drag towards the start of the line still lowers the value.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={PANEL_GRID.TRAIL_GAP}>
                    <PanelField label="Edge width" glyph="width" value="1.5" unit="%" width={PANEL_GRID.BODY} />
                    <PanelField label="Layout" value="Force directed" kind="select" width={PANEL_GRID.BODY} />
                </Stack>
            </Box>
        </DirectionProvider>
    ),
};

/**
 * Not usable: the field is skipped by the Tab key, drawn in the disabled ink,
 * and announced as unavailable.
 */
export const Disabled: Story = {
    args: {
        label: "Edge width",
        glyph: "width",
        value: "1.5",
        disabled: true,
    },
};

/**
 * The `showLabels` preference. `PanelLabelsProvider` is off by default; when it
 * is on, the word rejoins the glyph inside the box, in a fixed column so that
 * every field in the panel still starts its value at the same place.
 */
export const WithLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <Stack gap={PANEL_GRID.TRAIL_GAP}>
                <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" width="fill" />
                <PanelField label="Largest" glyph="sizeLargest" value="4.0" width="fill" />
            </Stack>
        </PanelLabelsProvider>
    ),
};
