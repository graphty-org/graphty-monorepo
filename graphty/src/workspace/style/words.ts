/**
 * The Style tab's presentation: which sections it draws, in what order, what each line and
 * refusal is called. graphty-element publishes the channels as neutral facts (`channelsFor`,
 * each with its `group`); arranging and naming them is the app's (CLAUDE.md, "graphty-element is
 * neutral about presentation"; the owner dropped `catalog.channelGroups` on 2026-10-03).
 */

import type { AlignmentMatrixValue } from "@graphty/compact-mantine";
import {
    type ChannelDescriptor,
    EDGE_ARROW_DESCRIPTORS,
    EDGE_LINE_DESCRIPTORS,
    type GlyphDescriptor,
    type KNOWN_PALETTE_IDS,
    NODE_SHAPE_DESCRIPTORS,
    toColorValue,
} from "@graphty/graphty-element/catalog";
import type { Channel, LabelStyle } from "@graphty/graphty-element/schema";
import type { CodedFact, GraphSession } from "@graphty/graphty-element/session";

/** Where a label sits, as the element names it. */
type LabelLocation = NonNullable<LabelStyle["location"]>;

/** Nodes or edges: the two groups of the Style tab. */
type Kind = "node" | "edge";

/**
 * One row of a group: its fields side by side (Figma pairs width and height the same way), and
 * the rarer one-value properties behind the settings button at its start.
 */
export interface PropertyRowSpec {
    /** Stable id, used in test ids. */
    readonly id: string;
    /** The settings popover's title, and its button's name. */
    readonly title: string;
    /** The fields drawn on the row, always, set or not. */
    readonly fields: readonly Channel[];
    /** The rare properties: behind the settings button, drawn as rows of their own once set. */
    readonly settings: readonly Channel[];
}

/**
 * The seven core properties on four rows, in the design's fixed order: Nodes `Shape | Size` and
 * `Color`; Edges `Color | Width` and `Head | Tail` (tier3 design, decision 1.1).
 */
export const CORE_ROWS: Readonly<Record<Kind, readonly PropertyRowSpec[]>> = {
    node: [
        {
            id: "shape",
            title: "Shape",
            fields: ["node.shape", "node.size"],
            settings: ["node.wireframe", "node.visible"],
        },
        // Opacity is the color field's own percent box (OPACITY_OF), so Color has no settings.
        { id: "fill", title: "Color", fields: ["node.color"], settings: [] },
    ],
    edge: [
        {
            id: "line",
            title: "Line",
            fields: ["edge.color", "edge.width"],
            settings: ["edge.style", "edge.patternCount", "edge.curvature", "edge.visible"],
        },
        {
            id: "ends",
            title: "Ends",
            fields: ["edge.arrowHead", "edge.arrowTail"],
            settings: ["edge.arrowHeadSize", "edge.arrowHeadColor", "edge.arrowTailSize", "edge.arrowTailColor"],
        },
    ],
};

/** A list of the Style tab: entries a layer adds with "+", each cleared by its own minus. */
export interface ListSpec {
    /** Stable id. */
    readonly id: string;
    /** The heading word. */
    readonly title: string;
    /** The channels its entries cover. */
    readonly channels: readonly Channel[];
}

/**
 * One kind of text a Text list entry draws: its words, its look, and the look's three channels a
 * value can vary (size, text color, background). A label, a node's tooltip and an edge's two end
 * captions are the same entry, each on its own channels (tier3 design, section 2.3).
 */
export interface TextKindSpec {
    /** Stable id. */
    readonly id: string;
    /** Its name in the "+" menu and on its entry's controls ("Label", "Tooltip"). */
    readonly name: string;
    readonly words: Channel;
    readonly style: Channel;
    readonly size: Channel;
    readonly color: Channel;
    readonly background: Channel;
}

/**
 * A text kind on its channels, named the element's way: `<base>`, `<base>Style`, `<base>Size`,
 * `<base>Color`, `<base>Background`.
 * @param id - stable id.
 * @param name - its name.
 * @param base - its words channel.
 * @returns the kind.
 */
function textKind(id: string, name: string, base: Channel): TextKindSpec {
    const at = (suffix: string): Channel => `${base}${suffix}` as Channel;
    return {
        id,
        name,
        words: base,
        style: at("Style"),
        size: at("Size"),
        color: at("Color"),
        background: at("Background"),
    };
}

/** The kinds of text each group's Text list adds, in its "+" menu's order. */
export const TEXT_KINDS: Readonly<Record<Kind, readonly TextKindSpec[]>> = {
    node: [textKind("label", "Label", "node.label"), textKind("tooltip", "Tooltip", "node.tooltip")],
    edge: [
        textKind("label", "Label", "edge.label"),
        textKind("head", "Caption at the target end", "edge.arrowHeadText"),
        textKind("tail", "Caption at the source end", "edge.arrowTailText"),
    ],
};

