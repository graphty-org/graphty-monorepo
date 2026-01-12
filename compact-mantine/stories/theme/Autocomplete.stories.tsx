import { Autocomplete } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Autocomplete> = {
    title: "Theme/Autocomplete",
    component: Autocomplete,
    args: {
        data: ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"],
    },
};

export default meta;
type Story = StoryObj<typeof Autocomplete>;

export const Default: Story = {
    args: {
        placeholder: "Search foods...",
    },
};

export const WithLabel: Story = {
    args: {
        label: "With Label",
        placeholder: "Type...",
        data: ["Pizza", "Tacos"],
        w: 200,
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: "Pizza",
        data: ["Pizza", "Tacos"],
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
