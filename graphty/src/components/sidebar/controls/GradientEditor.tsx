import {ActionIcon, Box, ColorInput, Group, Slider, Stack, Text} from "@mantine/core";
import {Minus, Plus} from "lucide-react";
import React from "react";

import type {ColorStop} from "../../../types/style-layer";
import {createColorStop} from "../../../utils/color-stops";

// Re-export ColorStop for backwards compatibility
export type {ColorStop} from "../../../types/style-layer";

interface GradientEditorProps {
    stops: ColorStop[];
    direction?: number;
    showDirection?: boolean;
    onChange: (stops: ColorStop[], direction?: number) => void;
}

/**
 * Editor for gradient color stops with optional direction control.
 * Allows adding/removing color stops and adjusting their positions.
 */
export function GradientEditor({
    stops,
    direction = 0,
    showDirection = true,
    onChange,
}: GradientEditorProps): React.JSX.Element {
    const handleStopColorChange = (index: number, color: string): void => {
        const newStops = [... stops];
        newStops[index] = {... newStops[index], color};
        onChange(newStops, direction);
    };

    const handleStopOffsetChange = (index: number, offset: number): void => {
        const newStops = [... stops];
        newStops[index] = {... newStops[index], offset: offset / 100};
        onChange(newStops, direction);
    };

    const handleDirectionChange = (newDirection: number): void => {
        onChange(stops, newDirection);
    };

    const addStop = (): void => {
        if (stops.length >= 5) {
            return;
        }

        const newOffset = stops.length > 0 ? (stops[stops.length - 1].offset + 1) / 2 : 0.5;
        const newStops = [... stops, createColorStop(newOffset, "#888888")];
        newStops.sort((a, b) => a.offset - b.offset);
        onChange(newStops, direction);
    };

    const removeStop = (index: number): void => {
        if (stops.length <= 2) {
            return;
        }

        const newStops = stops.filter((_, i) => i !== index);
        onChange(newStops, direction);
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
                    disabled={stops.length >= 5}
                    aria-label="Add color stop"
                >
                    <Plus size={12} />
                </ActionIcon>
            </Group>

            {stops.map((stop, index) => (
                <Group key={stop.id} gap="xs" align="flex-end">
                    <Box style={{flex: 1}}>
                        <ColorInput
                            size="compact"
                            value={stop.color}
                            onChange={(color) => {
                                handleStopColorChange(index, color);
                            }}
                            aria-label={`Color stop ${index + 1}`}
                        />
                    </Box>
                    <Box style={{width: "80px"}}>
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
                        disabled={stops.length <= 2}
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
                        value={direction}
                        onChange={handleDirectionChange}
                        label={(value) => `${value}°`}
                        aria-label="Gradient direction"
                        marks={[
                            {value: 0, label: "0°"},
                            {value: 90, label: "90°"},
                            {value: 180, label: "180°"},
                            {value: 270, label: "270°"},
                        ]}
                    />
                </Box>
            )}
        </Stack>
    );
}