/**
 * Every channel of a group's text kinds.
 * @param kind - nodes or edges.
 * @returns the channels.
 */
function textChannels(kind: Kind): Channel[] {
    return TEXT_KINDS[kind].flatMap((t) => [t.words, t.style, t.size, t.color, t.background]);
}

/** The lists under each group's core rows: Text, then Effects. */
export const LISTS: Readonly<Record<Kind, readonly ListSpec[]>> = {
    node: [
        { id: "text", title: "Text", channels: textChannels("node") },
        {
            id: "effects",
            title: "Effects",
            channels: [
                "node.outline",
                "node.glow",
                "node.glowStrength",
                "node.haloColor",
                "node.haloSize",
                "node.haloOpacity",
            ],
        },
    ],
    edge: [
        { id: "text", title: "Text", channels: textChannels("edge") },
        {
            id: "effects",
            title: "Effects",
            channels: ["edge.bandColor", "edge.bandWidth", "edge.bandOpacity", "edge.animationSpeed"],
        },
    ],
};

/**
 * The two words of each yes-or-no property, in the order its select lists them. Empty means not
 * set, as in every other field, so a yes-or-no property is a select and never a switch.
 */
export const TWO_WORDS: Partial<Readonly<Record<Channel, readonly (readonly [boolean, string])[]>>> = {
    "node.wireframe": [
        [false, "Solid"],
        [true, "Wireframe"],
    ],
    "node.visible": [
        [true, "Shown"],
        [false, "Hidden"],
    ],
    "edge.visible": [
        [true, "Shown"],
        [false, "Hidden"],
    ],
    "edge.curvature": [
        [false, "Straight"],
        [true, "Curved"],
    ],
};

/**
 * A field's full name, kind first: "Node size", "Edge head".
 * @param channel - the element's channel id.
 * @returns the words.
 */
export function fieldName(channel: Channel): string {
    const kind = channel.startsWith("node.") ? "Node" : "Edge";
    return `${kind} ${channelWord(channel).toLowerCase()}`;
}

/** What the layers beneath a row give a field, in words: one value and its layer, or several layers. */
export type Beneath =
    { readonly value: string; readonly from: string | undefined } | { readonly mixed: readonly string[] };

/**
 * A field's accessible name, stating its state: "Node size, set here, 2" or "Node size, not set,
 * Everything gives 1" (tier3 design, decision 1.1).
 * @param channel - the field's channel.
 * @param set - the value this layer writes, in words, or undefined when it writes none.
 * @param beneath - what the layers beneath give, when it writes none.
 * @returns the name.
 */
export function fieldStateName(channel: Channel, set: string | undefined, beneath: Beneath | undefined): string {
    const name = fieldName(channel);
    if (set !== undefined) {
        return `${name}, set here, ${set}`;
    }
    if (beneath === undefined) {
        return `${name}, not set`;
    }
    if ("mixed" in beneath) {
        return `${name}, not set, mixed beneath`;
    }
    return beneath.from === undefined
        ? `${name}, not set, ${beneath.value} by default`
        : `${name}, not set, ${beneath.from} gives ${beneath.value}`;
}

/**
 * What an unset field shows when nothing beneath sets it and the element draws it in another
 * channel's value (`ChannelDescriptor.follows`): an arrowhead's color reads "Line color".
 * @param follows - the channel it takes its value from.
 * @returns the words.
 */
export function followsWords(follows: Channel): string {
    return follows === "edge.color" ? "Line color" : fieldName(follows);
}

/**
 * Joins names as a reader lists them: "A", "A and B", "A, B and C".
 * @param names - the names.
 * @returns the words.
 */
