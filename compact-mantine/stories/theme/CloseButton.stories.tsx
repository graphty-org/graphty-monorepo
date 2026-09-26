import { CloseButton, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Mantine's CloseButton, themed to Figma's close (design/figma-spec.md 4.7): a 24 x 24 ghost icon
 * button with a 10 x 10 X at the default size; `xs` is the 16 x 16 inline clear inside a 24 field.
 */
const meta: Meta<typeof CloseButton> = {
    title: "Compact Theme/Mantine Components/CloseButton",
    component: CloseButton,
};

export default meta;
type Story = StoryObj<typeof CloseButton>;

const STATES = ["rest", "hover", "press", "focus"] as const;

/** Both sizes in every state, forced with `data-state`; plus disabled. */
export const States: Story = {
    render: () => (
        <Stack gap={8}>
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
};

export const Default: Story = { args: { "aria-label": "Close" } };

export const InlineClear: Story = { args: { size: "xs", "aria-label": "Clear" } };

export const Disabled: Story = { args: { disabled: true, "aria-label": "Close" } };
