import { Stepper } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Stepper> = {
    title: "Theme/Stepper",
    component: Stepper,
    args: {
        active: 1,
    },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Default: Story = {
    render: (args) => (
        <Stepper {...args}>
            <Stepper.Step label="Step 1" description="Create account" />
            <Stepper.Step label="Step 2" description="Verify email" />
            <Stepper.Step label="Step 3" description="Get started" />
        </Stepper>
    ),
};
