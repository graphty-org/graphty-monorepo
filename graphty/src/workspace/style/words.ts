/**
 * The Style tab's presentation: which sections it draws, in what order, what each line and
 * refusal is called. graphty-element publishes the channels as neutral facts (`channelsFor`,
 * each with its `group`); arranging and naming them is the app's (CLAUDE.md, "graphty-element is
 * neutral about presentation"; the owner dropped `catalog.channelGroups` on 2026-10-03).
 */

import type { AlignmentMatrixValue } from "@graphty/compact-mantine";
import type { ChannelDescriptor, KNOWN_PALETTE_IDS } from "@graphty/graphty-element/catalog";
import type { Channel, LabelStyle } from "@graphty/graphty-element/schema";
import type { CodedFact } from "@graphty/graphty-element/session";

/** Where a label sits, as the element names it. */
type LabelLocation = NonNullable<LabelStyle["location"]>;

/** One fixed section of the Style tab (tier1-design.md section 2.8). */
export interface StyleSection {
    /** Stable id, used in test ids and accessible names. */
    readonly id: string;
    /** The heading word. */
    readonly title: string;
    /** Whether a channel sits in this section. */
    readonly holds: (descriptor: ChannelDescriptor) => boolean;
}

/**
 * Whether a channel draws a label (the label line handles it, not a set line).
 * @param d - the channel.
 * @returns true for a node's or an edge's label.
 */
const isLabel = (d: ChannelDescriptor): boolean => d.channel === "node.label" || d.channel === "edge.label";
/**
 * Whether a channel writes a tooltip's words.
 * @param d - the channel.
 * @returns true for a node's tooltip.
 */
const isTooltip = (d: ChannelDescriptor): boolean => d.channel === "node.tooltip";

/**
 * The sections, per side, in the design's fixed order: Nodes: Fill, Shape (shape and size),
 * Effects, Label, Tooltip. Edges: Line, Arrows, Label. Size stays under Shape because the
 * element's `group` puts it there.
 */
export const SECTIONS: Readonly<Record<"node" | "edge", readonly StyleSection[]>> = {
    node: [
        { id: "fill", title: "Fill", holds: (d) => d.group === "color" },
        { id: "shape", title: "Shape", holds: (d) => d.group === "shape" },
        { id: "effects", title: "Effects", holds: (d) => d.group === "effects" },
        { id: "label", title: "Label", holds: isLabel },
        { id: "tooltip", title: "Tooltip", holds: isTooltip },
    ],
    edge: [
        { id: "line", title: "Line", holds: (d) => d.group === "line" },
        { id: "arrows", title: "Arrows", holds: (d) => d.group === "arrows" },
        { id: "label", title: "Label", holds: isLabel },
    ],
};

/**
 * Whether a channel is drawn as a set line. A label's and a tooltip's appearance (`labelStyle`)
 * is edited from the label line's swatch, not as a line of its own.
 * @param descriptor - the channel.
 * @returns true when a section lists it.
 */
export function isLineChannel(descriptor: ChannelDescriptor): boolean {
    return descriptor.accepts !== "labelStyle";
}

/**
 * Whether a channel's line shows the bind icon at rest (round 7: Color and Size).
 * @param descriptor - the channel.
 * @returns true for a node's or an edge's color, and a node's size.
 */
export function bindsAtRest(descriptor: ChannelDescriptor): boolean {
    return descriptor.accepts === "color" || descriptor.channel === "node.size" || descriptor.channel === "edge.width";
}

/**
 * The bind icon's tooltip, which is also its accessible name.
 * @param descriptor - the channel.
 * @returns "Color by attribute", "Size by attribute", ...
 */
export function bindLabel(descriptor: ChannelDescriptor): string {
    return `${channelWord(descriptor.channel)} by attribute`;
}

/**
 * What each property is called on its line, in its menus and in its notices. The element names
 * its channels by id only as far as the app is concerned; the words are the app's. Typed over the
 * element's whole `Channel` union, so a channel the element adds fails the typecheck until it has
 * a word here.
 */
const CHANNEL_WORDS: Readonly<Record<Channel, string>> = {
    "node.color": "Color",
    "node.size": "Size",
    "node.shape": "Shape",
    "node.label": "Label",
    "node.labelStyle": "Label style",
    "node.tooltip": "Tooltip",
    "node.tooltipStyle": "Tooltip style",
    "node.opacity": "Opacity",
    "node.outline": "Outline",
    "node.glow": "Glow",
    "node.glowStrength": "Glow strength",
    "node.wireframe": "Wireframe",
    "node.flat": "Flat shading",
    "node.marker": "Marker",
    "edge.color": "Color",
    "edge.width": "Width",
    "edge.opacity": "Opacity",
    "edge.style": "Pattern",
    "edge.patternCount": "Pattern count",
    "edge.curvature": "Curved",
    "edge.arrowHead": "Head",
    "edge.arrowHeadSize": "Head size",
    "edge.arrowHeadColor": "Head color",
    "edge.arrowHeadOpacity": "Head opacity",
    "edge.arrowHeadText": "Head text",
    "edge.arrowHeadTextStyle": "Head text style",
    "edge.arrowTail": "Tail",
    "edge.arrowTailSize": "Tail size",
    "edge.arrowTailColor": "Tail color",
    "edge.arrowTailOpacity": "Tail opacity",
    "edge.arrowTailText": "Tail text",
    "edge.arrowTailTextStyle": "Tail text style",
    "edge.animationSpeed": "Animation speed",
    "edge.label": "Label",
    "edge.labelStyle": "Label style",
};

/**
 * A property's name on its line.
 * @param channel - the element's channel id.
 * @returns "Color", "Shape", ...
 */
export function channelWord(channel: Channel): string {
    return CHANNEL_WORDS[channel];
}

