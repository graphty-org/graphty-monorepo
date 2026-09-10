import { Group, Loader } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Loader> = {
    title: "Compact Theme/Mantine Components/Loader",
    component: Loader,
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Default: Story = {
    args: {},
};

export const Colors: Story = {
    render: () => (
        <Group gap="md">
            <Loader color="blue" />
            <Loader color="green" />
            <Loader color="red" />
            <Loader color="orange" />
            <Loader color="violet" />
        </Group>
    ),
};
