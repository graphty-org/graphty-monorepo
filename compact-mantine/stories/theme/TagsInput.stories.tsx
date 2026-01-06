import { TagsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof TagsInput> = {
    title: "Theme/TagsInput",
    component: TagsInput,
    args: {
        size: "compact",
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof TagsInput>;

export const Default: Story = {
    args: {
        label: "Keywords",
        placeholder: "Type and press Enter",
    },
};

export const WithValues: Story = {
    args: {
        label: "Keywords",
        defaultValue: ["urgent", "important"],
    },
};

export const Disabled: Story = {
    args: {
        label: "Keywords",
        disabled: true,
        defaultValue: ["locked"],
    },
};

export const WithError: Story = {
    args: {
        label: "Keywords",
        error: "Invalid tags",
    },
};

export const MaxTags: Story = {
    args: {
        label: "Keywords",
        maxTags: 3,
        placeholder: "Max 3 tags",
    },
};

export const MultiRow: Story = {
    args: {
        label: "Keywords",
        defaultValue: ["urgent", "important", "review", "draft", "pending"],
    },
};
