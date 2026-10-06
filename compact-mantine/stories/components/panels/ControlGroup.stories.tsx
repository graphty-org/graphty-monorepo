import { ActionIcon, Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { ControlGroup, ControlSection, FieldRow, PANEL_GRID, PanelField, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * A named cluster of rows that never folds: a 16px legend band carrying the
 * group's name as a small caption, then the rows.
 *
 * It names a run of controls once, so the controls inside can spend their width
 * on values. Everything -- the legend, any header buttons and the rows -- is on
 * screen at once, and the group holds no state.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **ControlGroup** | A named cluster of rows inside a section or a pop-out -- Figma's "Position" or "Alignment" legends. Always open. |
 * | **ControlSection** | A subject of the panel, with a 40px header, a rule below, and a chevron where it folds. |
 * | **ControlSubGroup** | A fold one level below a section for rarely-opened settings. |
 *
 * If you find yourself wanting a group that folds, you wanted a section.
 *
 * ## Usage
 *
 * ```tsx
 * import { ControlGroup, FieldRow, PanelField } from "@graphty/compact-mantine";
 *
 * <ControlGroup label="Position">
 *     <FieldRow>
 *         <PanelField label="X" value="100" />
 *         <PanelField label="Y" value="40" />
 *     </FieldRow>
 * </ControlGroup>
 * ```
 *
 * `bleed` is deprecated and has no effect: the group no longer draws a rule.
 *
 * ## Keyboard and accessibility
 *
 * - Nothing in the group itself is interactive; Tab moves through the controls
 *   it holds.
 * - It is a `group` named by the visible legend through `aria-labelledby`, so
 *   every control inside is announced as belonging to it.
 * - Header buttons sit outside the group's name: give each one an accessible
 *   name of its own.
 * - A legend too long for the band shortens with an ellipsis; the full name
 *   stays in the document and in a `title` for pointer users.
 * - Laid out in logical properties, so it mirrors right to left.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Legend band | 16px tall |
 * | Legend text | 9/14 caption, weight 500, secondary ink, ellipsized |
 * | Field row under a legend | 48px in all: 16 legend + 32 row with its 24px control centered |
 * | Rule | none (groups inside a section are not divided) |
 */
const meta: Meta<typeof ControlGroup> = {
    title: "Components/Panels and rows/ControlGroup",
    component: ControlGroup,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        children: { control: false },
        actions: { control: false },
        bleed: { control: false },
    },
    decorators: [
        // Every story sits in a 240px panel with a section's 16 | 8 content padding. States
        // lays out several panels side by side, and InASection lets the section pad itself.
        (Story, context): React.JSX.Element =>
            context.name === "States" || context.name === "In A Section" ? (
                <Box w={context.name === "States" ? undefined : PANEL_GRID.WIDTH} bg="var(--cm-bg)">
                    <Story />
                </Box>
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={{ paddingInline: "16px 8px" }}>
                    <Story />
                </Box>
            ),
    ],
};

export default meta;
type Story = StoryObj<typeof ControlGroup>;

/**
 * The legend and one field row beneath it. Edit the name in the Controls table.
 */
export const Default: Story = {
    args: {
        label: "Position",
        children: (
            <FieldRow>
                <PanelField label="X" value="100" />
                <PanelField label="Y" value="40" />
            </FieldRow>
        ),
    },
};

/**
 * The legend in its states, light and dark: over a field row (48px in all),
 * with header actions, and with a name too long for the band.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Legend and a field row" padded>
                <ControlGroup label="Position">
                    <FieldRow>
                        <PanelField label="X" value="100" />
                        <PanelField label="Y" value="40" />
                    </FieldRow>
                </ControlGroup>
            </StoryState>
            <StoryState name="With actions" padded>
                <ControlGroup
                    label="Alignment"
                    actions={
                        <ActionIcon aria-label="Reset alignment" size={16}>
                            <UiGlyph name="close" size={10} />
                        </ActionIcon>
                    }
                >
                    <FieldRow>
                        <PanelField label="Rotation" value="0" />
                    </FieldRow>
                </ControlGroup>
            </StoryState>
            <StoryState name="Long name" padded>
                <ControlGroup label="Betweenness centrality thresholds for the size ramp">
                    <FieldRow>
                        <PanelField label="Smallest" value="0.1" />
                    </FieldRow>
                </ControlGroup>
            </StoryState>
        </StoryStates>
    ),
};

/**
 * Header buttons sit at the end of the legend and the name shortens before
 * they move. Give each button an accessible name of its own.
 */
export const WithActions: Story = {
    args: {
        label: "Node size",
        actions: (
            <>
                <ActionIcon size={16} aria-label="Add a size rule">
                    <UiGlyph name="plus" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
                <ActionIcon size={16} aria-label="Reset node size">
                    <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            </>
        ),
        children: (
            <FieldRow groupLabel="Node size range">
                <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest" glyph="sizeLargest" value="8.0" />
            </FieldRow>
        ),
    },
};

/**
 * Where groups usually live: several of them inside one section, each naming
 * its own run of rows, none of them folding.
 */
export const InASection: Story = {
    render: () => (
        <ControlSection label="Frame" collapsible={false}>
            <ControlGroup label="Position">
                <FieldRow>
                    <PanelField label="X" value="100" />
                    <PanelField label="Y" value="40" />
                </FieldRow>
            </ControlGroup>
            <ControlGroup label="Dimensions">
                <FieldRow>
                    <PanelField label="Width" value="240" />
                    <PanelField label="Height" value="320" />
                </FieldRow>
            </ControlGroup>
        </ControlSection>
    ),
};
