import { ActionIcon, Group, Indicator } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Indicator`, themed as Figma's notification dot: 5px of brand color inside a 2px ring
 * of the panel ground, at the top end of an icon button. Every prop is Mantine's: see
 * [Indicator on mantine.dev](https://mantine.dev/core/indicator/).
 *
 * ## Usage
 *
 * ```tsx
 * import { ActionIcon, Indicator } from "@mantine/core";
 * import { UiGlyph } from "@graphty/compact-mantine";
 *
 * <Indicator offset={6} disabled={!hasUpdates}>
 *     <ActionIcon aria-label="Review library updates"><UiGlyph name="refresh" size={16} /></ActionIcon>
 * </Indicator>
 * ```
 *
 * The dot is drawn only: say what it means in the button's name as well ("Review library
 * updates, 3 new"), so a screen reader hears it too.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Dot | 5 x 5 `--cm-bg-brand` in a 2px `--cm-bg` ring (9 x 9 overall), round |
 * | Place | top end of the icon; `offset={6}` on a 32px button |
 */
const meta: Meta<typeof Indicator> = {
    title: "Themed Mantine/Feedback/Indicator",
    component: Indicator,
    tags: ["autodocs"],
    argTypes: { children: { control: false } },
};

export default meta;
type Story = StoryObj<typeof Indicator>;

/** A dot on an icon button; toggle `disabled` in Controls to hide it. */
export const Default: Story = {
    args: {
        offset: 6,
        disabled: false,
    },
    render: (args) => (
        <Indicator {...args}>
            <ActionIcon aria-label="Review library updates">
                <UiGlyph name="refresh" size={16} />
            </ActionIcon>
        </Indicator>
    ),
};

/** With the dot and without it (`disabled`), light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={16}>
            <Indicator offset={6}>
                <ActionIcon aria-label="Review library updates">
                    <UiGlyph name="refresh" size={16} />
                </ActionIcon>
            </Indicator>
            <Indicator offset={6} disabled>
                <ActionIcon aria-label="No updates">
                    <UiGlyph name="refresh" size={16} />
                </ActionIcon>
            </Indicator>
        </Group>
    ),
};
