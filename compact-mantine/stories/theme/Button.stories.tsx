import { Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Heart } from "lucide-react";

const meta: Meta<typeof Button> = {
    title: "Theme/Button",
    component: Button,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: "Click me",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Button Variants
            </Text>
            <Group gap="xs">
                <Button size="compact">Filled</Button>
                <Button size="compact" variant="light">
                    Light
                </Button>
                <Button size="compact" variant="outline">
                    Outline
                </Button>
                <Button size="compact" variant="subtle">
                    Subtle
                </Button>
                <Button size="compact" variant="transparent">
                    Transparent
                </Button>
            </Group>
            <Text size="sm" fw={500} mt="md">
                Button States
            </Text>
            <Group gap="xs">
                <Button size="compact">Normal</Button>
                <Button size="compact" disabled>
                    Disabled
                </Button>
                <Button size="compact" loading>
                    Loading
                </Button>
                <Button size="compact" leftSection={<Heart size={12} />}>
                    With Icon
                </Button>
            </Group>
            <Text size="sm" fw={500} mt="md">
                Button Colors
            </Text>
            <Group gap="xs">
                <Button size="compact" color="blue">
                    Blue
                </Button>
                <Button size="compact" color="green">
                    Green
                </Button>
                <Button size="compact" color="red">
                    Red
                </Button>
                <Button size="compact" color="orange">
                    Orange
                </Button>
                <Button size="compact" color="grape">
                    Grape
                </Button>
            </Group>
        </Stack>
    ),
};
