import { Box, DirectionProvider, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { AdvancedButton, PANEL_GRID, PANEL_INK, ToggleRow, ToggleRowGroup } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";
// Imported from "../../../src", the package's published entry point, so the
// stories exercise exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A single yes-or-no setting on a 32px panel row: a checkbox (or a switch) and one word.
 *
 * ## When to use it
 *
 * Reach for `ToggleRow` when a setting is a plain boolean that no value or picture could stand
 * for -- whether labels are drawn, whether transitions animate -- and it has at least one sibling
 * boolean to share a `ToggleRowGroup` with.
 *
 * | You have | Use |
 * |---|---|
 * | Two or more related booleans | `ToggleRow`s inside a `ToggleRowGroup` |
 * | A boolean that brings its own settings (a glow with a color and a radius) | `ToggleWithContent` |
 * | One lone boolean that qualifies another row | a Mantine `Checkbox` in that row's `TrailingSlot` (see Components/Panels and rows/TrailingSlot) |
 * | Two to six exclusive options that can be drawn | Mantine `SegmentedControl` (see Themed Mantine/Selection/SegmentedControl, `PicturesInAPanelRow`) |
 * | A setting with a value or a unit | a field row (`PanelField`, `FieldRow`) |
 *
 * **Delete the verb from the label.** `Show labels` is written `Labels`, `Animate transitions`
 * is written `Transitions`: the checkbox already says the verb.
 *
 * ## Usage
 *
 * ```tsx
 * import { ToggleRow, ToggleRowGroup } from "@graphty/compact-mantine";
 *
 * <ToggleRowGroup labelledBy="render-options-heading">
 *     <ToggleRow label="Labels" checked={labels} onChange={setLabels} />
 *     <ToggleRow label="Physics" control="switch" defaultChecked />
 * </ToggleRowGroup>
 * ```
 *
 * `onChange(next, event)` gives the new state first and the browser event second. Use `checked`
 * to drive the row from your own state, or `defaultChecked` to let it keep its own.
 *
 * ## Keyboard and accessibility
 *
 * - Tab reaches the control, Space toggles it; clicking the word toggles it too.
 * - A real `<input type="checkbox">` (APG Checkbox pattern), or `role="switch"` for
 *   `control="switch"`, so the checked and disabled states are announced, not only drawn.
 * - The word is the accessible name. A word too long for the row is cut with an ellipsis, read
 *   out in full, and repeated as a tooltip.
 * - `disabledReason` becomes the tooltip and the accessible description of a disabled row.
 * - `bound` draws the filled attribute glyph and announces "bound to data" (translatable through
 *   `LabelsProvider`).
 * - Laid out on the inline axis, so it mirrors under `dir="rtl"` with no configuration.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row height | 32px (`PANEL_GRID.TOGGLE_PITCH`) |
 * | Checkbox | 16 x 16, radius 2, the neutral variant (gray when checked) |
 * | Switch | 32 x 16 track, 12 x 8 pill knob |
 * | Word | 8px after the control, 11/16, weight 450 |
 * | Trailing slot | 24px, 8px after the word's column, drawn even when empty |
 */
const meta: Meta<typeof ToggleRow> = {
    title: "Components/Selection/ToggleRow",
    component: ToggleRow,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        // Only the shape of the control is spelled out here; every description
        // in the table comes from the component's own doc comments.
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
 * One row on its own, to isolate the anatomy: a 16px checkbox and the word beside it. Edit it
 * from the Controls table. In a panel it always has a sibling, inside a `ToggleRowGroup`.
 */
export const Default: Story = {
    args: {
        label: "Labels",
        defaultChecked: true,
        control: "checkbox",
    },
};

/**
 * Every state, light and dark side by side: the checkbox off, on, focused, disabled with a
 * reason and bound to data, then the switch off, on and disabled. Keyboard focus is on the
 * marked cell of the light half.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <Box style={{ width: PANEL_GRID.CONTENT }}>
            <StateGrid
                columns={PANEL_GRID.CONTENT}
                cells={[
                    ["checkbox, off", <ToggleRow label="Labels" />],
                    ["checkbox, on", <ToggleRow label="Labels" defaultChecked />],
                    ["checkbox, focus", <div data-story-focus><ToggleRow label="Labels" defaultChecked /></div>],
                    ["checkbox, disabled", <ToggleRow label="Labels" disabled disabledReason="Load data first" />],
                    ["checkbox, bound", <ToggleRow label="Labels" bound defaultChecked />],
                    ["switch, off", <ToggleRow label="Live layout" control="switch" />],
                    ["switch, on", <ToggleRow label="Live layout" control="switch" defaultChecked />],
                    ["switch, disabled", <ToggleRow label="Live layout" control="switch" disabled defaultChecked />],
                ]}
            />
        </Box>
    ),
    play: focusMarked,
};

/**
 * The verb is deleted from every label: `Show labels` becomes `Labels`, `Animate transitions`
 * becomes `Transitions`, `Highlight bridges` becomes `Bridges`, `Include isolated nodes` becomes
 * `Isolated nodes`.
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
 * The switch form, for a boolean that is a live mode (a simulation running right now) rather
 * than an option. It is announced with the switch role, so a screen reader says "on" and "off".
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
 * An advanced settings button in the 24px trailing slot, for the rare control that belongs to
 * the row's own boolean. The gear is drawn in the primary ink because something behind it has
 * been changed from its default.
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
 * Controlled: the caller owns the state. Turning `Labels` off turns `Self loops` off and
 * disables it, a dependency only the caller can know about.
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
 * `onChange` gives the new state first and the event second: hold Shift while clicking any row
 * and every row follows it. The library decides nothing about Shift; the handler reads it.
 */
export const ReadingTheEvent: Story = {
    render: (): React.JSX.Element => <ShiftTogglesEverything />,
};

/**
 * Three toggles where a shift-click sets all of them at once, for the **ReadingTheEvent** story.
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
 * A label longer than the row, as a translation often is, is cut with an ellipsis rather than
 * pushing the trailing slot out of the panel. It is still read out in full and shown as a
 * tooltip.
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
 * Right to left: the word follows the control on the inline axis and the trailing slot stays at
 * the row's end, so the row mirrors as a whole. Set `dir="rtl"` and Mantine's
 * `DirectionProvider`; nothing on the row needs configuring.
 */
export const RightToLeft: Story = {
    // The words stay in English on purpose: they make it obvious which way the
    // control, the word and the trailing slot moved.
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
