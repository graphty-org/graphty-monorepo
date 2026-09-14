import { Box, Stack, Text, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";

import type {
    ArrowConfig,
    ColorConfig,
    EdgeLineConfig,
    NodeEffectsConfig,
    RichTextStyle,
    ShapeConfig,
} from "../../../types/style-layer";
import { editorToElementRichTextStyle, elementToEditorRichTextStyle } from "../../../utils/richTextStyleBridge";
import { DEFAULT_ARROW_HEAD, DEFAULT_ARROW_TAIL } from "../../../utils/style-defaults";
import {
    editorToElementArrow,
    editorToElementColor,
    editorToElementEdgeLine,
    editorToElementEffects,
    editorToElementShape,
    elementToEditorArrow,
    elementToEditorColorConfig,
    elementToEditorEdgeLine,
    elementToEditorEffects,
    elementToEditorShape,
} from "../../../utils/styleBridge";
import type { LayerItem } from "../../layout/LeftSidebar";
import { ControlGroup } from "../controls/ControlGroup";
import { ControlSection } from "../controls/ControlSection";
import { EdgeArrowControl } from "../edge-controls/EdgeArrowControl";
import { EdgeLabelControl } from "../edge-controls/EdgeLabelControl";
import { EdgeLineControl } from "../edge-controls/EdgeLineControl";
import { EdgeTooltipControl } from "../edge-controls/EdgeTooltipControl";
import { NodeColorControl } from "../node-controls/NodeColorControl";
import { NodeEffectsControl } from "../node-controls/NodeEffectsControl";
import { NodeLabelControl } from "../node-controls/NodeLabelControl";
import { NodeShapeControl } from "../node-controls/NodeShapeControl";
import { NodeTooltipControl } from "../node-controls/NodeTooltipControl";

interface StyleLayerPropertiesPanelProps {
    layer: LayerItem;
    onUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
    onEdgeUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["edge"]>) => void;
}

type StyleRecord = Record<string, unknown>;

/**
 * The style with one key gone, which is how a layer says it no longer sets that key.
 *
 * Rebuilt rather than deleted from, and never written as a present key with an `undefined`
 * value: graphty-element merges matching layers with `defaultsDeep`, where an absent key
 * lets another layer's value through and a present one does not. The two are different
 * facts, and `undefined` is neither of them.
 * @param style - the element-shaped style.
 * @param key - the key to drop.
 * @returns the same style without that key.
 */
function withoutKey(style: StyleRecord, key: string): StyleRecord {
    return Object.fromEntries(Object.entries(style).filter(([name]) => name !== key));
}

/**
 * The live style with one rich-text branch -- the label or the tooltip -- rewritten.
 *
 * Every OTHER key is carried across untouched, exactly as the element held it, because a
 * handler owns one branch and knows nothing about the rest: `style` here is what
 * graphty-element's `StyleManager` currently holds for this layer, not something the
 * editors re-derived.
 *
 * An empty or disabled editor style has no element form (`editorToElementRichTextStyle`
 * returns undefined), and that is written by REMOVING the branch rather than by writing a
 * disabled one. Removing it puts the layer back in the state it was in before anything
 * styled a label, which is what the app's other writer (`Graphty.tsx`) also does with an
 * undefined conversion -- and it is the only one of the two options the element's schema
 * reads unambiguously. Writing `{enabled: false}` instead would be a positive claim that
 * beats other matching layers through `defaultsDeep`, leaving a reader with no label and
 * nothing to look at that says which layer turned it off.
 * @param style - the layer's current node or edge style, element-shaped.
 * @param key - the branch this handler owns.
 * @param editorStyle - the style the rich-text control handed back, editor-shaped.
 * @returns the same style with that one branch written, or with it removed.
 */
function withRichTextBranch(style: StyleRecord, key: "label" | "tooltip", editorStyle: RichTextStyle): StyleRecord {
    const flat = editorToElementRichTextStyle(editorStyle);

    if (flat === undefined) {
        return withoutKey(style, key);
    }

    return { ...style, [key]: flat };
}

/**
 * The live style with the colour branch rewritten in ELEMENT shape.
 *
 * The element has no `color` key -- `NodeStyle` is a Zod `strictObject` whose colour lives
 * at `texture.color` -- so the editor's `ColorConfig` goes through the bridge and the
 * editor-only `color` key is REMOVED. Left behind, it is not merely dead weight: the
 * element interns styles by deep equality, so a style carrying it can never be
 * value-equal to the canonical style for the same look, and the pair costs two style ids
 * and two meshes for one colour.
 *
 * `texture`'s other keys -- `image`, `icon` -- are carried across, because this handler
 * owns the colour and nothing else.
 * @param style - the layer's current node style, element-shaped.
 * @param colorConfig - the colour the control handed back, editor-shaped.
 * @returns the same style with `texture.color` written and `color` gone.
 */
function withColorBranch(style: StyleRecord, colorConfig: ColorConfig): StyleRecord {
    const existing = style.texture;
    const texture =
        existing !== null && typeof existing === "object" && !Array.isArray(existing) ? (existing as StyleRecord) : {};

    return {
        ...withoutKey(style, "color"),
        texture: { ...texture, color: editorToElementColor(colorConfig) },
    };
}

