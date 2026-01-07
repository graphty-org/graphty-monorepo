import { Autocomplete, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Autocomplete> = {
    title: "Theme/Autocomplete",
    component: Autocomplete,
    args: {
        size: "compact",
        data: ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"],
    },
};

export default meta;
type Story = StoryObj<typeof Autocomplete>;

export const Default: Story = {
    args: {
        placeholder: "Search foods...",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Autocomplete States
            </Text>
            <Group gap="xs" align="flex-end">
                <Autocomplete
                    size="compact"
                    placeholder="Default"
                    data={["Pizza", "Tacos", "Sushi"]}
                    w={120}
                />
                <Autocomplete
                    size="compact"
                    label="With Label"
                    placeholder="Type..."
                    data={["Pizza", "Tacos"]}
                    w={120}
                />
                <Autocomplete
                    size="compact"
                    defaultValue="Pizza"
                    data={["Pizza", "Tacos"]}
                    w={120}
                />
                <Autocomplete
                    size="compact"
                    placeholder="Disabled"
                    data={["A", "B"]}
                    disabled
                    w={120}
                />
            </Group>
        </Stack>
    ),
};
