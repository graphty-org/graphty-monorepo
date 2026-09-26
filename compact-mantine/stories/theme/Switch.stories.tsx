import { Switch } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Switch> = {
    title: "Compact Theme/Mantine Components/Switch",
    component: Switch,
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

export const Off: Story = {
    args: {
        label: "Off",
    },
};

export const On: Story = {
    args: {
        label: "On",
        defaultChecked: true,
    },
};

export const DisabledOff: Story = {
    args: {
        label: "Disabled Off",
        disabled: true,
    },
};

export const DisabledOn: Story = {
    args: {
        label: "Disabled On",
        defaultChecked: true,
        disabled: true,
    },
};

/**
 * Every state of Figma's switch (design/figma-spec.md 5.5): the 32 x 16 track with a 12 x 8
 * pill knob. Mixed is `data-indeterminate` on the Switch (it lands on the input). Hover and
 * pressed are forced with `data-cm-state`; the play function focuses the marked cell.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                ["off", <Switch label="False" />],
                ["off hover", <Switch label="False" data-cm-state="hover" />],
                ["off pressed", <Switch label="False" data-cm-state="pressed" />],
                ["on", <Switch label="True" defaultChecked />],
                ["on hover", <Switch label="True" defaultChecked data-cm-state="hover" />],
                ["on pressed", <Switch label="True" defaultChecked data-cm-state="pressed" />],
                ["mixed", <Switch label="Mixed" data-indeterminate />],
                ["focus", <Switch label="True" defaultChecked data-story-focus />],
                ["disabled off", <Switch label="False" disabled />],
                ["disabled on", <Switch label="True" disabled defaultChecked />],
                ["disabled mixed", <Switch label="Mixed" disabled data-indeterminate />],
            ]}
        />
    ),
    play: focusMarked,
};
