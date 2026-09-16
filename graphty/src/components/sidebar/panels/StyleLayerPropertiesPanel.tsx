/**
 * The style-layer inspector's body: one row per encodable channel of one style layer.
 *
 * FOUR DEFECTS THIS FILE WAS REBUILT TO CLOSE, all of them reported by the product owner
 * against the shipped shell.
 *
 * 1. "THERE IS NO LEFT MARGIN ON THE STYLE INSPECTOR TAB." Two causes, both here. The
 *    panel imported `ControlSection` from `../controls/ControlSection`, a local component
 *    whose root was a bare `Box` with no horizontal padding, while compact-mantine's
 *    `ControlSection` draws `PANEL_GRID.PAD_LEFT` (16px) and `PAD_RIGHT` (8px) on both its
 *    32px header and its body. Worse, only the EDGE half was inside a section at all: the
 *    node half was a bare `Box` + `Text` + `Stack` holding five local `ControlGroup`s,
 *    also unpadded, so swapping the import alone would have left every node control flush
 *    left. The inconsistency was visible inside one surface, because
 *    `StyleLayerInspector` already draws its Source section with the library component.
 *    Everything below is now a compact-mantine `ControlSection` / `ControlGroup` /
 *    `ControlSubGroup`, and the local forks are deleted so the mistake cannot recur.
 *
 * 2. "FIX THE CALCULATED STYLE BLIND SPOT", and "the 'top degree label' doesn't show the
 *    'label' as 'enabled'". `grep -c calculatedStyle` over the old file returned ZERO. It
 *    read `styleLayer.node?.style` and `styleLayer.edge?.style` and nothing else, while
 *    `LayerItem` declares `calculatedStyle` on both halves and `layerConversion.ts` copies
 *    it off the element's layer verbatim. See `shell/inspector/calculatedChannels.ts` for
 *    the decision and its justification; the short form is that a calculated channel gets
 *    its own row, drawn BOUND and DISABLED with its reason, plus one explicit verb that
 *    converts the rule to a fixed value.
 *
 * 3. EVERY UNSET CHANNEL WAS DRAWN AS A SET VALUE. The old read path ran the layer through
 *    the whole-config bridges, which fill anything the element did not set with the
 *    EDITOR's default and hand it to the control as a `value`. Selecting "Top degree
 *    labels" -- node style `{}`, no edge half at all -- therefore showed Icosphere size 1,
 *    colour #6366F1, and an edge line 8 wide in #A9A9A9, in ordinary value ink, as though
 *    the layer had chosen them. Those are `DEFAULT_SHAPE`, `DEFAULT_COLOR` and
 *    `DEFAULT_EDGE_LINE` byte for byte. The panel now reads each channel NARROWLY (see
 *    `utils/styleBridge.ts`'s narrow readers) and hands the compact control `undefined`,
 *    which is the third state those controls have and Mantine's raw inputs do not: it
 *    draws the `defaultValue` in italic chrome ink, with no reset affordance, which says
 *    "this layer chooses nothing here" rather than telling the reader a lie.
 *
 * 4. A NODE-ONLY LAYER WAS GIVEN A WHOLE EDGE SECTION, and merely tabbing through its
 *    selector materialised an every-edge half on the element. `handleEdgeSelectorBlur`
 *    fired on ANY focus loss and called `onEdgeUpdate(layer.id, {selector: "", style: {}})`;
 *    `sameStyleHalf(undefined, {...})` is false, so a layer whose recorded job was node
 *    labelling acquired an every-edge selector that the legend and the reading then
 *    described. The Edge section is now drawn only when the half exists, as an EMPTY
 *    section with an add control when it does not, and both selector fields commit only
 *    when the text actually changed.
 *
 * TWO WRITER INVARIANTS SURVIVE THE REBUILD UNCHANGED, and the whole "writing back to an
 * element-shaped layer" suite still pins them: every handler PATCHES one branch over the
 * style the ELEMENT currently holds and carries every other key across untouched; and
 * "unset" is written by REMOVING the key, never as a present key with an `undefined`
 * value, because graphty-element merges matching layers with `defaultsDeep` -- where an
 * absent key lets another layer's value through and a present one does not -- and interns
 * styles by deep equality, so a present-and-undefined key mints a style id and a mesh of
 * its own for a look the element already had.
 *
 * WHAT IS NOT DONE HERE, deliberately. The four rich-text halves (node and edge label and
 * tooltip) are STEP 1 of two: a `ToggleRow` whose trailing is an `AdvancedButton` opening
 * a `Popout` that hosts the existing `RichTextStyleEditor` unchanged. That alone fixes the
 * margin and the row rhythm; swapping the 503-line editor's own primitives is step 2 and
 * spec:3428 already fixes the popout as the right shape for it.
 */

