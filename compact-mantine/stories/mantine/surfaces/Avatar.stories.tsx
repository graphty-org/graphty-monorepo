import { Avatar, Group, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Avatar`, themed as the avatars in Figma's header: 24px circles with a white initial
 * on the user's colour, and a ringed, overlapping stack in `Avatar.Group`. Every prop is Mantine's:
 * see [Avatar on mantine.dev](https://mantine.dev/core/avatar/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Avatar } from "@mantine/core";
 *
 * <Avatar.Group>
 *     {people.map((p) => <Avatar key={p.id} color={p.color} alt={p.name}>{p.initial}</Avatar>)}
 * </Avatar.Group>
 * ```
 *
 * Give each avatar an `alt` with the person's name; an initial alone does not say who it is.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Avatar | 24 x 24, round, 12/24 initial |
 * | Stack | 2px `--cm-bg` ring on each, 21px step (3px overlap) |
 */
const meta: Meta<typeof Avatar> = {
    title: "Themed Mantine/Surfaces/Avatar",
    component: Avatar,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

/** One avatar; change `color` or the initial in Controls. */
export const Default: Story = {
    args: {
        children: "A",
        color: "pink",
        alt: "Ada",
    },
};

/** A single avatar and a stack of three, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={16}>
            <Avatar color="pink">A</Avatar>
            <Avatar.Group>
                <Avatar color="pink">A</Avatar>
                <Avatar color="teal">B</Avatar>
                <Avatar color="orange">C</Avatar>
            </Avatar.Group>
            <Text size="xs">single / stack</Text>
        </Group>
    ),
};
