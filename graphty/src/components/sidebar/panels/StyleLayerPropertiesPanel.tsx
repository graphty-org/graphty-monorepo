import {Box, Stack, Text, TextInput} from "@mantine/core";
import React, {useEffect, useState} from "react";

import type {ArrowConfig, ColorConfig, EdgeLineConfig, EdgeStyle, NodeEffectsConfig, NodeStyle, RichTextStyle, ShapeConfig} from "../../../types/style-layer";
import {
    DEFAULT_ARROW_HEAD,
    DEFAULT_ARROW_TAIL,
    DEFAULT_COLOR,
    DEFAULT_EDGE_LINE,
    DEFAULT_NODE_EFFECTS,
    DEFAULT_RICH_TEXT_STYLE,
    DEFAULT_SHAPE,
} from "../../../utils/style-defaults";
import type {LayerItem} from "../../layout/LeftSidebar";
import {ControlGroup} from "../controls/ControlGroup";
import {ControlSection} from "../controls/ControlSection";
import {EdgeArrowControl} from "../edge-controls/EdgeArrowControl";
import {EdgeLabelControl} from "../edge-controls/EdgeLabelControl";
import {EdgeLineControl} from "../edge-controls/EdgeLineControl";
import {EdgeTooltipControl} from "../edge-controls/EdgeTooltipControl";
import {NodeColorControl} from "../node-controls/NodeColorControl";
import {NodeEffectsControl} from "../node-controls/NodeEffectsControl";
import {NodeLabelControl} from "../node-controls/NodeLabelControl";
import {NodeShapeControl} from "../node-controls/NodeShapeControl";
import {NodeTooltipControl} from "../node-controls/NodeTooltipControl";

