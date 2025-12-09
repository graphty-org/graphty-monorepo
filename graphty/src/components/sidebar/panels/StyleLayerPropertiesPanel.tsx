import {Box, Stack, Text, TextInput} from "@mantine/core";
import React, {useEffect, useState} from "react";

import type {ColorConfig, NodeStyle, ShapeConfig} from "../../../types/style-layer";
import type {LayerItem} from "../../layout/LeftSidebar";
import {ControlGroup} from "../controls/ControlGroup";
import {NodeColorControl} from "../node-controls/NodeColorControl";
import {NodeShapeControl} from "../node-controls/NodeShapeControl";

interface StyleLayerPropertiesPanelProps {
    layer: LayerItem;
    onUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
}

const DEFAULT_SHAPE: ShapeConfig = {
    type: "sphere",
    size: 1.0,
};

const DEFAULT_COLOR: ColorConfig = {
    mode: "solid",
    color: "#5b8ff9",
    opacity: 1.0,
};

type StyleRecord = Record<string, unknown>;

/**
 * Converts legacy color format to new ColorConfig format.
 */
function getColorConfig(style: StyleRecord): ColorConfig {
    // Check if new color config exists
    if (style.color && typeof style.color === "object" && "mode" in style.color) {
        return style.color as ColorConfig;
    }

    // Check legacy texture.color format
    if (style.texture && typeof style.texture === "object") {
        const texture = style.texture as {color?: string};
        if (texture.color) {
            return {
                mode: "solid",
                color: texture.color,
                opacity: 1.0,
            };
        }
    }

    // Check simple color string
    if (typeof style.color === "string") {
        return {
            mode: "solid",
            color: style.color,
            opacity: 1.0,
        };
    }

    return DEFAULT_COLOR;
}

/**
 * Converts ColorConfig to a format usable by graphty-element.
 */
function colorConfigToStyle(colorConfig: ColorConfig): NodeStyle {
    if (colorConfig.mode === "solid") {
        return {
            color: colorConfig,
            texture: {color: colorConfig.color},
        };
    }

    return {color: colorConfig};
}

export function StyleLayerPropertiesPanel({
    layer,
    onUpdate,
}: StyleLayerPropertiesPanelProps): React.JSX.Element {
    const [selectorValue, setSelectorValue] = useState(layer.styleLayer.node?.selector ?? "");

    // Update local state when layer changes
    useEffect(() => {
        setSelectorValue(layer.styleLayer.node?.selector ?? "");
    }, [layer]);

    const currentStyle: StyleRecord = layer.styleLayer.node?.style ?? {};
    const shapeConfig: ShapeConfig = (currentStyle.shape as ShapeConfig | undefined) ?? DEFAULT_SHAPE;
    const colorConfig = getColorConfig(currentStyle);

    const handleSelectorBlur = (): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: selectorValue,
                style: layer.styleLayer.node?.style ?? {},
            });
        }
    };

    const handleShapeChange = (shape: ShapeConfig): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    ... currentStyle,
                    shape,
                },
            });
        }
    };

    const handleColorChange = (newColorConfig: ColorConfig): void => {
        if (onUpdate) {
            const colorStyle = colorConfigToStyle(newColorConfig);
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    ... currentStyle,
                    ... colorStyle,
                },
            });
        }
    };

    return (
        <Stack gap={0}>
            {/* Layer Name Header */}
            <Box style={{marginBottom: "0px"}}>
                <Text
                    size="xs"
                    fw={500}
                    c="dark.3"
                    style={{fontSize: "10px"}}
                >
                    Layer: {layer.name}
                </Text>
            </Box>

            {/* Node Properties Section */}
            <Box>
                <Text
                    mb={4}
                    style={{fontSize: "12px", fontWeight: 500, color: "#ffffff", lineHeight: 1.2}}
                >
                    Node Properties
                </Text>
                <Stack gap={0}>
                    {/* Selector */}
                    <TextInput
                        label="Node Selector"
                        aria-label="Node Selector"
                        description="JMESPath expression to select nodes"
                        placeholder="e.g., id == `0`"
                        value={selectorValue}
                        onChange={(e) => {
                            setSelectorValue(e.currentTarget.value);
                        }}
                        onBlur={handleSelectorBlur}
                        size="compact"
                        styles={{
                            description: {fontSize: "9px", color: "var(--mantine-color-dark-3)", lineHeight: 1.2},
                        }}
                    />

                    {/* Shape */}
                    <ControlGroup label="Shape">
                        <NodeShapeControl
                            value={shapeConfig}
                            onChange={handleShapeChange}
                        />
                    </ControlGroup>

                    {/* Color */}
                    <ControlGroup label="Color">
                        <NodeColorControl
                            value={colorConfig}
                            onChange={handleColorChange}
                        />
                    </ControlGroup>
                </Stack>
            </Box>

            {/* Edge Properties Section - Placeholder for future phases */}
            <ControlGroup label="Edge Properties">
                <Text size="xs" c="dark.4" style={{fontSize: "10px"}}>
                    Edge styling options coming soon
                </Text>
            </ControlGroup>
        </Stack>
    );
}
