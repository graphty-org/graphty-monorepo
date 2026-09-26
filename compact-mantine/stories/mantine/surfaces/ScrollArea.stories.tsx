import { Box, ScrollArea, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `ScrollArea`, themed as Figma's overlay scrollbar: a thin pill over the edge that
 * shows only while the pointer is over the scroller and disappears at once when it leaves.
 * Every prop is Mantine's: see [ScrollArea on mantine.dev](https://mantine.dev/core/scroll-area/).
 *
 * ## Usage
 *
 * ```tsx
 * import { ScrollArea } from "@mantine/core";
 *
 * <ScrollArea h={240}>{rows}</ScrollArea>
 * ```
 *
 * The theme defaults to `type="hover"` with no hide delay; `type="always"` keeps the thumb
 * visible. The viewport scrolls with the wheel and, once focused, with the arrow and page keys;
 * keyboard focus on it draws a 1px ring inside and shows the thumb.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Track | 10px wide, padding 2px, transparent; hover or drag adds a 1px `--cm-border` edge line |
 * | Thumb | 6px wide, the visible pill 4px shorter than the thumb, radius 6px, `--cm-scrollbar` |
 */
const meta: Meta<typeof ScrollArea> = {
    title: "Themed Mantine/Surfaces/ScrollArea",
    component: ScrollArea,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    argTypes: { children: { control: false } },
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

const rows = Array.from({ length: 40 }, (_, i) => `Layer ${String(i + 1)}`);

const Rows = (): React.JSX.Element => (
    <Stack gap={0}>
        {rows.map((row) => (
            <Box key={row} px={16} style={{ height: 32, display: "flex", alignItems: "center" }}>
                <Text size="sm">{row}</Text>
            </Box>
        ))}
    </Stack>
);

/** Forty 32px rows in a 240 x 240 scroller; hover it to see the thumb, or set `type` in Controls. */
export const Default: Story = {
    args: { type: "hover", h: 240, w: 240 },
    render: (args) => (
        <ScrollArea {...args} style={{ border: "1px solid var(--cm-border)" }}>
            <Rows />
        </ScrollArea>
    ),
};

/** Left: the thumb held visible (`type="always"`). Right: the default; hover to see it. Light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Box style={{ display: "flex", gap: 24 }}>
            {(["always", "hover"] as const).map((type) => (
                <ScrollArea key={type} h={240} w={240} type={type} style={{ border: "1px solid var(--cm-border)" }}>
                    <Rows />
                </ScrollArea>
            ))}
        </Box>
    ),
};
