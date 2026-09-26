import { JsonInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `JsonInput`, themed as Figma's filled field (the multi-line field of `Textarea`). Only
 * the look changes. Every prop is Mantine's: see
 * [JsonInput on mantine.dev](https://mantine.dev/core/json-input/).
 *
 * ## Usage
 *
 * ```tsx
 * import { JsonInput } from "@mantine/core";
 *
 * <JsonInput label="Style JSON" formatOnBlur autosize minRows={2} validationError="Invalid JSON" />
 * ```
 *
 * A native text area. Its name comes from `label`, or from `aria-label`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Minimum height | 56px, padding 4px 8px, radius 5px |
 * | Text | 11/16, weight 450 |
 */
const meta: Meta<typeof JsonInput> = {
    title: "Themed Mantine/Inputs/JsonInput",
    component: JsonInput,
    tags: ["autodocs"],
    args: {
        w: 250,
    },
};

export default meta;
type Story = StoryObj<typeof JsonInput>;

/** A labelled, empty JSON field. */
export const Default: Story = {
    args: {
        label: "JSON data",
        placeholder: '{"key": "value"}',
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
                { state: "rest", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} /> },
                { state: "hover", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} data-state="hover" /> },
                { state: "focus", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} data-state="focus" /> },
                { state: "disabled", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} disabled /> },
                { state: "invalid", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} error="Invalid JSON" /> },
                { state: "outlined", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} variant="outlined" /> },
                { state: "with label", node: <JsonInput label="Label" defaultValue="{}" w={184} /> },
            ]}
        />
    ),
};

/** `formatOnBlur` re-indents the JSON when the field loses focus; `autosize` grows with it. */
export const FormatOnBlur: Story = {
    args: {
        label: "JSON data",
        defaultValue: '{"name": "test", "value": 42}',
        formatOnBlur: true,
        autosize: true,
    },
};

/** `validationError` is shown when the text on blur is not valid JSON. */
export const WithValidation: Story = {
    args: {
        label: "JSON data",
        validationError: "Invalid JSON syntax",
    },
};
