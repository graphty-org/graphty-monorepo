import { Box, Progress, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Progress> = {
    title: "Theme/Progress",
    component: Progress,
    args: {
        size: "compact",
        value: 65,
    },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
    args: {},
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="compact" mb={4}>
                    compact (4px):
                </Text>
                <Progress size="compact" value={65} />
            </Box>
            <Box>
                <Text size="compact" mb={4}>
                    xs:
                </Text>
                <Progress size="xs" value={65} />
            </Box>
            <Box>
                <Text size="compact" mb={4}>
                    sm:
                </Text>
                <Progress size="sm" value={65} />
            </Box>
        </Stack>
    ),
};

export const Variants: Story = {
    render: () => (
        <Stack gap="sm">
            <Progress size="compact" value={75} color="blue" />
            <Progress size="compact" value={50} color="green" />
            <Progress size="compact" value={25} color="red" />
            <Progress size="compact" value={100} color="teal" striped />
            <Progress size="compact" value={60} color="orange" animated />
        </Stack>
    ),
};

export const Sections: Story = {
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="compact" mb={4}>
                    Compact multi-section:
                </Text>
                <Progress.Root size="compact">
                    <Progress.Section value={35} color="blue" />
                    <Progress.Section value={25} color="green" />
                    <Progress.Section value={15} color="orange" />
                </Progress.Root>
            </Box>
            <Box>
                <Text size="compact" mb={4}>
                    Small multi-section:
                </Text>
                <Progress.Root size="sm">
                    <Progress.Section value={35} color="blue" />
                    <Progress.Section value={25} color="green" />
                    <Progress.Section value={15} color="orange" />
                </Progress.Root>
            </Box>
        </Stack>
    ),
};
