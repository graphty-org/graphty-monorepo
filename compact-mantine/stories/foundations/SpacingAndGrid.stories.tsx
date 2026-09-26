import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { AdvancedButton, COMPACT_SIZING, FieldRow, PANEL_GRID, PANEL_INK, PanelField } from "../../src";
import { compactRadius, compactSpacing } from "../../src/theme/tokens";

/**
 * The theme's spacing and radius scales, and the panel grid every row is measured against.
 *
 * ## The panel grid
 *
 * The row components are laid out for Figma's 240px panel column, and they all measure
 * themselves from one exported object so that a column of unrelated rows still lines up:
 *
 * ```
 * 16  +  88  +  8  +  88  +  8  +  24  +  8  =  240
 * pad   field  gut  field   gap  trail  pad
 * ```
 *
 * `PANEL_GRID` names every number in it -- `WIDTH`, `FIELD`, `BODY`, `CONTROL_HEIGHT`,
 * `ROW_PITCH`, `TRAIL` and the rest -- so your own rows can match without retyping them. It is
 * also on the theme as `theme.other.panelGrid`. Nothing enforces the 240px width: the numbers are
 * there so the components agree with each other and with anything you write beside them.
 *
 * ```tsx
 * import { PANEL_GRID } from "@graphty/compact-mantine";
 *
 * <div style={{ height: PANEL_GRID.ROW_PITCH, paddingInline: `${PANEL_GRID.PAD_LEFT}px ${PANEL_GRID.PAD_RIGHT}px` }} />;
 * ```
 *
 * ## Controls and rows
 *
 * Every field, button and icon button is 24px tall (`PANEL_GRID.CONTROL_HEIGHT`) and sits in a
 * 32px row (`PANEL_GRID.ROW_PITCH`). A section header is 40px. Components default to
 * `size="sm"`, the 24px control; pass `size="md"` or `size="lg"` for larger.
 */
const meta: Meta = {
    title: "Foundations/Spacing, radii and grid",
    parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj;

/**
 * One labeled bar of the scale.
 * @param props - Component props
 * @param props.name - the scale step
 * @param props.px - its value
 * @returns the bar
 */
function Step({ name, px }: { name: string; px: string }): React.JSX.Element {
    return (
        <Box style={{ display: "grid", gridTemplateColumns: "80px auto", alignItems: "center", gap: 8 }}>
            <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                {name} {px}
            </Text>
            <Box style={{ width: px, height: 16, background: PANEL_INK.ACCENT, borderRadius: 1 }} />
        </Box>
    );
}

/**
 * Mantine's `spacing` scale as the theme sets it, on Figma's 4px grid. `md` stays 8 so existing
 * `gap="md"` layouts do not move.
 */
export const Spacing: Story = {
    render: () => (
        <Stack gap={8}>
            {Object.entries(compactSpacing).map(([name, px]) => (
                <Step key={name} name={name} px={px} />
            ))}
        </Stack>
    ),
};

/** Mantine's `radius` scale: 2 small, 5 for controls, 13 for menus, popovers and modals. */
export const Radii: Story = {
    render: () => (
        <Box style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {Object.entries(compactRadius).map(([name, px]) => (
                <Stack key={name} gap={4} align="center">
                    <Box
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: px,
                            background: PANEL_INK.SURFACE,
                            boxShadow: `inset 0 0 0 1px ${PANEL_INK.BORDER}`,
                        }}
                    />
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {name} {px}
                    </Text>
                </Stack>
            ))}
        </Box>
    ),
};

const GRID_BANDS = [
    { name: "PAD_LEFT", px: PANEL_GRID.PAD_LEFT, fill: false },
    { name: "FIELD", px: PANEL_GRID.FIELD, fill: true },
    { name: "GUTTER", px: PANEL_GRID.GUTTER, fill: false },
    { name: "FIELD", px: PANEL_GRID.FIELD, fill: true },
    { name: "TRAIL_GAP", px: PANEL_GRID.TRAIL_GAP, fill: false },
    { name: "TRAIL", px: PANEL_GRID.TRAIL, fill: true },
    { name: "PAD_RIGHT", px: PANEL_GRID.PAD_RIGHT, fill: false },
];

/**
 * The 240px panel column drawn to scale, with a real field row laid over it: the two fields
 * and the trailing slot land exactly on the grid's bands.
 */
export const PanelGrid: Story = {
    render: () => (
        <Stack gap={8}>
            <Box style={{ display: "flex", width: PANEL_GRID.WIDTH, height: PANEL_GRID.ROW_PITCH, background: PANEL_INK.PANEL, boxShadow: `inset 0 0 0 1px ${PANEL_INK.BORDER}` }}>
                {GRID_BANDS.map((band, i) => (
                    <Box
                        key={`${band.name}-${String(i)}`}
                        title={`PANEL_GRID.${band.name} = ${String(band.px)}`}
                        style={{
                            width: band.px,
                            flex: "0 0 auto",
                            background: band.fill ? PANEL_INK.SELECTED : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            {band.px}
                        </Text>
                    </Box>
                ))}
            </Box>
            <Box style={{ width: PANEL_GRID.WIDTH, background: PANEL_INK.PANEL, boxShadow: `inset 0 0 0 1px ${PANEL_INK.BORDER}` }}>
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                    <PanelField label="Smallest" glyph="sizeSmallest" kind="number" defaultValue={1} />
                    <PanelField label="Largest" glyph="sizeLargest" kind="number" defaultValue={4} />
                </FieldRow>
            </Box>
            <Box
                style={{
                    display: "grid",
                    gridTemplateColumns: "auto auto",
                    gap: "2px 16px",
                    width: "fit-content",
                    marginTop: 8,
                }}
            >
                {Object.entries(PANEL_GRID).map(([name, px]) => (
                    <Box key={name} style={{ display: "contents" }}>
                        <Text size="xs" ff="monospace">
                            PANEL_GRID.{name}
                        </Text>
                        <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                            {Number.isInteger(px) ? px : px.toFixed(2)}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Stack>
    ),
};

/**
 * A 24px control in a 32px row: the field's box is outlined, and the row's pitch is the tinted
 * band behind it.
 */
export const ControlInARow: Story = {
    render: () => (
        <Stack gap={8}>
            <Box
                style={{
                    width: PANEL_GRID.WIDTH,
                    height: PANEL_GRID.ROW_PITCH,
                    background: PANEL_INK.SELECTED_SECONDARY,
                    display: "flex",
                    alignItems: "center",
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    boxSizing: "border-box",
                }}
            >
                <PanelField label="Width" glyph="width" kind="number" defaultValue={2} width={PANEL_GRID.BODY} />
            </Box>
            <Text size="xs" c={PANEL_INK.CHROME}>
                Control {PANEL_GRID.CONTROL_HEIGHT}px, row {PANEL_GRID.ROW_PITCH}px, section header{" "}
                {PANEL_GRID.SECTION_HEADER}px.
            </Text>
        </Stack>
    ),
};

/**
 * `COMPACT_SIZING`: the four numbers a custom control needs to match the theme's own, for code
 * that does not lay itself out on the panel grid.
 */
export const CompactSizing: Story = {
    render: () => (
        <Box style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2px 16px", width: "fit-content" }}>
            {Object.entries(COMPACT_SIZING).map(([name, px]) => (
                <Box key={name} style={{ display: "contents" }}>
                    <Text size="xs" ff="monospace">
                        COMPACT_SIZING.{name}
                    </Text>
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {px}
                    </Text>
                </Box>
            ))}
        </Box>
    ),
};
