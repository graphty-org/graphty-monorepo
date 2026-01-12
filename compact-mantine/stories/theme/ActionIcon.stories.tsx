import { ActionIcon, Group } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Heart, Settings, Star, Trash, Zap } from "lucide-react";

const meta: Meta<typeof ActionIcon> = {
    title: "Theme/ActionIcon",
    component: ActionIcon,
};

export default meta;
type Story = StoryObj<typeof ActionIcon>;

export const Default: Story = {
    args: {
        children: <Settings size={14} />,
        "aria-label": "Settings",
    },
};

export const Variants: Story = {
    render: () => (
        <Group gap="xs">
            <ActionIcon variant="filled" aria-label="Filled">
                <Star size={14} />
            </ActionIcon>
            <ActionIcon variant="light" aria-label="Light">
                <Star size={14} />
            </ActionIcon>
            <ActionIcon variant="outline" aria-label="Outline">
                <Star size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" aria-label="Subtle">
                <Star size={14} />
            </ActionIcon>
            <ActionIcon variant="transparent" aria-label="Transparent">
                <Star size={14} />
            </ActionIcon>
        </Group>
    ),
};

export const Disabled: Story = {
    args: {
        children: <Settings size={14} />,
        disabled: true,
        variant: "light",
        "aria-label": "Disabled",
    },
};

export const Loading: Story = {
    args: {
        children: <Settings size={14} />,
        loading: true,
        variant: "light",
        "aria-label": "Loading",
    },
};

export const Colors: Story = {
    render: () => (
        <Group gap="xs">
            <ActionIcon variant="light" color="blue" aria-label="Blue">
                <Star size={14} />
            </ActionIcon>
            <ActionIcon variant="light" color="green" aria-label="Green">
                <Zap size={14} />
            </ActionIcon>
            <ActionIcon variant="light" color="red" aria-label="Red">
                <Trash size={14} />
            </ActionIcon>
            <ActionIcon variant="light" color="grape" aria-label="Grape">
                <Heart size={14} />
            </ActionIcon>
        </Group>
    ),
};
