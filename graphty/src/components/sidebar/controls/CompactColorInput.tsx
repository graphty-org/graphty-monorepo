import {ActionIcon, Box, ColorPicker, ColorSwatch, Group, NumberInput, Popover, Stack, Text, TextInput} from "@mantine/core";
import React, {useEffect, useState} from "react";

export interface CompactColorInputProps {
    /** Hex color value (e.g., "#5B8FF9") */
    color: string;
    /** Opacity value from 0-100 */
    opacity: number;
    /** Called when color changes */
    onColorChange: (color: string) => void;
    /** Called when opacity changes */
    onOpacityChange: (opacity: number) => void;
    /** Called when both color and opacity change together (from color picker) */
    onColorAndOpacityChange?: (color: string, opacity: number) => void;
    /** Optional label displayed above the input */
    label?: string;
}

/**
 * Compact color input with connected swatch, hex input, and opacity.
 * Figma-style layout: [color swatch] [hex input] | [opacity%]
 */
export function CompactColorInput({
    color,
    opacity,
    onColorChange,
    onOpacityChange,
    onColorAndOpacityChange,
    label,
}: CompactColorInputProps): React.JSX.Element {
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    // Local state for hex input to prevent focus loss during typing
    const [localHex, setLocalHex] = useState(color.replace("#", "").toUpperCase());

    // Local state for opacity input to prevent focus loss during typing
    const [localOpacity, setLocalOpacity] = useState<string | number>(opacity);

    // Sync local hex state when prop changes (e.g., from color picker)
    useEffect(() => {
        setLocalHex(color.replace("#", "").toUpperCase());
    }, [color]);

    // Sync local opacity state when prop changes
    useEffect(() => {
        setLocalOpacity(opacity);
    }, [opacity]);

    // Handle color picker change - parses HEXA format and updates both hex and opacity
    const handleColorPickerChange = (hexaColor: string): void => {
        // HEXA format is #RRGGBBAA where AA is alpha (00-FF)
        if (hexaColor.length === 9) {
            // Has alpha channel
            const hex = hexaColor.slice(0, 7).toUpperCase();
            const alphaHex = hexaColor.slice(7, 9);
            const newAlpha = Math.round((parseInt(alphaHex, 16) / 255) * 100);

            // Use combined callback if available to avoid race condition
            // (calling both onColorChange and onOpacityChange separately causes
            // the second call to overwrite the first due to stale props)
            if (onColorAndOpacityChange) {
                onColorAndOpacityChange(hex, newAlpha);
            } else {
                // Fallback: only call one callback to avoid race condition
                // Prefer color change, opacity can be adjusted separately
                onColorChange(hex);
            }
        } else {
            // No alpha, just hex
            onColorChange(hexaColor.toUpperCase());
        }
    };

    // Combine current hex and opacity into HEXA format for ColorPicker
    const getHexaValue = (): string => {
        const alphaHex = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0");
        return `${color}${alphaHex}`.toUpperCase();
    };

    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        // Update local state freely to allow typing
        setLocalHex(e.currentTarget.value.toUpperCase());
    };

    const handleHexInputBlur = (): void => {
        let hex = localHex.toUpperCase();
        // Add # if missing for validation
        if (hex && !hex.startsWith("#")) {
            hex = `#${hex}`;
        }

        // Only commit if valid hex and different from current value
        if (/^#[0-9A-F]{6}$/i.test(hex) && hex !== color) {
            onColorChange(hex);
        } else {
            // Reset to current value if invalid
            setLocalHex(color.replace("#", "").toUpperCase());
        }
    };

    const handleLocalOpacityChange = (newOpacity: string | number): void => {
        setLocalOpacity(newOpacity);
    };

    const handleOpacityBlur = (): void => {
        const opacityValue = typeof localOpacity === "string" ? parseFloat(localOpacity) : localOpacity;
        if (!isNaN(opacityValue)) {
            const clampedOpacity = Math.min(100, Math.max(0, opacityValue));
            if (clampedOpacity !== opacity) {
                onOpacityChange(clampedOpacity);
            }
        } else {
            // Reset to current value if invalid
            setLocalOpacity(opacity);
        }
    };

    const colorInput = (
        <Group gap={0}>
            {/* Color swatch with popover */}
            <Popover
                opened={colorPickerOpen}
                onChange={setColorPickerOpen}
                position="bottom-start"
                shadow="md"
            >
                <Popover.Target>
                    <ActionIcon
                        variant="filled"
                        size={24}
                        radius={0}
                        style={{
                            backgroundColor: "var(--mantine-color-dark-8)",
                            borderRadius: "4px 0 0 4px",
                        }}
                        onClick={() => {
                            setColorPickerOpen((o) => !o);
                        }}
                        aria-label="Color swatch"
                    >
                        <ColorSwatch
                            color={color}
                            size={14}
                            radius={2}
                            style={{
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}
                        />
                    </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown p="xs">
                    <ColorPicker
                        format="hexa"
                        value={getHexaValue()}
                        onChange={handleColorPickerChange}
                        swatches={[
                            "#5B8FF9FF",
                            "#FF6B6BFF",
                            "#61D095FF",
                            "#F7B731FF",
                            "#9B59B6FF",
                            "#5B8FF980",
                            "#FF6B6B80",
                            "#61D09580",
                            "#F7B73180",
                            "#9B59B680",
                        ]}
                    />
                </Popover.Dropdown>
            </Popover>

            {/* Hex input */}
            <TextInput
                size="compact"
                value={localHex}
                onChange={handleHexInputChange}
                onBlur={handleHexInputBlur}
                aria-label="Color hex value"
                w={72}
                styles={{
                    input: {
                        borderRadius: 0,
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                    },
                }}
            />

            {/* Separator */}
            <Box
                style={{
                    width: 1,
                    height: 24,
                    backgroundColor: "var(--mantine-color-dark-5)",
                }}
            />

            {/* Opacity input */}
            <NumberInput
                size="compact"
                value={localOpacity}
                onChange={handleLocalOpacityChange}
                onBlur={handleOpacityBlur}
                min={0}
                max={100}
                hideControls
                suffix="%"
                aria-label="Opacity"
                w={54}
                styles={{
                    input: {
                        borderRadius: "0 4px 4px 0",
                        textAlign: "right",
                    },
                }}
            />
        </Group>
    );

    // If label is provided, wrap in a Stack with the label
    if (label) {
        return (
            <Stack gap={0}>
                <Text size="xs" c="dark.2" mb={1} lh={1.2}>{label}</Text>
                {colorInput}
            </Stack>
        );
    }

    return colorInput;
}
