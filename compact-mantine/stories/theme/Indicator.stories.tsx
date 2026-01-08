import { Avatar, Group, Indicator, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Mail, User } from "lucide-react";

const meta: Meta<typeof Indicator> = {
    title: "Theme/Indicator",
    component: Indicator,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Indicator>;

export const Default: Story = {
    args: {
        color: "red",
        children: (
            <Avatar size="md">
                <User size={20} />
            </Avatar>
        ),
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="lg">
            <Group gap="xl">
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Indicator size="compact" color="red">
                    <Avatar size="md">
                        <User size={20} />
                    </Avatar>
                </Indicator>
                <Indicator size="compact" color="green" processing>
                    <Avatar size="md">
                        <Mail size={20} />
                    </Avatar>
                </Indicator>
            </Group>
            <Group gap="xl">
                <Text size="compact" style={{ width: 80 }}>
                    10px:
                </Text>
                <Indicator size={10} color="red">
                    <Avatar size="md">
                        <User size={20} />
                    </Avatar>
                </Indicator>
                <Indicator size={10} color="green" processing>
                    <Avatar size="md">
                        <Mail size={20} />
                    </Avatar>
                </Indicator>
            </Group>
        </Stack>
    ),
};
