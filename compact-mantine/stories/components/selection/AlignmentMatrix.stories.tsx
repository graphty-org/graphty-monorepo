import { ActionIcon } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { AlignmentMatrix, type AlignmentMatrixValue, ComboInput, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * A 3 x 3 picker for where the children of a frame sit, the size of one panel field.
 *
 * ## When to use it
 *
 * Reach for `AlignmentMatrix` when the choice is a position in two dimensions at once (top left
 * to bottom right): the alignment of an auto layout frame, a label's anchor on a node. The chosen
 * cell draws three bars lined up the way the children will be; every other cell is a dot, and the
 * cell under the pointer previews its bars.
 *
 * Reach for a Mantine `SegmentedControl` when the choice runs along one axis only (left, center,
 * right), and for a `Select` when the positions are named rather than drawn.
 *
 * ## Usage
 *
 * ```tsx
 * import { AlignmentMatrix, type AlignmentMatrixValue } from "@graphty/compact-mantine";
 *
 * const [align, setAlign] = useState<AlignmentMatrixValue>("top-left");
 * <AlignmentMatrix value={align} onChange={setAlign} direction="horizontal" label="Alignment" />
 * ```
 *
 * `direction="vertical"` (the default) stacks three horizontal bars for children that run down
 * the frame; `"horizontal"` stands three vertical bars side by side. `ALIGNMENT_MATRIX_VALUES`
 * lists the nine values in reading order.
 *
 * ## Keyboard and accessibility
 *
 * - One Tab stop: nine native radios sharing a name, in a `role="radiogroup"` named by `label`
 *   (default "Alignment").
 * - Left and Right move along the row, Up and Down along the column, stopping at the edges.
 * - Every cell has a tooltip and an accessible name in Figma's words ("Align top left");
 *   translate them with `cellLabels`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 88 x 56 on `--cm-bg-secondary`, radius 5 |
 * | Cell | 29.3 x 16; an idle cell is a 2 x 2 dot |
 * | Chosen cell | three bars 7, 10 and 5 long, 2 wide, 2 apart, in the brand text color |
 */
const meta: Meta<typeof AlignmentMatrix> = {
    title: "Components/Selection/AlignmentMatrix",
    component: AlignmentMatrix,
    parameters: { layout: "padded" },
    argTypes: {
        direction: { control: "inline-radio", options: ["vertical", "horizontal"] },
    },
};

export default meta;
type Story = StoryObj<typeof AlignmentMatrix>;

/** The matrix keeping its own state. Change `direction` or `disabled` in the Controls table. */
export const Default: Story = {
    args: { defaultValue: "top-left", direction: "vertical", label: "Alignment" },
};

/**
 * Every state, light and dark side by side: both directions with a chosen cell in each row and
 * column, keyboard focus (on the light half), and disabled. Point at a
 * cell to see its preview.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
 * In the panel, as Figma's auto layout section lays it out: the field-sized picker, the gap
 * field beside it, and the section's settings button at the row's end.
 */
export const InThePanel: Story = {
    render: () => (
        <div style={{ width: 240, padding: "4px 8px 4px 16px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlignmentMatrix defaultValue="middle-center" direction="horizontal" />
            <ComboInput label="Gap" glyph={<UiGlyph name="alignCenterH" />} numeric defaultValue={3.04} options={GAPS} width={88} />
            <ActionIcon aria-label="Auto layout settings" style={{ marginInlineStart: "auto" }}>
                <UiGlyph name="settings" />
            </ActionIcon>
        </div>
    ),
};

const GAPS = [{ value: "Auto" }, { separator: true as const }, ...[0, 4, 8, 16].map((n) => ({ value: String(n) }))];

/**
 * Keyboard: Tab lands on the chosen cell, and the arrows move along the row and the column and
 * stop at the edges. 
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
