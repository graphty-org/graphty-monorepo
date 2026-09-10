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
} from "../src";

/**
 * A checkbox that turns a feature on and reveals the controls that configure
 * it.
 *
 * **Purpose:** Keeps a panel showing only what is currently in play. Turning
 * the feature off takes its settings off the screen entirely, rather than
 * leaving a row of controls that do nothing.
 *
 * **When to use:**
 * - For a yes or no that brings its own settings with it: a glow with a radius
 *   and a colour, an outline with a width, a legend with a position
 *
 * **Reach for `ToggleRow` instead** when the boolean has nothing underneath it.
 * A lone checkbox row is a `ToggleRow`, and two or more of them belong in a
 * `ToggleRowGroup`.
 *
 * **Key features:**
 * - The verb is deleted from the label: `Glow`, not `Enable glow`. The checkbox
 *   already says "enable"
 * - The checkbox says out loud that it opens something -- it is marked expanded
 *   or collapsed and points at the controls it reveals -- so a screen reader
 *   announces the relationship instead of leaving new controls to appear
 *   silently
 * - The revealed controls are taken out of the document when the feature is
 *   off, so nothing hidden can be reached by Tab
 * - Controlled with `checked`, uncontrolled with `defaultChecked`, and
 *   `onChange` is given the new state first and the event second
 */
const meta: Meta<typeof ToggleWithContent> = {
    title: "Editing a Value/ToggleWithContent",
    component: ToggleWithContent,
    tags: ["autodocs"],
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
 * Off. The feature's settings are not on the screen and not in the document.
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
 * On. The settings are indented under the checkbox, which is marked as
 * expanded and points at them.
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
 * Driven from your own state. `onChange` is given the new state first and the
 * event that caused it second, so a change can be recorded, undone, or made to
 * turn something else off.
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
 * Disabled. The word drops to the colour every disabled control in the library
 * uses, and the checkbox is announced as unavailable rather than merely looking
 * it.
 */
export const Disabled: Story = {
    args: {
        label: "Glow",
        disabled: true,
        children: <StyleNumberInput label="Radius" defaultValue={4} min={0} max={20} />,
    },
};

/**
 * Two features side by side, each with its own settings. A panel of these shows
 * only the settings of the features that are on.
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
 * The line between this component and `ToggleRow`: a boolean with settings
 * underneath it is this; a boolean with nothing underneath it is a `ToggleRow`,
 * and two or more of those belong in a `ToggleRowGroup`.
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