/**
 * The live style with the effects branch rewritten in ELEMENT shape.
 *
 * The element's key is `effect`, SINGULAR, and the editor's plural `effects` is dropped on
 * the way past. Nothing set means the branch is ABSENT -- `editorToElementEffects` returns
 * undefined and that is written by removing the key, never as `effect: undefined`, which
 * `isEqual` reads as a style distinct from one with no `effect` at all.
 * @param style - the layer's current node style, element-shaped.
 * @param effects - the effects the control handed back, editor-shaped.
 * @returns the same style with `effect` written or removed, and `effects` gone.
 */
function withEffectBranch(style: StyleRecord, effects: NodeEffectsConfig): StyleRecord {
    const converted = editorToElementEffects(effects);
    const base = withoutKey(withoutKey(style, "effects"), "effect");

    if (converted === undefined) {
        return base;
    }

    return { ...base, effect: converted };
}

/**
 * The live edge style with one arrow branch rewritten in ELEMENT shape.
 *
 * An arrow of type "none" has no element form: `editorToElementArrow` returns undefined
 * and the branch is REMOVED, because an edge with `{type: "none"}` looks exactly like an
 * edge with no arrow branch and must not intern as a second style.
 * @param style - the layer's current edge style, element-shaped.
 * @param key - the branch this handler owns.
 * @param arrow - the arrow the control handed back, editor-shaped.
 * @returns the same style with that arrow written or removed.
 */
function withArrowBranch(style: StyleRecord, key: "arrowHead" | "arrowTail", arrow: ArrowConfig): StyleRecord {
    const converted = editorToElementArrow(arrow);

    if (converted === undefined) {
        return withoutKey(style, key);
    }

    return { ...style, [key]: converted };
}

