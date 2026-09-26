import { Pagination } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Pagination> = {
    title: "Compact Theme/Mantine Components/Pagination",
    component: Pagination,
    args: {
        total: 10,
    },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    args: {
        defaultValue: 1,
    },
};

/**
 * Pagination on the tokens (design/figma-spec.md 5.9): ghost 24 controls, the active page
 * --cm-bg-secondary at weight 550. The play function focuses the marked control.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            columns={260}
            cells={[
                ["rest", <Pagination total={5} />],
                ["focus", <div data-story-focus><Pagination total={5} defaultValue={2} /></div>],
                ["disabled", <Pagination total={5} disabled />],
            ]}
        />
    ),
    play: focusMarked,
};
