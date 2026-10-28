import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { ScrollArea } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `ScrollArea`, themed as Figma's overlay scrollbar: a thin pill over the edge that
 * shows only while the pointer is over the scroller and disappears at once when it leaves.
 * Every prop is Mantine's, plus `focusableViewport` on this package's `ScrollArea`: see
 * [ScrollArea on mantine.dev](https://mantine.dev/core/scroll-area/).
 *
 * ## Usage
 *
 * ```tsx
 * import { ScrollArea } from "@graphty/compact-mantine";
 *
 * <ScrollArea h={240} focusableViewport>{rows}</ScrollArea>
 * ```
 *
 * The theme defaults to `type="hover"` with no hide delay; `type="always"` keeps the thumb
 * visible. The viewport scrolls with the wheel. Mantine's own ScrollArea (and this one by
 * default) keeps the viewport out of the Tab order, so a scroller with nothing focusable inside
 * cannot be scrolled from the keyboard. Import `ScrollArea` from this package and set
 * `focusableViewport` for that case: the viewport becomes a Tab stop that scrolls with the arrow
 * and page keys, and keyboard focus on it draws a 1px ring inside and shows the thumb.
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
    args: { type: "hover", h: 240, w: 240, focusableViewport: true },
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
                <ScrollArea
                    key={type}
                    h={240}
                    w={240}
                    type={type}
                    focusableViewport
                    style={{ border: "1px solid var(--cm-border)" }}
                >
                    <Rows />
                </ScrollArea>
            ))}
        </Box>
    ),
    play: async ({ canvasElement }) => {
        // Mantine measures each scroller with a ResizeObserver and draws its thumb on a later
        // animation frame, so the story is not finished until every held-visible thumb is there.
        // Without this wait a screenshot showed the left scroller with or without its thumb.
        // The wait is on the DOM change itself, not on waitFor's 1000 ms deadline: after a stalled
        // main thread the overdue deadline ran before the frames the measurement needs, and the
        // check failed with the thumbs 50 ms away (#2705).
        await new Promise<void>((resolve) => {
            // The held-visible scrollbars: a hover one carries data-state and is hidden until hovered.
            const settle = (): void => {
                const bars = [
                    ...canvasElement.querySelectorAll(
                        '.mantine-ScrollArea-scrollbar[data-orientation="vertical"]:not([data-state])',
                    ),
                ];
                const measured = bars.every(
                    (bar) => (bar.querySelector(".mantine-ScrollArea-thumb")?.getBoundingClientRect().height ?? 0) > 0,
                );
                if (bars.length > 0 && measured) {
                    observer.disconnect();
                    resolve();
                }
            };
            const observer = new MutationObserver(settle);
            observer.observe(canvasElement, { subtree: true, childList: true, attributes: true });
            settle();
        });
    },
};
