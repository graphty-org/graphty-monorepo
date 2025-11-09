import {Box} from "@mantine/core";
import React, {useRef, useState} from "react";

import {Graphty} from "../Graphty";
import {BottomToolbar} from "./BottomToolbar";
import {LayerItem, LeftSidebar} from "./LeftSidebar";
import {RightSidebar} from "./RightSidebar";
import {TopMenuBar} from "./TopMenuBar";

interface AppLayoutProps {
    className?: string;
}

export function AppLayout({className}: AppLayoutProps): React.JSX.Element {
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
    const [toolbarVisible, setToolbarVisible] = useState(true);
    const [layers, setLayers] = useState<LayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const layerCounter = useRef(1);

    const handleAddLayer = (): void => {
        const newLayer: LayerItem = {
            id: `layer-${Date.now()}`,
            name: `New Layer ${layerCounter.current}`,
            styleLayer: {
                node: {
                    selector: "",
                    style: {},
                },
                edge: {
                    selector: "",
                    style: {},
                },
            },
        };
        layerCounter.current += 1;
        setLayers([... layers, newLayer]);
        setSelectedLayerId(newLayer.id);
    };

    const handleLayersChange = (updatedLayers: LayerItem[]): void => {
        setLayers(updatedLayers);
    };

    const handleLayerSelect = (layerId: string): void => {
        setSelectedLayerId(layerId);
    };

    const handleLayerUpdate = (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>): void => {
        const updatedLayers = layers.map((layer) => {
            if (layer.id === layerId) {
                return {
                    ... layer,
                    styleLayer: {
                        ... layer.styleLayer,
                        node: {
                            selector: "",
                            style: {},
                            ... layer.styleLayer.node,
                            ... updates,
                        },
                    },
                };
            }

            return layer;
        });

        setLayers(updatedLayers);
    };

    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;

    return (
        <Box
            className={className}
            style={{
                height: "100vh",
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "48px 1fr",
                gridTemplateColumns: "1fr",
                gridTemplateAreas: "\"header\" \"canvas\"",
            }}
        >
            {/* Header */}
            <TopMenuBar
                style={{gridArea: "header"}}
                onToggleLeftSidebar={() => {
                    setLeftSidebarVisible(!leftSidebarVisible);
                }}
                onToggleRightSidebar={() => {
                    setRightSidebarVisible(!rightSidebarVisible);
                }}
                onToggleToolbar={() => {
                    setToolbarVisible(!toolbarVisible);
                }}
            />

            {/* Main Canvas Area - Full Screen */}
            <Box
                component="main"
                style={{
                    gridArea: "canvas",
                    overflow: "hidden",
                    backgroundColor: "var(--mantine-color-dark-8)",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                }}
            >
                <Graphty layers={layers} />

                {/* Left Sidebar - Overlaid */}
                {leftSidebarVisible && (
                    <Box
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            zIndex: 10,
                        }}
                    >
                        <LeftSidebar
                            layers={layers}
                            selectedLayerId={selectedLayerId}
                            onLayersChange={handleLayersChange}
                            onLayerSelect={handleLayerSelect}
                            onAddLayer={handleAddLayer}
                        />
                    </Box>
                )}

                {/* Right Sidebar - Overlaid */}
                {rightSidebarVisible && (
                    <Box
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            height: "100%",
                            zIndex: 10,
                        }}
                    >
                        <RightSidebar selectedLayer={selectedLayer} onLayerUpdate={handleLayerUpdate} />
                    </Box>
                )}

                {/* Floating Centered Toolbar */}
                {toolbarVisible && (
                    <Box
                        style={{
                            position: "absolute",
                            bottom: "80px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                        }}
                    >
                        <BottomToolbar />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
