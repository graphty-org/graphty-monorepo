import { PasswordInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `PasswordInput`, themed as Figma's filled field; the show/hide toggle is a 24px ghost
 * icon button at the end. Every prop is Mantine's: see
 * [PasswordInput on mantine.dev](https://mantine.dev/core/password-input/).
 *
 * ## Usage
 *
 * ```tsx
 * import { PasswordInput } from "@mantine/core";
 *
 * <PasswordInput label="API key" value={key} onChange={(e) => setKey(e.currentTarget.value)} w={184} />
 * ```
 *
 * A native password box. Mantine keeps the visibility toggle out of the Tab order.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px, radius 5px |
 * | Toggle | 24px ghost icon button in the trailing slot |
 */
const meta: Meta<typeof PasswordInput> = {
    title: "Themed Mantine/Inputs/PasswordInput",
    component: PasswordInput,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

/** A labeled password field in the panel body width. */
export const Default: Story = {
    args: {
        label: "Password",
        placeholder: "Enter secret code",
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
