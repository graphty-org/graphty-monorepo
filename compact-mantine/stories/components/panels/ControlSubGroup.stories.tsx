import { Box, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import {
    AdvancedButton,
    ControlSection,
    ControlSubGroup,
    FieldRow,
    PANEL_GRID,
    PanelField,
    ToggleRow,
} from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * A collapsible sub-group one level below a section: a quiet 32px row with a
 * chevron in the gutter, holding settings most readers never open.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **AdvancedButton** in the section's `actions` | The usual answer for rare settings: a gear that opens a pop-out, which is how Figma keeps them off the panel. |
 * | **ControlSubGroup** | The rare settings must stay in the panel's flow, folded under the section's common controls -- text effects under Labels, easing under Animation. |
 * | **ControlSection** | A subject of the panel in its own right. |
 * | **ControlGroup** | A named cluster that never folds. |
 *
 * Never make a sub-group the only thing in a section: that is two chevrons
 * where one would do.
 *
 * ## Usage
 *
 * ```tsx
 * import { ControlSection, ControlSubGroup, ToggleRow } from "@graphty/compact-mantine";
 *
 * <ControlSection label="Labels">
 *     <ToggleRow label="Labels" defaultChecked />
 *     <ControlSubGroup label="Text effects">
 *         <ToggleRow label="Outline" />
 *         <ToggleRow label="Shadow" />
 *     </ControlSubGroup>
 * </ControlSection>
 * ```
 *
 * It starts closed. Drive it with `opened` and `onOpenChange`, or let it keep
 * its own state with `defaultOpened`.
 *
 * ## Keyboard and accessibility
 *
 * - The header is one button (Enter or Space toggles it) carrying
 *   `aria-expanded` and `aria-controls`, named "Expand ..." or "Collapse ..."
 *   followed by the visible label.
 * - The content is a `region` named by that button. Nothing inside a closed
 *   sub-group can be reached by Tab, and its content stays mounted, so a
 *   half-typed value survives a fold.
 * - The chevron is drawn text inside the button, not a second button, and it
 *   points along the text direction.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 32px tall |
 * | Chevron | 16px slot hanging in the section's 16px left gutter |
 * | Label | 11/16, weight 450, secondary ink; primary ink on hover over 100ms |
 * | Content | opens in one frame, on the same grid as the rows around it |
 */
const meta: Meta<typeof ControlSubGroup> = {
    title: "Components/Panels and rows/ControlSubGroup",
    component: ControlSubGroup,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        children: { control: false },
    },
    decorators: [
        // Every story sits in a 240px panel with a section's 16 | 8 content padding, so the
        // chevron has its gutter. States brings its own panels, and InsideASection pads itself.
        (Story, context): React.JSX.Element => {
            if (context.name === "States") {
                return <Story />;
            }
            const padded = context.name !== "Inside A Section";
            return (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={padded ? { paddingInline: "16px 8px" } : undefined}>
                    <Story />
                </Box>
            );
        },
    ],
};

export default meta;
type Story = StoryObj<typeof ControlSubGroup>;

/**
 * Closed, as a sub-group starts unless told otherwise. Toggle `defaultOpened`
 * in the Controls table (it applies on the next mount).
 */
export const Default: Story = {
    args: {
        label: "Text effects",
        children: (
            <>
                <ToggleRow label="Outline" />
                <ToggleRow label="Shadow" />
            </>
        ),
    },
};

/**
 * Every state of the sub-group row, light and dark: closed, open, under the
 * pointer (the label comes up to the primary ink) and with keyboard focus. The first one is shown open.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => {
        const rows = (
            <FieldRow>
                <PanelField label="Duration" value="300" />
            </FieldRow>
        );
        return (
            <StoryStates>
                <StoryState name="Closed" padded>
                    <ControlSubGroup label="Advanced animation settings">{rows}</ControlSubGroup>
                </StoryState>
                <StoryState name="Open" padded>
                    <ControlSubGroup label="Advanced animation settings" defaultOpened>
                        {rows}
                    </ControlSubGroup>
                </StoryState>
                <StoryState name="Hover" force="hover" padded>
                    <ControlSubGroup label="Advanced animation settings">{rows}</ControlSubGroup>
                </StoryState>
                <StoryState name="Focus (keyboard)" force="focus" padded>
                    <ControlSubGroup label="Advanced animation settings">{rows}</ControlSubGroup>
                </StoryState>
            </StoryStates>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const [first] = canvas.getAllByRole("button", { name: "Expand Advanced animation settings" });
        await userEvent.click(first);
        await expect(first).toHaveAttribute("aria-expanded", "true");
    },
};

/**
 * Where a sub-group belongs: inside a section, under the controls people
 * actually reach for, with an advanced settings button in the header for the
 * rest.
 */
export const InsideASection: Story = {
    render: () => (
        <ControlSection label="Labels" actions={<AdvancedButton label="Label settings" onClick={() => undefined} />}>
            <ToggleRow label="Labels" defaultChecked />
            <ControlSubGroup label="Text effects">
                <ToggleRow label="Outline" />
                <ToggleRow label="Shadow" />
            </ControlSubGroup>
        </ControlSection>
    ),
};

/**
 * Driven from your own state. `onOpenChange` gets the new state first and the
 * event second, so opening one sub-group can close another, or the change can
 * be recorded in an undo history.
 */
export const Controlled: Story = {
    render: function ControlledSubGroups(): React.JSX.Element {
        const [open, setOpen] = useState<string | null>("effects");

        return (
            <Stack gap={0}>
                <ControlSubGroup
                    label="Text effects"
                    opened={open === "effects"}
                    onOpenChange={(opened) => {
                        setOpen(opened ? "effects" : null);
                    }}
                >
                    <ToggleRow label="Outline" />
                    <ToggleRow label="Shadow" />
                </ControlSubGroup>
                <ControlSubGroup
                    label="Animation"
                    opened={open === "animation"}
                    onOpenChange={(opened) => {
                        setOpen(opened ? "animation" : null);
                    }}
                >
                    <FieldRow>
                        <PanelField label="Easing" value="Linear" kind="select" />
                    </FieldRow>
                    <FieldRow>
                        <PanelField label="Duration" value="200" unit="ms" />
                    </FieldRow>
                </ControlSubGroup>
            </Stack>
        );
    },
};

/**
 * A name too long for the panel shortens with an ellipsis. The whole name stays
 * in the header button's accessible name, so it is read out in full.
 */
export const LongLabel: Story = {
    args: {
        label: "Text effects, outlines and drop shadows",
        children: <ToggleRow label="Outline" />,
    },
};
