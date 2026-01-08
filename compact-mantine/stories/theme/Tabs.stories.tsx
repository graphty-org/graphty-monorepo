import { Box, Stack, Tabs, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Settings, User } from "lucide-react";

const meta: Meta<typeof Tabs> = {
    title: "Theme/Tabs",
    component: Tabs,
    args: {
        size: "compact",
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
                    <Text size="compact">General settings content</Text>
                </Tabs.Panel>
                <Tabs.Panel value="messages" pt="xs">
                    <Text size="compact">Messages content</Text>
                </Tabs.Panel>
                <Tabs.Panel value="profile" pt="xs">
                    <Text size="compact">Profile content</Text>
                </Tabs.Panel>
            </>
        ),
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="xl">
            <Box>
                <Text size="compact" fw={500} mb="sm">
                    Compact:
                </Text>
                <Tabs size="compact" defaultValue="general">
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
                        <Text size="compact">General settings content</Text>
                    </Tabs.Panel>
                </Tabs>
            </Box>
            <Box>
                <Text size="compact" fw={500} mb="sm">
                    Extra Small (xs):
                </Text>
                <Tabs size="xs" defaultValue="general">
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
                        <Text size="xs">General settings content</Text>
                    </Tabs.Panel>
                </Tabs>
            </Box>
            <Box>
                <Text size="compact" fw={500} mb="sm">
                    Small (sm):
                </Text>
                <Tabs size="sm" defaultValue="general">
                    <Tabs.List>
                        <Tabs.Tab value="general" leftSection={<Settings size={14} />}>
                            General
                        </Tabs.Tab>
                        <Tabs.Tab value="messages" leftSection={<Mail size={14} />}>
                            Messages
                        </Tabs.Tab>
                        <Tabs.Tab value="profile" leftSection={<User size={14} />}>
                            Profile
                        </Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="general" pt="xs">
                        <Text size="sm">General settings content</Text>
                    </Tabs.Panel>
                </Tabs>
            </Box>
        </Stack>
    ),
};
