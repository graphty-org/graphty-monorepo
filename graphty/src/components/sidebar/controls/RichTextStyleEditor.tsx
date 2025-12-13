import {Checkbox, Group, NativeSelect, NumberInput, Stack, TextInput} from "@mantine/core";
import React, {useState} from "react";

import {
    FONT_OPTIONS,
    FONT_WEIGHT_OPTIONS,
    TEXT_ANIMATION_OPTIONS,
    TEXT_ATTACH_POSITION_OPTIONS,
    TEXT_LOCATION_OPTIONS,
} from "../../../constants/style-options";
import type {RichTextStyle, TextAnimation, TextAttachPosition, TextBackgroundStyle, TextLocation} from "../../../types/style-layer";
import {DEFAULT_TEXT_BACKGROUND, DEFAULT_TEXT_OUTLINE, DEFAULT_TEXT_SHADOW} from "../../../utils/style-defaults";
import {CompactColorInput} from "./CompactColorInput";
import {ControlSubGroup} from "./ControlSubGroup";
import {EffectToggle} from "./EffectToggle";

interface RichTextStyleEditorProps {
    /** Label for this editor (used for testing/identification) */
    label: string;
    value: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}

/**
 * Comprehensive editor for rich text styles (labels and tooltips).
 * Provides controls for text content, font styling, positioning,
 * background, effects, and animation.
 */
// No-op function for opacity changes when opacity control is not needed
const noOpOpacity = (): void => {
    // Intentionally empty - opacity is fixed at 100% for text colors
};

