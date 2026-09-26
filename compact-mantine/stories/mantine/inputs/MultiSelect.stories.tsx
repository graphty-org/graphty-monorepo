import { MultiSelect } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `MultiSelect`, themed as Figma's filled field with variable-pill shaped pills and the
 * dark list box opening 4px below it. Every prop is Mantine's: see
 * [MultiSelect on mantine.dev](https://mantine.dev/core/multi-select/).
 *
 * Reach for MultiSelect when the reader picks several values from a fixed list. For one value use
 * `Select` (Components/Inputs); for free-typed tags use `TagsInput`.
 *
 * ## Usage
 *
 * ```tsx
 * import { MultiSelect } from "@mantine/core";
 *
 * <MultiSelect label="Attributes" data={["degree", "weight", "label"]} value={value} onChange={setValue} w={184} />
 * ```
 *
 * ArrowDown opens the list, Enter toggles the highlighted option, Backspace in an empty search
 * removes the last pill, Escape closes.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 24px tall per row, radius 5px |
 * | Pill | 20px tall, 1px `--cm-border`, radius 5px, padding 0 4px, 11/16 |
 */
const meta: Meta<typeof MultiSelect> = {
    title: "Themed Mantine/Inputs/MultiSelect",
    component: MultiSelect,
    tags: ["autodocs"],
    args: {
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

const data = ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"];

/** A labeled, empty MultiSelect; open it and pick a few. */
export const Default: Story = {
    args: {
        label: "Favorite foods",
        placeholder: "Pick some",
        data,
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
                { state: "rest", node: <MultiSelect aria-label="MultiSelect" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} /> },
                { state: "hover", node: <MultiSelect aria-label="MultiSelect" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} data-state="hover" /> },
                { state: "focus", node: <MultiSelect aria-label="MultiSelect" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} data-state="focus" /> },
                { state: "disabled", node: <MultiSelect aria-label="MultiSelect" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} disabled /> },
                { state: "invalid", node: <MultiSelect aria-label="MultiSelect" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} error /> },
                { state: "outlined", node: <MultiSelect aria-label="MultiSelect" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} variant="outlined" /> },
                { state: "with label", node: <MultiSelect label="Label" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} w={184} /> },
            ]}
        />
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/** `clearable` adds the inline clear that removes every pill. */
export const Clearable: Story = {
    args: {
        label: "Favorite foods",
        clearable: true,
        defaultValue: ["Tacos"],
        data,
    },
};

/** More pills than fit on one line wrap onto further rows. */
export const MultiRow: Story = {
    args: {
        label: "Favorite foods",
        defaultValue: ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"],
        data,
    },
};
