import { ActionIcon, Divider, Group, Menu, Paper, ScrollArea, Text } from "@mantine/core";
import { ArrowRight, Box, Glasses, Hand, MousePointer, Plus, Smartphone, Square, Trash2, Video, ZoomIn } from "lucide-react";
import React, { useState } from "react";

import { AiActionButton } from "../ai";

export type ViewMode = "2d" | "3d" | "vr" | "ar";

/**
 * Helper to determine XR menu item text color based on selection and availability
 * @param isSelected - Whether this menu item is currently selected
 * @param isAvailable - Whether the XR mode is available on this device
 * @returns The color string or undefined for default color
 */
function getXrMenuItemColor(isSelected: boolean, isAvailable: boolean): string | undefined {
    if (isSelected) {
        return "white";
    }
    if (!isAvailable) {
        return "var(--mantine-color-dimmed)";
    }
    return undefined;
}

interface BottomToolbarProps {
    className?: string;
    style?: React.CSSProperties;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    // XR availability
    vrAvailable?: boolean;
    arAvailable?: boolean;
    // AI-related props
    aiIsConfigured?: boolean;
    aiIsProcessing?: boolean;
    aiIsReady?: boolean;
    onAiButtonClick?: () => void;
}

/**
 * Floating toolbar at the bottom of the screen with graph tools and view options.
 * @param root0 - Component props
 * @param root0.className - Optional CSS class name
 * @param root0.style - Optional inline styles
 * @param root0.viewMode - Current view mode (2d, 3d, vr, or ar)
 * @param root0.onViewModeChange - Called when view mode changes
 * @param root0.vrAvailable - Whether VR mode is available (WebXR VR support)
 * @param root0.arAvailable - Whether AR mode is available (WebXR AR support)
 * @param root0.aiIsConfigured - Whether AI is configured
 * @param root0.aiIsProcessing - Whether AI is processing
 * @param root0.aiIsReady - Whether AI is ready
 * @param root0.onAiButtonClick - Called when AI button is clicked
 * @returns The bottom toolbar component
 */
export function BottomToolbar({
    className,
    style,
    viewMode = "3d",
    onViewModeChange,
    vrAvailable = false,
    arAvailable = false,
    aiIsConfigured = false,
    aiIsProcessing = false,
    aiIsReady = false,
    onAiButtonClick,
}: BottomToolbarProps): React.JSX.Element {
    const [selectedTool, setSelectedTool] = useState("pointer");

    return (
        <Paper
            component="footer"
            className={className}
            radius="md"
            shadow="lg"
            style={{
                backgroundColor: "var(--mantine-color-body)",
                border: "1px solid var(--mantine-color-default-border)",
                padding: "4px 8px",
                maxWidth: "90vw",
                ...style,
            }}
        >
            <ScrollArea type="never" style={{ width: "100%" }}>
                <Group gap="md" wrap="nowrap" style={{ minWidth: "max-content" }}>
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

                    {/* AI Assistant */}
                    <AiActionButton
                        isConfigured={aiIsConfigured}
                        isProcessing={aiIsProcessing}
                        isReady={aiIsReady}
                        onClick={() => onAiButtonClick?.()}
                    />

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
                                backgroundColor: "var(--mantine-color-body)",
                                border: "1px solid var(--mantine-color-default-border)",
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
                            <Menu.Divider />
                            <Menu.Item
                                leftSection={<Glasses size={14} />}
                                onClick={() => vrAvailable && onViewModeChange?.("vr")}
                                disabled={!vrAvailable}
                                style={{
                                    backgroundColor: viewMode === "vr" ? "var(--mantine-color-blue-filled)" : undefined,
                                    color: getXrMenuItemColor(viewMode === "vr", vrAvailable),
                                    opacity: vrAvailable ? 1 : 0.5,
                                    cursor: vrAvailable ? "pointer" : "not-allowed",
                                }}
                            >
                                <Text size="sm">VR</Text>
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<Smartphone size={14} />}
                                onClick={() => arAvailable && onViewModeChange?.("ar")}
                                disabled={!arAvailable}
                                style={{
                                    backgroundColor: viewMode === "ar" ? "var(--mantine-color-blue-filled)" : undefined,
                                    color: getXrMenuItemColor(viewMode === "ar", arAvailable),
                                    opacity: arAvailable ? 1 : 0.5,
                                    cursor: arAvailable ? "pointer" : "not-allowed",
                                }}
                            >
                                <Text size="sm">AR</Text>
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </ScrollArea>
        </Paper>
    );
}
