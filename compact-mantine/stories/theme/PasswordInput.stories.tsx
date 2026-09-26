import { PasswordInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof PasswordInput> = {
    title: "Compact Theme/Mantine Components/PasswordInput",
    component: PasswordInput,
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter secret code",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "Password",
        w: 200,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "secret",
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

/**
 * Every state side by side (design/figma-spec.md 6): rest, hover and focus (forced with
 * data-state), disabled, invalid, the outlined variant and the label. Switch light / dark and the
 * contrast mode in the toolbar.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <PasswordInput aria-label="PasswordInput" defaultValue="secret" w={184} /> },
                { state: "hover", node: <PasswordInput aria-label="PasswordInput" defaultValue="secret" w={184} data-state="hover" /> },
                { state: "focus", node: <PasswordInput aria-label="PasswordInput" defaultValue="secret" w={184} data-state="focus" /> },
                { state: "disabled", node: <PasswordInput aria-label="PasswordInput" defaultValue="secret" w={184} disabled /> },
                { state: "invalid", node: <PasswordInput aria-label="PasswordInput" defaultValue="secret" w={184} error /> },
                { state: "outlined", node: <PasswordInput aria-label="PasswordInput" defaultValue="secret" w={184} variant="outlined" /> },
                { state: "with label", node: <PasswordInput label="Label" defaultValue="secret" w={184} /> },
            ]}
        />
    ),
};
