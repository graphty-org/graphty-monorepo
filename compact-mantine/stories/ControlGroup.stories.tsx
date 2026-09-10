import { ActionIcon, Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { ControlGroup, PANEL_GRID, StyleNumberInput, StyleSelect, ToggleRow, UiGlyph } from "../src";

/**
 * A labelled group of controls with a rule above its name, which never folds
 * away.
 *
 * **Purpose:** Names a run of controls once, so the controls inside it can
 * spend their width on values instead of on labels of their own. Everything --
 * the rule, the name, any header buttons and the controls -- is on screen at
 * once.
 *
 * **When to use:**
 * - When the controls must stay visible, and folding them away would be wrong
 * - When the group is nested inside something that already has padding of its
 *   own, such as a pop-out panel or a sidebar. `bleed` runs the rule out
 *   through that padding, and no other component in this library does that
 *
 * **Reach for `ControlSection` instead** when the group should fold away, or
 * when it sits directly in a property panel and should line up on that panel's
 * 16px/8px grid. A section adds a chevron, a keyboard-operable header, an empty
 * state and an explanation bubble; this component adds none of those and takes
 * no state.
 *
 * **Key features:**
 * - A 1px rule above the name, optionally bled out through a container's
 *   padding
 * - Header buttons pinned to the end of the row, with the name shortening
 *   before they move
 * - Announced as one named group, so every control inside it is read as
 *   belonging to it
 * - Laid out entirely in inline terms, so it mirrors correctly in a
 *   right-to-left interface
 */
const meta: Meta<typeof ControlGroup> = {
    title: "Building a Panel/ControlGroup",
    component: ControlGroup,
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
type Story = StoryObj<typeof ControlGroup>;

const SHAPES = [
    { value: "circle", label: "Circle" },
    { value: "square", label: "Square" },
    { value: "diamond", label: "Diamond" },
];

/**
 * The rule, the name, and the controls the group holds. Nothing about it
 * collapses.
 */
export const Default: Story = {
    args: {
        label: "Appearance",
        children: (
            <Stack gap={4}>
                <ToggleRow label="Labels" defaultChecked />
                <StyleSelect label="Shape" defaultValue="circle" options={SHAPES} />
            </Stack>
        ),
    },
};

/**
 * Header buttons sit at the end of the row. Give each one an accessible name of
 * its own: they are outside the group's name and are not described by it.
 */
export const WithActions: Story = {
    args: {
        label: "Node size",
        actions: (
            <>
                <ActionIcon size={24} variant="subtle" color="gray" aria-label="Add a size rule">
                    <UiGlyph name="plus" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
                <ActionIcon size={24} variant="subtle" color="gray" aria-label="Reset node size">
                    <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            </>
        ),
        children: (
            <Stack gap={4}>
                <StyleNumberInput label="Smallest" defaultValue={1} min={1} max={20} />
                <StyleNumberInput label="Largest" defaultValue={8} min={1} max={20} />
            </Stack>
        ),
    },
};

/**
 * A name too long for the panel shortens with an ellipsis and keeps the buttons
 * where they are. The whole name stays in the document, so a screen reader
 * reads all of it, and a tooltip repeats it for a reader using a pointer.
 */
export const LongLabel: Story = {
    args: {
        label: "Betweenness centrality thresholds",
        actions: (
            <ActionIcon size={24} variant="subtle" color="gray" aria-label="Reset thresholds">
                <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
            </ActionIcon>
        ),
        children: (
            <Text size="sm" c="dimmed">
                The name shortened; the button did not move.
            </Text>
        ),
    },
};

/**
 * `bleed` pulls the rule out through the padding of the container the group
 * sits in, so it reads as a divider across the whole panel rather than as a
 * line floating inside it. The dashed box below is the container's padding.
 */
export const Bleed: Story = {
    render: () => (
        <Box
            p="sm"
            style={{
                border: "1px dashed var(--mantine-color-dimmed)",
                background: "var(--mantine-color-body)",
            }}
        >
            <Text size="xs" c="dimmed" mb="sm">
                A container with its own padding
            </Text>
            <ControlGroup label="Bled to the edges" bleed>
                <ToggleRow label="Labels" defaultChecked />
            </ControlGroup>
            <ControlGroup label="Stopped at the padding">
                <ToggleRow label="Transitions" />
            </ControlGroup>
        </Box>
    ),
};

/**
 * Groups stack. Each one draws its own rule, so a column of them reads as a
 * list of named runs of controls.
 */
export const Stacked: Story = {
    render: () => (
        <>
            <ControlGroup label="Appearance">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Transitions" />
            </ControlGroup>
            <ControlGroup label="Layout">
                <StyleSelect label="Shape" defaultValue="circle" options={SHAPES} />
            </ControlGroup>
        </>
    ),
};
