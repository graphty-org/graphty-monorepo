import { Group, NumberInput, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof NumberInput> = {
    title: "Theme/NumberInput",
    component: NumberInput,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {
    args: {
        placeholder: "Enter amount",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                NumberInput States
            </Text>
            <Group gap="xs" align="flex-end">
                <NumberInput size="compact" placeholder="Default" w={90} />
                <NumberInput size="compact" label="With Label" defaultValue={42} w={90} />
                <NumberInput size="compact" defaultValue={10} hideControls={false} w={90} />
                <NumberInput size="compact" suffix="%" defaultValue={75} w={90} />
                <NumberInput size="compact" placeholder="Disabled" disabled w={90} />
            </Group>
        </Stack>
    ),
};
