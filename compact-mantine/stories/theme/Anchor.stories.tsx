import { Anchor } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Anchor> = {
    title: "Compact Theme/Mantine Components/Anchor",
    component: Anchor,
};

export default meta;
type Story = StoryObj<typeof Anchor>;

export const Default: Story = {
    args: {
        children: "Documentation",
        href: "#",
    },
};

/**
 * Figma's links (design/figma-spec.md 4.2): the brand link with no underline, its pressed pill,
 * and the secondary link (`variant="secondary"`) with its own hover fill and a 2px inner ring.
 * The play function focuses the marked link.
 */
export const States: Story = {
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
    play: focusMarked,
};
