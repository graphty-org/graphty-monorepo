import { Stepper } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Stepper> = {
    title: "Compact Theme/Mantine Components/Stepper",
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

/**
 * Stepper on the tokens (design/figma-spec.md 5.9): 24 icons, pending --cm-bg-secondary,
 * active and completed brand, 11/16 labels.
 */
export const States: Story = {
    render: () => (
        <Stepper active={1}>
            <Stepper.Step label="Done" description="Completed" />
            <Stepper.Step label="Now" description="Active" />
            <Stepper.Step label="Next" description="Pending" />
        </Stepper>
    ),
};
