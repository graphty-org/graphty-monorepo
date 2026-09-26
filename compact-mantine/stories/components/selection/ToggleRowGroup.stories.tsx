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
} from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked } from "../../helpers/selection-states";
// Imported from "../../../src", the package's published entry point, so the
// stories exercise exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * The named column that two or more `ToggleRow`s are stacked in, at the 32px panel row pitch.
 *
 * ## When to use it
 *
 * Reach for `ToggleRowGroup` whenever you have two or more related booleans: it stacks their
 * rows with no gap (each row is already 32px tall) and names the set for a screen reader.
 *
 * It also holds the line on a rule a single row cannot: **a lone boolean is not a row.** One
 * checkbox between other rows interrupts the panel to say one bit. Put a lone boolean in the
 * `TrailingSlot` of the row it modifies instead. The group warns on the console in a development
 * build when it is given fewer than two rows, and renders them anyway.
 *
 * A boolean that brings its own settings is a `ToggleWithContent`, not a row in this group.
 * Two to six exclusive options that can be drawn are a Mantine `SegmentedControl` (see Themed
 * Mantine/Selection/SegmentedControl, `PicturesInAPanelRow`).
 *
 * ## Usage
 *
 * ```tsx
 * import { ToggleRow, ToggleRowGroup } from "@graphty/compact-mantine";
 *
 * <Text id="decorations-heading">Node decorations</Text>
 * <ToggleRowGroup labelledBy="decorations-heading">
 *     <ToggleRow label="Labels" defaultChecked />
 *     <ToggleRow label="Halos" />
 * </ToggleRowGroup>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - `role="group"`, so the rows are announced as one set rather than loose checkboxes.
 * - Name it with `labelledBy` (the id of the heading already on screen, preferred, so the spoken
 *   and written names cannot drift apart) or `label` when there is no visible heading.
 * - Each row keeps its own keyboard behavior: Tab reaches it, Space toggles it.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row pitch | 32px, no gap between rows |
 * | Width | the panel content column, 216px in a 240px panel |
 */
const meta: Meta<typeof ToggleRowGroup> = {
    title: "Components/Selection/ToggleRowGroup",
    component: ToggleRowGroup,
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
 * Four booleans that belong together, with the verb deleted from every label. The children are
 * an array rather than a fragment, because a fragment counts as one child.
 */
export const Default: Story = {
    args: {
        label: "Node decorations",
        children: [
            <ToggleRow key="labels" label="Labels" defaultChecked />,
            <ToggleRow key="halos" label="Halos" />,
            <ToggleRow key="shadows" label="Shadows" />,
            <ToggleRow key="transitions" label="Transitions" defaultChecked />,
        ],
    },
};

/**
 * The group's rows in every state they take, light and dark side by side: on, focused, disabled
 * with a reason, and the switch form. Keyboard focus is on the marked row of the light half.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <Box style={{ width: PANEL_GRID.CONTENT }}>
            <ToggleRowGroup label="Draw">
                <ToggleRow label="Labels" defaultChecked />
                <div data-story-focus>
                    <ToggleRow label="Arrows" />
                </div>
                <ToggleRow label="Halos" disabled disabledReason="Needs a 3D layout" />
                <ToggleRow label="Live layout" control="switch" defaultChecked />
            </ToggleRowGroup>
        </Box>
    ),
    play: async (context) => {
        await focusMarked(context);
        await expectStatesApply(context.canvasElement);
    },
};

/**
 * Named by the heading above it, the better of the two options: `labelledBy` reuses the words a
 * sighted reader sees, where `label` would restate them in a second place.
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
 * Two groups under one section, each with its own name, 8px apart: two groups of booleans, not
 * two sections, and not six checkboxes reading as one undifferentiated list.
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
 * A row can carry a trailing control like any other row. The 24px slot is drawn on every row
 * whether or not it is used, so the rows still end in one column.
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
 * In a panel section: two number fields on a 32px row, then four booleans on the same pitch.
 */
export const InThePanel: Story = {
    render: (): React.JSX.Element => (
        <ControlSection label="Appearance">
            <Box style={{ display: "flex", gap: PANEL_GRID.GUTTER }}>
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
 * The design error the group exists to catch: one boolean. It renders anyway and warns on the
 * console in a development build. The fix is to move the boolean into the trailing slot of the
 * row it modifies, or to give it a sibling.
 */
export const LoneBooleanWarns: Story = {
    render: (): React.JSX.Element => (
        <ToggleRowGroup label="Minimap">
            <ToggleRow label="Minimap" defaultChecked />
        </ToggleRowGroup>
    ),
};

/**
 * Right to left: each checkbox moves to the leading edge with its word and the trailing slot to
 * the other end, because the rows are laid out on the inline axis.
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