export function RichTextStyleEditor({
    value,
    onChange,
}: RichTextStyleEditorProps): React.JSX.Element {
    const [localText, setLocalText] = useState(value.text);

    // Sync local text state when value changes
    React.useEffect(() => {
        setLocalText(value.text);
    }, [value.text]);

    const handleEnabledChange = (enabled: boolean): void => {
        onChange({... value, enabled});
    };

    const handleTextBlur = (): void => {
        if (localText !== value.text) {
            onChange({... value, text: localText});
        }
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({... value, location: e.target.value as TextLocation});
    };

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ... value,
            font: {... value.font, family: e.target.value},
        });
    };

    const handleFontSizeChange = (size: string | number): void => {
        const sizeNum = typeof size === "string" ? parseFloat(size) : size;
        if (!isNaN(sizeNum)) {
            onChange({
                ... value,
                font: {... value.font, size: sizeNum},
            });
        }
    };

    const handleFontWeightChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ... value,
            font: {... value.font, weight: parseInt(e.target.value, 10)},
        });
    };

    const handleFontColorChange = (color: string): void => {
        onChange({
            ... value,
            font: {... value.font, color},
        });
    };

    const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange({
            ... value,
            position: {... value.position, attachPosition: e.target.value as TextAttachPosition},
        });
    };

    const handleOffsetChange = (offset: string | number): void => {
        const offsetNum = typeof offset === "string" ? parseFloat(offset) : offset;
        if (!isNaN(offsetNum)) {
            onChange({
                ... value,
                position: {... value.position, offset: offsetNum},
            });
        }
    };

    const handleBillboardChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({
            ... value,
            position: {... value.position, billboard: e.currentTarget.checked},
        });
    };

    const handleBackgroundEnabledChange = (enabled: boolean): void => {
        const background: TextBackgroundStyle = value.background ?? {... DEFAULT_TEXT_BACKGROUND};
        onChange({
            ... value,
            background: {... background, enabled},
        });
    };

    const handleBackgroundColorChange = (color: string): void => {
        const background: TextBackgroundStyle = value.background ?? {... DEFAULT_TEXT_BACKGROUND};
        onChange({
            ... value,
            background: {... background, color},
        });
    };

    const handleBackgroundPaddingChange = (padding: string | number): void => {
        const paddingNum = typeof padding === "string" ? parseFloat(padding) : padding;
        if (!isNaN(paddingNum)) {
            const background: TextBackgroundStyle = value.background ?? {... DEFAULT_TEXT_BACKGROUND};
            onChange({
                ... value,
                background: {... background, padding: paddingNum},
            });
        }
    };

    const handleBackgroundRadiusChange = (radius: string | number): void => {
        const radiusNum = typeof radius === "string" ? parseFloat(radius) : radius;
        if (!isNaN(radiusNum)) {
            const background: TextBackgroundStyle = value.background ?? {... DEFAULT_TEXT_BACKGROUND};
            onChange({
                ... value,
                background: {... background, borderRadius: radiusNum},
            });
        }
    };

    const handleOutlineEnabledChange = (enabled: boolean): void => {
        const outline = value.effects?.outline ?? {... DEFAULT_TEXT_OUTLINE};
        onChange({
            ... value,
            effects: {
                ... value.effects,
                outline: {... outline, enabled},
            },
        });
    };

    const handleOutlineColorChange = (color: string): void => {
        const outline = value.effects?.outline ?? {... DEFAULT_TEXT_OUTLINE};
        onChange({
            ... value,
            effects: {
                ... value.effects,
                outline: {... outline, color},
            },
        });
    };

    const handleOutlineWidthChange = (width: string | number): void => {
        const widthNum = typeof width === "string" ? parseFloat(width) : width;
        if (!isNaN(widthNum)) {
            const outline = value.effects?.outline ?? {... DEFAULT_TEXT_OUTLINE};
            onChange({
                ... value,
                effects: {
                    ... value.effects,
                    outline: {... outline, width: widthNum},
                },
            });
        }
    };

    const handleShadowEnabledChange = (enabled: boolean): void => {
        const shadow = value.effects?.shadow ?? {... DEFAULT_TEXT_SHADOW};
        onChange({
            ... value,
            effects: {
                ... value.effects,
                shadow: {... shadow, enabled},
            },
        });
    };

    const handleShadowColorChange = (color: string): void => {
        const shadow = value.effects?.shadow ?? {... DEFAULT_TEXT_SHADOW};
        onChange({
            ... value,
            effects: {
                ... value.effects,
                shadow: {... shadow, color},
            },
        });
    };

    const handleShadowBlurChange = (blur: string | number): void => {
        const blurNum = typeof blur === "string" ? parseFloat(blur) : blur;
        if (!isNaN(blurNum)) {
            const shadow = value.effects?.shadow ?? {... DEFAULT_TEXT_SHADOW};
            onChange({
                ... value,
                effects: {
                    ... value.effects,
                    shadow: {... shadow, blur: blurNum},
                },
            });
        }
    };

    const handleAnimationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const animation = value.animation ?? {type: "none", duration: 1000};
        onChange({
            ... value,
            animation: {... animation, type: e.target.value as TextAnimation},
        });
    };

    const handleAnimationDurationChange = (duration: string | number): void => {
        const durationNum = typeof duration === "string" ? parseFloat(duration) : duration;
        if (!isNaN(durationNum)) {
            const animation = value.animation ?? {type: "none", duration: 1000};
            onChange({
                ... value,
                animation: {... animation, duration: durationNum},
            });
        }
    };

    const handleResolutionChange = (resolution: string | number): void => {
        const resNum = typeof resolution === "string" ? parseFloat(resolution) : resolution;
        if (!isNaN(resNum)) {
            const advanced = value.advanced ?? {resolution: 64, depthFade: false};
            onChange({
                ... value,
                advanced: {... advanced, resolution: resNum},
            });
        }
    };

    const handleDepthFadeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const advanced = value.advanced ?? {resolution: 64, depthFade: false};
        onChange({
            ... value,
            advanced: {... advanced, depthFade: e.currentTarget.checked},
        });
    };

    const backgroundValue = value.background ?? DEFAULT_TEXT_BACKGROUND;
    const outlineValue = value.effects?.outline ?? DEFAULT_TEXT_OUTLINE;
    const shadowValue = value.effects?.shadow ?? DEFAULT_TEXT_SHADOW;
    const animationValue = value.animation ?? {type: "none", duration: 1000};
    const advancedValue = value.advanced ?? {resolution: 64, depthFade: false};

    return (
        <Stack gap={4}>
            {/* Enabled Toggle */}
            <Checkbox
                label="Enabled"
                checked={value.enabled}
                onChange={(e) => {
                    handleEnabledChange(e.currentTarget.checked);
                }}
                size="xs"
                styles={{
                    label: {fontSize: "11px", paddingLeft: "4px"},
                }}
            />

            {value.enabled && (
                <Stack gap={8} pl="xs">
                    {/* Text Input */}
                    <TextInput
                        label="Text"
                        aria-label="Text"
                        value={localText}
                        onChange={(e) => {
                            setLocalText(e.currentTarget.value);
                        }}
                        onBlur={handleTextBlur}
                        size="compact"
                        placeholder="Enter label text"
                    />

                    {/* Location Select */}
                    <NativeSelect
                        label="Location"
                        aria-label="Location"
                        value={value.location}
                        onChange={handleLocationChange}
                        size="compact"
                        data={TEXT_LOCATION_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                        }))}
                    />

                    {/* Font Controls */}
                    <Group gap={8} grow>
                        <NativeSelect
                            label="Font Family"
                            aria-label="Font Family"
                            value={value.font.family}
                            onChange={handleFontFamilyChange}
                            size="compact"
                            data={FONT_OPTIONS.map((opt) => ({
                                value: opt.value,
                                label: opt.label,
                            }))}
                        />
                        <NumberInput
                            label="Font Size"
                            aria-label="Font Size"
                            value={value.font.size}
                            onChange={handleFontSizeChange}
                            size="compact"
                            min={1}
                            max={200}
                        />
                    </Group>

                    <Group gap={8} grow>
                        <NativeSelect
                            label="Font Weight"
                            aria-label="Font Weight"
                            value={String(value.font.weight)}
                            onChange={handleFontWeightChange}
                            size="compact"
                            data={FONT_WEIGHT_OPTIONS.map((opt) => ({
                                value: String(opt.value),
                                label: opt.label,
                            }))}
                        />
                        <CompactColorInput
                            label="Font Color"
                            color={value.font.color}
                            opacity={100}
                            onColorChange={handleFontColorChange}
                            onOpacityChange={noOpOpacity}
                        />
                    </Group>

                    {/* Position Controls */}
                    <Group gap={8} grow>
                        <NativeSelect
                            label="Position"
                            aria-label="Position"
                            value={value.position.attachPosition}
                            onChange={handlePositionChange}
                            size="compact"
                            data={TEXT_ATTACH_POSITION_OPTIONS.map((opt) => ({
                                value: opt.value,
                                label: opt.label,
                            }))}
                        />
                        <NumberInput
                            label="Offset"
                            aria-label="Offset"
                            value={value.position.offset}
                            onChange={handleOffsetChange}
                            size="compact"
                        />
                    </Group>

                    <Checkbox
                        label="Billboard"
                        checked={value.position.billboard}
                        onChange={handleBillboardChange}
                        size="xs"
                        styles={{
                            label: {fontSize: "11px", paddingLeft: "4px"},
                        }}
                    />

                    {/* Background */}
                    <EffectToggle
                        label="Background"
                        checked={backgroundValue.enabled}
                        onChange={handleBackgroundEnabledChange}
                    >
                        <CompactColorInput
                            label="Background Color"
                            color={backgroundValue.color}
                            opacity={100}
                            onColorChange={handleBackgroundColorChange}
                            onOpacityChange={noOpOpacity}
                        />
                        <Group gap={8} grow>
                            <NumberInput
                                label="Padding"
                                aria-label="Padding"
                                value={backgroundValue.padding}
                                onChange={handleBackgroundPaddingChange}
                                size="compact"
                                min={0}
                            />
                            <NumberInput
                                label="Border Radius"
                                aria-label="Border Radius"
                                value={backgroundValue.borderRadius}
                                onChange={handleBackgroundRadiusChange}
                                size="compact"
                                min={0}
                            />
                        </Group>
                    </EffectToggle>

                    {/* Text Effects */}
                    <ControlSubGroup label="Text Effects" defaultOpen={false}>
                        <EffectToggle
                            label="Outline"
                            checked={outlineValue.enabled}
                            onChange={handleOutlineEnabledChange}
                        >
                            <CompactColorInput
                                label="Outline Color"
                                color={outlineValue.color}
                                opacity={100}
                                onColorChange={handleOutlineColorChange}
                                onOpacityChange={noOpOpacity}
                            />
                            <NumberInput
                                label="Outline Width"
                                aria-label="Outline Width"
                                value={outlineValue.width}
                                onChange={handleOutlineWidthChange}
                                size="compact"
                                min={0}
                                max={10}
                            />
                        </EffectToggle>

                        <EffectToggle
                            label="Shadow"
                            checked={shadowValue.enabled}
                            onChange={handleShadowEnabledChange}
                        >
                            <CompactColorInput
                                label="Shadow Color"
                                color={shadowValue.color}
                                opacity={100}
                                onColorChange={handleShadowColorChange}
                                onOpacityChange={noOpOpacity}
                            />
                            <NumberInput
                                label="Shadow Blur"
                                aria-label="Shadow Blur"
                                value={shadowValue.blur}
                                onChange={handleShadowBlurChange}
                                size="compact"
                                min={0}
                            />
                        </EffectToggle>
                    </ControlSubGroup>

                    {/* Animation */}
                    <ControlSubGroup label="Animation" defaultOpen={false}>
                        <NativeSelect
                            label="Animation Type"
                            aria-label="Animation Type"
                            value={animationValue.type}
                            onChange={handleAnimationTypeChange}
                            size="compact"
                            data={TEXT_ANIMATION_OPTIONS.map((opt) => ({
                                value: opt.value,
                                label: opt.label,
                            }))}
                        />
                        {animationValue.type !== "none" && (
                            <NumberInput
                                label="Duration (ms)"
                                aria-label="Duration"
                                value={animationValue.duration}
                                onChange={handleAnimationDurationChange}
                                size="compact"
                                min={0}
                            />
                        )}
                    </ControlSubGroup>

                    {/* Advanced */}
                    <ControlSubGroup label="Advanced" defaultOpen={false}>
                        <NumberInput
                            label="Resolution"
                            aria-label="Resolution"
                            value={advancedValue.resolution}
                            onChange={handleResolutionChange}
                            size="compact"
                            min={16}
                            max={512}
                        />
                        <Checkbox
                            label="Depth Fade"
                            checked={advancedValue.depthFade}
                            onChange={handleDepthFadeChange}
                            size="xs"
                            styles={{
                                label: {fontSize: "11px", paddingLeft: "4px"},
                            }}
                        />
                    </ControlSubGroup>
                </Stack>
            )}
        </Stack>
    );
}
