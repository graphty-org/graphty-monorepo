import { SegmentedControl } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { UiGlyph } from "../../src/icons";
import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof SegmentedControl> = {
    title: "Compact Theme/Mantine Components/SegmentedControl",
    component: SegmentedControl,
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {
    args: {
        data: ["Nap", "Eat", "Play"],
    },
};

export const ThreeOptions: Story = {
    args: {
        data: ["Nap", "Eat", "Zoom"],
        w: 200,
    },
};

export const FiveOptions: Story = {
    args: {
        data: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        w: 300,
    },
};

export const FullWidth: Story = {
    args: {
        data: ["Yes", "No", "Maybe"],
        fullWidth: true,
        w: 200,
    },
};

export const Disabled: Story = {
    args: {
        data: ["A", "B"],
        disabled: true,
        w: 100,
    },
};

const ALIGN = [
    { value: "left", label: <UiGlyph name="alignLeft" /> },
    { value: "center", label: <UiGlyph name="alignCenterH" /> },
    { value: "right", label: <UiGlyph name="alignRight" /> },
];

const MODES = [
    { value: "draw", label: <UiGlyph name="rectangle" /> },
    { value: "design", label: <UiGlyph name="frame" /> },
    { value: "motion", label: <UiGlyph name="rotate" /> },
    { value: "dev", label: <UiGlyph name="text" /> },
];

/**
 * Every look and state of the segmented control (design/figma-spec.md 5.2, 5.3): the panel
 * track (the default, 88 or 184 wide, the checked option a white face with an inset edge, no
 * hover fill), the toolbar mode switch (`variant="toolbar"`, a raised thumb) and the loose
 * paint-type row (`variant="loose"`). Options activate on mouse-down. The play function
 * focuses the marked group so its ring shows.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            hug
            columns={200}
            cells={[
                ["panel, icons, 88", <SegmentedControl w={88} data={ALIGN} />],
                ["panel, icons, 184", <SegmentedControl w={184} data={[...ALIGN, { value: "justify", label: <UiGlyph name="more" /> }]} />],
                ["panel, text", <SegmentedControl data={["Basic", "Dynamic", "Brush"]} />],
                ["panel, focus", <div data-story-focus><SegmentedControl w={88} data={ALIGN} defaultValue="center" /></div>],
                ["panel, disabled", <SegmentedControl w={88} data={ALIGN} disabled />],
                ["panel, read-only", <SegmentedControl w={88} data={ALIGN} readOnly />],
                ["toolbar", <SegmentedControl variant="toolbar" data={MODES} defaultValue="design" />],
                ["loose", <SegmentedControl variant="loose" data={ALIGN} />],
            ]}
        />
    ),
    play: focusMarked,
};
