import { ActionIcon, Box, ColorInput, Group, Slider, Stack, Text } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { Minus, Plus } from "lucide-react";
import React from "react";

import { DEFAULT_GRADIENT_STOP_COLOR } from "../constants/colors";
import type { ColorStop, GradientEditorProps } from "../types";
import { createColorStop, createDefaultGradientStops } from "../utils/color-stops";

/**
 * Editor for gradient color stops with optional direction control.
 * Supports both controlled and uncontrolled modes.
 * Allows adding/removing color stops and adjusting their positions.
 * @param root0 - Component props
 * @param root0.stops - Array of color stops (controlled mode)
 * @param root0.defaultStops - Default stops for uncontrolled mode
 * @param root0.direction - Gradient direction in degrees (controlled mode)
 * @param root0.defaultDirection - Default direction for uncontrolled mode
 * @param root0.showDirection - Whether to show direction control
 * @param root0.onChange - Called when stops or direction change (optional for uncontrolled mode)
 * @returns The gradient editor component
 */
export function GradientEditor({
    stops,
    defaultStops,
    direction,
    defaultDirection = 0,
    showDirection = true,
    onChange,
}: GradientEditorProps): React.JSX.Element {
    // Use Mantine's useUncontrolled for controlled/uncontrolled support
    const [_stops, handleStopsChange] = useUncontrolled<ColorStop[]>({
        value: stops,
        defaultValue: defaultStops,
        finalValue: createDefaultGradientStops(),
        onChange: (newStops) => onChange?.(newStops, _direction),
    });

    const [_direction, handleDirectionChange] = useUncontrolled<number>({
        value: direction,
        defaultValue: defaultDirection,
        finalValue: 0,
        onChange: (newDirection) => onChange?.(_stops, newDirection),
    });

    const handleStopColorChange = (index: number, color: string): void => {
        const newStops = [..._stops];
        newStops[index] = { ...newStops[index], color };
        handleStopsChange(newStops);
        onChange?.(newStops, _direction);
    };

    const handleStopOffsetChange = (index: number, offset: number): void => {
        const newStops = [..._stops];
        newStops[index] = { ...newStops[index], offset: offset / 100 };
        handleStopsChange(newStops);
        onChange?.(newStops, _direction);
    };

    const handleDirectionSliderChange = (newDirection: number): void => {
        handleDirectionChange(newDirection);
        onChange?.(_stops, newDirection);
    };

    const addStop = (): void => {
        if (_stops.length >= 5) {
            return;
        }

        const newOffset = _stops.length > 0 ? (_stops[_stops.length - 1].offset + 1) / 2 : 0.5;
        const newStops = [..._stops, createColorStop(newOffset, DEFAULT_GRADIENT_STOP_COLOR)];
        newStops.sort((a, b) => a.offset - b.offset);
        handleStopsChange(newStops);
        onChange?.(newStops, _direction);
    };

    const removeStop = (index: number): void => {
        if (_stops.length <= 2) {
            return;
        }

        const newStops = _stops.filter((_, i) => i !== index);
        handleStopsChange(newStops);
        onChange?.(newStops, _direction);
    };

    return (
        <Stack gap="xs">
            <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                    Color Stops
                </Text>
                <ActionIcon
                    size="compact"
                    variant="subtle"
                    color="gray"
                    onClick={addStop}
                    disabled={_stops.length >= 5}
                    aria-label="Add color stop"
                >
                    <Plus size={12} />
                </ActionIcon>
            </Group>

            {_stops.map((stop, index) => (
                <Group key={stop.id} gap="xs" align="flex-end">
                    <Box style={{ flex: 1 }}>
                        <ColorInput
                            size="compact"
                            value={stop.color}
                            onChange={(color) => {
                                handleStopColorChange(index, color);
                            }}
                            aria-label={`Color stop ${index + 1}`}
                        />
                    </Box>
                    <Box style={{ width: "80px" }}>
                        <Slider
                            size="compact"
                            min={0}
                            max={100}
                            value={stop.offset * 100}
                            onChange={(value) => {
                                handleStopOffsetChange(index, value);
                            }}
                            label={(value) => `${Math.round(value)}%`}
                            aria-label={`Stop ${index + 1} position`}
                        />
                    </Box>
                    <ActionIcon
                        size="compact"
                        variant="subtle"
                        color="gray"
                        onClick={() => {
                            removeStop(index);
                        }}
                        disabled={_stops.length <= 2}
                        aria-label={`Remove color stop ${index + 1}`}
                    >
                        <Minus size={12} />
                    </ActionIcon>
                </Group>
            ))}

            {showDirection && (
                <Box>
                    <Text size="xs" c="dimmed" mb={4}>
                        Direction
                    </Text>
                    <Slider
                        size="compact"
                        min={0}
                        max={360}
                        value={_direction}
                        onChange={handleDirectionSliderChange}
                        label={(value) => `${value}°`}
                        aria-label="Gradient direction"
                        marks={[
                            { value: 0, label: "0°" },
                            { value: 90, label: "90°" },
                            { value: 180, label: "180°" },
                            { value: 270, label: "270°" },
                            { value: 360, label: "360°" },
                        ]}
                    />
                </Box>
            )}
        </Stack>
    );
}
