import { CloseButton, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `CloseButton`, themed as Figma's close: a 24 x 24 ghost icon button with a 10 x 10 X.
 * `size="xs"` is the 16px inline clear that sits inside a 24px field. Every prop is Mantine's: see
 * [CloseButton on mantine.dev](https://mantine.dev/core/close-button/).
 *
 * ## Usage
 *
 * ```tsx
 * import { CloseButton } from "@mantine/core";
 *
 * <CloseButton aria-label="Close" onClick={close} />
 * ```
 *
 * A native button: give it an `aria-label`. Keyboard focus draws the 1px ring.
 *
 * ## Measurements
 *
 * | Size | Box | X |
 * |---|---|---|
 * | `sm` (the default) | 24 x 24 | 10 x 10 |
 * | `xs` (inline clear) | 16 x 16 | 10 x 10 |
 */
const meta: Meta<typeof CloseButton> = {
    title: "Themed Mantine/Actions/CloseButton",
    component: CloseButton,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CloseButton>;

/** A 24px close button; set `size` to `xs` in Controls for the inline clear. */
export const Default: Story = { args: { "aria-label": "Close", size: "sm" } };

const STATES = ["rest", "hover", "press", "focus"] as const;

/** Both sizes in every state (forced with `data-state`), then disabled. Light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="xs" w={60} />
                {[...STATES, "disabled"].map((s) => (
                    <Text key={s} size="xs" w={40}>
                        {s}
                    </Text>
                ))}
            </Group>
            {(["sm", "xs"] as const).map((size) => (
                <Group key={size} gap={8} wrap="nowrap">
                    <Text size="xs" w={60}>
                        {size}
                    </Text>
                    {STATES.map((state) => (
                        <Group key={state} w={40}>
                            <CloseButton size={size} aria-label={`Close, ${state}`} data-state={state === "rest" ? undefined : state} />
                        </Group>
                    ))}
                    <Group w={40}>
                        <CloseButton size={size} aria-label="Close, disabled" disabled />
                    </Group>
                </Group>
            ))}
        </Stack>
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};
