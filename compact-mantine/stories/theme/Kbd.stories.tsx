import { Group, Kbd, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Kbd> = {
    title: "Compact Theme/Mantine Components/Kbd",
    component: Kbd,
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
    args: {
        children: "Ctrl",
    },
};

/** The key caps: list (sm), essential (md), lit, and the light inline cap for prose. */
export const States: Story = {
    render: () => (
        <Stack gap={12}>
            <Group gap={3}>
                <Kbd>Shift</Kbd>
                <Kbd>L</Kbd>
            </Group>
            <Group gap={3}>
                <Kbd size="md">Ctrl</Kbd>
                <Kbd size="md">\</Kbd>
            </Group>
            <Group gap={3}>
                <Kbd size="md" mod={{ active: true }}>
                    Ctrl
                </Kbd>
                <Kbd size="md" mod={{ active: true }}>
                    K
                </Kbd>
            </Group>
            <Text size="sm">
                Press <Kbd variant="inline">Ctrl</Kbd> <Kbd variant="inline">K</Kbd> to search.
            </Text>
        </Stack>
    ),
};
