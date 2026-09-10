import { Box, Group, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { InfoCircle, PANEL_GRID, PANEL_INK } from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise the exports a consumer installs.

/**
 * The circled `i`: an explanation, one hover or tap away.
 *
 * **Purpose:** Holds the explanation that would otherwise become a sentence of
 * its own on a dense panel. A 12px circled `i` in a 14px box, in secondary
 * text, opening a 250px bubble under the thing it explains.
 *
 * **When to use:**
 * - Immediately after the name it explains, before any status pill
 * - For the explanation of a method, a threshold, or a technical word
 * - Never for the plain-language reading of a result: that belongs on the
 *   panel, where it stays visible
 * - Never for an explanation that restates something already on the same
 *   screen: delete that one instead of moving it here
 *
 * **Key features:**
 * - Opens on hover, on tap and on focus, so it is reachable from the keyboard
 * - Closes when the pointer leaves, on Escape, and when something else on the
 *   page is clicked -- the same rules as every other floating panel here
 * - The bubble is the button's `aria-describedby`, so a screen reader reads
 *   "About <name>" and then the explanation
 */
const meta: Meta<typeof InfoCircle> = {
    title: "Floating Panels/InfoCircle",
    component: InfoCircle,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof InfoCircle>;

/**
 * The resting circle. Hover it, tap it, or tab to it.
 */
export const Default: Story = {
    args: {
        label: "Betweenness centrality",
        children: "How often a node sits on the shortest path between two others. High values mark bridges.",
    },
};

/**
 * Where it actually lives: immediately after the name it explains, in a section
 * header row.
 */
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

/**
 * A longer explanation. The bubble is 250px wide and the prose wraps inside it;
 * there is no second bubble size.
 */
export const LongExplanation: Story = {
    args: {
        label: "Resolution",
        children:
            "Higher resolution finds more, smaller communities; lower resolution finds fewer, larger ones. The default of 1.0 is the standard modularity setting.",
    },
};

/**
 * Driven from the page's own state, with `opened` and `onOpenChange`. Use it to
 * open an explanation from somewhere else -- a first-run tour, say -- or to
 * record that someone read it.
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
                    Higher resolution finds more, smaller communities; lower resolution finds
                    fewer, larger ones.
                </InfoCircle>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    {opened ? "explanation open" : "explanation closed"}
                </Text>
            </Group>
        );
    },
};
