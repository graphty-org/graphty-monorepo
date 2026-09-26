import { Divider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { StoryState, StoryStates } from "./StoryPanel";

/**
 * Mantine's Divider in Figma's divider colour, `--cm-border` (#e6e6e6 light, #444 dark;
 * design/figma-spec.md 9.7). A `color` prop still wins.
 */
const meta: Meta<typeof Divider> = {
    title: "Figma/Chrome/Divider",
    component: Divider,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Divider>;

/** Horizontal and vertical, in the panel. Switch the toolbar theme for dark. */
export const States: Story = {
    render: () => (
        <StoryStates>
            <StoryState name="Horizontal" padded>
                <Stack gap={8} py={8}>
                    <Divider />
                </Stack>
            </StoryState>
            <StoryState name="Vertical" padded>
                <Stack h={40} py={8} style={{ flexDirection: "row" }}>
                    <Divider orientation="vertical" />
                </Stack>
            </StoryState>
        </StoryStates>
    ),
};
