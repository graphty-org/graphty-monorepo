import { Group, Loader, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Loader> = {
    title: "Theme/Loader",
    component: Loader,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Default: Story = {
    args: {},
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="md">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Loader size="compact" />
                <Loader size="compact" type="bars" />
                <Loader size="compact" type="dots" />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    xs:
                </Text>
                <Loader size="xs" />
                <Loader size="xs" type="bars" />
                <Loader size="xs" type="dots" />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    sm:
                </Text>
                <Loader size="sm" />
                <Loader size="sm" type="bars" />
                <Loader size="sm" type="dots" />
            </Group>
        </Stack>
    ),
};

export const Colors: Story = {
    render: () => (
        <Group gap="md">
            <Loader size="compact" color="blue" />
            <Loader size="compact" color="green" />
            <Loader size="compact" color="red" />
            <Loader size="compact" color="orange" />
            <Loader size="compact" color="violet" />
        </Group>
    ),
};
