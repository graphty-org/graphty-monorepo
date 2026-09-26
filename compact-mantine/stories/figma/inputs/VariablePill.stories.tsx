import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { VariablePill } from "../../../src/components/inputs";
import { StateGrid } from "./StateGrid";

/**
 * A value bound to a design variable (design/figma-spec.md 6.6): the 20px pill inside a number
 * field, the 156 x 24 bound fill row, and the component-property chip. Hover (or focus) shows the
 * Detach button.
 */
const meta: Meta<typeof VariablePill> = {
    title: "Figma/Inputs/VariablePill",
    component: VariablePill,
    args: { onDetach: fn(), onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof VariablePill>;

/** A bound number field; the rest of the field after the pill takes a literal (Enter commits it). */
export const NumberField: Story = {
    args: { glyph: "R", name: "rsu/radius-sm", value: "4", onValueCommit: fn() },
};

export const FillRow: Story = {
    args: { swatch: "#0d99ff", name: "rsu/brand" },
};

/** Plain handlers for the grid (Storybook's action spies cannot be spread into its source view). */
const handlers = {
    onDetach: (): void => undefined,
    onClick: (): void => undefined,
};

/** Every form side by side; hover a field to see Detach. */
export const States: Story = {
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

/** Detach is reachable from the keyboard: Tab to it and it shows. */
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
