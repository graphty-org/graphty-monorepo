import { Button, Group } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Heart } from "lucide-react";

const meta: Meta<typeof Button> = {
    title: "Theme/Button",
    component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: "Click me",
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

export const Subtle: Story = {
    args: {
        children: "Subtle",
        variant: "subtle",
    },
};

export const Transparent: Story = {
    args: {
        children: "Transparent",
        variant: "transparent",
    },
};

export const Disabled: Story = {
    args: {
        children: "Disabled",
        disabled: true,
    },
};

export const Loading: Story = {
    args: {
        children: "Loading",
        loading: true,
    },
};

export const WithIcon: Story = {
    args: {
        children: "With Icon",
        leftSection: <Heart size={12} />,
    },
};

export const Colors: Story = {
    render: () => (
        <Group gap="xs">
            <Button color="blue">Blue</Button>
            <Button color="green">Green</Button>
            <Button color="red">Red</Button>
            <Button color="orange">Orange</Button>
            <Button color="grape">Grape</Button>
        </Group>
    ),
};
