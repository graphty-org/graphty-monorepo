import { TagsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof TagsInput> = {
    title: "Compact Theme/Mantine Components/TagsInput",
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

/**
 * Every state side by side (design/figma-spec.md 6): rest, hover and focus (forced with
 * data-state), disabled, invalid, the outlined variant and the label. Switch light / dark and the
 * contrast mode in the toolbar.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <TagsInput aria-label="TagsInput" defaultValue={["draft"]} w={184} /> },
                { state: "hover", node: <TagsInput aria-label="TagsInput" defaultValue={["draft"]} w={184} data-state="hover" /> },
                { state: "focus", node: <TagsInput aria-label="TagsInput" defaultValue={["draft"]} w={184} data-state="focus" /> },
                { state: "disabled", node: <TagsInput aria-label="TagsInput" defaultValue={["draft"]} w={184} disabled /> },
                { state: "invalid", node: <TagsInput aria-label="TagsInput" defaultValue={["draft"]} w={184} error /> },
                { state: "outlined", node: <TagsInput aria-label="TagsInput" defaultValue={["draft"]} w={184} variant="outlined" /> },
                { state: "with label", node: <TagsInput label="Label" defaultValue={["draft"]} w={184} /> },
            ]}
        />
    ),
};
