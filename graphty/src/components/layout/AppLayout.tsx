import {Box} from "@mantine/core";
import React, {useCallback, useEffect, useRef, useState} from "react";

import {useGraphInfo} from "../../hooks/useGraphInfo";
import type {GraphTypeConfig} from "../../types/selection";
import {ViewDataModal} from "../data-view";
import {FeedbackModal} from "../FeedbackModal";
import {Graphty, type GraphtyHandle} from "../Graphty";
import {LoadDataModal, type LoadDataRequest} from "../LoadDataModal";
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

// Track whether data has been loaded (for View Data button state)
interface DataLoadedState {
    hasData: boolean;
}

// Placeholder for selected element data (will be populated when graph selection is implemented)
type SelectedElementData = Record<string, unknown> | null;

export function AppLayout({className}: AppLayoutProps): React.JSX.Element {
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
    const [toolbarVisible, setToolbarVisible] = useState(true);
    const [layers, setLayers] = useState<LayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("3d");
    const [loadDataModalOpen, setLoadDataModalOpen] = useState(false);
    const [viewDataModalOpen, setViewDataModalOpen] = useState(false);
    const [runLayoutsModalOpen, setRunLayoutsModalOpen] = useState(false);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [dataLoadedState, setDataLoadedState] = useState<DataLoadedState>({hasData: false});
    const [currentLayout, setCurrentLayout] = useState<string>("d3");
    const [currentLayoutConfig, setCurrentLayoutConfig] = useState<Record<string, unknown>>({});
    // Placeholder state for selected element data - will be connected to graph selection events in future
    const [selectedElementData] = useState<SelectedElementData>(null);
    const layerCounter = useRef(1);
    const graphtyRef = useRef<GraphtyHandle>(null);
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

    const handleLoadData = useCallback(async(request: LoadDataRequest) => {
        if (!graphtyRef.current) {
            console.error("Graph not initialized");
            return;
        }

        try {
            // Clear existing data if requested
            if (request.replaceExisting) {
                graphtyRef.current.clearData();
            }

            // Determine format (undefined for auto-detect)
            const format = request.format === "auto" ? undefined : request.format;

            if (request.inputMethod === "url" && request.url) {
                // Use loadFromUrl for auto-detection from URL content
                await graphtyRef.current.loadFromUrl(request.url, format);
                // Extract filename from URL for data source tracking
                const fileName = request.url.split("/").pop() ?? "url-source";
                addDataSource({name: fileName, type: format ?? "auto"});
            } else if (request.inputMethod === "file" && request.file) {
                // Use loadFromFile for auto-detection from file content
                await graphtyRef.current.loadFromFile(request.file, format);
                addDataSource({name: request.file.name, type: format ?? "auto"});
            } else if (request.inputMethod === "paste" && request.data) {
                // For pasted data, we need a format (auto-detection already happened in modal)
                const pasteFormat = request.format === "auto" ? "json" : request.format;
                graphtyRef.current.loadData(pasteFormat, {data: request.data});
                addDataSource({name: "pasted-data", type: pasteFormat});
            }

            setDataLoadedState({hasData: true});
        } catch (error) {
            console.error("Failed to load data:", error);
            // Could add error state display here
        }
    }, [addDataSource]);

    const handleViewData = useCallback(() => {
        setViewDataModalOpen(true);
    }, []);

    const getGraphData = useCallback(() => {
        return graphtyRef.current?.getData() ?? {nodes: [], edges: []};
    }, []);

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
            // Use the imperative API to load test data
            graphtyRef.current?.loadData("json", {data: JSON.stringify(TEST_GRAPH_DATA)});
            // Update graph stats with test data counts
            updateStats(TEST_GRAPH_DATA.nodes.length, TEST_GRAPH_DATA.edges.length);
            addDataSource({name: "test-data.json", type: "json"});
            setDataLoadedState({hasData: true});
        }
    }, [updateStats, addDataSource]);

    // Check if there's data available (based on whether we've loaded data)
    const {hasData} = dataLoadedState;

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
                onViewData={handleViewData}
                hasData={hasData}
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
                onLoad={(request) => {
                    void handleLoadData(request);
                }}
            />

            {/* View Data Modal */}
            <ViewDataModal
                opened={viewDataModalOpen}
                onClose={() => {
                    setViewDataModalOpen(false);
                }}
                data={getGraphData()}
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
                    ref={graphtyRef}
                    layers={layers}
                    layout2d={viewMode === "2d"}
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
                            selectedElementData={selectedElementData}
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
