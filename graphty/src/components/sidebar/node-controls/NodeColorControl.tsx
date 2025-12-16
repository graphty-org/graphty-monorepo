import {Box, SegmentedControl, Stack, Text} from "@mantine/core";
import React from "react";

import type {ColorConfig, ColorMode, ColorStop} from "../../../types/style-layer";
import {CompactColorInput} from "../controls/CompactColorInput";
import {GradientEditor} from "../controls/GradientEditor";

// Re-export types for backwards compatibility
export type {ColorConfig, ColorMode, ColorStop} from "../../../types/style-layer";
export type {GradientColorConfig, RadialColorConfig, SolidColorConfig} from "../../../types/style-layer";

interface NodeColorControlProps {
    value: ColorConfig;
    onChange: (value: ColorConfig) => void;
}

/**
 * Control for node color with solid, gradient, and radial modes.
 * Figma-style layout with color swatch + hex + opacity on same line.
 */
export function NodeColorControl({value, onChange}: NodeColorControlProps): React.JSX.Element {
    const handleModeChange = (newMode: string): void => {
        const mode = newMode as ColorMode;

        if (mode === value.mode) {
            return;
        }

        if (mode === "solid") {
            const color = value.mode === "solid" ? value.color : (value.stops[0]?.color ?? "#5b8ff9");
            onChange({
                mode: "solid",
                color,
                opacity: value.opacity,
            });
        } else if (mode === "gradient") {
            const stops =
                value.mode === "solid" ?
                    [{offset: 0, color: value.color}, {offset: 1, color: "#ffffff"}] :
                    value.stops;
            onChange({
                mode: "gradient",
                stops,
                direction: 0,
                opacity: value.opacity,
            });
        } else {
            const stops =
                value.mode === "solid" ?
                    [{offset: 0, color: value.color}, {offset: 1, color: "#ffffff"}] :
                    value.stops;
            onChange({
                mode: "radial",
                stops,
                opacity: value.opacity,
            });
        }
    };

    const handleColorChange = (color: string): void => {
        if (value.mode === "solid") {
            onChange({... value, color});
        }
    };

    const handleOpacityChange = (opacityPercent: number): void => {
        onChange({... value, opacity: opacityPercent / 100});
    };

    // Combined handler for color picker to update both color and opacity atomically
    const handleColorAndOpacityChange = (color: string, opacityPercent: number): void => {
        if (value.mode === "solid") {
            onChange({
                ... value,
                color,
                opacity: opacityPercent / 100,
            });
        }
    };

    const handleGradientChange = (stops: ColorStop[], direction?: number): void => {
        if (value.mode === "gradient") {
            onChange({
                ... value,
                stops,
                direction: direction ?? value.direction,
            });
        } else if (value.mode === "radial") {
            onChange({
                ... value,
                stops,
            });
        }
    };

    return (
        <Stack gap={4}>
            {/* Color Mode selector */}
            <Box>
                <Text size="xs" c="dimmed" mb={1} lh={1.2}>Color Mode</Text>
                <SegmentedControl
                    value={value.mode}
                    onChange={handleModeChange}
                    data={[
                        {value: "solid", label: "Solid"},
                        {value: "gradient", label: "Gradient"},
                        {value: "radial", label: "Radial"},
                    ]}
                    size="compact"
                    fullWidth
                />
            </Box>

            {/* Solid color: Figma-style color input */}
            {value.mode === "solid" && (
                <CompactColorInput
                    label="Color"
                    color={value.color}
                    opacity={Math.round(value.opacity * 100)}
                    onColorChange={handleColorChange}
                    onOpacityChange={handleOpacityChange}
                    onColorAndOpacityChange={handleColorAndOpacityChange}
                />
            )}

            {/* Gradient/Radial editor */}
            {(value.mode === "gradient" || value.mode === "radial") && (
                <GradientEditor
                    stops={value.stops}
                    direction={value.mode === "gradient" ? value.direction : undefined}
                    showDirection={value.mode === "gradient"}
                    onChange={handleGradientChange}
                />
            )}
        </Stack>
    );
}
