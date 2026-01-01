import { Box, Group, NativeSelect, NumberInput } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import React from "react";

import { NODE_SHAPE_OPTIONS } from "../../../constants/style-options";
import { useLocalValue } from "../../../hooks";
import type { ShapeConfig } from "../../../types/style-layer";

interface NodeShapeControlProps {
    value: ShapeConfig;
    onChange: (value: ShapeConfig) => void;
}

/**
 * Control for selecting node shape and size.
 * Displays shapes in grouped categories (Basic, Platonic, Spherical, Other).
 * @param root0 - Component props
 * @param root0.value - The current shape configuration
 * @param root0.onChange - Called when the shape configuration changes
 * @returns The node shape control component
 */
export function NodeShapeControl({ value, onChange }: NodeShapeControlProps): React.JSX.Element {
    const {
        localValue: localSize,
        setLocalValue: setLocalSize,
        commitValue: commitSize,
    } = useLocalValue(value.size, value.size);

    const handleShapeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ...value,
            type: event.currentTarget.value,
        });
    };

    const handleSizeChange = (newSize: string | number): void => {
        setLocalSize(newSize);
    };

    const handleSizeBlur = (): void => {
        const size = commitSize();
        if (size !== value.size) {
            onChange({
                ...value,
                size,
            });
        }
    };

    // Build options with groups for NativeSelect
    const selectData = NODE_SHAPE_OPTIONS.map((group) => ({
        group: group.group,
        items: group.items.map((item) => ({
            value: item.value,
            label: item.label,
        })),
    }));

    return (
        <Group gap={4} grow align="flex-end">
            <Box style={{ flex: 1 }}>
                <NativeSelect
                    label="Shape Type"
                    value={value.type}
                    onChange={handleShapeChange}
                    data={selectData}
                    size="compact"
                    rightSection={<ChevronDown size={14} />}
                    rightSectionPointerEvents="none"
                />
            </Box>
            <Box style={{ flex: 1 }}>
                <NumberInput
                    label="Size"
                    value={localSize}
                    onChange={handleSizeChange}
                    onBlur={handleSizeBlur}
                    min={0.1}
                    step={0.1}
                    decimalScale={1}
                    hideControls
                    size="compact"
                />
            </Box>
        </Group>
    );
}
