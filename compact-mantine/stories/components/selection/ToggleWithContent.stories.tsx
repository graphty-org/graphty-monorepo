import { Box, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
    CompactColorInput,
    PANEL_GRID,
    PopoutManager,
    StyleNumberInput,
    StyleSelect,
    ToggleRow,
    ToggleRowGroup,
    ToggleWithContent,
} from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * A checkbox that turns a feature on and reveals the controls that configure it.
 *
 * ## When to use it
 *
 * Reach for `ToggleWithContent` for a yes or no that brings its own settings with it: a glow
 * with a color and a radius, an outline with a width, a legend with a position. Turning the
 * feature off takes its settings off the screen, so the panel shows only what is in play.
 *
 * Reach for `ToggleRow` (inside a `ToggleRowGroup`) when the boolean has nothing underneath it,
 * and for a Mantine `Checkbox` in a row's `TrailingSlot` when it is a lone boolean qualifying
 * that row.
 *
 * ## Usage
 *
 * ```tsx
 * import { StyleNumberInput, ToggleWithContent } from "@graphty/compact-mantine";
 *
 * <ToggleWithContent label="Glow" checked={glow} onChange={setGlow}>
 *     <StyleNumberInput label="Radius" defaultValue={4} min={0} max={20} />
 * </ToggleWithContent>
 * ```
 *
 * Delete the verb from the label: `Glow`, not `Enable glow`. If a revealed control opens a
 * pop-out (`CompactColorInput`), a `PopoutManager` must be above it.
 *
 * ## Keyboard and accessibility
 *
 * - Tab reaches the checkbox, Space toggles it and reveals or removes the controls.
 * - APG Disclosure carried by a checkbox: `aria-expanded` says whether the settings are shown,
 *   and `aria-controls` points at them while they are on screen.
 * - The revealed controls are unmounted when the feature is off, so nothing hidden is reachable
 *   by Tab or read out.
 * - `disabledReason` becomes the tooltip and accessible description of a disabled toggle.
 *   Controls already revealed stay revealed; disable them yourself if they should be too.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Toggle | the 32px checkbox row of `ToggleRow` (16px neutral checkbox, word 8px after) |
 * | Revealed controls | indented 8px, 4px apart, 4px below the toggle, no animation |
 */
const meta: Meta<typeof ToggleWithContent> = {
    title: "Components/Selection/ToggleWithContent",
    component: ToggleWithContent,
    argTypes: { children: { control: false } },
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ToggleWithContent>;

const POSITIONS = [
    { value: "top-left", label: "Top left" },
    { value: "top-right", label: "Top right" },
    { value: "bottom-left", label: "Bottom left" },
];

/**
 * Off: the feature's settings are neither on the screen nor in the document. Tick it, or set
 * `defaultChecked` in the Controls table, to reveal them.
 */
export const Default: Story = {
    args: {
        label: "Glow",
        children: (
            <>
                <CompactColorInput label="Color" defaultColor="#5b8ff9" showOpacity={false} />
                <StyleNumberInput label="Radius" defaultValue={4} min={0} max={20} />
            </>
        ),
    },
};

/**
 * Off, on (the revealed controls follow at the same inset, in one frame), focused and disabled
 * with a reason, light and dark side by side. Keyboard focus is on the marked cell of the light half.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Box style={{ width: PANEL_GRID.CONTENT }}>
            <StateGrid
                columns={PANEL_GRID.CONTENT}
                cells={[
                    ["off", <ToggleWithContent label="Glow"><StyleNumberInput label="Radius" defaultValue={4} /></ToggleWithContent>],
                    ["on", <ToggleWithContent label="Glow" defaultChecked><StyleNumberInput label="Radius" defaultValue={4} /></ToggleWithContent>],
                    [
                        "focus",
                        <div data-story-focus>
                            <ToggleWithContent label="Glow"><StyleNumberInput label="Radius" defaultValue={4} /></ToggleWithContent>
                        </div>,
                    ],
                    ["disabled", <ToggleWithContent label="Glow" disabled disabledReason="Needs a 3D layout"><span /></ToggleWithContent>],
                ]}
            />
        </Box>
    ),
    // Expanded shows the content below, which the component renders; the box itself does not change.
    play: async (context) => {
        await focusMarked(context);
        await expectStatesApply(context.canvasElement, { ignore: ["expanded"] });
    },
};

/**
 * On: the settings are indented under the checkbox, which is marked expanded and points at them.
 */
export const Enabled: Story = {
    args: {
        label: "Glow",
        defaultChecked: true,
        children: (
            <>
                <CompactColorInput label="Color" defaultColor="#5b8ff9" showOpacity={false} />
                <StyleNumberInput label="Radius" defaultValue={4} min={0} max={20} />
            </>
        ),
    },
};

/**
 * Driven from your own state. `onChange` gets the new state first and the event second, so a
 * change can be recorded, undone, or made to turn something else off.
 */
export const Controlled: Story = {
    render: function ControlledToggle() {
        const [enabled, setEnabled] = useState(false);

        return (
            <ToggleWithContent
                label="Legend"
                checked={enabled}
                onChange={(next) => {
                    setEnabled(next);
                }}
            >
                <StyleSelect label="Position" defaultValue="top-left" options={POSITIONS} />
            </ToggleWithContent>
        );
    },
};

/**
 * Two features, each with its own settings: a panel of these shows only the settings of the
 * features that are on.
 */
export const Several: Story = {
    render: () => (
        <Stack gap={4}>
            <ToggleWithContent label="Glow" defaultChecked>
                <CompactColorInput label="Color" defaultColor="#5b8ff9" showOpacity={false} />
            </ToggleWithContent>
            <ToggleWithContent label="Outline">
                <StyleNumberInput label="Width" defaultValue={1} min={0} max={8} />
            </ToggleWithContent>
        </Stack>
    ),
};

/**
 * The line between this component and `ToggleRow`: a boolean with settings underneath is this;
 * booleans with nothing underneath are `ToggleRow`s in a `ToggleRowGroup`.
 */
export const OrAToggleRow: Story = {
    render: () => (
        <Stack gap={4}>
            <ToggleWithContent label="Glow" defaultChecked>
                <StyleNumberInput label="Radius" defaultValue={4} min={0} max={20} />
            </ToggleWithContent>
            <ToggleRowGroup label="Render options">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Transitions" />
            </ToggleRowGroup>
        </Stack>
    ),
};
