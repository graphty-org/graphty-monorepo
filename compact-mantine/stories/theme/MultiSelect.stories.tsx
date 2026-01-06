import { MultiSelect } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof MultiSelect> = {
    title: "Theme/MultiSelect",
    component: MultiSelect,
    args: {
        size: "compact",
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

const data = ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"];

export const Default: Story = {
    args: {
        label: "Favorite foods",
        placeholder: "Pick some",
        data,
    },
};

export const WithValues: Story = {
    args: {
        label: "Favorite foods",
        defaultValue: ["Pizza", "Sushi"],
        data,
    },
};

export const Disabled: Story = {
    args: {
        label: "Favorite foods",
        disabled: true,
        data,
    },
};

export const WithError: Story = {
    args: {
        label: "Favorite foods",
        error: "Pick at least one",
        data,
    },
};

export const Clearable: Story = {
    args: {
        label: "Favorite foods",
        clearable: true,
        defaultValue: ["Tacos"],
        data,
    },
};

export const MultiRow: Story = {
    args: {
        label: "Favorite foods",
        defaultValue: ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"],
        data,
    },
};
