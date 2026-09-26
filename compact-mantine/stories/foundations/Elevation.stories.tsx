import { Box, Paper, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { PANEL_INK } from "../../src";
import { compactShadows } from "../../src/theme/tokens";
import { BOTH_SCHEMES } from "../helpers/schemes";

/**
 * Figma's five elevations, mapped onto Mantine's `shadows` scale so every `shadow="..."` prop
 * keeps working.
 *
 * Each elevation is one `box-shadow` value holding both schemes' layers, so it follows the
 * colour scheme of the element it is on like every other token. In dark, each carries Figma's
 * 0.5px inner white hairlines, which is what separates a dark panel from a dark canvas.
 *
 * | Mantine | Token | Where the components use it |
 * |---|---|---|
 * | `xs` | `--cm-elevation-100` | the lowest lift, for a control raised off its track |
 * | `sm` | `--cm-elevation-200` | the floating toolbars, the help button and the quick actions palette (with a 1px first blur over the canvas) |
 * | `md` | `--cm-elevation-300` | tooltips, slider and colour-picker thumbs |
 * | `lg` | `--cm-elevation-400` | menus, list boxes, popovers and pop-out panels |
 * | `xl` | `--cm-elevation-500` | modals |
 *
 * ## Usage
 *
 * ```tsx
 * <Paper shadow="md">...</Paper>
 * <div style={{ boxShadow: "var(--cm-elevation-300)" }} />
 * ```
 */
const meta: Meta = {
    title: "Foundations/Elevation",
    parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj;

/** The five elevations on the panel ground, in light and dark. */
export const Shadows: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Box style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: 8 }}>
            {(Object.keys(compactShadows) as (keyof typeof compactShadows)[]).map((size) => (
                <Paper
                    key={size}
                    shadow={size}
                    radius="md"
                    style={{
                        width: 88,
                        height: 64,
                        background: PANEL_INK.PANEL,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text size="sm" fw={550}>
                        {size}
                    </Text>
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {compactShadows[size].replace(/^var\(--cm-elevation-(\d+)\)$/, "$1")}
                    </Text>
                </Paper>
            ))}
        </Box>
    ),
};
