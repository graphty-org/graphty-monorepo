import { Box, Progress, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Progress> = {
    title: "Compact Theme/Mantine Components/Progress",
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

/**
 * Figma's progress bar (design/figma-spec.md 8.8): a 4px track in --cm-bg-secondary, the fill in
 * --cm-bg-brand, fully round. Empty, part and full, then a caller colour.
 */
export const States: Story = {
    render: () => (
        <Stack gap={12} w={240}>
            {[0, 40, 100].map((value) => (
                <Box key={value}>
                    <Text size="xs" c="dimmed">
                        {value}%
                    </Text>
                    <Progress value={value} aria-label={`${value} percent`} />
                </Box>
            ))}
            <Box>
                <Text size="xs" c="dimmed">
                    color="red"
                </Text>
                <Progress value={60} color="red" aria-label="60 percent, red" />
            </Box>
        </Stack>
    ),
};
