import { Textarea } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Textarea`, themed as Figma's filled field in a multi-line box. Every prop is
 * Mantine's: see [Textarea on mantine.dev](https://mantine.dev/core/textarea/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Textarea } from "@mantine/core";
 *
 * <Textarea label="Description" autosize minRows={2} maxRows={6} w={184} />
 * ```
 *
 * A native text area. Its name comes from `label`, or from `aria-label`. With `autosize` the box
 * floors at `minRows` lines of 24px rather than the fixed 56px.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Minimum height | 56px, padding 4px 8px, radius 5px |
 * | Text | 11/16, weight 450 |
 */
const meta: Meta<typeof Textarea> = {
    title: "Themed Mantine/Inputs/Textarea",
    component: Textarea,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

/** A labeled text area in the panel body width. */
export const Default: Story = {
    args: {
        label: "Notes",
        placeholder: "Write your thoughts...",
        w: 184,
    },
};

/**
 * Every state: rest, hover and focus (forced with `data-state`), disabled, invalid, the outlined
 * variant and a label. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <Textarea aria-label="Textarea" defaultValue="Notes" w={184} /> },
                { state: "hover", node: <Textarea aria-label="Textarea" defaultValue="Notes" w={184} data-state="hover" /> },
                { state: "focus", node: <Textarea aria-label="Textarea" defaultValue="Notes" w={184} data-state="focus" /> },
                { state: "disabled", node: <Textarea aria-label="Textarea" defaultValue="Notes" w={184} disabled /> },
                { state: "invalid", node: <Textarea aria-label="Textarea" defaultValue="Notes" w={184} error /> },
                { state: "outlined", node: <Textarea aria-label="Textarea" defaultValue="Notes" w={184} variant="outlined" /> },
                { state: "with label", node: <Textarea label="Label" defaultValue="Notes" w={184} /> },
            ]}
        />
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/** `autosize` with `minRows={1}`: one 24px line that grows as the reader types, up to `maxRows`. */
export const Autosize: Story = {
    args: {
        label: "Notes",
        autosize: true,
        minRows: 1,
        maxRows: 4,
        defaultValue: "One line",
        w: 184,
    },
};
