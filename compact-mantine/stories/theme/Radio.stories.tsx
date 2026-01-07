import { Group, Radio, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Radio> = {
    title: "Theme/Radio",
    component: Radio,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Radio>;

export const Default: Story = {
    args: {
        label: "Option A",
        value: "a",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Radio States
            </Text>
            <Group gap="lg">
                <Radio size="compact" label="Unselected" value="a" />
                <Radio size="compact" label="Selected" value="b" checked onChange={() => {}} />
                <Radio size="compact" label="Disabled" value="c" disabled />
            </Group>
            <Text size="sm" fw={500} mt="md">
                Radio Group
            </Text>
            <Radio.Group name="mood" defaultValue="sleepy">
                <Group gap="md">
                    <Radio size="compact" value="sleepy" label="Sleepy" />
                    <Radio size="compact" value="hungry" label="Hungry" />
                    <Radio size="compact" value="playful" label="Playful" />
                </Group>
            </Radio.Group>
        </Stack>
    ),
};
