import { Group, PasswordInput, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof PasswordInput> = {
    title: "Theme/PasswordInput",
    component: PasswordInput,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter secret code",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                PasswordInput States
            </Text>
            <Group gap="xs" align="flex-end">
                <PasswordInput size="compact" placeholder="Default" w={120} />
                <PasswordInput size="compact" label="With Label" placeholder="••••" w={120} />
                <PasswordInput size="compact" defaultValue="secret" w={120} />
                <PasswordInput size="compact" placeholder="Disabled" disabled w={120} />
            </Group>
        </Stack>
    ),
};
