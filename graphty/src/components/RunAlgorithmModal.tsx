import { Box, Button, Checkbox, Divider, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { AlertCircle, CheckCircle, Zap } from "lucide-react";
import { RefObject, useCallback, useEffect, useState } from "react";

import {
    type AlgorithmCategory,
    type AlgorithmInfo,
    CATEGORY_DISPLAY_NAMES,
    getAlgorithm,
    getAlgorithmsByCategory,
    getCategories,
} from "./algorithmCatalog";
import type { GraphtyHandle } from "./Graphty";
import { OptionsForm } from "./options";

/** Style layer item for the UI layer list */
interface RunAlgorithmModalProps {
    opened: boolean;
    onClose: () => void;
    graphtyRef: RefObject<GraphtyHandle | null>;
}

/**
 * Modal dialog for selecting and running graph algorithms.
 * @param root0 - Component props
 * @param root0.opened - Whether the modal is open
 * @param root0.onClose - Callback to close the modal
 * @param root0.graphtyRef - Reference to the Graphty component
 * @returns The modal component
 */
export function RunAlgorithmModal({ opened, onClose, graphtyRef }: RunAlgorithmModalProps): React.JSX.Element {
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

    // The options the element's catalogue publishes for the selected algorithm. The node
    // pickers are already off this list -- they are drawn as node selects below -- and so is
    // the parameter that names which folded engine this entry is.
    const algorithmOptions = selectedAlgorithm?.options ?? [];

    // The node pickers list every node the graph holds, read when the modal opens.
    useEffect(() => {
        if (opened) {
            const nodes = graphtyRef.current?.session?.data.nodes() ?? [];
            setGraphNodes(nodes.map(({ id }) => ({ value: String(id), label: String(id) })));
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
            setSelectedCategory(value);
            setError(null);
        }
    }, []);

    const handleAlgorithmChange = useCallback((value: string | null) => {
        if (value) {
            const algo = getAlgorithm(value);
            setSelectedAlgorithm(algo ?? null);
            setError(null);
        }
    }, []);

    const handleRun = useCallback(() => {
        const session = graphtyRef.current?.session;
        if (!session || !selectedAlgorithm) {
            return;
        }

        setIsExecuting(true);
        setError(null);

        // The catalogue parameters that say which folded entry this is, then the form's values,
        // then the node pickers.
        const params: Record<string, unknown> = { ...selectedAlgorithm.params, ...optionsValues };

        if (selectedAlgorithm.sourceOption && selectedSourceNode) {
            params[selectedAlgorithm.sourceOption.name] = selectedSourceNode;
        }

        if (selectedAlgorithm.targetOption && selectedTargetNode) {
            params[selectedAlgorithm.targetOption.name] = selectedTargetNode;
        }

        /* One undoable step: the run, the encoding the element derives from its result, and --
           when the reader asked for them -- the layers the algorithm suggests. */
        Promise.resolve(session.runs.start(selectedAlgorithm.key, params, { applySuggestedStyles }))
            .then(() => {
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
    }, [graphtyRef, selectedAlgorithm, applySuggestedStyles, selectedSourceNode, selectedTargetNode, optionsValues, onClose]);

    const canRun = (graphtyRef.current?.session ?? null) !== null && selectedAlgorithm !== null && !isExecuting && !success;

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
                {selectedAlgorithm?.sourceOption && (
                    <>
                        <Divider
                            label="Options"
                            labelPosition="center"
                            styles={{
                                label: { color: "var(--mantine-color-gray-5)" },
                            }}
                        />

                        <Select
                            label={selectedAlgorithm.sourceOption.plainName}
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

                        {selectedAlgorithm.targetOption && (
                            <Select
                                label={selectedAlgorithm.targetOption.plainName}
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

                {/* Algorithm Options Form (from the element's catalogue) */}
                {algorithmOptions.length > 0 && (
                    <>
                        {/* Show divider only if not already shown by source node section */}
                        {!selectedAlgorithm?.sourceOption && (
                            <Divider
                                label="Options"
                                labelPosition="center"
                                styles={{
                                    label: { color: "var(--mantine-color-gray-5)" },
                                }}
                            />
                        )}

                        <OptionsForm
                            options={algorithmOptions}
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
