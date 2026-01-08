import { Box, NavLink, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Home, Mail, Settings, User } from "lucide-react";

const meta: Meta<typeof NavLink> = {
    title: "Theme/NavLink",
    component: NavLink,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof NavLink>;

export const Default: Story = {
    args: {
        label: "Home",
        leftSection: <Home size={14} />,
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text size="compact" fw={500} mb="xs">
                    Compact:
                </Text>
                <Box style={{ width: 200 }}>
                    <NavLink size="compact" label="Home" leftSection={<Home size={14} />} active />
                    <NavLink size="compact" label="Messages" leftSection={<Mail size={14} />} />
                    <NavLink size="compact" label="Settings" leftSection={<Settings size={14} />} />
                    <NavLink size="compact" label="Profile" leftSection={<User size={14} />} />
                </Box>
            </Box>
            <Box>
                <Text size="compact" fw={500} mb="xs">
                    Small (sm):
                </Text>
                <Box style={{ width: 200 }}>
                    <NavLink size="sm" label="Home" leftSection={<Home size={16} />} active />
                    <NavLink size="sm" label="Messages" leftSection={<Mail size={16} />} />
                    <NavLink size="sm" label="Settings" leftSection={<Settings size={16} />} />
                    <NavLink size="sm" label="Profile" leftSection={<User size={16} />} />
                </Box>
            </Box>
        </Stack>
    ),
};
