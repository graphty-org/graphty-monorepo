import { FileInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof FileInput> = {
    title: "Theme/FileInput",
    component: FileInput,
    args: {
        size: "compact",
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof FileInput>;

export const Default: Story = {
    args: {
        label: "Upload file",
        placeholder: "Click to select",
    },
};

export const WithDescription: Story = {
    args: {
        label: "Upload file",
        description: "Max 5MB",
        placeholder: "Upload",
    },
};

export const Disabled: Story = {
    args: {
        label: "Upload file",
        disabled: true,
        placeholder: "Disabled",
    },
};

export const WithError: Story = {
    args: {
        label: "Upload file",
        error: "File too large",
        placeholder: "Error state",
    },
};

export const Multiple: Story = {
    args: {
        label: "Upload files",
        multiple: true,
        placeholder: "Select files",
    },
};

export const Clearable: Story = {
    args: {
        label: "Upload file",
        clearable: true,
        placeholder: "Clearable",
    },
};
