import { Group, Kbd, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Kbd> = {
    title: "Theme/Kbd",
    component: Kbd,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
    args: {
        children: "Ctrl",
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="xs">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Group gap={4}>
                    <Kbd size="compact">Ctrl</Kbd>
                    <Text size="compact">+</Text>
                    <Kbd size="compact">K</Kbd>
                </Group>
                <Group gap={4}>
                    <Kbd size="compact">Cmd</Kbd>
                    <Text size="compact">+</Text>
                    <Kbd size="compact">Shift</Kbd>
                    <Text size="compact">+</Text>
                    <Kbd size="compact">P</Kbd>
                </Group>
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    xs:
                </Text>
                <Group gap={4}>
                    <Kbd size="xs">Ctrl</Kbd>
                    <Text size="xs">+</Text>
                    <Kbd size="xs">K</Kbd>
                </Group>
                <Group gap={4}>
                    <Kbd size="xs">Cmd</Kbd>
                    <Text size="xs">+</Text>
                    <Kbd size="xs">Shift</Kbd>
                    <Text size="xs">+</Text>
                    <Kbd size="xs">P</Kbd>
                </Group>
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    sm:
                </Text>
                <Group gap={4}>
                    <Kbd size="sm">Ctrl</Kbd>
                    <Text size="sm">+</Text>
                    <Kbd size="sm">K</Kbd>
                </Group>
                <Group gap={4}>
                    <Kbd size="sm">Cmd</Kbd>
                    <Text size="sm">+</Text>
                    <Kbd size="sm">Shift</Kbd>
                    <Text size="sm">+</Text>
                    <Kbd size="sm">P</Kbd>
                </Group>
            </Group>
        </Stack>
    ),
};
