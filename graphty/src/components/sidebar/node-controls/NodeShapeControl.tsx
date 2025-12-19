import {Box, Group, NativeSelect, NumberInput} from "@mantine/core";
import {ChevronDown} from "lucide-react";
import React, {useEffect, useState} from "react";

import {NODE_SHAPE_OPTIONS} from "../../../constants/style-options";

export interface ShapeConfig {
    type: string;
    size: number;
}

interface NodeShapeControlProps {
    value: ShapeConfig;
    onChange: (value: ShapeConfig) => void;
}

/**
 * Control for selecting node shape and size.
 * Displays shapes in grouped categories (Basic, Platonic, Spherical, Other).
 */
export function NodeShapeControl({value, onChange}: NodeShapeControlProps): React.JSX.Element {
    // Local state for size to prevent focus loss during typing
    const [localSize, setLocalSize] = useState<string | number>(value.size);

    // Sync local state when prop changes (e.g., from external updates)
    useEffect(() => {
        setLocalSize(value.size);
    }, [value.size]);

    const handleShapeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ... value,
            type: event.currentTarget.value,
        });
    };

    const handleSizeChange = (newSize: string | number): void => {
        setLocalSize(newSize);
    };

    const handleSizeBlur = (): void => {
        const size = typeof localSize === "string" ? parseFloat(localSize) || value.size : localSize;
        if (size !== value.size) {
            onChange({
                ... value,
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
            <Box style={{flex: 1}}>
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
            <Box style={{flex: 1}}>
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
