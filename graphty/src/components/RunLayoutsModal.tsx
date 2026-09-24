import { Button, Divider, Group, Modal, Radio, Select, Stack, Text } from "@mantine/core";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    CATEGORY_LABELS,
    getLayoutCategories,
    getLayoutMetadata,
    LAYOUT_METADATA,
    type LayoutMetadata,
} from "../data/layoutMetadata";
import { standardModalStyles } from "../utils/modal-styles";
import { optionDefaults, OptionsForm } from "./options";

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
    return getLayoutCategories().map((category) => ({
        group: CATEGORY_LABELS[category],
        items: LAYOUT_METADATA.filter((layout) => layout.category === category).map((layout) => ({
            value: layout.type,
            label: layout.label,
        })),
    }));
}

/**
 * Read a list of names as a sentence.
 * @param names - The names to join.
 * @returns "a", "a and b", or "a, b and c".
 */
function asSentence(names: readonly string[]): string {
    if (names.length < 2) {
        return names[0] ?? "";
    }

    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Say what the selected layout still needs, in the catalogue's own words.
 *
 * Two different gaps, and the difference matters: an option the engine declares with no default
 * stops the layout running at all, while a structural input the arrangement reads but publishes
 * no option for only means the engine falls back on its own split. Both come from the
 * catalogue, so a layout that gains an option to fill one of these gaps stops warning about it
 * without anyone editing this file.
 * @param metadata - The selected layout, or undefined when nothing is selected.
 * @returns The warning to show, or null when there is nothing to say.
 */
function layoutWarning(metadata: LayoutMetadata | undefined): string | null {
    if (!metadata) {
        return null;
    }

    if (metadata.requiredFields.length > 0) {
        const names = metadata.requiredFields.map(
            (name) => metadata.options.find((option) => option.name === name)?.plainName ?? name,
        );

        return `This layout requires ${asSentence(names)}, and choosing one here is not available yet.`;
    }

    if (metadata.unsupplied.length > 0) {
        return `This layout arranges the graph by ${asSentence(metadata.unsupplied)}, and choosing that here is not available yet, so the default is used.`;
    }

    return null;
}

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

    // A layout with an option the engine declares and gives no default for cannot run until
    // something fills that option in, and nothing here can.
    const hasRequiredFields = (selectedLayoutMetadata?.requiredFields.length ?? 0) > 0;
    const requiredFieldWarning = layoutWarning(selectedLayoutMetadata);

    // The options the selected engine declares, straight from the element's catalogue.
    const layoutOptions = useMemo(() => selectedLayoutMetadata?.options ?? [], [selectedLayoutMetadata]);
    const hiddenFields = useMemo(() => selectedLayoutMetadata?.hiddenFields ?? [], [selectedLayoutMetadata]);
    const schemaDefaults = useMemo(() => optionDefaults(layoutOptions), [layoutOptions]);

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
                {layoutOptions.length > 0 && (
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
                        <OptionsForm
                            options={layoutOptions}
                            values={configValues}
                            onChange={handleConfigChange}
                            showAdvanced
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
