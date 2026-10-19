import { Stepper } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Stepper`, redrawn on the panel tokens: 24px step icons, the secondary ground while
 * pending and the brand color once active or completed. Figma has no stepper, so only the look
 * changes. Every prop is Mantine's: see [Stepper on mantine.dev](https://mantine.dev/core/stepper/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Stepper } from "@mantine/core";
 *
 * <Stepper active={step} onStepClick={setStep}>
 *     <Stepper.Step label="Load" description="Choose a file" />
 *     <Stepper.Step label="Map" description="Pick columns" />
 * </Stepper>
 * ```
 *
 * With `onStepClick`, each step is a button in the Tab order; without it, the steps are out of
 * the Tab order and only show progress.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Step icon | 24px |
 * | Label, description | 11/16 |
 */
const meta: Meta<typeof Stepper> = {
    title: "Themed Mantine/Navigation/Stepper",
    component: Stepper,
    tags: ["autodocs"],
    args: {
        active: 1,
    },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

/** Three steps with the second active; change `active` in Controls. */
export const Default: Story = {
    render: (args) => (
        <Stepper {...args}>
            <Stepper.Step label="Step 1" description="Create account" />
            <Stepper.Step label="Step 2" description="Verify email" />
            <Stepper.Step label="Step 3" description="Get started" />
        </Stepper>
    ),
};

/** Completed, active and pending steps, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stepper active={1}>
            <Stepper.Step label="Done" description="Completed" />
            <Stepper.Step label="Now" description="Active" />
            <Stepper.Step label="Next" description="Pending" />
        </Stepper>
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};
