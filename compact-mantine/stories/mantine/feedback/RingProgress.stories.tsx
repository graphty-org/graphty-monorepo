import { Group, RingProgress, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `RingProgress`, drawn on the panel tokens: the track in the secondary ground and the
 * label in the text color. Every prop is Mantine's: see
 * [RingProgress on mantine.dev](https://mantine.dev/core/ring-progress/).
 *
 * ## Usage
 *
 * ```tsx
 * import { RingProgress, Text } from "@mantine/core";
 *
 * <RingProgress size={48} thickness={4} sections={[{ value: 65, color: "brand" }]} label={<Text size="xs" ta="center">65</Text>} />
 * ```
 *
 * `size` and `thickness` are numbers: the ring is an SVG and uses them directly. Use `size={48}`
 * for a compact ring. The ring is drawn only; say its value in the label or nearby text.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Compact ring | 48px, 4px thick |
 * | Track | `--cm-bg-secondary` |
 */
const meta: Meta<typeof RingProgress> = {
    title: "Themed Mantine/Feedback/RingProgress",
    component: RingProgress,
    tags: ["autodocs"],
    args: {
        size: 48,
        thickness: 4,
    },
    argTypes: { label: { control: false } },
};

export default meta;
type Story = StoryObj<typeof RingProgress>;

/** A compact ring at 65%; change `sections` in Controls. */
export const Default: Story = {
    args: {
        sections: [{ value: 65, color: "brand" }],
        label: (
            <Text size="xs" ta="center">
                65%
            </Text>
        ),
    },
};

/** Empty, part and full, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={16}>
            {[0, 40, 100].map((value) => (
                <RingProgress
                    key={value}
                    size={48}
                    thickness={4}
                    sections={[{ value, color: "brand" }]}
                    label={
                        <Text size="xs" ta="center">
                            {value}
                        </Text>
                    }
                />
            ))}
        </Group>
    ),
};

/** Mantine's colors, and several sections with `roundCaps`. */
export const Variants: Story = {
    render: () => (
        <Group gap="md">
            <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: 100, color: "green" }]}
                label={
                    <Text size="xs" ta="center" c="green">
                        Done
                    </Text>
                }
            />
            <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: 75, color: "blue" }]}
                label={
                    <Text size="xs" ta="center">
                        75%
                    </Text>
                }
            />
            <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: 30, color: "red" }]}
                label={
                    <Text size="xs" ta="center" c="red">
                        Low
                    </Text>
                }
            />
            <RingProgress
                size={48}
                thickness={4}
                roundCaps
                sections={[
                    { value: 30, color: "cyan" },
                    { value: 30, color: "orange" },
                    { value: 30, color: "grape" },
                ]}
            />
        </Group>
    ),
};
