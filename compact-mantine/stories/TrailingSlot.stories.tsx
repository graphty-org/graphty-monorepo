import { Box, Checkbox, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    ToggleRow,
    TrailingSlot,
    UiGlyph,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * The fixed 24px slot every panel row ends with.
 *
 * A panel is a column, and a column only reads as one if its rows end at the
 * same place. Some rows have a control at the end -- a gear that opens advanced
 * settings, a button that resets the value, a checkbox -- and most do not. If
 * the slot were only drawn when something went in it, every row without one
 * would run 32px further than the row above it and the column would fray.
 *
 * So the slot is always drawn, and an empty slot is the common, correct case.
 *
 * **You usually do not render this yourself.** Every row component in the
 * library already reserves the slot and takes a `trailing` prop for whatever
 * goes in it. Reach for `TrailingSlot` directly only when you are laying out a
 * row of your own and want it to line up with the library's.
 *
 * ```tsx
 * <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={open} />}>
 *     <PanelField label="Radius" glyph="width" kind="number" defaultValue={2} />
 * </FieldRow>
 * ```
 *
 * The slot has no role, no name and no keyboard behaviour of its own: whatever
 * you put inside it carries all three. It writes no left or right of its own
 * either, so it turns around under `dir="rtl"` along with the row containing it.
 */
const meta: Meta<typeof TrailingSlot> = {
    title: "Building a Panel/TrailingSlot",
    component: TrailingSlot,
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
type Story = StoryObj<typeof TrailingSlot>;

/**
 * A row of your own, laid out by hand on the library's grid: a 224px body, an
 * 8px gap, and the slot.
 *
 * The dotted outline is drawn by this story so you can see the box. Nothing in
 * the component paints it.
 */
export const Default: Story = {
    render: (): React.JSX.Element => (
        <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
            <PanelField label="Edge width" glyph="width" kind="number" width={PANEL_GRID.BODY} defaultValue={2} />
            <Box style={{outline: `1px dashed ${PANEL_INK.BORDER}`}}>
                <TrailingSlot>
                    <AdvancedButton label="Edge width options" onClick={(): void => undefined} />
                </TrailingSlot>
            </Box>
        </Box>
    ),
};

/**
 * The point of the component: three rows, only one of which has a trailing
 * control, all three ending in the same column.
 *
 * Cover the right-hand edge with a finger and the rows still line up. That is
 * what the empty slots are doing.
 */
export const EmptySlotsKeepTheColumn: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            {[
                {label: "Edge width", glyph: "width" as const, value: 2, trailing: true},
                {label: "Opacity", glyph: "opacity" as const, value: 80, trailing: false},
                {label: "Smallest node size", glyph: "sizeSmallest" as const, value: 1, trailing: false},
            ].map((row) => (
                <Box key={row.label} style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
                    <PanelField
                        label={row.label}
                        glyph={row.glyph}
                        kind="number"
                        width={PANEL_GRID.BODY}
                        defaultValue={row.value}
                    />
                    <Box style={{outline: `1px dashed ${PANEL_INK.BORDER}`}}>
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
 * What goes in the slot. Anything 24px square: the advanced settings button, a
 * control that clears the value, a checkbox for the lone boolean that modifies
 * this row, or nothing.
 *
 * A lone boolean belongs here rather than on a row of its own. A single checkbox
 * between other rows is a horizontal rule made of one word; in the slot it reads
 * as part of the setting it qualifies.
 */
export const WhatGoesInIt: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
                <PanelField label="Label size" glyph="width" kind="number" width={PANEL_GRID.BODY} defaultValue={12} />
                <TrailingSlot>
                    <AdvancedButton label="Label settings" changed onClick={(): void => undefined} />
                </TrailingSlot>
            </Box>
            <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
                <PanelField label="Opacity" glyph="opacity" kind="number" width={PANEL_GRID.BODY} defaultValue={80} />
                <TrailingSlot>
                    <AdvancedButton
                        label="Reset opacity to default"
                        icon={<UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />}
                        onClick={(): void => undefined}
                    />
                </TrailingSlot>
            </Box>
            <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
                <PanelField
                    label="Halo colour"
                    glyph="attribute"
                    width={PANEL_GRID.BODY}
                    defaultValue="community"
                    bound
                />
                <TrailingSlot>
                    <Checkbox aria-label="Draw halos" defaultChecked />
                </TrailingSlot>
            </Box>
            <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
                <PanelField label="Node shape" glyph="width" width={PANEL_GRID.BODY} defaultValue="circle" />
                <TrailingSlot />
            </Box>
        </Stack>
    ),
};

/**
 * Right to left. The slot writes no physical direction of its own, so it moves
 * to the leading edge with the rest of the row and needs nothing set on it.
 *
 * Two things produce this, and they are the two a right-to-left application sets
 * anyway: `dir="rtl"`, usually on the document, and Mantine's
 * `DirectionProvider` so components can read the direction from JavaScript.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap={PANEL_GRID.GUTTER}>
                    <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
                        <ToggleRow
                            label="Labels"
                            defaultChecked
                            trailing={<AdvancedButton label="Label settings" onClick={(): void => undefined} />}
                        />
                    </Box>
                    <Box style={{display: "flex", gap: PANEL_GRID.TRAIL_GAP, alignItems: "center"}}>
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