import {
    ActionRow,
    AdvancedButton,
    type ColorStop,
    CompactColorInput,
    ControlGroup,
    ControlSection,
    ControlSubGroup,
    DataRow,
    DEFAULT_GRADIENT_STOP_COLOR,
    FieldRow,
    GradientEditor,
    PanelField,
    Popout,
    ProseBlock,
    StyleNumberInput,
    StyleSelect,
    ToggleRow,
    ToggleRowGroup,
    ToggleWithContent,
} from "@graphty/compact-mantine";
import { Stack } from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
    ARROW_TYPE_OPTIONS,
    COLOR_MODE_OPTIONS,
    LINE_TYPE_OPTIONS,
    NODE_SHAPE_OPTIONS,
} from "../../../constants/style-options";
import type {
    ArrowConfig,
    ColorConfig,
    EdgeLineConfig,
    EdgeLineType,
    NodeEffectsConfig,
    RichTextStyle,
} from "../../../types/style-layer";
import { editorToElementRichTextStyle, elementToEditorRichTextStyle } from "../../../utils/richTextStyleBridge";
import {
    DEFAULT_ARROW_HEAD,
    DEFAULT_ARROW_TAIL,
    DEFAULT_COLOR,
    DEFAULT_EDGE_LINE,
    DEFAULT_GLOW,
    DEFAULT_OUTLINE,
    DEFAULT_RICH_TEXT_STYLE,
    DEFAULT_SHAPE,
} from "../../../utils/style-defaults";
import {
    editorToElementArrow,
    editorToElementColor,
    editorToElementEdgeLine,
    editorToElementEffects,
    editorToElementShape,
    elementToEditorArrow,
    elementToEditorEdgeLine,
    elementToEditorEffects,
    hasStyleBranch,
    narrowArrow,
    narrowColor,
    narrowLine,
    narrowShape,
} from "../../../utils/styleBridge";
import type { LayerItem } from "../../layout/LeftSidebar";
import {
    type CalculatedChannel,
    calculatedChannelOf,
    calculatedChannelWord,
    calculatedReason,
    calculatedSentence,
    type LayerChannelId,
} from "../../shell/inspector/calculatedChannels";
import { ComingTag } from "../../shell/inspector/ComingTag";
import { INSPECTOR_POPOUT_WIDE_WIDTH, INSPECTOR_SECTION_IDS } from "../../shell/inspector/inspectorConstants";
import { useInspectorSection } from "../../shell/inspector/sections";
import { RichTextStyleEditor } from "../controls/RichTextStyleEditor";

interface StyleLayerPropertiesPanelProps {
    layer: LayerItem;
    onUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
    onEdgeUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["edge"]>) => void;
}

type StyleRecord = Record<string, unknown>;

/** Full opacity in the editor's 0-100 scale. The element's own scale is 0-1. */
const FULL_OPACITY_PERCENT = 100;

/** The reason the Outline Width field is disabled. It is written by nobody's renderer. */
const OUTLINE_WIDTH_REASON = "Outline width is not drawn yet";

/** The reason the Flat shaded toggle is disabled. `effect.flatShaded` is read by nothing. */
const FLAT_SHADED_REASON = "Flat shading is not drawn yet";

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
 * The live style with the colour branch REMOVED, which is how a reader unsets a colour.
 *
 * Both spellings go: the element's `texture.color` and the editor-shaped `color` object an
 * older panel may have left behind. `texture` itself survives when it still holds an
 * `image` or an `icon`, and is dropped when the colour was all it had -- an empty
 * `texture: {}` is a present key and would intern as a style distinct from one with no
 * texture at all.
 * @param style - the layer's current node style, element-shaped.
 * @returns the same style with no colour anywhere in it.
 */
