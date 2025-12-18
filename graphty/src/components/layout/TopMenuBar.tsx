import {ActionIcon, Box, Group, Menu as MantineMenu, Title} from "@mantine/core";
import {Download, Menu, MessageSquare, Settings, Share, Sparkles, Upload} from "lucide-react";
import React from "react";

interface TopMenuBarProps {
    className?: string;
    style?: React.CSSProperties;
    onToggleLeftSidebar?: () => void;
    onToggleRightSidebar?: () => void;
    onToggleToolbar?: () => void;
    onLoadData?: () => void;
    onRunLayouts?: () => void;
    onSendFeedback?: () => void;
}

export function TopMenuBar({
    className,
    style,
    onToggleLeftSidebar,
    onToggleRightSidebar,
    onToggleToolbar,
    onLoadData,
    onRunLayouts,
    onSendFeedback,
}: TopMenuBarProps): React.JSX.Element {
    return (
        <Box
            component="header"
            className={className}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: "16px",
                paddingRight: "16px",
                backgroundColor: "var(--mantine-color-body)",
                borderBottom: "1px solid var(--mantine-color-default-border)",
                ... style,
            }}
        >
            {/* Left side - Menu dropdown */}
            <Group gap="xs">
                <MantineMenu shadow="md" width={200}>
                    <MantineMenu.Target>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label="Main menu"
                        >
                            <Menu size={20} />
                        </ActionIcon>
                    </MantineMenu.Target>

                    <MantineMenu.Dropdown>
                        <MantineMenu.Label>File</MantineMenu.Label>
                        <MantineMenu.Item leftSection={<Upload size={14} />} onClick={onLoadData}>
                            Load Data...
                        </MantineMenu.Item>
                        <MantineMenu.Item leftSection={<Sparkles size={14} />} onClick={onRunLayouts}>
                            Run Layouts...
                        </MantineMenu.Item>
                        <MantineMenu.Item leftSection={<Download size={14} />}>
                            Export
                        </MantineMenu.Item>

                        <MantineMenu.Divider />

                        <MantineMenu.Label>View</MantineMenu.Label>
                        <MantineMenu.Item onClick={onToggleLeftSidebar}>
                            Toggle Layers Panel
                        </MantineMenu.Item>
                        <MantineMenu.Item onClick={onToggleRightSidebar}>
                            Toggle Properties Panel
                        </MantineMenu.Item>
                        <MantineMenu.Item onClick={onToggleToolbar}>
                            Toggle Toolbar
                        </MantineMenu.Item>

                        <MantineMenu.Divider />

                        <MantineMenu.Label>Help</MantineMenu.Label>
                        <MantineMenu.Item
                            leftSection={<MessageSquare size={14} />}
                            onClick={onSendFeedback}
                        >
                            Send feedback...
                        </MantineMenu.Item>
                    </MantineMenu.Dropdown>
                </MantineMenu>
            </Group>

            {/* Center - Logo/Title */}
            <Box style={{flex: 1, display: "flex", justifyContent: "center"}}>
                <Title order={3}>
                    Graphty
                </Title>
            </Box>

            {/* Right side - Action buttons */}
            <Group gap="xs">
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Export graph"
                >
                    <Download size={18} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Share graph"
                >
                    <Share size={18} />
                </ActionIcon>
                <ActionIcon
                    onClick={onToggleRightSidebar}
                    variant="subtle"
                    color="gray"
                    aria-label="Toggle properties panel"
                >
                    <Settings size={18} />
                </ActionIcon>
            </Group>
        </Box>
    );
}
