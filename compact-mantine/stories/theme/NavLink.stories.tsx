import { NavLink } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Home } from "lucide-react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof NavLink> = {
    title: "Compact Theme/Mantine Components/NavLink",
    component: NavLink,
};

export default meta;
type Story = StoryObj<typeof NavLink>;

export const Default: Story = {
    args: {
        label: "Home",
        leftSection: <Home size={14} />,
    },
};

/**
 * NavLink on the tokens (design/figma-spec.md 5.9): a 32 row holding a 24 pill; hover
 * --cm-bg-hover, active --cm-bg-secondary at weight 550. The play function focuses the marked
 * link.
 */
export const States: Story = {
    render: () => (
        <div style={{ width: 240 }}>
            <StateGrid
                columns={240}
                cells={[
                    ["rest", <NavLink href="#p1" label="Page 1" />],
                    ["hover", <NavLink href="#p2" label="Page 2" data-cm-state="hover" />],
                    ["active", <NavLink href="#p3" label="Page 3" active />],
                    ["focus", <NavLink href="#p4" label="Page 4" data-story-focus />],
                    ["disabled", <NavLink href="#p5" label="Page 5" disabled />],
                ]}
            />
        </div>
    ),
    play: focusMarked,
};