/** A palette's name, by the id the element publishes. Typed over the element's known ids. */
const PALETTE_WORDS: Readonly<Record<(typeof KNOWN_PALETTE_IDS)[number], string>> = {
    viridis: "Purple to yellow",
    ylorbr: "Orange to brown",
    plasma: "Blue to yellow",
    inferno: "Black to yellow",
    blues: "Shades of blue",
    greens: "Shades of green",
    oranges: "Shades of orange",
    "okabe-ito": "Eight distinct colors",
    "tol-vibrant": "Seven bright colors",
    "tol-muted": "Nine soft colors",
    pastel: "Eight pale colors",
    carbon: "Five strong colors",
    "purple-green": "Purple to green",
    "blue-orange": "Blue to orange",
    "red-blue": "Red to blue",
    "blue-highlight": "Blue highlight",
    "green-highlight": "Green highlight",
    "orange-highlight": "Orange highlight",
};

/**
 * A palette's name. A palette a document brings that the app has no word for is named from its id.
 * @param id - the palette's id.
 * @returns the words.
 */
export function paletteWord(id: string): string {
    return (PALETTE_WORDS as Readonly<Record<string, string>>)[id] ?? enumWords(id);
}

/**
 * A run result's name in the From data list and on a bound line: the run's own name for the field
 * the run is read by, else the field in words after it.
 * @param runLabel - the run's name, as its row is called.
 * @param field - the field's id.
 * @param primary - whether it is the field the run is read by.
 * @returns "PageRank", "Degree in degree", ...
 */
export function resultWord(runLabel: string, field: string, primary: boolean): string {
    return primary ? runLabel : `${runLabel} ${enumWords(field).toLowerCase()}`;
}

/**
 * A shape id as a reader reads it: "icosphere" -> "Icosphere", "tetrahedron-flat" -> "Tetrahedron flat".
 * @param value - an enum value the element publishes.
 * @returns the words.
 */
export function enumWords(value: string): string {
    const spaced = value
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Why an attribute cannot go on a property, in words, from the element's coded refusal.
 * @param refusal - the refusal.
 * @returns one short reason.
 */
export function refusalWords(refusal: CodedFact): string {
    if (refusal.code === "E_CAP_EXCEEDED") {
        return `More than ${String(refusal.params.limit)} different values`;
    }
    if (refusal.code === "E_UNSUPPORTED") {
        switch (refusal.params.measurement) {
            case "categorical":
                return "Holds groups, not amounts";
            case "quantitative":
                return "Holds amounts, not groups";
            case "ordinal":
                return "Holds an order, not amounts";
            case "time":
                return "Holds times";
            case null:
                return "Has no values";
            default:
                break;
        }
    }
    return "Cannot be drawn here";
}

/** The label positions a line can take, as the alignment grid's cells. */
const LOCATION_BY_CELL: Readonly<Record<AlignmentMatrixValue, LabelLocation>> = {
    "top-left": "top-left",
    "top-center": "top",
    "top-right": "top-right",
    "middle-left": "left",
    "middle-center": "center",
    "middle-right": "right",
    "bottom-left": "bottom-left",
    "bottom-center": "bottom",
    "bottom-right": "bottom-right",
};

/**
 * The element's label location for an alignment grid cell.
 * @param cell - the grid cell.
 * @returns the location.
 */
export function locationOfCell(cell: AlignmentMatrixValue): LabelLocation {
    return LOCATION_BY_CELL[cell];
}

/**
 * The alignment grid cell for a label location.
 * @param location - the element's location, or undefined for its default (above).
 * @returns the cell.
 */
export function cellOfLocation(location: LabelLocation | undefined): AlignmentMatrixValue {
    const cells = Object.keys(LOCATION_BY_CELL) as AlignmentMatrixValue[];
    return cells.find((cell) => LOCATION_BY_CELL[cell] === location) ?? "top-center";
}

/** A position's word on the label line. */
const POSITION_WORDS: Readonly<Record<LabelLocation, string>> = {
    top: "Above",
    "top-left": "Above left",
    "top-right": "Above right",
    left: "Left",
    center: "Center",
    right: "Right",
    bottom: "Below",
    "bottom-left": "Below left",
    "bottom-right": "Below right",
    automatic: "Automatic",
};

/**
 * The word a label line starts with.
 * @param location - the element's location, or undefined for its default.
 * @returns "Above", "Below", ...
 */
export function positionWord(location: LabelLocation | undefined): string {
    return POSITION_WORDS[location ?? "top"];
}

/**
 * The label line's statement, from the element's label counts (round 8: every count is computed
 * from live state). The hidden part is said only while the overlap rule is on (Show all labels off).
 * @param counts - the element's `nodeLabelCounts`.
 * @param counts.labeled - nodes whose label has text.
 * @param counts.hiddenByOverlap - of those, labels the overlap rule hid.
 * @param declutter - whether the overlap rule is on.
 * @returns "77 labels, 64 hidden to avoid overlap", or "77 labels".
 */
export function labelStatement(
    counts: { readonly labeled: number; readonly hiddenByOverlap: number },
    declutter: boolean,
): string {
    const labels = `${String(counts.labeled)} ${counts.labeled === 1 ? "label" : "labels"}`;
    return declutter ? `${labels}, ${String(counts.hiddenByOverlap)} hidden to avoid overlap` : labels;
}

/**
 * Whether an item's name matches a search: the start of any word (tier1-design.md section 2.8,
 * "the field list").
 * @param name - the item's name.
 * @param query - the search text.
 * @returns true when it matches.
 */
export function matchesWordStart(name: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q === "") {
        return true;
    }
    return (
        name
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .some((word) => word.startsWith(q)) || name.toLowerCase().startsWith(q)
    );
}
