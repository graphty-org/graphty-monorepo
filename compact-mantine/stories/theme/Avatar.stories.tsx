import { Avatar, Group, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Avatar> = {
    title: "Compact Theme/Mantine Components/Avatar",
    component: Avatar,
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
    args: {
        children: "AB",
        color: "blue",
    },
};

/** A single avatar (24, the user's colour) and a stack (2px ring, 21px step), as in Figma's header. */
export const States: Story = {
    render: () => (
        <Group gap={16}>
            <Avatar color="pink">A</Avatar>
            <Avatar.Group>
                <Avatar color="pink">A</Avatar>
                <Avatar color="teal">B</Avatar>
                <Avatar color="orange">C</Avatar>
            </Avatar.Group>
            <Text size="xs">single / stack</Text>
        </Group>
    ),
};
