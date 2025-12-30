import {Box, Group, ScrollArea, Text} from "@mantine/core";
import {Settings} from "lucide-react";
import React, {useCallback} from "react";

import {RIGHT_SIDEBAR_WIDTH} from "../../constants/layout";
import type {GraphInfo} from "../../types/selection";
import {DataAccordion} from "../data-view";
import {GraphPropertiesPanel} from "../sidebar/panels/GraphPropertiesPanel";
import {StyleLayerPropertiesPanel} from "../sidebar/panels/StyleLayerPropertiesPanel";
import type {LayerItem} from "./LeftSidebar";

interface RightSidebarProps {
    className?: string;
    style?: React.CSSProperties;
    selectedLayer: LayerItem | null;
    graphInfo?: GraphInfo;
    onLayerUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
    onEdgeUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["edge"]>) => void;
    /** Called when the user presses Escape to deselect the current layer */
    onLayerDeselect?: () => void;
    /** Data for the currently selected graph element (node or edge). Null when nothing is selected. */
    selectedElementData?: Record<string, unknown> | null;
}

function renderPanelContent(
    selectedLayer: LayerItem | null,
    graphInfo: GraphInfo | undefined,
    onLayerUpdate: RightSidebarProps["onLayerUpdate"],
    onEdgeUpdate: RightSidebarProps["onEdgeUpdate"],
): React.JSX.Element {
    if (selectedLayer) {
        return (
            <StyleLayerPropertiesPanel
                layer={selectedLayer}
                onUpdate={onLayerUpdate}
                onEdgeUpdate={onEdgeUpdate}
            />
        );
    }

    if (graphInfo) {
        return (
            <GraphPropertiesPanel
                graphInfo={graphInfo}
            />
        );
    }

    return (
        <Box style={{textAlign: "center", paddingTop: "24px", paddingBottom: "24px"}}>
            <Box style={{display: "flex", justifyContent: "center", marginBottom: "8px"}}>
                <Settings size={24} style={{color: "var(--mantine-color-dimmed)"}} />
            </Box>
            <Text size="xs" c="dimmed" style={{fontSize: "11px"}}>
                Select a layer to view properties
            </Text>
        </Box>
    );
}

export function RightSidebar({className, style, selectedLayer, graphInfo, onLayerUpdate, onEdgeUpdate, onLayerDeselect, selectedElementData}: RightSidebarProps): React.JSX.Element {
    const handleKeyDown = useCallback((event: React.KeyboardEvent): void => {
        if (event.key === "Escape" && selectedLayer && onLayerDeselect) {
            onLayerDeselect();
        }
    }, [selectedLayer, onLayerDeselect]);

    return (
        <Box
            component="aside"
            className={className}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            style={{
                backgroundColor: "var(--mantine-color-body)",
                borderLeft: "1px solid var(--mantine-color-default-border)",
                display: "flex",
                flexDirection: "column",
                width: `${RIGHT_SIDEBAR_WIDTH}px`,
                minWidth: `${RIGHT_SIDEBAR_WIDTH}px`,
                height: "100%",
                overflow: "hidden",
                outline: "none",
                ... style,
            }}
        >
            {/* Sidebar Header */}
            <Box
                style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                    backgroundColor: "var(--mantine-color-default-hover)",
                }}
            >
                <Group gap="xs">
                    <Settings size={14} style={{color: "var(--mantine-color-dimmed)"}} />
                    <Text
                        size="xs"
                        fw={500}
                        style={{fontSize: "12px"}}
                    >
                        {selectedLayer ? selectedLayer.name : "Graph Properties"}
                    </Text>
                </Group>
            </Box>

            {/* Sidebar Content */}
            <ScrollArea style={{flex: 1}} scrollbarSize={8}>
                <Box style={{padding: "16px"}}>
                    {renderPanelContent(selectedLayer, graphInfo, onLayerUpdate, onEdgeUpdate)}
                </Box>
            </ScrollArea>

            {/* Data Accordion - shows selected element data */}
            <DataAccordion data={selectedElementData ?? null} />
        </Box>
    );
}
