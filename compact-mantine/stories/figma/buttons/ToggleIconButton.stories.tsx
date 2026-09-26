import { Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, userEvent, within } from "@storybook/test";

import { UiGlyph } from "../../../src";
import { ToggleIconButton } from "../../../src/components/buttons";

/**
 * A 24 x 24 icon toggle (design/figma-spec.md 4.4): lock aspect ratio, use as mask, visibility.
 * Off is a ghost; on is the selected ground with a brand glyph; the `swap` variant never fills and
 * swaps its glyph instead. It toggles on pointer DOWN, like Figma's, and from the keyboard with
 * Space or Enter. It is a real button with `aria-pressed`, and its label is its name and tooltip.
 */
const meta: Meta<typeof ToggleIconButton> = {
    title: "Figma/Buttons/ToggleIconButton",
    component: ToggleIconButton,
};

export default meta;
type Story = StoryObj<typeof ToggleIconButton>;

const lock = <UiGlyph name="lock" />;
const STATES = ["rest", "hover", "press", "focus"] as const;

/** Off, on, and the swap variant in every state, forced with `data-state`; plus disabled. */
export const States: Story = {
    render: () => (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="xs" w={100} />
                {[...STATES, "disabled"].map((s) => (
                    <Text key={s} size="xs" w={40}>
                        {s}
                    </Text>
                ))}
            </Group>
            {[
                { name: "off", checked: false, swap: false },
                { name: "on", checked: true, swap: false },
                { name: "swap, off", checked: false, swap: true },
                { name: "swap, on", checked: true, swap: true },
            ].map((row) => (
                <Group key={row.name} gap={8} wrap="nowrap">
                    <Text size="xs" w={100}>
                        {row.name}
                    </Text>
                    {[...STATES, "disabled" as const].map((state) => (
                        <Group key={state} w={40}>
                            <ToggleIconButton
                                label={row.swap ? "Hide" : "Lock aspect ratio"}
                                variant={row.swap ? "swap" : "fill"}
                                icon={row.swap ? <UiGlyph name="eye" /> : <UiGlyph name="unlock" />}
                                checkedIcon={row.swap ? <UiGlyph name="eyeClosed" /> : lock}
                                checked={row.checked}
                                disabled={state === "disabled"}
                                data-state={state === "rest" || state === "disabled" ? undefined : state}
                                withTooltip={false}
                            />
                        </Group>
                    ))}
                </Group>
            ))}
        </Stack>
    ),
};

/** Press to toggle (it flips on pointer down, before release); Space toggles it back. */
export const Interactive: Story = {
    args: { label: "Lock aspect ratio", icon: <UiGlyph name="unlock" />, checkedIcon: lock },
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole("button", { name: "Lock aspect ratio" });
        await expect(button).toHaveAttribute("aria-pressed", "false");
        fireEvent.pointerDown(button, { button: 0 });
        await expect(button).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(button, { detail: 1 });
        await expect(button).toHaveAttribute("aria-pressed", "true");
        button.focus();
        await userEvent.keyboard(" ");
        await expect(button).toHaveAttribute("aria-pressed", "false");
    },
};

/** The visibility eye: never filled, the glyph swaps. */
export const Visibility: Story = {
    args: { label: "Hide", variant: "swap", icon: <UiGlyph name="eye" />, checkedIcon: <UiGlyph name="eyeClosed" /> },
};

/** A column of row toggles: press one and drag down the column to set every toggle you cross to its new value. */
export const Column: Story = {
    render: () => (
        <Stack gap={0}>
            {[0, 1, 2, 3, 4].map((i) => (
                <ToggleIconButton key={i} label={`Lock layer ${i + 1}`} icon={<UiGlyph name="unlock" />} checkedIcon={lock} defaultChecked={i === 2} />
            ))}
        </Stack>
    ),
};
