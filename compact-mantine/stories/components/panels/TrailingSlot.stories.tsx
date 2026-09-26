import { Box, Checkbox, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { AdvancedButton, FieldRow, PANEL_GRID, PANEL_INK, PanelField, ToggleRow, TrailingSlot, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * The fixed 24px slot every panel row ends with, drawn whether or not it holds
 * anything.
 *
 * A panel is a column, and a column only reads as one if its rows end in the
 * same place. Some rows end in a control -- a gear that opens advanced
 * settings, a reset, a checkbox -- and most do not. If the slot were drawn only
 * when filled, every row without one would run 32px further than the row above
 * it. So an empty slot is the common, correct case.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **The row's `trailing` prop** | Almost always. FieldRow, CompoundRow, ToggleRow, RampRow, DataRow and the chart rows already reserve the slot. |
 * | **TrailingSlot** | You are laying out a row of your own and want it to end in the library's column. |
 * | **AdvancedButton** | The usual thing to put in the slot: a 24px gear that opens the rarer settings (its own page is under Components/Actions). |
 *
 * A lone boolean that qualifies the row belongs in the slot as a checkbox, not
 * on a row of its own.
 *
 * ## Usage
 *
 * ```tsx
 * import { AdvancedButton, PANEL_GRID, PanelField, TrailingSlot } from "@graphty/compact-mantine";
 *
 * <div style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRAIL_GAP }}>
 *     <PanelField label="Edge width" glyph="width" kind="number" width={PANEL_GRID.BODY} defaultValue={2} />
 *     <TrailingSlot>
 *         <AdvancedButton label="Edge width options" onClick={openOptions} />
 *     </TrailingSlot>
 * </div>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The slot has no role, no name and no keyboard behaviour; whatever you put
 *   in it carries all three. An empty slot adds nothing to the reading order.
 * - It writes no left or right of its own, so it moves to the leading edge with
 *   the rest of the row under `dir="rtl"`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Slot | 24 x 24, at x 208..232 of the 240px panel |
 * | Gap before it | 8px (`PANEL_GRID.TRAIL_GAP`) |
 * | Grid | 16 + 88 + 8 + 88 + 8 + 24 + 8 = 240 |
 */
const meta: Meta<typeof TrailingSlot> = {
    title: "Components/Panels and rows/TrailingSlot",
    component: TrailingSlot,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        children: { control: false },
    },
    decorators: [
        // Every story sits in a 240px panel with a section's 16 | 8 content padding; States
        // lays out several panels side by side, so it brings its own.
        (Story, context): React.JSX.Element =>
            context.name === "States" ? (
                <Story />
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={{ paddingInline: "16px 8px" }}>
                    <Story />
                </Box>
            ),
    ],
};

export default meta;
type Story = StoryObj<typeof TrailingSlot>;

/** The layout a hand-built row uses: a 184px body, an 8px gap, then the slot. */
const ROW_STYLE = { display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center" } as const;

/**
 * A row of your own on the library's grid, with an advanced settings button in
 * the slot. The dashed outline is drawn by the story so you can see the box;
 * the component paints nothing.
 */
export const Default: Story = {
    args: {
        children: <AdvancedButton label="Edge width options" onClick={(): void => undefined} />,
    },
    render: (args): React.JSX.Element => (
        <Box style={ROW_STYLE}>
            <PanelField label="Edge width" glyph="width" kind="number" width={PANEL_GRID.BODY} defaultValue={2} />
            <Box style={{ outline: `1px dashed ${PANEL_INK.BORDER}` }}>
                <TrailingSlot {...args} />
            </Box>
        </Box>
    ),
};

/**
 * The slot and the advanced settings button in every state, light and dark: an
 * empty slot holding the column, the button at rest, with its pop-out open (the
 * selected look, from `aria-expanded`), changed, and disabled.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => {
        const field = <PanelField label="Size" value="4.0" />;
        return (
            <StoryStates>
                <StoryState name="Empty slot" padded>
                    <FieldRow>{field}</FieldRow>
                </StoryState>
                <StoryState name="Rest" padded>
                    <FieldRow trailing={<AdvancedButton label="Range and scale" />}>{field}</FieldRow>
                </StoryState>
                <StoryState name="Open" padded>
                    <FieldRow trailing={<AdvancedButton label="Range and scale" aria-expanded />}>{field}</FieldRow>
                </StoryState>
                <StoryState name="Changed" padded>
                    <FieldRow trailing={<AdvancedButton label="Range and scale" changed />}>{field}</FieldRow>
                </StoryState>
                <StoryState name="Disabled" padded>
                    <FieldRow trailing={<AdvancedButton label="Range and scale" disabled />}>{field}</FieldRow>
                </StoryState>
            </StoryStates>
        );
    },
};

/**
 * The point of the component: three rows, only one with a trailing control,
 * all three ending in the same column. The empty slots are what does that.
 */
export const EmptySlotsKeepTheColumn: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            {[
                { label: "Edge width", glyph: "width" as const, value: 2, trailing: true },
                { label: "Opacity", glyph: "opacity" as const, value: 80, trailing: false },
                { label: "Smallest node size", glyph: "sizeSmallest" as const, value: 1, trailing: false },
            ].map((row) => (
                <Box key={row.label} style={ROW_STYLE}>
                    <PanelField
                        label={row.label}
                        glyph={row.glyph}
                        kind="number"
                        width={PANEL_GRID.BODY}
                        defaultValue={row.value}
                    />
                    <Box style={{ outline: `1px dashed ${PANEL_INK.BORDER}` }}>
                        <TrailingSlot>
                            {row.trailing ? (
                                <AdvancedButton label={`${row.label} options`} onClick={(): void => undefined} />
                            ) : null}
                        </TrailingSlot>
                    </Box>
                </Box>
            ))}
        </Stack>
    ),
};

/**
 * What goes in the slot: anything 24px square. An advanced settings button, a
 * reset, a checkbox for the lone boolean that qualifies this row, or nothing.
 */
export const WhatGoesInIt: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            <Box style={ROW_STYLE}>
                <PanelField label="Label size" glyph="width" kind="number" width={PANEL_GRID.BODY} defaultValue={12} />
                <TrailingSlot>
                    <AdvancedButton label="Label settings" changed onClick={(): void => undefined} />
                </TrailingSlot>
            </Box>
            <Box style={ROW_STYLE}>
                <PanelField label="Opacity" glyph="opacity" kind="number" width={PANEL_GRID.BODY} defaultValue={80} />
                <TrailingSlot>
                    <AdvancedButton
                        label="Reset opacity to default"
                        icon={<UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />}
                        onClick={(): void => undefined}
                    />
                </TrailingSlot>
            </Box>
            <Box style={ROW_STYLE}>
                <PanelField label="Halo colour" glyph="attribute" width={PANEL_GRID.BODY} defaultValue="community" bound />
                <TrailingSlot>
                    <Checkbox aria-label="Draw halos" defaultChecked />
                </TrailingSlot>
            </Box>
            <Box style={ROW_STYLE}>
                <PanelField label="Node shape" width={PANEL_GRID.BODY} defaultValue="circle" />
                <TrailingSlot />
            </Box>
        </Stack>
    ),
};

/**
 * Right to left. The slot moves to the leading edge with the rest of the row
 * and needs nothing set on it: `dir="rtl"` and Mantine's `DirectionProvider`,
 * the two things a right-to-left app sets anyway, are enough.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={PANEL_GRID.GUTTER}>
                    <ToggleRow
                        label="Labels"
                        defaultChecked
                        trailing={<AdvancedButton label="Label settings" onClick={(): void => undefined} />}
                    />
                    <Box style={ROW_STYLE}>
                        <PanelField
                            label="Opacity"
                            glyph="opacity"
                            kind="number"
                            width={PANEL_GRID.BODY}
                            defaultValue={80}
                        />
                        <TrailingSlot>
                            <AdvancedButton label="Opacity settings" onClick={(): void => undefined} />
                        </TrailingSlot>
                    </Box>
                </Stack>
                <Text size="xs" c={PANEL_INK.CHROME} mt="md">
                    The slot is now at the left, with the rest of the row.
                </Text>
            </Box>
        </DirectionProvider>
    ),
};
