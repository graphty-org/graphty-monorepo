import {Box, Group, ScrollArea, Text} from "@mantine/core";
import {Settings} from "lucide-react";
import React from "react";

import {StyleLayerPropertiesPanel} from "../sidebar/panels/StyleLayerPropertiesPanel";
import type {LayerItem} from "./LeftSidebar";

interface RightSidebarProps {
    className?: string;
    style?: React.CSSProperties;
    selectedLayer: LayerItem | null;
    onLayerUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
}

export function RightSidebar({className, style, selectedLayer, onLayerUpdate}: RightSidebarProps): React.JSX.Element {
    return (
        <Box
            component="aside"
            className={className}
            style={{
                backgroundColor: "var(--mantine-color-dark-7)",
                borderLeft: "1px solid var(--mantine-color-dark-5)",
                display: "flex",
                flexDirection: "column",
                width: "260px",
                minWidth: "260px",
                height: "100%",
                overflow: "hidden",
                color: "var(--mantine-color-gray-1)",
                ... style,
            }}
        >
            {/* Sidebar Header */}
            <Box
                style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--mantine-color-dark-5)",
                    backgroundColor: "var(--mantine-color-dark-6)",
                }}
            >
                <Group gap="xs">
                    <Settings size={14} style={{color: "var(--mantine-color-dark-2)"}} />
                    <Text
                        size="xs"
                        fw={500}
                        c="gray.0"
                        style={{fontSize: "12px"}}
                    >
                        {selectedLayer ? selectedLayer.name : "Properties"}
                    </Text>
                </Group>
            </Box>

            {/* Sidebar Content */}
            <ScrollArea style={{flex: 1}} scrollbarSize={8}>
                <Box style={{padding: "16px"}}>
                    {selectedLayer ? (
                        <StyleLayerPropertiesPanel
                            layer={selectedLayer}
                            onUpdate={onLayerUpdate}
                        />
                    ) : (
                        <Box style={{textAlign: "center", paddingTop: "24px", paddingBottom: "24px"}}>
                            <Box style={{display: "flex", justifyContent: "center", marginBottom: "8px"}}>
                                <Settings size={24} style={{color: "var(--mantine-color-dark-4)"}} />
                            </Box>
                            <Text size="xs" c="dark.3" style={{fontSize: "11px"}}>
                                Select a layer to view properties
                            </Text>
                        </Box>
                    )}
                </Box>
            </ScrollArea>
        </Box>
    );
}
