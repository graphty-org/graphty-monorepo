import { Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { HelpButton } from "../../../src";

const meta: Meta<typeof HelpButton> = {
    title: "Figma/Shell/HelpButton",
    component: HelpButton,
};

export default meta;
type Story = StoryObj<typeof HelpButton>;

/** The floating help button: its menu opens 4px above, end-aligned. */
export const Default: Story = {
    render: () => (
        <div style={{ paddingTop: 160, display: "flex", justifyContent: "flex-end", width: 320 }}>
            <HelpButton>
                <Menu.Item>Help page</Menu.Item>
                <Menu.Item>Keyboard shortcuts</Menu.Item>
                <Menu.Divider />
                <Menu.Item>Release notes</Menu.Item>
            </HelpButton>
        </div>
    ),
};

/** Rest and keyboard focus (hover and press do not change it). */
export const States: Story = {
    render: () => (
        <Group gap={24}>
            {(["rest", "focus"] as const).map((state) => (
                <Stack key={state} gap={4} align="center">
                    <HelpButton data-state={state} />
                    <Text size="xs">{state}</Text>
                </Stack>
            ))}
        </Group>
    ),
};