/**
 * Panel for editing style layer properties including node and edge styles.
 * @param root0 - Component props
 * @param root0.layer - The layer being edited
 * @param root0.onUpdate - Called when node properties are updated
 * @param root0.onEdgeUpdate - Called when edge properties are updated
 * @returns The style layer properties panel component
 */
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

    /* Every branch is read through a bridge, because the layer is ELEMENT-shaped and the
       controls are editor-shaped: `texture.color` against `ColorConfig`, `effect` against
       `effects`, the element's shape names against the editor's, 0-1 opacity against
       0-100. The readers also accept the editor shapes an older panel wrote into these
       same layers, so a saved layer still opens on the values its author typed. */
    const currentStyle: StyleRecord = layer.styleLayer.node?.style ?? {};
    const shapeConfig: ShapeConfig = elementToEditorShape(currentStyle.shape);
    const colorConfig: ColorConfig = elementToEditorColorConfig(currentStyle);
    const effectsConfig: NodeEffectsConfig = elementToEditorEffects(currentStyle.effect ?? currentStyle.effects);
    const nodeLabelConfig: RichTextStyle = elementToEditorRichTextStyle(currentStyle.label);
    const nodeTooltipConfig: RichTextStyle = elementToEditorRichTextStyle(currentStyle.tooltip);

    /* Edge style extraction. Read as an open record, like the node style above it: this is
       the element's own layer, so its `label` and `tooltip` are FLAT and only the bridge
       may read them. */
    const currentEdgeStyle: StyleRecord = layer.styleLayer.edge?.style ?? {};
    const edgeLineConfig: EdgeLineConfig = elementToEditorEdgeLine(currentEdgeStyle.line);
    const arrowHeadConfig: ArrowConfig = elementToEditorArrow(currentEdgeStyle.arrowHead, DEFAULT_ARROW_HEAD);
    const arrowTailConfig: ArrowConfig = elementToEditorArrow(currentEdgeStyle.arrowTail, DEFAULT_ARROW_TAIL);
    const edgeLabelConfig: RichTextStyle = elementToEditorRichTextStyle(currentEdgeStyle.label);
    const edgeTooltipConfig: RichTextStyle = elementToEditorRichTextStyle(currentEdgeStyle.tooltip);

    /* Every handler below PATCHES: it writes the one branch it owns over the style the
       ELEMENT currently holds, and carries every other key across untouched.

       They each used to restate the whole style from the editors' re-derived models, so
       editing any one branch rewrote all five with whatever the editors had made of them.
       For the two rich-text branches that was not merely lossy but breaking:
       `nodeLabelConfig` is EDITOR-shaped -- nested `font.family`, a `position` object,
       opt-in groups -- while the element's schema is a flat `strictObject`, so a colour
       edit wrote a label the element could not parse and the labels rebuilt as blank
       textures. The rich-text branches now go out through the bridge, in element shape.

       EVERY branch now does. graphty-element interns styles by deep value equality and
       keys its mesh cache on the id it hands back, so a branch written in the editor's
       shape rather than the element's is not just unread -- it mints a style id and a mesh
       of its own for a look the element already had, and `Styles.styleToId`'s scan is
       linear in the number of styles ever interned. The conversions live in
       `utils/styleBridge` (and `utils/richTextStyleBridge` for label and tooltip), copied
       from the writer in `components/Graphty.tsx` so the two cannot drift into two ids for
       one look. */
    const handleSelectorBlur = (): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: selectorValue,
                style: currentStyle,
            });
        }
    };

    const handleShapeChange = (shape: ShapeConfig): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: { ...currentStyle, shape: editorToElementShape(shape) },
            });
        }
    };

    const handleColorChange = (newColorConfig: ColorConfig): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: withColorBranch(currentStyle, newColorConfig),
            });
        }
    };

    const handleEffectsChange = (effects: NodeEffectsConfig): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: withEffectBranch(currentStyle, effects),
            });
        }
    };

    const handleNodeLabelChange = (label: RichTextStyle): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: withRichTextBranch(currentStyle, "label", label),
            });
        }
    };

    const handleNodeTooltipChange = (tooltip: RichTextStyle): void => {
        if (onUpdate) {
            onUpdate(layer.id, {
                selector: layer.styleLayer.node?.selector ?? "",
                style: withRichTextBranch(currentStyle, "tooltip", tooltip),
            });
        }
    };

    /* The edge handlers patch on the same terms as the node ones above: the live element
       style, one branch each. */
    const handleEdgeSelectorBlur = (): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: edgeSelectorValue,
                style: currentEdgeStyle,
            });
        }
    };

    const handleEdgeLineChange = (line: EdgeLineConfig): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: {
                    ...currentEdgeStyle,
                    line: editorToElementEdgeLine(line),
                },
            });
        }
    };

    const handleArrowHeadChange = (arrowHead: ArrowConfig): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: withArrowBranch(currentEdgeStyle, "arrowHead", arrowHead),
            });
        }
    };

    const handleArrowTailChange = (arrowTail: ArrowConfig): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: withArrowBranch(currentEdgeStyle, "arrowTail", arrowTail),
            });
        }
    };

    const handleEdgeLabelChange = (label: RichTextStyle): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: withRichTextBranch(currentEdgeStyle, "label", label),
            });
        }
    };

    const handleEdgeTooltipChange = (tooltip: RichTextStyle): void => {
        if (onEdgeUpdate) {
            onEdgeUpdate(layer.id, {
                selector: layer.styleLayer.edge?.selector ?? "",
                style: withRichTextBranch(currentEdgeStyle, "tooltip", tooltip),
            });
        }
    };

    return (
        <Stack gap={0}>
            {/* Layer Name Header */}
            <Box style={{ marginBottom: "0px" }}>
                <Text size="xs" fw={500} c="dimmed" style={{ fontSize: "10px" }}>
                    Layer: {layer.name}
                </Text>
            </Box>

            {/* Node Properties Section */}
            <Box>
                <Text
                    mb={4}
                    style={{ fontSize: "12px", fontWeight: 500, color: "var(--mantine-color-text)", lineHeight: 1.2 }}
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
                            description: { fontSize: "9px", color: "var(--mantine-color-dimmed)", lineHeight: 1.2 },
                        }}
                    />

                    {/* Shape */}
                    <ControlGroup label="Shape">
                        <NodeShapeControl value={shapeConfig} onChange={handleShapeChange} />
                    </ControlGroup>

                    {/* Color */}
                    <ControlGroup label="Color">
                        <NodeColorControl value={colorConfig} onChange={handleColorChange} />
                    </ControlGroup>

                    {/* Effects */}
                    <ControlGroup label="Effects">
                        <NodeEffectsControl value={effectsConfig} onChange={handleEffectsChange} />
                    </ControlGroup>

                    {/* Label */}
                    <ControlGroup label="Label">
                        <NodeLabelControl value={nodeLabelConfig} onChange={handleNodeLabelChange} />
                    </ControlGroup>

                    {/* Tooltip */}
                    <ControlGroup label="Tooltip">
                        <NodeTooltipControl value={nodeTooltipConfig} onChange={handleNodeTooltipChange} />
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
                        description: { fontSize: "9px", color: "var(--mantine-color-dimmed)", lineHeight: 1.2 },
                    }}
                />

                {/* Line Style */}
                <ControlGroup label="Line">
                    <EdgeLineControl value={edgeLineConfig} onChange={handleEdgeLineChange} />
                </ControlGroup>

                {/* Arrow Head */}
                <ControlGroup label="Arrow Head">
                    <EdgeArrowControl label="Arrow Head" value={arrowHeadConfig} onChange={handleArrowHeadChange} />
                </ControlGroup>

                {/* Arrow Tail */}
                <ControlGroup label="Arrow Tail">
                    <EdgeArrowControl label="Arrow Tail" value={arrowTailConfig} onChange={handleArrowTailChange} />
                </ControlGroup>

                {/* Edge Label */}
                <ControlGroup label="Label">
                    <EdgeLabelControl value={edgeLabelConfig} onChange={handleEdgeLabelChange} />
                </ControlGroup>

                {/* Edge Tooltip */}
                <ControlGroup label="Tooltip">
                    <EdgeTooltipControl value={edgeTooltipConfig} onChange={handleEdgeTooltipChange} />
                </ControlGroup>
            </ControlSection>
        </Stack>
    );
}
