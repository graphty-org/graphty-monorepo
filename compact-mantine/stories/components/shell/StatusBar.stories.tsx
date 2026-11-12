import { Badge, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StatusBar } from "../../../src";

/**
 * The status bar: a 24px row along the bottom of the window, with a start and an end slot, for
 * state the reader reads but does not act on -- saved, offline, counts.
 *
 * ## Usage
 *
 * ```tsx
 * import { StatusBar } from "@graphty/compact-mantine";
 *
 * <StatusBar left={<span role="status">Saved</span>} right={<span>Local only</span>} />
 * ```
 *
 * ## Accessibility
 *
 * The bar is not a live region: give the child whose changes should be announced its own
 * `role="status"`, so only that child is read out.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px, with a 1px top border |
 * | Padding | 0 8px |
 * | Gap between items | 8px |
 * | Text | 11/16, secondary |
 */
const meta: Meta<typeof StatusBar> = {
    title: "Components/App shell/StatusBar",
    component: StatusBar,
};

export default meta;
type Story = StoryObj<typeof StatusBar>;

/** At the bottom of a window, with a saved state at its start and a privacy chip at its end. */
export const Default: Story = {
    render: () => (
        <div style={{ width: 640, height: 200, display: "flex", flexDirection: "column", border: "1px solid #e6e6e6" }}>
            <div style={{ flex: 1 }} />
            <StatusBar
                left={
                    <Text size="xs" role="status">
                        Saved
                    </Text>
                }
                right={<Badge variant="outline">Local only</Badge>}
            />
        </div>
    ),
};
