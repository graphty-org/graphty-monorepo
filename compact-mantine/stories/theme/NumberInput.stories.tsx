import { NumberInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof NumberInput> = {
    title: "Compact Theme/Mantine Components/NumberInput",
    component: NumberInput,
};

export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter amount",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        defaultValue: 42,
        w: 150,
    },
};

export const WithControls: Story = {
    args: {
        defaultValue: 10,
        hideControls: false,
        w: 150,
    },
};

export const WithSuffix: Story = {
    args: {
        suffix: "%",
        defaultValue: 75,
        w: 150,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        disabled: true,
        w: 150,
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
