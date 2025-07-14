import {ActionIcon, Box, Group, Menu as MantineMenu, Title} from "@mantine/core";
import {Download, FileText, FolderOpen, Menu, Save, Settings, Share} from "lucide-react";
import React from "react";

interface TopMenuBarProps {
    className?: string;
    style?: React.CSSProperties;
    onToggleLeftSidebar?: () => void;
    onToggleRightSidebar?: () => void;
    onToggleToolbar?: () => void;
}

export function TopMenuBar({
    className,
    style,
    onToggleLeftSidebar,
    onToggleRightSidebar,
    onToggleToolbar,
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
                backgroundColor: "var(--mantine-color-dark-7)",
                borderBottom: "1px solid var(--mantine-color-dark-5)",
                color: "var(--mantine-color-gray-1)",
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
                        <MantineMenu.Item leftSection={<FileText size={14} />}>
                            New Graph
                        </MantineMenu.Item>
                        <MantineMenu.Item leftSection={<FolderOpen size={14} />}>
                            Open
                        </MantineMenu.Item>
                        <MantineMenu.Item leftSection={<Save size={14} />}>
                            Save
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
                    </MantineMenu.Dropdown>
                </MantineMenu>
            </Group>

            {/* Center - Logo/Title */}
            <Box style={{flex: 1, display: "flex", justifyContent: "center"}}>
                <Title order={3} c="dark.0">
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
