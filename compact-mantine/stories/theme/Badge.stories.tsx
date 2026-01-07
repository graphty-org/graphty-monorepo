import { Badge, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Badge> = {
    title: "Theme/Badge",
    component: Badge,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        children: "Badge",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Badge Variants
            </Text>
            <Group gap="xs">
                <Badge size="compact">Filled</Badge>
                <Badge size="compact" variant="light">
                    Light
                </Badge>
                <Badge size="compact" variant="outline">
                    Outline
                </Badge>
                <Badge size="compact" variant="dot">
                    Dot
                </Badge>
            </Group>
            <Text size="sm" fw={500} mt="md">
                Badge Colors (Filled)
            </Text>
            <Group gap="xs">
                <Badge size="compact" color="blue">
                    Blue
                </Badge>
                <Badge size="compact" color="green">
                    Green
                </Badge>
                <Badge size="compact" color="red">
                    Red
                </Badge>
                <Badge size="compact" color="orange">
                    Orange
                </Badge>
                <Badge size="compact" color="grape">
                    Grape
                </Badge>
            </Group>
            <Text size="sm" fw={500} mt="md">
                Badge Colors (Light)
            </Text>
            <Group gap="xs">
                <Badge size="compact" variant="light" color="blue">
                    Blue
                </Badge>
                <Badge size="compact" variant="light" color="green">
                    Green
                </Badge>
                <Badge size="compact" variant="light" color="red">
                    Red
                </Badge>
                <Badge size="compact" variant="light" color="orange">
                    Orange
                </Badge>
                <Badge size="compact" variant="light" color="grape">
                    Grape
                </Badge>
            </Group>
        </Stack>
    ),
};
