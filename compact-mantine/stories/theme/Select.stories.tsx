import { Group, NativeSelect, Select, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Select> = {
    title: "Theme/Select",
    component: Select,
    args: {
        size: "compact",
        data: ["Sleepy", "Hungry", "Chaotic", "Zoomies"],
    },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
    args: {
        placeholder: "Select mood",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Select States
            </Text>
            <Group gap="xs" align="flex-end">
                <Select
                    size="compact"
                    placeholder="Default"
                    data={["Cats", "Dogs", "Hamsters"]}
                    w={100}
                />
                <Select
                    size="compact"
                    label="Searchable"
                    placeholder="Search..."
                    data={["Cats", "Dogs", "Hamsters"]}
                    searchable
                    w={100}
                />
                <Select
                    size="compact"
                    placeholder="Clearable"
                    data={["Cats", "Dogs"]}
                    clearable
                    defaultValue="Cats"
                    w={100}
                />
                <Select size="compact" placeholder="Disabled" data={["A", "B"]} disabled w={100} />
                <NativeSelect size="compact" data={["Native", "Select"]} w={100} />
            </Group>
        </Stack>
    ),
};
