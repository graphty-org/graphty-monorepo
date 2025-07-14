import {ActionIcon, Divider, Group, Paper, ScrollArea, SegmentedControl} from "@mantine/core";
import {ArrowRight, Box, Hand, MousePointer, Plus, Square, Trash2, ZoomIn} from "lucide-react";
import React, {useState} from "react";

interface BottomToolbarProps {
    className?: string;
    style?: React.CSSProperties;
}

export function BottomToolbar({className, style}: BottomToolbarProps): React.JSX.Element {
    const [selectedTool, setSelectedTool] = useState("pointer");
    const [viewMode, setViewMode] = useState("2d");

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

                    {/* 2D/3D Toggle */}
                    <SegmentedControl
                        size="xs"
                        value={viewMode}
                        onChange={setViewMode}
                        data={[
                            {
                                value: "2d",
                                label: (
                                    <Group gap={4}>
                                        <Square size={14} />
                                        <span>2D</span>
                                    </Group>
                                ),
                            },
                            {
                                value: "3d",
                                label: (
                                    <Group gap={4}>
                                        <Box size={14} />
                                        <span>3D</span>
                                    </Group>
                                ),
                            },
                        ]}
                        styles={{
                            root: {
                                backgroundColor: "var(--mantine-color-dark-6)",
                            },
                        }}
                    />
                </Group>
            </ScrollArea>
        </Paper>
    );
}
