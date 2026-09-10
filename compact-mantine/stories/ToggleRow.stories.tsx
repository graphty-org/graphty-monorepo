import { Box, DirectionProvider, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    PANEL_GRID,
    PANEL_INK,
    ToggleRow,
    ToggleRowGroup,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A single yes-or-no setting on a row of its own, packed tighter than every
 * other row type.
 *
 * **Purpose:** carries a setting that is a plain boolean -- whether labels are
 * drawn, whether transitions animate, whether isolated nodes are included --
 * where no value or glyph could stand in for it. It is the tightest row in a
 * panel: toggles sit on a 24px pitch rather than the 32px pitch every other row
 * uses, because a 16px control needs no air around it to stay legible.
 *
 * **When to use:**
 * - For two or more related booleans that belong together, wrapped in a
 *   `ToggleRowGroup`
 * - Never for a lone boolean. One checkbox between other rows is a horizontal
 *   rule made of one word; it belongs in the 24px trailing slot of the row it
 *   modifies, or as one tile of a group of icon buttons. `ToggleRowGroup` warns
 *   on the console in a development build when it holds fewer than two rows
 * - Never for a setting that has a value or a unit -- that is a field row
 *
 * **Key features:**
 * - **The verb is deleted from the label.** `Show labels` is written `Labels`;
 *   `Animate transitions` is written `Transitions`. The checkbox already says
 *   "show", so the row's one word is spent on what is shown
 * - A 16px Mantine `Checkbox` by default, or a 28x16 `Switch` when the boolean
 *   is a live mode rather than an option
 * - Real inputs: Tab reaches them, Space toggles them, the word beside the
 *   control toggles it too, and the checked and disabled states are announced
 *   rather than only drawn
 * - Controlled or uncontrolled, and `onChange` hands you the new state first
 *   and the event that caused it second
 * - The same fixed 24px trailing slot every other row type ends with
 * - Lays out on the inline axis, so it reads correctly in a right-to-left
 *   language without any work from you
 */
const meta: Meta<typeof ToggleRow> = {
    title: "Editing a Value/ToggleRow",
    component: ToggleRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        // Only the shape of the control is spelled out here; every description
        // in the table comes from the component's own doc comments, so the
        // documentation has one source.
        control: {
            control: "inline-radio",
            options: ["checkbox", "switch"],
        },
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
type Story = StoryObj<typeof ToggleRow>;

/**
 * One row on its own: a 16px checkbox and the single word beside it.
 *
 * A lone row is shown here only to isolate the anatomy. In a real panel it
 * always has at least one sibling -- see **Group**.
 */
export const Default: Story = {
    args: {
        label: "Labels",
        defaultChecked: true,
    },
};

/**
 * The shape it ships in: two or more booleans packed at a 24px pitch, with no
 * gap between them, because each row is already exactly 24px tall.
 *
 * These are the options for what the renderer draws beside each node.
 */
export const Group: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Render options">
            <ToggleRow label="Labels" defaultChecked />
            <ToggleRow label="Transitions" />
            <ToggleRow label="Arrows" defaultChecked />
            <ToggleRow label="Self loops" />
        </ToggleRowGroup>
    ),
};

/**
 * The verb is deleted from every label.
 *
 * Each label below is what is left after the verb is struck out. `Show labels`
 * becomes `Labels`, `Animate transitions` becomes `Transitions`, `Highlight
 * bridges` becomes `Bridges`, `Include isolated nodes` becomes `Isolated
 * nodes`. Four verbs, every one of them already spelled by the checkbox itself.
 */
export const VerbDeleted: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Render options">
            <ToggleRow label="Labels" defaultChecked />
            <ToggleRow label="Transitions" defaultChecked />
            <ToggleRow label="Bridges" />
            <ToggleRow label="Isolated nodes" />
        </ToggleRowGroup>
    ),
};

/**
 * The switch form, at 28x16.
 *
 * A switch is for a boolean that is a **live mode** -- something that is on or
 * off right now, such as a layout simulation that is still running -- rather
 * than an option that will be true the next time the view is drawn. A boolean
 * that reads the same in the past tense is a checkbox.
 *
 * A switch is announced with the switch role, so a screen reader says "on" and
 * "off" where it says "checked" and "unchecked" for a checkbox.
 */
