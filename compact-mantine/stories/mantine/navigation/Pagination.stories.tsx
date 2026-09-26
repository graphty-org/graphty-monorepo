import { Pagination } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Pagination`, redrawn on the panel tokens: its controls are 24px ghost buttons and the
 * current page takes the secondary ground. Figma has no pagination, so only the look changes.
 * Every prop is Mantine's: see [Pagination on mantine.dev](https://mantine.dev/core/pagination/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Pagination } from "@mantine/core";
 *
 * <Pagination total={pages} value={page} onChange={setPage} />
 * ```
 *
 * Every control is a native button; the current page carries `aria-current="page"`. Keyboard focus
 * draws the 1px ring.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Control | 24px ghost button, radius 5px |
 * | Current page | `--cm-bg-secondary`, weight 550 |
 */
const meta: Meta<typeof Pagination> = {
    title: "Themed Mantine/Navigation/Pagination",
    component: Pagination,
    tags: ["autodocs"],
    args: {
        total: 10,
    },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

/** Ten pages starting at the first; use Controls to change `total` or `siblings`. */
export const Default: Story = {
    args: {
        defaultValue: 1,
    },
};

/** Rest, keyboard focus and disabled, light and dark side by side. Keyboard focus is on the marked control. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
