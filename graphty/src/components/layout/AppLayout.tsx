import {Box} from "@mantine/core";
import React, {useCallback, useEffect, useRef, useState} from "react";

import {useGraphInfo} from "../../hooks/useGraphInfo";
import type {GraphTypeConfig} from "../../types/selection";
import {FeedbackModal} from "../FeedbackModal";
import {Graphty} from "../Graphty";
import {LoadDataModal} from "../LoadDataModal";
import {RunLayoutsModal} from "../RunLayoutsModal";
import {BottomToolbar, ViewMode} from "./BottomToolbar";
import {LayerItem, LeftSidebar} from "./LeftSidebar";
import {RightSidebar} from "./RightSidebar";
import {TopMenuBar} from "./TopMenuBar";

// Sample test data for development - a simple graph with a few nodes and edges
const TEST_GRAPH_DATA = {
    nodes: [
        {id: "1", label: "Node 1", group: "A"},
        {id: "2", label: "Node 2", group: "A"},
        {id: "3", label: "Node 3", group: "B"},
        {id: "4", label: "Node 4", group: "B"},
        {id: "5", label: "Node 5", group: "C"},
    ],
    edges: [
        {src: "1", dst: "2"},
        {src: "1", dst: "3"},
        {src: "2", dst: "4"},
        {src: "3", dst: "4"},
        {src: "4", dst: "5"},
        {src: "2", dst: "5"},
    ],
};

interface AppLayoutProps {
    className?: string;
}

interface DataSourceState {
    dataSource: string;
    dataSourceConfig: Record<string, unknown>;
    replaceExisting: boolean;
}

export function AppLayout({className}: AppLayoutProps): React.JSX.Element {
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
    const [toolbarVisible, setToolbarVisible] = useState(true);
    const [layers, setLayers] = useState<LayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("3d");
    const [loadDataModalOpen, setLoadDataModalOpen] = useState(false);
    const [runLayoutsModalOpen, setRunLayoutsModalOpen] = useState(false);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [dataSourceState, setDataSourceState] = useState<DataSourceState | null>(null);
    const [currentLayout, setCurrentLayout] = useState<string>("d3");
    const [currentLayoutConfig, setCurrentLayoutConfig] = useState<Record<string, unknown>>({});
    const layerCounter = useRef(1);
    const {graphInfo, updateStats, addDataSource, setGraphType} = useGraphInfo();

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

    const handleEdgeUpdate = (layerId: string, updates: Partial<LayerItem["styleLayer"]["edge"]>): void => {
        const updatedLayers = layers.map((layer) => {
            if (layer.id === layerId) {
                return {
                    ... layer,
                    styleLayer: {
                        ... layer.styleLayer,
                        edge: {
                            selector: "",
                            style: {},
                            ... layer.styleLayer.edge,
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

    const handleLoadData = useCallback((dataSource: string, dataSourceConfig: Record<string, unknown>, replaceExisting: boolean) => {
        setDataSourceState({dataSource, dataSourceConfig, replaceExisting});
        // Add the data source to the graph info
        // Extract filename from config if available, otherwise use the data source type
        const fileName = typeof dataSourceConfig.fileName === "string" ?
            dataSourceConfig.fileName :
            `${dataSource}-source`;
        addDataSource({name: fileName, type: dataSource});
    }, [addDataSource]);

    const handleGraphTypeChange = useCallback((newGraphType: GraphTypeConfig) => {
        setGraphType(newGraphType);
    }, [setGraphType]);

    const handleLayerDeselect = useCallback(() => {
        setSelectedLayerId(null);
    }, []);

    const handleApplyLayout = useCallback((layoutType: string, config: Record<string, unknown>) => {
        setCurrentLayout(layoutType);
        setCurrentLayoutConfig(config);
    }, []);

    const handleSendFeedback = useCallback(() => {
        setFeedbackModalOpen(true);
    }, []);

    // Handle global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            // Escape key deselects the current layer
            if (event.key === "Escape" && selectedLayerId !== null) {
                setSelectedLayerId(null);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedLayerId]);

    // Load test data if ?test=true query parameter is present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("test") === "true") {
            setDataSourceState({
                dataSource: "json",
                dataSourceConfig: {data: JSON.stringify(TEST_GRAPH_DATA)},
                replaceExisting: true,
            });
            // Update graph stats with test data counts
            updateStats(TEST_GRAPH_DATA.nodes.length, TEST_GRAPH_DATA.edges.length);
            addDataSource({name: "test-data.json", type: "json"});
        }
    }, [updateStats, addDataSource]);

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
                onLoadData={() => {
                    setLoadDataModalOpen(true);
                }}
                onRunLayouts={() => {
                    setRunLayoutsModalOpen(true);
                }}
                onSendFeedback={handleSendFeedback}
            />

            {/* Load Data Modal */}
            <LoadDataModal
                opened={loadDataModalOpen}
                onClose={() => {
                    setLoadDataModalOpen(false);
                }}
                onLoad={handleLoadData}
            />

            {/* Run Layouts Modal */}
            <RunLayoutsModal
                opened={runLayoutsModalOpen}
                onClose={() => {
                    setRunLayoutsModalOpen(false);
                }}
                onApply={handleApplyLayout}
                is2DMode={viewMode === "2d"}
                currentLayout={currentLayout}
                currentLayoutConfig={currentLayoutConfig}
            />

            {/* Feedback Modal */}
            <FeedbackModal
                opened={feedbackModalOpen}
                onClose={() => {
                    setFeedbackModalOpen(false);
                }}
            />

            {/* Main Canvas Area - Full Screen */}
            <Box
                component="main"
                style={{
                    gridArea: "canvas",
                    overflow: "hidden",
                    backgroundColor: "var(--mantine-color-body)",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                }}
            >
                <Graphty
                    layers={layers}
                    layout2d={viewMode === "2d"}
                    dataSource={dataSourceState?.dataSource}
                    dataSourceConfig={dataSourceState?.dataSourceConfig}
                    replaceExisting={dataSourceState?.replaceExisting}
                    layout={currentLayout}
                    layoutConfig={currentLayoutConfig}
                />

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
                        <RightSidebar
                            selectedLayer={selectedLayer}
                            graphInfo={graphInfo}
                            onLayerUpdate={handleLayerUpdate}
                            onEdgeUpdate={handleEdgeUpdate}
                            onGraphTypeChange={handleGraphTypeChange}
                            onLayerDeselect={handleLayerDeselect}
                        />
                    </Box>
                )}

                {/* Floating Centered Toolbar */}
                {toolbarVisible && (
                    <Box
                        style={{
                            position: "absolute",
                            bottom: "10px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                        }}
                    >
                        <BottomToolbar viewMode={viewMode} onViewModeChange={setViewMode} />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
