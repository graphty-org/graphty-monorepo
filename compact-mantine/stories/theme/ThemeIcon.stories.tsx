import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Bell, Home, Settings, Star } from "lucide-react";

const meta: Meta<typeof ThemeIcon> = {
    title: "Theme/ThemeIcon",
    component: ThemeIcon,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof ThemeIcon>;

export const Default: Story = {
    args: {
        children: <Home size={14} />,
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
                <ThemeIcon size="compact" color="blue">
                    <Home size={14} />
                </ThemeIcon>
                <ThemeIcon size="compact" color="green">
                    <Settings size={14} />
                </ThemeIcon>
                <ThemeIcon size="compact" color="red">
                    <Bell size={14} />
                </ThemeIcon>
                <ThemeIcon size="compact" variant="light">
                    <Star size={14} />
                </ThemeIcon>
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    xs:
                </Text>
                <ThemeIcon size="xs" color="blue">
                    <Home size={12} />
                </ThemeIcon>
                <ThemeIcon size="xs" color="green">
                    <Settings size={12} />
                </ThemeIcon>
                <ThemeIcon size="xs" color="red">
                    <Bell size={12} />
                </ThemeIcon>
                <ThemeIcon size="xs" variant="light">
                    <Star size={12} />
                </ThemeIcon>
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    sm:
                </Text>
                <ThemeIcon size="sm" color="blue">
                    <Home size={14} />
                </ThemeIcon>
                <ThemeIcon size="sm" color="green">
                    <Settings size={14} />
                </ThemeIcon>
                <ThemeIcon size="sm" color="red">
                    <Bell size={14} />
                </ThemeIcon>
                <ThemeIcon size="sm" variant="light">
                    <Star size={14} />
                </ThemeIcon>
            </Group>
        </Stack>
    ),
};
