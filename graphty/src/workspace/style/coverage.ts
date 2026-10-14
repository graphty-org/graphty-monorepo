import type { Channel, LabelStyle } from "@graphty/graphty-element/catalog";
import { GraphBackground, GraphSelectionStyleOpts } from "@graphty/graphty-element/schema";

/**
 * Where a style lives in the panel: the control that sets it, or why the panel does not offer it.
 * Every channel, label style field and graph setting graphty-element publishes has one, so a style
 * the element adds cannot go missing from the panel unnoticed (`__tests__/coverage.test.ts`).
 */
export type Home = { readonly place: string } | { readonly notOffered: string };

const at = (place: string): Home => ({ place });
const no = (notOffered: string): Home => ({ notOffered });

/** Every channel, by where the Style tab sets it. */
export const CHANNEL_HOMES: Readonly<Record<Channel, Home>> = {
    "node.color": at("Nodes, Fill, Color"),
    "node.size": at("Nodes, Shape, Size"),
    "node.shape": at("Nodes, Shape, Shape"),
    "node.opacity": at("Nodes, Visibility, Opacity"),
    "node.wireframe": at("Nodes, Rendering, Wireframe"),
    "node.visible": at("Nodes, Visibility, Show"),
    "node.label": at("Nodes, Text, Label entry, source (a value, or Fixed text)"),
    "node.labelStyle": at("Nodes, Label entry look, position and Label settings"),
    "node.labelSize": at("Nodes, Label entry, size"),
    "node.labelColor": at("Nodes, Label settings, Text color (varies by a value)"),
    "node.labelBackground": at("Nodes, Label settings, Background (varies by a value)"),
    "node.tooltip": at("Nodes, Text, Tooltip entry, source"),
    "node.tooltipStyle": at("Nodes, Text, Tooltip entry look, position and Tooltip settings"),
    "node.tooltipSize": at("Nodes, Text, Tooltip entry size"),
    "node.tooltipColor": at("Nodes, Text, Tooltip entry Tooltip settings, Text color"),
    "node.tooltipBackground": at("Nodes, Text, Tooltip entry Tooltip settings, Background"),
    "node.outline": at("Nodes, Effects, Outline"),
    "node.glow": at("Nodes, Effects, Glow"),
    "node.glowStrength": at("Nodes, Effects, Glow strength"),
    "node.haloColor": at("Nodes, Effects, Halo"),
    "node.haloSize": at("Nodes, Effects, Halo size"),
    "node.haloOpacity": at("Nodes, Effects, Halo opacity"),
    "node.flat": no('nothing draws it; Graph settings, Lighting "flat" gives the look'),
    "node.marker": no("graphty-element refuses it"),
    "edge.color": at("Edges, Line, Color"),
    "edge.width": at("Edges, Line, Width"),
    "edge.opacity": at("Edges, Visibility, Opacity"),
    "edge.style": at("Edges, Line, Pattern"),
    "edge.patternCount": at("Edges, Line, Pattern count"),
    "edge.curvature": at("Edges, Line, Curved"),
    "edge.visible": at("Edges, Visibility, Show"),
    "edge.arrowHead": at("Edges, Ends, Head"),
    "edge.arrowTail": at("Edges, Ends, Tail"),
    "edge.arrowHeadSize": at("Edges, Ends"),
    "edge.arrowHeadColor": at("Edges, Ends"),
    "edge.arrowHeadOpacity": at("Edges, Ends"),
    "edge.arrowTailSize": at("Edges, Ends"),
    "edge.arrowTailColor": at("Edges, Ends"),
    "edge.arrowTailOpacity": at("Edges, Ends"),
    "edge.arrowHeadText": at("Edges, Text, Caption at the target end, source"),
    "edge.arrowHeadTextStyle": at("Edges, Text, Caption at the target end look, position and settings"),
    "edge.arrowHeadTextSize": at("Edges, Text, Caption at the target end size"),
    "edge.arrowHeadTextColor": at("Edges, Text, Caption at the target end settings, Text color"),
    "edge.arrowHeadTextBackground": at("Edges, Text, Caption at the target end settings, Background"),
    "edge.arrowTailText": at("Edges, Text, Caption at the source end, source"),
    "edge.arrowTailTextStyle": at("Edges, Text, Caption at the source end look, position and settings"),
    "edge.arrowTailTextSize": at("Edges, Text, Caption at the source end size"),
    "edge.arrowTailTextColor": at("Edges, Text, Caption at the source end settings, Text color"),
    "edge.arrowTailTextBackground": at("Edges, Text, Caption at the source end settings, Background"),
    "edge.bandColor": at("Edges, Effects, Band"),
    "edge.bandWidth": at("Edges, Effects, Band width"),
    "edge.bandOpacity": at("Edges, Effects, Band opacity"),
    "edge.animationSpeed": at("Edges, Effects, Motion"),
    "edge.label": at("Edges, Text, Label entry, source (a value, or Fixed text)"),
    "edge.labelStyle": at("Edges, Label entry look, position and Label settings"),
    "edge.labelSize": at("Edges, Label entry, size"),
    "edge.labelColor": at("Edges, Label settings, Text color (varies by a value)"),
    "edge.labelBackground": at("Edges, Label settings, Background (varies by a value)"),
};