function listWords(names: readonly string[]): string {
    return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

/**
 * What Clear says before it clears: the value that comes back and the layer it comes from.
 * @param beneath - what the layers beneath give.
 * @returns "Clear: back to Icosphere, from Everything", "Clear: back to mixed, from Degree and
 *   Louvain", or "Clear: back to the default".
 */
export function clearWords(beneath: Beneath | undefined): string {
    if (beneath === undefined) {
        return "Clear: back to the default";
    }
    if ("mixed" in beneath) {
        return `Clear: back to mixed, from ${listWords(beneath.mixed)}`;
    }
    return beneath.from === undefined
        ? `Clear: back to ${beneath.value}, the default`
        : `Clear: back to ${beneath.value}, from ${beneath.from}`;
}

/** How a number a layer writes meets what lies beneath: its field's prefix and its menu word. */
export const COMBINE_WORDS = {
    replace: { prefix: undefined, word: "Replace" },
    multiply: { prefix: "x", word: "Multiply" },
    add: { prefix: "+", word: "Add" },
} as const;

/**
 * Whether a field draws the vary glyph: its channel takes a binding (tier3 design, decision 1.12).
 * Every color, number, choice and text channel the element draws does; a yes-or-no property does
 * not ("on for these values" is a Which elements rule), nor a channel the element does not draw.
 * @param descriptor - the element's channel descriptor.
 * @returns true when the field can vary by a value.
 */
export function takesBinding(descriptor: ChannelDescriptor): boolean {
    return (
        descriptor.renderable &&
        (descriptor.accepts === "color" ||
            descriptor.accepts === "number" ||
            descriptor.accepts === "enum" ||
            descriptor.accepts === "text")
    );
}

/**
 * The opacity a color field carries as its percent box, as Figma's paint row does, so a color and
 * its opacity are one row and opacity needs no settings button of its own.
 */
export const OPACITY_OF: Partial<Readonly<Record<Channel, Channel>>> = {
    "node.color": "node.opacity",
    "edge.color": "edge.opacity",
    "edge.arrowHeadColor": "edge.arrowHeadOpacity",
    "edge.arrowTailColor": "edge.arrowTailOpacity",
};

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
    "node.haloColor": "Halo",
    "node.haloSize": "Halo size",
    "node.haloOpacity": "Halo opacity",
    "node.visible": "Show",
    "node.labelSize": "Label size",
    "node.labelColor": "Label color",
    "node.labelBackground": "Label background",
    "node.tooltipSize": "Tooltip size",
    "node.tooltipColor": "Tooltip color",
    "node.tooltipBackground": "Tooltip background",
    "edge.color": "Color",
    "edge.width": "Width",
    "edge.opacity": "Opacity",
    "edge.bandColor": "Band",
    "edge.bandWidth": "Band width",
    "edge.bandOpacity": "Band opacity",
    "edge.visible": "Show",
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
    "edge.labelSize": "Label size",
    "edge.labelColor": "Label color",
    "edge.labelBackground": "Label background",
    "edge.arrowHeadTextSize": "Head text size",
    "edge.arrowHeadTextColor": "Head text color",
    "edge.arrowHeadTextBackground": "Head text background",
    "edge.arrowTailTextSize": "Tail text size",
    "edge.arrowTailTextColor": "Tail text color",
    "edge.arrowTailTextBackground": "Tail text background",
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
        .replaceAll(/[-_]/g, " ")
        .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
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
 * @returns "77 labels, 64 hidden", or "77 labels".
 */
export function labelStatement(
    counts: { readonly labeled: number; readonly hiddenByOverlap: number },
    declutter: boolean,
): string {
    const labels = `${String(counts.labeled)} ${counts.labeled === 1 ? "label" : "labels"}`;
    return declutter ? `${labels}, ${String(counts.hiddenByOverlap)} hidden` : labels;
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

/**
 * An attribute's name as the reader knows it, from its literal column key.
 * @param session - the element's session.
 * @param path - the column key, such as `"data.name"`, or `"id"`.
 * @returns its plain name, else the key.
 */
export function attributeName(session: GraphSession, path: string): string {
    if (path === "id") {
        return "id";
    }
    return session.data.attributes().find((a) => a.path === path)?.plainName ?? path;
}

/** The pictures of each glyph-grid property, from graphty-element's catalog. */
export const GLYPH_TABLES: Partial<Readonly<Record<Channel, readonly GlyphDescriptor[]>>> = {
    "node.shape": NODE_SHAPE_DESCRIPTORS,
    "edge.arrowHead": EDGE_ARROW_DESCRIPTORS,
    "edge.arrowTail": EDGE_ARROW_DESCRIPTORS,
    "edge.style": EDGE_LINE_DESCRIPTORS,
};

/**
 * A color as the paint field edits it: `#RRGGBB`.
 * @param value - a color the element reports or a layer holds.
 * @returns the hex, or null when it is not a color.
 */
export function hexOf(value: unknown): string | null {
    const color =
        typeof value === "string" || (typeof value === "object" && value !== null && "r" in value)
            ? toColorValue(value as Parameters<typeof toColorValue>[0])
            : null;
    return color === null ? null : color.hex.slice(0, 7).toUpperCase();
}

/**
 * A value as a reader reads it on its field: a color's hex, a shape's name, a yes-or-no
 * property's word, a number as itself.
 * @param descriptor - the channel.
 * @param value - the value.
 * @returns the words.
 */
export function valueWords(descriptor: ChannelDescriptor, value: unknown): string {
    if (descriptor.accepts === "color") {
        return hexOf(value) ?? String(value);
    }
    const two = TWO_WORDS[descriptor.channel];
    if (two !== undefined && typeof value === "boolean") {
        return two.find(([v]) => v === value)?.[1] ?? String(value);
    }
    if (typeof value === "string" && descriptor.accepts === "enum") {
        return GLYPH_TABLES[descriptor.channel]?.find((g) => g.id === value)?.plainName ?? enumWords(value);
    }
    return typeof value === "number" || typeof value === "string" ? String(value) : JSON.stringify(value);
}
