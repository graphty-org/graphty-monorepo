import { Box, Progress, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Progress> = {
    title: "Theme/Progress",
    component: Progress,
    args: {
        value: 65,
    },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
    args: {},
};

export const Variants: Story = {
    render: () => (
        <Stack gap="sm">
            <Progress value={75} color="blue" />
            <Progress value={50} color="green" />
            <Progress value={25} color="red" />
            <Progress value={100} color="teal" striped />
            <Progress value={60} color="orange" animated />
        </Stack>
    ),
};

export const Sections: Story = {
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="sm" mb={4}>
                    Default multi-section:
                </Text>
                <Progress.Root>
                    <Progress.Section value={35} color="blue" />
                    <Progress.Section value={25} color="green" />
                    <Progress.Section value={15} color="orange" />
                </Progress.Root>
            </Box>
            <Box>
                <Text size="sm" mb={4}>
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
