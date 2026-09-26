import { Badge, Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Badge> = {
    title: "Compact Theme/Mantine Components/Badge",
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

/**
 * Every Figma badge look side by side: the default outline ("Beta"), filled, light, and the
 * outline inside a dark menu (#383838 outline, secondary menu text).
 */
export const States: Story = {
    render: () => (
        <Stack gap={12}>
            <Group gap={8}>
                <Badge>Beta</Badge>
                <Badge variant="filled">New</Badge>
                <Badge variant="light">Pro</Badge>
                <Text size="xs">outline (default) / filled / light</Text>
            </Group>
            <Menu opened withinPortal={false} position="bottom-start">
                <Menu.Target>
                    <span />
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item rightSection={<Badge>Beta</Badge>}>Motion</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Stack>
    ),
};
