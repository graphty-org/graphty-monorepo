import { NativeSelect, Select } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Select> = {
    title: "Theme/Select",
    component: Select,
    args: {
        data: ["Sleepy", "Hungry", "Chaotic", "Zoomies"],
    },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
    args: {
        placeholder: "Select mood",
    },
};

export const Searchable: Story = {
    args: {
        label: "Searchable",
        placeholder: "Search...",
        data: ["Cats", "Dogs", "Hamsters"],
        searchable: true,
        w: 200,
    },
};

export const Clearable: Story = {
    args: {
        placeholder: "Clearable",
        data: ["Cats", "Dogs"],
        clearable: true,
        defaultValue: "Cats",
        w: 200,
    },
};

export const Disabled: Story = {
    args: {
        placeholder: "Disabled",
        data: ["A", "B"],
        disabled: true,
        w: 200,
    },
};

export const Native: Story = {
    render: () => <NativeSelect data={["Native", "Select"]} w={200} />,
};
