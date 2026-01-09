import { Group, Radio } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Radio> = {
    title: "Theme/Radio",
    component: Radio,
};

export default meta;
type Story = StoryObj<typeof Radio>;

export const Default: Story = {
    args: {
        label: "Option A",
        value: "a",
    },
};

export const Unselected: Story = {
    args: {
        label: "Unselected",
        value: "a",
    },
};

export const Selected: Story = {
    args: {
        label: "Selected",
        value: "b",
        checked: true,
        onChange: () => {},
    },
};

export const Disabled: Story = {
    args: {
        label: "Disabled",
        value: "c",
        disabled: true,
    },
};

export const RadioGroup: Story = {
    render: () => (
        <Radio.Group name="mood" defaultValue="sleepy">
            <Group gap="md">
                <Radio value="sleepy" label="Sleepy" />
                <Radio value="hungry" label="Hungry" />
                <Radio value="playful" label="Playful" />
            </Group>
        </Radio.Group>
    ),
};
