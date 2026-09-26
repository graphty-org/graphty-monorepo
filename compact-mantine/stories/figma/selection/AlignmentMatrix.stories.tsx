import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import {
    AlignmentMatrix,
    type AlignmentMatrixValue,
} from "../../../src/components/selection/AlignmentMatrix";
import { focusMarked, StateGrid } from "./StateGrid";

/**
 * Figma's 3 x 3 alignment picker for an auto layout frame (design/figma-spec.md 5.7).
 *
 * **Purpose:** chooses where the children of a frame sit: one of nine cells, top left to
 * bottom right. The chosen cell draws three bars lined up the way the children will be; every
 * other cell is a dot, and the cell under the pointer previews its bars in the secondary ink.
 *
 * **Key features:**
 * - An 88 x 56 box on --cm-bg-secondary, the size of one panel field
 * - Nine real radios in one group: one Tab stop, and the arrow keys move in two dimensions
 *   (Left / Right along the row, Up / Down along the column)
 * - A tooltip on every cell, in Figma's words ("Align top left")
 * - `direction` draws the bars for children that run vertically (stacked bars) or
 *   horizontally (standing bars)
 */
const meta: Meta<typeof AlignmentMatrix> = {
    title: "Figma/Selection/AlignmentMatrix",
    component: AlignmentMatrix,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof AlignmentMatrix>;

/** The matrix with its own state. */
export const Default: Story = {
    args: { defaultValue: "top-left" },
};

/**
 * Every state side by side: both directions, a chosen cell in each row and column, keyboard
 * focus (the play function), and disabled. Point at a cell to see its preview.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            columns={120}
            cells={[
                ["vertical, top left", <AlignmentMatrix defaultValue="top-left" />],
                ["vertical, center", <AlignmentMatrix defaultValue="middle-center" />],
                ["vertical, bottom right", <AlignmentMatrix defaultValue="bottom-right" />],
                ["horizontal, top left", <AlignmentMatrix direction="horizontal" defaultValue="top-left" />],
                ["horizontal, center", <AlignmentMatrix direction="horizontal" defaultValue="middle-center" />],
                ["horizontal, bottom right", <AlignmentMatrix direction="horizontal" defaultValue="bottom-right" />],
                ["focus", <div data-story-focus><AlignmentMatrix defaultValue="middle-left" /></div>],
                ["disabled", <AlignmentMatrix defaultValue="top-center" disabled />],
            ]}
        />
    ),
    play: focusMarked,
};

/**
 * Keyboard: Tab lands on the chosen cell, the arrows move along the row and the column and stop
 * at the edges.
 */
export const Keyboard: Story = {
    render: function Render() {
        const [value, setValue] = useState<AlignmentMatrixValue>("top-left");
        return (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <AlignmentMatrix value={value} onChange={setValue} />
                <output data-testid="value">{value}</output>
            </div>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}");
        await expect(canvas.getByTestId("value")).toHaveTextContent("middle-right");
        await userEvent.keyboard("{ArrowDown}");
        await expect(canvas.getByTestId("value")).toHaveTextContent("bottom-right");
    },
};

/** In the panel: a field-sized picker beside a field-sized control. */
export const InThePanel: Story = {
    render: () => (
        <div style={{ width: 240, padding: "4px 8px 4px 16px", display: "flex", gap: 8 }}>
            <AlignmentMatrix defaultValue="middle-center" direction="horizontal" />
            <div style={{ width: 88, height: 56 }} />
        </div>
    ),
};
