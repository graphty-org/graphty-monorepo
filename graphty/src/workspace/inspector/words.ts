/**
 * The inspector's words. graphty-element hands over codes and numbers; what a reader reads is
 * the app's, and lives here.
 */

import type { FieldBand } from "@graphty/graphty-element/catalog";
import type {
    Channel,
    EdgeRecord,
    GraphSession,
    GraphStatistics,
    GraphtyErrorCode,
    Measurement,
    SelectionAttributeStatistics,
    StaleNote,
    SummaryGroup,
    TimeUnit,
    XrCapability,
    XrUnavailableReason,
} from "@graphty/graphty-element/session";

import { rangeWords as timeRangeWords } from "../time/timeWords";
import type { InspectedKindId } from "./inspected";

/** What each modularity band graphty-element publishes is called, keyed by its id. */
const MODULARITY_BAND_NAMES: Readonly<Record<string, string>> = {
    barely: "Barely separated",
    clear: "Clearly separated",
    weak: "Weakly separated",
};

/**
 * The name of the modularity band a grouping run's modularity falls in.
 * @param band - the band graphty-element put the modularity in.
 * @returns the name; a band the app does not know reads as its id.
 */
export function modularityBandName(band: FieldBand): string {
    return MODULARITY_BAND_NAMES[band.id] ?? band.id;
}

/** The kind word on the header's second line (tier1-design.md section 2.7). */
export const KIND_WORDS: Readonly<Record<InspectedKindId, string>> = {
    graph: "Graph",
    node: "Node",
    edge: "Edge",
    several: "Selection",
    neighborhood: "Neighborhood",
    "measure-row": "Measure",
    "run-row": "Groups",
    "group-row": "Group",
    "everything-row": "Everything",
    "selection-row": "Selection",
    "layer-row": "Layer",
    "folder-row": "Folder",
    rows: "Style layers",
    attribute: "Attribute",
    "filter-step": "Time window",
    source: "Source",
};

/**
 * The kind line of a Sources row's left-out child, which names its load rather than "Source".
 * @param load - the load's name.
 * @returns such as "Left out of people.csv and messages.csv".
 */
export function leftOutOf(load: string): string {
    return `Left out of ${load}`;
}

/** The kind word of a path run's row, which is a measure row by shape but not a measure to a reader. */
export const PATH_WORD = "Path";

/**
 * The property token Why this look shows for each channel. Two channels may share one word. Every
 * channel has one, so a channel the element adds fails to compile here instead of reaching the
 * reader as a code.
 */
