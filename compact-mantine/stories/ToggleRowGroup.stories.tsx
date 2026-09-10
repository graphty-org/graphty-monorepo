import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    ControlSection,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    ToggleRow,
    ToggleRowGroup,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * The column two or more toggle rows are packed into.
 *
 * The group does two things, one visual and one editorial.
 *
 * **It packs the rows tighter.** Toggles sit at a 24px pitch rather than the
 * 32px every other row uses. A checkbox and one word need less room than a field
 * does, and a run of them reads better as a list than as a column of widely
 * spaced statements.
 *
 * **It holds the line on the rule a single row cannot: a lone boolean is not a
 * row.** One checkbox between other rows is a horizontal rule made of a single
 * word -- it interrupts the rhythm of the panel to say one bit. So a lone
 * boolean belongs in the trailing slot of the row it modifies, or as one tile of
 * an `IconGroupRow`, and only two or more booleans that belong together earn
 * rows of their own. The group warns in development when it is given one child,
 * and renders it anyway.
 *
 * **Name the set.** A run of checkboxes with no name is a list of unrelated
 * bits. If the section above already names them, point `labelledBy` at that
 * heading's `id` so the spoken name and the written one cannot drift apart. Only
 * when there is no visible name should you pass `label` instead.
 */
const meta: Meta<typeof ToggleRowGroup> = {
    title: "Editing a Value/ToggleRowGroup",
    component: ToggleRowGroup,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story): React.JSX.Element => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ToggleRowGroup>;

/**
 * Four booleans that belong together, at a 24px pitch.
 *
 * Every label has had its verb deleted: `Show labels` is `Labels`, `Animate
 * transitions` is `Transitions`. The checkbox already says the verb, and the row
 * has one word of space to spend.
 */
export const Default: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Node decorations">
            <ToggleRow label="Labels" defaultChecked />
            <ToggleRow label="Halos" />
            <ToggleRow label="Shadows" />
            <ToggleRow label="Transitions" defaultChecked />
        </ToggleRowGroup>
    ),
};

/**
 * Named by the heading above it, which is the better of the two options.
 *
 * `labelledBy` points at the id of an element already on the screen, so a screen
 * reader announces the group with the same words a sighted reader sees. Passing
 * `label` would restate the name in a second place, where it can drift.
 */
export const NamedByItsHeading: Story = {
    render: function NamedByItsHeadingStory(): React.JSX.Element {
        const headingId = React.useId();

        return (
            <Stack gap={PANEL_GRID.GUTTER}>
                <Text id={headingId} size="sm" c={PANEL_INK.VALUE} fw={500}>
                    Node decorations
                </Text>
                <ToggleRowGroup labelledBy={headingId}>
                    <ToggleRow label="Labels" defaultChecked />
                    <ToggleRow label="Halos" />
                    <ToggleRow label="Shadows" />
                </ToggleRowGroup>
            </Stack>
        );
    },
};

/**
 * Two groups under one section, each with its own name.
 *
 * Splitting them is what stops six checkboxes reading as one undifferentiated
 * list. The gap between the groups is the panel's own 8px, not a bigger one: two
 * groups of three, not two sections.
 */
export const TwoGroups: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.SECTION_PAD_BOTTOM}>
            <ToggleRowGroup label="Node decorations">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Halos" />
            </ToggleRowGroup>
            <ToggleRowGroup label="Edge decorations">
                <ToggleRow label="Arrows" defaultChecked />
                <ToggleRow label="Curves" />
                <ToggleRow label="Weights" />
            </ToggleRowGroup>
        </Stack>
    ),
};

/**
 * Mixed states: on, off, and one that cannot be changed.
 *
 * A disabled row keeps its place and its word, drops to the same dimmed colour
 * Mantine's own disabled controls use, and is announced as unavailable rather
 * than merely looking it.
 */
export const DisabledRows: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Rendering">
            <ToggleRow label="Labels" defaultChecked />
            <ToggleRow label="Halos" />
            <ToggleRow label="Shadows" disabled />
            <ToggleRow label="Ambient occlusion" disabled defaultChecked />
        </ToggleRowGroup>
    ),
};

/**
 * A row can carry a trailing control like any other row: a gear for the settings
 * behind the boolean, or a checkbox's own reset.
 *
 * The slot is 24px and is drawn on every row whether or not it is used, so the
 * rows still end in one column.
 */
export const WithTrailingControls: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Node decorations">
            <ToggleRow
                label="Labels"
                defaultChecked
                trailing={<AdvancedButton label="Label settings" changed onClick={(): void => undefined} />}
            />
            <ToggleRow label="Halos" trailing={<AdvancedButton label="Halo settings" onClick={(): void => undefined} />} />
            <ToggleRow label="Shadows" />
        </ToggleRowGroup>
    ),
};

/**
 * In a panel, which is where the 24px pitch earns its keep: two fields at 32px,
 * then four booleans in the height three of them would have taken.
 */
export const InThePanel: Story = {
    render: (): React.JSX.Element => (
        <ControlSection label="Appearance">
            <Box style={{display: "flex", gap: PANEL_GRID.GUTTER}}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" kind="number" defaultValue={1} />
                <PanelField label="Largest node size" glyph="sizeLargest" kind="number" defaultValue={4} />
            </Box>
            <ToggleRowGroup label="Node decorations">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Halos" />
                <ToggleRow label="Shadows" />
                <ToggleRow label="Transitions" defaultChecked />
            </ToggleRowGroup>
        </ControlSection>
    ),
};

/**
 * Right to left. Each checkbox moves to the leading edge with its word, and the
 * trailing slot moves to the other end, because the rows are laid out along the
 * inline axis rather than from the left.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <ToggleRowGroup label="Node decorations">
                    <ToggleRow
                        label="Labels"
                        defaultChecked
                        trailing={<AdvancedButton label="Label settings" onClick={(): void => undefined} />}
                    />
                    <ToggleRow label="Halos" />
                    <ToggleRow label="Shadows" />
                </ToggleRowGroup>
            </Box>
        </DirectionProvider>
    ),
};
