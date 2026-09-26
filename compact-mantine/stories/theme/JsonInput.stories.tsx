import { JsonInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof JsonInput> = {
    title: "Compact Theme/Mantine Components/JsonInput",
    component: JsonInput,
    args: {
        size: "compact",
        w: 250,
    },
};

export default meta;
type Story = StoryObj<typeof JsonInput>;

export const Default: Story = {
    args: {
        label: "JSON data",
        placeholder: '{"key": "value"}',
    },
};

export const WithValue: Story = {
    args: {
        label: "JSON data",
        defaultValue: '{"name": "test", "value": 42}',
        formatOnBlur: true,
        autosize: true,
    },
};

export const Disabled: Story = {
    args: {
        label: "JSON data",
        disabled: true,
        defaultValue: '{"locked": true}',
    },
};

export const WithError: Story = {
    args: {
        label: "JSON data",
        error: "Invalid JSON",
    },
};

export const WithValidation: Story = {
    args: {
        label: "JSON data",
        validationError: "Invalid JSON syntax",
    },
};

/**
 * Every state side by side (design/figma-spec.md 6): rest, hover and focus (forced with
 * data-state), disabled, invalid, the outlined variant and the label. Switch light / dark and the
 * contrast mode in the toolbar.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} /> },
                { state: "hover", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} data-state="hover" /> },
                { state: "focus", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} data-state="focus" /> },
                { state: "disabled", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} disabled /> },
                { state: "invalid", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} error /> },
                { state: "outlined", node: <JsonInput aria-label="JsonInput" defaultValue="{}" w={184} variant="outlined" /> },
                { state: "with label", node: <JsonInput label="Label" defaultValue="{}" w={184} /> },
            ]}
        />
    ),
};
