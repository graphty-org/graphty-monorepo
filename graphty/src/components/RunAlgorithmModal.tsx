import { Algorithm } from "@graphty/graphty-element";
import { Box, Button, Checkbox, Divider, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { AlertCircle, CheckCircle, Zap } from "lucide-react";
import { RefObject, useCallback, useEffect, useMemo, useState } from "react";

import type { GraphtyHandle } from "./Graphty";
import { OptionsForm, type OptionsSchema } from "./options";

/**
 * Algorithm categories for grouping in the UI.
 */
export type AlgorithmCategory =
    | "centrality"
    | "community"
    | "shortest-path"
    | "traversal"
    | "components"
    | "mst"
    | "flow";

/**
 * Display names for algorithm categories.
 */
export const CATEGORY_DISPLAY_NAMES: Record<AlgorithmCategory, string> = {
    centrality: "Centrality",
    community: "Community Detection",
    "shortest-path": "Shortest Path",
    traversal: "Traversal",
    components: "Components",
    mst: "Minimum Spanning Tree",
    flow: "Flow",
};

/**
 * Metadata for a single algorithm.
 */
export interface AlgorithmInfo {
    namespace: string;
    type: string;
    displayName: string;
    category: AlgorithmCategory;
    description: string;
    requiresSourceNode: boolean;
    requiresTargetNode?: boolean;
    /** For Prim algorithm, which uses "startNode" instead of "source" */
    sourceOptionKey?: "source" | "startNode";
    /** For Max Flow/Min Cut, which use "sink" instead of "target" */
    targetOptionKey?: "target" | "sink";
}

/**
 * Complete catalog of all 23 algorithms available in graphty-element.
 * Ordered by category and then by typical usage/importance within category.
 */
export const ALGORITHM_CATALOG: AlgorithmInfo[] = [
    // Centrality (7 algorithms)
    {
        namespace: "graphty",
        type: "degree",
        displayName: "Degree",
        category: "centrality",
        description: "Counts the number of connections for each node (in-degree, out-degree, and total)",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "pagerank",
        displayName: "PageRank",
        category: "centrality",
        description: "Measures node importance based on incoming connections from other important nodes",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "betweenness",
        displayName: "Betweenness Centrality",
        category: "centrality",
        description: "Measures how often a node lies on the shortest path between other nodes",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "closeness",
        displayName: "Closeness Centrality",
        category: "centrality",
        description: "Measures how close a node is to all other nodes in the graph",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "eigenvector",
        displayName: "Eigenvector Centrality",
        category: "centrality",
        description: "Measures influence based on the importance of connected neighbors",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "katz",
        displayName: "Katz Centrality",
        category: "centrality",
        description: "Measures centrality with attenuation for distant connections",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "hits",
        displayName: "HITS",
        category: "centrality",
        description: "Computes hub and authority scores for each node",
        requiresSourceNode: false,
    },

    // Community Detection (4 algorithms)
    {
        namespace: "graphty",
        type: "louvain",
        displayName: "Louvain",
        category: "community",
        description: "Detects communities by optimizing modularity using a hierarchical approach",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "girvan-newman",
        displayName: "Girvan-Newman",
        category: "community",
        description: "Detects communities by progressively removing high-betweenness edges",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "leiden",
        displayName: "Leiden",
        category: "community",
        description: "Improved community detection with guaranteed connected communities",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "label-propagation",
        displayName: "Label Propagation",
        category: "community",
        description: "Fast community detection by spreading labels through the network",
        requiresSourceNode: false,
    },

    // Shortest Path (3 algorithms)
    {
        namespace: "graphty",
        type: "dijkstra",
        displayName: "Dijkstra",
        category: "shortest-path",
        description: "Finds the shortest path between two nodes using positive edge weights",
        requiresSourceNode: true,
        requiresTargetNode: true,
    },
    {
        namespace: "graphty",
        type: "bellman-ford",
        displayName: "Bellman-Ford",
        category: "shortest-path",
        description: "Finds shortest paths even with negative edge weights",
        requiresSourceNode: true,
        requiresTargetNode: true,
    },
    {
        namespace: "graphty",
        type: "floyd-warshall",
        displayName: "Floyd-Warshall",
        category: "shortest-path",
        description: "Computes shortest paths between all pairs of nodes",
        requiresSourceNode: false,
    },

    // Traversal (2 algorithms)
    {
        namespace: "graphty",
        type: "bfs",
        displayName: "Breadth-First Search",
        category: "traversal",
        description: "Explores the graph level by level from a starting node",
        requiresSourceNode: true,
    },
    {
        namespace: "graphty",
        type: "dfs",
        displayName: "Depth-First Search",
        category: "traversal",
        description: "Explores the graph by going as deep as possible before backtracking",
        requiresSourceNode: true,
    },

    // Components (2 algorithms)
    {
        namespace: "graphty",
        type: "connected-components",
        displayName: "Connected Components",
        category: "components",
        description: "Identifies groups of nodes that are connected to each other",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "scc",
        displayName: "Strongly Connected Components",
        category: "components",
        description: "Finds groups where every node is reachable from every other node",
        requiresSourceNode: false,
    },

    // Minimum Spanning Tree (2 algorithms)
    {
        namespace: "graphty",
        type: "kruskal",
        displayName: "Kruskal",
        category: "mst",
        description: "Finds a minimum spanning tree by adding edges in weight order",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "prim",
        displayName: "Prim",
        category: "mst",
        description: "Builds a minimum spanning tree by growing from a starting node",
        requiresSourceNode: true,
        sourceOptionKey: "startNode",
    },

    // Flow (3 algorithms)
    {
        namespace: "graphty",
        type: "max-flow",
        displayName: "Max Flow",
        category: "flow",
        description: "Computes the maximum flow from source to sink in a network",
        requiresSourceNode: true,
        requiresTargetNode: true,
        targetOptionKey: "sink",
    },
    {
        namespace: "graphty",
        type: "min-cut",
        displayName: "Min Cut",
        category: "flow",
        description: "Finds the minimum set of edges to remove to disconnect source from sink",
        requiresSourceNode: true,
        requiresTargetNode: true,
        targetOptionKey: "sink",
    },
    {
        namespace: "graphty",
        type: "bipartite-matching",
        displayName: "Bipartite Matching",
        category: "flow",
        description: "Finds maximum matching in a bipartite graph",
        requiresSourceNode: false,
    },
];

/**
 * Get all unique categories in their display order.
 * @returns Array of algorithm categories in display order
 */
export function getCategories(): AlgorithmCategory[] {
    const seen = new Set<AlgorithmCategory>();
    const result: AlgorithmCategory[] = [];

    for (const algo of ALGORITHM_CATALOG) {
        if (!seen.has(algo.category)) {
            seen.add(algo.category);
            result.push(algo.category);
        }
    }

    return result;
}

/**
 * Get all algorithms for a given category.
 * @param category - The algorithm category to filter by
 * @returns Array of algorithms in the specified category
 */
export function getAlgorithmsByCategory(category: AlgorithmCategory): AlgorithmInfo[] {
    return ALGORITHM_CATALOG.filter((algo) => algo.category === category);
}

/** Style layer item for the UI layer list */
export interface AlgorithmStyleLayer {
    id: string;
    name: string;
    styleLayer: {
        node?: {
            selector: string;
            style: Record<string, unknown>;
        };
        edge?: {
            selector: string;
            style: Record<string, unknown>;
        };
    };
}

interface RunAlgorithmModalProps {
    opened: boolean;
    onClose: () => void;
    graphtyRef: RefObject<GraphtyHandle | null>;
    /** Callback to add algorithm style layers to the UI layer list */
    onAddLayers?: (layers: AlgorithmStyleLayer[]) => void;
}

/**
 * Modal dialog for selecting and running graph algorithms.
 * @param root0 - Component props
 * @param root0.opened - Whether the modal is open
 * @param root0.onClose - Callback to close the modal
 * @param root0.graphtyRef - Reference to the Graphty component
 * @param root0.onAddLayers - Callback to add algorithm style layers to the UI
 * @returns The modal component
 */
export function RunAlgorithmModal({ opened, onClose, graphtyRef, onAddLayers }: RunAlgorithmModalProps): React.JSX.Element {
    const categories = getCategories();
    const [selectedCategory, setSelectedCategory] = useState<AlgorithmCategory>(categories[0]);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmInfo | null>(null);
    const [applySuggestedStyles, setApplySuggestedStyles] = useState(true);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [selectedSourceNode, setSelectedSourceNode] = useState<string | null>(null);
    const [selectedTargetNode, setSelectedTargetNode] = useState<string | null>(null);
    const [graphNodes, setGraphNodes] = useState<{ value: string; label: string }[]>([]);
    const [optionsValues, setOptionsValues] = useState<Record<string, unknown>>({});
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // Get algorithms for the selected category
    const categoryAlgorithms = getAlgorithmsByCategory(selectedCategory);

    // Get the options schema for the selected algorithm
    const algorithmOptionsSchema: OptionsSchema | null = useMemo(() => {
        if (!selectedAlgorithm) {
            return null;
        }

        const algoClass = Algorithm.getClass(selectedAlgorithm.namespace, selectedAlgorithm.type);
        if (!algoClass || !algoClass.hasZodOptions()) {
            return null;
        }

        // getZodOptionsSchema returns the unified OptionsSchema with metadata
        const schema = algoClass.getZodOptionsSchema();

        // Filter out source/target options since they're handled separately
        const filteredSchema: OptionsSchema = {};
        for (const [key, optionDef] of Object.entries(schema)) {
            // Skip source/target/sink/startNode as these are handled by node selection
            if (!["source", "target", "sink", "startNode"].includes(key)) {
                filteredSchema[key] = optionDef as OptionsSchema[string];
            }
        }

        return Object.keys(filteredSchema).length > 0 ? filteredSchema : null;
    }, [selectedAlgorithm]);

    // Fetch graph nodes when modal opens
    useEffect(() => {
        if (opened) {
            const graph = graphtyRef.current?.graph;
            if (graph) {
                const nodeIds = Array.from(graph.dataManager.nodes.keys());
                setGraphNodes(
                    nodeIds.map((id) => ({
                        value: String(id),
                        label: String(id),
                    })),
                );
            } else {
                setGraphNodes([]);
            }
        }
    }, [opened, graphtyRef]);

    // Set default algorithm when category changes
    useEffect(() => {
        const algos = getAlgorithmsByCategory(selectedCategory);
        if (algos.length > 0) {
            setSelectedAlgorithm(algos[0]);
        }
    }, [selectedCategory]);

    // Reset node selection and options when algorithm changes
    useEffect(() => {
        // Set default values if nodes are available
        if (graphNodes.length > 0) {
            setSelectedSourceNode(graphNodes[0].value);
            setSelectedTargetNode(graphNodes.length > 1 ? graphNodes[graphNodes.length - 1].value : graphNodes[0].value);
        } else {
            setSelectedSourceNode(null);
            setSelectedTargetNode(null);
        }

        // Reset options values when algorithm changes
        setOptionsValues({});
    }, [selectedAlgorithm, graphNodes]);

    // Reset state when modal opens
    useEffect(() => {
        if (opened) {
            const defaultCategory = getCategories()[0];
            setSelectedCategory(defaultCategory);
            setSelectedAlgorithm(getAlgorithmsByCategory(defaultCategory)[0] ?? null);
            setApplySuggestedStyles(true);
            setIsExecuting(false);
            setError(null);
            setSuccess(false);
            // Node selection will be reset by the algorithm change effect
        }
    }, [opened]);

    const handleCategoryChange = useCallback((value: string | null) => {
        if (value) {
            setSelectedCategory(value as AlgorithmCategory);
            setError(null);
        }
    }, []);

    const handleAlgorithmChange = useCallback((value: string | null) => {
        if (value) {
            const algo = ALGORITHM_CATALOG.find((a) => a.type === value);
            setSelectedAlgorithm(algo ?? null);
            setError(null);
        }
    }, []);

    const handleRun = useCallback(() => {
        const graph = graphtyRef.current?.graph;
        if (!graph || !selectedAlgorithm) {
            return;
        }

        setIsExecuting(true);
        setError(null);

        // Build algorithm options: start with form values, then add source/target
        const algorithmOptions: Record<string, unknown> = { ...optionsValues };

        if (selectedAlgorithm.requiresSourceNode && selectedSourceNode) {
            const sourceKey = selectedAlgorithm.sourceOptionKey ?? "source";
            algorithmOptions[sourceKey] = selectedSourceNode;
        }

        if (selectedAlgorithm.requiresTargetNode && selectedTargetNode) {
            const targetKey = selectedAlgorithm.targetOptionKey ?? "target";
            algorithmOptions[targetKey] = selectedTargetNode;
        }

        const hasAlgorithmOptions = Object.keys(algorithmOptions).length > 0;

        // Access runAlgorithm method on the graph
        const runAlgorithm = graph.runAlgorithm as
            | ((namespace: string, type: string, options?: Record<string, unknown>) => Promise<void>)
            | undefined;

        if (!runAlgorithm) {
            setError("runAlgorithm method not available on graph");
            setIsExecuting(false);
            return;
        }

        // Run the algorithm without internal style application - we'll add styles through React
        runAlgorithm
            .call(graph, selectedAlgorithm.namespace, selectedAlgorithm.type, {
                applySuggestedStyles: false, // We handle styles through React layer system
                ...(hasAlgorithmOptions ? { algorithmOptions } : {}),
            })
            .then(() => {
                // If applySuggestedStyles is enabled, get the suggested styles and add them to the UI
                if (applySuggestedStyles && onAddLayers) {
                    // Cast to access static methods that aren't included in the basic AlgorithmClass type
                    const algoClass = Algorithm.getClass(selectedAlgorithm.namespace, selectedAlgorithm.type) as {
                        hasSuggestedStyles(): boolean;
                        getSuggestedStyles(): {
                            layers: Array<{
                                metadata?: { name?: string };
                                node?: {
                                    selector?: string;
                                    style?: Record<string, unknown>;
                                    calculatedStyle?: unknown;
                                };
                                edge?: {
                                    selector?: string;
                                    style?: Record<string, unknown>;
                                    calculatedStyle?: unknown;
                                };
                            }>;
                        } | null;
                    } | null;

                    if (algoClass?.hasSuggestedStyles()) {
                        const suggestedStyles = algoClass.getSuggestedStyles();
                        if (suggestedStyles?.layers) {
                            // Convert suggested styles to UI layer format
                            const uiLayers: AlgorithmStyleLayer[] = suggestedStyles.layers.map((layer, index) => {
                                const layerId = `algo-${selectedAlgorithm.namespace}-${selectedAlgorithm.type}-${String(index)}-${String(Date.now())}`;
                                const layerName = layer.metadata?.name ?? `${selectedAlgorithm.type} Style ${String(index + 1)}`;

                                return {
                                    id: layerId,
                                    name: layerName,
                                    styleLayer: {
                                        node: layer.node
                                            ? {
                                                  selector: layer.node.selector ?? "",
                                                  style: {
                                                      ...layer.node.style,
                                                      // Include calculatedStyle for dynamic styling
                                                      ...(layer.node.calculatedStyle
                                                          ? { calculatedStyle: layer.node.calculatedStyle }
                                                          : {}),
                                                  },
                                              }
                                            : undefined,
                                        edge: layer.edge
                                            ? {
                                                  selector: layer.edge.selector ?? "",
                                                  style: {
                                                      ...layer.edge.style,
                                                      ...(layer.edge.calculatedStyle
                                                          ? { calculatedStyle: layer.edge.calculatedStyle }
                                                          : {}),
                                                  },
                                              }
                                            : undefined,
                                    },
                                };
                            });

                            // Add layers to the UI
                            onAddLayers(uiLayers);
                        }
                    }
                }

                // Show success message briefly before closing
                setSuccess(true);
                setIsExecuting(false);
                setTimeout(() => {
                    onClose();
                }, 800);
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                setIsExecuting(false);
            });
    }, [graphtyRef, selectedAlgorithm, applySuggestedStyles, selectedSourceNode, selectedTargetNode, optionsValues, onClose, onAddLayers]);

    const canRun = graphtyRef.current?.graph !== undefined && selectedAlgorithm !== null && !isExecuting && !success;

    // Build select data for categories
    const categoryData = categories.map((cat) => ({
        value: cat,
        label: CATEGORY_DISPLAY_NAMES[cat],
    }));

    // Build select data for algorithms
    const algorithmData = categoryAlgorithms.map((algo) => ({
        value: algo.type,
        label: algo.displayName,
    }));

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Run Algorithm"
            size="md"
            centered
            styles={{
                header: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                    borderBottom: "1px solid var(--mantine-color-dark-5)",
                },
                body: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                    padding: "20px",
                },
                content: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                },
                title: {
                    color: "var(--mantine-color-gray-1)",
                    fontWeight: 500,
                },
            }}
        >
            <Stack gap="lg">
                {/* Category Selection */}
                <Select
                    label="Category"
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    data={categoryData}
                    styles={{
                        label: { color: "var(--mantine-color-gray-3)" },
                    }}
                />

                {/* Algorithm Selection */}
                <Select
                    label="Algorithm"
                    value={selectedAlgorithm?.type ?? null}
                    onChange={handleAlgorithmChange}
                    data={algorithmData}
                    styles={{
                        label: { color: "var(--mantine-color-gray-3)" },
                    }}
                />

                {/* Algorithm Description */}
                {selectedAlgorithm && (
                    <Box
                        style={{
                            backgroundColor: "var(--mantine-color-dark-6)",
                            borderRadius: "8px",
                            padding: "12px 16px",
                        }}
                    >
                        <Text size="sm" c="gray.3">
                            {selectedAlgorithm.description}
                        </Text>
                    </Box>
                )}

                {/* Node Selection Options */}
                {selectedAlgorithm?.requiresSourceNode && (
                    <>
                        <Divider
                            label="Options"
                            labelPosition="center"
                            styles={{
                                label: { color: "var(--mantine-color-gray-5)" },
                            }}
                        />

                        <Select
                            label="Source Node"
                            placeholder="Select a node"
                            value={selectedSourceNode}
                            onChange={setSelectedSourceNode}
                            data={graphNodes}
                            searchable
                            nothingFoundMessage="No nodes found"
                            styles={{
                                label: { color: "var(--mantine-color-gray-3)" },
                            }}
                        />

                        {selectedAlgorithm.requiresTargetNode && (
                            <Select
                                label={selectedAlgorithm.targetOptionKey === "sink" ? "Sink Node" : "Target Node"}
                                placeholder="Select a node"
                                value={selectedTargetNode}
                                onChange={setSelectedTargetNode}
                                data={graphNodes}
                                searchable
                                nothingFoundMessage="No nodes found"
                                styles={{
                                    label: { color: "var(--mantine-color-gray-3)" },
                                }}
                            />
                        )}
                    </>
                )}

                {/* Algorithm Options Form (from schema) */}
                {algorithmOptionsSchema && (
                    <>
                        {/* Show divider only if not already shown by source node section */}
                        {!selectedAlgorithm?.requiresSourceNode && (
                            <Divider
                                label="Options"
                                labelPosition="center"
                                styles={{
                                    label: { color: "var(--mantine-color-gray-5)" },
                                }}
                            />
                        )}

                        <OptionsForm
                            schema={algorithmOptionsSchema}
                            values={optionsValues}
                            onChange={setOptionsValues}
                            showAdvanced={showAdvancedOptions}
                        />

                        {/* Advanced options toggle */}
                        <Checkbox
                            label="Show advanced options"
                            checked={showAdvancedOptions}
                            onChange={(e) => {
                                setShowAdvancedOptions(e.currentTarget.checked);
                            }}
                            size="xs"
                            styles={{
                                label: { color: "var(--mantine-color-gray-5)", fontSize: "12px" },
                            }}
                        />
                    </>
                )}

                {/* Apply Suggested Styles Checkbox */}
                <Checkbox
                    label="Apply suggested styles"
                    description="Automatically visualize algorithm results in the graph"
                    checked={applySuggestedStyles}
                    onChange={(e) => {
                        setApplySuggestedStyles(e.currentTarget.checked);
                    }}
                    styles={{
                        label: { color: "var(--mantine-color-gray-1)" },
                        description: { color: "var(--mantine-color-gray-5)" },
                    }}
                />

                {/* Error Display */}
                {error && (
                    <Group gap="xs" style={{ color: "var(--mantine-color-red-5)" }}>
                        <AlertCircle size={16} />
                        <Text size="sm">{error}</Text>
                    </Group>
                )}

                {/* Success Display */}
                {success && (
                    <Group gap="xs" style={{ color: "var(--mantine-color-green-5)" }}>
                        <CheckCircle size={16} />
                        <Text size="sm">Algorithm completed successfully</Text>
                    </Group>
                )}

                {/* Action Buttons */}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" color="gray" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleRun} disabled={!canRun} loading={isExecuting} leftSection={<Zap size={16} />}>
                        Run Algorithm
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