const CHANNEL_WORDS: Readonly<Record<Channel, string>> = {
    "node.color": "Color",
    "node.size": "Size",
    "node.sizeMode": "Size mode",
    "node.shape": "Shape",
    "node.model": "Model",
    "node.modelSourceUp": "Model",
    "node.modelTurn": "Model",
    "node.modelTint": "Model",
    "node.modelFit": "Model",
    "node.modelCenter": "Model",
    "node.texture": "Texture",
    "node.label": "Label",
    "node.labelStyle": "Label",
    "node.labelColor": "Label",
    "node.labelSize": "Label",
    "node.labelFont": "Label",
    "node.labelWeight": "Label",
    "node.labelItalic": "Label",
    "node.labelWrapWidth": "Label",
    "node.labelLetterSize": "Label",
    "node.labelWrapTrailingSpace": "Label",
    "node.labelMinScreenSize": "Label",
    "node.labelOnTop": "Label",
    "node.labelDeclutter": "Label",
    "node.labelRotation": "Label",
    "node.tooltip": "Tooltip",
    "node.tooltipStyle": "Tooltip",
    "node.opacity": "Opacity",
    "node.outline": "Outline",
    "node.glow": "Glow",
    "node.glowStrength": "Glow",
    "node.halo": "Halo",
    "node.haloColor": "Halo",
    "node.haloScale": "Halo",
    "node.haloOpacity": "Halo",
    "node.wireframe": "Wireframe",
    "node.meshDetail": "Mesh detail",
    "node.flat": "Flat",
    "node.unlit": "Unlit",
    "node.marker": "Marker",
    "node.width": "Width",
    "node.height": "Height",
    "node.depth": "Depth",
    "node.planar": "Planar",
    "node.zIndex": "Z-index",
    "node.drawOrder": "Draw order",
    "node.borderColor": "Border",
    "node.borderWidth": "Border",
    "node.borderScreenWidth": "Border on screen",
    "node.borderOpacity": "Border",
    "node.borderStyle": "Border",
    "node.borderPosition": "Border",
    "node.shapePoints": "Shape",
    "node.gradientColor": "Gradient",
    "node.gradientDirection": "Gradient",
    "node.cornerRadius": "Shape",
    "node.labelFit": "Shape",
    "node.labelPaddingX": "Shape",
    "node.labelPaddingY": "Shape",
    "node.labelFitSquare": "Shape",
    "node.labelFitQuantum": "Shape",
    "edge.color": "Color",
    "edge.width": "Width",
    "edge.opacity": "Opacity",
    "edge.style": "Line",
    "edge.patternCount": "Line",
    "edge.curvature": "Curve",
    "edge.bends": "Curve",
    "edge.fanSpacing": "Curve",
    "edge.fanned": "Curve",
    "edge.sourcePort": "Ends",
    "edge.targetPort": "Ends",
    "edge.arrowHead": "Arrow",
    "edge.arrowHeadSize": "Arrow",
    "edge.arrowHeadWidth": "Arrow",
    "edge.arrowHeadPosition": "Arrow",
    "edge.arrowHeadColor": "Arrow",
    "edge.arrowHeadOpacity": "Arrow",
    "edge.arrowHeadText": "Arrow",
    "edge.arrowHeadTextStyle": "Arrow",
    "edge.arrowTail": "Arrow",
    "edge.arrowTailSize": "Arrow",
    "edge.arrowTailWidth": "Arrow",
    "edge.arrowTailPosition": "Arrow",
    "edge.arrowTailColor": "Arrow",
    "edge.arrowTailOpacity": "Arrow",
    "edge.arrowTailText": "Arrow",
    "edge.arrowTailTextStyle": "Arrow",
    "edge.animationSpeed": "Dash motion",
    "edge.label": "Label",
    "edge.labelStyle": "Label",
    "edge.bandColor": "Band",
    "edge.bandWidth": "Band",
    "edge.bandOpacity": "Band",
    "node.visible": "Visible",
    "node.labelBackground": "Label",
    "node.tooltipSize": "Tooltip",
    "node.tooltipColor": "Tooltip",
    "node.tooltipBackground": "Tooltip",
    "edge.visible": "Visible",
    "edge.labelSize": "Label",
    "edge.labelColor": "Label",
    "edge.labelBackground": "Label",
    "edge.arrowHeadTextSize": "Arrow",
    "edge.arrowHeadTextColor": "Arrow",
    "edge.arrowHeadTextBackground": "Arrow",
    "edge.arrowTailTextSize": "Arrow",
    "edge.arrowTailTextColor": "Arrow",
    "edge.arrowTailTextBackground": "Arrow",
    "edge.labelFont": "Label",
    "edge.labelWeight": "Label",
    "edge.labelItalic": "Label",
    "node.shaders": "Shaders",
    "edge.shaders": "Shaders",
    "edge.taper": "Line",
    "edge.lift": "Line",
    "edge.labelWrapWidth": "Label",
    "edge.labelLetterSize": "Label",
    "edge.labelWrapTrailingSpace": "Label",
    "edge.labelMinScreenSize": "Label",
    "edge.labelOnTop": "Label",
    "edge.labelRotation": "Label",
    "node.labelWrapEllipsis": "Label",
    "node.labelWrapAnywhere": "Label",
    "node.labelWrapSpaceCount": "Label",
    "node.labelRunAlign": "Label",
    "node.labelOutline": "Label",
    "node.labelOutlineWidth": "Label",
    "node.labelBorder": "Label",
    "node.labelBorderWidth": "Label",
    "node.labelOpacity": "Label",
    "node.labelBackgroundOpacity": "Label",
    "node.labelOutlineOpacity": "Label",
    "node.labelBorderOpacity": "Label",
    "node.labelPadding": "Label",
    "node.labelCornerRadius": "Label",
    "node.labelLineHeight": "Label",
    "node.labelOffsetX": "Label",
    "node.labelOffsetY": "Label",
    "node.labelShiftX": "Label",
    "node.labelShiftY": "Label",
    "node.labelMinNodeScreenSize": "Label",
    "node.labelTextAlign": "Label",
    "node.labelLocation": "Label",
    "node.xlabel": "Outside label",
    "node.xlabelStyle": "Outside label",
    "node.xlabelLocation": "Outside label",
    "node.xlabelOffsetX": "Outside label",
    "node.xlabelOffsetY": "Outside label",
    "edge.xlabel": "Outside label",
    "edge.xlabelStyle": "Outside label",
    "edge.xlabelLocation": "Outside label",
    "edge.xlabelOffsetX": "Outside label",
    "edge.xlabelOffsetY": "Outside label",
    "node.borderWaveAmplitude": "Border",
    "node.borderWavePeriod": "Border",
    "node.outerBorderColor": "Outer border color",
    "node.outerBorderWidth": "Outer border width",
    "node.outerBorderOpacity": "Outer border opacity",
    "node.outerBorderStyle": "Outer border style",
    "node.outerBorderOffset": "Outer border offset",
    "node.outerBorderCount": "Outer border count",
    "node.underlayColor": "Underlay color",
    "node.underlayOpacity": "Underlay opacity",
    "node.underlayPadding": "Underlay padding",
    "node.underlayShape": "Underlay shape",
    "node.underlayCornerRadius": "Underlay corner radius",
    "node.overlayColor": "Overlay color",
    "node.overlayOpacity": "Overlay opacity",
    "node.overlayPadding": "Overlay padding",
    "node.overlayShape": "Overlay shape",
    "node.overlayCornerRadius": "Overlay corner radius",
    "node.image": "Image",
    "node.imageFallback": "Image fallback",
    "node.imageFit": "Image fit",
    "node.imageWidth": "Image width",
    "node.imageHeight": "Image height",
    "node.imagePixelSize": "Image pixel size",
    "node.imagePositionX": "Image position x",
    "node.imagePositionY": "Image position y",
    "node.imageOffsetX": "Image offset x",
    "node.imageOffsetY": "Image offset y",
    "node.imageRepeat": "Image repeat",
    "node.imageClip": "Image clip",
    "node.imageSmoothing": "Image smoothing",
    "node.imageAutoSize": "Image auto size",
    "node.imageOpacity": "Image opacity",
    "node.glyph": "Glyph",
    "node.glyphFont": "Glyph font",
    "node.glyphSize": "Glyph size",
    "node.glyphWeight": "Glyph weight",
    "node.glyphColor": "Glyph color",
    "node.pieColors": "Pie colors",
    "node.pieSizes": "Pie sizes",
    "node.pieOpacities": "Pie opacities",
    "node.pieRadius": "Pie radius",
    "node.pieHole": "Pie hole",
    "node.pieRotation": "Pie rotation",
    "node.pieFitBox": "Pie fit box",
    "node.pieOffsetX": "Pie offset x",
    "node.pieOffsetY": "Pie offset y",
    "node.stripeColors": "Stripe colors",
    "node.stripeSizes": "Stripe sizes",
    "node.stripeOpacities": "Stripe opacities",
    "node.stripeDirection": "Stripe direction",
    "node.stripeSize": "Stripe size",
    "node.chartKind": "Chart kind",
    "node.chartValues": "Chart values",
    "node.chartColors": "Chart colors",
    "node.chartMin": "Chart min",
    "node.chartMax": "Chart max",
    "node.chartHorizontal": "Chart horizontal",
    "node.chartSize": "Chart size",
    "node.chartWidth": "Chart width",
    "node.chartHeight": "Chart height",
    "node.chartOffsetX": "Chart offset x",
    "node.chartOffsetY": "Chart offset y",
    "node.chartMargin": "Chart margin",
    "node.chartGap": "Chart gap",
    "node.chartLineWidth": "Chart line width",
    "node.chartBorderColor": "Chart border color",
    "node.chartBorderWidth": "Chart border width",
    "node.exactCornerRadius": "Exact corner radius",
    "node.shapeStretchPoints": "Shape",
    "node.shapeParts": "Shape",
    "node.shapeLines": "Shape",
    "node.shapeTexts": "Shape",
    "node.shapeLineWidth": "Shape",
    "node.gradientColors": "Gradient",
    "node.gradientStops": "Gradient",
    "node.gradientKind": "Gradient",
    "edge.minScreenWidth": "Min screen width",
    "edge.outlineColor": "Outline color",
    "edge.outlineWidth": "Outline width",
    "edge.outlineOpacity": "Outline opacity",
    "edge.outlineStyle": "Outline pattern",
    "edge.underlayColor": "Underlay color",
    "edge.underlayOpacity": "Underlay opacity",
    "edge.underlayPadding": "Underlay padding",
    "edge.overlayColor": "Overlay color",
    "edge.overlayOpacity": "Overlay opacity",
    "edge.overlayPadding": "Overlay padding",
    "edge.gradientColors": "Gradient",
    "edge.gradientStops": "Gradient",
    "edge.gradientKind": "Gradient",
    "edge.waveAmplitude": "Wave amplitude",
    "edge.wavePeriod": "Wave period",
    "edge.bendCurve": "Bend curve",
    "edge.arcRadius": "Arc radius",
    "edge.route": "Route",
    "edge.arcHeight": "Arc height",
    "edge.nodeGap": "Node gap",
    "edge.arrowHeadSide": "Arrow",
    "edge.arrowHeadGap": "Arrow",
    "edge.arrowHeadStack": "Arrow",
    "edge.arrowHeadImage": "Arrow",
    "edge.arrowHeadTextLetterSize": "Arrow",
    "edge.arrowHeadTextFont": "Arrow",
    "edge.arrowHeadTextWeight": "Arrow",
    "edge.arrowHeadTextOpacity": "Arrow",
    "edge.arrowHeadTextDistance": "Arrow",
    "edge.arrowHeadTextRotation": "Arrow",
    "edge.arrowHeadTextOffsetX": "Arrow",
    "edge.arrowHeadTextOffsetY": "Arrow",
    "edge.arrowTailSide": "Arrow",
    "edge.arrowTailGap": "Arrow",
    "edge.arrowTailStack": "Arrow",
    "edge.arrowTailImage": "Arrow",
    "edge.arrowTailTextLetterSize": "Arrow",
    "edge.arrowTailTextFont": "Arrow",
    "edge.arrowTailTextWeight": "Arrow",
    "edge.arrowTailTextOpacity": "Arrow",
    "edge.arrowTailTextDistance": "Arrow",
    "edge.arrowTailTextRotation": "Arrow",
    "edge.arrowTailTextOffsetX": "Arrow",
    "edge.arrowTailTextOffsetY": "Arrow",
    "edge.arrowMiddleHead": "Arrow",
    "edge.arrowMiddleHeadSize": "Arrow",
    "edge.arrowMiddleHeadWidth": "Arrow",
    "edge.arrowMiddleHeadSide": "Arrow",
    "edge.arrowMiddleHeadPosition": "Arrow",
    "edge.arrowMiddleHeadColor": "Arrow",
    "edge.arrowMiddleHeadOpacity": "Arrow",
    "edge.arrowMiddleHeadImage": "Arrow",
    "edge.arrowMiddleTail": "Arrow",
    "edge.arrowMiddleTailSize": "Arrow",
    "edge.arrowMiddleTailWidth": "Arrow",
    "edge.arrowMiddleTailSide": "Arrow",
    "edge.arrowMiddleTailPosition": "Arrow",
    "edge.arrowMiddleTailColor": "Arrow",
    "edge.arrowMiddleTailOpacity": "Arrow",
    "edge.arrowMiddleTailImage": "Arrow",
    "edge.labelTextAlign": "Label",
    "edge.labelLocation": "Label",
    "edge.labelWrapEllipsis": "Label",
    "edge.labelWrapAnywhere": "Label",
    "edge.labelWrapSpaceCount": "Label",
    "edge.labelRunAlign": "Label",
    "edge.labelOutline": "Label",
    "edge.labelOutlineWidth": "Label",
    "edge.labelBorder": "Label",
    "edge.labelBorderWidth": "Label",
    "edge.labelOpacity": "Label",
    "edge.labelBackgroundOpacity": "Label",
    "edge.labelOutlineOpacity": "Label",
    "edge.labelBorderOpacity": "Label",
    "edge.labelPadding": "Label",
    "edge.labelCornerRadius": "Label",
    "edge.labelLineHeight": "Label",
    "edge.labelOffsetX": "Label",
    "edge.labelOffsetY": "Label",
    "edge.labelShiftX": "Label",
    "edge.labelShiftY": "Label",
    "node.groupPadding": "Group",
    "node.groupPaddingRatio": "Group",
    "node.groupPaddingOf": "Group",
    "node.groupMinWidth": "Group",
    "node.groupMinWidthBiasLeft": "Group",
    "node.groupMinHeight": "Group",
    "node.groupMinHeightBiasTop": "Group",
    "node.groupIncludeLabels": "Group",
    "edge.sourceNodeGap": "Gap",
    "edge.targetNodeGap": "Gap",
    "edge.supportModel": "Route",
    "edge.supportUnit": "Route",
    "edge.supportScale": "Route",
    "edge.supportSpringLength": "Route",
    "edge.supportSpringConstant": "Route",
    "edge.supportRepulsion": "Route",
    "edge.supportCentralGravity": "Route",
};

