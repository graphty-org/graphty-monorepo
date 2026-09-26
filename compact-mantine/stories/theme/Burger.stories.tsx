import { Burger } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Burger> = {
    title: "Compact Theme/Mantine Components/Burger",
    component: Burger,
};

export default meta;
type Story = StoryObj<typeof Burger>;

export const Default: Story = {
    args: {
        opened: false,
        "aria-label": "Toggle navigation",
    },
};

/**
 * Burger on the tokens (design/figma-spec.md 5.9): an 18 box with 1.5px lines in --cm-icon.
 * The play function focuses the marked burger.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                ["closed", <Burger aria-label="Open menu" />],
                ["opened", <Burger aria-label="Close menu" opened />],
                ["focus", <Burger aria-label="Open menu" data-story-focus />],
            ]}
        />
    ),
    play: focusMarked,
};