export const SwitchControl: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Live modes">
            <ToggleRow label="Physics" control="switch" defaultChecked />
            <ToggleRow label="Minimap" control="switch" />
        </ToggleRowGroup>
    ),
};

/**
 * An advanced settings button in the trailing slot.
 *
 * The fixed 24px slot at the end of the row is the same one every other row
 * type ends with, so a toggle row can carry the rare control that belongs to
 * its own boolean -- here, the placement and font behind the `Labels` toggle.
 * The gear is drawn in the primary text colour, and says so in its accessible
 * name, because something behind it has been changed from its default.
 */
export const WithAdvancedSettings: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Render options">
            <ToggleRow
                label="Labels"
                defaultChecked
                trailing={
                    <AdvancedButton
                        label="Label options"
                        changed
                        onClick={() => {
                            // Opens the label settings panel in the host app.
                        }}
                    />
                }
            />
            <ToggleRow label="Arrows" />
        </ToggleRowGroup>
    ),
};

/**
 * Naming the group with a heading that is already on the screen.
 *
 * A screen reader announces the rows as one set rather than as loose
 * checkboxes. Point `labelledBy` at the id of the heading above the group, so
 * the spoken name and the written one cannot drift apart; pass `label` instead
 * only when there is no heading to point at.
 */
export const NamedByItsHeading: Story = {
    render: (): React.JSX.Element => (
        <Box>
            <Text id="render-options-heading" size="xs" fw={500} c={PANEL_INK.VALUE} h={PANEL_GRID.SECTION_HEADER}>
                Render options
            </Text>
            <ToggleRowGroup labelledBy="render-options-heading">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Arrows" defaultChecked />
                <ToggleRow label="Transitions" />
            </ToggleRowGroup>
        </Box>
    ),
};

/**
 * Disabled rows keep their place and their word, drop to the dimmed colour
 * Mantine's own disabled controls use, and are announced as unavailable rather
 * than merely looking it.
 *
 * `Bridges` cannot be highlighted until the bridge attribute has been computed
 * over the graph, and `Betweenness` until the centrality run finishes.
 */
export const Disabled: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Highlights">
            <ToggleRow label="Age" defaultChecked />
            <ToggleRow label="Bridges" disabled />
            <ToggleRow label="Betweenness" disabled />
        </ToggleRowGroup>
    ),
};

/**
 * Controlled mode: the caller owns the state.
 *
 * Turning `Labels` off turns `Self loops` off with it, because a self loop is
 * only legible when the node it belongs to is named -- the kind of dependency
 * only the caller can know about.
 */
export const Controlled: Story = {
    render: (): React.JSX.Element => <ControlledLabelToggles />,
};

/**
 * Two toggles whose state the caller owns, for the **Controlled** story.
 * @returns A pair of controlled toggle rows
 */
function ControlledLabelToggles(): React.JSX.Element {
    const [labels, setLabels] = React.useState(true);
    const [selfLoops, setSelfLoops] = React.useState(true);

    return (
        <ToggleRowGroup label="Label options">
            <ToggleRow
                label="Labels"
                checked={labels}
                onChange={(next) => {
                    setLabels(next);
                    if (!next) {
                        setSelfLoops(false);
                    }
                }}
            />
            <ToggleRow label="Self loops" checked={selfLoops} disabled={!labels} onChange={setSelfLoops} />
        </ToggleRowGroup>
    );
}

/**
 * `onChange` gives you the new state first and the event second, so a gesture
 * can mean more than one thing.
 *
 * Hold **Shift** while clicking any row below and every row follows it. The
 * modifier is read from the event the browser fired -- nothing in the library
 * decides what Shift means, and a handler that only wants the value can still
 * be written `onChange={setLabels}`.
 */
export const ReadingTheEvent: Story = {
    render: (): React.JSX.Element => <ShiftTogglesEverything />,
};

/**
 * Three toggles where a shift-click sets all of them at once, for the
 * **ReadingTheEvent** story.
 * @returns A group of toggles that read the modifier keys off the change event
 */
