import { ActionIcon, Avatar, Group, Indicator } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { UiGlyph } from "../../src";

const meta: Meta<typeof Indicator> = {
    title: "Compact Theme/Mantine Components/Indicator",
    component: Indicator,
};

export default meta;
type Story = StoryObj<typeof Indicator>;

export const Default: Story = {
    render: () => (
        <Indicator color="red" inline>
            <Avatar src="https://i.pravatar.cc/100?u=stable-seed" alt="User avatar" />
        </Indicator>
    ),
};

/** The notification dot on a 32 icon button: 5px of brand colour in a 2px ring of the panel colour. */
export const States: Story = {
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
