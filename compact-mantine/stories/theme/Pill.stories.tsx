import { Group, Pill, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Pill> = {
    title: "Theme/Pill",
    component: Pill,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Pill>;

export const Default: Story = {
    args: {
        children: "Tag",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Pill States
            </Text>
            <Group gap="xs">
                <Pill size="compact">Default</Pill>
                <Pill size="compact" withRemoveButton>
                    Removable
                </Pill>
                <Pill size="compact" withRemoveButton disabled>
                    Disabled
                </Pill>
            </Group>
            <Text size="sm" fw={500} mt="md">
                Real-world Example (Tags)
            </Text>
            <Group gap="xs">
                <Pill size="compact">sleepy</Pill>
                <Pill size="compact">fluffy</Pill>
                <Pill size="compact" withRemoveButton>
                    mischievous
                </Pill>
                <Pill size="compact" withRemoveButton>
                    adorable
                </Pill>
            </Group>
        </Stack>
    ),
};
