import { NumberInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `NumberInput`, themed as Figma's filled field with no stepper chevrons by default.
 * Every prop is Mantine's: see [NumberInput on mantine.dev](https://mantine.dev/core/number-input/).
 *
 * | Reach for | When |
 * |---|---|
 * | Mantine `NumberInput` | a number in a form or a dialog |
 * | `PanelField kind="number"` | a number in a panel row: a leading scrub handle, expressions, commit on Enter |
 * | `StyleNumberInput` | a panel number whose `undefined` means "inherit the default", with a reset |
 *
 * ## Usage
 *
 * ```tsx
 * import { NumberInput } from "@mantine/core";
 *
 * <NumberInput label="Opacity" suffix="%" min={0} max={100} value={value} onChange={setValue} w={88} />
 * ```
 *
 * A native text box with `inputmode="numeric"`. ArrowUp and ArrowDown step the value.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px, radius 5px |
 * | Width | 88px (one field) |
 * | Text | 11/16, weight 450, inset 8px |
 */
const meta: Meta<typeof NumberInput> = {
    title: "Themed Mantine/Inputs/NumberInput",
    component: NumberInput,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NumberInput>;

/** A labeled number in the 88px field width. */
export const Default: Story = {
    args: {
        label: "Amount",
        defaultValue: 40,
        w: 88,
    },
};

/**
 * Every state: rest, hover and focus (forced with `data-state`), disabled, invalid, the outlined
 * variant, a label and a suffix. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <NumberInput aria-label="NumberInput" defaultValue={40} w={88} /> },
                { state: "hover", node: <NumberInput aria-label="NumberInput" defaultValue={40} w={88} data-state="hover" /> },
                { state: "focus", node: <NumberInput aria-label="NumberInput" defaultValue={40} w={88} data-state="focus" /> },
                { state: "disabled", node: <NumberInput aria-label="NumberInput" defaultValue={40} w={88} disabled /> },
                { state: "invalid", node: <NumberInput aria-label="NumberInput" defaultValue={40} w={88} error /> },
                { state: "outlined", node: <NumberInput aria-label="NumberInput" defaultValue={40} w={88} variant="outlined" /> },
                { state: "with label", node: <NumberInput label="Label" defaultValue={40} w={88} /> },
                { state: "suffix", node: <NumberInput aria-label="Opacity" defaultValue={100} suffix="%" w={88} /> },
            ]}
        />
    ),
};

/** `hideControls={false}` brings back Mantine's stepper chevrons, which the theme hides by default. */
export const WithControls: Story = {
    args: {
        "aria-label": "Amount",
        defaultValue: 10,
        hideControls: false,
        w: 88,
    },
};
