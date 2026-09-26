import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { ResizeHandle, type ResizeHandleProps } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * An 8px strip straddling a panel edge that resizes the panel by dragging, by
 * the arrow keys, or back to its default size by double-click.
 *
 * Like Figma's, it draws nothing on hover or while dragging; the cursor is the
 * only pointer cue. Keyboard focus draws a grip pill in the focus colour.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **ResizeHandle** | A side panel the reader can widen (`edge="end"` or `"start"`), or a vertical split between two stacked regions (`edge="top"` or `"bottom"`). |
 * | A fixed-width panel | The panel holds only rows on the 240px grid: rows do not grow with the panel, so a wider panel only adds empty space at the end. |
 *
 * ## Usage
 *
 * Put the handle inside the panel it resizes; the panel must be
 * `position: relative`. It works controlled (`value` + `onChange`) or keeps its
 * own state from `defaultValue`.
 *
 * ```tsx
 * import { ResizeHandle } from "@graphty/compact-mantine";
 *
 * const [width, setWidth] = useState(240);
 *
 * <aside style={{ position: "relative", width }}>
 *     ...
 *     <ResizeHandle edge="end" value={width} min={240} max={500} defaultValue={240}
 *         onChange={setWidth} onChangeEnd={saveWidth} />
 * </aside>
 * ```
 *
 * `onChange` fires live while dragging and on every key press; `onChangeEnd`
 * fires once the size settles (pointer release, a key press, a reset), which is
 * where to persist it.
 *
 * ## Keyboard and accessibility
 *
 * - The WAI-ARIA window splitter pattern: a focusable `separator` with
 *   `aria-orientation`, `aria-valuenow`, `aria-valuemin` and `aria-valuemax`,
 *   named "Resize panel" by default (`label`).
 * - `aria-valuetext` reads "240 pixels", with " (min)" or " (max)" at the ends;
 *   pass `valueText` to change it.
 * - Arrow keys change the size 1px per press in the edge's direction, Shift
 *   for 10px; Home and End jump to `min` and `max`; double-click resets to
 *   `defaultValue`. Start and end follow the text direction.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Hit strip | 8px, centred on the edge |
 * | Cursor | `ew-resize`; `e-resize` at min and `w-resize` at max on an end edge; `ns-resize` on a split |
 * | Focus grip | `--cm-border-selected`, fully rounded: 4px wide on a side edge, 120 x 4 on a split |
 * | Hover and drag | nothing drawn |
 */
const meta: Meta<typeof ResizeHandle> = {
    title: "Components/Panels and rows/ResizeHandle",
    component: ResizeHandle,
    parameters: { layout: "padded" },
    argTypes: {
        // The Default panel grows from its end edge; States shows a split.
        edge: { control: false },
        value: { control: false },
        onChange: { control: false },
        onChangeEnd: { control: false },
        valueText: { control: false },
    },
};

export default meta;
type Story = StoryObj<typeof ResizeHandle>;

/**
 * A panel whose width follows its handle.
 * @param props - The handle's props from the story's args
 * @returns A resizable panel
 */
function ResizablePanel(props: ResizeHandleProps): React.JSX.Element {
    const [width, setWidth] = useState(props.defaultValue ?? props.min);
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
            <ResizeHandle {...props} edge="end" value={width} onChange={setWidth} />
        </Box>
    );
}

/**
 * A panel whose width follows its handle: drag the right edge, or Tab to it and
 * press the arrow keys. Change `min`, `max` and `defaultValue` in the Controls
 * table. 
 */
export const Default: Story = {
    args: {
        min: 240,
        max: 500,
        defaultValue: 240,
        label: "Resize panel",
    },
    render: (args) => <ResizablePanel {...args} />,
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
 * The handle at rest (nothing drawn) and with keyboard focus (the grip pill),
 * on a side edge and on a split, light and dark.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
