import { Tabs, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Settings, User } from "lucide-react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Tabs> = {
    title: "Compact Theme/Mantine Components/Tabs",
    component: Tabs,
    args: {
        defaultValue: "general",
    },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
    args: {
        children: (
            <>
                <Tabs.List>
                    <Tabs.Tab value="general" leftSection={<Settings size={12} />}>
                        General
                    </Tabs.Tab>
                    <Tabs.Tab value="messages" leftSection={<Mail size={12} />}>
                        Messages
                    </Tabs.Tab>
                    <Tabs.Tab value="profile" leftSection={<User size={12} />}>
                        Profile
                    </Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="general" pt="xs">
                    <Text size="sm">General settings content</Text>
                </Tabs.Panel>
                <Tabs.Panel value="messages" pt="xs">
                    <Text size="sm">Messages content</Text>
                </Tabs.Panel>
                <Tabs.Panel value="profile" pt="xs">
                    <Text size="sm">Profile content</Text>
                </Tabs.Panel>
            </>
        ),
    },
};

/**
 * Figma's pill tabs, the default (design/figma-spec.md 5.1): 24 tall, the selected tab
 * --cm-bg-secondary at weight 550, each tab as wide as its bold label so selecting never
 * shifts the row. Tabs activate on mouse-down, and the arrows move focus and selection
 * together. `variant="default"` keeps Mantine's underline tabs. The play function focuses the
 * marked tab list.
 */
export const States: Story = {
    render: () => (
        <StateGrid
            columns={220}
            cells={[
                [
                    "pills (default)",
                    <Tabs defaultValue="design">
                        <Tabs.List>
                            <Tabs.Tab value="design">Design</Tabs.Tab>
                            <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "hover on an unselected tab",
                    <Tabs defaultValue="design">
                        <Tabs.List>
                            <Tabs.Tab value="design">Design</Tabs.Tab>
                            <Tabs.Tab value="prototype" data-cm-state="hover">
                                Prototype
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "focus",
                    <div data-story-focus>
                        <Tabs defaultValue="design">
                            <Tabs.List>
                                <Tabs.Tab value="design">Design</Tabs.Tab>
                                <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                            </Tabs.List>
                        </Tabs>
                    </div>,
                ],
                [
                    "disabled tab",
                    <Tabs defaultValue="custom">
                        <Tabs.List>
                            <Tabs.Tab value="custom">Custom</Tabs.Tab>
                            <Tabs.Tab value="libraries" disabled>
                                Libraries
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "row tabs (vertical)",
                    <Tabs defaultValue="all" orientation="vertical" w={184}>
                        <Tabs.List w={184}>
                            <Tabs.Tab value="all">All libraries</Tabs.Tab>
                            <Tabs.Tab value="team">Team</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "underline (variant=default)",
                    <Tabs defaultValue="design" variant="default">
                        <Tabs.List>
                            <Tabs.Tab value="design">Design</Tabs.Tab>
                            <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
            ]}
        />
    ),
    play: focusMarked,
};
