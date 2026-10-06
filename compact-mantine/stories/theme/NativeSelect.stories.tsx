import { NativeSelect, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof NativeSelect> = {
    title: "Compact Theme/Mantine Components/NativeSelect",
    component: NativeSelect,
    args: {
        w: 200,
        data: ["Force-directed", "Circular", "Grid"],
    },
};

export default meta;
type Story = StoryObj<typeof NativeSelect>;

export const Default: Story = {
    args: {
        label: "Layout",
    },
};

export const Disabled: Story = {
    args: {
        label: "Layout",
        disabled: true,
    },
};

/** Every size token, so each row visibly steps up: 20, 24, 30, 36, 44px. */
export const Sizes: Story = {
    render: (args) => (
        <Stack gap={8}>
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <NativeSelect key={size} {...args} size={size} label={size} />
            ))}
        </Stack>
    ),
};
