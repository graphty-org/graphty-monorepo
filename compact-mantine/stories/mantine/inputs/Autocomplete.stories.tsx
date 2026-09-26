import { Autocomplete } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Autocomplete`, themed as Figma's filled field, with the dark list box (the one on the
 * Components/Inputs/Select page) opening 4px below it. Every prop is Mantine's: see
 * [Autocomplete on mantine.dev](https://mantine.dev/core/autocomplete/).
 *
 * Reach for Autocomplete when the reader types free text and suggestions help. For a fixed set of
 * choices use `Select`; for a value that is either typed or picked from a list, `ComboInput`
 * (both in Components/Inputs).
 *
 * ## Usage
 *
 * ```tsx
 * import { Autocomplete } from "@mantine/core";
 *
 * <Autocomplete label="Frame" data={["Frame 1", "Frame 2"]} w={184} />
 * ```
 *
 * The input has `role="combobox"`: query it with `getByRole("combobox")`. ArrowDown opens the
 * list and moves the highlight, Enter picks, Escape closes.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 24px tall, radius 5px, 11/16 text inset 8px |
 * | List | dark in both schemes, opens below with a 4px offset |
 */
const meta: Meta<typeof Autocomplete> = {
    title: "Themed Mantine/Inputs/Autocomplete",
    component: Autocomplete,
    tags: ["autodocs"],
    args: {
        data: ["Pizza", "Tacos", "Sushi", "Burgers", "Pasta"],
    },
};

export default meta;
type Story = StoryObj<typeof Autocomplete>;

/** A labeled field; type to filter the suggestions. */
export const Default: Story = {
    args: {
        label: "Food",
        placeholder: "Search foods...",
        w: 184,
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
                { state: "rest", node: <Autocomplete aria-label="Autocomplete" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} /> },
                { state: "hover", node: <Autocomplete aria-label="Autocomplete" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} data-state="hover" /> },
                { state: "focus", node: <Autocomplete aria-label="Autocomplete" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} data-state="focus" /> },
                { state: "disabled", node: <Autocomplete aria-label="Autocomplete" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} disabled /> },
                { state: "invalid", node: <Autocomplete aria-label="Autocomplete" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} error /> },
                { state: "outlined", node: <Autocomplete aria-label="Autocomplete" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} variant="outlined" /> },
                { state: "with label", node: <Autocomplete label="Label" data={["Frame 1", "Frame 2"]} defaultValue="Frame 1" w={184} /> },
            ]}
        />
    ),
};
