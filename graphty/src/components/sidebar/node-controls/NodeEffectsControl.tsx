import {Checkbox, Group, NumberInput, Stack, Text} from "@mantine/core";
import React from "react";

import type {GlowConfig, NodeEffectsConfig, OutlineConfig} from "../../../types/style-layer";
import {DEFAULT_GLOW, DEFAULT_OUTLINE} from "../../../utils/style-defaults";
import {CompactColorInput} from "../controls/CompactColorInput";
import {EffectToggle} from "../controls/EffectToggle";

interface NodeEffectsControlProps {
    value: NodeEffectsConfig;
    onChange: (effects: NodeEffectsConfig) => void;
}

/**
 * Controls for node visual effects including glow, outline, wireframe, and flat shading.
 */
export function NodeEffectsControl({value, onChange}: NodeEffectsControlProps): React.JSX.Element {
    const glowEnabled = value.glow?.enabled ?? false;
    const outlineEnabled = value.outline?.enabled ?? false;

    const handleGlowToggle = (enabled: boolean): void => {
        if (enabled) {
            onChange({
                ... value,
                glow: {
                    ... DEFAULT_GLOW,
                    enabled: true,
                },
            });
        } else {
            onChange({
                ... value,
                glow: undefined,
            });
        }
    };

    const handleGlowColorChange = (color: string): void => {
        if (value.glow) {
            onChange({
                ... value,
                glow: {
                    ... value.glow,
                    color,
                },
            });
        }
    };

    const handleGlowStrengthChange = (strength: number): void => {
        if (value.glow) {
            onChange({
                ... value,
                glow: {
                    ... value.glow,
                    strength,
                },
            });
        }
    };

    const handleOutlineToggle = (enabled: boolean): void => {
        if (enabled) {
            onChange({
                ... value,
                outline: {
                    ... DEFAULT_OUTLINE,
                    enabled: true,
                },
            });
        } else {
            onChange({
                ... value,
                outline: undefined,
            });
        }
    };

    const handleOutlineColorChange = (color: string): void => {
        if (value.outline) {
            onChange({
                ... value,
                outline: {
                    ... value.outline,
                    color,
                },
            });
        }
    };

    const handleOutlineWidthChange = (width: number): void => {
        if (value.outline) {
            onChange({
                ... value,
                outline: {
                    ... value.outline,
                    width,
                },
            });
        }
    };

    const handleWireframeToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({
            ... value,
            wireframe: e.currentTarget.checked,
        });
    };

    const handleFlatShadedToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({
            ... value,
            flatShaded: e.currentTarget.checked,
        });
    };

    return (
        <Stack gap={8}>
            {/* Glow Effect */}
            <EffectToggle
                label="Glow"
                checked={glowEnabled}
                onChange={handleGlowToggle}
            >
                {value.glow && (
                    <GlowControls
                        glow={value.glow}
                        onColorChange={handleGlowColorChange}
                        onStrengthChange={handleGlowStrengthChange}
                    />
                )}
            </EffectToggle>

            {/* Outline Effect */}
            <EffectToggle
                label="Outline"
                checked={outlineEnabled}
                onChange={handleOutlineToggle}
            >
                {value.outline && (
                    <OutlineControls
                        outline={value.outline}
                        onColorChange={handleOutlineColorChange}
                        onWidthChange={handleOutlineWidthChange}
                    />
                )}
            </EffectToggle>

            {/* Simple checkboxes for wireframe and flat shaded */}
            <Checkbox
                label="Wireframe"
                checked={value.wireframe}
                onChange={handleWireframeToggle}
                size="xs"
                styles={{
                    label: {
                        fontSize: "11px",
                        paddingLeft: "4px",
                    },
                }}
            />

            <Checkbox
                label="Flat Shaded"
                checked={value.flatShaded}
                onChange={handleFlatShadedToggle}
                size="xs"
                styles={{
                    label: {
                        fontSize: "11px",
                        paddingLeft: "4px",
                    },
                }}
            />
        </Stack>
    );
}

interface GlowControlsProps {
    glow: GlowConfig;
    onColorChange: (color: string) => void;
    onStrengthChange: (strength: number) => void;
}

function GlowControls({glow, onColorChange, onStrengthChange}: GlowControlsProps): React.JSX.Element {
    const [localStrength, setLocalStrength] = React.useState<string | number>(glow.strength);

    React.useEffect(() => {
        setLocalStrength(glow.strength);
    }, [glow.strength]);

    return (
        <Stack gap={4}>
            <CompactColorInput
                label="Color"
                color={glow.color}
                opacity={100}
                onColorChange={onColorChange}
                onOpacityChange={() => {
                    // Effects don't use opacity
                }}
            />
            <Group gap={8} align="flex-end">
                <Stack gap={0} style={{flex: 1}}>
                    <Text size="xs" c="dimmed" lh={1.2}>Strength</Text>
                    <NumberInput
                        size="compact"
                        value={localStrength}
                        onChange={setLocalStrength}
                        onBlur={() => {
                            const val = typeof localStrength === "string" ? parseFloat(localStrength) : localStrength;
                            if (!isNaN(val)) {
                                onStrengthChange(Math.min(1, Math.max(0, val)));
                            }
                        }}
                        min={0}
                        max={1}
                        step={0.1}
                        decimalScale={2}
                        hideControls
                        aria-label="Glow Strength"
                    />
                </Stack>
            </Group>
        </Stack>
    );
}

interface OutlineControlsProps {
    outline: OutlineConfig;
    onColorChange: (color: string) => void;
    onWidthChange: (width: number) => void;
}

function OutlineControls({outline, onColorChange, onWidthChange}: OutlineControlsProps): React.JSX.Element {
    const [localWidth, setLocalWidth] = React.useState<string | number>(outline.width);

    React.useEffect(() => {
        setLocalWidth(outline.width);
    }, [outline.width]);

    return (
        <Stack gap={4}>
            <CompactColorInput
                label="Color"
                color={outline.color}
                opacity={100}
                onColorChange={onColorChange}
                onOpacityChange={() => {
                    // Effects don't use opacity
                }}
            />
            <Group gap={8} align="flex-end">
                <Stack gap={0} style={{flex: 1}}>
                    <Text size="xs" c="dimmed" lh={1.2}>Width</Text>
                    <NumberInput
                        size="compact"
                        value={localWidth}
                        onChange={setLocalWidth}
                        onBlur={() => {
                            const val = typeof localWidth === "string" ? parseFloat(localWidth) : localWidth;
                            if (!isNaN(val)) {
                                onWidthChange(Math.max(0, val));
                            }
                        }}
                        min={0}
                        step={1}
                        hideControls
                        aria-label="Outline Width"
                    />
                </Stack>
            </Group>
        </Stack>
    );
}
