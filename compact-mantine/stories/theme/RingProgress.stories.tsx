import { Group, RingProgress, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * RingProgress requires numeric sizes as it uses them directly in SVG calculations.
 * Use size={48} for compact-equivalent sizing.
 */
const meta: Meta<typeof RingProgress> = {
    title: "Theme/RingProgress",
    component: RingProgress,
    args: {
        size: 48,
        thickness: 4,
    },
};

export default meta;
type Story = StoryObj<typeof RingProgress>;

export const Default: Story = {
    args: {
        sections: [{ value: 65, color: "blue" }],
        label: (
            <Text size="compact" ta="center">
                65%
            </Text>
        ),
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="md">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    48px:
                </Text>
                <RingProgress
                    size={48}
                    thickness={4}
                    sections={[{ value: 65, color: "blue" }]}
                    label={
                        <Text size="compact" ta="center">
                            65%
                        </Text>
                    }
                />
                <RingProgress
                    size={48}
                    thickness={4}
                    sections={[
                        { value: 40, color: "blue" },
                        { value: 25, color: "green" },
                    ]}
                />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    60px:
                </Text>
                <RingProgress
                    size={60}
                    thickness={5}
                    sections={[{ value: 65, color: "blue" }]}
                    label={
                        <Text size="xs" ta="center">
                            65%
                        </Text>
                    }
                />
                <RingProgress
                    size={60}
                    thickness={5}
                    sections={[
                        { value: 40, color: "blue" },
                        { value: 25, color: "green" },
                    ]}
                />
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    80px:
                </Text>
                <RingProgress
                    size={80}
                    thickness={6}
                    sections={[{ value: 65, color: "blue" }]}
                    label={
                        <Text size="sm" ta="center">
                            65%
                        </Text>
                    }
                />
                <RingProgress
                    size={80}
                    thickness={6}
                    sections={[
                        { value: 40, color: "blue" },
                        { value: 25, color: "green" },
                    ]}
                />
            </Group>
        </Stack>
    ),
};

export const Variants: Story = {
    render: () => (
        <Group gap="md">
            <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: 100, color: "green" }]}
                label={
                    <Text size="compact" ta="center" c="green">
                        Done
                    </Text>
                }
            />
            <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: 75, color: "blue" }]}
                label={
                    <Text size="compact" ta="center">
                        75%
                    </Text>
                }
            />
            <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: 30, color: "red" }]}
                label={
                    <Text size="compact" ta="center" c="red">
                        Low
                    </Text>
                }
            />
            <RingProgress
                size={48}
                thickness={4}
                roundCaps
                sections={[
                    { value: 30, color: "cyan" },
                    { value: 30, color: "orange" },
                    { value: 30, color: "grape" },
                ]}
            />
        </Group>
    ),
};
