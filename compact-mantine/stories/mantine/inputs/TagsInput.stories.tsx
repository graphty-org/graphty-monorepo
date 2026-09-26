import { TagsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `TagsInput`, themed as Figma's filled field with variable-pill shaped tags and the
 * dark list box for suggestions. Every prop is Mantine's: see
 * [TagsInput on mantine.dev](https://mantine.dev/core/tags-input/).
 *
 * Reach for TagsInput when the reader types their own values; for several values from a fixed
 * list use `MultiSelect`.
 *
 * ## Usage
 *
 * ```tsx
 * import { TagsInput } from "@mantine/core";
 *
 * <TagsInput label="Keywords" value={tags} onChange={setTags} w={184} />
 * ```
 *
 * Enter (or a comma) turns the typed text into a tag; Backspace in an empty field removes the
 * last one.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 24px per row, radius 5px |
 * | Tag | 20px tall, 1px `--cm-border`, radius 5px |
 */
const meta: Meta<typeof TagsInput> = {
    title: "Themed Mantine/Inputs/TagsInput",
    component: TagsInput,
    tags: ["autodocs"],
    args: {
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof TagsInput>;

/** A labelled, empty TagsInput; type a word and press Enter. */
export const Default: Story = {
    args: {
        label: "Keywords",
        placeholder: "Type and press Enter",
    },
};

/**
 * Every state: rest, hover and focus (forced with `data-state`), disabled, invalid, the outlined
 * variant and a label. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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

/** `maxTags` stops accepting tags at the limit. */
export const MaxTags: Story = {
    args: {
        label: "Keywords",
        maxTags: 3,
        placeholder: "Max 3 tags",
    },
};

/** More tags than fit on one line wrap onto further rows. */
export const MultiRow: Story = {
    args: {
        label: "Keywords",
        defaultValue: ["urgent", "important", "review", "draft", "pending"],
    },
};
