import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { SettingsOverlay, type SettingsOverlayProps } from "./SettingsOverlay";

/**
 * The overlay over a shell-sized frame, as the shell draws it.
 * @param props - the overlay's props.
 * @returns the frame.
 */
function SettingsOverShell(props: SettingsOverlayProps): React.JSX.Element {
    return (
        <div style={{ position: "relative", width: 1100, height: 720 }}>
            <SettingsOverlay {...props} />
        </div>
    );
}

const meta: Meta<typeof SettingsOverShell> = {
    title: "Components/Old shell/Settings overlay",
    // The old title's component id, so every story id (and its approved image) stays the same.
    id: "shell-settings-overlay",
    tags: ["regression", "!dev", "!autodocs"],
    component: SettingsOverShell,
    args: {
        opened: true,
        onClose: fn(),
        accelerationPolicy: "auto",
        onAccelerationPolicyChange: fn(),
        aiProviders: {
            getKey: () => undefined,
            setKey: fn(),
            removeKey: fn(),
            hasKey: () => false,
            configuredProviders: [],
            defaultProvider: null,
            onDefaultProviderChange: fn(),
            isPersistenceEnabled: false,
            onEnablePersistence: fn(),
            onDisablePersistence: fn(),
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened on its first section, Appearance. */
export const Appearance: Story = {
    play: async ({ canvasElement }) => {
        const nav = within(canvasElement).getByRole("tablist", { name: "Settings" });
        await expect(within(nav).getByRole("tab", { name: "Appearance" })).toHaveAttribute("aria-selected", "true");
    },
};

/** Keyboard shortcuts, reached from Appearance with the Down arrow twice: the focus ring is on the tab. */
export const KeyboardShortcuts: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "Appearance" }));
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        const tab = canvas.getByRole("tab", { name: "Keyboard shortcuts" });
        await expect(tab).toHaveFocus();
        await expect(canvas.getByRole("tabpanel", { name: "Keyboard shortcuts" })).toBeVisible();
    },
};

/** AI providers, chosen by clicking it, with no keys stored. */
export const AiProviders: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "AI providers" }));
        await expect(canvas.getByRole("tabpanel", { name: "AI providers" })).toBeVisible();
    },
};