function withoutColorBranch(style: StyleRecord): StyleRecord {
    const base = withoutKey(style, "color");
    const existing = base.texture;

    if (existing === null || typeof existing !== "object" || Array.isArray(existing)) {
        return withoutKey(base, "texture");
    }

    const texture = withoutKey(existing as StyleRecord, "color");

    return Object.keys(texture).length === 0 ? withoutKey(base, "texture") : { ...base, texture };
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
 * "none" is WRITTEN rather than omitted. An absent branch and `{type: "none"}` are the
 * same picture on a lone layer, but graphty-element merges matching layers with
 * `defaultsDeep`, so an ABSENT arrow lets a LOWER layer's arrow through and a reader who
 * picks "no arrow" over a layer that draws arrows would still see arrows.
 * @param style - the layer's current edge style, element-shaped.
 * @param key - the branch this handler owns.
 * @param arrow - the arrow the control handed back, editor-shaped.
 * @returns the same style with that arrow written.
 */
function withArrowBranch(style: StyleRecord, key: "arrowHead" | "arrowTail", arrow: ArrowConfig): StyleRecord {
    const converted = editorToElementArrow(arrow);

    if (converted === undefined) {
        return withoutKey(style, key);
    }

    return { ...style, [key]: converted };
}

/**
 * The value a converted calculated channel is written at, in element shape.
 *
 * "Convert to a fixed value" cannot ask the rule what it produced: a calculated value is
 * evaluated PER NODE against that node's own data, so there is no single number or colour
 * to lift out of it. Each channel therefore lands on the value a reader would most expect
 * and can immediately change:
 *
 * - a BOOLEAN channel (`style.label.enabled`) becomes a fixed TRUE, because the rule that
 *   was there existed to turn the thing on for some nodes and the reader is choosing to
 *   keep it on for all of them;
 * - every other channel lands on the ELEMENT's own default for that channel, which is what
 *   the control was already drawing in italics beside it.
 *
 * An output path this build has no row for writes nothing at all -- the rule is detached
 * and the layer is left exactly as it was otherwise, which is the only honest thing to do
 * with a channel nothing here knows how to set.
 * @param style - the half's current style, element-shaped.
 * @param channel - the channel the rule owned, or undefined for an unmapped output path.
 * @returns the style with that channel written statically.
 */
function withConvertedChannel(style: StyleRecord, channel: LayerChannelId | undefined): StyleRecord {
    const branchOf = (key: string): StyleRecord => {
        const existing = style[key];

        return existing !== null && typeof existing === "object" && !Array.isArray(existing)
            ? (existing as StyleRecord)
            : {};
    };

    switch (channel) {
        case "node.label":
            return { ...style, label: { ...branchOf("label"), enabled: true } };

        case "node.color":
            return { ...style, texture: { ...branchOf("texture"), color: DEFAULT_COLOR.color } };

        case "node.size":
            return { ...style, shape: { ...branchOf("shape"), size: DEFAULT_SHAPE.size } };

        case "edge.color":
            return { ...style, line: { ...branchOf("line"), color: DEFAULT_EDGE_LINE.color } };

        case "edge.width":
            return { ...style, line: { ...branchOf("line"), width: DEFAULT_EDGE_LINE.width } };

        default:
            return style;
    }
}

/**
 * The editor-shaped colour stops for a gradient, with ids that survive a re-render.
 *
 * Positional rather than random, because a fresh `crypto.randomUUID()` per render would
 * remount every stop row on every keystroke elsewhere in the panel.
 *
 * STOP OFFSETS ARE NOT PERSISTED and cannot be until the element's schema changes.
 * `AdvancedColorStyle`'s gradient branch holds `colors: string[]` and has no positions at
 * all (graphty-element/src/config/common.ts), so a dragged position commits nothing and
 * the next read re-derives the stops as evenly spaced. That is why the editor is given
 * `minStops` and `maxStops` but no claim that a position means anything: the picker must
 * not offer a state the layer cannot keep. Per-stop offsets wait on a schema change that
 * is NOT in this round.
 * @param colors - the gradient's stop colours, in order.
 * @returns the stops, evenly spaced across 0-1.
 */
function toColorStops(colors: readonly string[]): ColorStop[] {
    const lastIndex = colors.length - 1;

    return colors.map((color, index) => ({
        id: `stop-${String(index)}`,
        offset: lastIndex <= 0 ? 0 : index / lastIndex,
        color,
    }));
}

/**
 * Panel for editing one style layer's node and edge channels.
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
    const nodeHalf = layer.styleLayer.node;
    const edgeHalf = layer.styleLayer.edge;

    const [selectorValue, setSelectorValue] = useState(nodeHalf?.selector ?? "");
    const [edgeSelectorValue, setEdgeSelectorValue] = useState(edgeHalf?.selector ?? "");
    const [armedConvert, setArmedConvert] = useState<"node" | "edge" | undefined>(undefined);

    useEffect(() => {
        setSelectorValue(layer.styleLayer.node?.selector ?? "");
        setEdgeSelectorValue(layer.styleLayer.edge?.selector ?? "");
        setArmedConvert(undefined);
    }, [layer]);

    /* Three of the four section ids are new. `inspector.layer.encoding` already existed
       and was referenced by nothing, which is what this surface was always meant to use
       for its channel rows. Wiring them through `useInspectorSection` writes into the
       shell store's persisted section map (6.5), so a reader's choice of what is open
       here survives a reload like every other tier 2 section. */
    const computedSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerComputed, true);
    const selectorSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerSelector, (nodeHalf?.selector ?? "").length > 0);
    const nodeSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerEncoding, true);
    const edgeSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerEdge, true);

    const currentStyle: StyleRecord = nodeHalf?.style ?? {};
    const currentEdgeStyle: StyleRecord = edgeHalf?.style ?? {};

    const nodeCalculated = useMemo(() => calculatedChannelOf(nodeHalf), [nodeHalf]);
    const edgeCalculated = useMemo(() => calculatedChannelOf(edgeHalf), [edgeHalf]);

    /**
     * The reason a channel's control is disabled, or undefined when it is live.
     * @param channel - the channel the control draws.
     * @returns the reason sentence, or undefined.
     */
    const reasonFor = (channel: LayerChannelId): string | undefined => {
        const rule = channel.startsWith("node.") ? nodeCalculated : edgeCalculated;

        return rule?.channel === channel ? calculatedReason(rule.sourceWord) : undefined;
    };

    /* READ NARROWLY. Each of these is `T | undefined`, and `undefined` reaches the control
       as "the reader has not chosen anything" rather than as the editor's default dressed
       up as a choice. This is defect 3 in the file header. */
    const shape = narrowShape(currentStyle);
    const color = narrowColor(currentStyle);
    const effectsConfig: NodeEffectsConfig = elementToEditorEffects(currentStyle.effect ?? currentStyle.effects);
    const line = narrowLine(currentEdgeStyle);
    const arrowHead = narrowArrow(currentEdgeStyle, "arrowHead");
    const arrowTail = narrowArrow(currentEdgeStyle, "arrowTail");

    const nodeLabelConfig: RichTextStyle = elementToEditorRichTextStyle(currentStyle.label);
    const nodeTooltipConfig: RichTextStyle = elementToEditorRichTextStyle(currentStyle.tooltip);
    const edgeLabelConfig: RichTextStyle = elementToEditorRichTextStyle(currentEdgeStyle.label);
    const edgeTooltipConfig: RichTextStyle = elementToEditorRichTextStyle(currentEdgeStyle.tooltip);

    /* Every handler below PATCHES: it writes the one branch it owns over the style the
       ELEMENT currently holds, and carries every other key across untouched. They each
       used to restate the whole style from the editors' re-derived models, so editing any
       one branch rewrote all five with whatever the editors had made of them -- and for
       the two rich-text branches that was not merely lossy but breaking, because the
       editor's nested shape does not parse against the element's flat `strictObject` and
       the labels rebuilt as blank textures. graphty-element also interns styles by deep
       value equality and keys its mesh cache on the id it hands back, so a branch written
       in the editor's shape rather than the element's mints a style id and a mesh of its
       own for a look the element already had. */
    const writeNode = useCallback(
        (style: StyleRecord): void => {
            onUpdate?.(layer.id, { selector: layer.styleLayer.node?.selector ?? "", style });
        },
        [layer, onUpdate],
    );

    const writeEdge = useCallback(
        (style: StyleRecord): void => {
            onEdgeUpdate?.(layer.id, { selector: layer.styleLayer.edge?.selector ?? "", style });
        },
        [layer, onEdgeUpdate],
    );

    /* SLP-4: commit on CHANGE, not on a bare focus loss. `handleEdgeSelectorBlur` used to
       fire on ANY blur and write `{selector: "", style: {}}`, which materialised an
       every-edge half on a layer that had none -- and the legend and the reading then
       described an edge encoding nobody asked for. The node selector was safe only
       because its JSON happened to round-trip identically, which is not a property to
       rely on. Both now compare against the value the layer holds and return early. */
    const commitSelector = (): void => {
        if (selectorValue !== (nodeHalf?.selector ?? "")) {
            onUpdate?.(layer.id, { selector: selectorValue, style: currentStyle });
        }
    };

    const commitEdgeSelector = (): void => {
        if (edgeSelectorValue !== (edgeHalf?.selector ?? "")) {
            onEdgeUpdate?.(layer.id, { selector: edgeSelectorValue, style: currentEdgeStyle });
        }
    };

    /* SHAPE. A reset on either field is written by REMOVING the branch when nothing is
       left in it, never by writing `{type: undefined}` -- which the element would intern
       as a style of its own. */
    const writeShape = (type: string | undefined, size: number | undefined): void => {
        if (type === undefined && size === undefined) {
            writeNode(withoutKey(currentStyle, "shape"));

            return;
        }

        writeNode({
            ...currentStyle,
            shape: editorToElementShape({ type: type ?? DEFAULT_SHAPE.type, size: size ?? DEFAULT_SHAPE.size }),
        });
    };

    /* COLOUR. One write per gesture, through compact-mantine's combined `onChange`. The
       app used to carry a FORK of CompactColorInput for exactly this: calling
       `onColorChange` and `onOpacityChange` back to back inside one React batch made the
       second write rebuild from the pre-gesture snapshot in this render closure and drop
       the first, so a half-transparent swatch lost its colour. The library carries the
       combined callback now, so the fork is gone and only `onChange` is supplied -- never
       alongside the single-channel callbacks, which would double-write. */
    const writeSolidColor = (nextColor: string | undefined, nextOpacity: number | undefined): void => {
        if (nextColor === undefined && nextOpacity === undefined) {
            writeNode(withoutColorBranch(currentStyle));

            return;
        }

        writeNode(
            withColorBranch(currentStyle, {
                mode: "solid",
                color: nextColor ?? DEFAULT_COLOR.color,
                opacity: (nextOpacity ?? FULL_OPACITY_PERCENT) / FULL_OPACITY_PERCENT,
            }),
        );
    };

    const writeColorMode = (mode: string | undefined): void => {
        if (mode === undefined || mode === "solid") {
            writeSolidColor(color.color ?? DEFAULT_COLOR.color, color.opacityPercent ?? FULL_OPACITY_PERCENT);

            return;
        }

        const stops = toColorStops(
            color.colors !== undefined && color.colors.length > 1
                ? color.colors
                : [color.color ?? DEFAULT_COLOR.color, DEFAULT_GRADIENT_STOP_COLOR],
        );

        writeNode(
            withColorBranch(
                currentStyle,
                mode === "radial"
                    ? { mode: "radial", stops, opacity: (color.opacityPercent ?? FULL_OPACITY_PERCENT) / FULL_OPACITY_PERCENT }
                    : {
                          mode: "gradient",
                          stops,
                          direction: color.direction ?? 0,
                          opacity: (color.opacityPercent ?? FULL_OPACITY_PERCENT) / FULL_OPACITY_PERCENT,
                      },
            ),
        );
    };

    const writeGradient = (stops: ColorStop[], direction: number): void => {
        writeNode(
            withColorBranch(
                currentStyle,
                color.mode === "radial"
                    ? { mode: "radial", stops, opacity: (color.opacityPercent ?? FULL_OPACITY_PERCENT) / FULL_OPACITY_PERCENT }
                    : {
                          mode: "gradient",
                          stops,
                          direction,
                          opacity: (color.opacityPercent ?? FULL_OPACITY_PERCENT) / FULL_OPACITY_PERCENT,
                      },
            ),
        );
    };

    const writeEffects = (effects: NodeEffectsConfig): void => {
        writeNode(withEffectBranch(currentStyle, effects));
    };

    /* EDGE LINE. Written whole through the bridge, because the element's schema reads a
       line branch as a unit and the existing write tests pin the 0-100 to 0-1 opacity
       conversion -- an unconverted 100 does not merely look wrong, it fails the parse and
       takes the whole edge style with it. */
    const editorLine = (): EdgeLineConfig => elementToEditorEdgeLine(currentEdgeStyle.line);

    const writeLine = (next: Partial<EdgeLineConfig>): void => {
        writeEdge({ ...currentEdgeStyle, line: editorToElementEdgeLine({ ...editorLine(), ...next }) });
    };

    const writeArrow = (key: "arrowHead" | "arrowTail", next: Partial<ArrowConfig>): void => {
        const fallback = key === "arrowHead" ? DEFAULT_ARROW_HEAD : DEFAULT_ARROW_TAIL;
        const current = elementToEditorArrow(currentEdgeStyle[key], fallback);

        writeEdge(withArrowBranch(currentEdgeStyle, key, { ...current, ...next }));
    };

    /**
     * Detaches a calculated rule and writes its channel at a fixed value.
     *
     * DESTRUCTIVE, AND NOT UNDOABLE FROM HERE. The shell's history (spec 2631) records no
     * entry on the `onUpdate` / `onEdgeUpdate` path -- I looked for one and there is none
     * -- so once the expression is written out of the layer it cannot be brought back.
     * That is why the verb is ARMED first and committed second, with the consequence
     * stated in between, rather than acting on a single click. A confirmation was chosen
     * over adding a history entry because the history model is another unit's surface and
     * a half-wired undo would be worse than an explicit question.
     *
     * The write also has a second consequence a reader must be told about: `markHandBound`
     * fires on any layer edit, so a converted "Top degree labels" stops being a layer the
     * next load may replace. That is correct -- the reader has made it theirs -- but it is
     * not guessable, so the confirmation says it.
     * @param side - which half of the layer carries the rule.
     * @param calculated - the rule being detached.
     */
    const convertToFixed = (side: "node" | "edge", calculated: CalculatedChannel): void => {
        setArmedConvert(undefined);

        /* `calculatedStyle: undefined` is how the rule is dropped. `exactOptionalPropertyTypes`
           is off, `sameStyleHalf` sees the JSON differ because the before-half carried the
           object, and `elementStyleHalf` omits the key entirely when it is undefined, so the
           element's layer comes back with no rule on it. */
        if (side === "node") {
            onUpdate?.(layer.id, {
                selector: nodeHalf?.selector ?? "",
                calculatedStyle: undefined,
                style: withConvertedChannel(currentStyle, calculated.channel),
            });

            return;
        }

        onEdgeUpdate?.(layer.id, {
            selector: edgeHalf?.selector ?? "",
            calculatedStyle: undefined,
            style: withConvertedChannel(currentEdgeStyle, calculated.channel),
        });
    };

    /**
     * One calculated rule, drawn as a reading, its two facts, the verb, and the raw
     * expression behind a collapsed sub-group.
     * @param side - which half of the layer carries the rule.
     * @param calculated - the rule.
     * @returns the block, or null when the half has no rule.
     */
    const renderComputed = (side: "node" | "edge", calculated: CalculatedChannel | undefined): React.ReactNode => {
        if (calculated === undefined) {
            return null;
        }

        const armed = armedConvert === side;

        return (
            <React.Fragment key={side}>
                <ProseBlock variant="reading">{calculatedSentence(calculated, side)}</ProseBlock>
                <DataRow name="Channel" value={calculatedChannelWord(calculated.channel, calculated.output)} />
                <DataRow name="From" value={calculated.sourceWord} />
                {armed ? (
                    <>
                        <ProseBlock variant="departure">
                            {
                                "Converting deletes this rule. It cannot be brought back, and this layer will no longer be replaced when the graph is reloaded."
                            }
                        </ProseBlock>
                        <ActionRow
                            state="Yes, convert to a fixed value"
                            onClick={() => {
                                convertToFixed(side, calculated);
                            }}
                        />
                        <ActionRow
                            state="Cancel"
                            onClick={() => {
                                setArmedConvert(undefined);
                            }}
                        />
                    </>
                ) : (
                    <ActionRow
                        state="Convert to a fixed value"
                        onClick={() => {
                            setArmedConvert(side);
                        }}
                    />
                )}
                {/* spec:3428's tier 3 Expression mode: the inputs and the expression are
                    reachable, and COLLAPSED, because `expr` is a JavaScript string and
                    putting it in front of a reader as an explanation explains nothing. */}
                <ControlSubGroup label="Expression">
                    <DataRow name="Output" value={calculated.output} />
                    <DataRow name="Expression" value={calculated.expr} />
                </ControlSubGroup>
            </React.Fragment>
        );
    };

    /**
     * One rich-text channel: a toggle for whether the layer styles it at all, and an
     * advanced button opening the existing editor in a popout.
     * @param options - the row's wiring.
     * @param options.label - the row's name, e.g. "Label".
     * @param options.editorLabel - the editor's own name, e.g. "Node Label".
     * @param options.style - the half's current style.
     * @param options.branch - which branch of it this row owns.
     * @param options.config - the branch read into the editor's shape.
     * @param options.write - commits a new style for the half.
     * @param options.channel - the channel a calculated rule could own, when there is one.
     * @returns the toggle row and its popout.
     */
    const renderRichText = (options: {
        label: string;
        editorLabel: string;
        style: StyleRecord;
        branch: "label" | "tooltip";
        config: RichTextStyle;
        write: (style: StyleRecord) => void;
        channel?: LayerChannelId;
    }): React.JSX.Element => {
        const { label, editorLabel, style, branch, config, write, channel } = options;
        const reason = channel === undefined ? undefined : reasonFor(channel);
        const set = hasStyleBranch(style, branch);

        return (
            <ControlGroup label={label}>
                <ToggleRow
                    label={label}
                    /* A calculated rule that turns labels on for some nodes reads as ON
                       here. It used to read as UNCHECKED, because the panel looked only at
                       the static half -- which is the product owner's report: "the 'top
                       degree label' doesn't show the 'label' as 'enabled'". */
                    checked={set || reason !== undefined}
                    disabled={reason !== undefined}
                    disabledReason={reason}
                    bound={reason !== undefined}
                    onChange={(checked) => {
                        write(
                            checked
                                ? withRichTextBranch(style, branch, { ...DEFAULT_RICH_TEXT_STYLE, enabled: true })
                                : withoutKey(style, branch),
                        );
                    }}
                    trailing={
                        <Popout>
                            <Popout.Trigger>
                                <AdvancedButton label={`${label} settings`} changed={set} />
                            </Popout.Trigger>
                            <Popout.Panel
                                width={INSPECTOR_POPOUT_WIDE_WIDTH}
                                placement="left"
                                alignment="start"
                                header={{ variant: "title", title: `${label} settings` }}
                            >
                                <Popout.Content>
                                    <RichTextStyleEditorHost
                                        editorLabel={editorLabel}
                                        config={config}
                                        onChange={(next) => {
                                            write(withRichTextBranch(style, branch, next));
                                        }}
                                    />
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    }
                />
            </ControlGroup>
        );
    };

    const shapeSizeReason = reasonFor("node.size");
    const nodeColorReason = reasonFor("node.color");
    const edgeColorReason = reasonFor("edge.color");
    const edgeWidthReason = reasonFor("edge.width");
    const gradientMode = color.mode === "gradient" || color.mode === "radial";

    return (
        <Stack gap={0}>
            {/* The `Layer: {name}` header that used to sit here is GONE. InspectorHeader
                already draws the layer's name directly above this panel, so it was a
                duplicate costing a row of a 280px surface. */}

            {(nodeCalculated !== undefined || edgeCalculated !== undefined) && (
                <ControlSection
                    label="Computed"
                    opened={computedSection.opened}
                    onOpenChange={computedSection.onOpenChange}
                    info="This layer's value for one channel is worked out per node from the data, so the control for it is bound and cannot be typed into."
                >
                    {renderComputed("node", nodeCalculated)}
                    {renderComputed("edge", edgeCalculated)}
                </ControlSection>
            )}

            {nodeHalf !== undefined && (
                <ControlSection
                    label="Which nodes"
                    opened={selectorSection.opened}
                    onOpenChange={selectorSection.onOpenChange}
                    hasConfiguredValues={selectorValue.length > 0}
                    info="A JMESPath expression. An empty selector matches every node."
                >
                    <FieldRow>
                        <PanelField
                            label="Selector"
                            aria-label="Node Selector"
                            kind="text"
                            glyph="attribute"
                            width="fill"
                            value={selectorValue}
                            placeholder="every node"
                            onChange={(next) => {
                                setSelectorValue(String(next));
                            }}
                            onBlur={commitSelector}
                        />
                    </FieldRow>
                </ControlSection>
            )}

            {nodeHalf === undefined ? (
                <ControlSection
                    label="Node"
                    empty
                    opened={nodeSection.opened}
                    onOpenChange={nodeSection.onOpenChange}
                    onAdd={() => {
                        onUpdate?.(layer.id, { selector: "", style: {} });
                    }}
                />
            ) : (
                <ControlSection label="Node" opened={nodeSection.opened} onOpenChange={nodeSection.onOpenChange}>
                    <ControlGroup label="Shape">
                        {/* A FLAT option list. compact-mantine's StyleSelect takes no
                            groups, and dropping back to Mantine's NativeSelect at the call
                            site to keep the old Basic / Platonic / Spherical headings is
                            exactly the bespoke substitute 6.17 check 1 forbids. Ordered
                            basic-to-exotic instead; grouping is a library follow-up. */}
                        <StyleSelect
                            label="Type"
                            value={shape.type}
                            defaultValue={DEFAULT_SHAPE.type}
                            options={NODE_SHAPE_OPTIONS}
                            onChange={(next) => {
                                writeShape(next, shape.size);
                            }}
                        />
                        <StyleNumberInput
                            label="Size"
                            value={shape.size}
                            defaultValue={DEFAULT_SHAPE.size}
                            min={0.1}
                            step={0.1}
                            decimalScale={1}
                            disabled={shapeSizeReason !== undefined}
                            disabledReason={shapeSizeReason}
                            onChange={(next) => {
                                writeShape(shape.type, next);
                            }}
                        />
                    </ControlGroup>

                    <ControlGroup label="Color">
                        <StyleSelect
                            label="Fill"
                            value={color.mode}
                            defaultValue="solid"
                            options={COLOR_MODE_OPTIONS}
                            disabled={nodeColorReason !== undefined}
                            disabledReason={nodeColorReason}
                            onChange={writeColorMode}
                        />
                        {gradientMode ? (
                            <GradientEditor
                                stops={toColorStops(color.colors ?? [])}
                                direction={color.direction ?? 0}
                                showDirection={color.mode === "gradient"}
                                minStops={2}
                                maxStops={5}
                                /* `onChangeEnd` is the COMMIT and `onChange` the live
                                   preview, so dragging a stop is one layer write rather
                                   than one per step -- every write reaches the element and
                                   repaints every matching node. */
                                onChangeEnd={writeGradient}
                            />
                        ) : (
                            <CompactColorInput
                                label="Color"
                                color={color.color}
                                defaultColor={DEFAULT_COLOR.color}
                                opacity={color.opacityPercent}
                                defaultOpacity={FULL_OPACITY_PERCENT}
                                disabled={nodeColorReason !== undefined}
                                disabledReason={nodeColorReason}
                                onChange={writeSolidColor}
                            />
                        )}
                    </ControlGroup>

                    <ControlGroup label="Effects">
                        <ToggleWithContent
                            label="Glow"
                            checked={effectsConfig.glow !== undefined}
                            onChange={(checked) => {
                                writeEffects({
                                    ...effectsConfig,
                                    glow: checked ? { ...DEFAULT_GLOW, enabled: true } : undefined,
                                });
                            }}
                        >
                            <CompactColorInput
                                label="Glow color"
                                showOpacity={false}
                                color={effectsConfig.glow?.color}
                                defaultColor={DEFAULT_GLOW.color}
                                onChange={(next) => {
                                    writeEffects({
                                        ...effectsConfig,
                                        glow: {
                                            enabled: true,
                                            color: next ?? DEFAULT_GLOW.color,
                                            strength: effectsConfig.glow?.strength ?? DEFAULT_GLOW.strength,
                                        },
                                    });
                                }}
                            />
                            <StyleNumberInput
                                label="Strength"
                                value={effectsConfig.glow?.strength}
                                defaultValue={DEFAULT_GLOW.strength}
                                min={0}
                                max={1}
                                step={0.1}
                                decimalScale={2}
                                onChange={(next) => {
                                    writeEffects({
                                        ...effectsConfig,
                                        glow: {
                                            enabled: true,
                                            color: effectsConfig.glow?.color ?? DEFAULT_GLOW.color,
                                            strength: next ?? DEFAULT_GLOW.strength,
                                        },
                                    });
                                }}
                            />
                        </ToggleWithContent>

                        <ToggleWithContent
                            label="Outline"
                            checked={effectsConfig.outline !== undefined}
                            onChange={(checked) => {
                                writeEffects({
                                    ...effectsConfig,
                                    outline: checked ? { ...DEFAULT_OUTLINE, enabled: true } : undefined,
                                });
                            }}
                        >
                            <CompactColorInput
                                label="Outline color"
                                showOpacity={false}
                                color={effectsConfig.outline?.color}
                                defaultColor={DEFAULT_OUTLINE.color}
                                onChange={(next) => {
                                    writeEffects({
                                        ...effectsConfig,
                                        outline: {
                                            enabled: true,
                                            color: next ?? DEFAULT_OUTLINE.color,
                                            width: effectsConfig.outline?.width ?? DEFAULT_OUTLINE.width,
                                        },
                                    });
                                }}
                            />
                            {/* `effect.outline.width` is written here and read by NOTHING:
                                graphty-element draws an outline with Babylon's
                                HighlightLayer, which takes a colour and no width. Floor
                                item 4 and spec:6641 say a disabled control names its
                                reason rather than sitting there dimmed and silent, and
                                6.16 check 2 says the channel stays VISIBLE -- a reader who
                                set a width in a saved template needs to see why it is not
                                drawing. */}
                            <StyleNumberInput
                                label="Width"
                                value={effectsConfig.outline?.width}
                                defaultValue={DEFAULT_OUTLINE.width}
                                min={0}
                                disabled
                                disabledReason={OUTLINE_WIDTH_REASON}
                            />
                        </ToggleWithContent>

                        <ToggleRowGroup label="Surface">
                            <ToggleRow
                                label="Wireframe"
                                checked={effectsConfig.wireframe ?? false}
                                onChange={(checked) => {
                                    writeEffects({ ...effectsConfig, wireframe: checked });
                                }}
                            />
                            {/* `effect.flatShaded` appears exactly once in graphty-element:
                                on its own schema line. Nothing reads it. */}
                            <ToggleRow
                                label="Flat shaded"
                                checked={effectsConfig.flatShaded ?? false}
                                disabled
                                disabledReason={FLAT_SHADED_REASON}
                                trailing={<ComingTag subject="Flat shaded" />}
                            />
                        </ToggleRowGroup>
                    </ControlGroup>

                    {renderRichText({
                        label: "Label",
                        editorLabel: "Node Label",
                        style: currentStyle,
                        branch: "label",
                        config: nodeLabelConfig,
                        write: writeNode,
                        channel: "node.label",
                    })}

                    {renderRichText({
                        label: "Tooltip",
                        editorLabel: "Node Tooltip",
                        style: currentStyle,
                        branch: "tooltip",
                        config: nodeTooltipConfig,
                        write: writeNode,
                    })}
                </ControlSection>
            )}

            {edgeHalf === undefined ? (
                /* An EMPTY section with an add control, which is exactly the contract
                   compact-mantine documents for a section that is not set up. `onAdd` is
                   the ONE place an edge half should ever be created -- it used to be
                   created by a bare focus loss on a selector field the layer never asked
                   for. */
                <ControlSection
                    label="Edge"
                    empty
                    opened={edgeSection.opened}
                    onOpenChange={edgeSection.onOpenChange}
                    onAdd={() => {
                        onEdgeUpdate?.(layer.id, { selector: "", style: {} });
                    }}
                />
            ) : (
                <ControlSection label="Edge" opened={edgeSection.opened} onOpenChange={edgeSection.onOpenChange}>
                    <FieldRow>
                        <PanelField
                            label="Selector"
                            aria-label="Edge Selector"
                            kind="text"
                            glyph="attribute"
                            width="fill"
                            value={edgeSelectorValue}
                            placeholder="every edge"
                            onChange={(next) => {
                                setEdgeSelectorValue(String(next));
                            }}
                            onBlur={commitEdgeSelector}
                        />
                    </FieldRow>

                    <ControlGroup label="Line">
                        {/* The eight patterned line types are LIVE. They used to build one
                            uncached Babylon mesh and one ShaderMaterial per dash with no
                            upper bound, so "dot" at width 1 put roughly ten thousand
                            meshes on a 78-edge graph and the app stopped responding; the
                            cap now lives in the element. spec:3428's "Matches N nodes"
                            helper line is what a per-layer performance gate would need
                            next, and the panel has no match count to build it from yet. */}
                        <StyleSelect
                            label="Type"
                            value={line.type}
                            defaultValue={DEFAULT_EDGE_LINE.type}
                            options={[...LINE_TYPE_OPTIONS]}
                            onChange={(next) => {
                                writeLine({ type: (next ?? DEFAULT_EDGE_LINE.type) as EdgeLineType });
                            }}
                        />
                        <StyleNumberInput
                            label="Width"
                            value={line.width}
                            defaultValue={DEFAULT_EDGE_LINE.width}
                            min={0.1}
                            step={0.1}
                            decimalScale={1}
                            disabled={edgeWidthReason !== undefined}
                            disabledReason={edgeWidthReason}
                            onChange={(next) => {
                                writeLine({ width: next ?? DEFAULT_EDGE_LINE.width });
                            }}
                        />
                        <CompactColorInput
                            label="Color"
                            color={line.color}
                            defaultColor={DEFAULT_EDGE_LINE.color}
                            opacity={line.opacityPercent}
                            defaultOpacity={FULL_OPACITY_PERCENT}
                            disabled={edgeColorReason !== undefined}
                            disabledReason={edgeColorReason}
                            onChange={(nextColor, nextOpacity) => {
                                writeLine({
                                    color: nextColor ?? DEFAULT_EDGE_LINE.color,
                                    opacity: nextOpacity ?? FULL_OPACITY_PERCENT,
                                });
                            }}
                        />
                    </ControlGroup>

                    <ControlGroup label="Arrow head">
                        {/* The "Arrow Head" prefix is gone from each field's own name: the
                            group already says which end of the edge these belong to, and
                            three fields called "Arrow Head Type", "Arrow Head Size" and
                            "Arrow Head Color" inside a group called "Arrow Head" spent the
                            label column saying it three more times. */}
                        <StyleSelect
                            label="Type"
                            value={arrowHead.type}
                            defaultValue={DEFAULT_ARROW_HEAD.type}
                            options={[...ARROW_TYPE_OPTIONS]}
                            onChange={(next) => {
                                writeArrow("arrowHead", { type: (next ?? DEFAULT_ARROW_HEAD.type) as ArrowConfig["type"] });
                            }}
                        />
                        {(arrowHead.type ?? DEFAULT_ARROW_HEAD.type) !== "none" && (
                            <>
                                <StyleNumberInput
                                    label="Size"
                                    value={arrowHead.size}
                                    defaultValue={DEFAULT_ARROW_HEAD.size}
                                    min={0.1}
                                    step={0.1}
                                    decimalScale={1}
                                    onChange={(next) => {
                                        writeArrow("arrowHead", { size: next ?? DEFAULT_ARROW_HEAD.size });
                                    }}
                                />
                                <CompactColorInput
                                    label="Color"
                                    color={arrowHead.color}
                                    defaultColor={DEFAULT_ARROW_HEAD.color}
                                    opacity={arrowHead.opacityPercent}
                                    defaultOpacity={FULL_OPACITY_PERCENT}
                                    onChange={(nextColor, nextOpacity) => {
                                        writeArrow("arrowHead", {
                                            color: nextColor ?? DEFAULT_ARROW_HEAD.color,
                                            opacity: nextOpacity ?? FULL_OPACITY_PERCENT,
                                        });
                                    }}
                                />
                            </>
                        )}
                    </ControlGroup>

                    {/* spec:3428 puts the arrow TAIL under More, so it is a collapsed
                        sub-group rather than a second peer group with equal weight. A
                        ControlSubGroup and not a Popout: it is the library's own
                        collapsed-detail row and needs no extra plumbing. */}
                    <ControlSubGroup label="Arrow tail">
                        <StyleSelect
                            label="Type"
                            value={arrowTail.type}
                            defaultValue={DEFAULT_ARROW_TAIL.type}
                            options={[...ARROW_TYPE_OPTIONS]}
                            onChange={(next) => {
                                writeArrow("arrowTail", { type: (next ?? DEFAULT_ARROW_TAIL.type) as ArrowConfig["type"] });
                            }}
                        />
                        {(arrowTail.type ?? DEFAULT_ARROW_TAIL.type) !== "none" && (
                            <>
                                <StyleNumberInput
                                    label="Size"
                                    value={arrowTail.size}
                                    defaultValue={DEFAULT_ARROW_TAIL.size}
                                    min={0.1}
                                    step={0.1}
                                    decimalScale={1}
                                    onChange={(next) => {
                                        writeArrow("arrowTail", { size: next ?? DEFAULT_ARROW_TAIL.size });
                                    }}
                                />
                                <CompactColorInput
                                    label="Color"
                                    color={arrowTail.color}
                                    defaultColor={DEFAULT_ARROW_TAIL.color}
                                    opacity={arrowTail.opacityPercent}
                                    defaultOpacity={FULL_OPACITY_PERCENT}
                                    onChange={(nextColor, nextOpacity) => {
                                        writeArrow("arrowTail", {
                                            color: nextColor ?? DEFAULT_ARROW_TAIL.color,
                                            opacity: nextOpacity ?? FULL_OPACITY_PERCENT,
                                        });
                                    }}
                                />
                            </>
                        )}
                    </ControlSubGroup>

                    {renderRichText({
                        label: "Label",
                        editorLabel: "Edge Label",
                        style: currentEdgeStyle,
                        branch: "label",
                        config: edgeLabelConfig,
                        write: writeEdge,
                    })}

                    {renderRichText({
                        label: "Tooltip",
                        editorLabel: "Edge Tooltip",
                        style: currentEdgeStyle,
                        branch: "tooltip",
                        config: edgeTooltipConfig,
                        write: writeEdge,
                    })}
                </ControlSection>
            )}
        </Stack>
    );
}

/**
 * The existing rich-text editor, hosted inside a popout.
 *
 * Step 1 of two, per spec:3428. The editor itself is UNCHANGED -- its 503 lines are still
 * built from Mantine primitives and the sidebar's own forks -- and this host exists only
 * so that the panel's own rows can be library rows while the editor waits its turn. Step 2
 * swaps its primitives for `PanelField`, `StyleSelect`, `StyleNumberInput`,
 * `CompactColorInput` and `ControlSubGroup` and deletes the forks it is the last consumer
 * of.
 *
 * It is a separate component rather than an inline expression so that the editor's own
 * `useState` is not remounted every time an unrelated row of the panel writes.
 * @param props - the host's props.
 * @param props.editorLabel - the editor's own name, which is also its test id suffix.
 * @param props.config - the branch read into the editor's shape.
 * @param props.onChange - called with the editor's new style.
 * @returns the editor.
 */
function RichTextStyleEditorHost(props: {
    editorLabel: string;
    config: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}): React.JSX.Element {
    const { editorLabel, config, onChange } = props;

    return <RichTextStyleEditor label={editorLabel} value={config} onChange={onChange} />;
}
