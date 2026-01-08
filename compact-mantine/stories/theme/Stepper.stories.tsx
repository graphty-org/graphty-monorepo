import { Box, Stack, Stepper, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Stepper> = {
    title: "Theme/Stepper",
    component: Stepper,
    args: {
        size: "compact",
        active: 1,
    },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Default: Story = {
    args: {
        children: (
            <>
                <Stepper.Step label="Step 1" description="Create account" />
                <Stepper.Step label="Step 2" description="Verify email" />
                <Stepper.Step label="Step 3" description="Get started" />
            </>
        ),
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="xl">
            <Box>
                <Text size="compact" fw={500} mb="sm">
                    Compact:
                </Text>
                <Stepper size="compact" active={1}>
                    <Stepper.Step label="Step 1" description="Create account" />
                    <Stepper.Step label="Step 2" description="Verify email" />
                    <Stepper.Step label="Step 3" description="Get started" />
                </Stepper>
            </Box>
            <Box>
                <Text size="compact" fw={500} mb="sm">
                    Extra Small (xs):
                </Text>
                <Stepper size="xs" active={1}>
                    <Stepper.Step label="Step 1" description="Create account" />
                    <Stepper.Step label="Step 2" description="Verify email" />
                    <Stepper.Step label="Step 3" description="Get started" />
                </Stepper>
            </Box>
            <Box>
                <Text size="compact" fw={500} mb="sm">
                    Small (sm):
                </Text>
                <Stepper size="sm" active={1}>
                    <Stepper.Step label="Step 1" description="Create account" />
                    <Stepper.Step label="Step 2" description="Verify email" />
                    <Stepper.Step label="Step 3" description="Get started" />
                </Stepper>
            </Box>
        </Stack>
    ),
};
