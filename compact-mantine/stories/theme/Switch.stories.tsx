import { Group, Stack, Switch, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Switch> = {
    title: "Theme/Switch",
    component: Switch,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Switch States
            </Text>
            <Group gap="lg">
                <Switch size="compact" label="Off" />
                <Switch size="compact" label="On" defaultChecked />
                <Switch size="compact" label="Disabled Off" disabled />
                <Switch size="compact" label="Disabled On" defaultChecked disabled />
            </Group>
        </Stack>
    ),
};
