import { MultiSelect } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof MultiSelect> = {
    title: "Compact Theme/Mantine Components/MultiSelect",
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

/**
 * Every state side by side (design/figma-spec.md 6): rest, hover and focus (forced with
 * data-state), disabled, invalid, the outlined variant and the label. Switch light / dark and the
 * contrast mode in the toolbar.
 */
export const States: Story = {
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
};