/**
 * The tokens for the channels a layer won, each word once, in the order given.
 * @param channels - the channels.
 * @returns the words.
 */
export function channelTokens(channels: readonly Channel[]): string[] {
    return [...new Set(channels.map((channel) => CHANNEL_WORDS[channel]))];
}

const NUMBER = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });
/** A number of a thousand or more: its whole part exact, never 12,350 for 12,345. */
const WHOLE = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
/** Counts are exact: 12,345 nodes, never 12,350. */
const COUNT = new Intl.NumberFormat();

/**
 * A number as a reader reads it, the one spelling the inspector, the key and the table share:
 * four significant digits, grouped, and never fewer than the whole part's own digits.
 * @param value - the number.
 * @returns the text.
 */
export function formatNumber(value: number): string {
    return Math.abs(value) >= 1000 ? WHOLE.format(value) : NUMBER.format(value);
}

/**
 * The graph's direction in one word ("Undirected"); where it came from and what it means for
 * arrowheads are in {@link directionNote}.
 * @param statistics - the element's statistics.
 * @returns the word.
 */
export function directionWords(statistics: GraphStatistics): string {
    return { directed: "Directed", undirected: "Undirected", mixed: "Mixed", unknown: "Not settled" }[
        statistics.directedness
    ];
}

/**
 * What arrowheads follow on a graph of this direction, or null on a directed graph, where they
 * point at each edge's target as a reader expects.
 * @param directedness - the element's direction.
 * @returns the sentence, or null.
 */
