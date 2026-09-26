import { Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, userEvent, waitFor, within } from "@storybook/test";

import { ToggleIconButton, UiGlyph } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A 24 x 24 icon button that stays on or off: lock aspect ratio, use as mask, show or hide.
 *
 * Off is a ghost button. On fills with the selected ground and draws its glyph in the brand
 * color. The `swap` variant never fills: it swaps its glyph instead (eye, eye closed), which is
 * the look a visibility toggle wants in a column of layer rows.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `ToggleIconButton` | the button holds a state -- it is on or off, and the reader must see which |
 * | Mantine `ActionIcon` | the button does something once (add, delete, open) and holds no state |
 * | `ToggleRow` | the setting has a visible name and deserves a whole row with a switch |
 *
 * ## Usage
 *
 * ```tsx
 * import { ToggleIconButton, UiGlyph } from "@graphty/compact-mantine";
 *
 * <ToggleIconButton
 *     label="Lock aspect ratio"
 *     icon={<UiGlyph name="unlock" />}
 *     checkedIcon={<UiGlyph name="lock" />}
 *     checked={locked}
 *     onChange={setLocked}
 * />
 * ```
 *
 * It is controlled with `checked` and `onChange`, or uncontrolled with `defaultChecked`. Every
 * other `ActionIcon` prop (`size`, `disabled`, `className`, a `data-` attribute) reaches the
 * button.
 *
 * ## Keyboard and accessibility
 *
 * - A real `<button>` with `aria-pressed`, so a screen reader announces "toggle button,
 *   pressed" or "not pressed". `label` is its accessible name and its tooltip.
 * - Space and Enter toggle it. Tab moves to it; a disabled toggle is skipped.
 * - The pointer toggles on pointer DOWN, as Figma's does, and the click that ends the same press
 *   is swallowed. Pressing one toggle and dragging down a column sets every toggle the pointer
 *   enters to the value the first one took.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 24 x 24, radius 5px |
 * | Off | transparent, `--cm-icon` glyph; hover and press use the translucent washes |
 * | On | `--cm-bg-selected` ground, `--cm-icon-brand` glyph |
 * | Focus | 1px ring, offset +1px |
 */
const meta: Meta<typeof ToggleIconButton> = {
    title: "Components/Actions/ToggleIconButton",
    component: ToggleIconButton,
    tags: ["autodocs"],
    argTypes: {
        icon: { control: false },
        checkedIcon: { control: false },
    },
};

export default meta;
type Story = StoryObj<typeof ToggleIconButton>;

const lock = <UiGlyph name="lock" />;
const STATES = ["rest", "hover", "press", "focus"] as const;

/** An uncontrolled lock toggle. Click it, or Tab to it and press Space; use Controls to change its props. */
export const Default: Story = {
    args: {
        label: "Lock aspect ratio",
        icon: <UiGlyph name="unlock" />,
        checkedIcon: lock,
        variant: "fill",
        disabled: false,
    },
};

/**
 * Off, on, and the swap variant in every state (rest, hover, press and focus forced with
 * `data-state`), then disabled. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
    // Disabled looks enabled, as Figma's capture shows (CHANGELOG-figma.md, known differences); a swap toggle changes its glyph, not its style.
    play: ({ canvasElement }) => expectStatesApply(canvasElement, { unchanged: [".cm-toggle-icon:disabled", ".cm-toggle-icon[data-swap]"] }),
};

/** The visibility eye: the `swap` variant never fills; the glyph changes instead. */
export const Visibility: Story = {
    args: { label: "Hide", variant: "swap", icon: <UiGlyph name="eye" />, checkedIcon: <UiGlyph name="eyeClosed" /> },
};

/** A column of row toggles: press one and drag down the column to set every toggle you cross to its new value. */
export const Column: Story = {
    render: () => (
        <Stack gap={0}>
            {[0, 1, 2, 3, 4].map((i) => (
                <ToggleIconButton
                    key={i}
                    label={`Lock layer ${i + 1}`}
                    icon={<UiGlyph name="unlock" />}
                    checkedIcon={lock}
                    defaultChecked={i === 2}
                />
            ))}
        </Stack>
    ),
};

/** It flips on pointer down, before release, and the click that ends the press does not flip it back; Space toggles it from the keyboard. */
export const Keyboard: Story = {
    args: { label: "Lock aspect ratio", icon: <UiGlyph name="unlock" />, checkedIcon: lock },
    play: async ({ canvasElement }) => {
        const button = within(canvasElement).getByRole("button", { name: "Lock aspect ratio" });
        await expect(button).toHaveAttribute("aria-pressed", "false");
        // React commits a state update from a native pointer event in a microtask, after
        // fireEvent returns, so wait for the commit before reading the attribute.
        fireEvent.pointerDown(button, { button: 0 });
        await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
        // The click that ends the same press is swallowed: after its commit the toggle is still on.
        fireEvent.click(button, { detail: 1 });
        await new Promise((resolve) => setTimeout(resolve, 0));
        await expect(button).toHaveAttribute("aria-pressed", "true");
        button.focus();
        await userEvent.keyboard(" ");
        await expect(button).toHaveAttribute("aria-pressed", "false");
    },
};
