import { TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof TextInput> = {
    title: "Compact Theme/Mantine Components/TextInput",
    component: TextInput,
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter your pet's name",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "Type here",
        w: 200,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "With value",
        w: 200,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        disabled: true,
        w: 200,
    },
};

export const WithError: Story = {
    args: {
        placeholder: "Error",
        error: "Oops",
        w: 200,
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
                { state: "rest", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} /> },
                { state: "hover", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} data-state="hover" /> },
                { state: "focus", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} data-state="focus" /> },
                { state: "disabled", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} disabled /> },
                { state: "invalid", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} error /> },
                { state: "outlined", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} variant="outlined" /> },
                { state: "with label", node: <TextInput label="Label" defaultValue="Frame 1" w={88} /> },
                { state: "placeholder", node: <TextInput aria-label="Name" placeholder="Name" w={88} /> },
            ]}
        />
    ),
};
