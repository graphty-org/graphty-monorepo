import { Group, Pill } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Pill> = {
    title: "Compact Theme/Mantine Components/Pill",
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

/** The variable-pill shape: 20 tall, 1px border, radius 5; with a remove button; disabled. */
export const States: Story = {
    render: () => (
        <Group gap={8}>
            <Pill>spacing-4</Pill>
            <Pill withRemoveButton>brand/primary</Pill>
            <Pill disabled>disabled</Pill>
        </Group>
    ),
};
