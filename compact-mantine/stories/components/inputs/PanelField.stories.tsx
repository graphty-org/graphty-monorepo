import { Box, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import React from "react";

import {
    LabelsProvider,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    PanelLabelsProvider,
} from "../../../src";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A compact field for one changeable value -- a number, a word or a choice -- with a 12px glyph
 * inside the box in place of a caption above it.
 *
 * ## When to use it
 *
 * Reach for `PanelField` for any value in a property panel that the reader can change: it is the
 * control a dense panel is mostly made of. Reach for `FieldRow` to lay one or two PanelFields out
 * on the panel grid (a pair at 88 + 8 + 88, or one at 184) with a trailing slot. Never use it for
 * a yes or no (that is `ToggleRow`) or for a reading the reader cannot change (that is `DataRow`).
 *
 * | You have | Use |
 * |---|---|
 * | A number that scrubs, steps and takes arithmetic | `PanelField kind="number"` |
 * | A number with a default the reader overrides | `StyleNumberInput` |
 * | One of a list of choices | `PanelField kind="select"` with `data`, or `Select` |
 * | A word or a name | `PanelField` (the default `kind="text"`) |
 *
 * ## Usage
 *
 * ```tsx
 * import { PanelField } from "@graphty/compact-mantine";
 *
 * <PanelField label="Radius" glyph="width" kind="number" min={0} value={radius} onChange={setRadius} />
 * <PanelField label="Layout" kind="select" data={["Force", "Radial"]} value={layout} onChange={setLayout} />
 * ```
 *
 * A field given `value` and no `onChange` is read-only. `onChange(value, event?)` hands the value
 * first; a number field reports once per commit. `onScrubStart` / `onScrub` / `onScrubEnd`
 * bracket a drag of the glyph so it is one undo entry. `PanelLabelsProvider showLabels` puts the
 * word back beside the glyph.
 *
 * ## Keyboard and accessibility
 *
 * - Number field: ArrowUp / ArrowDown step at once (Shift: ten steps); typing (arithmetic such as
 *   `40*2` works) commits on Enter (focus stays), Tab or blur; Escape reverts what was typed.
 * - Select field: Enter or Space opens the list on the current choice, arrows move, Enter
 *   commits, Escape closes and returns focus to the field.
 * - A real `<label>` names the field (the `label` prop), so the glyph never has to be read. A
 *   number field is `role="spinbutton"` with `aria-valuenow` and the `stepHint` description; a
 *   select field follows the APG select-only combobox pattern.
 * - `bound`, `pending` and `mixed` are announced through the field's description, not only drawn.
 * - The glyph slot drags with a pointer only; on touch it is a target, not a handle.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px, in a 32px row |
 * | Width | 88 (one of a pair), 184 (body) or `"fill"` |
 * | Glyph slot | 24 x 24 at the leading edge; the value starts at x+24 |
 * | Radius | 5px |
 * | Text | 11/16, weight 450 |
 * | Scrub rate | 0.5 unit per pixel, one commit on release |
 */
const meta: Meta<typeof PanelField> = {
    title: "Components/Inputs/PanelField",
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
 * One of a pair: an 88px field whose glyph stands in for the word "Smallest".
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
 * Every state, light and dark side by side: the filled number
 * field at rest, hovered and focused (forced with `data-state`), disabled, Mixed, bound, pending,
 * with a unit, a text field, a placeholder, and the outlined select trigger.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <StateGrid
            cells={[
                { state: "number rest", node: <PanelField label="X" glyph="W" kind="number" defaultValue={40} /> },
                {
                    state: "hover",
                    node: <PanelField label="X" glyph="W" kind="number" defaultValue={40} data-state="hover" />,
                },
                {
                    state: "focus",
                    node: <PanelField label="X" glyph="W" kind="number" defaultValue={40} data-state="focus" />,
                },
                { state: "disabled", node: <PanelField label="X" glyph="W" kind="number" value={40} disabled /> },
                { state: "Mixed", node: <PanelField label="X" glyph="W" kind="number" value={40} mixed onChange={() => undefined} /> },
                { state: "bound", node: <PanelField label="Size" glyph="attribute" value="Age" bound /> },
                { state: "pending", node: <PanelField label="Largest" glyph="sizeLargest" value="4.0" pending /> },
                { state: "unit", node: <PanelField label="Opacity" glyph="opacity" kind="number" defaultValue={100} unit="%" /> },
                { state: "text", node: <PanelField label="Name" glyph="attribute" defaultValue="Betweenness" /> },
                { state: "placeholder", node: <PanelField label="Label attribute" glyph="attribute" placeholder="Choose" /> },
                {
                    state: "select",
                    node: <PanelField label="Layout" kind="select" data={["Force", "Radial"]} defaultValue="Force" />,
                },
            ]}
        />
    ),
};

/**
 * The pair, at 88 + 8 + 88. Two fields, one row, no captions spent.
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
 * A body-span field at 184px, with a unit. The unit is a dimmed suffix at the
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
 * An unset value. Passing placeholder text leaves the field empty and shows the
 * text in the placeholder color, which is both what it looked like before and
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
 * A color swatch in the slot, which is the one glyph that is not a drawing from
 * the built-in set.
 */
export const Swatch: Story = {
    args: {
        label: "Node color",
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

/**
 * Keyboard and pointer together: a drag on the glyph moves the value half a unit per pixel and
 * commits once on release; typing takes arithmetic (`40*2`) and commits on Enter. The play
 * function checks both commits.
 */
export const ScrubAndType: Story = {
    render: (): React.JSX.Element => <ScrubbedField />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const box = canvas.getByRole("spinbutton", { name: "X" });
        const slot = canvas.getByTestId("panel-field-slot");
        const { left, top } = slot.getBoundingClientRect();
        // Real pointer events on the handle: press, move 20px along the text, release.
        const at = (type: string, x: number): void => {
            slot.dispatchEvent(
                new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX: x, clientY: top + 12 }),
            );
        };
        at("pointerdown", left + 12);
        at("pointermove", left + 22);
        at("pointermove", left + 32);
        at("pointerup", left + 32);
        await waitFor(() => expect(canvas.getByTestId("commits")).toHaveTextContent("50"));
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}a{/Control}40*2{Enter}");
        await waitFor(() => expect(canvas.getByTestId("commits")).toHaveTextContent("50, 80"));
    },
};

/**
 * A number field that lists every committed value.
 * @returns the field and its commit log
 */
function ScrubbedField(): React.JSX.Element {
    const [value, setValue] = React.useState<string | number>(40);
    const [commits, setCommits] = React.useState<number[]>([]);
    return (
        <Stack gap="xs">
            <PanelField
                label="X"
                glyph="W"
                kind="number"
                value={value}
                onChange={(next) => {
                    setValue(next);
                    setCommits((list) => [...list, Number(next)]);
                }}
            />
            <Text size="xs" c={PANEL_INK.CHROME} data-testid="commits">
                {commits.join(", ")}
            </Text>
        </Stack>
    );
}

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
