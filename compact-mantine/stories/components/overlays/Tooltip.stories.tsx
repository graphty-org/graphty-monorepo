import { ActionIcon, Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { TooltipShortcut, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Demo stories carry no play function; the assertions live on the `*Interactions` twin, hidden
// from the sidebar and the docs page and still run by the test runner and Chromatic.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

/**
 * The dark tooltip: Mantine's `Tooltip`, themed, plus `TooltipShortcut`, a tooltip label with the
 * control's keyboard shortcut on the same line.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | Mantine `Tooltip` | The name of an icon-only control, shown after a delay on hover or focus. A word or two, never something the reader must read at length |
 * | `TooltipShortcut` | As the tooltip's `label` when the control has a keyboard shortcut ("Align left  Alt+A") |
 * | `InfoCircle` | An explanation the reader asks for, which stays open while they read it |
 *
 * ## Usage
 *
 * ```tsx
 * import { ActionIcon, Tooltip } from "@mantine/core";
 * import { TooltipShortcut, UiGlyph } from "@graphty/compact-mantine";
 *
 * // Once, around the whole app, for Figma's warm hand-off between tooltips:
 * <Tooltip.Group>
 *     <App />
 * </Tooltip.Group>
 *
 * <Tooltip label={<TooltipShortcut label="Align left" shortcut="Alt+A" />}>
 *     <ActionIcon aria-label="Align left"><UiGlyph name="alignLeft" /></ActionIcon>
 * </Tooltip>
 * ```
 *
 * The theme sets the timing (`openDelay` 1000ms, `closeDelay` 300ms, no transition) on `Tooltip`
 * and on `Tooltip.Group`, so a bare `<Tooltip.Group>` is right. Wrap the app once and do not nest
 * another group inside it: a nested group breaks the hand-off.
 *
 * ## Keyboard and accessibility
 *
 * - Keyboard focus shows the tooltip after the same delay as hover; pointer-down, any key and
 *   the wheel dismiss it at once.
 * - The tooltip is the trigger's `aria-describedby` (Mantine wires it), and it is
 *   `pointer-events: none`. With a TooltipShortcut, both the label and the shortcut are read.
 * - The tooltip never names the control on its own: give an icon button its own `aria-label`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Bubble | `#1e1e1e` in both schemes, 24px tall for one line (40 for two), padding 4px 8px, radius 5px, max width 180px |
 * | Text | 11/16 weight 450, white |
 * | Shortcut | 12px after the label, `#ffffffb2` |
 * | Arrow | 14 x 7 below, 12 x 6 above, 6 x 12 beside; the bubble sits 6px from its trigger |
 * | Placement | below by default, flipping above when there is no room, clamped 6px inside the window |
 */
const meta: Meta<typeof TooltipShortcut> = {
    title: "Components/Overlays/Tooltip",
    component: TooltipShortcut,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TooltipShortcut>;

function Trigger({ label }: { label: string }): React.JSX.Element {
    return (
        <ActionIcon variant="subtle" aria-label={label}>
            <UiGlyph name="alignLeft" size={12} />
        </ActionIcon>
    );
}

/** A tooltip with a shortcut, held open under its button. Edit the label and shortcut in Controls. */
export const Default: Story = {
    args: {
        label: "Align left",
        shortcut: "Alt+A",
    },
    render: (args) => (
        <Box style={{ padding: "8px 40px 48px" }}>
            <Tooltip label={<TooltipShortcut {...args} />} opened withinPortal={false}>
                <span>
                    <Trigger label="Align left" />
                </span>
            </Tooltip>
        </Box>
    ),
};

/**
 * One held-open tooltip in a labeled cell, rendered in place.
 * @param props - the caption and the tooltip
 * @param props.caption - what the cell shows
 * @param props.children - the tooltip and its trigger
 * @returns the cell
 */
function Cell({ caption, children }: { caption: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Stack align="center" gap={48} style={{ minWidth: 96 }}>
            <Text size="sm" c="dimmed">
                {caption}
            </Text>
            {children}
        </Stack>
    );
}

/**
 * Every look, light and dark side by side (the bubble stays dark in both): below (the default),
 * with a shortcut, above, beside, and a long label wrapping at 180px.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={32} align="flex-start" wrap="nowrap" style={{ padding: "0 24px 72px" }}>
            <Cell caption="below (default)">
                <Tooltip label="Align left" opened withinPortal={false}>
                    <span>
                        <Trigger label="Align left" />
                    </span>
                </Tooltip>
            </Cell>
            <Cell caption="with shortcut">
                <Tooltip label={<TooltipShortcut label="Align left" shortcut="Alt+A" />} opened withinPortal={false}>
                    <span>
                        <Trigger label="Align left with shortcut" />
                    </span>
                </Tooltip>
            </Cell>
            <Cell caption="above">
                <Tooltip label="Frame" position="top" opened withinPortal={false}>
                    <span>
                        <Trigger label="Frame" />
                    </span>
                </Tooltip>
            </Cell>
            <Cell caption="beside">
                <Tooltip label="Assets" position="right" opened withinPortal={false}>
                    <span>
                        <Trigger label="Assets" />
                    </span>
                </Tooltip>
            </Cell>
            <Cell caption="two lines">
                <Tooltip label="Variable names must be unique within a collection" opened withinPortal={false}>
                    <span>
                        <Trigger label="Long label" />
                    </span>
                </Tooltip>
            </Cell>
        </Group>
    ),
};

/**
 * The live timing inside one `Tooltip.Group`, as an application shell has it: hover one button
 * and wait a second, then slide to its neighbors and each tooltip follows at once.
 */
export const WarmHandOff: Story = {
    render: () => (
        <Box style={{ padding: 40 }}>
            <Tooltip.Group>
                <Group gap={0}>
                    <Tooltip label={<TooltipShortcut label="Align left" shortcut="Alt+A" />}>
                        <ActionIcon variant="subtle" aria-label="Align left">
                            <UiGlyph name="alignLeft" size={12} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={<TooltipShortcut label="Align horizontal centers" shortcut="Alt+H" />}>
                        <ActionIcon variant="subtle" aria-label="Align horizontal centers">
                            <UiGlyph name="alignCenterH" size={12} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={<TooltipShortcut label="Align right" shortcut="Alt+D" />}>
                        <ActionIcon variant="subtle" aria-label="Align right">
                            <UiGlyph name="alignRight" size={12} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Tooltip.Group>
        </Box>
    ),
};

/** The assertions for the hand-off: the first tooltip waits, the next follows at once. */
export const WarmHandOffInteractions: Story = {
    ...WarmHandOff,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const first = canvas.getByRole("button", { name: "Align left" });
        await userEvent.hover(first);
        await waitFor(() => expect(within(document.body).getByRole("tooltip")).toBeVisible(), { timeout: 2000 });
        await userEvent.hover(canvas.getByRole("button", { name: "Align right" }));
        await waitFor(() => expect(within(document.body).getByRole("tooltip")).toHaveTextContent("Align right"));
    },
};
