import { Group, Stack, Text, TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof TextInput> = {
    title: "Theme/TextInput",
    component: TextInput,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter your pet's name",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                TextInput States
            </Text>
            <Group gap="xs" align="flex-end">
                <TextInput size="compact" placeholder="Default" w={100} />
                <TextInput size="compact" label="With Label" placeholder="Type here" w={100} />
                <TextInput size="compact" defaultValue="With value" w={100} />
                <TextInput size="compact" placeholder="Disabled" disabled w={100} />
                <TextInput size="compact" placeholder="Error" error="Oops" w={100} />
            </Group>
        </Stack>
    ),
};
