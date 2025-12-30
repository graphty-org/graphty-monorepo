import {Box, Group, NativeSelect, NumberInput, Stack} from "@mantine/core";
import {ChevronDown} from "lucide-react";
import React from "react";

import {ARROW_TYPE_OPTIONS} from "../../../constants/style-options";
import {useLocalValue} from "../../../hooks";
import type {ArrowConfig, ArrowType} from "../../../types/style-layer";
import {CompactColorInput} from "../controls/CompactColorInput";

interface EdgeArrowControlProps {
    label: string;
    value: ArrowConfig;
    onChange: (value: ArrowConfig) => void;
}

/**
 * Control for configuring edge arrow head or tail.
 * Shows size and color options only when type is not 'none'.
 */
export function EdgeArrowControl({label, value, onChange}: EdgeArrowControlProps): React.JSX.Element {
    const {
        localValue: localSize,
        setLocalValue: setLocalSize,
        commitValue: commitSize,
    } = useLocalValue(value.size, value.size);

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ... value,
            type: event.currentTarget.value as ArrowType,
        });
    };

    const handleSizeChange = (newSize: string | number): void => {
        setLocalSize(newSize);
    };

    const handleSizeBlur = (): void => {
        const size = commitSize();
        if (size !== value.size) {
            onChange({
                ... value,
                size,
            });
        }
    };

    const handleColorChange = (color: string): void => {
        onChange({
            ... value,
            color,
        });
    };

    const handleOpacityChange = (opacity: number): void => {
        onChange({
            ... value,
            opacity,
        });
    };

    const handleColorAndOpacityChange = (color: string, opacity: number): void => {
        onChange({
            ... value,
            color,
            opacity,
        });
    };

    const showOptions = value.type !== "none";

    return (
        <Stack gap={4}>
            <Group gap={4} grow align="flex-end">
                <Box style={{flex: 1}}>
                    <NativeSelect
                        label={`${label} Type`}
                        value={value.type}
                        onChange={handleTypeChange}
                        data={ARROW_TYPE_OPTIONS.map((opt) => ({value: opt.value, label: opt.label}))}
                        size="compact"
                        rightSection={<ChevronDown size={14} />}
                        rightSectionPointerEvents="none"
                    />
                </Box>
                {showOptions && (
                    <Box style={{flex: 1}}>
                        <NumberInput
                            label={`${label} Size`}
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
                )}
            </Group>
            {showOptions && (
                <CompactColorInput
                    label={`${label} Color`}
                    color={value.color}
                    opacity={value.opacity}
                    onColorChange={handleColorChange}
                    onOpacityChange={handleOpacityChange}
                    onColorAndOpacityChange={handleColorAndOpacityChange}
                />
            )}
        </Stack>
    );
}