export function arrowheadNote(directedness: GraphStatistics["directedness"]): string | null {
    // An arrowhead on an edge with no direction shows the file's order, not a direction.
    const follows =
        "an arrowhead shows only the file's order: it points from each edge's first-listed node to its second";
    switch (directedness) {
        case "undirected":
            return `Edges have no direction, so ${follows}.`;
        case "mixed":
            return `Some edges have a direction and some do not; on those that do not, ${follows}.`;
        case "unknown":
            return `Nothing says whether edges have a direction, so ${follows}.`;
        default:
            return null;
    }
}

/**
 * The Direction row's explanation: what the direction means for arrowheads and where it came
 * from (the file, or the Data page). The file's own statement (GML "directed 0", DOT "digraph")
 * is not quoted: a reader cannot read it.
 * @param statistics - the element's statistics.
 * @returns the sentences.
 */
export function directionNote(statistics: GraphStatistics): string {
    const { by, statedBy } = statistics.directednessSource;
    let from = "Nothing has said yet; set it on the Data page.";
    if (by === "file") {
        from = statedBy === null ? "From the file's format." : "From the file.";
    } else if (by === "configuration") {
        from = "Set on the Data page.";
    }
    const arrows = arrowheadNote(statistics.directedness) ?? "Each edge goes from its source to its target.";
    return `${arrows} ${from}`;
}