const TYPE = at("Label settings, Type");
const BOX = at("Label settings, Box");
const LETTERS = at("Label settings, Letters");
const PLACEMENT = at("Label settings, Placement");
const MOTION = at("Label settings, Motion and distance");
const BADGE = at("Label settings, Badge");

/** Every field of a label's style, by where the label entry or its settings set it. */
export const LABEL_FIELD_HOMES: Readonly<Record<keyof LabelStyle, Home>> = {
    look: at("Label entry, look"),
    enabled: at("Label entry, eye (off draws no label here)"),
    sizePx: at("Label entry, size (through the label size channel)"),
    sizeUnit: at("Label settings, Type, Size in (a new label is sized in screen pixels)"),
    location: at("Label entry, position"),
    color: at("Label settings, Text color"),
    background: at("Label settings, Background"),
    font: TYPE,
    weight: TYPE,
    lineHeight: TYPE,
    textAlign: TYPE,
    padding: BOX,
    cornerRadius: BOX,
    borderWidth: BOX,
    borderColor: BOX,
    marginTop: BOX,
    marginBottom: BOX,
    marginLeft: BOX,
    marginRight: BOX,
    gradient: BOX,
    gradientType: BOX,
    gradientDirection: BOX,
    gradientColors: BOX,
    outline: LETTERS,
    outlineWidth: LETTERS,
    shadow: LETTERS,
    shadowColor: LETTERS,
    shadowBlur: LETTERS,
    shadowOffsetX: LETTERS,
    shadowOffsetY: LETTERS,
    attachOffset: PLACEMENT,
    pointer: PLACEMENT,
    pointerDirection: PLACEMENT,
    pointerWidth: PLACEMENT,
    pointerHeight: PLACEMENT,
    pointerOffset: PLACEMENT,
    pointerCurve: PLACEMENT,
    onTop: PLACEMENT,
    pickable: PLACEMENT,
    animation: MOTION,
    animationSpeed: MOTION,
    depthFade: MOTION,
    depthFadeNear: MOTION,
    depthFadeFar: MOTION,
    badge: BADGE,
    iconPosition: BADGE,
    progress: BADGE,
    smartOverflow: BADGE,
    maxNumber: BADGE,
    icon: BADGE,
    overflowSuffix: BADGE,
};

/**
 * Why a property the Style tab draws has no vary glyph. These are decisions, not omissions: the
 * coverage test fails when a drawn property has neither a vary glyph nor a reason here.
 */
export const VARY_DECISIONS = {
    yesOrNo:
        "A yes-or-no property (wireframe, show, curved) has no vary by: picking which elements are on is what Which elements does, so a layer for those elements sets it",
    look: "A label's look is a set of fields, each set in its settings; its size, text color and background vary through their own properties",
    opacity:
        "Opacity varies by a value from its own field in the color's settings pop-out (Color, Line, Ends, Halo and Band settings), shown as a percent",
} as const;

/**
 * The drawn properties with no vary glyph, each with its decision. Every other drawn property
 * varies by a value; an opacity varies from its settings pop-out ({@link VARY_DECISIONS}.opacity).
 */
