import { Textarea } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof Textarea> = {
    title: "Compact Theme/Mantine Components/Textarea",
    component: Textarea,
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
    args: {
        placeholder: "Write your thoughts...",
        rows: 2,
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "Write here",
        w: 250,
        rows: 2,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "With value",
        w: 250,
        rows: 2,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        disabled: true,
        w: 250,
        rows: 2,
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
};
