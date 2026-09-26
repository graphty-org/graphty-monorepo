import { Switch } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Switch`, themed as Figma's switch: a 32 x 16 track with a 12 x 8 pill knob, and a
 * mixed state (`data-indeterminate`). Every prop is Mantine's: see
 * [Switch on mantine.dev](https://mantine.dev/core/switch/).
 *
 * In a panel, prefer `ToggleRow` (Components/Selection), which lays a switch or checkbox out on the
 * 32px row grid. Use the bare Switch for a setting that takes effect at once in a dialog or table.
 *
 * ## Usage
 *
 * ```tsx
 * import { Switch } from "@mantine/core";
 *
 * <Switch label="Snap to grid" checked={snap} onChange={(e) => setSnap(e.currentTarget.checked)} />
 * ```
 *
 * A native checkbox with `role="switch"`: Space toggles it. Keyboard focus draws the ring on the
 * track.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Track | 32 x 16, fully round; hit area 32 x 24 |
 * | Knob | 12 x 8 pill, 4px from the start when off, 16px when on |
 * | Label | 11/16, weight 450, 8px after |
 */
const meta: Meta<typeof Switch> = {
    title: "Themed Mantine/Selection/Switch",
    component: Switch,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Switch>;

/** A labelled switch; use Controls to try `checked` and `disabled`. */
export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

/**
 * Off, on and mixed, each at rest, hovered and pressed (forced with `data-cm-state`), then focus
 * and disabled. Light and dark side by side. Keyboard focus is on the marked switch.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
