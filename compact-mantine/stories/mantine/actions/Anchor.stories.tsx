import { Anchor } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Anchor`, themed as Figma's links: brand text with no underline, a selected-ground
 * pill while pressed, and a quieter `variant="secondary"` link with its own hover fill. Every prop
 * is Mantine's: see [Anchor on mantine.dev](https://mantine.dev/core/anchor/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Anchor } from "@mantine/core";
 *
 * <Anchor href="/docs">Learn more</Anchor>
 * <Anchor href="/drafts" variant="secondary">Drafts</Anchor>
 * ```
 *
 * A native link: Enter follows it. Keyboard focus draws the 1px ring on the pill (brand link) or a
 * 2px ring inside (secondary link).
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Text | 11/16, weight 450, `--cm-text-brand` |
 * | Pressed pill | inset -4px -8px, radius 5px, `--cm-bg-selected` |
 * | Secondary | `--cm-text-secondary`, padding 0 4px, radius 5px |
 */
const meta: Meta<typeof Anchor> = {
    title: "Themed Mantine/Actions/Anchor",
    component: Anchor,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Anchor>;

/** A brand link; use Controls to switch to the secondary variant. */
export const Default: Story = {
    args: {
        children: "Documentation",
        href: "#",
    },
};

/**
 * The brand link, its pressed pill and keyboard focus, then the secondary link at rest and on
 * hover. Light and dark side by side. Keyboard focus is on the marked link.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            hug
            cells={[
                ["link", <Anchor href="#learn">Learn more</Anchor>],
                ["pressed", <Anchor href="#learn" data-cm-state="pressed">Learn more</Anchor>],
                ["focus", <Anchor href="#learn" data-story-focus>Learn more</Anchor>],
                ["secondary", <Anchor href="#drafts" variant="secondary">Drafts</Anchor>],
                ["secondary hover", <Anchor href="#drafts" variant="secondary" data-cm-state="hover">Drafts</Anchor>],
            ]}
        />
    ),
    play: async (context) => {
        await focusMarked(context);
        await expectStatesApply(context.canvasElement);
    },
};
