import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { ResizeHandle } from "../../../src/components/chrome/ResizeHandle";
import { StoryState, StoryStates } from "./StoryPanel";

/**
 * The panel resize handle (design/figma-spec.md 9.9): an 8px separator straddling a panel edge.
 * Like Figma's, it draws nothing on hover or while dragging; keyboard focus draws a grip pill in
 * the focus colour. Drag it, or Tab to it and use the arrow keys (Shift for 10px), Home and End;
 * double-click resets it.
 *
 * Put it inside the panel it resizes, which must be `position: relative`.
 */
const meta: Meta<typeof ResizeHandle> = {
    title: "Figma/Chrome/ResizeHandle",
    component: ResizeHandle,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ResizeHandle>;

/**
 * A panel whose width follows its handle.
 * @returns A resizable panel
 */
function ResizablePanel(): React.JSX.Element {
    const [width, setWidth] = useState(240);
    return (
        <Box
            pos="relative"
            h={320}
            w={width}
            bg="var(--cm-bg)"
            style={{ borderInlineEnd: "1px solid var(--cm-border-translucent)", color: "var(--cm-text-secondary)" }}
        >
            <Box p={16} fz={11}>
                {width} px
            </Box>
            <ResizeHandle edge="end" value={width} min={240} max={500} defaultValue={240} onChange={setWidth} />
        </Box>
    );
}

/** Drag the right edge, or Tab to it and press the arrow keys. */
export const Default: Story = {
    render: () => <ResizablePanel />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const handle = canvas.getByRole("separator", { name: "Resize panel" });
        await userEvent.tab();
        await expect(handle).toHaveFocus();
        await userEvent.keyboard("{ArrowRight}");
        await expect(handle).toHaveAttribute("aria-valuenow", "241");
        await userEvent.keyboard("{Home}");
        await expect(handle).toHaveAttribute("aria-valuetext", "240 pixels (min)");
    },
};

/**
 * The handle at rest (invisible) and with keyboard focus (the grip pill), on a side edge and on
 * a split. Switch the toolbar theme for dark.
 */
export const States: Story = {
    render: () => (
        <StoryStates>
            <StoryState name="Side edge, rest">
                <Box pos="relative" h={240}>
                    <ResizeHandle edge="end" min={240} max={500} />
                </Box>
            </StoryState>
            <StoryState name="Side edge, focus" force="focus">
                <Box pos="relative" h={240}>
                    <ResizeHandle edge="end" min={240} max={500} />
                </Box>
            </StoryState>
            <StoryState name="Split, focus" force="focus">
                <Box pos="relative" h={120}>
                    <ResizeHandle edge="bottom" min={48} max={400} defaultValue={120} />
                </Box>
            </StoryState>
        </StoryStates>
    ),
};
