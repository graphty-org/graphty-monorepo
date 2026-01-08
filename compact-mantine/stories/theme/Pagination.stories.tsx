import { Group, Pagination, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Pagination> = {
    title: "Theme/Pagination",
    component: Pagination,
    args: {
        size: "compact",
        total: 10,
    },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    args: {
        defaultValue: 1,
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="md">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Pagination size="compact" total={10} defaultValue={1} />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    xs:
                </Text>
                <Pagination size="xs" total={10} defaultValue={1} />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    sm:
                </Text>
                <Pagination size="sm" total={10} defaultValue={1} />
            </Group>
        </Stack>
    ),
};
