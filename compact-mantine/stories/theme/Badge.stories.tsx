import { Badge, Group } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Badge> = {
    title: "Theme/Badge",
    component: Badge,
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        children: "Badge",
    },
};

export const Filled: Story = {
    args: {
        children: "Filled",
        variant: "filled",
    },
};

export const Light: Story = {
    args: {
        children: "Light",
        variant: "light",
    },
};

export const Outline: Story = {
    args: {
        children: "Outline",
        variant: "outline",
    },
};

export const Dot: Story = {
    args: {
        children: "Dot",
        variant: "dot",
    },
};

export const FilledColors: Story = {
    render: () => (
        <Group gap="xs">
            <Badge color="blue">Blue</Badge>
            <Badge color="green">Green</Badge>
            <Badge color="red">Red</Badge>
            <Badge color="orange">Orange</Badge>
            <Badge color="grape">Grape</Badge>
        </Group>
    ),
};

export const LightColors: Story = {
    render: () => (
        <Group gap="xs">
            <Badge variant="light" color="blue">Blue</Badge>
            <Badge variant="light" color="green">Green</Badge>
            <Badge variant="light" color="red">Red</Badge>
            <Badge variant="light" color="orange">Orange</Badge>
            <Badge variant="light" color="grape">Grape</Badge>
        </Group>
    ),
};
