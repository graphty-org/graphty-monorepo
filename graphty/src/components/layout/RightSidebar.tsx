import {Box, ColorInput, Group, Stack, Text, TextInput} from "@mantine/core";
import {Settings} from "lucide-react";
import React, {useEffect, useState} from "react";

import {DataAccordion} from "../data-view";
import type {LayerItem} from "./LeftSidebar";

interface RightSidebarProps {
    className?: string;
    style?: React.CSSProperties;
    selectedLayer: LayerItem | null;
    onLayerUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
    /** Data for the currently selected graph element (node or edge). Null when nothing is selected. */
    selectedElementData?: Record<string, unknown> | null;
}

export function RightSidebar({className, style, selectedLayer, onLayerUpdate, selectedElementData}: RightSidebarProps): React.JSX.Element {
    const [selectorValue, setSelectorValue] = useState("");

    // Update local state when selected layer changes
    useEffect(() => {
        setSelectorValue(selectedLayer?.styleLayer.node?.selector ?? "");
    }, [selectedLayer]);
    return (
        <Box
            component="aside"
            className={className}
            style={{
                backgroundColor: "var(--mantine-color-dark-7)",
                borderLeft: "1px solid var(--mantine-color-dark-5)",
                display: "flex",
                flexDirection: "column",
                width: "300px",
                minWidth: "300px",
                height: "100%",
                overflow: "hidden",
                color: "var(--mantine-color-gray-1)",
                ... style,
            }}
        >
            {/* Sidebar Header */}
            <Box
                style={{
                    padding: "16px",
                    borderBottom: "1px solid var(--mantine-color-dark-5)",
                }}
            >
                <Group gap="xs">
                    <Settings size={16} />
                    <Text size="sm" fw={500} c="gray.1">
                        {selectedLayer ? selectedLayer.name : "Design Properties"}
                    </Text>
                </Group>
            </Box>

            {/* Sidebar Content */}
            <Box style={{flex: 1, padding: "16px", overflowY: "auto"}}>
                {selectedLayer ? (
                    <Stack gap="md">
                        <Box>
                            <Text size="sm" fw={500} c="gray.3" mb="md">
                                Layer: {selectedLayer.name}
                            </Text>
                        </Box>

                        <Box>
                            <Text size="sm" fw={500} c="gray.1" mb="xs">
                                Node Properties
                            </Text>
                            <Stack gap="sm">
                                <TextInput
                                    label="Node Selector"
                                    description="JMESPath expression to select nodes"
                                    placeholder="e.g., id == `0`"
                                    value={selectorValue}
                                    onChange={(e) => {
                                        setSelectorValue(e.currentTarget.value);
                                    }}
                                    onBlur={() => {
                                        if (onLayerUpdate) {
                                            onLayerUpdate(selectedLayer.id, {
                                                selector: selectorValue,
                                                style: selectedLayer.styleLayer.node?.style ?? {},
                                            });
                                        }
                                    }}
                                    size="sm"
                                    styles={{
                                        label: {color: "var(--mantine-color-gray-3)", fontSize: "12px"},
                                        description: {fontSize: "11px"},
                                    }}
                                />
                                <ColorInput
                                    label="Node Color"
                                    description="Color for selected nodes"
                                    value={((selectedLayer.styleLayer.node?.style.color ?? "#5b8ff9") as string)}
                                    onChange={(color) => {
                                        if (onLayerUpdate) {
                                            onLayerUpdate(selectedLayer.id, {
                                                selector: selectedLayer.styleLayer.node?.selector ?? "",
                                                style: {
                                                    ... (selectedLayer.styleLayer.node?.style ?? {}),
                                                    color,
                                                },
                                            });
                                        }
                                    }}
                                    size="sm"
                                    styles={{
                                        label: {color: "var(--mantine-color-gray-3)", fontSize: "12px"},
                                        description: {fontSize: "11px"},
                                    }}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                ) : (
                    <Box style={{textAlign: "center", paddingTop: "32px", paddingBottom: "32px"}}>
                        <Box style={{display: "flex", justifyContent: "center", marginBottom: "8px"}}>
                            <Settings size={32} style={{color: "var(--mantine-color-dark-3)"}} />
                        </Box>
                        <Text size="sm" c="gray.5">
                            Select a layer to view properties
                        </Text>
                    </Box>
                )}
            </Box>

            {/* Data Accordion - shows selected element data */}
            <DataAccordion data={selectedElementData ?? null} />
        </Box>
    );
}
