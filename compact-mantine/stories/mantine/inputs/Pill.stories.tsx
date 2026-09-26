import { Group, Pill } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Pill`, themed in the shape of Figma's variable pill. It is the pill `MultiSelect`,
 * `TagsInput` and `PillsInput` draw. Every prop is Mantine's: see
 * [Pill on mantine.dev](https://mantine.dev/core/pill/).
 *
 * For a field bound to a design variable use `VariablePill` (Components/Inputs), which adds the
 * detach action and the bound-field behaviour.
 *
 * ## Usage
 *
 * ```tsx
 * import { Pill } from "@mantine/core";
 *
 * <Pill withRemoveButton onRemove={() => remove(tag)}>{tag}</Pill>
 * ```
 *
 * Mantine keeps the remove button out of the Tab order and hides it from assistive technology,
 * so give the reader another way to remove a value: inside `MultiSelect` and `TagsInput`,
 * Backspace removes the last pill.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 20px |
 * | Edge | 1px `--cm-border`, radius 5px, `--cm-bg` ground |
 * | Text | 11/16, padding 0 4px |
 */
const meta: Meta<typeof Pill> = {
    title: "Themed Mantine/Inputs/Pill",
    component: Pill,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Pill>;

/** One pill; toggle `withRemoveButton` and `disabled` in Controls. */
export const Default: Story = {
    args: {
        children: "Tag",
        withRemoveButton: false,
        disabled: false,
    },
};

/** Plain, with a remove button, and disabled. Light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={8}>
            <Pill>spacing-4</Pill>
            <Pill withRemoveButton>brand/primary</Pill>
            <Pill disabled>disabled</Pill>
        </Group>
    ),
};

/** Several pills in a row, as a tag list. */
export const PillGroup: Story = {
    render: () => (
        <Pill.Group>
            <Pill>nodes</Pill>
            <Pill>edges</Pill>
            <Pill withRemoveButton>degree</Pill>
            <Pill withRemoveButton>community</Pill>
        </Pill.Group>
    ),
};
