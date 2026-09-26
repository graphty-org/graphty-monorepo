import { Group, Radio } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Radio`, themed on the checkbox's colors: Figma's chrome has no free-standing radio,
 * so it wears the checkbox look with a 6px white dot when checked. Every prop is Mantine's: see
 * [Radio on mantine.dev](https://mantine.dev/core/radio/).
 *
 * In a panel, a choice of two to six options usually reads better as a `SegmentedControl`; use
 * radios in dialogs and forms.
 *
 * ## Usage
 *
 * ```tsx
 * import { Group, Radio } from "@mantine/core";
 *
 * <Radio.Group name="scale" label="Scale" value={scale} onChange={setScale}>
 *     <Group gap="md">
 *         <Radio value="linear" label="Linear" />
 *         <Radio value="log" label="Log" />
 *     </Group>
 * </Radio.Group>
 * ```
 *
 * Native radios: Tab enters the group at the checked radio, the arrow keys move the selection.
 * Keyboard focus draws a 1px ring outside the circle.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Circle | 16 x 16, 1px `--cm-border-translucent-strong` edge |
 * | Checked | `--cm-bg-brand` with a 6px white dot |
 * | Label | 11/16, weight 450, 8px after |
 */
const meta: Meta<typeof Radio> = {
    title: "Themed Mantine/Selection/Radio",
    component: Radio,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Radio>;

/** One labeled radio; use Controls to try `checked` and `disabled`. */
export const Default: Story = {
    args: {
        label: "Option A",
        value: "a",
    },
};

/**
 * Off and on at rest, hovered and pressed (forced with `data-cm-state`), then focus and disabled.
 * Light and dark side by side. Keyboard focus is on the marked radio.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                ["off", <Radio label="Solid" value="a" />],
                ["off hover", <Radio label="Solid" value="a" data-cm-state="hover" />],
                ["off pressed", <Radio label="Solid" value="a" data-cm-state="pressed" />],
                ["on", <Radio label="Solid" value="a" defaultChecked />],
                ["on pressed", <Radio label="Solid" value="a" defaultChecked data-cm-state="pressed" />],
                ["focus", <Radio label="Solid" value="a" defaultChecked data-story-focus />],
                ["disabled", <Radio label="Solid" value="a" disabled />],
                ["disabled on", <Radio label="Solid" value="a" disabled defaultChecked />],
            ]}
        />
    ),
    play: focusMarked,
};

/** A `Radio.Group`: one choice among three. */
export const RadioGroup: Story = {
    render: () => (
        <Radio.Group name="stroke-align" defaultValue="center" label="Stroke align">
            <Group gap="md">
                <Radio value="center" label="Center" />
                <Radio value="inside" label="Inside" />
                <Radio value="outside" label="Outside" />
            </Group>
        </Radio.Group>
    ),
};
