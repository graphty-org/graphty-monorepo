import { Box, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { InfoCircle, PANEL_GRID, PANEL_INK } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Imported from "../../../src", the package's published entry point, so the stories exercise the
// exports a consumer installs.

// On the docs page every story renders in its own iframe (docs.story.inline false). Inline, a
// story sits inside Storybook's zoom wrapper, which carries a CSS transform, and a transformed
// ancestor moves the panels' position: fixed box, so open panels drew away from their triggers.

/**
 * A circled `i` placed right after a name, which shows an explanation of that name on hover,
 * focus or tap.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `InfoCircle` | An explanation the reader asks for: what a method, a threshold or a technical word means. It stays open while the pointer or focus is on it, and holds a sentence or two |
 * | Mantine `Tooltip` | The name of an icon button, or its shortcut: a word or two that appears after a delay and never holds anything to read at length |
 * | Text on the panel | The plain-language reading of a result. That must stay visible, not hide behind a circle |
 *
 * Put it immediately after the name it explains, before any status pill. Never use it for an
 * explanation that repeats something already on the same screen: delete that one instead.
 *
 * ## Usage
 *
 * ```tsx
 * import { InfoCircle } from "@graphty/compact-mantine";
 *
 * <Group gap={4}>
 *     <Text size="xs">Resolution</Text>
 *     <InfoCircle label="Resolution">
 *         Higher resolution finds more, smaller communities.
 *     </InfoCircle>
 * </Group>
 * ```
 *
 * It needs no `PopoutManager` of its own: it uses the one above it, or brings one when there is
 * none. Pass `opened` and `onOpenChange` to drive it from your own state.
 *
 * ## Keyboard and accessibility
 *
 * - The button is reachable with Tab and opens on focus, so the explanation never needs a
 *   pointer. It closes when focus or the pointer leaves, on Escape, on a second tap, and on a
 *   click elsewhere.
 * - It follows the disclosure pattern: the button is named "About" and the `label` ("About
 *   Resolution"; the `about` label, translatable through `LabelsProvider`) and, while open, the
 *   bubble is its `aria-describedby`, so a screen reader reads the name and then the explanation.
 * - Opening it never moves focus and never closes a pop-out the reader is working in.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Trigger | 24 x 24 ghost icon button, 12px info glyph, secondary text color |
 * | Bubble | the light popover shell, 240px wide, radius 13px, elevation 400, no border |
 * | Text | 11/16 weight 450, `--cm-text-secondary` |
 * | Gap | 4px between the circle and the bubble |
 */
const meta: Meta<typeof InfoCircle> = {
    title: "Components/Overlays/InfoCircle",
    component: InfoCircle,
    parameters: {
        layout: "padded",
        docs: { story: { inline: false, height: "240px" } },
    },
    decorators: [
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof InfoCircle>;

/** The resting circle. Hover it, tap it, or tab to it. */
export const Default: Story = {
    args: {
        label: "Betweenness centrality",
        children: "How often a node sits on the shortest path between two others. High values mark bridges.",
    },
};

/** Closed and open, light and dark side by side. The open bubble renders in place. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => (
        <Stack gap={16} style={{ minHeight: 140 }}>
            <Group gap={PANEL_GRID.TRIPLE_GAP} wrap="nowrap">
                <Text size="xs" fw={500} c={PANEL_INK.VALUE}>
                    Closed
                </Text>
                <InfoCircle label="Closed">Not shown until asked for.</InfoCircle>
            </Group>
            <Group gap={PANEL_GRID.TRIPLE_GAP} wrap="nowrap">
                <Text size="xs" fw={500} c={PANEL_INK.VALUE}>
                    Resolution
                </Text>
                <InfoCircle label="Resolution" defaultOpened>
                    Higher resolution finds more, smaller communities.
                </InfoCircle>
            </Group>
        </Stack>
    ),
};

/** Where it lives: immediately after the name it explains, in a section header row. */
export const InASectionHeader: Story = {
    render: (): React.JSX.Element => (
        <Group gap={PANEL_GRID.TRIPLE_GAP} h={PANEL_GRID.SECTION_HEADER} wrap="nowrap">
            <Text size="xs" fw={500} c={PANEL_INK.VALUE}>
                Communities
            </Text>
            <InfoCircle label="Communities">
                Groups of nodes that are more connected to each other than to the rest of the graph.
            </InfoCircle>
        </Group>
    ),
};

/** A longer explanation. The bubble is 240px wide and the text wraps; there is no second size. */
export const LongExplanation: Story = {
    args: {
        label: "Resolution",
        children:
            "Higher resolution finds more, smaller communities; lower resolution finds fewer, larger ones. The default of 1.0 is the standard modularity setting.",
    },
};

/**
 * Driven from the page's own state, with `opened` and `onOpenChange`: open an explanation from
 * somewhere else (a first-run tour, say), or record that someone read it.
 */
export const Controlled: Story = {
    render: function ControlledRender(): React.JSX.Element {
        const [opened, setOpened] = React.useState(false);

        return (
            <Group gap={PANEL_GRID.TRIPLE_GAP}>
                <Text size="xs" fw={500} c={PANEL_INK.VALUE}>
                    Resolution
                </Text>
                <InfoCircle label="Resolution" opened={opened} onOpenChange={setOpened}>
                    Higher resolution finds more, smaller communities; lower resolution finds fewer, larger
                    ones.
                </InfoCircle>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    {opened ? "explanation open" : "explanation closed"}
                </Text>
            </Group>
        );
    },
};
