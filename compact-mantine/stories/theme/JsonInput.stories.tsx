import { JsonInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof JsonInput> = {
    title: "Theme/JsonInput",
    component: JsonInput,
    args: {
        size: "compact",
        w: 250,
    },
};

export default meta;
type Story = StoryObj<typeof JsonInput>;

export const Default: Story = {
    args: {
        label: "JSON data",
        placeholder: '{"key": "value"}',
    },
};

export const WithValue: Story = {
    args: {
        label: "JSON data",
        defaultValue: '{"name": "test", "value": 42}',
        formatOnBlur: true,
        autosize: true,
    },
};

export const Disabled: Story = {
    args: {
        label: "JSON data",
        disabled: true,
        defaultValue: '{"locked": true}',
    },
};

export const WithError: Story = {
    args: {
        label: "JSON data",
        error: "Invalid JSON",
    },
};

export const WithValidation: Story = {
    args: {
        label: "JSON data",
        validationError: "Invalid JSON syntax",
    },
};
