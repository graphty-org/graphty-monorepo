import { Button, Divider, Group, Modal, Radio, Select, Stack, Text } from "@mantine/core";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CATEGORY_LABELS, getLayoutMetadata, LAYOUT_METADATA, type LayoutMetadata } from "../data/layoutMetadata";
import { getHiddenFields, getLayoutSchema } from "../data/layoutSchemas";
import { standardModalStyles } from "../utils/modal-styles";
import { getDefaultValues } from "../utils/zodSchemaParser";
import { LayoutOptionsForm } from "./layout-options/LayoutOptionsForm";

interface RunLayoutsModalProps {
    opened: boolean;
    onClose: () => void;
    onApply: (layoutType: string, config: Record<string, unknown>) => void;
    is2DMode: boolean;
    currentLayout?: string;
    currentLayoutConfig?: Record<string, unknown>;
}

/**
 * Group layouts by category for the dropdown.
 * @returns Grouped layout options for the select input
 */
function getGroupedLayoutOptions(): { group: string; items: { value: string; label: string }[] }[] {
    const categories: LayoutMetadata["category"][] = ["force", "geometric", "hierarchical", "special"];

    return categories.map((category) => ({
        group: CATEGORY_LABELS[category],
        items: LAYOUT_METADATA.filter((layout) => layout.category === category).map((layout) => ({
            value: layout.type,
            label: layout.label,
        })),
    }));
}

/**
 * Warning messages for layouts that require special configuration
 */
const REQUIRED_FIELD_WARNINGS: Record<string, string> = {
    bipartite: "This layout requires node selection. Advanced configuration is not yet available.",
    bfs: "This layout requires a starting node. Advanced configuration is not yet available.",
    multipartite: "This layout requires subset key configuration. Advanced configuration is not yet available.",
};

/**
 * Modal for selecting and configuring layout algorithms.
 * @param root0 - Component props
 * @param root0.opened - Whether the modal is open
 * @param root0.onClose - Close the modal
 * @param root0.onApply - Called when a layout is applied
 * @param root0.is2DMode - Whether the graph is in 2D mode
 * @param root0.currentLayout - The currently active layout
 * @param root0.currentLayoutConfig - Configuration for the current layout
 * @returns The run layouts modal component
 */
