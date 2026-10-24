import { Box, Group, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { EntityChip, PANEL_GRID } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A node or edge chip: a fixed color and icon for the kind, then a count or a name. A node is
 * always a blue circle and an edge always an orange segment, wherever a count or a name of
 * nodes or edges appears, so the reader tells them apart without reading a word.
 *
 * ## Usage
 *
 * ```tsx
 * import { EntityChip } from "@graphty/compact-mantine";
 *
 * <EntityChip kind="node">60</EntityChip>
 * <EntityChip kind="edge">120</EntityChip>
 * <EntityChip kind="node" onClick={openFilters}>140 of 900</EntityChip>
 * ```
 *
 * The chip does no formatting: format a number for the reader's locale first.
 *
 * ## Keyboard and accessibility
 *
 * - The kind is spoken before the content ("Node 60"), from the `entityNode` and `entityEdge`
 *   labels; the icon itself is hidden from assistive technology.
 * - Without `onClick` it is a `span` and takes no focus; with it, a `button`.
 * - Icon colors (`--cm-entity-node`, `--cm-entity-edge`) are 3:1 or more on the panel and the
 *   chip's own tint in both schemes.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 20px |
 * | Radius | 10px |
 * | Icon | 12px |
 * | Fill | the kind's color at 12% |
 */
const meta: Meta<typeof EntityChip> = {
    title: "Components/Data display/EntityChip",
    component: EntityChip,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    decorators: [
        (Story): React.JSX.Element => (
            <Box w={PANEL_GRID.WIDTH} py="md" px={PANEL_GRID.PAD_LEFT} bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof EntityChip>;

/** One chip. Edit its kind and content in the Controls table. */
export const Default: Story = {
    args: { kind: "node", children: "60" },
};

/** Counts and names of both kinds, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={8}>
            <Group gap={8}>
                <EntityChip kind="node">60</EntityChip>
                <EntityChip kind="edge">120</EntityChip>
            </Group>
            <Group gap={8}>
                <EntityChip kind="node">TP53</EntityChip>
                <EntityChip kind="edge">TP53 - MDM2</EntityChip>
            </Group>
            <Group gap={8}>
                <EntityChip kind="node" onClick={() => undefined}>
                    140 of 900
                </EntityChip>
                <EntityChip kind="edge" onClick={() => undefined}>
                    210 of 1,400
                </EntityChip>
            </Group>
        </Stack>
    ),
};
