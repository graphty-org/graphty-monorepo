import {ActionIcon, Divider, Group, Menu, Paper, ScrollArea, Text} from "@mantine/core";
import {ArrowRight, Box, Hand, MousePointer, Plus, Square, Trash2, Video, ZoomIn} from "lucide-react";
import React, {useState} from "react";

export type ViewMode = "2d" | "3d";

interface BottomToolbarProps {
    className?: string;
    style?: React.CSSProperties;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
}

export function BottomToolbar({className, style, viewMode = "3d", onViewModeChange}: BottomToolbarProps): React.JSX.Element {
    const [selectedTool, setSelectedTool] = useState("pointer");

    return (
        <Paper
            component="footer"
            className={className}
            radius="md"
            shadow="lg"
            style={{
                backgroundColor: "var(--mantine-color-dark-7)",
                border: "1px solid var(--mantine-color-dark-5)",
                padding: "8px 16px",
                maxWidth: "90vw",
                ... style,
            }}
        >
            <ScrollArea type="never" style={{width: "100%"}}>
                <Group gap="md" wrap="nowrap" style={{minWidth: "max-content"}}>
                    {/* Selection Tools */}
                    <Group gap={4}>
                        <ActionIcon
                            variant={selectedTool === "pointer" ? "filled" : "subtle"}
                            color={selectedTool === "pointer" ? "blue" : "gray"}
                            onClick={() => {
                                setSelectedTool("pointer");
                            }}
                        >
                            <MousePointer size={18} />
                        </ActionIcon>
                        <ActionIcon
                            variant={selectedTool === "hand" ? "filled" : "subtle"}
                            color={selectedTool === "hand" ? "blue" : "gray"}
                            onClick={() => {
                                setSelectedTool("hand");
                            }}
                        >
                            <Hand size={18} />
                        </ActionIcon>
                        <ActionIcon
                            variant={selectedTool === "zoom" ? "filled" : "subtle"}
                            color={selectedTool === "zoom" ? "blue" : "gray"}
                            onClick={() => {
                                setSelectedTool("zoom");
                            }}
                        >
                            <ZoomIn size={18} />
                        </ActionIcon>
                    </Group>

                    <Divider orientation="vertical" color="dark.5" />

                    {/* Graph Tools */}
                    <Group gap={4}>
                        <ActionIcon variant="subtle" color="gray">
                            <Plus size={18} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="gray">
                            <ArrowRight size={18} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="gray">
                            <Trash2 size={18} />
                        </ActionIcon>
                    </Group>

                    <Divider orientation="vertical" color="dark.5" />

                    {/* 2D/3D Camera Menu */}
                    <Menu position="top" offset={8} shadow="md">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="lg">
                                <Video size={18} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown
                            style={{
                                backgroundColor: "var(--mantine-color-dark-7)",
                                border: "1px solid var(--mantine-color-dark-5)",
                            }}
                        >
                            <Menu.Item
                                leftSection={<Square size={14} />}
                                onClick={() => onViewModeChange?.("2d")}
                                style={{
                                    backgroundColor: viewMode === "2d" ? "var(--mantine-color-blue-filled)" : undefined,
                                    color: viewMode === "2d" ? "white" : undefined,
                                }}
                            >
                                <Text size="sm">2D</Text>
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<Box size={14} />}
                                onClick={() => onViewModeChange?.("3d")}
                                style={{
                                    backgroundColor: viewMode === "3d" ? "var(--mantine-color-blue-filled)" : undefined,
                                    color: viewMode === "3d" ? "white" : undefined,
                                }}
                            >
                                <Text size="sm">3D</Text>
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </ScrollArea>
        </Paper>
    );
}
