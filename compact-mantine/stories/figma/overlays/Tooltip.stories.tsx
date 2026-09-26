import { ActionIcon, Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { TooltipShortcut } from "../../../src/components/overlays/TooltipShortcut";
import { UiGlyph } from "../../../src/icons";

/**
 * Figma's tooltip (design/figma-spec.md 8.3): #1e1e1e in both themes, 24 tall, padding 4 8,
 * radius 5, 11/16 450 white, max 180 wide, an arrow 6px long, shown 6px below its trigger. It
 * opens after 1000 ms, hides 300 ms after the pointer leaves, and inside a `Tooltip.Group` the
 * next tooltip opens at once while one is showing. It keeps `aria-describedby`.
 */
const meta: Meta = {
    title: "Figma/Overlays/Tooltip",
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function Trigger({ label }: { label: string }): React.JSX.Element {
    return (
        <ActionIcon variant="subtle" aria-label={label}>
            <UiGlyph name="alignLeft" size={12} />
        </ActionIcon>
    );
}

/**
 * Every look side by side, held open: below (the default), above, beside, with a shortcut, and
 * a long label wrapping at 180px.
 */
export const States: Story = {
    render: () => (
        <Group gap={120} align="flex-start" style={{ padding: "60px 40px 120px" }}>
            <Stack align="center" gap={60}>
                <Text size="sm" c="dimmed">
                    below (default)
                </Text>
                <Tooltip label="Align left" opened>
                    <span>
                        <Trigger label="Align left" />
                    </span>
                </Tooltip>
            </Stack>
            <Stack align="center" gap={60}>
                <Text size="sm" c="dimmed">
                    with shortcut
                </Text>
                <Tooltip label={<TooltipShortcut label="Align left" shortcut="Alt+A" />} opened>
                    <span>
                        <Trigger label="Align left with shortcut" />
                    </span>
                </Tooltip>
            </Stack>
            <Stack align="center" gap={60}>
                <Text size="sm" c="dimmed">
                    above
                </Text>
                <Box style={{ height: 32 }} />
                <Tooltip label="Frame" position="top" opened>
                    <span>
                        <Trigger label="Frame" />
                    </span>
                </Tooltip>
            </Stack>
            <Stack align="center" gap={60}>
                <Text size="sm" c="dimmed">
                    beside
                </Text>
                <Tooltip label="Assets" position="right" opened>
                    <span>
                        <Trigger label="Assets" />
                    </span>
                </Tooltip>
            </Stack>
            <Stack align="center" gap={60}>
                <Text size="sm" c="dimmed">
                    two lines
                </Text>
                <Tooltip label="Variable names must be unique within a collection" opened>
                    <span>
                        <Trigger label="Long label" />
                    </span>
                </Tooltip>
            </Stack>
        </Group>
    ),
};

/**
 * The live timing, inside one `Tooltip.Group` as an application shell would have it: hover one
 * button and wait a second; then slide to its neighbours and each tooltip follows at once.
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const first = canvas.getByRole("button", { name: "Align left" });
        await userEvent.hover(first);
        await waitFor(() => expect(within(document.body).getByRole("tooltip")).toBeVisible(), { timeout: 2000 });
        await userEvent.hover(canvas.getByRole("button", { name: "Align right" }));
        await waitFor(() => expect(within(document.body).getByRole("tooltip")).toHaveTextContent("Align right"));
    },
};
