import { Group, ThemeIcon } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `ThemeIcon`, themed as a 24px glyph tile: `filled` is the brand ground with a white
 * glyph, `light` the selected ground with a brand glyph. Every prop is Mantine's: see
 * [ThemeIcon on mantine.dev](https://mantine.dev/core/theme-icon/).
 *
 * A ThemeIcon is decoration, not a control. For a clickable glyph use `ActionIcon`.
 *
 * ## Usage
 *
 * ```tsx
 * import { ThemeIcon } from "@mantine/core";
 * import { UiGlyph } from "@graphty/compact-mantine";
 *
 * <ThemeIcon variant="light"><UiGlyph name="component" /></ThemeIcon>
 * ```
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 24 x 24, radius 5px |
 * | `light` | `--cm-bg-selected` with a brand glyph |
 */
const meta: Meta<typeof ThemeIcon> = {
    title: "Themed Mantine/Surfaces/ThemeIcon",
    component: ThemeIcon,
    tags: ["autodocs"],
    argTypes: { children: { control: false } },
};

export default meta;
type Story = StoryObj<typeof ThemeIcon>;

/** A filled tile; switch `variant` to `light` in Controls. */
export const Default: Story = {
    args: {
        children: <UiGlyph name="component" />,
        variant: "filled",
    },
};

/** Filled (brand) and light (selected ground, brand glyph), light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={8}>
            <ThemeIcon>
                <UiGlyph name="component" />
            </ThemeIcon>
            <ThemeIcon variant="light">
                <UiGlyph name="component" />
            </ThemeIcon>
        </Group>
    ),
};
