import { ColorInput, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof ColorInput> = {
    title: "Compact Theme/Mantine Components/ColorInput",
    component: ColorInput,
    args: {
        w: 200,
        defaultValue: "#4dabf7",
    },
};

export default meta;
type Story = StoryObj<typeof ColorInput>;

export const Default: Story = {
    args: {
        label: "Node colour",
    },
};

export const Disabled: Story = {
    args: {
        label: "Node colour",
        disabled: true,
    },
};

/** Every size token, so each row visibly steps up: 20, 24, 30, 36, 44px. */
export const Sizes: Story = {
    render: (args) => (
        <Stack gap={8}>
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <ColorInput key={size} {...args} size={size} label={size} />
            ))}
        </Stack>
    ),
};
