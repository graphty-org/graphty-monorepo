import { Checkbox, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Checkbox> = {
    title: "Theme/Checkbox",
    component: Checkbox,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Checkbox States
            </Text>
            <Group gap="lg">
                <Checkbox size="compact" label="Unchecked" />
                <Checkbox size="compact" label="Checked" defaultChecked />
                <Checkbox size="compact" label="Disabled" disabled />
                <Checkbox size="compact" label="Disabled Checked" defaultChecked disabled />
                <Checkbox size="compact" label="Indeterminate" indeterminate />
            </Group>
        </Stack>
    ),
};