export function RunLayoutsModal({
    opened,
    onClose,
    onApply,
    is2DMode,
    currentLayout,
    currentLayoutConfig,
}: RunLayoutsModalProps): React.JSX.Element {
    const [selectedLayoutType, setSelectedLayoutType] = useState<string>("d3");
    const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
    const [selectedDim, setSelectedDim] = useState<2 | 3>(is2DMode ? 2 : 3);
    const selectRef = useRef<HTMLInputElement>(null);

    const selectedLayoutMetadata = getLayoutMetadata(selectedLayoutType);
    const groupedLayoutOptions = getGroupedLayoutOptions();

    // Check if the selected layout has required fields that prevent usage
    const hasRequiredFields =
        selectedLayoutMetadata?.requiredFields && selectedLayoutMetadata.requiredFields.length > 0;
    const requiredFieldWarning = REQUIRED_FIELD_WARNINGS[selectedLayoutType] ?? null;

    // Get the schema and hidden fields for the selected layout
    const layoutSchema = useMemo(() => getLayoutSchema(selectedLayoutType), [selectedLayoutType]);
    const hiddenFields = useMemo(() => getHiddenFields(selectedLayoutType), [selectedLayoutType]);

    // Get default values from the schema
    const schemaDefaults = useMemo(() => {
        if (!layoutSchema) {
            return {};
        }

        return getDefaultValues(layoutSchema);
    }, [layoutSchema]);

    // Determine if we should show dimension radio based on layout's maxDimensions
    const showDimensionRadio = selectedLayoutMetadata?.maxDimensions === 3;

    // Reset dimension when layout changes or is2DMode changes
    useEffect(() => {
        if (selectedLayoutMetadata) {
            if (is2DMode) {
                setSelectedDim(2);
            } else {
                setSelectedDim(selectedLayoutMetadata.maxDimensions === 3 ? 3 : 2);
            }
        }
    }, [selectedLayoutMetadata, is2DMode]);

    // Reset to current layout when modal opens and focus the select
    useEffect(() => {
        if (opened) {
            if (currentLayout) {
                setSelectedLayoutType(currentLayout);
                setConfigValues(currentLayoutConfig ?? {});
            } else {
                setSelectedLayoutType("d3");
                setConfigValues({});
            }

            // Focus the select after modal opens
            setTimeout(() => {
                selectRef.current?.focus();
            }, 0);
        }
    }, [opened, currentLayout, currentLayoutConfig]);

    // Handle config value changes from the form
    const handleConfigChange = useCallback((newValues: Record<string, unknown>) => {
        setConfigValues(newValues);
    }, []);

    const handleApply = useCallback(() => {
        // Merge schema defaults with user config values
        const finalConfig = { ...schemaDefaults, ...configValues };

        // Add dim based on selected dimension (respects user choice from radio)
        finalConfig.dim = selectedDim;

        onApply(selectedLayoutType, finalConfig);
        onClose();
    }, [selectedLayoutType, configValues, schemaDefaults, selectedDim, onApply, onClose]);

    const handleLayoutChange = useCallback((value: string | null) => {
        if (value) {
            setSelectedLayoutType(value);
            setConfigValues({});
        }
    }, []);

    const handleDimensionChange = useCallback((value: string) => {
        setSelectedDim(value === "3" ? 3 : 2);
    }, []);

    const handleResetToDefaults = useCallback(() => {
        setConfigValues({});
    }, []);

    return (
        <Modal opened={opened} onClose={onClose} title="Run Layout" size="md" centered styles={standardModalStyles}>
            <Stack gap="lg">
                {/* Layout Selection Dropdown */}
                <Select
                    ref={selectRef}
                    label="Layout Algorithm"
                    aria-label="Select layout algorithm"
                    placeholder="Select a layout"
                    value={selectedLayoutType}
                    onChange={handleLayoutChange}
                    data={groupedLayoutOptions}
                    searchable
                    styles={{
                        label: { color: "var(--mantine-color-dimmed)" },
                    }}
                />

                {/* Layout Description */}
                {selectedLayoutMetadata && (
                    <Text size="sm" c="gray.5">
                        {selectedLayoutMetadata.description}
                    </Text>
                )}

                {/* Required Fields Warning */}
                {requiredFieldWarning && (
                    <Group gap="xs" style={{ color: "var(--mantine-color-yellow-5)" }}>
                        <AlertTriangle size={16} />
                        <Text size="sm" c="yellow.5">
                            {requiredFieldWarning}
                        </Text>
                    </Group>
                )}

                {/* Dimension Radio - only show for layouts that support 3D */}
                {showDimensionRadio && (
                    <Radio.Group
                        name="dimensions"
                        label="Dimensions"
                        value={String(selectedDim)}
                        onChange={handleDimensionChange}
                        aria-label="Layout dimensions"
                    >
                        <Group mt="xs">
                            <Radio value="2" label="2D" />
                            <Radio value="3" label="3D" disabled={is2DMode} />
                        </Group>
                    </Radio.Group>
                )}

                {/* Layout Options Form */}
                {layoutSchema && (
                    <>
                        <Divider my="xs" />
                        <Group justify="space-between" align="center">
                            <Text size="sm" fw={500} c="gray.3">
                                Options
                            </Text>
                            <Button variant="subtle" color="gray" size="xs" onClick={handleResetToDefaults}>
                                Reset to Defaults
                            </Button>
                        </Group>
                        <LayoutOptionsForm
                            schema={layoutSchema}
                            values={configValues}
                            onChange={handleConfigChange}
                            hiddenFields={hiddenFields}
                        />
                    </>
                )}

                {/* Action Buttons */}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" color="gray" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply} leftSection={<Sparkles size={16} />} disabled={hasRequiredFields}>
                        Apply Layout
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