function ShiftTogglesEverything(): React.JSX.Element {
    const [options, setOptions] = React.useState({ arrows: true, labels: true, transitions: false });

    /**
     * Sets one option, or every option when the pointer was held with Shift.
     * @param key - Which option changed
     * @returns A change handler for that option's row
     */
    const set = (key: keyof typeof options) => {
        return (next: boolean, event?: React.SyntheticEvent): void => {
            const native = event?.nativeEvent;
            const all = native instanceof MouseEvent && native.shiftKey;

            setOptions((current) =>
                all ? { arrows: next, labels: next, transitions: next } : { ...current, [key]: next },
            );
        };
    };

    return (
        <Box>
            <ToggleRowGroup label="Render options">
                <ToggleRow label="Labels" checked={options.labels} onChange={set("labels")} />
                <ToggleRow label="Arrows" checked={options.arrows} onChange={set("arrows")} />
                <ToggleRow label="Transitions" checked={options.transitions} onChange={set("transitions")} />
            </ToggleRowGroup>
            <Text size="xs" c={PANEL_INK.CHROME} mt={PANEL_GRID.TRAIL_GAP}>
                Shift-click a row to set all three.
            </Text>
        </Box>
    );
}

/**
 * A label longer than the row is shortened with an ellipsis, and stays readable
 * anyway.
 *
 * A translation routinely runs half again as long as the English, so the word
 * is allowed to shrink rather than push the trailing slot out of the panel. The
 * ellipsis is drawn by CSS, so the whole word is still the control's accessible
 * name, and it is repeated as a tooltip for a sighted pointer user.
 */
export const LongLabels: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Beschriftungsoptionen">
            <ToggleRow label="Beschriftungen der Knotenpunkte einblenden" defaultChecked />
            <ToggleRow label="Uebergangsanimationen" />
            <ToggleRow
                label="Isolierte Knoten in die Berechnung einbeziehen"
                trailing={
                    <AdvancedButton
                        label="Weitere Einstellungen"
                        onClick={() => {
                            // Opens the advanced settings in the host app.
                        }}
                    />
                }
            />
        </ToggleRowGroup>
    ),
};

/**
 * The same rows with text running right to left.
 *
 * The word sits after the control on the inline axis rather than to its right,
 * and the trailing slot stays at the end of the row rather than on the right of
 * it, so the row mirrors as a whole. Wrap your app in Mantine's
 * `DirectionProvider` and set `dir="rtl"`; nothing in this component needs
 * configuring.
 */
export const RightToLeft: Story = {
    // The words are left in English on purpose: what this story is for is the
    // mirroring, and English words under dir="rtl" make it obvious which way
    // the control, the word and the trailing slot moved.
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <ToggleRowGroup label="Render options">
                    <ToggleRow label="Labels" defaultChecked />
                    <ToggleRow label="Arrows" defaultChecked />
                    <ToggleRow
                        label="Transitions"
                        trailing={
                            <AdvancedButton
                                label="Label options"
                                onClick={() => {
                                    // Opens the label settings panel in the host app.
                                }}
                            />
                        }
                    />
                </ToggleRowGroup>
            </Box>
        </DirectionProvider>
    ),
};

/**
 * The design error the group exists to catch.
 *
 * One boolean is not a row. `ToggleRowGroup` renders it anyway -- refusing to
 * draw would help nobody at runtime -- and warns on the console in a
 * development build, where the design is actually being edited. The fix is to
 * move the boolean into the trailing slot of the row it modifies, as
 * **WithAdvancedSettings** does, or to give it a sibling.
 */
export const LoneBooleanWarns: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Minimap">
            <ToggleRow label="Minimap" defaultChecked />
        </ToggleRowGroup>
    ),
};

/**
 * Two groups in one panel, the way a property panel stacks them: what the
 * renderer draws, then what a centrality run includes.
 */
export const TwoGroups: Story = {
    render: (): React.JSX.Element => (
        <Box>
            <ToggleRowGroup label="Render options">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Arrows" defaultChecked />
                <ToggleRow label="Transitions" />
            </ToggleRowGroup>
            <Box h={PANEL_GRID.SECTION_PAD_BOTTOM} />
            <ToggleRowGroup label="Run options">
                <ToggleRow label="Isolated nodes" />
                <ToggleRow label="Edge weights" defaultChecked />
                <ToggleRow label="Normalised" defaultChecked />
            </ToggleRowGroup>
        </Box>
    ),
};
