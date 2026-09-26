import { Divider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryPanel, StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * Mantine's `Divider`, drawn in Figma's divider colour, `--cm-border` (#e6e6e6 light, #444 dark).
 * A `color` prop still wins. Every prop is Mantine's: see
 * [Divider on mantine.dev](https://mantine.dev/core/divider/).
 *
 * Between panel sections you do not need one: `ControlSection` draws its own bottom border.
 *
 * ## Usage
 *
 * ```tsx
 * import { Divider } from "@mantine/core";
 *
 * <Divider />
 * <Divider orientation="vertical" />
 * ```
 *
 * A `role="separator"`; it takes no focus.
 *
 * ## Measurements
 *
 * | Where | Style |
 * |---|---|
 * | Between sections | 1px `--cm-border`, full panel width |
 * | Toolbar | 1 x 48 (secondary bar 1 x 40) `--cm-border` |
 * | Dark menu | 1px `--cm-border-translucent`, 8px above and below |
 */
const meta: Meta<typeof Divider> = {
    title: "Themed Mantine/Surfaces/Divider",
    component: Divider,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Divider>;

/** A horizontal divider in a 240px panel; switch `orientation` in Controls. */
export const Default: Story = {
    args: { orientation: "horizontal" },
    render: (args) => (
        <StoryPanel padded>
            <Stack gap={8} py={8} h={args.orientation === "vertical" ? 40 : undefined} style={{ flexDirection: args.orientation === "vertical" ? "row" : "column" }}>
                <Divider {...args} />
            </Stack>
        </StoryPanel>
    ),
};

/** Horizontal and vertical, in the panel. Light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Horizontal" padded>
                <Stack gap={8} py={8}>
                    <Divider />
                </Stack>
            </StoryState>
            <StoryState name="Vertical" padded>
                <Stack h={40} py={8} style={{ flexDirection: "row" }}>
                    <Divider orientation="vertical" />
                </Stack>
            </StoryState>
        </StoryStates>
    ),
};
