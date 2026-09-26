import { FileInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof FileInput> = {
    title: "Compact Theme/Mantine Components/FileInput",
    component: FileInput,
    args: {
        size: "compact",
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof FileInput>;

export const Default: Story = {
    args: {
        label: "Upload file",
        placeholder: "Click to select",
    },
};

export const WithDescription: Story = {
    args: {
        label: "Upload file",
        description: "Max 5MB",
        placeholder: "Upload",
    },
};

export const Disabled: Story = {
    args: {
        label: "Upload file",
        disabled: true,
        placeholder: "Disabled",
    },
};

export const WithError: Story = {
    args: {
        label: "Upload file",
        error: "File too large",
        placeholder: "Error state",
    },
};

export const Multiple: Story = {
    args: {
        label: "Upload files",
        multiple: true,
        placeholder: "Select files",
    },
};

export const Clearable: Story = {
    args: {
        label: "Upload file",
        clearable: true,
        placeholder: "Clearable",
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
                { state: "rest", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} /> },
                { state: "hover", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} data-state="hover" /> },
                { state: "focus", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} data-state="focus" /> },
                { state: "disabled", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} disabled /> },
                { state: "invalid", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} error /> },
                { state: "outlined", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} variant="outlined" /> },
                { state: "with label", node: <FileInput label="Label" placeholder="Pick a file" w={184} /> },
            ]}
        />
    ),
};