/**
 * An edge by its two ends' names (the element's `data.name`, else the id): "Ava -> Kofi" on a
 * directed graph, "Ava -- Kofi" otherwise.
 * @param session - the session, which names the ends and says whether the graph is directed.
 * @param edge - the edge's record.
 * @returns the words.
 */
export function edgeName(session: GraphSession, edge: Pick<EdgeRecord, "source" | "target">): string {
    const end = (id: EdgeRecord["source"]): string => session.data.name(id) ?? String(id);
    return `${end(edge.source)}${edgeJoiner(session)}${end(edge.target)}`;
}

/**
 * What the status line calls one selected node: the label graphty-element gives it
 * (`session.data.name`, the label column's value), else its id.
 * @param session - the session.
 * @param id - the node id.
 * @returns such as "Nebraska", or "74" when the graph has no label column.
 */
export function nodeName(session: GraphSession, id: EdgeRecord["source"]): string {
    return session.data.name(id) ?? String(id);
}

/**
 * What goes between an edge's two ends in its name, which Find also matches an edge by.
 * @param session - the session, which says whether the graph is directed.
 * @returns " -> " on a directed graph, " -- " otherwise.
 */
export function edgeJoiner(session: GraphSession): string {
    return session.status.directed ? " -> " : " -- ";
}

/**
 * A count of things, with the noun made plural when it needs to be ("1 node", "7 nodes").
 * @param count - how many.
 * @param noun - the singular noun.
 * @returns the words.
 */
