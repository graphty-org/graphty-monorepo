import { Tabs, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Settings, User } from "lucide-react";

const meta: Meta<typeof Tabs> = {
    title: "Theme/Tabs",
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
