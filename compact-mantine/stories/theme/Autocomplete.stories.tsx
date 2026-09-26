import { Autocomplete } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof Autocomplete> = {
    title: "Compact Theme/Mantine Components/Autocomplete",
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

/**
 * Every state side by side (design/figma-spec.md 6): rest, hover and focus (forced with
 * data-state), disabled, invalid, the outlined variant and the label. Switch light / dark and the
 * contrast mode in the toolbar.
 */
export const States: Story = {
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