export function count(count: number, noun: string): string {
    return `${COUNT.format(count)} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * A neighborhood's heading and status line: "Javert and 17 connections". The status line past one
 * hop says how far it reaches, "Javert and 40 connections within 2 hops", since only the one-hop
 * count is direct ties; the heading leaves that to the Hops control under it. The center is named beside the count, so the heading agrees with the Selection
 * count beside it (the center and its connections: 41).
 * @param center - the center node's name.
 * @param around - how many nodes, the center left out.
 * @param hops - how many hops out (1 when omitted).
 * @returns the words.
 */
export function neighborhoodWords(center: string, around: number, hops = 1): string {
    const words = `${center} and ${count(around, "connection")}`;
    return hops > 1 ? `${words} within ${hops} hops` : words;
}

/** What a node's Degree row does: it changes the selection. */
export const DEGREE_ROW_WORDS = "Select this node and its neighbors";

/** What Filter to neighbors does, and where it is turned off. */
export const NEIGHBOR_FILTER_WORDS = "Hide every node outside this neighborhood. Its card in Filters turns it off";

/** Why Filter to neighbors is disabled: its card is already on at the reach shown. */
export const NEIGHBOR_FILTER_APPLIED_WORDS =
    "The drawing already shows only this neighborhood. Its card in Filters turns it off";

/**
 * A selection's size, leaving out a zero half ("2 nodes selected", "3 nodes, 1 edge selected").
 * @param nodes - how many nodes are selected.
 * @param edges - how many edges are selected.
 * @returns the words.
 */
export function selectionWords(nodes: number, edges: number): string {
    return `${sizeWords(nodes, edges)} selected`;
}

/**
 * What the selection holds, as the status line says it: one node or one edge by its name ("Ava",
 * "Ava -> Ben"), more by their count ("2 nodes, 1 edge").
 * @param session - the session.
 * @returns the words.
 */
export function selectionNameWords(session: GraphSession): string {
    const { nodes, edges } = session.selection;
    if (nodes.length + edges.length === 1) {
        if (nodes.length === 1) {
            return nodeName(session, nodes[0]);
        }
        const edge = session.data.edge(edges[0]);
        if (edge !== undefined) {
            return edgeName(session, edge);
        }
    }
    return sizeWords(nodes.length, edges.length);
}

/**
 * What a selection change says: "Ava selected", "3 nodes, 1 edge selected".
 * @param session - the session.
 * @returns the words.
 */
export function selectedNameWords(session: GraphSession): string {
    return `${selectionNameWords(session)} selected`;
}

/**
 * What Frame selection says once the camera has moved: "Framed Ava", "Framed 3 nodes".
 * @param session - the session.
 * @returns the words.
 */
export function framedWords(session: GraphSession): string {
    return `Framed ${selectionNameWords(session)}`;
}

/**
 * The status line after Clear selection: "Selection cleared: 13 edges".
 * @param nodes - how many nodes were selected.
 * @param edges - how many edges were selected.
 * @returns the words.
 */
export function selectionClearedWords(nodes: number, edges: number): string {
    return `Selection cleared: ${sizeWords(nodes, edges)}`;
}

/**
 * Nodes and edges, leaving out a zero half: "3 nodes, 1 edge".
 * @param nodes - how many nodes.
 * @param edges - how many edges.
 * @returns the words.
 */
export function sizeWords(nodes: number, edges: number): string {
    const parts = [nodes > 0 ? count(nodes, "node") : "", edges > 0 ? count(edges, "edge") : ""];
    return parts.filter(Boolean).join(", ");
}

/**
 * A route's size ("3 nodes, 2 edges").
 * @param nodes - how many nodes are on it.
 * @param edges - how many edges are on it.
 * @returns the words.
 */
export function routeWords(nodes: number, edges: number): string {
    return `${count(nodes, "node")}, ${count(edges, "edge")}`;
}

/**
 * A yes-or-no value as every place writes it: "Yes" or "No", the data table's own words.
 * @param value - the value.
 * @returns the word.
 */
export function yesNoWord(value: boolean): string {
    return value ? "Yes" : "No";
}

/**
 * One value of a column in words: a yes-or-no value as Yes or No, anything else as it is. Where
 * graphty-element hands the value over as text (a selection's commonest value, a rule's value),
 * the column's type -- graphty-element's `AttributeDescriptor.type` -- says it is a yes-or-no.
 * @param value - the value.
 * @param type - the column's type, when the value may be a yes-or-no written as text.
 * @returns the words.
 */
export function valueWord(value: string | number | boolean, type?: string): string {
    if (typeof value === "boolean") {
        return yesNoWord(value);
    }
    if (type === "boolean" && (value === "true" || value === "false")) {
        return yesNoWord(value === "true");
    }
    return String(value);
}

/**
 * A value from the data, as text: numbers formatted, a yes-or-no as Yes or No, everything else as given.
 * @param value - the value.
 * @returns the text.
 */
export function valueText(value: unknown): string {
    if (typeof value === "number") {
        return formatNumber(value);
    }
    if (typeof value === "boolean") {
        return yesNoWord(value);
    }
    if (typeof value === "string") {
        return value;
    }
    return JSON.stringify(value);
}

/**
 * When a run started, as a short date and a time to the second ("Oct 3, 2:14:07 PM"), so a rerun
 * or a second run on the same day differs in its own record.
 * @param iso - the run's `startedAt`.
 * @returns the date and time, or null when it never started.
 */
export function runTime(iso: string | null): string | null {
    if (iso === null) {
        return null;
    }
    return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
}

/** The named members of an open string union, without its `string & {}` catch-all. */
type Named<T> = T extends string ? (string extends T ? never : T) : never;

/**
 * The role tag for each measurement graphty-element names, so a name it adds fails to compile
 * here; a measurement outside its names (the union is open) shows no tag rather than a code.
 */
const MEASUREMENT_WORDS: Readonly<Record<Named<Measurement>, string>> = {
    // The words the Data place's Attributes list uses (data-place/words.ts `typeOf`): one word per kind.
    categorical: "Category",
    ordinal: "Ordered category",
    quantitative: "Number",
    time: "Time",
};

/**
 * The role tag for a column's measurement.
 * @param measurement - the element's measurement.
 * @returns the word, or undefined for a measurement the app has no word for.
 */
export function measurementWord(measurement: Measurement): string | undefined {
    return Object.hasOwn(MEASUREMENT_WORDS, measurement)
        ? MEASUREMENT_WORDS[measurement as Named<Measurement>]
        : undefined;
}

/** What each kind's word means, as a sentence for its tooltip. */
const MEASUREMENT_GLOSS: Readonly<Record<Named<Measurement>, string>> = {
    categorical: "Each value names a group, such as a department. The values have no order.",
    ordinal: "The values have an order, such as small, medium, large, but the steps between them are not equal.",
    quantitative: "Each value is a quantity, such as a count or a distance, so values can be compared and averaged.",
    time: "Each value is a date or a time.",
};

/**
 * What a column's kind means, for the tooltip on its word.
 * @param measurement - the element's measurement.
 * @returns the sentence, or an empty string for a measurement the app has no words for.
 */
export function measurementGloss(measurement: Measurement | undefined): string {
    return measurement !== undefined && Object.hasOwn(MEASUREMENT_GLOSS, measurement)
        ? MEASUREMENT_GLOSS[measurement as Named<Measurement>]
        : "";
}

/** Why a run failed, in the app's words, for the codes a run can fail with. */
const RUN_FAILURE_WORDS: Partial<Readonly<Record<GraphtyErrorCode, string>>> = {
    E_TOO_LARGE: "the graph is too large for this analysis",
    E_OUT_OF_MEMORY: "it ran out of memory",
    E_CAP_EXCEEDED: "it passed its size limit",
    E_SCOPE_EMPTY: "there was nothing to analyze",
    E_NOT_CONVERGED: "it did not settle on an answer",
    E_OPTION_RANGE: "a setting is out of range",
    E_UNKNOWN_OPTION: "a setting is not one this analysis has",
    E_UNKNOWN_ALGORITHM: "this analysis is not available",
    E_NO_ACCELERATOR: "the graphics card could not run it",
    E_NO_WEBGPU: "the graphics card could not run it",
    E_NO_ADAPTER: "the graphics card could not run it",
    E_SOFTWARE_ONLY: "the graphics card could not run it",
    E_DEVICE_INCORRECT: "the graphics card gave a wrong answer",
    E_DEVICE_LOST: "the graphics card stopped during the run",
    E_UNSUPPORTED: "this analysis cannot run here",
};

/**
 * The state bar's words for a failed run.
 * @param code - the element's error code, or undefined.
 * @returns the words; never the code itself.
 */
export function runFailureWords(code: GraphtyErrorCode | undefined): string {
    const reason = code === undefined ? undefined : RUN_FAILURE_WORDS[code];
    return reason === undefined ? "The run failed" : `The run failed: ${reason}`;
}

/**
 * The state bar's words, and the paint row's description, for a run that is out of date: what
 * changed, in the element's numbers ("Ran on 20 nodes; 15 shown now").
 * @param note - `run.stale`.
 * @param unit - how the time field reads numbers, for the window a run was computed in.
 * @returns the words.
 */
export function staleWords(
    note: Pick<StaleNote, "reason" | "ranOn" | "nowVisible" | "window">,
    unit: TimeUnit = "ms",
): string {
    if (note.reason === "data-changed") {
        return "Data changed since this run";
    }
    if (note.reason === "window-moved") {
        // The window the run was computed in, so a reader knows which stretch of time it describes.
        const ran = note.window?.params as { from?: number; to?: number } | undefined;
        return ran?.from === undefined || ran.to === undefined
            ? "Out of date: ran on all time"
            : `Out of date: ran on ${timeRangeWords(ran.from, ran.to, unit)}`;
    }
    return `Ran on ${count(note.ranOn, "node")}; ${COUNT.format(note.nowVisible)} shown now`;
}

const ORDINAL = new Intl.PluralRules("en-US", { type: "ordinal" });
const ORDINAL_SUFFIX: Readonly<Record<Intl.LDMLPluralRule, string>> = {
    zero: "th",
    one: "st",
    two: "nd",
    few: "rd",
    many: "th",
    other: "th",
};

/**
 * The state bar's words for a run waiting its turn ("Queued, 2nd").
 * @param position - the element's queue position, counting from 0.
 * @returns the words.
 */
export function queuedWords(position: number | null): string {
    if (position === null) {
        return "Queued";
    }
    const place = position + 1;
    return `Queued, ${String(place)}${ORDINAL_SUFFIX[ORDINAL.select(place)]}`;
}

/**
 * What to call a group: "Group 1" for the largest group of a partition (the element ranks them),
 * else the group's own value (a category).
 * @param group - the group.
 * @returns the name.
 */
export function groupName(group: SummaryGroup): string {
    return group.rank === undefined ? String(group.group) : rankedName(group);
}

/**
 * A partition group's name from its rank, or nothing for a category or no group at all.
 * @param group - the group, if any.
 * @returns "Group 3", or "".
 */
export function rankedName(group: SummaryGroup | undefined): string {
    return group?.rank === undefined ? "" : `Group ${String(group.rank)}`;
}

/** An immersive mode, or both of them in one row. */
type XrRowMode = "vr" | "ar" | "both";

const XR_MODE_WORDS: Readonly<Record<XrRowMode, string>> = { vr: "VR", ar: "AR", both: "VR or AR" };

/** The words for each reason a mode cannot be entered; a reason the element adds fails to compile. */
const XR_REASON_WORDS: Readonly<Record<XrUnavailableReason, (mode: XrRowMode) => string>> = {
    "no-webxr": (mode) => `This browser has no ${XR_MODE_WORDS[mode]}`,
    "insecure-context": () => "Needs a secure (https) page",
    unsupported: (mode) =>
        ({ vr: "No VR headset found", ar: "This device has no AR", both: "This device has no VR or AR" })[mode],
    "webgpu-renderer": () => "Not available with the WebGPU renderer",
    disabled: () => "Turned off for this graph",
    probing: () => "Checking...",
};

/**
 * Why VR, AR or both cannot be entered, in the app's words, from the element's reason code.
 * @param reason - the element's reason.
 * @param mode - the row the reason is for.
 * @returns the words; never the code itself.
 */
export function xrReasonWords(reason: XrUnavailableReason, mode: XrRowMode): string {
    return XR_REASON_WORDS[reason](mode);
}

/**
 * The XR rows the View menu draws: one "VR / AR" row when neither mode can be entered for the
 * same reason, otherwise one row per mode, each with its reason or null.
 * @param xr - the element's XR facts.
 * @returns the rows, top to bottom.
 */
export function xrRows(xr: XrCapability): { mode: XrRowMode; reason: string | null }[] {
    const { vr, ar } = xr.reasons;
    if (vr !== null && vr === ar) {
        return [{ mode: "both", reason: xrReasonWords(vr, "both") }];
    }
    return (["vr", "ar"] as const).map((mode) => {
        const reason = xr.reasons[mode];
        return { mode, reason: reason === null ? null : xrReasonWords(reason, mode) };
    });
}

/**
 * The notice for an immersive session the browser would not start.
 * @param mode - VR or AR.
 * @param code - the element's error code, when it gave one.
 * @returns the words; never the code itself.
 */
export function xrEntryFailureWords(mode: "vr" | "ar", code: GraphtyErrorCode | undefined): string {
    const words = XR_MODE_WORDS[mode];
    return code === "E_UNSUPPORTED"
        ? `Could not enter ${words}: it is turned off for this graph`
        : `Could not enter ${words}`;
}

/**
 * One attribute of a selection in a few words: a number's lowest to highest and its mean ("30 to
 * 52, mean 41.67"), or every value it takes with how many hold each ("staff (5), board (3)"). A
 * column with neither (every value different), and a column that holds the nodes' own ids, which
 * are names and not amounts, say how many have a value, so every column has its row, a partly
 * filled one and an empty one too.
 * @param attribute - the selection's statistics for the attribute.
 * @param column - the column as graphty-element describes it: its type, so a yes-or-no reads Yes or
 * No, and whether it holds the node ids.
 * @param nodes - how many nodes are selected.
 * @returns the words.
 */
export function attributeSummary(
    attribute: Pick<SelectionAttributeStatistics, "count" | "mean" | "min" | "max" | "distribution">,
    column: Readonly<{ type?: string; holdsNodeIds?: true; roles?: readonly string[] }> | undefined,
    nodes: number,
): string {
    const ids = column?.holdsNodeIds === true || column?.roles?.includes("key") === true;
    if (!ids && attribute.mean !== undefined) {
        const { min, max, mean } = attribute;
        if (min === undefined || max === undefined) {
            return `mean ${formatNumber(mean)}`;
        }
        return min === max ? formatNumber(min) : `${rangeWords(min, max)}, mean ${formatNumber(mean)}`;
    }
    const values = ids ? [] : (attribute.distribution ?? []);
    if (values.some((entry) => entry.count > 1)) {
        return values
            .map((entry) => `${valueWord(entry.value, column?.type)} (${formatNumber(entry.count)})`)
            .join(", ");
    }
    return `${formatNumber(attribute.count)} of ${formatNumber(nodes)} have a value`;
}

/**
 * A range in words: "1 to 36", or a range of one value by that value alone ("4"). A selection's
 * degree and a histogram's bin both read this way.
 * @param min - the lowest value.
 * @param max - the highest value.
 * @returns the words.
 */
export function rangeWords(min: number, max: number): string {
    return min === max ? formatNumber(min) : `${formatNumber(min)} to ${formatNumber(max)}`;
}
