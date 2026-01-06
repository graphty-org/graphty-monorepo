import { SegmentedControl, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof SegmentedControl> = {
    title: "Theme/SegmentedControl",
    component: SegmentedControl,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {
    args: {
        data: ["Nap", "Eat", "Play"],
    },
};

export const AllStates: Story = {
    render: () => (
        <Stack gap="md">
            <Text size="sm" fw={500}>
                SegmentedControl States
            </Text>
            <Stack gap="xs">
                <SegmentedControl size="compact" data={["Nap", "Eat", "Zoom"]} w={200} />
                <SegmentedControl size="compact" data={["Mon", "Tue", "Wed", "Thu", "Fri"]} w={300} />
                <SegmentedControl size="compact" data={["Yes", "No", "Maybe"]} fullWidth w={200} />
                <SegmentedControl size="compact" data={["A", "B"]} disabled w={100} />
            </Stack>
        </Stack>
    ),
};
