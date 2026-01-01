import { Box, Group, NativeSelect, NumberInput, Stack } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import React from "react";

import { LINE_TYPE_OPTIONS } from "../../../constants/style-options";
import { useLocalValue } from "../../../hooks";
import type { EdgeLineConfig, EdgeLineType } from "../../../types/style-layer";
import { CompactColorInput } from "../controls/CompactColorInput";

interface EdgeLineControlProps {
    value: EdgeLineConfig;
    onChange: (value: EdgeLineConfig) => void;
}

/**
 * Control for configuring edge line appearance.
 * Includes line type, width, and color with opacity.
 * @param root0 - Component props
 * @param root0.value - The current edge line configuration
 * @param root0.onChange - Called when the edge line configuration changes
 * @returns The edge line control component
 */
export function EdgeLineControl({ value, onChange }: EdgeLineControlProps): React.JSX.Element {
    const {
        localValue: localWidth,
        setLocalValue: setLocalWidth,
        commitValue: commitWidth,
    } = useLocalValue(value.width, value.width);

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ...value,
            type: event.currentTarget.value as EdgeLineType,
        });
    };

    const handleWidthChange = (newWidth: string | number): void => {
        setLocalWidth(newWidth);
    };

    const handleWidthBlur = (): void => {
        const width = commitWidth();
        if (width !== value.width) {
            onChange({
                ...value,
                width,
            });
        }
    };

    const handleColorChange = (color: string): void => {
        onChange({
            ...value,
            color,
        });
    };

    const handleOpacityChange = (opacity: number): void => {
        onChange({
            ...value,
            opacity,
        });
    };

    const handleColorAndOpacityChange = (color: string, opacity: number): void => {
        onChange({
            ...value,
            color,
            opacity,
        });
    };

    return (
        <Stack gap={4}>
            <Group gap={4} grow align="flex-end">
                <Box style={{ flex: 1 }}>
                    <NativeSelect
                        label="Line Type"
                        value={value.type}
                        onChange={handleTypeChange}
                        data={LINE_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                        size="compact"
                        rightSection={<ChevronDown size={14} />}
                        rightSectionPointerEvents="none"
                    />
                </Box>
                <Box style={{ flex: 1 }}>
                    <NumberInput
                        label="Width"
                        value={localWidth}
                        onChange={handleWidthChange}
                        onBlur={handleWidthBlur}
                        min={0.1}
                        step={0.1}
                        decimalScale={1}
                        hideControls
                        size="compact"
                    />
                </Box>
            </Group>
            <CompactColorInput
                label="Color"
                color={value.color}
                opacity={value.opacity}
                onColorChange={handleColorChange}
                onOpacityChange={handleOpacityChange}
                onColorAndOpacityChange={handleColorAndOpacityChange}
            />
        </Stack>
    );
}