interface StyleLayerPropertiesPanelProps {
    layer: LayerItem;
    onUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
    onEdgeUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["edge"]>) => void;
}

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
    onEdgeUpdate,
}: StyleLayerPropertiesPanelProps): React.JSX.Element {
    const [selectorValue, setSelectorValue] = useState(layer.styleLayer.node?.selector ?? "");
    const [edgeSelectorValue, setEdgeSelectorValue] = useState(layer.styleLayer.edge?.selector ?? "");

    // Update local state when layer changes
    useEffect(() => {
        setSelectorValue(layer.styleLayer.node?.selector ?? "");
        setEdgeSelectorValue(layer.styleLayer.edge?.selector ?? "");
    }, [layer]);

    const currentStyle: StyleRecord = layer.styleLayer.node?.style ?? {};
    const shapeConfig: ShapeConfig = (currentStyle.shape as ShapeConfig | undefined) ?? DEFAULT_SHAPE;
    const colorConfig = getColorConfig(currentStyle);
    const effectsConfig: NodeEffectsConfig = (currentStyle.effects as NodeEffectsConfig | undefined) ?? DEFAULT_NODE_EFFECTS;
    const nodeLabelConfig: RichTextStyle = (currentStyle.label as RichTextStyle | undefined) ?? DEFAULT_RICH_TEXT_STYLE;
    const nodeTooltipConfig: RichTextStyle = (currentStyle.tooltip as RichTextStyle | undefined) ?? DEFAULT_RICH_TEXT_STYLE;

    // Edge style extraction
    const currentEdgeStyle: EdgeStyle = (layer.styleLayer.edge?.style as EdgeStyle | undefined) ?? {};
    const edgeLineConfig: EdgeLineConfig = currentEdgeStyle.line ?? DEFAULT_EDGE_LINE;
    const arrowHeadConfig: ArrowConfig = currentEdgeStyle.arrowHead ?? DEFAULT_ARROW_HEAD;
    const arrowTailConfig: ArrowConfig = currentEdgeStyle.arrowTail ?? DEFAULT_ARROW_TAIL;
    const edgeLabelConfig: RichTextStyle = currentEdgeStyle.label ?? DEFAULT_RICH_TEXT_STYLE;
    const edgeTooltipConfig: RichTextStyle = currentEdgeStyle.tooltip ?? DEFAULT_RICH_TEXT_STYLE;

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
            // Include all properties to ensure they're all applied together
            const colorStyle = colorConfigToStyle(colorConfig);
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    shape,
                    ... colorStyle,
                    effects: effectsConfig,
                    label: nodeLabelConfig,
                    tooltip: nodeTooltipConfig,
                },
            });
        }
    };

    const handleColorChange = (newColorConfig: ColorConfig): void => {
        if (onUpdate) {
            // Include all properties to ensure they're all applied together
            const colorStyle = colorConfigToStyle(newColorConfig);
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    shape: shapeConfig,
                    ... colorStyle,
                    effects: effectsConfig,
                    label: nodeLabelConfig,
                    tooltip: nodeTooltipConfig,
                },
            });
        }
    };

    const handleEffectsChange = (effects: NodeEffectsConfig): void => {
        if (onUpdate) {
            // Include all properties to ensure effects are applied alongside shape/color
            const colorStyle = colorConfigToStyle(colorConfig);
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    shape: shapeConfig,
                    ... colorStyle,
                    effects,
                    label: nodeLabelConfig,
                    tooltip: nodeTooltipConfig,
                },
            });
        }
    };

    const handleNodeLabelChange = (label: RichTextStyle): void => {
        if (onUpdate) {
            const colorStyle = colorConfigToStyle(colorConfig);
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    shape: shapeConfig,
                    ... colorStyle,
                    effects: effectsConfig,
                    label,
                    tooltip: nodeTooltipConfig,
                },
            });
        }
    };

    const handleNodeTooltipChange = (tooltip: RichTextStyle): void => {
        if (onUpdate) {
            const colorStyle = colorConfigToStyle(colorConfig);
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: {
                    shape: shapeConfig,
                    ... colorStyle,
                    effects: effectsConfig,
                    label: nodeLabelConfig,
                    tooltip,
                },
            });
        }
    };

    // Edge handlers
    const handleEdgeSelectorBlur = (): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: edgeSelectorValue,
                style: layer.styleLayer.edge?.style ?? {},
            });
        }
    };

    const handleEdgeLineChange = (line: EdgeLineConfig): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: {
                    ... currentEdgeStyle,
                    line,
                },
            });
        }
    };

    const handleArrowHeadChange = (arrowHead: ArrowConfig): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: {
                    ... currentEdgeStyle,
                    arrowHead,
                },
            });
        }
    };

    const handleArrowTailChange = (arrowTail: ArrowConfig): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: {
                    ... currentEdgeStyle,
                    arrowTail,
                },
            });
        }
    };

    const handleEdgeLabelChange = (label: RichTextStyle): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: {
                    ... currentEdgeStyle,
                    label,
                },
            });
        }
    };

    const handleEdgeTooltipChange = (tooltip: RichTextStyle): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: {
                    ... currentEdgeStyle,
                    tooltip,
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
                    c="dimmed"
                    style={{fontSize: "10px"}}
                >
                    Layer: {layer.name}
                </Text>
            </Box>

            {/* Node Properties Section */}
            <Box>
                <Text
                    mb={4}
                    style={{fontSize: "12px", fontWeight: 500, color: "var(--mantine-color-text)", lineHeight: 1.2}}
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
                            description: {fontSize: "9px", color: "var(--mantine-color-dimmed)", lineHeight: 1.2},
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

                    {/* Effects */}
                    <ControlGroup label="Effects">
                        <NodeEffectsControl
                            value={effectsConfig}
                            onChange={handleEffectsChange}
                        />
                    </ControlGroup>

                    {/* Label */}
                    <ControlGroup label="Label">
                        <NodeLabelControl
                            value={nodeLabelConfig}
                            onChange={handleNodeLabelChange}
                        />
                    </ControlGroup>

                    {/* Tooltip */}
                    <ControlGroup label="Tooltip">
                        <NodeTooltipControl
                            value={nodeTooltipConfig}
                            onChange={handleNodeTooltipChange}
                        />
                    </ControlGroup>
                </Stack>
            </Box>

            {/* Edge Properties Section */}
            <ControlSection label="Edge Properties">
                {/* Edge Selector */}
                <TextInput
                    label="Edge Selector"
                    aria-label="Edge Selector"
                    description="JMESPath expression to select edges"
                    placeholder="e.g., source == `0`"
                    value={edgeSelectorValue}
                    onChange={(e) => {
                        setEdgeSelectorValue(e.currentTarget.value);
                    }}
                    onBlur={handleEdgeSelectorBlur}
                    size="compact"
                    styles={{
                        description: {fontSize: "9px", color: "var(--mantine-color-dimmed)", lineHeight: 1.2},
                    }}
                />

                {/* Line Style */}
                <ControlGroup label="Line">
                    <EdgeLineControl
                        value={edgeLineConfig}
                        onChange={handleEdgeLineChange}
                    />
                </ControlGroup>

                {/* Arrow Head */}
                <ControlGroup label="Arrow Head">
                    <EdgeArrowControl
                        label="Arrow Head"
                        value={arrowHeadConfig}
                        onChange={handleArrowHeadChange}
                    />
                </ControlGroup>

                {/* Arrow Tail */}
                <ControlGroup label="Arrow Tail">
                    <EdgeArrowControl
                        label="Arrow Tail"
                        value={arrowTailConfig}
                        onChange={handleArrowTailChange}
                    />
                </ControlGroup>

                {/* Edge Label */}
                <ControlGroup label="Label">
                    <EdgeLabelControl
                        value={edgeLabelConfig}
                        onChange={handleEdgeLabelChange}
                    />
                </ControlGroup>

                {/* Edge Tooltip */}
                <ControlGroup label="Tooltip">
                    <EdgeTooltipControl
                        value={edgeTooltipConfig}
                        onChange={handleEdgeTooltipChange}
                    />
                </ControlGroup>
            </ControlSection>
        </Stack>
    );
}
