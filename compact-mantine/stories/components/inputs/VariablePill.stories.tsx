import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { VariablePill } from "../../../src";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A value bound to a design variable: a pill holding the variable's name inside a number field,
 * a bound fill row, or a component-property chip, each with a Detach button that breaks the
 * binding.
 *
 * ## When to use it
 *
 * Reach for `VariablePill` when a property takes its value from a named, shared variable (a
 * design token such as `rsu/radius-sm`) and the reader must be able to see which one and
 * detach it. Reach for `PanelField` with `bound` when the value follows a data attribute: the
 * field keeps showing the value and only its glyph fills in.
 *
 * | Form | Props | Looks like |
 * |---|---|---|
 * | Bound number field | `glyph`, `name`, `value` | an 88px field with a 20px pill after the glyph |
 * | Bound fill row | `swatch`, `name` | one 156px button: a colour chit and the name |
 * | Component property | `kind="property"`, `name` | a 156px chip on the component tint |
 *
 * ## Usage
 *
 * ```tsx
 * import { VariablePill } from "@graphty/compact-mantine";
 *
 * <VariablePill glyph="R" name="rsu/radius-sm" value="4" onDetach={detach} onClick={openPicker} />
 * <VariablePill swatch="#0d99ff" name="rsu/brand" onDetach={detach} onClick={openPicker} />
 * ```
 *
 * `onClick` reopens your variable picker. Without `onDetach` there is no Detach button. With
 * `onValueCommit`, the rest of a bound number field is an input: typing a literal there and
 * pressing Enter reports it, so the caller can detach and apply it.
 *
 * ## Keyboard and accessibility
 *
 * - The pill (or the fill row) is a button: Enter or Space calls `onClick`. Tab then reaches the
 *   Detach button, which shows while the field is hovered or holds focus.
 * - The pill is named "4, variable rsu/radius-sm"; the fill row "rsu/brand"; the Detach button
 *   "Detach variable" (`detachLabel`). Hover shows the name and value in a tooltip.
 * - With `onValueCommit`: Enter commits the typed literal, Escape abandons it. The input is
 *   named "Value" (`valueLabel`).
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Number field | 88 x 24; the pill is 20px tall, radius 5px, padding 0 4px, 1px border |
 * | Fill row | 156 x 24, radius 5px, a 14px chit, 1px outline |
 * | Detach | 16px in a number field, 24px on a fill row |
 */
const meta: Meta<typeof VariablePill> = {
    title: "Components/Inputs/VariablePill",
    component: VariablePill,
    args: { onDetach: fn(), onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof VariablePill>;

/** A bound number field. The rest of the field after the pill takes a literal; Enter commits it. */
export const Default: Story = {
    args: { glyph: "R", name: "rsu/radius-sm", value: "4", onValueCommit: fn() },
};

/** Plain handlers for the grid (Storybook's action spies cannot be spread into its source view). */
const handlers = {
    onDetach: (): void => undefined,
    onClick: (): void => undefined,
};

/** Every form, light and dark side by side. Hover a field to see its Detach button. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "bound number", node: <VariablePill {...handlers} glyph="R" name="rsu/radius-sm" value="4" /> },
                { state: "long name", node: <VariablePill {...handlers} glyph="W" name="spacing/very-long-name" value="1024" /> },
                { state: "bound fill", node: <VariablePill {...handlers} swatch="#0d99ff" name="rsu/brand" /> },
                { state: "fill, alpha", node: <VariablePill {...handlers} swatch="#0d99ff66" name="rsu/brand-40" /> },
                { state: "component property", node: <VariablePill {...handlers} kind="property" name="Label" /> },
            ]}
        />
    ),
};

/** The bound fill row: one button with the colour's chit and the variable's name. */
export const FillRow: Story = {
    args: { swatch: "#0d99ff", name: "rsu/brand" },
};

/** Keyboard: Tab reaches the Detach button, which shows once it has focus; Enter detaches. */
export const DetachFromTheKeyboard: Story = {
    args: { swatch: "#0d99ff", name: "rsu/brand" },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.tab();
        await userEvent.tab();
        const detach = canvas.getByRole("button", { name: "Detach variable" });
        await expect(detach).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await expect(args.onDetach).toHaveBeenCalled();
    },
};
