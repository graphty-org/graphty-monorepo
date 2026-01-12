import { Group, Pill } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Pill> = {
    title: "Theme/Pill",
    component: Pill,
};

export default meta;
type Story = StoryObj<typeof Pill>;

export const Default: Story = {
    args: {
        children: "Tag",
    },
};

export const Removable: Story = {
    args: {
        children: "Removable",
        withRemoveButton: true,
    },
};

export const Disabled: Story = {
    args: {
        children: "Disabled",
        withRemoveButton: true,
        disabled: true,
    },
};

export const TagsExample: Story = {
    render: () => (
        <Group gap="xs">
            <Pill>sleepy</Pill>
            <Pill>fluffy</Pill>
            <Pill withRemoveButton>mischievous</Pill>
            <Pill withRemoveButton>adorable</Pill>
        </Group>
    ),
};