export const NO_VARY: Readonly<Partial<Record<Channel, string>>> = {
    "node.wireframe": VARY_DECISIONS.yesOrNo,
    "node.visible": VARY_DECISIONS.yesOrNo,
    "edge.visible": VARY_DECISIONS.yesOrNo,
    "edge.curvature": VARY_DECISIONS.yesOrNo,
    "node.labelStyle": VARY_DECISIONS.look,
    "node.tooltipStyle": VARY_DECISIONS.look,
    "edge.labelStyle": VARY_DECISIONS.look,
    "edge.arrowHeadTextStyle": VARY_DECISIONS.look,
    "edge.arrowTailTextStyle": VARY_DECISIONS.look,
};

/**
 * The styles the design places in the panel (tier3 design, section 6) that are easy to leave
 * without a control: the coverage test fails when one of them is marked "not offered".
 */
export const DESIGN_PLACED: {
    readonly channels: readonly Channel[];
    readonly labelFields: readonly (keyof LabelStyle)[];
} = {
    channels: [
        "node.label",
        "node.labelColor",
        "node.labelBackground",
        "node.tooltipStyle",
        "node.tooltipSize",
        "node.tooltipColor",
        "node.tooltipBackground",
        "edge.label",
        "edge.labelColor",
        "edge.labelBackground",
        "edge.arrowHeadText",
        "edge.arrowHeadTextStyle",
        "edge.arrowHeadTextSize",
        "edge.arrowHeadTextColor",
        "edge.arrowHeadTextBackground",
        "edge.arrowTailText",
        "edge.arrowTailTextStyle",
        "edge.arrowTailTextSize",
        "edge.arrowTailTextColor",
        "edge.arrowTailTextBackground",
    ],
    labelFields: ["gradientColors", "icon", "overflowSuffix"],
};

/**
 * The graph settings graphty-element publishes as a list: each selection look field
 * (`selection.<field>`) and each kind of background (`background.<kind>`). The rest of the graph's
 * settings have no published list, so they are named in {@link GRAPH_SETTING_HOMES} by hand.
 * @returns the settings' names.
 */
export function publishedGraphSettings(): string[] {
    return [
        ...Object.keys(GraphSelectionStyleOpts.shape).map((field) => `selection.${field}`),
        ...GraphBackground.options.map((option) => `background.${option.shape.backgroundType.value}`),
    ];
}

/** Every graph setting, by where Graph settings (no row selected) or a default row sets it. */
export const GRAPH_SETTING_HOMES: Readonly<Record<string, Home>> = {
    "background.color": at("Graph settings, Canvas, Background color"),
    "background.skybox": at("Graph settings, Canvas, Background image"),
    "selection.color": at("Selected row, Effects, Halo"),
    "selection.scale": at("Selected row, Effects, Halo settings"),
    "selection.opacity": at("Selected row, Effects, Halo settings"),
    "selection.edgeColor": at("Selected row, Effects, Band"),
    "selection.edgeScale": at("Selected row, Effects, Band settings"),
    "selection.edgeOpacity": at("Selected row, Effects, Band settings"),
    viewMode: at("Graph settings, Canvas, View"),
    lighting: at("Graph settings, Canvas, Lighting"),
    "layoutBehavior.labels": at("Graph settings, Labels"),
    "layoutBehavior.node.depthIndependentSize": at("Graph settings, Canvas, Same size at any depth"),
    highlightColor: at("Graph settings, Canvas, Highlight color"),
    twoD: no("deprecated: View sets it"),
    addDefaultStyle: no("ignored by graphty-element"),
    startingRows: no("a project setting, not a style"),
    startingCameraDistance: no("not a style: the camera"),
    layout: no("not a style: the Layout panel"),
    layoutOptions: no("not a style: the Layout panel"),
};

/**
 * The names in a published list that have no home.
 * @param list - the element's list.
 * @param homes - the map that should hold every name in it.
 * @returns the names the map lacks, in the list's order.
 */
export function homeless(list: readonly string[], homes: Readonly<Record<string, Home>>): string[] {
    return list.filter((name) => !Object.hasOwn(homes, name));
}
