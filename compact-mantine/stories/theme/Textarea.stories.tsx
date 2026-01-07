import { Group, Stack, Text, Textarea } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Textarea> = {
    title: "Theme/Textarea",
    component: Textarea,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
    args: {
        placeholder: "Write your thoughts...",
        rows: 2,
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                Textarea States
            </Text>
            <Group gap="xs" align="flex-end">
                <Textarea size="compact" placeholder="Default" w={150} rows={2} />
                <Textarea size="compact" label="With Label" placeholder="Write here" w={150} rows={2} />
                <Textarea size="compact" defaultValue="With value" w={150} rows={2} />
                <Textarea size="compact" placeholder="Disabled" disabled w={150} rows={2} />
            </Group>
        </Stack>
    ),
};
