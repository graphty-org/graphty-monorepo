import { NativeSelect, Select } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof Select> = {
    title: "Compact Theme/Mantine Components/Select",
    component: Select,
    args: {
        data: ["Sleepy", "Hungry", "Chaotic", "Zoomies"],
    },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
    args: {
        placeholder: "Select mood",
    },
};

export const Searchable: Story = {
    args: {
        label: "Searchable",
        placeholder: "Search...",
        data: ["Cats", "Dogs", "Hamsters"],
        searchable: true,
        w: 200,
    },
};

export const Clearable: Story = {
    args: {
        placeholder: "Clearable",
        data: ["Cats", "Dogs"],
        clearable: true,
        defaultValue: "Cats",
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

export const Native: Story = {
    render: () => <NativeSelect data={["Native", "Select"]} w={200} />,
};

/**
 * The trigger's states side by side (design/figma-spec.md 6.4): the outlined trigger does not
 * change on hover and rings on keyboard focus only. Switch light / dark and the contrast mode in
 * the toolbar; the open list is in Figma/Inputs/Select and listbox.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <Select aria-label="Align" data={["Center", "Inside"]} defaultValue="Inside" w={88} /> },
                { state: "hover", node: <Select aria-label="Align" data={["Center", "Inside"]} defaultValue="Inside" w={88} data-state="hover" /> },
                { state: "focus", node: <Select aria-label="Align" data={["Center", "Inside"]} defaultValue="Inside" w={88} data-state="focus" /> },
                { state: "disabled", node: <Select aria-label="Align" data={["Center", "Inside"]} defaultValue="Inside" w={88} disabled /> },
                { state: "invalid", node: <Select aria-label="Align" data={["Center", "Inside"]} defaultValue="Inside" w={88} error /> },
                { state: "filled", node: <Select aria-label="Align" data={["Center", "Inside"]} defaultValue="Inside" w={88} variant="filled" /> },
                { state: "native", node: <NativeSelect aria-label="Align" data={["Center", "Inside"]} w={88} /> },
            ]}
        />
    ),
};
