import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Heart, Settings, Star, Trash, Zap } from "lucide-react";

const meta: Meta<typeof ActionIcon> = {
    title: "Theme/ActionIcon",
    component: ActionIcon,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof ActionIcon>;

export const Default: Story = {
    args: {
        children: <Settings size={14} />,
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                ActionIcon Variants
            </Text>
            <Group gap="xs">
                <ActionIcon size="compact" variant="filled">
                    <Star size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="light">
                    <Star size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="outline">
                    <Star size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="subtle">
                    <Star size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="transparent">
                    <Star size={14} />
                </ActionIcon>
            </Group>
            <Text size="sm" fw={500} mt="md">
                ActionIcon States
            </Text>
            <Group gap="xs">
                <ActionIcon size="compact" variant="light">
                    <Settings size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="light" disabled>
                    <Settings size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="light" loading>
                    <Settings size={14} />
                </ActionIcon>
            </Group>
            <Text size="sm" fw={500} mt="md">
                ActionIcon Colors
            </Text>
            <Group gap="xs">
                <ActionIcon size="compact" variant="light" color="blue">
                    <Star size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="light" color="green">
                    <Zap size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="light" color="red">
                    <Trash size={14} />
                </ActionIcon>
                <ActionIcon size="compact" variant="light" color="grape">
                    <Heart size={14} />
                </ActionIcon>
            </Group>
        </Stack>
    ),
};
