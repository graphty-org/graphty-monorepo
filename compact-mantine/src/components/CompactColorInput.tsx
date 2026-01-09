import {
    ActionIcon,
    Box,
    ColorPicker,
    ColorSwatch,
    Group,
    NumberInput,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { SWATCH_COLORS_HEXA } from "../constants/colors";
import type { CompactColorInputProps } from "../types";
import { opacityToAlphaHex, parseAlphaFromHexa } from "../utils/color-utils";
import { Popout } from "./popout";

/**
 * Compact color input with optional opacity support.
 * Supports both controlled and uncontrolled modes.
 * Shows muted styling when using default values, with reset button when explicit.
 * Figma-style layout: [color swatch] [hex input] | [opacity%] [reset]
 * @param root0 - Component props
 * @param root0.color - Hex color value - undefined means using defaultColor
 * @param root0.defaultColor - Default color shown when color is undefined
 * @param root0.opacity - Opacity value 0-100 - undefined means using defaultOpacity
 * @param root0.defaultOpacity - Default opacity shown when opacity is undefined
 * @param root0.onColorChange - Called when color changes (optional for uncontrolled mode)
 * @param root0.onOpacityChange - Called when opacity changes (optional for uncontrolled mode)
 * @param root0.label - Optional label displayed above the input
 * @param root0.showOpacity - Control visibility of opacity input
 * @returns The compact color input component
 */
export function CompactColorInput({
    color,
    defaultColor,
    opacity,
    defaultOpacity = 100,
    onColorChange,
    onOpacityChange,
    label,
    showOpacity = true,
}: CompactColorInputProps): React.JSX.Element {
    // Use Mantine's useUncontrolled for controlled/uncontrolled support
    // undefined means "using default"
    const [_color, handleColorChange] = useUncontrolled<string | undefined>({
        value: color,
        defaultValue: undefined,
        finalValue: undefined,
        onChange: onColorChange,
    });

    const [_opacity, handleOpacityChange] = useUncontrolled<number | undefined>({
        value: opacity,
        defaultValue: undefined,
        finalValue: undefined,
        onChange: onOpacityChange,
    });

    // Determine if using defaults
    const isColorDefault = _color === undefined;
    const isOpacityDefault = _opacity === undefined;
    const isDefault = isColorDefault && (!showOpacity || isOpacityDefault);

    // Display values (use defaults when undefined)
    const displayColor = _color ?? defaultColor;
    const displayOpacity = _opacity ?? defaultOpacity;

    // Local state for hex input to prevent focus loss during typing
    const [localHex, setLocalHex] = useState(displayColor.replace("#", "").toUpperCase());

    // Local state for opacity input to prevent focus loss during typing
    const [localOpacity, setLocalOpacity] = useState<string | number>(displayOpacity);

    // Sync local hex state when value changes (e.g., from color picker)
    useEffect(() => {
        setLocalHex(displayColor.replace("#", "").toUpperCase());
    }, [displayColor]);

    // Sync local opacity state when value changes
    useEffect(() => {
        setLocalOpacity(displayOpacity);
    }, [displayOpacity]);

    // Handle color picker change - parses HEXA format and updates both hex and opacity
    const handleColorPickerChangeInternal = (hexaColor: string): void => {
        // HEXA format is #RRGGBBAA where AA is alpha (00-FF)
        if (hexaColor.length === 9) {
            // Has alpha channel
            const hex = hexaColor.slice(0, 7).toUpperCase();
            const alphaHex = hexaColor.slice(7, 9);
            const newAlpha = parseAlphaFromHexa(alphaHex);

            handleColorChange(hex);
            if (showOpacity) {
                handleOpacityChange(newAlpha);
            }
        } else {
            // No alpha, just hex
            handleColorChange(hexaColor.toUpperCase());
        }
    };

    // Combine current hex and opacity into HEXA format for ColorPicker
    const getHexaValue = (): string => {
        const alphaHex = opacityToAlphaHex(displayOpacity);
        return `${displayColor}${alphaHex}`.toUpperCase();
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

        // Only commit if valid hex and different from current display value
        if (/^#[0-9A-F]{6}$/i.test(hex) && hex !== displayColor) {
            handleColorChange(hex);
        } else {
            // Reset to current display value if invalid
            setLocalHex(displayColor.replace("#", "").toUpperCase());
        }
    };

    const handleLocalOpacityChange = (newOpacity: string | number): void => {
        setLocalOpacity(newOpacity);
    };

    const handleOpacityBlur = (): void => {
        const opacityValue = typeof localOpacity === "string" ? parseFloat(localOpacity) : localOpacity;
        if (!isNaN(opacityValue)) {
            const clampedOpacity = Math.min(100, Math.max(0, opacityValue));
            if (clampedOpacity !== displayOpacity) {
                handleOpacityChange(clampedOpacity);
            }
        } else {
            // Reset to current display value if invalid
            setLocalOpacity(displayOpacity);
        }
    };

    const handleReset = (): void => {
        handleColorChange(undefined);
        if (showOpacity) {
            handleOpacityChange(undefined);
        }
    };

    const colorInput = (
        <Group gap={4} wrap="nowrap">
            <Group gap={0}>
                {/* Color swatch with popout panel */}
                <Popout>
                    <Popout.Trigger>
                        <ActionIcon
                            variant="filled"
                            size={24}
                            radius={0}
                            style={{
                                backgroundColor: "var(--mantine-color-default)",
                                borderRadius: "4px 0 0 4px",
                            }}
                            aria-label="Color swatch"
                        >
                            <ColorSwatch
                                color={displayColor}
                                size={14}
                                radius={2}
                                style={{
                                    border: "1px solid var(--mantine-color-default-border)",
                                }}
                            />
                        </ActionIcon>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={220}
                        header={{ variant: "title", title: label ?? "Color" }}
                        placement="bottom"
                        alignment="start"
                        gap={4}
                    >
                        <Popout.Content>
                            <ColorPicker
                                format="hexa"
                                value={getHexaValue()}
                                onChange={handleColorPickerChangeInternal}
                                swatches={[...SWATCH_COLORS_HEXA]}
                            />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>

                {/* Hex input */}
                <TextInput
                    value={localHex}
                    onChange={handleHexInputChange}
                    onBlur={handleHexInputBlur}
                    aria-label="Color hex value"
                    data-is-default={isColorDefault ? "true" : "false"}
                    w={72}
                    styles={{
                        input: {
                            borderRadius: showOpacity ? 0 : "0 4px 4px 0",
                            fontFamily: "monospace",
                            textTransform: "uppercase",
                            ...(isColorDefault
                                ? {
                                      fontStyle: "italic",
                                      color: "var(--mantine-color-dimmed)",
                                  }
                                : {}),
                        },
                    }}
                />

                {showOpacity && (
                    <>
                        {/* Separator */}
                        <Box
                            style={{
                                width: 1,
                                height: 24,
                                backgroundColor: "var(--mantine-color-default-border)",
                            }}
                        />

                        {/* Opacity input */}
                        <NumberInput
                            value={localOpacity}
                            onChange={handleLocalOpacityChange}
                            onBlur={handleOpacityBlur}
                            min={0}
                            max={100}
                            hideControls
                            suffix="%"
                            aria-label="Opacity"
                            data-is-default={isOpacityDefault ? "true" : "false"}
                            w={54}
                            styles={{
                                input: {
                                    borderRadius: "0 4px 4px 0",
                                    textAlign: "right",
                                    ...(isOpacityDefault
                                        ? {
                                              fontStyle: "italic",
                                              color: "var(--mantine-color-dimmed)",
                                          }
                                        : {}),
                                },
                            }}
                        />
                    </>
                )}
            </Group>

            {/* Reset button - only shown when not using defaults */}
            {!isDefault && (
                <ActionIcon
                    variant="subtle"
                    size="xs"
                    c="dimmed"
                    aria-label={`Reset ${label ?? "color"} to default`}
                    onClick={handleReset}
                >
                    <X size={12} />
                </ActionIcon>
            )}
        </Group>
    );

    // If label is provided, wrap in a Stack with the label
    if (label) {
        return (
            <Stack gap={0}>
                <Text size="xs" c="dimmed" mb={1} lh={1.2}>
                    {label}
                </Text>
                {colorInput}
            </Stack>
        );
    }

    return colorInput;
}
