import { Box } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useAiKeyStorage } from "../../hooks/useAiKeyStorage";
import { useAiManager } from "../../hooks/useAiManager";
import { useGraphInfo } from "../../hooks/useGraphInfo";
import type { ProviderType } from "../../types/ai";
import { AiChatDialog, AiSettingsModal } from "../ai";
import { ViewDataModal } from "../data-view";
import { FeedbackModal } from "../FeedbackModal";
import { Graphty, type GraphtyHandle } from "../Graphty";
import { LoadDataModal, type LoadDataRequest } from "../LoadDataModal";
import { RunAlgorithmModal } from "../RunAlgorithmModal";
import { RunLayoutsModal } from "../RunLayoutsModal";
import { BottomToolbar, ViewMode } from "./BottomToolbar";
import { LayerItem, LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { TopMenuBar } from "./TopMenuBar";

// Cat social network test data - a rich graph with many node/edge properties for testing
const TEST_GRAPH_DATA = {
    nodes: [
        {
            id: "Mr_Whiskers",
            group: 1,
            weightLbs: 18,
            personality: "bossy",
            indoorOutdoor: "outdoor",
            ageYears: 8,
            breed: "tabby",
            favoriteSpot: "fence_post",
            huntingSkill: 9,
        },
        {
            id: "Princess_Fluffington",
            group: 2,
            weightLbs: 8,
            personality: "diva",
            indoorOutdoor: "indoor",
            ageYears: 5,
            breed: "persian",
            favoriteSpot: "velvet_cushion",
            huntingSkill: 2,
        },
        {
            id: "Garbage_Bandit",
            group: 3,
            weightLbs: 14,
            personality: "sneaky",
            indoorOutdoor: "stray",
            ageYears: 4,
            breed: "mixed",
            favoriteSpot: "dumpster",
            huntingSkill: 7,
        },
        {
            id: "Mittens_The_Destroyer",
            group: 1,
            weightLbs: 12,
            personality: "chaotic",
            indoorOutdoor: "outdoor",
            ageYears: 3,
            breed: "tuxedo",
            favoriteSpot: "flower_bed",
            huntingSkill: 6,
        },
        {
            id: "Sir_Naps_A_Lot",
            group: 2,
            weightLbs: 16,
            personality: "lazy",
            indoorOutdoor: "indoor",
            ageYears: 10,
            breed: "british_shorthair",
            favoriteSpot: "sunny_windowsill",
            huntingSkill: 1,
        },
        {
            id: "Shadow_Ninja",
            group: 3,
            weightLbs: 10,
            personality: "mysterious",
            indoorOutdoor: "stray",
            ageYears: 6,
            breed: "black_cat",
            favoriteSpot: "roof",
            huntingSkill: 10,
        },
        {
            id: "Chonky_Boy",
            group: 2,
            weightLbs: 22,
            personality: "food_obsessed",
            indoorOutdoor: "indoor",
            ageYears: 7,
            breed: "maine_coon",
            favoriteSpot: "kitchen",
            huntingSkill: 3,
        },
        {
            id: "The_Vet",
            group: 4,
            weightLbs: 165,
            personality: "terrifying",
            indoorOutdoor: "clinic",
            ageYears: 45,
            breed: "human",
            favoriteSpot: "exam_table",
            huntingSkill: 0,
        },
        {
            id: "Mrs_Henderson",
            group: 5,
            weightLbs: 130,
            personality: "cat_lady",
            indoorOutdoor: "human",
            ageYears: 68,
            breed: "human",
            favoriteSpot: "rocking_chair",
            huntingSkill: 0,
        },
        {
            id: "Zoom_Zoom",
            group: 1,
            weightLbs: 9,
            personality: "hyperactive",
            indoorOutdoor: "outdoor",
            ageYears: 2,
            breed: "abyssinian",
            favoriteSpot: "everywhere",
            huntingSkill: 5,
        },
        {
            id: "Professor_Pawsington",
            group: 2,
            weightLbs: 11,
            personality: "intellectual",
            indoorOutdoor: "indoor",
            ageYears: 9,
            breed: "siamese",
            favoriteSpot: "bookshelf",
            huntingSkill: 4,
        },
        {
            id: "Tiny_Terror",
            group: 6,
            weightLbs: 4,
            personality: "feisty",
            indoorOutdoor: "kitten",
            ageYears: 0.5,
            breed: "calico",
            favoriteSpot: "shoebox",
            huntingSkill: 2,
        },
        {
            id: "Old_Tom",
            group: 3,
            weightLbs: 13,
            personality: "grumpy",
            indoorOutdoor: "stray",
            ageYears: 14,
            breed: "mixed",
            favoriteSpot: "porch",
            huntingSkill: 8,
        },
        {
            id: "Bella_Ballerina",
            group: 2,
            weightLbs: 9,
            personality: "graceful",
            indoorOutdoor: "indoor",
            ageYears: 4,
            breed: "russian_blue",
            favoriteSpot: "piano_top",
            huntingSkill: 5,
        },
        {
            id: "Midnight_Howler",
            group: 1,
            weightLbs: 15,
            personality: "vocal",
            indoorOutdoor: "outdoor",
            ageYears: 6,
            breed: "mixed",
            favoriteSpot: "back_alley",
            huntingSkill: 7,
        },
        {
            id: "Butterscotch",
            group: 5,
            weightLbs: 14,
            personality: "friendly",
            indoorOutdoor: "indoor",
            ageYears: 5,
            breed: "orange_tabby",
            favoriteSpot: "lap",
            huntingSkill: 3,
        },
        {
            id: "Ghost_Cat",
            group: 3,
            weightLbs: 8,
            personality: "elusive",
            indoorOutdoor: "stray",
            ageYears: 3,
            breed: "white_cat",
            favoriteSpot: "abandoned_shed",
            huntingSkill: 9,
        },
        {
            id: "Therapy_Cat_Whisper",
            group: 7,
            weightLbs: 12,
            personality: "calm",
            indoorOutdoor: "working",
            ageYears: 6,
            breed: "ragdoll",
            favoriteSpot: "hospital",
            huntingSkill: 1,
        },
        {
            id: "Neighbor_Dog_Rex",
            group: 8,
            weightLbs: 65,
            personality: "confused",
            indoorOutdoor: "outdoor",
            ageYears: 4,
            breed: "golden_retriever",
            favoriteSpot: "yard",
            huntingSkill: 0,
        },
        {
            id: "Window_Watcher_Wendy",
            group: 2,
            weightLbs: 10,
            personality: "observant",
            indoorOutdoor: "indoor",
            ageYears: 7,
            breed: "tortoiseshell",
            favoriteSpot: "bay_window",
            huntingSkill: 6,
        },
    ],
    edges: [
        {
            src: "Mr_Whiskers",
            dst: "Mittens_The_Destroyer",
            value: 8,
            relationship: "rivals",
            interactionType: "territorial",
        },
        {
            src: "Princess_Fluffington",
            dst: "Sir_Naps_A_Lot",
            value: 6,
            relationship: "friends",
            interactionType: "social",
        },
        { src: "Garbage_Bandit", dst: "Shadow_Ninja", value: 9, relationship: "allies", interactionType: "hunting" },
        { src: "Chonky_Boy", dst: "Mrs_Henderson", value: 10, relationship: "owner", interactionType: "feeding" },
        { src: "Chonky_Boy", dst: "The_Vet", value: 1, relationship: "avoids", interactionType: "medical" },
        { src: "Mrs_Henderson", dst: "Garbage_Bandit", value: 7, relationship: "feeds", interactionType: "feeding" },
        { src: "Zoom_Zoom", dst: "Sir_Naps_A_Lot", value: 3, relationship: "annoys", interactionType: "play" },
        {
            src: "Princess_Fluffington",
            dst: "Mr_Whiskers",
            value: 2,
            relationship: "dislikes",
            interactionType: "social",
        },
        { src: "Shadow_Ninja", dst: "Chonky_Boy", value: 5, relationship: "rivals", interactionType: "feeding" },
        { src: "Mittens_The_Destroyer", dst: "The_Vet", value: 4, relationship: "attacks", interactionType: "medical" },
        {
            src: "Professor_Pawsington",
            dst: "Princess_Fluffington",
            value: 8,
            relationship: "friends",
            interactionType: "social",
        },
        { src: "Tiny_Terror", dst: "Old_Tom", value: 3, relationship: "annoys", interactionType: "play" },
        {
            src: "Bella_Ballerina",
            dst: "Professor_Pawsington",
            value: 7,
            relationship: "mates",
            interactionType: "romantic",
        },
        {
            src: "Midnight_Howler",
            dst: "Mr_Whiskers",
            value: 6,
            relationship: "rivals",
            interactionType: "territorial",
        },
        { src: "Butterscotch", dst: "Mrs_Henderson", value: 10, relationship: "owner", interactionType: "social" },
        { src: "Ghost_Cat", dst: "Old_Tom", value: 5, relationship: "friends", interactionType: "social" },
        { src: "Therapy_Cat_Whisper", dst: "The_Vet", value: 9, relationship: "coworkers", interactionType: "medical" },
        {
            src: "Neighbor_Dog_Rex",
            dst: "Mr_Whiskers",
            value: 4,
            relationship: "chases",
            interactionType: "territorial",
        },
        { src: "Window_Watcher_Wendy", dst: "Zoom_Zoom", value: 6, relationship: "watches", interactionType: "social" },
        { src: "Zoom_Zoom", dst: "Tiny_Terror", value: 8, relationship: "playmates", interactionType: "play" },
        {
            src: "Garbage_Bandit",
            dst: "Butterscotch",
            value: 3,
            relationship: "dislikes",
            interactionType: "territorial",
        },
        { src: "Shadow_Ninja", dst: "Ghost_Cat", value: 7, relationship: "allies", interactionType: "hunting" },
        {
            src: "Sir_Naps_A_Lot",
            dst: "Window_Watcher_Wendy",
            value: 5,
            relationship: "neighbors",
            interactionType: "social",
        },
        {
            src: "Mittens_The_Destroyer",
            dst: "Neighbor_Dog_Rex",
            value: 9,
            relationship: "torments",
            interactionType: "play",
        },
        { src: "Old_Tom", dst: "Mrs_Henderson", value: 4, relationship: "tolerates", interactionType: "feeding" },
        { src: "Tiny_Terror", dst: "Butterscotch", value: 6, relationship: "annoys", interactionType: "play" },
        { src: "Professor_Pawsington", dst: "The_Vet", value: 2, relationship: "avoids", interactionType: "medical" },
        {
            src: "Midnight_Howler",
            dst: "Window_Watcher_Wendy",
            value: 5,
            relationship: "serenades",
            interactionType: "romantic",
        },
        {
            src: "Bella_Ballerina",
            dst: "Therapy_Cat_Whisper",
            value: 4,
            relationship: "friends",
            interactionType: "social",
        },
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

/**
 * Main application layout component with sidebars, toolbar, and graph canvas.
 * @param root0 - Component props
 * @param root0.className - Optional CSS class name
 * @returns The application layout component
 */
export function AppLayout({ className }: AppLayoutProps): React.JSX.Element {
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
    const [toolbarVisible, setToolbarVisible] = useState(true);
    const [layers, setLayers] = useState<LayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("3d");
    const [vrAvailable, setVrAvailable] = useState(false);
    const [arAvailable, setArAvailable] = useState(false);
    const [loadDataModalOpen, setLoadDataModalOpen] = useState(false);
    const [viewDataModalOpen, setViewDataModalOpen] = useState(false);
    const [runLayoutsModalOpen, setRunLayoutsModalOpen] = useState(false);
    const [runAlgorithmModalOpen, setRunAlgorithmModalOpen] = useState(false);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [dataLoadedState, setDataLoadedState] = useState<DataLoadedState>({ hasData: false });
    const [currentLayout, setCurrentLayout] = useState<string>("d3");
    const [currentLayoutConfig, setCurrentLayoutConfig] = useState<Record<string, unknown>>({});
    // Placeholder state for selected element data - will be connected to graph selection events in future
    const [selectedElementData] = useState<SelectedElementData>(null);
    const layerCounter = useRef(1);
    const graphtyRef = useRef<GraphtyHandle>(null);
    const testDataLoadedRef = useRef(false);
    const { graphInfo, updateStats, addDataSource } = useGraphInfo();

    // AI state
    const [aiChatDialogOpen, setAiChatDialogOpen] = useState(false);
    const [aiSettingsModalOpen, setAiSettingsModalOpen] = useState(false);
    const [defaultProvider, setDefaultProvider] = useState<ProviderType | null>(null);

    // AI Key Storage - wraps graphty-element's ApiKeyManager
    const aiKeyStorage = useAiKeyStorage();

    // AI Manager - wraps graphty-element's AiManager
    const aiManager = useAiManager({
        graph: graphtyRef.current?.graph,
        defaultProvider: defaultProvider ?? undefined,
        getKey: aiKeyStorage.getKey,
    });

    // Handle AI button click - opens settings if not configured, chat if configured
    const handleAiButtonClick = useCallback(() => {
        if (aiKeyStorage.hasAnyProvider) {
            setAiChatDialogOpen(true);
        } else {
            setAiSettingsModalOpen(true);
        }
    }, [aiKeyStorage.hasAnyProvider]);

    // Build available providers list for chat dialog
    const getProviderLabel = (provider: ProviderType): string => {
        switch (provider) {
            case "openai":
                return "OpenAI";
            case "anthropic":
                return "Anthropic";
            case "google":
                return "Google";
            case "webllm":
                return "WebLLM (Local)";
            default:
                return provider;
        }
    };
    const availableProviders = aiKeyStorage.configuredProviders.map((provider) => ({
        value: provider,
        label: getProviderLabel(provider),
    }));

    // Set default provider when first provider is configured
    useEffect(() => {
        if (!defaultProvider && aiKeyStorage.configuredProviders.length > 0) {
            setDefaultProvider(aiKeyStorage.configuredProviders[0]);
        }
    }, [defaultProvider, aiKeyStorage.configuredProviders]);

    // Detect WebXR availability from graphty-element
    useEffect(() => {
        const checkXRAvailability = async (): Promise<void> => {
            // Access the graphty-element through the handle
            // Note: graphtyRef.current is a GraphtyHandle, we need access to the underlying element
            // For now, use navigator.xr directly since graphty-element's methods aren't exposed via the handle
            if (typeof navigator !== "undefined" && navigator.xr) {
                try {
                    const vrSupported = await navigator.xr.isSessionSupported("immersive-vr");
                    setVrAvailable(vrSupported);
                } catch {
                    setVrAvailable(false);
                }

                try {
                    const arSupported = await navigator.xr.isSessionSupported("immersive-ar");
                    setArAvailable(arSupported);
                } catch {
                    setArAvailable(false);
                }
            }
        };

        void checkXRAvailability();
    }, []);

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
        setLayers([...layers, newLayer]);
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
                    ...layer,
                    styleLayer: {
                        ...layer.styleLayer,
                        node: {
                            selector: "",
                            style: {},
                            ...layer.styleLayer.node,
                            ...updates,
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
                    ...layer,
                    styleLayer: {
                        ...layer.styleLayer,
                        edge: {
                            selector: "",
                            style: {},
                            ...layer.styleLayer.edge,
                            ...updates,
                        },
                    },
                };
            }

            return layer;
        });

        setLayers(updatedLayers);
    };

    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;

    const handleLoadData = useCallback(
        async (request: LoadDataRequest) => {
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
                    addDataSource({ name: fileName, type: format ?? "auto" });
                } else if (request.inputMethod === "file" && request.file) {
                    // Use loadFromFile for auto-detection from file content
                    await graphtyRef.current.loadFromFile(request.file, format);
                    addDataSource({ name: request.file.name, type: format ?? "auto" });
                } else if (request.inputMethod === "paste" && request.data) {
                    // For pasted data, we need a format (auto-detection already happened in modal)
                    const pasteFormat = request.format === "auto" ? "json" : request.format;
                    graphtyRef.current.loadData(pasteFormat, { data: request.data });
                    addDataSource({ name: "pasted-data", type: pasteFormat });
                }

                setDataLoadedState({ hasData: true });
            } catch (error) {
                console.error("Failed to load data:", error);
                // Could add error state display here
            }
        },
        [addDataSource],
    );

    const handleViewData = useCallback(() => {
        setViewDataModalOpen(true);
    }, []);

    const getGraphData = useCallback(() => {
        return graphtyRef.current?.getData() ?? { nodes: [], edges: [] };
    }, []);

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

    // Load test data if ?test query parameter is present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has("test") && !testDataLoadedRef.current) {
            testDataLoadedRef.current = true;
            // Use the imperative API to load test data
            graphtyRef.current?.loadData("json", { data: JSON.stringify(TEST_GRAPH_DATA) });
            // Update graph stats with test data counts
            updateStats(TEST_GRAPH_DATA.nodes.length, TEST_GRAPH_DATA.edges.length);
            addDataSource({ name: "cat-social-network.json", type: "json" });
            setDataLoadedState({ hasData: true });
        }
    }, [updateStats, addDataSource]);

    // Check if there's data available (based on whether we've loaded data)
    const { hasData } = dataLoadedState;

    return (
        <Box
            className={className}
            style={{
                height: "100vh",
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "48px 1fr",
                gridTemplateColumns: "1fr",
                gridTemplateAreas: '"header" "canvas"',
            }}
        >
            {/* Header */}
            <TopMenuBar
                style={{ gridArea: "header" }}
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
                onRunAlgorithm={() => {
                    setRunAlgorithmModalOpen(true);
                }}
                onSendFeedback={handleSendFeedback}
                onOpenAiSettings={() => {
                    setAiSettingsModalOpen(true);
                }}
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

            {/* Run Algorithm Modal */}
            <RunAlgorithmModal
                opened={runAlgorithmModalOpen}
                onClose={() => {
                    setRunAlgorithmModalOpen(false);
                }}
                graphtyRef={graphtyRef}
            />

            {/* Feedback Modal */}
            <FeedbackModal
                opened={feedbackModalOpen}
                onClose={() => {
                    setFeedbackModalOpen(false);
                }}
            />

            {/* AI Settings Modal */}
            <AiSettingsModal
                opened={aiSettingsModalOpen}
                onClose={() => {
                    setAiSettingsModalOpen(false);
                }}
                getKey={aiKeyStorage.getKey}
                setKey={aiKeyStorage.setKey}
                removeKey={aiKeyStorage.removeKey}
                hasKey={aiKeyStorage.hasKey}
                configuredProviders={aiKeyStorage.configuredProviders}
                defaultProvider={defaultProvider}
                onDefaultProviderChange={setDefaultProvider}
                isPersistenceEnabled={aiKeyStorage.isPersistenceEnabled}
                onEnablePersistence={aiKeyStorage.enablePersistence}
                onDisablePersistence={aiKeyStorage.disablePersistence}
            />

            {/* AI Chat Dialog */}
            <AiChatDialog
                opened={aiChatDialogOpen}
                onClose={() => {
                    setAiChatDialogOpen(false);
                }}
                onOpenSettings={() => {
                    setAiSettingsModalOpen(true);
                }}
                status={aiManager.status}
                isProcessing={aiManager.isProcessing}
                onExecute={aiManager.execute}
                onCancel={aiManager.cancel}
                availableProviders={availableProviders}
                currentProvider={aiManager.currentProvider}
                onProviderChange={aiManager.setProvider}
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
                    viewMode={viewMode}
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
                        <BottomToolbar
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            vrAvailable={vrAvailable}
                            arAvailable={arAvailable}
                            aiIsConfigured={aiKeyStorage.hasAnyProvider}
                            aiIsProcessing={aiManager.isProcessing}
                            aiIsReady={aiKeyStorage.isReady}
                            onAiButtonClick={handleAiButtonClick}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
