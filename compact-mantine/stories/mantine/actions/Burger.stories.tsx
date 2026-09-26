import { Burger } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Burger`, redrawn on the panel's icon color so it matches the other glyphs. Figma has
 * no burger, so only the color and line weight change. Every prop is Mantine's: see
 * [Burger on mantine.dev](https://mantine.dev/core/burger/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Burger } from "@mantine/core";
 *
 * <Burger opened={opened} onClick={toggle} aria-label="Toggle navigation" />
 * ```
 *
 * A native button: give it an `aria-label`. Keyboard focus draws the 1px ring.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 18px |
 * | Lines | 1.5px, `--cm-icon` |
 */
const meta: Meta<typeof Burger> = {
    title: "Themed Mantine/Actions/Burger",
    component: Burger,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Burger>;

/** A closed burger; toggle `opened` in Controls. */
export const Default: Story = {
    args: {
        opened: false,
        "aria-label": "Toggle navigation",
    },
};

/** Closed, opened and keyboard focus, light and dark side by side. Keyboard focus is on the marked burger. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                ["closed", <Burger aria-label="Open menu" />],
                ["opened", <Burger aria-label="Close menu" opened />],
                ["focus", <Burger aria-label="Open menu" data-story-focus />],
            ]}
        />
    ),
    play: async (context) => {
        await focusMarked(context);
        await expectStatesApply(context.canvasElement);
    },
};
