import { Avatar, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Avatar> = {
    title: "Theme/Avatar",
    component: Avatar,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
    args: {
        children: "AB",
        color: "blue",
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="xs">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Avatar size="compact" color="blue">
                    AB
                </Avatar>
                <Avatar size="compact" color="green">
                    CD
                </Avatar>
                <Avatar size="compact" src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png" />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    xs:
                </Text>
                <Avatar size="xs" color="blue">
                    AB
                </Avatar>
                <Avatar size="xs" color="green">
                    CD
                </Avatar>
                <Avatar size="xs" src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png" />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    sm:
                </Text>
                <Avatar size="sm" color="blue">
                    AB
                </Avatar>
                <Avatar size="sm" color="green">
                    CD
                </Avatar>
                <Avatar size="sm" src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png" />
            </Group>
        </Stack>
    ),
};
