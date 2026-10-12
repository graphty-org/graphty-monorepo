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

const LABEL_VARY = "the label's color is set in Label settings as one color; varying it by a value has no control yet";
const TOOLTIP_LOOK = "a tooltip's look has no control yet; it draws in the element's default look";
const CAPTION = "a caption at an edge's end has no control yet";

/** Every channel, by where the Style tab sets it. */
export const CHANNEL_HOMES: Readonly<Record<Channel, Home>> = {
    "node.color": at("Nodes, Color"),
    "node.size": at("Nodes, Shape | Size"),
    "node.shape": at("Nodes, Shape | Size"),
    "node.opacity": at("Nodes, Color settings"),
    "node.wireframe": at("Nodes, Shape settings"),
    "node.visible": at("Nodes, Shape settings"),
    "node.label": at("Nodes, Label entry, source"),
    "node.labelStyle": at("Nodes, Label entry look, position and Label settings"),
    "node.labelSize": at("Nodes, Label entry, size"),
    "node.labelColor": no(LABEL_VARY),
    "node.labelBackground": no(LABEL_VARY),
    "node.tooltip": at("Nodes, Tooltip"),
    "node.tooltipStyle": no(TOOLTIP_LOOK),
    "node.tooltipSize": no(TOOLTIP_LOOK),
    "node.tooltipColor": no(TOOLTIP_LOOK),
    "node.tooltipBackground": no(TOOLTIP_LOOK),
    "node.outline": at("Nodes, Effects, Outline"),
    "node.glow": at("Nodes, Effects, Glow"),
    "node.glowStrength": at("Nodes, Effects, Glow settings"),
    "node.haloColor": at("Nodes, Effects, Halo"),
    "node.haloSize": at("Nodes, Effects, Halo settings"),
    "node.haloOpacity": at("Nodes, Effects, Halo settings"),
    "node.flat": no('nothing draws it; Graph settings, Lighting "flat" gives the look'),
    "node.marker": no("graphty-element refuses it"),
    "edge.color": at("Edges, Line (Color | Width)"),
    "edge.width": at("Edges, Line (Color | Width)"),
    "edge.opacity": at("Edges, Line settings"),
    "edge.style": at("Edges, Line settings, Pattern"),
    "edge.patternCount": at("Edges, Line settings"),
    "edge.curvature": at("Edges, Line settings"),
    "edge.visible": at("Edges, Line settings"),
    "edge.arrowHead": at("Edges, Ends (Head | Tail)"),
    "edge.arrowTail": at("Edges, Ends (Head | Tail)"),
    "edge.arrowHeadSize": at("Edges, Ends settings"),
    "edge.arrowHeadColor": at("Edges, Ends settings"),
    "edge.arrowHeadOpacity": at("Edges, Ends settings"),
    "edge.arrowTailSize": at("Edges, Ends settings"),
    "edge.arrowTailColor": at("Edges, Ends settings"),
    "edge.arrowTailOpacity": at("Edges, Ends settings"),
    "edge.arrowHeadText": no(CAPTION),
    "edge.arrowHeadTextStyle": no(CAPTION),
    "edge.arrowHeadTextSize": no(CAPTION),
    "edge.arrowHeadTextColor": no(CAPTION),
    "edge.arrowHeadTextBackground": no(CAPTION),
    "edge.arrowTailText": no(CAPTION),
    "edge.arrowTailTextStyle": no(CAPTION),
    "edge.arrowTailTextSize": no(CAPTION),
    "edge.arrowTailTextColor": no(CAPTION),
    "edge.arrowTailTextBackground": no(CAPTION),
    "edge.bandColor": at("Edges, Effects, Band"),
    "edge.bandWidth": at("Edges, Effects, Band settings"),
    "edge.bandOpacity": at("Edges, Effects, Band settings"),
    "edge.animationSpeed": at("Edges, Effects, Motion"),
    "edge.label": at("Edges, Label entry, source"),
    "edge.labelStyle": at("Edges, Label entry look, position and Label settings"),
    "edge.labelSize": at("Edges, Label entry, size"),
    "edge.labelColor": no(LABEL_VARY),
    "edge.labelBackground": no(LABEL_VARY),
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
    gradientColors: no("a list of colors has no field yet; the gradient uses the element's colors"),
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
    icon: no("the badge's icon glyph has no field yet"),
    overflowSuffix: no("the text after a shortened number has no field yet"),
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
